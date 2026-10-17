'use strict';

/*
 * Headless smoke test. Run with:
 *   xvfb-run -a npx electron scripts/smoke.js
 * Loads the real renderer + preload + IPC in a hidden window and reports.
 */

const path = require('path');
const os = require('os');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { app, BrowserWindow, Menu } = require('electron');

app.setPath('userData', path.join(os.tmpdir(), 'laes-smoke-' + process.pid));
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu');

const { registerIpc } = require('../src/main/ipc');
const { applyMenu } = require('../src/main/menu');
const I18n = require('../src/shared/i18n');

// Isolate the global git config so the identity round-trip does not touch the
// developer's real ~/.gitconfig, and so the first-run identity prompt appears.
const globalGitConfig = path.join(os.tmpdir(), 'laes-smoke-gitconfig-' + process.pid);
fs.writeFileSync(globalGitConfig, '');
process.env.GIT_CONFIG_GLOBAL = globalGitConfig;

// A real local Git repo with a remote, to exercise the "inspect folder"
// detection used when adding an existing project.
const inspectRepo = path.join(os.tmpdir(), 'laes-smoke-repo-' + process.pid);
fs.mkdirSync(inspectRepo, { recursive: true });
execFileSync('git', ['init'], { cwd: inspectRepo });
execFileSync('git', ['remote', 'add', 'origin', 'https://example.com/already.git'], { cwd: inspectRepo });
execFileSync('git', ['config', 'user.name', 'Repo Owner'], { cwd: inspectRepo });
execFileSync('git', ['config', 'user.email', 'owner@example.com'], { cwd: inspectRepo });

let win = null;
let failed = false;

