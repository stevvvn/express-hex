'use strict';
/**
 * This middleware sets up a Socket.IO connection.
 *
 * A namespace for the socket events is required, by default it is /hex but
 * you can set websocket.channel in conf.
 *
 * .js files in every included app's services/ path are registered
 * automatically.
 *
 * These files should follow this format:
 *
 * 	module.exports = (app, sock) => {
 * 		return {
 * 			'event name': (args) => handler
 * 		}
 * 	}
 *
 * Any number of events can be defined in a file.
 *
 * There is currently one supported authentication mechanism, which is to GET
 * /login/hmac-socket-token with an "Authentication" header that is a valid
 * signature per the docs of the hex.hmac middleware.
 *
 * A valid request to this endpoint will return { "token": "some base64" }
 *
 * Before issuing any other events, the client should send
 *		[ "authenticate", responseFromAbove.token ]
 *
 *	The client can then listen for "authenticate" with the JSON-encoded payload
 *		{ "status": "ok" }
 *
 *	Iif this is the response, the client can then send events to other services.
 *
 *	@TODO token expiry only partially implemented, should prob expire after 15m
 *	or so, and bump up expiry on valid requests
 */
const
	find = require('find'),
	crypto = require('crypto')
	;

module.exports = ({ app, express, server, router }) => {
	app.io = require('socket.io')(server).of(hex.conf.get('websocket.channel', '/hex'));
	const
		services = [],
		auth = hex.conf.get('websocket.auth.type', 'hmac-bearer'),
		tokenBytes = hex.conf.get('websocket.auth.tokenBytes', 32),
		tokenExpiry = hex.conf.get('websocket.auth.tokenExpiryS', 60)
		;

	const bindServices = (sock) => {
		services.forEach((service) => {
			service = service({ app, sock });
			Object.keys(service).forEach((mtd) => {
				sock.on(mtd, service[mtd]);
			});
		});
	};

	// load callbacks from services/ paths of used apps
	Object.keys(app.regPaths.services).forEach((path) => {
		find.fileSync(/[.]js$/, path).forEach((file) => {
			services.push(require(file)({ app }));
		});
	});
	app.io.on('connection', (sock) => {
		// interject auth step
		if (auth) {
			sock.on('authenticate', (token) => {
				app.redis.getAsync('hex-bearer-' + token)
					.then((client) => {
						if (!client) {
							return;
						}
						app.redis.delAsync('hex-bearer-' + token);
						bindServices(sock);
						// tell client it's good to proceed
						sock.emit('authenticate', { 'status': 'ok', 'app': client });
					});
			});
		}
		else {
			bindServices(sock);
		}
	});

	if (auth) {
		// Use the ability to sign a request as an registered API as proof
		// enough to get an access token to use the socket]
		//
		// This is a GET with no parameters, just an Authorization header
		// as specified by hex.hmac. Since there is no payload to this request,
		// content MD5 is MD5('')
		//
		// Returns { "token": "some base64" } if successful.
		// Errors are at the discretion of hex.hmac.
		router.post('/login/hmac-socket-token', app.ensureSigned, (req, res, next) => {
			const token = crypto.randomBytes(tokenBytes).toString('base64');
			app.redis.multi()
				.set('hex-bearer-' + token, req.signature.app)
				.expire('hex-bearer-' + token, tokenExpiry)
				.execAsync()
				.then(() => {
					res.json({ 'token': token });
				});
		});
	}
};
