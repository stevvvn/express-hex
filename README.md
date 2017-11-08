## What
Hex is a way to partition different [Express](https://github.com/expressjs/express) apps that work together.

It's similar to Express's built in support for sub-applications ([example](https://github.com/derickbailey/express-sub-app-demo)), but it works by dependency resolution, which hopefully makes it easier to include things into your application without reorganize existing code.

Additionally, it provides a common configuration scheme, logging based on [debug](https://www.npmjs.com/package/debug), and some commonly useful middleware.

### Terms
 * host application: this is the application that starts the server, by calling `require('hex').start(__dirname)`
 * libraries: the converse, applications that provide functionality to the host application but which are not considered to be "in control" by hex

Sometimes an application can work as either a host or a library depending on context. The determination is made based on whether it is the one that calls `start`

### Initializing a new application

 1. Install hex: `npm install --save git+https://bitbucket.org/snyder13/hex.git`
 2. Run the init script: `node_modules/.bin/hex-init`
 3. Answer some questions about your app from npm's `init` where applicable
 4. Select a template to install based on your needs. Currently there's just one default, so hopefully that suits your needs. This will print out an overview of the files it installs.

### Running the server

#### Ad-hoc
`NODE_PORT=8000 DEBUG=hex:* npm start` (port defaults to what's in your conf.js under `http.port`, or failing that 8000)

#### Managed
 1. Install `pm2` once: `# npm install -g pm2`
 2. `NODE_PORT=8000 pm2 start ./ecosystem.config.js`

[Read more about `pm2`](https://github.com/Unitech/pm2)

Fresh off initialization, visiting `http://localhost:8000` should show a "Hello, world"-ish message. That's not terribly interesting, but you can use the scaffold to develop other (likely also uninteresting) functionality:

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

This software uses the [`debug` module](https://github.com/visionmedia/debug) and the namespace `hex`. You will get minimal (or no) output unless you specify the `DEBUG` enviornment variable. `DEBUG=hex:*` will show all messages originating from hex, while `DEBUG=*` will show more information coming from other libraries that use `debug`, notably `express`.

You can also listen only to certain log levels, e.g., `DEBUG=hex:warn,hex:error`

Hex regularly emits events at the info, warn, debug, and error levels. There are some more available because they are standard, but are not (currently) used: emerg, alert, crit, notice.

If you specify a path in your conf.js under the key `log.auth`, authorization-related messages will be sent there. This design is to aid the scripting of fail2ban, which can monitor said file.

Finally, there is the access log level, which is meant to be managed by the `access-log` middleware, which itself uses [`morgan`](https://github.com/expressjs/morgan). This log format is specified in conf.js under `log.access.format`.

### Migrations

The initialization routine installs `migrate.js`, which can be used to manage and apply changes to whatever database engine(s) your app is interested in.

Running `node migrate.js` will give you more info about how to use it.

It's similar to any number of other migration schemes, but keep in mind:

 1. It's database agnostic. Migrations are grouped under `migrations/$MIDDLEWARE_NAME` where $MIDDLEWARE_NAME is middleware that relies on the schema.
 2. Running migrations (up or down) invokes your app's middleware stack. Doing so means that only migrations for things you actually use are considered.
 3. Migrations files export an up method, and optionally a down method. If there is no down method an error is thrown on attempts to roll it back.
 4. The arguments passed to up() and down() are exactly the same as those passed to middleware when the server is running. So, for example, postgres connections gets set as `app.pg`, so you'd look for it there in either case.
 5. up() and down() must either use sychronous APIs or return a promise. (Database interactions are designed to be promise-y anyway, so it's easy. For example, `return app.pg.query('... sql ...');` is valid, and `return app.redis.setAsync('key', 'value')`)

