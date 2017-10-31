'use strict';

module.exports = ({ app }) => {
	app.use((req, res, next) => {
		if (res.content) {
			if (!res.status().statusCode) {
				res.status(200);
			}
			res.send(res.content).end();
		}
		else {
			next();
		}
	});
};
