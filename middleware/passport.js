'use strict';
const passport = require('passport');

module.exports = ({ app, express }) => {
	const strategies = hex.conf.get('passport.strategies', {}), enabled = Object.keys(strategies).sort((a, b) => {
		if (a.order === b.order) {
			return 0;
		}
		if (a.order === undefined) {
			return 1;
		}
		if (b.order === undefined) {
			return -1;
		}
		return a.order < b.order ? -1 : 1;
	});
	if (enabled.length === 0) {
		return;
	}
	passport.serializeUser((user, done) => {
		done(null, JSON.stringify(user));
	});

	passport.deserializeUser((user, done) => {
		done(null, JSON.parse(user));
	});

	app.use(passport.initialize());
	app.use(passport.session());
	app.use(require('connect-flash')())

	const
		links = [],
		proxyBase = hex.conf.get('http.proxyBase', '/'),
		loginBase = hex.conf.get('passport.base', '/login').replace(/\/$/, ''),
		linkBase = proxyBase + loginBase,
		router = express.Router();

	app.use(loginBase, router);

	app.loginHandlers = [ (req, res) => {
		let ret = proxyBase;
		if (req.session.loginReturn) {
			ret = req.session.loginReturn;
			delete req.session.loginReturn;
		}
		res.redirect(ret);
	} ];
	app.handleLogin = (req, res) => {
		let cbIdx = -1;
		const next = () => {
			if (++cbIdx === app.loginHandlers.length) {
				return;
			}
			app.loginHandlers[cbIdx](req, res, next);
		};
		next();
	}

	enabled.forEach((strat) => {
		strategies[strat].impl = require(`${__dirname}/passport/${strat}.js`)({
			app,
			router,
			passport,
			linkBase,
			'conf': strategies[strat]
		});
		if (!strategies[strat].impl) {
			strategies[strat].impl = {};
		}
		links.push({
			strat,
			'link': strategies[strat].impl.link
				? strategies[start].impl.link
				: `<a href="${linkBase}/${strat}">${strategies[strat].label ? strategies[strat].label : strat.charAt(0).toUpperCase() + strat.slice(1) + ' account'}</a>`
		});
	});

	router.get('/', (req, res, next) => {
		if (req.query.return) {
			req.session.loginReturn = req.query.return;
		}
		res.multirender('login', { links }, next);
	});

	router.get('/destroy', (req, res, next) => {
		req.logout();
		res.redirect(proxyBase === '' ? '/' : proxyBase);
	});
};
