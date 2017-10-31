'use strict';
const custom = require('passport-custom');

module.exports = ({ passport, router, app }) => {
	passport.use('shibboleth', new custom((req, cb) => {
		if (!req.headers['shib-identity-provider'] || !req.headers.eppn) {
			return cb('no eppn provided', null);
		}
		const user = {
			'domain': req.headers['shib-identity-provider'],
			'email': req.headers.eppn
		};
		user.username = req.headers.username ? req.headers.username : req.headers.eppn.replace(/@.*$/, '');
		if (req.headers.displayName) {
			user.name = req.headers.displayName;
		}
		else if (req.headers.givenName && req.headers.sn) {
			user.name = req.headers.givenName + ' ' + req.headers.sn;
		}
		return cb(null, user);
	}));

	// @TODO - temporary, this needs to do something like the current shib CMS plugin, listing the supported idps and storing the clicked one in a session that gets re-integrated with the request here
	router.get('/shibboleth/wayf', (req, res) => {
		res.redirect(req.query.return + '&entityID=https://idp.testshib.org/idp/shibboleth');
	});

	/**
	 * mod_shib2 does the work here, we just need to look for the headers it sets in the custom strategy above
	 *
	 * example apache configuration:
       <Location /login/shibboleth>
                AuthType shibboleth
                ShibRequestSetting requireSession 1
					 # Important -- otherwise the shib module only sets env variables we're not (easily) privy to
                ShibUseHeaders on
                Require valid-user
        </Location>

        # Disable auth for the wayf b/c it's needed prior to the initial redirect
        <Location /login/shibboleth/wayf>
                AuthType Shibboleth
                ShibRequestSetting requireSession false
                Require shibboleth
        </Location>

        ProxyPass "/login" "http://localhost:8001"
        ProxyPassReverse "/login" "http://localhost:8001"

	 * (Note about paths)
	 * In conf.js, passport.base is set to '/', but alternatively Apache could proxy every request at '/', and the default proxy.base of '/login' could be used. Just not both, to avoid '/login/login/shibboleth'
	 */
	router.get('/shibboleth', passport.authenticate('shibboleth'), app.handleLogin);
};
