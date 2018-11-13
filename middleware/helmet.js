'use strict';
const helmet = require('helmet');

module.exports = ({ app, conf }) =>
	app.use(helmet(conf.get('helmet', {})));
