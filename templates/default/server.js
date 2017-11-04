'use strict';
const hex = require('hex');
hex.start(__dirname).then((msg) => {
	// started up ok. msg is just a general status indicator. you can use hex.log and hex.conf if you have any user for them now
	hex.log.info(msg);
}, (err) => {
	// failed to boot. could be something like port already in use, or a problem with the middleware. hopefully there's a descriptive message about it
	console.error(err);
});
