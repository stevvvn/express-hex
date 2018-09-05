# What is Hex?
Hex is a scheme for organizing Express middleware as a tree of dependencies rather than as a linear stack, and a common way to structure application configuration files.

### `middleware.js`

Hex apps and libraries define a `middleware.js` that details what functionality they provide:

*hex-forms/middleware.js*
```js
module.exports = {
	'csrf': {
		'description': 'Request forgery tokens for POST forms',
		'deps': [ 'session', 'hex.body-parser' ]
	},
	'captcha': {
		'description': 'Robot prevention'
	},
	'session': {
		'description': 'Session management that should live in a different library, but just for demo purposes it is here',
		'after': [ 'hex-redis.connection' ]
	},
	'base': {
		'bundle': [ 'session', 'csrf', 'captcha' ]
	}
};
```

Here, `csrf` has a hard dependency on `session`, so if it is loaded `session` is always loaded first. It also imports the only middleware provided directly by `hex`, `body-parser` ("Included Middleware" below).

`captcha` is self-sufficient.

`session` can use but does not require a Redis connection. `after` specifies that `session` is loaded afterward if the connection is specified directly elsewhere, so it can decide on instantiation whether to use it.

Bundles like `base` can be used to group together functionality that are likely to be used together.


An application using this library defines its middleware similarly:

*hex-contact/middleware.js*
```js
module.exports = {
	'contact': {
		'description': 'Contact form for info about our upcoming product',
		'deps': [ 'hex-forms.csrf', 'hex-redis.connection' ]
	},
	'typography': {
		'description': 'Load typefaces from Google'
	}
}
```

Starting a Hex application is as simple as `require('express-hex').start('/app/path/for/example/hex-contact'); // => Promise`

The `middleware.js` in the given startup path is loaded, and everything in it mentions is loaded and re-ordered to satisfy dependencies and `after` stipulations.

Here, the `contact` middleware requires `csrf` from `hex-forms`, which in turn brings in its `session` middleware, and `hex.body-parser`. Because `hex-contact.contact` also explicitly names the Redis connection, it'll be loaded prior to `hex-forms.session` so it can use it. `hex-forms.captcha` is not loaded here because there isn't a path referencing it from the "base" `middleware.js` loaded from `hex-contact`.

`typography` politely goes along without requiring any dependencies or ordering requests.

In order for Hex to be able to locate libraries, they should be in `package.json` and exist in `node_modules/$LIB_NAME` (e.g., `node_modules/hex-forms`) per usual.


### conf.js

Hex also loads `conf.js` and (if it exists) `secrets.js` from the base path it's started with.

These are similar to JSON except that they are JavaScript, so you can do dynamic stuff and add comments. For example, to support that Redis connection:

*hex-contact/conf.js*
```js
module.exports {
	'redis': {
		'host': `redis.${ require('os').hostname }`,    // DNS has server location
		'port': 7000,
		'db': /^dev/.test(process.env.NODE_ENV) ? 1 : 0 // use different catalog for dev vs prod
	}
}
```

`conf.js` is designed to be checked in to version control, while `secrets.js` contains anything you'd rather not. Additionally, these files support a shortcut notation to specify keys in a deeper structure using dots:

*hex-contact/secrets.js*
```js
module.exports = {
	'redis.auth.pass': 'super secret' // == { 'redis': { 'auth': { 'pass': 'super secret' } } }
};
```

The structure of configuration parameters is up to the libraries that consume them.


#### CLI access
Since these files can contain dynamic elements, they're inconvenient to work with from outside of the JS world, so `bin/hex-conf` is installed to access configuration data through the CLI:

```sh
$ cd /app/path/for/example/hex-contact && node_modules/.bin/hex-conf
{"redis":{"host":"redis.diesel","port":7000,"db":1,"auth":{"pass":"super secret"}},"env":"development"}
```

Note `env` added, you can also supply it, and you can ask for a specific key (or a dotted path to a key):
```sh
$ cd /app/path/for/example/hex-contact && NODE_ENV=production node_modules/.bin/hex-conf redis.db
0
```

### Included middleware

#### body-parser

Ubiquitous Express middleware for parsing incoming requests into sensible JS objects. Reads `body-parser` from `conf.js`, where they keys there correspond to the options documented for that library: https://www.npmjs.com/package/body-parser


### Writing new middleware

You can check out a skeleton that contains the few files you need to get started:

```sh
$ git clone https://bitbucket.org/snyder13/hex-template-minimal <target dir>
$ cd <target dir>
$ yarn install
$ DEBUG=hex:* yarn start
yarn run v1.5.1
$ node server.js &
  hex:info environment: development +0ms
  hex:info booting from <target dir> +2ms
  hex:debug loading middleware definitions - {"path":",<target dir>/middleware.js","app":"target"} +0ms
  hex:debug loading middleware definitions - {"path":"<target dir>/node_modules/express-hex/lib/../middleware.js","app":"hex"} +2ms
  hex:debug required middleware - {"target.index":{"description":"Main page","app":"target","name":"index"}} +2ms
  hex:info requiring middleware: +22ms
  hex:info      target.index - Main page +0ms
  hex:info relevant paths - {"launch":"<target dir>"} +4ms
  hex:info listening on 8000 +4ms
$ curl http://localhost:8000
It's working, sort of!
```

#### Static files
You can organize for something like `nginx` to serve static files for you or you can include them in a path called `public` in your application root. Libraries can also have `public` directories that are set to be served by Express when any of their middleware is required.

#### Middleware API
Your module should export a function that will be passed `{ log, conf, app, http, express }`.

`log` contains methods corresponding to the log levels `[ 'emerg', 'alert', 'crit', 'error', 'warn', 'notice', 'info', 'debug', 'access' ]`. You may call any of these with a string for the first argument, and optionally an object for context in the second argument.

`conf` is an instance of [`hex-object`](https://bitbucket.org/snyder13/hex-object/). You can read more there, but basically it's an interface to your `conf.js` and `secrets.js` with `get(path, default)` and `set(path, value)` where `path` accepts dotted notation.

`app`, `http`, and `express` are all what you would expect from the [Express documentation](http://expressjs.com/). See in particular [Express: Writing middleware](http://expressjs.com/en/guide/writing-middleware.html).

