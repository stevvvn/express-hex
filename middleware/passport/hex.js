'use strict';
const jwt = require('jsonwebtoken');

module.exports = ({ passport, app, router, conf, linkBase }) => {
	const proxyBase = hex.conf.get('http.proxyBase', '').replace(/\/$/, '');

	router.get('/hex', (req, res) => {
		if (req.query.return) {
			req.session.return = Buffer.from(req.query.return, 'base64').toString();
		}
		res.redirect(`${conf.service.url}?return=${Buffer.from((req.secure ? 'https' : 'http') + '://' + req.hostname + linkBase + '/hex/callback').toString('base64')}`);
	});

	router.get('/hex/callback', (req, res) => {
		if (!req.query.jwt) {
			return res.status(400).send();
		}
		jwt.verify(req.query.jwt, conf.service.key, { 'algorithms': [ 'RS256' ] }, (err, user) => {
			if (err) {
				return res.status(403).send('Forbidden');
			}
			app.redis.getAsync(`hex:jwt:${user.jti}`)
				.then((tok) => {
					// no double spends
					if (tok) {
						return res.status(403).send('Forbidden');
					}
					return app.redis.multi()
						.set(`hex.jwt.${user.jti}`, 1)
						.expire(`hex.jwt.${user.jti}`, user.expiry)
						.execAsync()
						.then(() => { return user; });
				})
				.then((user) => {
					[ 'expiry', 'iat', 'exp', 'jti' ].forEach((k) => {
						if (user[k]) {
							delete user[k];
						}
					});

					req.login(user, (err) => {
						if (err) {
							hex.log.error(err);
							return res.status(500).send('Internal Server Error');
						}
						let ret = proxyBase === '' ? '/' : proxyBase;
						if (req.session.return) {
							ret = req.session.return;
							delete req.session.return;
						}
						res.redirect(ret);
					});
				});
		});
	});
}
