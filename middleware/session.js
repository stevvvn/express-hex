'use strict';
// @flow
const session = require('express-session');

module.exports = ({ app, conf, log }) => {
	const
		mw = conf.get('requiredMiddleware'),
		storeName = mw['hex.redis'] ? 'redis-store' : mw['hex.pg'] ? 'pg-store' : 'mem-store';
	let store = require(`${__dirname}/session/${storeName}`);
	log.info(`\t\tstore: ${storeName}`);

	if (store.attach) {
		app.locals.sessionStore = store = store.attach({ app, conf, session });
	}
	else {
		app.locals.sessionStore = store = new store(app);
	}

	app.use(session({
		store,
		'secret': conf.get('session.secret'),
		'cookie': { 'path': '/' },
		'resave': false,
		'saveUninitialized': false,
		'rolling': conf.get('session.rolling', false)
	}));
};
