'use strict';
// @flow

import type { App } from 'hex/types';

module.exports = ({ app }: { app: App }) => {
	app.get(app.servicePaths('/'), (req, res, next) => {
		res.multirender('index', { 'msg': 'It works, sort of!' }, next);
	});
}
