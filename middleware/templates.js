'use strict';
// @flow
import type { Conf, App } from '../types';

const fs = require('fs');

module.exports = ({ app, conf }: { app: App, conf: Conf }) => {
	const
		engines = conf.get('template.engines', [ 'hbs' ]),
		root = conf.get('paths.launch'),
//		proxyBase = conf.get('http.proxyBase', '/'),
		siteCss = fs.existsSync(`${root}/public/css/site.css`)
		;

	engines.forEach((type) => {
		app.engine(type, require(`${__dirname}/templates/${type}`)({ app, conf }));
	});

	app.use((req, res, next) => {
		if (!res.locals._media) {
			res.locals._media = {};
			if (siteCss) {
				res.locals._media['css/site.css'] = true;
			}
		}
		res.attach = (...media) => {
			media.forEach((file) => {
				res.locals._media[file] = true;
			});
		};
		next();
	});

	app.set('view engine', engines[0]);
	app.set('views', conf.get('paths.views', []));
}
