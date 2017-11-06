'use strict';
// @flow
import type { App } from '../types';

const csurf = require('csurf');

module.exports = ({ app }: { app: App }) => {
	app.csrf = csurf();
};
