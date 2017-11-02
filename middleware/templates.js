'use strict';
// @flow
import type { Conf, App } from '../types';

module.exports = ({ app, conf }: { app: App, conf: Conf }) => {
	const engines = conf.get('template.engines', [ 'hbs' ]);

	engines.forEach((type) => {
		app.engine(type, require(`${__dirname}/templates/${type}`)({ app, conf }));
	});

	app.set('view engine', engines[0]);
	app.set('views', conf.get('paths.views', []));
}
