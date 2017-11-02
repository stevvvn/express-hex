'use strict';
const session = require('express-session');

module.exports = ({ app, conf }) => {
	app.use(session({
		'secret': conf.get('session.secret'),
		'cookie': { 'maxAge': 60 * 60 * 1000 },
		'resave': false,
		'saveUninitialized': false,
		'rolling': conf.get('session.rolling', false),
		'store': new (require('./session/redis-store.js'))(app)
	}));
};
