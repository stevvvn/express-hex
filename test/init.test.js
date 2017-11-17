'use strict';

const
	fs = require('fs'),
	path = require('path'),
	rimraf = require('rimraf'),
	pkg = JSON.stringify({ 'name': 'init-test-app' }),
	{ spawn } = require('child_process'),
	request = require('request-promise'),
	{ walkSync } = require('fs-walk'),
	port = process.env.NODE_PORT || 8000
	;

jest.timeOut = 30000;
// setup
let newInit = false;
const initialized = new Promise((res) => {
	// find most-recently modified file in the template to determine whether to refresh (or to mark the vintage of a new initialization)
	let latest = null;
	walkSync('./templates/default', (_1, _2, stat) => {
		const mtime = new Date(stat.mtime).getTime();
		if (latest === null || stat.mtime > latest) {
			latest = mtime;
		}
	});

	if (!fs.existsSync('./test/init-test-app/.vintage') || fs.readFileSync('./test/init-test-app/.vintage') < latest) {
		console.log('re-initializing test app, this will take some time');
		newInit = true;
		rimraf('./test/init-test-app', () => {
			fs.mkdirSync('./test/init-test-app');
			fs.writeFileSync('./test/init-test-app/.vintage', latest);
			fs.writeFileSync('./test/init-test-app/package.json', pkg);
			res();
		});
	}
	else {
		console.log('using existing app in test/init-test-app. delete this path to force testing of init script');
		res();
	}
});

let ran;
(newInit ? describe : describe.skip)('initializing a new application', () => {
	test('exits without error code', async () => {
		await initialized;
		expect.assertions(1);
		ran = new Promise((res) => {
			spawn('./bin/init', [ `${__dirname}/init-test-app`, '--template=default' ], { 'stdio': 'ignore' }).on('exit', (code) => {
				res(code);
			});
		});
		await expect(ran).resolves.toBe(0);
	});

	test('installs at least minimal files', async () => {
		await ran;
		const common = [ '.gitignore', 'conf.js', 'server.js', 'migrate.js', 'middleware.js', 'middleware', 'package.json', 'public', 'ecosystem.config.js', 'node_modules/hex' ]
		expect.assertions(common.length);
		common.forEach((path) => {
			expect({ path, 'exists': fs.existsSync(`./test/init-test-app/${path}`) }).toEqual({ path, 'exists': true });
		});
	});
});

describe('server behavior', async () => {
	if (ran) {
		await ran;
	}
	const hex = require(`${process.cwd()}/index`);
	let server;
	test('booting with a bad path errors out', () => {
		expect(() => {
			hex.start('/hopefully/this/path/does/not/exist');
		}).toThrow();
	});

	test.skip('booting with a bad port errors out', () => {
		process.env.NODE_PORT = 4242424;
		expect(hex.start(path.resolve('./test/init-test-app'))).rejects;
	});

	test('booting from script-initialized app works', async () => {
		process.env.NODE_PORT = port;
		expect.assertions(1);
		server = hex.start(path.resolve('./test/init-test-app'));
		await expect(server).resolves.toBeTruthy();
	});

	test('returns 200 from GET /', async () => {
		await server;
		expect.assertions(1);
		await expect(request.get({
			'method': 'GET',
			'uri': 'http://localhost:8000/',
			'resolveWithFullResponse': true
		})).resolves.toHaveProperty('statusCode', 200)
		hex.stop();
	});
});
