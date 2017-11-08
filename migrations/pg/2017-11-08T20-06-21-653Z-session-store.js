'use strict';
// @flow
module.exports = {
	'up': ({ app }) => {
		return app.pg.query(
			`CREATE TABLE session(
				sid varchar NOT NULL PRIMARY KEY,
				sess json NOT NULL,
				expire timestamp without time zone NOT NULL
			)`
		);
	},
	'down': ({ app }) => {
		return app.pg.query('DROP TABLE session');
	}
};
