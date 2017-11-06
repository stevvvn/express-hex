'use strict';
// @flow
import type { SMap, JsonObject, Conf } from '../types';

const fs = require('fs');

module.exports = (path: string): Conf => {
	let conf: SMap<any> = require(`${ path }/conf.js`);

	if (fs.existsSync(`${ path }/secrets.js`)) {
		conf = augment(conf, require(`${ path }/secrets.js`));
	}

	const iface = {
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
				throw new Error(`configuration attribute ${path} is undefined`);
			}
			return val;
		},
		'set': (path, val, setter = null) => {
			if (!setter) {
				setter = (targ, key) => { targ[key] = val; };
			}
			const keys = path.split('.');
			let targ = conf;
			keys.forEach((key, idx) => {
				if (idx === keys.length - 1) {
					setter && setter(targ, key);
				}
				else {
					if (!targ[key]) {
						targ[key] = {};
					}
					targ = targ[key];
				}
			});
			return iface;
		},
		'push': (path, val) => {
			return iface.set(path, null, (targ, key) => {
				if (!targ[key] || !targ[key].constructor || targ[key].constructor !== Array) {
					targ[key] = [];
				}
				targ[key].push(val);
			});
		}
	};
	return iface;
};

function augment(a, b, mergeArrays): any {
	if (mergeArrays && Array.isArray(a) && Array.isArray(b)) {
		return [].concat(a, b);
	}
	Object.keys(b).forEach((k) => {
		if (b[k] !== null && typeof(a[k]) === 'object' && typeof(b[k]) === 'object') {
			a[k] = augment(a[k], b[k], mergeArrays);
		}
		else {
			a[k] = b[k];
		}
	});
	return a;
}
