'use strict';
// @flow
import type { SMap, JsonObject, Conf } from '../types';

const fs = require('fs');

module.exports = (path: string): Conf => {
	let conf: SMap<any> = require(`${ path }/conf.js`);

	if (fs.existsSync(`${ path }/secrets.js`)) {
		conf = Object.assign(conf, require(`${ path }/secrets.js`));
	}

	return {
		'get': (path, def) => {
			if (!path) {
				return conf;
			}
			const keys = path.split('.');
			let val = conf;

			keys.every((key) => {
				if (!val || val[key] === undefined) {
					val = def;
					return false;
				}
				val = val[key];
				return true;
			});
			if (def === undefined && val === undefined) {
				throw Error(`configuration attribute ${path} is undefined`);
			}
			return val;
		}
	};
};
