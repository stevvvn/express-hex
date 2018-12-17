'use strict';
// @flow
import type { SMap, Conf, Logger, Jsonish, Never, Bootstrap } from './types/hex';

const express = require('express');
const http = require('http');
const fs = require('fs');

const middleware: any = require('./lib/middleware');
const logger = require('./lib/log');
const config = require('./lib/conf');
const migrate = require('./lib/migrate');

process.on('unhandledRejection', up => { throw up })

module.exports = (() => {
	const
		argv: SMap<string> = require('minimist')(process.argv.slice(2).map((arg) => {
			// minist only wants --foo=bar format for [k,v] pairs, but we want to support foo=bar
			return /=/.test(arg) && !/^-/.test(arg) ? '--' + arg : arg;
		})),
		overrides: SMap<string> = {}
		;

	// store overrides of the config settings passed on the command line
	Object.keys(argv).forEach((key) => {
		// skip the positional args
		if (key !== '_') {
			overrides[key] = argv[key];
		}
	});

	const bail = (err: string|Error|{ error: string, ctx: Jsonish }): Never => {
		let ctx = null;
		if (err instanceof Error) {
			ctx = { 'stack': err.stack };
			err = err.toString();
		}
		else if (typeof err === 'object' && err.error && err.ctx) {
			ctx = err.ctx;
			err = err.error;
		}
		console.error(err.toString(), ctx);
		throw err;
	}

	const rv: Bootstrap = {
		'init': (launchPath) => {
			const conf = rv.conf = config(launchPath);
			const port = (process.env.NODE_PORT ? process.env.NODE_PORT : conf.get('http.port', 8000)).toString().split(':').reverse();
			conf.set('http.port', port);
			const log = rv.log = logger(conf);
			log.info(`environment: ${ conf.get('env') }`);
			log.info(`booting from ${ launchPath }`);
			rv.launchPath = launchPath;
			rv.app = express();
			rv.http = http.createServer(rv.app);
			const tp = conf.get('http.trust-proxy', null);
			if (tp && rv.app) {
				rv.app.set('trust proxy', tp);
			}
			return rv.context();
		},
		'start': (launchPath) => {
			return rv.bootstrap(launchPath).then((): Promise<string> => {
				return new Promise(async (resolve, reject) => {
					if (!rv.conf) {
						return reject('initialization failed');
					}
					const paths = rv.conf ? rv.conf.get('paths') : null;
					if (paths === null) {
						return reject('initialization failed');
					}
					const port = rv.conf ? rv.conf.get('http.port') : null;
					if (port === null) {
						return reject('initialization failed');
					}
					const isSocket = /\//.test(port[0]);

					if (isSocket && fs.existsSync(port[0])) {
						fs.unlinkSync(port[0]);
					}
					if (!rv.log) {
						return reject('initialization failed');
					}
					rv.log.info('relevant paths', paths);

					if (rv.conf && rv.conf.get('autoMigrate', false)) {
						await migrate(rv.conf);
					}
					const args = port.slice(0);
					args.push((err) => {
						if (err) {
							return reject(err);
						}
						if (isSocket) {
							fs.chmodSync(port[0], '777');
						}
						resolve(`listening on ${ port.reverse() }`);
					});
					if (!rv.http) {
						return reject('initialization failed');
					}
					rv.http.listen.apply(rv.http, args);
				})
			}, bail);
		},
		'stop': () => {
			if (rv.http) {
				rv.http.close();
			}
		},
		'bootstrap': async (launchPath) => {
			rv.init(launchPath);
			await middleware(rv.context());
			return rv.context();
		},
		'context': () => {
			if (!rv.launchPath || !rv.http || !rv.log || !rv.conf) {
				throw new Error('initialization failed');
			}
			return {
				express,
				'app': rv.app,
				'http': rv.http,
				'launchPath': rv.launchPath,
				'log': rv.log,
				'conf': rv.conf
			};
		}
	};
	return rv;
})();

