'use strict';
const { Writable } = require('stream');

module.exports = ({ app, conf, log }) => {
	const opts = conf.get('log.access.options', {});
	if (!opts.stream) {
		opts.stream = new Writable({
			'write': (msg, encoding, cb) => {
				log.access(msg.toString('utf8'));
				cb();
			}
		});
	}
	app.use(require('morgan')(conf.get('log.access.format', 'combined'), opts));
}
