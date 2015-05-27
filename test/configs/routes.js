var Hoek = require('hoek');

var base = {
  path: '/limited',
  method: 'get',
  handler: function(request, reply) {
    reply();
  }
};

exports.offByDefault = base;

exports.defaults = Hoek.applyToDefaults(base, {
  config: {
    plugins: {
      'hapi-limiter': {
        enable: true
      }
    }
  }
});

exports.overrides = Hoek.applyToDefaults(base, {
  config: {
    plugins: {
      'hapi-limiter': {
        enable: true,
        limit: 5,
        ttl: 8000,
        generateKeyFunc: function(request) {
          return 'customkey';
        }
      }
    }
  }
});
