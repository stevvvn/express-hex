'use strict';
// @flow

const hbs = require('express-hbs');

module.exports = ({ conf }) => {
	return hbs.express4({
		'layoutsDir': conf.get('paths.launch') + '/views/layouts'
	});
};
