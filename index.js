var Hoek = require('hoek');
var Boom = require('boom');
var hapiLimiter = 'hapi-limiter';

var internals = {
  defaults: {
    cache: {
      expiresIn: 1000 * 60 * 15,
      segment: hapiLimiter
    },
    limit: 15,
    ttl: 1000 * 60 * 15,
    generateKeyFunc: function(request) {
      var methodAndPath = request.method + ':' + request.path + ':';
      var ip = request.headers['x-forwarded-for'];

      if ( !ip ) {
        ip = request.info.remoteAddress;
      }

      return methodAndPath + ip;
    }
  }
};


exports.register =  function(server, options, done) {
  var globalSettings = Hoek.applyToDefaults(internals.defaults, options);

  var cacheClient = globalSettings.cacheClient;

  if ( !cacheClient ) {
    cacheClient = server.cache(globalSettings.cache);
  }

  server.ext('onPreHandler', function(request, reply) {
    var routePlugins = request.route.settings.plugins;

    if (
      !routePlugins[hapiLimiter] ||
      !routePlugins[hapiLimiter].enable
    ) {
      return reply.continue();
    }

    var pluginSettings = Hoek.applyToDefaults(globalSettings, routePlugins[hapiLimiter]);

    var keyValue = pluginSettings.generateKeyFunc(request);

    cacheClient.get(keyValue, function(err, value, cached) {
      if ( err ) {
        return reply(err);
      }
      request.plugins[hapiLimiter] = {};
      request.plugins[hapiLimiter].limit = pluginSettings.limit;

      if ( !cached ) {
        var reset = Date.now() + pluginSettings.ttl;
        return cacheClient.set(keyValue, { remaining: pluginSettings.limit - 1 }, pluginSettings.ttl, function(err) {
          if ( err ) {
            return reply(err);
          }
          request.plugins[hapiLimiter].remaining = pluginSettings.limit - 1;
          request.plugins[hapiLimiter].reset = reset;
          reply.continue();
        });
      }

      request.plugins[hapiLimiter].remaining = value.remaining - 1;
      request.plugins[hapiLimiter].reset = Date.now() + cached.ttl;

      var error;
      if (  request.plugins[hapiLimiter].remaining < 0 ) {
        error = Boom.tooManyRequests('Rate Limit Exceeded');
        error.output.headers['X-Rate-Limit-Limit'] = request.plugins[hapiLimiter].limit;
        error.output.headers['X-Rate-Limit-Reset'] = request.plugins[hapiLimiter].reset;
        error.output.headers['X-Rate-Limit-Remaining'] = 0;
        error.reformat();
        return reply(error);
      }

      cacheClient.set(
        keyValue,
        { remaining: request.plugins[hapiLimiter].remaining },
        cached.ttl, function(err) {
        if ( err ) {
          return reply(err);
        }

        reply.continue();
      });
    });
  });

  server.ext('onPostHandler', function(request, reply) {
    var pluginSettings = request.route.settings.plugins;
    var response;

    if (
      pluginSettings[hapiLimiter] &&
      pluginSettings[hapiLimiter].enable
    ) {
      response = request.response;
      response.headers['X-Rate-Limit-Limit'] = request.plugins[hapiLimiter].limit;
      response.headers['X-Rate-Limit-Remaining'] = request.plugins[hapiLimiter].remaining;
      response.headers['X-Rate-Limit-Reset'] = request.plugins[hapiLimiter].reset;
    }

    reply.continue();
  });

  done();
};

exports.register.attributes = {
  pkg: require('./package.json')
};
