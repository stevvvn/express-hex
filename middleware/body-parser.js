'use strict';
const bodyParser = require('body-parser');
const obj = require('hex-object');

module.exports = ({ app, conf }) => {
	const settings = obj.wrap({
		'extended': false,
		'verify': (req, res, buf, encoding) => {
			req.rawBody = buf;
   	}
	})
		.augment(conf.get('body-parser', {}))
		.get();

	app.use(bodyParser.json(settings));
	app.use(bodyParser.urlencoded(settings));
	app.use(bodyParser.text(settings));
	app.use(bodyParser.raw(settings));
};
