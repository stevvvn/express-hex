'use strict';
// @flow
import type { MiddlewareDefs } from './types';

const mw: MiddlewareDefs = {
	'dep': {
		'after': [ 'foo' ]
	},
	'test': {
		'description': 'just a test',
		'deps': [ 'dep' ]
	},
	'unused': {
		'description': 'not required for anything'
	},
	'base': {
		'bundle': [ 'test' ]
	}
};
module.exports = mw;
