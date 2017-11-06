'use strict';
// @flow
import type { MiddlewareDefs } from 'hex/types';

const mw: MiddlewareDefs = module.exports = {
	'index': {
		'description': 'Main page',
		'deps': [ 'hex.templates' ]
	}
};
