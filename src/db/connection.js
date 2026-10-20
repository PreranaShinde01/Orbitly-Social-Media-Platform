const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.resolve(__dirname, '../../data/orbitly.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let dbInstance = null;

class DatabaseWrapper {
  constructor(filePath) {
    this.filePath = filePath;
    let engine = null;

    // Try better-sqlite3 first if available
    try {
      const BetterSqlite = require('better-sqlite3');
      engine = new BetterSqlite(filePath);
      this.type = 'better-sqlite3';
      this.raw = engine;
    } catch (e) {
      // Fallback to Node 22+ built-in node:sqlite
      const { DatabaseSync } = require('node:sqlite');
      engine = new DatabaseSync(filePath);
      this.type = 'node:sqlite';
      this.raw = engine;
    }

    this.exec('PRAGMA foreign_keys = ON;');
    this.exec('PRAGMA journal_mode = WAL;');
  }

  exec(sql) {
    return this.raw.exec(sql);
  }

  pragma(str) {
    return this.raw.exec(`PRAGMA ${str};`);
  }

  prepare(sql) {
    const stmt = this.raw.prepare(sql);
    return {
      run(...params) {
        // Flatten params if passed as array vs spread
        const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        const res = stmt.run(...args);
        return {
          changes: res ? res.changes : 0,
          lastInsertRowid: res && res.lastInsertRowid !== undefined ? Number(res.lastInsertRowid) : 0
        };
      },
      get(...params) {
        const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        return stmt.get(...args) || null;
      },
      all(...params) {
        const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        return stmt.all(...args) || [];
      }
    };
  }

  transaction(fn) {
    return (...args) => {
      this.exec('BEGIN');
      try {
        const result = fn(...args);
        this.exec('COMMIT');
        return result;
      } catch (err) {
        this.exec('ROLLBACK');
        throw err;
      }
    };
  }

  close() {
    if (this.raw && typeof this.raw.close === 'function') {
      this.raw.close();
    }
  }
}

function getDb(customPath = null) {
  if (customPath) {
    return new DatabaseWrapper(customPath);
  }
  if (!dbInstance) {
    dbInstance = new DatabaseWrapper(DB_PATH);
  }
  return dbInstance;
}

function initDb(db = getDb()) {
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
  return db;
}

module.exports = {
  getDb,
  initDb,
  DB_PATH
};
