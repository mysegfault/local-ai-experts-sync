'use strict';

const path = require('path');
const fs = require('fs');
const { ipcMain, dialog, app, shell } = require('electron');

const config = require('./config');
const credentials = require('./credentials');
const git = require('./git');
const gitInstall = require('./git-install');
const update = require('./update');
const difftool = require('./difftool');
const messages = require('./messages');
const terminal = require('./terminal');
const I18n = require('../shared/i18n');

let mainWindowGetter = () => null;

function currentLang() {
  const lang = config.getSettings().language;
  return I18n.languages.indexOf(lang) !== -1 ? lang : 'en';
}

function T(key, params) {
  return I18n.t(currentLang(), key, params);
}

function toast(tone, titleKey, detailKey, params) {
  return {
    tone,
    title: T(titleKey, params),
    detail: detailKey ? T(detailKey, params) : '',
  };
}

function credsFor(projectId) {
  const project = config.getProject(projectId);
  if (!project) return { mode: 'none' };
  const auth = project.auth || {};
  if (auth.mode === 'token' || auth.mode === 'password') {
    return {
      mode: auth.mode,
      username: auth.username || '',
      secret: credentials.getSecret(projectId, 'secret'),
    };
  }
  if (auth.mode === 'ssh') {
    return { mode: 'ssh', sshKeyPath: auth.sshKeyPath || '' };
  }
  return { mode: 'none' };
}

function safe(fn) {
  return async (...args) => {
    try {
      messages.setLanguage(currentLang());
      return await fn(...args);
    } catch (err) {
      return {
        ok: false,
        error: String((err && err.message) || err),
        message: toast('error', 'main.generic.title', 'main.generic.detail'),
      };
    }
  };
}

