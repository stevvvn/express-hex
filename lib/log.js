'use strict';
// @flow
import type { SMap, Logger } from '../types';

module.exports = ((): Logger => {
	const
		rv = {},
		debug = require('debug')
		;
	[ 'emerg', 'alert', 'crit', 'error', 'warn', 'notice', 'info', 'debug', 'access' ].forEach((lvl) => {
		const stream = debug(`hex:${lvl}`);
		rv[lvl] = (msg, ctx) => {
			stream(msg + (ctx ? ` - ${ JSON.stringify(ctx) }` : ''));
		}
	});
	return rv;
})();
