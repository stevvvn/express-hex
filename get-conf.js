'use strict';
/**
 * Use this on the CLI to get configuration parameters from a given application
 *
 * node /path/to/get-conf [/path/to/conf.js] [key or key.subkey or nothing to get the whole conf]
 *
 * Path defaults to cwd
 *
 * Output is JSON-encoded when the result is non-scalar
 */
// @flow
require('flow-remove-types/register')({ 'excludes': null });
let path, keyIdx;
if (process.argv[2] && process.argv[2].indexOf('/') > -1) {
	path = process.argv[2];
	keyIdx = 3;
}
else {
	path = process.cwd();
	keyIdx = 2;
}
const val = require('./lib/conf')(path).get(process.argv[keyIdx]);
console.log(typeof val === 'object' ? JSON.stringify(val) : val);
