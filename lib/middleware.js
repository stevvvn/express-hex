'use strict';
// @flow
import type { SMap, Logger, Conf, AnnotatedMiddlewareDefs, AnnotatedMiddlewareDef, Context } from '../types/hex';

const fs = require('fs');
const { resolve } = require('path');

module.exports = ({ log, launchPath, conf, app, http, express}: Context, action?: (mwPath: string, params: any) => void): Promise<void> => {
	let earlyErr, launchApp;
	const required = {},
		bundles = {},
		appPaths = { 'hex': `${__dirname}/..` },
		_action = action ? action : (path, params) => {
			// $FlowFixMe
			return require(path)(params);
		},
		staticBase = conf.get('static-base', '/')
		;

	conf.set('paths.launch', launchPath);
	try {
		const mwDefs: SMap<AnnotatedMiddlewareDefs> = {};
		const requireMiddleware = (path: string, appName: string = '') => {
			if (!appName) {
				appName = path.replace(/^.*\/(.*?)\/middleware([.]js)?$/g, '$1');
				if (!appName) {
					throw new Error(`unable to determine app name from ${path}`);
				}
			}
			const launchAbs = `${launchPath}/node_modules/${path}`;
			if (appName !== 'hex' && fs.existsSync(launchAbs)) {
				path = launchAbs;
			}

			log.debug('loading middleware definitions', { path, 'app': appName })
			try {
				// $FlowFixMe
				mwDefs[appName] = require(path);
			}
			catch (ex) {
				throw new Error(`error parsing middleware in ${resolve(path)}: ${ex}`);
			}
			if (!mwDefs[appName]) {
				mwDefs[appName] = {};
			}
			appPaths[appName] = path.replace(/\/middleware.js$/, '');

			[ 'public', 'views', 'services', 'migrations' ].forEach((type) => {
				if (fs.existsSync(`${appPaths[appName]}/${type}`)) {
					const resolved = resolve(`${appPaths[appName]}/${type}`);
					conf.push(`paths.${type}`, resolved);
					if (type === 'public') {
						app.use(staticBase, express.static(resolved));
					}
				}
			});

			// normalize references so they are always 'packageName.middlwareName'
			// (packages are allowed to omit 'packageName.' to refer to their own middleware)
			Object.keys(mwDefs[appName]).forEach((mwName) => {
				const mw = mwDefs[appName][mwName];
				mw.app = appName;
				mw.name = mwName;
				[ 'bundle', 'deps', 'after' ].forEach((k) => {
					if (mw[k] !== undefined) {
						if (!mw[k].map) {
							throw new Error(`invalid middleware: expected ${ k } to be an array in ${ appName }.${ mwName }`);
						}
						mw[k] = mw[k].map((mwRef) => {
							if (mwRef.indexOf('.') === -1) {
								return `${appName}.${mwRef}`;
							}
							return mwRef;
						});
					}
				});
				if (mw.bundle) {
					bundles[`${appName}.${mwName}`] = mw.bundle;
				}
			});

			return appName;
		};
		launchApp = requireMiddleware(`${launchPath}/middleware.js`);

		requireMiddleware(`${__dirname}/../middleware.js`, 'hex');

		// get the definition of a given `packageName.middlewareName`, requiring its package if necessary
		const getDef = (qmw:string): AnnotatedMiddlewareDef => {
			const [ app, mw ] = qmw.split('.');
			if (!mwDefs[app]) {
				requireMiddleware(`${app}/middleware.js`, app);
			}
			if (!mwDefs[app][mw]) {
				throw new Error(`no ${ mw } middleware exists in ${ app }. use "package-name.middleware-name" if you meant to select middleware in another package`);
			}
			return mwDefs[app][mw];
		};
		// add given middleware to the list to include, including any dependencies or bundled middleware
		const requireMw = (mw: string|AnnotatedMiddlewareDef) => {
			if (typeof mw === 'string') {
				mw = getDef(mw);
			}
			if (mw.bundle) {
				mw.bundle.forEach((bundled) => {
					requireMw(bundled);
				});
			}

			required[`${mw.app}.${mw.name}`] = mw;
			if (mw.deps) {
				mw.deps.forEach((dep) => {
					requireMw(dep);
				});
			}
		};

		// automatically include helmet, it can be adjusted via the `helmet` conf key
		requireMw(mwDefs.hex.helmet);
		// every middleware in the launching app is taken to be required
		Object.keys(mwDefs[launchApp]).forEach((mwName) => {
			requireMw(mwDefs[launchApp][mwName]);
		});
	}
	catch (ex) {
		earlyErr = ex;
	}

	Object.keys(required).forEach((mwName) => {
		// clean 'after' designations so they don't contain middleware we have no plans to include
		if (required[mwName].after) {
			required[mwName].after = required[mwName].after.filter((name) => {
				return !!required[name];
			});
			if (required[mwName].after.length === 0) {
				delete required[mwName].after;
			}
		}
		// expand bundles so they are a list of the referenced sub-middleware
		[ 'after', 'deps' ].forEach((k) => {
			if (required[mwName][k]) {
				required[mwName][k].forEach((dep, idx) => {
					if (bundles[dep]) {
						required[mwName][k].splice(idx, 1);
						required[mwName][k] = required[mwName][k].concat(bundles[dep]);
					}
				});
			}
		});
	});

	log.debug('required middleware', required);
	const mwMap = {};
	Object.keys(required).forEach((mw) => {
		mwMap[mw] = true;
	});
	conf.set('requiredMiddleware', mwMap);
	log.info('requiring middleware:');
	app.errorHandlers = [];

	app.set('views', conf.get('paths.views', []));

	return new Promise(async (resolve, reject) => {
		if (earlyErr) {
			return reject(earlyErr);
		}
		const load = async () => {
			if (Object.keys(required).length === 0) {
				_action(`${__dirname}/../middleware/finalize.js`, { log, conf, app, express });
				return resolve();
			}
			const round = [], work = [];
			Object.keys(required).forEach((mwName) => {
				const mw = required[mwName];
				if (!mw.deps && !mw.after) {
					round.push(new Promise(async (mwres, mwrej) => {
						log.info(`\t${mwName} - ${mw.description ? mw.description : '?'}`);
						try {
							const impl = _action(`${appPaths[mw.app]}/middleware/${mw.name}`, { log, conf, app, http, express });

							delete required[mwName];
							if (impl instanceof Promise) {
								await impl;
							}
							mwres(mwName);
						}
						catch (ex) {
							mwrej(ex);
						}
					}));
				}
				return false;
			});

			if (round.length === 0) {
				return reject({ 'error': 'failed to resolve dependencies', 'ctx': { required } });
			}

			try {
				const added = await Promise.all(round);
				Object.keys(required).forEach((mwName) => {
					[ 'after', 'deps' ].forEach((k) => {
						if (required[mwName][k]) {
							required[mwName][k] = required[mwName][k].filter((dep) => {
								return !added.includes(dep);
							});
							if (required[mwName][k].length === 0) {
								delete required[mwName][k];
							}
						}
					});
				});
				load();
			}
			catch (ex) {
				return reject(ex);
			}
		};
		load();
	});
};
