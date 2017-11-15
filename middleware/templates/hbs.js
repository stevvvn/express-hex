'use strict';
// @flow

const hbs = require('express-hbs'), fs = require('fs');

module.exports = ({ conf }) => {
	return hbs.express4({
		'layoutsDir': conf.get('paths.launch') + '/views/layouts',
		'partialsDir': conf.get('paths.views')
			.map((path) => { return `${path}/partials`; })
			.filter(fs.existsSync)
	});
};
