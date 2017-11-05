'use strict';
// @flow
const SECRET_SIZE = 40;

module.exports = {
	'descr': 'Stuff most applications need',
	'files': {
		'.gitignore': 'Ignore some things you don\'t want to commit',
		'server.js': 'Application entry point',
		'middleware/': 'Home for middleware',
		'middleware/index.js': 'Example middleware',
		'middleware.js': 'Middleware definitions',
		'views/': 'Home for templates',
		'views/index.hbs': 'Example template',
		'views/layouts/': 'Home for layouts common to templates of the same general type',
		'views/layouts/html.hbs': 'Layout for HTML views',
		'conf.js': {
			'descr': 'Commit-able configuration',
			'impl': (pkg) => {
				return `'use strict';
// @flow
module.exports = {
	'name': '${pkg.name}'
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
		}
	}
};
