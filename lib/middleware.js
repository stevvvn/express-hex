'use strict';
// @flow
import type { SMap, Logger, Conf, AnnotatedMiddlewareDefs, AnnotatedMiddlewareDef } from '../types';

module.exports = ({ log, launchPath, conf }: { log: Logger, launchPath: string, conf: Conf }): Promise<void> => {
	let earlyErr = null;
	const required = {}, bundles = {};
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

			mwDefs[app] = require(path);
			if (!mwDefs[app]) {
				mwDefs[app] = {};
			}

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
		const launchApp = requireMiddleware(`${launchPath}/middleware.js`);
		requireMiddleware(`../middleware.js`, 'hex');

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

	return new Promise((resolve, reject) => {
		if (earlyErr) {
			return reject(earlyErr);
		}
		const load = () => {
			if (Object.keys(required).length === 0) {
				resolve();
				return;
			}
			const round = [];
			Object.keys(required).forEach((mwName) => {
				const mw = required[mwName];
				if (!mw.deps && !mw.after) {
					round.push(new Promise((mwres) => {
						log.info(`\t${mwName} - ${mw.description ? mw.description : '?'}`);
						delete required[mwName];
						mwres(mwName);
					}));
				}
				return false;
			});

			if (round.length === 0) {
				return reject({ 'error': 'failed to resolve dependencies', 'ctx': { required } });
			}

			Promise.all(round).then((added) => {
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
			}, (err) => {
				reject(err);
			});
		};
		load();
	});
};
