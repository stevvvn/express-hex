'use strict';
// @flow
import type { App, Conf } from '../../types';

const connectPg = require('connect-pg-simple');

module.exports = {
	'attach': ({ app, conf, session }: { app: App, conf: Conf, session: any }) => {
		return new (connectPg(session))({
			'conString': app.pg.conString
		});
	}
}

