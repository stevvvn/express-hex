'use strict';

const
	fs = require('fs'),
	path = require('path'),
	rimraf = require('rimraf'),
	pkg = JSON.stringify({ 'name': 'init-test-app' }),
	{ spawn } = require('child_process'),
	request = require('request-promise')
	;

if (!process.env.SLOW_TESTS) {
	describe('initializing a new application', () => {
		test('define SLOW_TESTS to run', () => {});
	});
}
else {
	// setup
	const initialized = new Promise((res, rej) => {
		if (fs.existsSync('./test/init-test-app')) {
			rimraf('./test/init-test-app', init);
		}
		else {
			init()
		}

		function init() {
			fs.mkdirSync('./test/init-test-app');
			fs.writeFileSync('./test/init-test-app/package.json', pkg);
			res();
		}
	});

	describe('initializing a new application', () => {
		let ran;
		test('exits without error code', async () => {
			await initialized;
			expect.assertions(1);

			ran = new Promise((res) => {
				spawn('./bin/init', [ 'test/init-test-app', '--template=default' ], { 'stdio': 'ignore' }).on('exit', (code) => {
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
				expect(fs.existsSync(`./test/init-test-app/${path}`)).toBe(true);
			});
		});

		let server, hex;
		test('results in a working server', async () => {
			await ran;
			hex = require(process.cwd() + '/index');
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
}
