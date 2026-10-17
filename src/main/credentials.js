'use strict';

const fs = require('fs');
const path = require('path');
const { app, safeStorage } = require('electron');

function secretsPath() {
  return path.join(app.getPath('userData'), 'secrets.json');
}

let cache = null;

function load() {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(secretsPath(), 'utf8'));
  } catch (_) {
    cache = {};
  }
  return cache;
}

function save() {
  const file = secretsPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // Restrict permissions when the platform supports it.
  fs.writeFileSync(file, JSON.stringify(cache, null, 2), { encoding: 'utf8', mode: 0o600 });
  try {
    fs.chmodSync(file, 0o600);
  } catch (_) {
    /* ignore on platforms without chmod */
  }
}

function encryptionAvailable() {
  try {
    return safeStorage.isEncryptionAvailable();
  } catch (_) {
    return false;
  }
}

function encrypt(value) {
  if (encryptionAvailable()) {
    return 'enc:' + safeStorage.encryptString(value).toString('base64');
  }
  return 'plain:' + Buffer.from(value, 'utf8').toString('base64');
}

function decrypt(stored) {
  if (typeof stored !== 'string') return '';
  if (stored.startsWith('enc:')) {
    try {
      return safeStorage.decryptString(Buffer.from(stored.slice(4), 'base64'));
    } catch (_) {
      return '';
    }
  }
  if (stored.startsWith('plain:')) {
    return Buffer.from(stored.slice(6), 'base64').toString('utf8');
  }
  return '';
}

function setSecret(projectId, key, value) {
  const db = load();
  db[projectId] = db[projectId] || {};
  if (value) {
    db[projectId][key] = encrypt(value);
  } else {
    delete db[projectId][key];
  }
  save();
}

function getSecret(projectId, key) {
  const db = load();
  const entry = db[projectId];
  if (!entry || !entry[key]) return '';
  return decrypt(entry[key]);
}

function hasSecret(projectId, key) {
  const db = load();
  return Boolean(db[projectId] && db[projectId][key]);
}

function deleteProjectSecrets(projectId) {
  const db = load();
  if (db[projectId]) {
    delete db[projectId];
    save();
  }
}

module.exports = {
  encryptionAvailable,
  setSecret,
  getSecret,
  hasSecret,
  deleteProjectSecrets,
};
