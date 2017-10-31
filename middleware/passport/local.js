'use strict';
const bcrypt = require('bcrypt');

module.exports = ({ passport, app, router, conf, linkBase }) => {
	passport.use(new (require('passport-local').Strategy)({ 'passReqToCallback': true }, (req, username, password, done) => {
		// determine whether login credentials are acceptable
		// temporary implementation using users stored in redis, not sure how it would need to work in actual practice yet
		app.redis.hgetallAsync(`hex-user-${username}@local`).then((user) => {
			// determine whether a login is acceptable. not called if a user is "soft-blocked", below
			const process = () => {
				// bad credentials. "reason" is logged but not shared
				// the auth log can be used by fail2ban to implement other types of blocking
				const fail = (reason) => {
					const reply = () => {
						hex.log.auth('failure', { username, reason, 'domain': 'local', 'address': req.ip });
						return done(null, null, { 'message': 'Invalid credentials' });
					};
					// increment attempts against soft block where applicable
					if (conf.blockUserIpPairs) {
						app.redis.multi()
							.hget(`hex-login-attempts-${req.ip}`, username)
							.expire(`hex-login-attempts-${req.ip}`, conf.blockUserIpPairs.forSeconds)
							.execAsync()
								.then((log) => {
									app.redis.hsetAsync(`hex-login-attempts-${req.ip}`, username, log[0] ? parseInt(log[0]) + 1 : 1)
										.then(reply);
								});
					}
					else {
						reply();
					}
				}
				if (!user) {
					return fail('no such user');
				}
				bcrypt.compare(password, user.hash)
					.then((match) => {
						if (!match) {
							return fail('bad password');
						}
						user.domain = 'local';
						delete user.hash;
						hex.log.auth('success', { ...user, 'address': req.ip });
						return done(null, user);
					});
			};
			// soft block short-circuit
			if (conf.blockUserIpPairs) {
				app.redis.hgetAsync(`hex-login-attempts-${req.ip}`, username).then((attempts) => {
					if (!attempts || parseInt(attempts) < conf.blockUserIpPairs.attempts) {
						return process();
					}
					hex.log.auth('failure', { username, 'domain': 'local', 'reason': `address-username pair blocked after ${attempts} attempts`, 'address': req.ip });
					return done(null, null, { 'message': 'Too many failures, account locked' });
				});
			}
			else {
				process();
			}
		}, (err) => { done(err); });
	}));

	// login form
	router.get('/local', app.csrf, (req, res, next) => {
		res.multirender('passport/local', { linkBase, 'message': req.flash('error'), 'csrf': req.csrfToken() }, next);
	});

	// login attempt
	router.post('/local',
		app.csrf,
		passport.authenticate('local', { 'failureRedirect': `${linkBase}/local`, 'failureFlash': true }),
		app.handleLogin
	);
};
