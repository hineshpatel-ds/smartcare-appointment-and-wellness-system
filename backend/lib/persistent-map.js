const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.LOCAL_DATA_DIR || path.join(__dirname, '..', '.data');

/**
 * Drop-in replacement for `Map` that mirrors its contents to a JSON file on
 * disk, so the in-process fallback store used when DynamoDB is unreachable
 * survives local restarts instead of silently resetting.
 */
class PersistentMap {
  constructor(fileName) {
    this.filePath = path.join(DATA_DIR, fileName);
    this.map = new Map();
    this._load();
    this._writeTimer = null;
  }

  _load() {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const entries = JSON.parse(raw);
      for (const [key, value] of entries) this.map.set(key, value);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn(`PersistentMap: failed to load ${this.filePath}: ${error.message}`);
      }
    }
  }

  _scheduleFlush() {
    if (this._writeTimer) return;
    this._writeTimer = setTimeout(() => {
      this._writeTimer = null;
      this._flush();
    }, 50);
    if (this._writeTimer.unref) this._writeTimer.unref();
  }

  _flush() {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(Array.from(this.map.entries()), null, 2));
    } catch (error) {
      console.warn(`PersistentMap: failed to write ${this.filePath}: ${error.message}`);
    }
  }

  get(key) {
    return this.map.get(key);
  }

  set(key, value) {
    this.map.set(key, value);
    this._scheduleFlush();
    return this;
  }

  has(key) {
    return this.map.has(key);
  }

  delete(key) {
    const result = this.map.delete(key);
    this._scheduleFlush();
    return result;
  }

  values() {
    return this.map.values();
  }

  get size() {
    return this.map.size;
  }
}

module.exports = { PersistentMap };
