'use strict';
// @flow
import type { MiddlewareDefs } from 'hex/types';

const mw: MiddlewareDefs = {
	'index': {
		'deps': [ 'hex.base' ]
	}
};
module.exports = mw;
