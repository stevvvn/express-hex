'use strict';
const fs = require('fs');
const path = require('path');
const { run, getMigrationsFromPath, getImpl } = require('abstract-migrator');

module.exports = async (conf) => {
	// look for hex-db-$SOMETHING.handle to find enabled stores
	const stores = Object.keys(conf.get('requiredMiddleware'))
		.map((mw) => mw.replace(/^hex-db-|[.]handle$/g, ''))
		.filter((mw) => mw.indexOf('.') === -1);
	if (stores.length === 0) {
		console.log('no hex-db-*.handle listed in middleware, nothing to do');
		return;
	}
	console.log('enabled stores', stores);

	// get each of the migrations/$STORE paths that qualify
	const paths = {};
	conf.get('paths.migrations').forEach((path) => {
		fs.readdirSync(path).forEach((folder) => {
			if (stores.includes(folder)) {
				if (!paths[folder]) {
					paths[folder] = [];
				}
				paths[folder].push(`${ path }/${ folder }`);
			}
		});
	});

	for (const [ store, folders ] of Object.entries(paths)) {
		const impl = await getImpl(folders[0], conf);
		console.log(store);
		for (const folder of folders) {
			console.log('\t', folder);
			for (const fullPath of getMigrationsFromPath(folder)) {
				const file = path.basename(fullPath, '.js');
				const isApplied = await impl.applied(file);
				if (!isApplied) {
					await run({ impl, conf, 'dir': 'up', 'file': fullPath });
				}
			}
		}
		await impl.commit();
		return impl;
	}
};
