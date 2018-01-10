'use strict';
// @flow
import type { SMap, Logger, Conf } from '../types';

const
	fs = require('fs'),
	stringify = require('json-stringify-safe')
	;

module.exports = (conf: Conf): Logger => {
	const
		rv = {},
		debug = require('debug'),
		file = conf.get('log.auth', null);

	[ 'emerg', 'alert', 'crit', 'error', 'warn', 'notice', 'info', 'debug', 'access' ].forEach((lvl) => {
		const stream = debug(`hex:${lvl}`);
		rv[lvl] = (msg, ctx) => {
			stream(msg + (ctx ? ` - ${ stringify(ctx) }` : ''));
		}
	});

	if (file) {
		let fd = fs.openSync(file, 'a');
		rv.auth = (msg, ctx, dt = null, errors = 0) => {
			if (!dt) {
				dt = (new Date).toISOString();
			}
			fs.write(fd, `${dt} ${msg} ${ctx ? stringify(ctx) : ''}\n`, (err) => {
				if (err) {
					if (errors > 5) {
						throw err;
					}
					fd = fs.openSync(file, 'a');
					return module.exports.auth(msg, ctx, dt, ++errors);
				}
			});
		}
	}
	return rv;
};
