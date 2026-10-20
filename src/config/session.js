const session = require('express-session');
const { getDb } = require('../db/connection');
const env = require('./env');

class SqliteStore extends session.Store {
  constructor(options = {}) {
    super();
    this.db = options.db || getDb();
    // Periodic cleanup of expired sessions
    this.pruneInterval = setInterval(() => {
      try {
        this.db.prepare("DELETE FROM sessions WHERE expired <= DATETIME('now')").run();
      } catch (err) {
        // ignore prune errors
      }
    }, 15 * 60 * 1000);
    if (this.pruneInterval.unref) this.pruneInterval.unref();
  }

  get(sid, cb) {
    try {
      const row = this.db.prepare("SELECT sess FROM sessions WHERE sid = ? AND expired > DATETIME('now')").get(sid);
      if (!row) return cb(null, null);
      const sess = JSON.parse(row.sess);
      cb(null, sess);
    } catch (err) {
      cb(err);
    }
  }

  set(sid, sess, cb) {
    try {
      const maxAge = (sess.cookie && sess.cookie.maxAge) || (24 * 60 * 60 * 1000);
      const expiresAt = new Date(Date.now() + maxAge).toISOString().replace('T', ' ').substring(0, 19);
      const sessStr = JSON.stringify(sess);
      this.db.prepare("INSERT OR REPLACE INTO sessions (sid, sess, expired) VALUES (?, ?, ?)").run(sid, sessStr, expiresAt);
      if (cb) cb(null);
    } catch (err) {
      if (cb) cb(err);
    }
  }

  destroy(sid, cb) {
    try {
      this.db.prepare("DELETE FROM sessions WHERE sid = ?").run(sid);
      if (cb) cb(null);
    } catch (err) {
      if (cb) cb(err);
    }
  }

  touch(sid, sess, cb) {
    try {
      const maxAge = (sess.cookie && sess.cookie.maxAge) || (24 * 60 * 60 * 1000);
      const expiresAt = new Date(Date.now() + maxAge).toISOString().replace('T', ' ').substring(0, 19);
      this.db.prepare("UPDATE sessions SET expired = ? WHERE sid = ?").run(expiresAt, sid);
      if (cb) cb(null);
    } catch (err) {
      if (cb) cb(err);
    }
  }
}

function createSessionMiddleware(customDb = null) {
  const store = new SqliteStore({ db: customDb || getDb() });

  return session({
    store,
    name: 'orbitly.sid',
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: env.isProd, // false in dev/test, true in prod
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 1 day default (extended on remember me)
    }
  });
}

module.exports = {
  createSessionMiddleware,
  SqliteStore
};
