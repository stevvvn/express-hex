'use strict';
// @flow
import type { SMap, JsonObject, Conf } from '../types';

const fs = require('fs'), obj = require('hex-object');

module.exports = (path: string): Conf => {
	const conf = obj.wrap(require(`${ path }/conf.js`));
	conf.normalize();

	if (fs.existsSync(`${ path }/secrets.js`)) {
		conf.augment(require(`${ path }/secrets.js`));
		conf.normalize();
	}
	return conf;
};