app.whenReady().then(() => {
  applyMenu();
  const menuOk = process.platform === 'darwin' ? true : Menu.getApplicationMenu() === null;
  console.log((menuOk ? 'PASS' : 'FAIL') + ' - application menu removed on this platform');
  if (!menuOk) failed = true;

  registerIpc(() => win);
  win = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'src', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Electron 35+ passes a single details object with a string `level`.
  win.webContents.on('console-message', (details) => {
    const level = (details && details.level) || 'info';
    const message = (details && details.message) || '';
    console.log('[renderer:' + level + '] ' + message);
    if (level === 'error' || /error/i.test(message)) {
      failed = true;
    }
  });
  win.webContents.on('render-process-gone', (_e, details) => {
    console.error('[render-gone] ' + JSON.stringify(details));
    app.exit(2);
  });

  win.webContents.on('did-finish-load', async () => {
    try {
      const result = await win.webContents.executeJavaScript(`
        (async () => {
          const out = {};
          const wait = (ms) => new Promise((r) => setTimeout(r, ms));
          out.hasApi = typeof window.api === 'object';
          out.hasI18n = typeof window.LaesI18n === 'object';
          const info = await window.api.app.info();
          out.platform = info.platform;
          out.locale = info.locale;
          const git = await window.api.app.detectGit();
          out.gitInstalled = git.installed;
          out.gitVersion = git.version;
          const projects = await window.api.projects.list();
          out.projects = projects.projects.length;

          // "Add project" must detect an existing Git repo and surface its remote.
          const inspect = await window.api.project.inspect({ path: ${JSON.stringify(inspectRepo)} });
          out.inspectIsRepo = inspect.isRepo;
          out.inspectRemote = inspect.remoteUrl;
          out.inspectIdentity = inspect.identity && inspect.identity.name;

          // A non-repo folder must not be flagged.
          const plain = await window.api.project.inspect({ path: ${JSON.stringify(os.tmpdir())} });
          out.plainIsRepo = plain.isRepo;

          // First launch: language chooser must be shown (no language chosen yet).
          const headingBefore = document.querySelector('.welcome h1');
          out.chooserShown = !!headingBefore;
          out.headingBefore = headingBefore ? headingBefore.textContent.trim() : null;

          // Choose French via the big button.
          const frBtn = Array.from(document.querySelectorAll('.welcome button')).find((b) => /Français/.test(b.textContent));
          if (frBtn) frBtn.click();
          await wait(600);

          const settings = await window.api.settings.get();
          out.savedLanguage = settings.settings.language;
          out.savedChosen = settings.settings.languageChosen;

          // Identity is empty -> first-run identity prompt must appear.
          const idInputs = document.querySelectorAll('.welcome input');
          out.identityPromptShown = idInputs.length >= 2;
          out.identityHeading = (document.querySelector('.welcome h1') || {}).textContent || '';

          const setVal = (el, v) => {
            el.value = v;
            el.dispatchEvent(new Event('input', { bubbles: true }));
          };
          if (idInputs.length >= 2) {
            setVal(idInputs[0], 'Test User');
            setVal(idInputs[1], 'test@example.com');
            const saveBtn = document.querySelector('.welcome .btn-primary');
            if (saveBtn) saveBtn.click();
          }
          await wait(600);

          const idRes = await window.api.identity.get();
          out.savedIdentity = (idRes.name || '') + '|' + (idRes.email || '');
          const sidebar = document.querySelector('.sidebar-head h2');
          out.sidebarAfterIdentity = sidebar ? sidebar.textContent.trim() : null;

          // Open the settings dialog: language switch + identity prefilled + ESC.
          const gear = document.querySelector('.topbar .icon-btn');
          if (gear) gear.click();
          await wait(300);
          out.settingsOpened = !!document.querySelector('.overlay input[type="radio"][value="en"]');
          const idNameInput = document.querySelector('.overlay input[type="text"]');
          out.identityPrefilled = idNameInput ? idNameInput.value : null;
          const enRadio = document.querySelector('.overlay input[type="radio"][value="en"]');
          if (enRadio) enRadio.click();
          await wait(400);
          const sidebarEn = document.querySelector('.sidebar-head h2');
          out.sidebarAfterEn = sidebarEn ? sidebarEn.textContent.trim() : null;

          // ESC must cancel the open popup.
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
          await wait(200);
          out.escClosedSettings = !document.querySelector('.overlay');

          return out;
        })()
      `);
      console.log('[smoke] ' + JSON.stringify(result));

      const assertions = [
        ['api bridge', result.hasApi],
        ['i18n loaded', result.hasI18n],
        ['language chooser shown on first launch', result.chooserShown],
        ['default language follows system locale', result.headingBefore === I18n.t(I18n.normalize(result.locale), 'lang.title')],
        ['French selected persists', result.savedLanguage === 'fr' && result.savedChosen === true],
        ['identity prompt shown when unset', result.identityPromptShown === true],
        ['identity saved to git config', result.savedIdentity === 'Test User|test@example.com'],
        ['UI is French after identity setup', result.sidebarAfterIdentity === 'Vos projets'],
        ['settings dialog opens from top-bar button', result.settingsOpened === true],
        ['settings shows saved identity', result.identityPrefilled === 'Test User'],
        ['UI is English after switching back', result.sidebarAfterEn === 'Your projects'],
        ['ESC cancels the popup', result.escClosedSettings === true],
        ['existing Git repo detected on add', result.inspectIsRepo === true],
        ['existing remote URL surfaced', result.inspectRemote === 'https://example.com/already.git'],
        ['existing identity surfaced', result.inspectIdentity === 'Repo Owner'],
        ['non-repo folder not flagged', result.plainIsRepo === false],
      ];
      for (const [name, ok] of assertions) {
        console.log((ok ? 'PASS' : 'FAIL') + ' - ' + name);
        if (!ok) failed = true;
      }
    } catch (err) {
      console.error('[smoke-error] ' + (err && err.stack ? err.stack : err));
      failed = true;
    }
    setTimeout(() => app.exit(failed ? 1 : 0), 300);
  });

  win.loadFile(path.join(__dirname, '..', 'src', 'renderer', 'index.html'));
});
