'use strict';

module.exports = ({ app, log }) => {
	app.use((req, res, next) => {
		if (res.headersSent) {
			return next();
		}
		if (res.renderer) {
			res.renderer
				.then(({ type, body, headers }) => {
					if (type) {
						res.type(type);
					}
					if (headers) {
						Object.keys(headers).forEach((k) => {
							res.header(k, headers[k]);
						});
					}
					if (body.length) {
						res.send(body);
					}
					res.end();
				}, (err) => { throw err })
				.then(() => {}, (err) => { throw err });
		}
		else {
			next();
		}
	});

	// let apps install error handlers since they don't have an easy way to
	// ensure anything gets installed at the end of the middleware chain
	// otherwise
	app.use((err, req, res, next) => {
		if (!app.errorHandlers.length) {
			return next(err);
		}
		let idx = 0;
		const nextHandler = () => {
			if (app.errorHandlers[idx]) {
				return app.errorHandlers[idx++](err, req, res, nextHandler);
			}
			next(err);
		};
		nextHandler();
	});
};
