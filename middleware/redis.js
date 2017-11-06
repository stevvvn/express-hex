'use strict';
// @flow
import type { App, Conf, Logger } from '../types';

const
	redis = require('redis'),
	bluebird = require('bluebird')
	;

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

module.exports = ({ app, conf, log }: { app: App, conf: Conf, log: Logger }): Promise<void> => {
	const redisConf = Object.assign({
		'retry': {
			'max-time': 1000 * 60 * 60,
			'attempts': null
		}
	}, conf.get('redis', {}));

	const options = Object.assign({
		'enable_offline_queue': false, // don't stack up commands while redis is unresponsive
		'retry_strategy': (options) => {
			if (redisConf.retry['max-time'] && options.total_retry_time > redisConf.retry['max-time']) {
            log.alert('giving up reconnecting redis: maximum retry time exceeded');
				return new Error('retry time exhausted');
			}
			if (redisConf.retry.attempts !== null && options.attempt > redisConf.retry.attempts) {
				log.alert('giving up reconnected redis: maximum attempts exceeded');
				return new Error('retry attempts exhausted');
			}
			const rv = Math.min(options.attempt * 100, 1000);
			log.error(`redis lost, retrying in ${rv}ms}`);
			return rv;
		}
	}, redisConf);
	app.redis = redis.createClient(options);
	app.redis.exec = app.redis.send_commandAsync;

	return new Promise((resolve, reject) => {
		let waitingForReady = true;
		app.redis.on('ready', () => {
			waitingForReady = false;
			resolve();
		});
		app.redis.on('error', (err) => {
			if (waitingForReady) {
				reject(err);
			}
		});
	});
};