function registerIpc(getWindow) {
  mainWindowGetter = getWindow;

  // Forward every Git command result to the renderer so the activity log stays
  // live while the user works.
  git.setActivityListener((entry) => {
    try {
      const win = mainWindowGetter();
      if (win && typeof win.isDestroyed === 'function' && !win.isDestroyed() &&
          win.webContents && typeof win.webContents.isDestroyed === 'function' && !win.webContents.isDestroyed()) {
        win.webContents.send('activity:entry', entry);
      }
    } catch (_) {
      /* the log must never break a Git operation */
    }
  });

  ipcMain.handle('app:info', safe(async () => {
    return {
      ok: true,
      platform: process.platform,
      appVersion: app.getVersion(),
      encryptionAvailable: credentials.encryptionAvailable(),
      homeDir: app.getPath('home'),
      locale: app.getLocale(),
    };
  }));

  ipcMain.handle('app:detect-git', safe(async () => {
    const result = await git.detect();
    return { ok: true, ...result };
  }));

  ipcMain.handle('activity:list', safe(async () => {
    return { ok: true, entries: git.getActivity() };
  }));

  ipcMain.handle('activity:clear', safe(async () => {
    git.clearActivity();
    return { ok: true };
  }));

  ipcMain.handle('app:open-external', safe(async (_evt, url) => {
    if (/^https?:\/\//i.test(String(url))) await shell.openExternal(String(url));
    return { ok: true };
  }));

  // The Windows "Git missing" screen uses this to offer the installer itself
  // instead of a download page.
  ipcMain.handle('app:git-download', safe(async () => {
    const target = await gitInstall.resolveDownload(process.platform);
    return { ok: true, url: target.url, direct: target.direct };
  }));

  // Look for a newer GitHub release once at startup. Development runs are
  // skipped: their package version is not the version people installed.
  ipcMain.handle('app:check-update', safe(async () => {
    if (!app.isPackaged) return { ok: true, available: false, skipped: 'dev' };
    return update.check({ currentVersion: app.getVersion(), timeoutMs: 8000 });
  }));

  ipcMain.handle('settings:get', safe(async () => {
    return { ok: true, settings: config.getSettings() };
  }));

  ipcMain.handle('settings:set', safe(async (_evt, patch) => {
    const settings = config.setSettings(patch || {});
    // Keep main-process messages in sync immediately.
    messages.setLanguage(settings.language);
    return { ok: true, settings };
  }));

  // App-level identity lives in the machine's global git config and is read on
  // every startup.
  ipcMain.handle('git:identity-get', safe(async () => {
    const res = await git.detect();
    if (!res.installed) return { ok: true, installed: false, name: '', email: '' };
    const identity = await git.getGlobalIdentity();
    return { ok: true, installed: true, name: identity.name, email: identity.email };
  }));

  ipcMain.handle('git:identity-set', safe(async (_evt, payload) => {
    const identity = {
      name: String((payload && payload.name) || '').trim(),
      email: String((payload && payload.email) || '').trim(),
    };
    await git.setGlobalIdentity(identity);
    return { ok: true, name: identity.name, email: identity.email };
  }));

  ipcMain.handle('dialog:pick-folder', safe(async () => {
    const win = mainWindowGetter();
    const res = await dialog.showOpenDialog(win, {
      title: T('dialog.pickFolder.title'),
      properties: ['openDirectory', 'createDirectory'],
    });
    if (res.canceled || !res.filePaths.length) return { ok: true, canceled: true };
    return { ok: true, canceled: false, path: res.filePaths[0] };
  }));

  ipcMain.handle('dialog:pick-key-file', safe(async () => {
    const win = mainWindowGetter();
    const properties = ['openFile'];
    // Electron 43 removed `showHiddenFiles` on Linux (GTK made it a user choice).
    if (process.platform !== 'linux') properties.push('showHiddenFiles');
    const res = await dialog.showOpenDialog(win, {
      title: T('dialog.pickKey.title'),
      defaultPath: path.join(app.getPath('home'), '.ssh'),
      properties,
    });
    if (res.canceled || !res.filePaths.length) return { ok: true, canceled: true };
    return { ok: true, canceled: false, path: res.filePaths[0] };
  }));

  ipcMain.handle('projects:list', safe(async () => {
    const projects = config.getProjects().map((p) => ({
      ...p,
      hasSecret: credentials.hasSecret(p.id, 'secret'),
      exists: fs.existsSync(p.path),
    }));
    return { ok: true, projects };
  }));

  // Cheap per-project sync state for the sidebar icons.
  ipcMain.handle('projects:statuses', safe(async () => {
    const statuses = [];
    for (const p of config.getProjects()) {
      let state = 'upToDate';
      if (!fs.existsSync(p.path)) {
        state = 'missing';
      } else {
        const res = await git.status(p.path);
        if (!res.ok) {
          state = 'missing';
        } else {
          const d = res.data;
          const hasLocal = d.changes.length > 0 || d.ahead > 0;
          const hasRemote = d.behind > 0;
          if (hasLocal) state = 'unpushed';
          else if (hasRemote || (d.initial && p.remoteUrl)) state = 'toPull';
        }
      }
      statuses.push({ id: p.id, state });
    }
    return { ok: true, statuses };
  }));

  // Inspect a folder chosen in the "Add project" dialog: detect whether it is
  // already a Git project and, if so, surface its existing remote and identity.
  ipcMain.handle('project:inspect', safe(async (_evt, payload) => {
    const dir = String((payload && payload.path) || '').trim();
    const empty = { ok: true, isRepo: false, remoteUrl: '', identity: { name: '', email: '' }, initial: false };
    if (!dir || !fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return empty;

    const isRepo = await git.isRepo(dir);
    if (!isRepo) return empty;

    const remoteUrl = await git.getRemote(dir);
    const id = await git.getIdentity(dir);
    const st = await git.status(dir);
    return {
      ok: true,
      isRepo: true,
      remoteUrl: remoteUrl || '',
      identity: { name: id.localName || id.name || '', email: id.localEmail || id.email || '' },
      initial: !!(st.ok && st.data.initial),
    };
  }));

  ipcMain.handle('projects:create', safe(async (_evt, payload) => {
    const dir = String((payload && payload.path) || '').trim();
    if (!dir) return { ok: false, message: toast('error', 'main.err.noFolder.title', 'main.err.noFolder.detail') };
    if (!fs.existsSync(dir)) return { ok: false, message: toast('error', 'main.err.folderNotFound.title', 'main.err.folderNotFound.detail') };
    if (!fs.statSync(dir).isDirectory()) return { ok: false, message: toast('error', 'main.err.notFolder.title', 'main.err.notFolder.detail') };

    let initialized = false;
    const alreadyRepo = await git.isRepo(dir);
    if (!alreadyRepo) {
      const initRes = await git.init(dir);
      if (!initRes.ok) {
        return { ok: false, message: messages.friendlyError(initRes, 'main.err.setupFolder.title') };
      }
      initialized = true;
    }

    const remoteUrl = String((payload && payload.remoteUrl) || '').trim();
    let effectiveRemote = remoteUrl;
    if (remoteUrl) {
      await git.setRemote(dir, remoteUrl);
    } else if (alreadyRepo) {
      // Already a Git project with its own remote: adopt the existing one.
      effectiveRemote = (await git.getRemote(dir)) || '';
    }

    const name = String((payload && payload.name) || '').trim() || path.basename(dir);
    const created = config.addProject({
      name,
      path: dir,
      remoteUrl: effectiveRemote,
      auth: { mode: 'none', username: '', sshKeyPath: '' },
    });

    const st = await git.status(dir);
    const needsSources = !!(st.ok && st.data.initial && effectiveRemote);

    return {
      ok: true,
      project: { ...created, hasSecret: false },
      initialized,
      alreadyTracked: alreadyRepo,
      needsSources,
    };
  }));

  ipcMain.handle('projects:update', safe(async (_evt, payload) => {
    const id = payload && payload.id;
    if (!id || !config.getProject(id)) return { ok: false, error: 'Project not found' };
    const patch = payload.patch || {};

    if (patch.remoteUrl !== undefined) {
      const res = await git.setRemote(config.getProject(id).path, patch.remoteUrl);
      if (!res.ok) return { ok: false, message: messages.friendlyError(res, 'main.err.saveAddress.title') };
    }

    const updated = config.updateProject(id, patch);

    if (payload.secret !== undefined) {
      credentials.setSecret(id, 'secret', String(payload.secret || ''));
    }

    return { ok: true, project: { ...updated, hasSecret: credentials.hasSecret(id, 'secret') } };
  }));

  ipcMain.handle('projects:remove', safe(async (_evt, id) => {
    const removed = config.removeProject(id);
    credentials.deleteProjectSecrets(id);
    return { ok: removed };
  }));

  ipcMain.handle('project:reveal', safe(async (_evt, id) => {
    const p = config.getProject(id);
    if (!p) return { ok: false };
    shell.showItemInFolder(path.join(p.path, '.'));
    return { ok: true };
  }));

  ipcMain.handle('project:open-terminal', safe(async (_evt, id) => {
    const p = config.getProject(id);
    if (!p) return { ok: false, error: 'Project not found' };
    if (!fs.existsSync(p.path)) {
      return { ok: false, message: toast('error', 'main.err.folderNotFound.title', 'main.err.folderNotFound.detail') };
    }
    const ok = await terminal.openTerminal(p.path);
    if (!ok) {
      return { ok: false, message: toast('warn', 'main.err.noTerminal.title', 'main.err.noTerminal.detail') };
    }
    return { ok: true };
  }));

  ipcMain.handle('project:init', safe(async (_evt, id) => {
    const p = config.getProject(id);
    if (!p) return { ok: false, error: 'Project not found' };
    const res = await git.init(p.path);
    if (!res.ok) return { ok: false, message: messages.friendlyError(res, 'main.err.init.title') };
    return { ok: true };
  }));

  ipcMain.handle('project:status', safe(async (_evt, id) => {
    const p = config.getProject(id);
    if (!p) return { ok: false, error: 'Project not found' };
    const res = await git.status(p.path);
    if (!res.ok) {
      return { ok: false, message: messages.friendlyError({ stderr: res.error }, 'main.err.readProject.title') };
    }
    // A folder can contain only a `.git` directory (for example after copying
    // just the repository metadata): the server is known, but no files were
    // checked out yet. Tell the interface so it can offer to restore them.
    const needsSources = !!(res.data.initial && p.remoteUrl);
    const message = needsSources
      ? toast('info', 'main.sourcesAvailable.title', 'main.sourcesAvailable.detail')
      : messages.describeStatus(res.data);
    return { ok: true, data: res.data, counts: git.summarizeChanges(res.data.changes), message, needsSources };
  }));

  ipcMain.handle('project:diff', safe(async (_evt, payload) => {
    const id = payload && payload.id;
    const p = config.getProject(id);
    if (!p) return { ok: false, error: 'Project not found' };
    const res = await git.projectDiff(p.path, String((payload && payload.path) || ''));
    if (!res.ok) return { ok: false, error: res.error || 'Could not read differences' };
    return { ok: true, files: res.files || [], externalTool: difftool.detect() };
  }));

  ipcMain.handle('project:open-diff-tool', safe(async (_evt, payload) => {
    const id = payload && payload.id;
    const p = config.getProject(id);
    if (!p) return { ok: false, error: 'Project not found' };
    const filePath = String((payload && payload.path) || '');
    const st = await git.status(p.path);
    if (!st.ok) return { ok: false, error: st.error };
    const change = (st.data.changes || []).find((c) => c.path === filePath);
    if (!change) return { ok: false, available: true, reason: 'not-changed' };
    if (change.untracked) return { ok: false, available: true, reason: 'untracked' };
    return difftool.openDiff(p.path, filePath);
  }));

  ipcMain.handle('project:restore-sources', safe(async (_evt, id) => {
    const p = config.getProject(id);
    if (!p) return { ok: false, error: 'Project not found' };
    if (!p.remoteUrl) return { ok: false, message: toast('warn', 'main.noRemote.title', 'main.noRemote.detail') };

    const before = await git.status(p.path);
    if (!before.ok) return { ok: false, message: messages.friendlyError({ stderr: before.error }, 'main.err.readProject.title') };
    const preferred = before.data.branch || '';
    const res = await git.restoreSources(p.path, credsFor(id), preferred);
    if (!res.ok) return { ok: false, message: messages.friendlyError(res, 'main.err.download.title') };

    const after = await git.status(p.path);
    return {
      ok: true,
      restored: true,
      branch: res.branch,
      data: after.ok ? after.data : null,
      message: toast('ok', 'main.sourcesRestored.title', 'main.sourcesRestored.detail', { branch: res.branch }),
    };
  }));

  ipcMain.handle('project:test-connection', safe(async (_evt, payload) => {
    const id = payload && payload.id;
    const p = config.getProject(id);
    if (!p) return { ok: false, error: 'Project not found' };
    const url = String((payload && payload.url) || p.remoteUrl || '').trim();
    if (!url) {
      return { ok: false, message: toast('warn', 'main.noRemote.title', 'main.noRemote.detail') };
    }
    const creds = credsFor(id);
    const res = await git.lsRemote(url, creds);
    if (!res.ok) return { ok: false, message: messages.friendlyError(res, 'main.err.connect.title') };
    return { ok: true, message: toast('ok', 'main.connected.title', 'main.connected.detail') };
  }));

  ipcMain.handle('project:fetch', safe(async (_evt, id) => {
    const p = config.getProject(id);
    if (!p) return { ok: false, error: 'Project not found' };
    const res = await git.fetch(p.path, credsFor(id));
    if (!res.ok) return { ok: false, message: messages.friendlyError(res, 'main.err.checkServer.title') };
    return { ok: true, message: toast('ok', 'main.serverChecked.title', 'main.serverChecked.detail') };
  }));

  ipcMain.handle('project:pull', safe(async (_evt, id) => {
    const p = config.getProject(id);
    if (!p) return { ok: false, error: 'Project not found' };

    const st = await git.status(p.path);

    // Safety (on by default): never Pull over uncommitted local changes.
    if (config.getSettings().blockPullWithLocalChanges && st.ok && st.data.changes.length > 0) {
      return { ok: false, blocked: true, message: toast('warn', 'main.pullBlocked.title', 'main.pullBlocked.detail') };
    }

    // Empty repository with a known server: this is the "only .git" case.
    // Fetch and check out the server branch instead of trying a plain pull
    // (which has no upstream to pull from yet).
    if (st.ok && st.data.initial) {
      if (!p.remoteUrl) return { ok: false, message: toast('warn', 'main.noRemote.title', 'main.noRemote.detail') };
      const restored = await git.restoreSources(p.path, credsFor(id), st.data.branch || '');
      if (!restored.ok) return { ok: false, message: messages.friendlyError(restored, 'main.err.download.title') };
      const afterRestore = await git.status(p.path);
      return {
        ok: true,
        restored: true,
        branch: restored.branch,
        data: afterRestore.ok ? afterRestore.data : null,
        message: toast('ok', 'main.sourcesRestored.title', 'main.sourcesRestored.detail', { branch: restored.branch }),
      };
    }

    // Otherwise, save uncommitted work first so pulling cannot surprise the user.
    if (st.ok && st.data.changes.length > 0) {
      const save = await git.addAll(p.path);
      if (save.ok) {
        await git.commit(p.path, T('main.autoSaveCommit'));
      }
    }
    const res = await git.pull(p.path, credsFor(id));
    if (!res.ok) return { ok: false, message: messages.friendlyError(res, 'main.err.download.title') };
    const after = await git.status(p.path);
    return {
      ok: true,
      data: after.ok ? after.data : null,
      message: toast('ok', 'main.pulled.title', 'main.pulled.detail'),
    };
  }));

  ipcMain.handle('project:push', safe(async (_evt, payload) => {
    const id = payload && (payload.id || payload);
    const message = payload && payload.message;
    const p = config.getProject(id);
    if (!p) return { ok: false, error: 'Project not found' };

    const st = await git.status(p.path);
    if (!st.ok) return { ok: false, message: messages.friendlyError({ stderr: st.error }, 'main.err.readProject.title') };

    if (st.data.changes.length > 0) {
      const text = String(message || '').trim() || T('main.defaultCommitMessage', { date: new Date().toLocaleString() });
      const addRes = await git.addAll(p.path);
      if (!addRes.ok) return { ok: false, message: messages.friendlyError(addRes, 'main.err.prepareChanges.title') };
      const commitRes = await git.commit(p.path, text);
      if (!commitRes.ok && !/nothing to commit/i.test(commitRes.stdout + commitRes.stderr)) {
        return { ok: false, message: messages.friendlyError(commitRes, 'main.err.saveChanges.title') };
      }
    } else if (st.data.initial) {
      return { ok: true, message: toast('info', 'main.notSavedYet.title', 'main.notSavedYet.detail') };
    } else if (st.data.ahead === 0 && st.data.upstream) {
      return { ok: true, message: toast('ok', 'main.alreadyUpToDate.title', 'main.alreadyUpToDate.detail') };
    }

    let res = await git.push(p.path, credsFor(id));
    if (!res.ok && /no upstream|no configured push destination|not have any commits yet|set-upstream/i.test(res.stderr + res.stdout)) {
      res = await git.pushSetUpstream(p.path, credsFor(id));
    }
    if (!res.ok) return { ok: false, message: messages.friendlyError(res, 'main.err.upload.title') };

    return { ok: true, message: toast('ok', 'main.pushed.title', 'main.pushed.detail') };
  }));

  ipcMain.handle('project:commit', safe(async (_evt, payload) => {
    const id = payload && payload.id;
    const p = config.getProject(id);
    if (!p) return { ok: false, error: 'Project not found' };
    const addRes = await git.addAll(p.path);
    if (!addRes.ok) return { ok: false, message: messages.friendlyError(addRes, 'main.err.prepareChanges.title') };
    const commitRes = await git.commit(p.path, payload.message || 'Update');
    if (!commitRes.ok) return { ok: false, message: messages.friendlyError(commitRes, 'main.err.saveChanges.title') };
    return { ok: true, message: toast('ok', 'main.savedLocally.title', 'main.savedLocally.detail') };
  }));

  ipcMain.handle('project:discard-file', safe(async (_evt, payload) => {
    const id = payload && payload.id;
    const p = config.getProject(id);
    if (!p) return { ok: false, error: 'Project not found' };
    const filePath = String((payload && payload.path) || '');
    if (!filePath) return { ok: false, message: toast('info', 'discard.nothing.title', 'discard.nothing.detail') };

    const res = await git.discardFile(p.path, filePath);
    if (!res.ok) {
      if (res.reason === 'not-changed' || res.reason === 'nothing') {
        return { ok: false, message: toast('info', 'discard.nothing.title', 'discard.nothing.detail') };
      }
      return { ok: false, message: messages.friendlyError(res, 'discard.failed.title') };
    }
    const after = await git.status(p.path);
    return {
      ok: true,
      data: after.ok ? after.data : null,
      message: toast('ok', 'discard.done.title', 'discard.done.detail'),
    };
  }));

  ipcMain.handle('project:discard-all', safe(async (_evt, id) => {
    const p = config.getProject(id);
    if (!p) return { ok: false, error: 'Project not found' };

    const res = await git.discardAll(p.path);
    if (!res.ok) {
      if (res.reason === 'nothing') {
        return { ok: false, message: toast('info', 'discard.nothing.title', 'discard.nothing.detail') };
      }
      return { ok: false, message: messages.friendlyError(res, 'discard.failed.title') };
    }
    const after = await git.status(p.path);
    return {
      ok: true,
      data: after.ok ? after.data : null,
      message: toast('ok', 'discard.done.title', 'discard.done.detail'),
    };
  }));
}

module.exports = { registerIpc };
