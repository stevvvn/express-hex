'use strict';
// @flow
import type { App, Conf } from '../types';

const pg = require('pg').Pool;

module.exports = ({ app, conf }: { app: App, conf: Conf }) => {
	const pgconf = conf.get('pg');
	app.pg = new pg(pgconf);

	Object.keys(pgconf).forEach((k) => {
		pgconf[k] = encodeURIComponent(pgconf[k]);
	});
	app.pg.conString = `postgresql://${conf.get('pg.user')}:${conf.get('pg.password')}@${conf.get('pg.host', 'localhost')}:${conf.get('pg.port', 5432)}/${conf.get('pg.database')}`;

	// promise, connection will be established before next middleware
	return app.pg.connect();
};
