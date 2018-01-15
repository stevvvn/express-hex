'use strict';
// @flow
import type { App, Conf } from '../types';

const	bodyParser = require('body-parser');

module.exports = ({ app, conf }: { app: App, conf: Conf }) => {
	const bpconf = conf.get('body-parser', {});
	if (bpconf.extended === undefined) {
		bpconf.extended = false;
	}
	bpconf.verify = (req, res, buf, encoding) => {
		req.rawBody = buf;
	};
	app.use(bodyParser.json(bpconf));
	app.use(bodyParser.urlencoded(bpconf));
	app.use(bodyParser.text(bpconf));
	app.use(bodyParser.raw(bpconf));
};
