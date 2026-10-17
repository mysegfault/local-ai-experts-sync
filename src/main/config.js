'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');

const CONFIG_VERSION = 1;

function userDataDir() {
  return app.getPath('userData');
}

function configPath() {
  return path.join(userDataDir(), 'config.json');
}

function defaultConfig() {
  return {
    version: CONFIG_VERSION,
    projects: [],
    settings: {
      // 'system' | 'app'  -> where the user prefers to keep SSH keys
      sshKeyLocation: 'system',
      // 'en' | 'fr'  -> UI language (chosen on first launch)
      language: 'en',
      languageChosen: false,
      // true once the user saw/dismissed the first-run identity prompt
      identityPromptDismissed: false,
      // Safety for beginners: refuse to Pull while there are local changes,
      // to avoid merge conflicts. Enabled by default.
      blockPullWithLocalChanges: true,
      // id of the last project the user had open (re-opened on next start)
      lastProjectId: '',
    },
  };
}

let cache = null;

function load() {
  if (cache) return cache;
  const file = configPath();
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw);
    cache = normalize(parsed);
  } catch (err) {
    if (err && err.code !== 'ENOENT') {
      // Corrupt config: back it up so the user does not silently lose data.
      try {
        fs.copyFileSync(file, file + '.corrupt-' + Date.now());
      } catch (_) {
        /* ignore backup failure */
      }
    }
    cache = defaultConfig();
  }
  return cache;
}

function normalize(parsed) {
  const base = defaultConfig();
  if (!parsed || typeof parsed !== 'object') return base;
  const cfg = {
    version: CONFIG_VERSION,
    projects: Array.isArray(parsed.projects) ? parsed.projects.map(normalizeProject) : [],
    settings: Object.assign({}, base.settings, parsed.settings || {}),
  };
  return cfg;
}

function normalizeProject(p) {
  return {
    id: p.id || crypto.randomUUID(),
    name: p.name || path.basename(p.path || '') || 'Project',
    path: p.path || '',
    remoteUrl: p.remoteUrl || '',
    identity: {
      name: (p.identity && p.identity.name) || '',
      email: (p.identity && p.identity.email) || '',
    },
    auth: {
      mode: (p.auth && p.auth.mode) || 'none',
      username: (p.auth && p.auth.username) || '',
      sshKeyPath: (p.auth && p.auth.sshKeyPath) || '',
    },
    // true once the user has successfully verified authentication for this repo
    configValidated: !!p.configValidated,
    createdAt: p.createdAt || Date.now(),
  };
}

function save() {
  const file = configPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(cache, null, 2), 'utf8');
}

function getProjects() {
  return load().projects;
}

function getProject(id) {
  return load().projects.find((p) => p.id === id) || null;
}

function addProject(project) {
  const cfg = load();
  const norm = normalizeProject(project);
  cfg.projects.push(norm);
  save();
  return norm;
}

function updateProject(id, patch) {
  const cfg = load();
  const idx = cfg.projects.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error('Project not found');
  const merged = normalizeProject(Object.assign({}, cfg.projects[idx], patch, {
    identity: Object.assign({}, cfg.projects[idx].identity, patch.identity || {}),
    auth: Object.assign({}, cfg.projects[idx].auth, patch.auth || {}),
    id: cfg.projects[idx].id,
  }));
  cfg.projects[idx] = merged;
  save();
  return merged;
}

function removeProject(id) {
  const cfg = load();
  const before = cfg.projects.length;
  cfg.projects = cfg.projects.filter((p) => p.id !== id);
  save();
  return cfg.projects.length !== before;
}

function getSettings() {
  return load().settings;
}

function setSettings(patch) {
  const cfg = load();
  cfg.settings = Object.assign({}, cfg.settings, patch || {});
  save();
  return cfg.settings;
}

module.exports = {
  userDataDir,
  getProjects,
  getProject,
  addProject,
  updateProject,
  removeProject,
  getSettings,
  setSettings,
};
