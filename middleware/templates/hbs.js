'use strict';
// @flow
import type { Conf } from '../../types';

const hbs = require('express-hbs'), fs = require('fs');

module.exports = ({ conf, app }: { conf: Conf }) => {
	const proxyBase = conf.get('proxyBase', '/');
	/// @TODO need to aggregate into one path, having an array of dirs stalls responses indefinitely
//	const partialsDir = conf.get('paths.views')
//			.map((path) => { return `${path}/partials`; })
//			.filter(fs.existsSync);

	app.use((req, res, next) => {
		res.locals.proxyBase = proxyBase;
		next();
	});

	const appTitle = conf.get('title', null);
	hbs.registerHelper('title', (ctx) => {
		if (!appTitle) {
			return ctx.data.root.title;
		}
		return `${appTitle}${ctx.data.root.title ? `: ${ctx.data.root.title}` : ''}`;
	});

	hbs.registerHelper('media', (ctx) => {
		if (!ctx.data.root._media) {
			return '';
		}
		return Object.keys(ctx.data.root._media).map((file) => {
			file = `${proxyBase === '/' ? '' : proxyBase}/${file.replace(/^\//, '')}`;
			if (/[.]js$/.test(file)) {
				return `<script src="${file}"></script>`;
			}
			else if (/[.]css$/.test(file)) {
				return `<link rel="stylesheet" href="${file}">`;
			}
			else {
				log.error(`no embed handling for media ${file}`);
				return '';
			}
		}).join('\n');
	});

	return hbs.express4({
		'layoutsDir': conf.get('paths.launch') + '/views/layouts',
		'partialsDir': ''
	});
};
