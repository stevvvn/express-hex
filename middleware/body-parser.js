'use strict';
// @flow
const	bodyParser = require('body-parser');

module.exports = ({ app, conf }) => {
	const bpconf = conf.get('bodyParser', {});
	if (bpconf.extend === undefined) {
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
