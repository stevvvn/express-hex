'use strict';
// @flow
import type { Conf, App, Logger } from '../types';

const YAML = require('js-yaml');

module.exports = ({ app, conf, log }: { app: App, conf: Conf, log: Logger }) => {
	app.servicePaths = (base) => {
		if (/\/$/.test(base)) {
			return [ base, `${base}index`, `${base}index.json`, `${base}index.txt`, `${base}index.html` ];
		}
		return [ base, `${base}.json`, `${base}.txt`, `${base}.html` ];
	}

	const
		name = conf.get('name', null),
		proxyBase = conf.get('http.proxyBase', '/')
		;
	app.use((req, res, next) => {
		res.multirender = (view, params, cb) => {
			if (!params) {
				params = {};
			}
			let type;
			if (/[.]txt$/.test(req.path)) {
				type = 'yaml';
			}
			else if (/[.]json$/.test(req.path)) {
				type = 'json';
			}
			else if (/[.]html$/.test(req.path)) {
				type = 'html';
			}
			else if (view === null) {
				type = 'json';
			}
			else {
				type = 'html'; // default
				req.negotiate().some((type) => {
					if (/text/.test(type)) {
						type = 'yaml';
						return true;
					}
					if (/json/.test(type)) {
						type = 'json';
						return true;
					}
					if (/(html|[*])/.test(type)) {
						return true;
					}
					return false;
				});
			}

			switch (type) {
				case 'yaml':
					res.type('text');
					res.content = YAML.safeDump(params);
					cb();
				break;
				case 'json':
					res.type('json');
					res.content = JSON.stringify(params);
					cb();
				break;
				default:
					params.proxyBase = proxyBase;
					if (name) {
						params.title = name + (params.title ? ': ' + params.title : '');
					}
					res.render(view, params, (err, html) => {
						if (err) {
							log.error(err);
						}
						res.content = html;
						cb();
					});
			}
		}
		next();
	});
}
