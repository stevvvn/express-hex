'use strict';
// @flow
import type { SMap, Conf, Logger, Jsonish, Never, Bootstrap } from './types';
const express = require('express'), http = require('http'), fs = require('fs');

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
		'init': (launchPath: string): void => {
			rv.conf = require('./lib/conf')(launchPath);
			rv.log = require('./lib/log')(rv.conf);
			rv.log.info(`environment: ${rv.conf.get('env')}`);
			rv.log.info(`booting from ${launchPath}`);
			rv.launchPath = launchPath;
			rv.app = express();
			rv.http = http.createServer(rv.app);
			const tp = rv.conf.get('http.trust-proxy', null);
			if (tp) {
				rv.app.set('trust proxy', tp);
			}
		},
		'start': (launchPath: string): Promise<string> => {
			return rv.bootstrap(launchPath).then((): Promise<string> => {
				return new Promise((resolve, reject) => {
					if (!rv.conf || !rv.log) {
						return reject('initialization failed');
					}
					const
						paths = rv.conf.get('paths'),
						port = (process.env.NODE_PORT ? process.env.NODE_PORT : rv.conf.get('http.port', 8000)).toString().split(':').reverse(),
						isSocket = /\//.test(port[0])
						;
					if (isSocket && fs.existsSync(port[0])) {
						fs.unlinkSync(port[0]);
					}
					rv.log.info('relevant paths', paths);
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
					rv.http.listen.apply(rv.http, args);
				})
			}, bail);
		},
		'stop': () => {
			if (rv.http) {
				rv.http.close();
			}
		},
		'bootstrap': (launchPath: string): Promise<string> => {
			rv.init(launchPath);
			return require('./lib/middleware')(rv.context());
		},
		'context': () => {
			return { express, 'app': rv.app, 'http': rv.http, 'launchPath': rv.launchPath, 'log': rv.log, 'conf': rv.conf };
		}
	};
	return rv;
})();

