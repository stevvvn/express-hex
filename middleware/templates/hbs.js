'use strict';
// @flow
import type { Conf } from '../../types';

const hbs = require('express-hbs');

module.exports = ({ conf }: { conf: Conf }) => {
	return hbs.express4({
		'layoutsDir': conf.get('paths.launch') + '/views/layouts'
	});
};
