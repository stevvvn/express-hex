'use strict';
// @flow

module.exports = {
	'up': (ctx) => {
	},
	'down': (ctx) => {
		throw new Error('irreversible migration');
	}
};
