'use strict';
// @flow
import type { App, Req, Res, Next } from 'hex/types';

// parameter is type MiddlewareContext, see that definition for properties
module.exports = ({ app }: { app: App }) => {
	app.get('/', (req: Req, res: Res, next: Next) => {
		res.render('index', { 'msg': 'It\'s working, sort of!' });
	});
};
