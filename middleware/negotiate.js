'use strict';
// @flow
import type { App } from '../types';

module.exports = ({ app }: { app: App }) => {
	app.use((req, res, next) => {
		req.negotiate = (): [string, number][] => {
			if (req.accept) {
				return req.accept;
			}
			if (req.headers.accept) {
				req.accept = [];
				let stack = [];
				const add = (priority) => {
					stack.forEach((type) => {
						req.accept.push([type.toLowerCase().replace(/\s*/g, ''), priority]);
					});
					stack = [];
				};
				req.headers.accept.split(',').forEach((type) => {
					if (/;\s*q=/.test(type)) {
						let
							split = type.split(/;\s*q=/),
							priority = parseFloat(split[1])
							;
						if (isNaN(priority)) {
							stack = [];
							return;
						}
						stack.push(split[0]);
						add(priority);
					}
					else {
						stack.push(type);
					}
				});
				add(0.01);
				// sort descending by supplied priority. retain "natural" ordering of items with identical priority
				req.accept.sort((a, b) => {
					return a[1] > b[1] ? -1 : (a[1] < b[1] ? 1 : 0);
				});
			}
			else {
				req.accept = [['text/html', 1.0]];
			}
			return req.accept;
		};
		next();
	});
}
