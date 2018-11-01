'use strict';
// @flow
import type { MiddlewareDefs } from './types/hex';

const mw: MiddlewareDefs = {
	'body-parser': {
		'description': 'Parse request bodies'
	}
};
module.exports = mw;
