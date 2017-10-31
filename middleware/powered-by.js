'use strict';
// @flow
import type { Conf, App } from '../types';

module.exports = ({ conf, app }: { conf: Conf, app: App }) => {
	app.use((_, res, next) => {
		let pb = conf.get('http.powered-by', null);
		if (pb) {
			res.header('x-powered-by', pb);
		}
		else {
			res.removeHeader('x-powered-by');
		}
		next();
	});
};
