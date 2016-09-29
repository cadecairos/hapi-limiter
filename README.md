[![Build Status](https://travis-ci.org/cadecairos/hapi-limiter.svg?branch=master)](https://travis-ci.org/cadecairos/hapi-limiter)
[![Coverage Status](https://coveralls.io/repos/cadecairos/hapi-limiter/badge.svg)](https://coveralls.io/r/cadecairos/hapi-limiter)
[![npm version](https://badge.fury.io/js/hapi-limiter.svg)](http://badge.fury.io/js/hapi-limiter)
[![dependencies](https://david-dm.org/cadecairos/hapi-limiter.svg)](https://david-dm.org/cadecairos/hapi-limiter)

[![npm stats](https://nodei.co/npm/hapi-limiter.png?downloads=true)](https://nodei.co/npm/hapi-limiter)

# hapi-limiter
Rate limiting plugin for Hapi, inspired by [hapi-ratelimit](https://github.com/creativelive/hapi-ratelimit), but using hapi's
builtin server cache interface.

### Installation
`npm install hapi-limiter`

### Usage
```
server.register(require('hapi-limiter'), function(err) {
  Hoek.assert(!err, 'uh oh!');
});

server.route({
  path: '/foo',
  method: 'get',
  handler: function(request, reply) {
    reply('remaining requests: ', request.plugins[hapi-limiter].remaining);
  },
  config:{
    plugins: {
      'hapi-limiter': {
        enable: true
      }
    }
  }
});
```

### Configuration

#### Plugin

These settings are global, and applicable values are applied as defaults to each rate limted route

Setting          | Description                                                                       | Default
-----------------|-----------------------------------------------------------------------------------|--------
ttl              | Length of time that a limit should be enforced for, specified in miliseconds      | 1000 * 60 * 15
limit            | Maximum allowed API calls per period specified by `ttl`                           | 15
cacheClient      | A Hapi CacheClient, or similarly functioning interface.                           | undefined
cache            | A [Hapi Catbox policy](https://github.com/hapijs/catbox#policy)                   | default ttl and segment, using default server cache
generateKeyFunc  | A function with the signature `function(request) {}` that returns the caching key | returns method + api path + ip address

#### Route Configuration

Setting          | Description                                                                       | Default
-----------------|-----------------------------------------------------------------------------------|--------
enable           | boolean or truthy value, indicating if route is to be rate limited                | undefined
ttl              | Length of time that a limit should be enforced for, specified in miliseconds      | 1000 * 60 * 15
limit            | Maximum allowed API calls per period specified by `ttl`                           | 15
