'use strict';
// @flow
import type { MiddlewareDefs } from './types/hex';

const mw: MiddlewareDefs = {
	'body-parser': {
		'description': 'Parse request bodies'
	},
	'helmet': {
		'description': 'Common security headers'
	}
};
module.exports = mw;
