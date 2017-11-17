'use strict';

const
	Store = require('express-session/session/store'),
	util = require('util');

let redis;

const RedisStore = module.exports = function(app) {
	Store.call(this);
	this.sessions = Object.create(null);
	redis = app.redis;
	redis.persistAsync('hex:sessions');
}

util.inherits(RedisStore, Store)

RedisStore.prototype.all = function all(cb) {
	const sessions = {};
	redis.smembersAsync('hex:sessions')
		.then((members) => {
			redis.mgetAsync(members.map((m) => { return 'hex:session:' + m; }))
				.then((data) => {
					members.forEach((m, idx) => {
						sessions[m] = data[idx];
					});
					setImmediate(cb, null, sessions);
				});
		})
}

RedisStore.prototype.clear = function clear(cb) {
	redis.smembersAsync('hex:sessions')
		.then((members) => {
			members.forEach((m) => {
				redis.delAsync('hex:session:' + m);
			});
			redis.delAsync('hex:sessions')
				.then(() => {
					setImmediate(cb);
				});
		});
}

RedisStore.prototype.destroy = function destroy(sessionId, cb) {
	redis.sremAsync('hex:sessions', sessionId)
		.then(() => {
			return redis.delAsync('hex:session:' + sessionId);
		})
		.then(() => {
			setImmediate(cb);
		})
}

RedisStore.prototype.get = function get(sessionId, cb) {
	getSession.call(this, sessionId, (sess) => {
		setImmediate(cb, null, sess);
	});
}

RedisStore.prototype.set = function set(sessionId, session, cb) {
	redis.saddAsync('hex:sessions', sessionId)
		.then(() => {
			return redis.setAsync('hex:session:' + sessionId, JSON.stringify(session));
		})
		.then(() => {
			return redis.persistAsync('hex:session:' + sessionId);
		})
		.then(() => { setImmediate(cb); });
}

RedisStore.prototype.length = function length(cb) {
	redis.scardAsync('hex:sessions')
		.then((len) => { cb(null, len); });
}

RedisStore.prototype.touch = function touch(sessionId, session, cb) {
	getSession.call(this, sessionId, (currentSession) => {
	  if (currentSession) {
			currentSession.cookie = session.cookie
			this.set(sessionId, session, cb);
		}
		else {
			setImmediate(cb);
		}
  });
}

function getSession(sessionId, cb) {
	redis.getAsync('hex:session:' + sessionId)
		.then((sess) => {
			if (!sess) {
				cb(null);
				return;
			}

			sess = JSON.parse(sess)

			const expires = typeof sess.cookie.expires === 'string'
				? new Date(sess.cookie.expires)
				: sess.cookie.expires

			if (expires && expires <= Date.now()) {
				this.destroy(sessionId);
				return;
			}
			cb(sess);
		});
}
