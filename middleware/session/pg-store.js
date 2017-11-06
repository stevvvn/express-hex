'use strict';
// @flow
const connectPg = require('connect-pg-simple');

module.exports = {
	'attach': ({ app, conf, session }) => {
		return new (connectPg(session))({
			'conString': app.pg.conString
		});
	}
}

