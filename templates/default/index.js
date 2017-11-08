'use strict';
// @flow
import type { PackageFile } from '../../types';

const SECRET_SIZE = 40;

module.exports = {
	'descr': 'Stuff most applications need',
	'files': {
		'.gitignore': 'Ignore some things you don\'t want to commit',
		'server.js': 'Application entry point',
		'migrate.js': 'Migration utility for schema changes',
		'middleware/': 'Home for middleware',
		'middleware/index.js': 'Example middleware',
		'middleware.js': 'Middleware definitions',
		'views/': 'Home for templates',
		'views/index.hbs': 'Example template',
		'views/layouts/': 'Home for layouts common to templates of the same general type',
		'views/layouts/html.hbs': 'Layout for HTML views',
		'public/': 'Static files',
		'public/css/': 'Stylesheets',
		'public/css/site.css': 'Stub stylesheet',
		'conf.js': {
			'descr': 'Commit-able configuration',
			'impl': (pkg: PackageFile): string => {
				return `'use strict';
// @flow
module.exports = {
	'name': '${pkg.name ? pkg.name.toString() : ''}'
};`;

			}
		},
		'secrets.js': {
			'descr': 'Private per-application configuration (session secret, API keys)',
			'impl': () => {
				return `'use strict';
// @flow
module.exports = {
	'session': {
		'secret': '${require('crypto').randomBytes(SECRET_SIZE).toString('base64')}'
	}
};`;
			}
		},
		'ecosystem.config.js': {
			'descr': 'App definition to launch in monitored mode with pm2',
			'impl': (pkg: PackageFile): string => {
				return `'use strict';
module.exports = {
	/**
	 * Application configuration section
	 * http://pm2.keymetrics.io/docs/usage/application-declaration/
	 */
	'apps': [
		{
			'name': '${pkg.name ? pkg.name.toString() : 'unknown'}',
			'script': 'server.js',
			'env': { 'DEBUG': 'hex:*' }
		}
	]
};`;
			}
		}
	}
};
