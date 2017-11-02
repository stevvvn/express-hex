'use strict';
// @flow
const csurf = require('csurf');

module.exports = ({ app }) => {
	app.csrf = csurf();
};
