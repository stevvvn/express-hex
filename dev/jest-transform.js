'use strict';
const frt = require('flow-remove-types');
module.exports = {
	process(src, filename) {
		return frt(src).toString();
	}
};
