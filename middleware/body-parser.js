'use strict';
// @flow

const bodyParser = require('body-parser');
const obj = require('hex-object');

import type { Context } from '../types/hex';

module.exports = ({ app, conf }: Context) => {
	const settings = obj.wrap({
		'extended': false,
		'verify': (req, res, buf, encoding) => {
			req.rawBody = buf;
   	}
	})
		.augment(conf.get('bodyParser', {}))
		.get();

	app.use(bodyParser.json(settings));
	app.use(bodyParser.urlencoded(settings));
	app.use(bodyParser.text(settings));
	app.use(bodyParser.raw(settings));
};
