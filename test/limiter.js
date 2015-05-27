var Lab = require('lab'),
  async = require('async'),
  sinon = require('sinon'),
  Hoek = require('hoek'),
  lab = exports.lab = Lab.script(),
  experiment = lab.experiment,
  before = lab.before,
  after = lab.after,
  test = lab.test,
  expect = require('code').expect,
  server;

var serverGenerator = require('./mocks/server');
var configs = {
  routes: require('./configs/routes'),
  plugin: require('./configs/plugin')
};

experiment('hapi-ratelimiter', function() {
  function inject(expectedCode, limit, remaining) {
    return function(done) {
      server.inject({
        url: '/limited'
      }, function(resp) {
        expect(resp.statusCode).to.equal(expectedCode);
        expect(resp.headers['x-rate-limit-limit']).to.equal(limit);
        expect(resp.headers['x-rate-limit-remaining']).to.equal(remaining);
        expect(resp.headers['x-rate-limit-reset']).to.exist();
        done();
      });
    };
  }

  experiment('defaults to off', function() {
    before(function(done) {
      serverGenerator(configs.plugin.offByDefault, configs.routes.offByDefault, function(s) {
        server = s;
        done();
      });
    });

    after(function(done) {
      server.stop(done);
    });

    test('Routes are not rate limited by default', function(done) {
      server.inject({
        url: '/limited'
      }, function(resp) {
        expect(resp.request.plugins['hapi-ratelimiter']).to.not.exist();
        done();
      });
    });
  });

  experiment('default settings', function() {
    before(function(done) {
      serverGenerator(configs.plugin.defaults, configs.routes.defaults, function(s) {
        server = s;
        done();
      });
    });

    after(function(done) {
      server.stop(done);
    });

    test('applies default settings', function(done) {
      async.series([
        inject(200, 15, 14),
        inject(200, 15, 13),
        inject(200, 15, 12),
        inject(200, 15, 11),
        inject(200, 15, 10),
        inject(200, 15, 9),
        inject(200, 15, 8),
        inject(200, 15, 7),
        inject(200, 15, 6),
        inject(200, 15, 5),
        inject(200, 15, 4),
        inject(200, 15, 3),
        inject(200, 15, 2),
        inject(200, 15, 1),
        inject(200, 15, 0),
        inject(429, 15, 0)
      ], function() {
        done();
      });
    });
  });

  experiment('global plugin settings', function() {
    before(function(done) {
      serverGenerator(configs.plugin.customSettings, configs.routes.defaults, function(s) {
        server = s;
        done();
      });
    });

    after(function(done) {
      server.stop(done);
    });

    test('applies custom settings', function(done) {
      async.series([
        inject(200, 5, 4),
        inject(200, 5, 3),
        inject(200, 5, 2),
        inject(200, 5, 1),
        inject(200, 5, 0),
        inject(429, 5, 0)
      ], function() {
        done();
      });
    });
  });

  experiment('route overrides', function() {
    before(function(done) {
      serverGenerator(configs.plugin.customSettings, configs.routes.overrides, function(s) {
        server = s;
        done();
      });
    });

    after(function(done) {
      server.stop(done);
    });

    test('applies route override settings', function(done) {
      async.series([
        inject(200, 5, 4),
        inject(200, 5, 3),
        inject(200, 5, 2),
        inject(200, 5, 1),
        inject(200, 5, 0),
        inject(429, 5, 0)
      ], function() {
        done();
      });
    });
  });

  experiment('x-forwarded-for', function() {
    before(function(done) {
      serverGenerator(configs.plugin.defaults, configs.routes.defaults, function(s) {
        server = s;
        done();
      });
    });

    after(function(done) {
      server.stop(done);
    });

    test('uses xff header if available', function(done) {
      server.inject({
        url: '/limited',
        headers: {
          'x-forwarded-for': '0.0.0.0'
        }
      }, function(resp) {
        expect(resp.statusCode).to.equal(200);
        expect(resp.headers['x-rate-limit-limit']).to.equal(15);
        expect(resp.headers['x-rate-limit-remaining']).to.equal(14);
        expect(resp.headers['x-rate-limit-reset']).to.exist();
        done();
      });
    });
  });

  experiment('handles error from cache client', function() {
    experiment('cache client get', function() {
      before(function(done) {
        var config = Hoek.applyToDefaults(configs.plugin.defaults, {
          cacheClient: {
            get: sinon.stub().callsArgWith(1, new Error('mock error'))
          }
        });
        serverGenerator(config, configs.routes.defaults, function(s) {
          server = s;
          done();
        });
      });

      after(function(done) {
        server.stop(done);
      });

      test('uses xff header if available', function(done) {
        server.inject({
          url: '/limited'
        }, function(resp) {
          expect(resp.statusCode).to.equal(500);
          done();
        });
      });
    });

    experiment('cache client set (new cache record)', function() {
      before(function(done) {
        var config = Hoek.applyToDefaults(configs.plugin.defaults, {
          cacheClient: {
            get: sinon.stub().callsArgWith(1, null, null),
            set: sinon.stub().callsArgWith(3, new Error('mock error'))
          }
        });
        serverGenerator(config, configs.routes.defaults, function(s) {
          server = s;
          done();
        });
      });

      after(function(done) {
        server.stop(done);
      });

      test('returns 500', function(done) {
        server.inject({
          url: '/limited'
        }, function(resp) {
          expect(resp.statusCode).to.equal(500);
          done();
        });
      });
    });

    experiment('cache client set (update cache record)', function() {
      before(function(done) {
        var config = Hoek.applyToDefaults(configs.plugin.defaults, {
          cacheClient: {
            get: sinon.stub().callsArgWith(1, null, { remaining: 2 }, { ttl: 6000 }),
            set: sinon.stub().callsArgWith(3, new Error('mock error'))
          }
        });
        serverGenerator(config, configs.routes.defaults, function(s) {
          server = s;
          done();
        });
      });

      after(function(done) {
        server.stop(done);
      });

      test('returns 500', function(done) {
        server.inject({
          url: '/limited'
        }, function(resp) {
          expect(resp.statusCode).to.equal(500);
          done();
        });
      });
    });
  });
});
