'use strict';
// @flow

const
	hex = require('../index'),
	fs = require('fs'),
	migrations = require('migrations'),
	pth = require('path')
	;

function help(path) {
	console.log(`
This script manages migrations for your application.

Upon running a migration (up or down), it loads all the middleware defined in
your app's 'middleware.js', and passes the same contextual variables to your
migrations that middleware receive. This means any connections you establish
for your middleware can be used in the same way in a migration.

A record of which migrations were applied (and when) is kept in
	'${path}/migrations/record.json'.

If you would like to change what newly-created migrations look like, create
	'${path}/migrations/template.js'.

Migrations are organized into subfolders indicating which middleware they refer
to. For example, 'migrations/pg/*' apply changes to PostgreSQL.

Run with the environment variable 'DEBUG=hex:*' for verbosity, or 'DEBUG=*' for
maximum verbosity.

Command summary:`
	);
	[
		[ 'up', 'apply all pending migrations' ],
		[ 'up $PATH', 'apply a specific migration' ],
		[ 'down', 'revert the last-applied migration' ],
		[ 'down $PATH', 'revert a migration' ],
		[ 'create $MIDDLEWARE_TYPE $DESCRIPTION', 'create a new migration from the template and drop it in \'middleware/$MIDDLEWARE_TYPE\'' ],
		[ 'edit $MIDDLEWARE_TYPE $DESCRIPTION', 'same as \'create\' but opens an editor with the new file. Editor is env var EDITOR || vim' ]
	].forEach((opt) => {
		console.log(`\t${pth.basename(process.argv[1])} ${opt[0]} - ${opt[1]}`);
	});
	process.exit();
}

const verbs = {
	'up': (path, [ target ]) => {
		const work = [], record = getRecord(path), ctx = hex.context();
		hex.log.debug('migration up', { path, target });
		let targets = [];
		if (target) {
			if (target[0] !== '/') {
				target = `${process.cwd()}/${target}`;
			}
			if (!fs.existsSync(target)) {
				throw new Error('no such file');
			}
			// run specific target if not already done. must be taken down to re-run
			if (!record[pth.basename(target)]) {
				targets.push(target);
			}
			else {
				console.log('already applied, skipping');
			}
		}
		else {
			// each path with a middleware specified in middleware.js
			getEnabledPaths().forEach((folder) => {
				hex.log.debug('scan', { folder });
				// push js files not already done
				targets = [].concat(
					targets,
					fs.readdirSync(folder)
						.filter((file) => { return /[.]js$/.test(file) && !record[file]; })
						.map((file) => { return `${folder}/${file}`; })
				);
			});
		}
		// sort by timestamp regardless of folder
		targets = targets.sort((a, b) => {
			const bna = pth.basename(a), bnb = pth.basename(b);
			return bna > bnb ? 1 : -1;
		});
		hex.log.debug('pending', { targets });
		// pass middleware context, notably containing 'app' with properties corresponding to storage connections
		let idx = 0;
		const run = () => {
			if (!targets[idx]) {
				console.log('ok');
				process.exit();
				return;
			}

			const target = targets[idx];
			console.log(`\t/\\ ${target}`);
			const rv = require(target).up(ctx);
			++idx;
			const next = () => {
				record[pth.basename(target)] = (new Date).toISOString();
				setRecord(path, record);
				run();
			};

			if (rv && rv instanceof Promise) {
				rv.then(next, (err) => { throw err; });
			}
			else {
				next();
			}
		};
		run();
	},
	'down': (path, [ target ]) => {
		const record = getRecord(path), ctx = hex.context();
		let rollback = null, work = null;
		if (target) {
			if (target[0] !== '/') {
				target = `${process.cwd()}/${target}`;
			}
			if (!fs.existsSync(target)) {
				throw new Error('no such file');
			}
			if (record[pth.basename(target)]) {
				rollback = target;
			}
			else {
				console.log('not applied, skipping');
			}
		}
		else {
			rollback = Object.keys(record).sort((a, b) => {
				return record[a] > record[b] ? -1 : 1;
			})[0];
			if (rollback) {
				hex.log.debug('searching for migration', { rollback });
				if (!getEnabledPaths().some((target) => {
					hex.log.debug('\tin', { 'path': target });
					if (fs.existsSync(`${target}/${rollback}`)) {
						rollback = `${target}/${rollback}`;
						return true;
					}
					return false;
				})) {
					throw new Error(`migration missing: ${rollback}`);
				}
			}
			else {
				throw new Error('no prior migration found');
			}
		}
		if (rollback) {
			console.log(`\t\\/ ${pth.resolve(rollback)}`);
			const migration = require(rollback);
			if (!migration.down) {
				throw new Error('irreversible migration');
			}
			const rv = migration.down(ctx);
			if (rv && rv instanceof Promise) {
				work = new Promise((resolve, reject) => {
					rv.then(() => {
						delete record[pth.basename(rollback)];
						setRecord(path, record);
						resolve();
					}, (err) => {
						console.error('in', pth.resolve(rollback), '-');
						reject(err);
					});
				});
			}
			else {
				delete record[pth.basename(rollback)];
				setRecord(path, record);
			}
		}
		if (work) {
			work.then(
				process.exit,
				(err) => {
					console.error(err);
					process.exit();
				}
			);
		}
		else {
			process.exit();
		}
	},
	'create': (path, [ type, descr ], cb) => {
		if (!type) {
			help();
		}
		const
			base = `${path}/migrations`,
			folder = `${base}/${type}`,
			file = `${ folder }/${(new Date).toISOString()}-${descr.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.js`,
			template = fs.existsSync(`${base}/template.js`) ? `${base}/template.js` : `${__dirname}/../migrations/template.js`
			;
		hex.log.debug('create migration', { file, template });
		[ base, folder ].forEach((prnt) => {
			if (!fs.existsSync(prnt)) {
				hex.log.info('creating migration parent folder', { 'path': prnt });
				fs.mkdirSync(prnt);
			}
		});
		fs.copyFileSync(template, file);
		if (cb) {
			cb(file);
		}
		else {
			console.log(file);
			process.exit();
		}
	},
	'edit': (path, args) => {
		verbs.create(path, args, (file) => {
			require('child_process')
				.spawn(process.env.EDITOR || 'vim', [ file ], { 'stdio': 'inherit' })
				.on('exit', process.exit);
		});
	}
};

function getRecord(path) {
	return fs.existsSync(`${path}/migrations/record.json`) ? JSON.parse(fs.readFileSync(`${path}/migrations/record.json`, { 'encoding': 'utf8' })) : {};
}
function setRecord(path, content) {
	fs.writeFileSync(`${path}/migrations/record.json`, JSON.stringify(content, null, '\t'));
}
function getEnabledPaths() {
	const rv = [], paths = hex.conf.get('paths.migrations', []);
	Object.keys(hex.conf.get('requiredMiddleware')).forEach((mw) => {
		const [ _, name ] = mw.split('.');
		paths.forEach((basePath) => {
			if (fs.existsSync(`${basePath}/${name}`)) {
				rv.push(`${basePath}/${name}`);
			}
		});
	});
	return rv;
}

module.exports = (path) => {
	if (process.argv.length === 2 || !verbs[process.argv[2]]) {
		help(path);
	}
	hex.bootstrap(path).then(() => {
		try {
			if (!hex.log || !hex.conf) {
				throw new Error('hex initialization failed');
			}
			verbs[process.argv[2]](path, process.argv.slice(3));
		}
		catch (ex) {
			console.log(ex);
			process.exit();
		}
	});
}
