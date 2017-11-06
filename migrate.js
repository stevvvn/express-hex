'use strict';
/// @flow
require('flow-remove-types/register')({ 'excludes': null });
const hex = require('./server');

module.exports = (launchPath: string) => {
	hex.init(__dirname);
	if (!hex.log || !hex.conf) {
		throw new Error('hex initialization failed');
	}
	console.log(hex.conf.get('paths'));
}
