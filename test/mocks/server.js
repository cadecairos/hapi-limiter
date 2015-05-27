var Hapi = require('hapi');
var Hoek = require('hoek');

module.exports = function(limiterSettings, routeConfigs, done) {
  var server = new Hapi.Server({
    cache: {
      engine: require('catbox-memory'),
      name: 'test-cache'
    }
  });

  server.connection();

  server.register([
      {
        register: require('../../'),
        options: limiterSettings
      }
    ], function(err) {
    Hoek.assert(!err, err);
  });

  server.route(routeConfigs);

  server.start(function() {
    return done(server);
  });
};
