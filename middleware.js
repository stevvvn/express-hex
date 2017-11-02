'use strict';
// @flow
import type { MiddlewareDefs } from './types';

const mw: MiddlewareDefs = {
	'powered-by': {
		'description': 'Change or remove powered-by header'
	},
	'access-log': {
		'description': 'Log requests'
	},
	'negotiate': {
		'description': 'Parse requested content type out of accept header'
	},
	'multirender': {
		'description': 'Render the same params as HTML, JSON, or YAML',
		'deps': [ 'templates', 'negotiate' ]
	},
	'templates': {
		'description': 'Template engine for views',
	},
	'session': {
		'description': 'Session management',
		'deps': [ 'redis' ]
	},
	'redis': {
		'description': 'Promisified Redis client'
	},
	'csrf': {
		'description': 'Request forgery tokens for POST forms',
		'deps': [ 'session' ]
	},
	'base': {
		'bundle': [ 'powered-by', 'access-log', 'templates', 'negotiate', 'multirender', 'session' ]
	}
};
module.exports = mw;
