'use strict';

/**
 * From Google API console, copy client id and secret into app's secrets.js,
 * in the path passport.strategies.google.client = { id, secret }
 *
 * Ensure one of the allowed redirect URLs for the app looks like https://$YOURDOMAIN/$PROXYBASE/login/google/callback,
 * and add the same string to conf.js under passport.strategies.google.callback
 *
 * You'll also need to ensure you've enabled the Google+ API in their API browser
 */
module.exports = ({ passport, router, conf, app }) => {
	passport.use(new (require('passport-google-oauth20').Strategy)({
		'clientID': conf.client.id,
		'clientSecret': conf.client.secret,
		'callbackURL': conf.callback
	}, (_accessToken, _refreshToken, profile, cb) => {
		// hopefully not reachable when API settings are correct
		if (!profile.emails || !profile.emails.length) {
			return cb('no email address supplied');
		}
		cb(null, {
			'domain': 'google',
			'name': profile.displayName,
			'email': profile.emails[0].value,
			'username': profile.emails[0].value.toLowerCase().replace(/(@.*?$|[^a-z0-9_])/g, '').substr(0, 30)
		});
	}));

	// scope: profile gets name, email gets ... email
	router.get('/google', passport.authenticate('google', { 'scope': conf.scope ? conf.scope : [ 'profile', 'email' ] }));

	// return from google
	router.get('/google/callback',
		passport.authenticate('google', { 'failureRedirect': '/login', 'failureFlash': true }),
		app.handleLogin);
};
