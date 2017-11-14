'use strict';

module.exports = ({ app }) => {
	app.use((req, res, next) => {
		if (res.headersSent) {
			return next();
		}
		if (res.renderer) {
			res.renderer
				.then(({ type, body }) => {
					if (type) {
						res.type(type);
					}
					if (body.length) {
						res.send(body);
					}
					res.end();
				}, (err) => { throw err })
				.then(() => {}, (err) => { throw err });
		}
		else if (res.content) {
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
