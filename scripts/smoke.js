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
// An uncommitted local change, so the Pull safety guard has something to block on.
fs.writeFileSync(path.join(inspectRepo, 'local-change.txt'), 'work in progress\n');

const config = require('../src/main/config');

let win = null;
let failed = false;

app.whenReady().then(() => {
  applyMenu();
  const menuOk = process.platform === 'darwin' ? true : Menu.getApplicationMenu() === null;
  console.log((menuOk ? 'PASS' : 'FAIL') + ' - application menu removed on this platform');
  if (!menuOk) failed = true;

  registerIpc(() => win);

  // Seed a project (with a local change -> "to push"), remember it as last
  // opened, and add one with a missing folder.
  const seeded = config.addProject({ name: 'Inspect', path: inspectRepo, remoteUrl: 'https://example.com/already.git' });
  config.setSettings({ lastProjectId: seeded.id });
  config.addProject({ name: 'Gone', path: path.join(os.tmpdir(), 'laes-missing-' + process.pid), remoteUrl: '' });

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

          // The last project must be re-opened automatically (no Welcome card).
          out.projectAutoOpened = !!document.querySelector('.tabs');
          out.welcomeShown = !!document.querySelector('.content .welcome');
          // Sidebar state icons + legend.
          const stateGlyphs = Array.from(document.querySelectorAll('.project-item .state')).map((el) => el.textContent.trim());
          out.hasUnpushedIcon = stateGlyphs.indexOf('🟠') !== -1;
          out.hasMissingIcon = stateGlyphs.indexOf('⚠️') !== -1;
          out.legendItems = document.querySelectorAll('.legend .legend-item').length;
          const statusesRes = await window.api.projects.statuses();
          out.statusesCount = statusesRes.statuses ? statusesRes.statuses.length : 0;

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

          // Header logo (link to local-ai-experts.com) must load.
          const logoImg = document.querySelector('.topbar .brand-logo');
          out.brandLogoLoaded = !!(logoImg && logoImg.complete && logoImg.naturalWidth > 0);
          out.brandLogoInLink = !!(logoImg && logoImg.closest('a') && /local-ai-experts\.com/.test(logoImg.closest('a').href));
          // Sidebar must show the project name only, not the real path.
          out.sidebarShowsPath = !!document.querySelector('.sidebar .ppath');

          // Tabs: an unvalidated project must open the "Git configuration" tab first.
          const projBtn = document.querySelector('.sidebar .project-item');
          if (projBtn) projBtn.click();
          await wait(500);
          const activeTab = document.querySelector('.tab.active');
          out.activeTabText = activeTab ? activeTab.textContent.replace('●', '').trim() : null;
          out.tabDotPresent = !!document.querySelector('.tab-dot');
          out.verifyButtonPresent = Array.from(document.querySelectorAll('button')).some((b) => /Verify authentication/.test(b.textContent));
          const rcDesc = document.querySelector('.radio-card .rc-desc');
          out.rcDescBlock = rcDesc ? getComputedStyle(rcDesc).display === 'block' : false;
          const syncTab = Array.from(document.querySelectorAll('.tab')).find((tk) => tk.textContent.trim() === 'Sync');
          if (syncTab) syncTab.click();
          await wait(200);
          const activeTab2 = document.querySelector('.tab.active');
          out.syncTabText = activeTab2 ? activeTab2.textContent.trim() : null;

          // Project tab offers a "open a terminal here" action.
          const projTab = Array.from(document.querySelectorAll('.tab')).find((tk) => tk.textContent.trim() === 'Project');
          if (projTab) projTab.click();
          await wait(200);
          out.terminalButtonPresent = Array.from(document.querySelectorAll('button')).some((b) => /Open a terminal here/.test(b.textContent));

          // Pull safety: blocked while local changes exist (default on).
          const allSettings = await window.api.settings.get();
          out.blockPullDefault = allSettings.settings.blockPullWithLocalChanges === true;
          const created = await window.api.projects.create({ path: ${JSON.stringify(inspectRepo)}, name: 'Inspect2' });
          out.createdOk = !!(created && created.ok);
          out.needsSourcesDetected = !!(created && created.needsSources);
          const pullRes = await window.api.project.pull(created.project.id);
          out.pullBlocked = pullRes.ok === false && pullRes.blocked === true;
          out.pullBlockedTitle = pullRes.message && pullRes.message.title;

          // Every Git command must be visible in the command log.
          const act = await window.api.activity.list();
          out.activityEntries = act && act.ok ? act.entries.length : 0;
          out.activityHasCommand = !!(act && act.entries && act.entries.some((e) => e.command === 'git' && Array.isArray(e.args)));
          out.activityBarPresent = !!document.querySelector('.activity-bar');
          out.activityTogglePresent = !!document.querySelector('.topbar .activity-toggle');

          // Integrated diff viewer: a button must be available and the API must
          // return the unified diff for a local change.
          out.diffButtonPresent = Array.from(document.querySelectorAll('button')).some((b) => /See differences/.test(b.textContent));
          out.diffApiPresent = typeof window.api.project.diff === 'function' && typeof window.api.project.openDiffTool === 'function';
          const diffRes = await window.api.project.diff({ id: created.project.id, path: 'local-change.txt' });
          out.diffOk = !!(diffRes && diffRes.ok);
          out.diffHasContent = !!(diffRes && diffRes.files && diffRes.files.length === 1 && diffRes.files[0].diff.indexOf('+work in progress') !== -1);

          // Open the integrated viewer from the Sync tab.
          const syncTab2 = Array.from(document.querySelectorAll('.tab')).find((tk) => tk.textContent.trim() === 'Sync');
          if (syncTab2) syncTab2.click();
          await wait(300);
          const diffBtn = document.querySelector('.change-diff');
          if (diffBtn) diffBtn.click();
          await wait(500);
          out.diffModalShown = !!document.querySelector('.diff-modal');
          out.diffAddedLineRendered = !!document.querySelector('.diff-modal .diff-line.add');

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
        ['last project reopened automatically (no Welcome)', result.projectAutoOpened === true && result.welcomeShown === false],
        ['sidebar shows a "to push" state icon', result.hasUnpushedIcon === true],
        ['sidebar shows a "not found" icon for a missing project', result.hasMissingIcon === true],
        ['sidebar legend has 4 entries', result.legendItems === 4],
        ['projects:statuses returns a state per project', result.statusesCount === 2],
        ['settings dialog opens from top-bar button', result.settingsOpened === true],
        ['settings shows saved identity', result.identityPrefilled === 'Test User'],
        ['UI is English after switching back', result.sidebarAfterEn === 'Your projects'],
        ['ESC cancels the popup', result.escClosedSettings === true],
        ['header logo loaded from local-ai-experts.com link', result.brandLogoLoaded === true && result.brandLogoInLink === true],
        ['sidebar shows name only (no real path)', result.sidebarShowsPath === false],
        ['unvalidated project opens Git configuration tab first', result.activeTabText === 'Git configuration' && result.tabDotPresent === true],
        ['verify authentication button present', result.verifyButtonPresent === true],
        ['auth option title/description on separate lines', result.rcDescBlock === true],
        ['can switch to the Sync tab', result.syncTabText === 'Sync'],
        ['project tab offers a terminal button', result.terminalButtonPresent === true],
        ['block Pull with local changes is on by default', result.blockPullDefault === true],
        ['Pull is blocked while local changes exist', result.pullBlocked === true && result.pullBlockedTitle === 'Pull is blocked'],
        ['a folder with only .git is detected as needing sources', result.needsSourcesDetected === true],
        ['command log records Git commands', result.activityEntries > 0 && result.activityHasCommand === true],
        ['command log bar and top-bar toggle are visible', result.activityBarPresent === true && result.activityTogglePresent === true],
        ['"See differences" button is present when files changed', result.diffButtonPresent === true],
        ['diff API is exposed', result.diffApiPresent === true],
        ['diff API returns the changed lines', result.diffOk === true && result.diffHasContent === true],
        ['integrated diff viewer opens and renders added lines', result.diffModalShown === true && result.diffAddedLineRendered === true],
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
