'use strict';
// @flow
import type { SMap, Logger, Jsonish, Never } from './types';
const express = require('express'), app = express();

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

	let conf;

	const log: Logger = require('./lib/log');
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
		log.error(err.toString(), ctx);
		process.exit();
	}

	return { conf, log,
		'start': (launchPath: string): Promise<string> => {
			log.info(`booting from ${launchPath}`);
			conf = require('./lib/conf')(launchPath);
			return require('./lib/middleware')({ log, launchPath, conf, express, app }).then((): Promise<string> => {
				return new Promise((resolve, reject) => {
					const port = process.env.NODE_PORT ? process.env.NODE_PORT : conf.get('http.port', 8000);
					app.listen(port, (err) => {
						if (err) {
							return reject(err);
						}
						resolve(`listening on :${ port }`);
					});
				});
			}, bail);
		}
	};
})();

