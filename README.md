## What
Hex is a way to partition different [Express](https://github.com/expressjs/express) apps that work together.

It's similar to Express's built in support for sub-applications ([example](https://github.com/derickbailey/express-sub-app-demo)), but it works by dependency resolution, which hopefully makes it easier to include things into your application without reorganize existing code.

Additionally, it provides a common configuration scheme, logging based on [debug](https://www.npmjs.com/package/debug), and some commonly useful middleware.

### Terms
 * host application: this is the application that starts the server, by calling `require('hex').start(__dirname)`
 * libraries: the converse, applications that provide functionality to the host application but which are not considered to be "in control" by hex

Sometimes an application can work as either a host or a library depending on context. The determination is made based on whether it is the one that calls `start`

### Middleware
First, a cut-down example of a middleware declaration:
```javascript
module.exports = {
        'session': {
                'description': 'Session management',
                'after': [ 'redis' ]
        },
        'redis': {
                'description': 'Promisified Redis client'
        },
        'body-parser': {
                'description': 'Convert POST bodies to native data'
        },
        'csrf': {
                'description': 'Request forgery tokens for POST forms',
                'deps': [ 'session', 'body-parser' ]
        },
        'base': {
                'bundle': [ 'session', 'body-parser' ]
        }
};
```

This file serves two purposes: for libraries, it shows which functionality it can provide, and for hosts it shows through dependencies which libraries to bring in to support it.

These keys mean:
  * `description`: optional documentation of what the middleware does, logged when it's booted
  * `deps`: optional list of middleware which must be loaded before this one
  * `after`: optional list of middleware which could be used if they're available but which are not required
  * `bundle`: special case, which simply makes that name expand to the indicated middleware anywhere it is indicated

All the middleware in the example references other middleware in the same file, but for a host application there is likely a need to specify dependencies on middleware from other libraries. This is done by prefixing the library name and a period to the desired middleware.

Consider an example host application's `middleware.js`:
```javascript
module.exports = {
	'foo': { },
	'index': {
		'deps': [ 'foo', 'hex.base', 'hex.redis', 'hex-authn-passport.google' ]
	}
};
```

This would load the `index` and `foo` middleware from the example host, `foo` first, bring in hex's `session` and `body-parser` middleware by way of the `base` bundle, as well as `redis` since it was named directly, and `google` from another library.

See the actual `middleware.js` in the hex source for a list of the common utilities that are bundled.

### Configuration
The host application can include two files, `conf.js` and `secrets.js`.

Both of these files export objects declaring whatever parameters are relevant to the application. `secrets.js`, as you might expect contains private data and should not be committed, while `conf.js` can be shared. These two files are glommed together at runtime to make a description of both, for example:

#### `conf.js`
```javascript
module.exports = {
	'session': {
		// cookie parameter passed to express-session
		'max-age': 60 * 60 * 1000
	}
};
```

#### `secrets.js`
```javascript
module.exports = {
	'session': {
		// used to sign session id cookie, should be private to prevent tampering
		'secret': 'kcOt3PDsz6Zesg1jVw8oJ4T0RIc7sAne3JEql7dqLkBVJ'
	}
};
```

There is a utility included, `hex-conf`, which can be run in the same path as these two files to see what this looks to the application:
```bash
$ node node_modules/.bin/hex-conf
{"session":{"max-age":3600000,"secret":"kcOt3PDsz6Zesg1jVw8oJ4T0RIc7sAne3JEql7dqLkBVJ"}}
```

You can also specify a path to a specific key of interest, using periods to indicate depth:
```bash
$ node node_modules/.bin/hex-conf session.secret
kcOt3PDsz6Zesg1jVw8oJ4T0RIc7sAne3JEql7dqLkBVJ
```
(Note scalar values are not JSON-encoded, so if you want to script external tools on the application's configuration values you don't have to worry about it.)

Hex middleware is instantiated with `{ conf }`, an object that works similarly. It exposes a `get(path, default=undefined)` method, which will get you you the data at the specified path. If the parameter isn't found, the `default` is returned if provided. If `default === undefined`, missing parameters throw errors. (Note strict equality -- use can use `null` for `default` if you don't care whether the parameter is set and don't have your own fallback value in mind.)

### Logging

### Initializing a new application
