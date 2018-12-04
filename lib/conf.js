'use strict';
// @flow
import type { SMap, JsonObject, Conf } from '../types/hex';

const fs = require('fs'), obj = require('hex-object');

if (!process.env.NODE_ENV) {
	process.env.NODE_ENV = 'development';
}

module.exports = (path: string): Conf => {
	const conf = obj.wrap(fs.existsSync(`${ path }/conf.js`)
		// $FlowFixMe
		? require(`${ path }/conf`)
		: {});

	conf.normalize();

	[ 'secrets', 'conf.site' ].forEach((extra) => {
		if (fs.existsSync(`${ path }/${ extra }.js`)) {
			// $FlowFixMe
			conf.augment(require(`${ path }/${ extra }.js`));
			conf.normalize();
		}
	});

	if (!conf.get('env', null)) {
		conf.set('env', process.env.NODE_ENV ? process.env.NODE_ENV : 'development');
	}
	process.env.NODE_ENV = conf.get('env');

	return conf;
};
