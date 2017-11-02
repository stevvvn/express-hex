'use strict';
// @flow
import type { SMap, Logger, Conf, AnnotatedMiddlewareDefs, AnnotatedMiddlewareDef } from '../types';

const fs = require('fs'), { resolve } = require('path');

module.exports = ({ log, launchPath, conf, app, express }: { log: Logger, launchPath: string, conf: Conf, app: any, express: any }): Promise<void> => {
	let earlyErr, launchApp;
	const required = {}, bundles = {}, appPaths = { 'hex': `${__dirname}/..` };

	conf.set('paths.launch', launchPath);
	try {
		const mwDefs: SMap<AnnotatedMiddlewareDefs> = {};
		const requireMiddleware = (path: string, app: string = '') => {
			if (!app) {
				app = path.replace(/^.*\/(.*?)\/middleware([.]js)?$/g, '$1');
				if (!app) {
					throw new Error(`unable to determine app name from ${path}`);
				}
			}
			log.debug('loading middleware definitions', { app, path })

			const launchAbs = `${launchPath}/node_modules/${path}`;
			if (app !== 'hex' && fs.existsSync(launchAbs)) {
				path = launchAbs;
			}
			mwDefs[app] = require(path);
			if (!mwDefs[app]) {
				mwDefs[app] = {};
			}
			appPaths[app] = path.replace(/\/middleware.js$/, '');

			[ 'public', 'views', 'services' ].forEach((type) => {
				if (fs.existsSync(`${appPaths[app]}/${type}`)) {
					conf.push(`paths.${type}`, resolve(`${appPaths[app]}/${type}`));
				}
			});

			// normalize references so they are always 'packageName.middlwareName'
			// (packages are allowed to omit 'packageName.' to refer to their own middleware)
			Object.keys(mwDefs[app]).forEach((mwName) => {
				const mw = mwDefs[app][mwName];
				mw.app = app;
				mw.name = mwName;
				[ 'bundle', 'deps', 'after' ].forEach((k) => {
					if (mw[k] !== undefined) {
						mw[k] = mw[k].map((mwRef) => {
							if (mwRef.indexOf('.') === -1) {
								return `${app}.${mwRef}`;
							}
							return mwRef;
						});
					}
				});
				if (mw.bundle) {
					bundles[`${app}.${mwName}`] = mw.bundle;
				}
			});

			return app;
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
				throw new Error(`no ${mw} middleware exists in ${app}`);
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
				return;
			}

			required[`${mw.app}.${mw.name}`] = mw;
			if (mw.deps) {
				mw.deps.forEach((dep) => {
					requireMw(dep);
				});
			}
		};

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
	log.info('requiring middleware:');

	return new Promise(async (resolve, reject) => {
		if (earlyErr) {
			return reject(earlyErr);
		}
		const load = async () => {
			if (Object.keys(required).length === 0) {
				require(`${__dirname}/../middleware/finalize.js`)({ app });
				resolve();
				return;
			}
			const round = [], work = [];
			Object.keys(required).forEach((mwName) => {
				const mw = required[mwName];
				if (!mw.deps && !mw.after) {
					round.push(new Promise(async (mwres, mwrej) => {
						log.info(`\t${mwName} - ${mw.description ? mw.description : '?'}`);
						try {
							const impl = require(`${appPaths[mw.app]}/middleware/${mw.name}`)({ log, conf, app, express });

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
