'use strict';
const session = require('express-session');

module.exports = ({ app, conf }) => {
	const mw = conf.get('_middleware');
	let store = require('./session/' + (mw['hex.redis'] ? 'redis-store' : mw['hex.pg'] ? 'pg-store' : 'mem-store'));

	if (store.attach) {
		store = store.attach({ app, conf, session });
	}
	else {
		store = new store(app);
	}
	
	app.use(session({
		store,
		'secret': conf.get('session.secret'),
		'cookie': { 'maxAge': conf.get('session.max-age', 60 * 60 * 1000) },
		'resave': false,
		'saveUninitialized': false,
		'rolling': conf.get('session.rolling', false)
	}));
};
