'use strict';
// @flow
import type { SMap, Logger } from './types';

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
	return {
		conf,
		log,
		'start': (launchPath: string): Promise<string> => {
			conf = require('./lib/conf')(launchPath);
			log.info('booting', { launchPath });
			log.warn('...');
			return new Promise((resolve, reject) => {
				const port = conf.get('port', 8000);
				resolve(`:${ port }`);
			});
		}
	};
})();

