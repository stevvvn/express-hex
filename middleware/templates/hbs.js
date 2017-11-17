'use strict';
// @flow
import type { Conf } from '../../types';

const hbs = require('express-hbs'), fs = require('fs');

module.exports = ({ conf }: { conf: Conf }) => {
	return hbs.express4({
		'layoutsDir': conf.get('paths.launch') + '/views/layouts',
		'partialsDir': conf.get('paths.views')
			.map((path) => { return `${path}/partials`; })
			.filter(fs.existsSync)
	});
};
