'use strict';

const { createApp } = Vue;
const bridge = window.api;
const I18n = window.LaesI18n;
const SITE_URL = 'https://local-ai-experts.com';

function openSite() {
  bridge.app.openExternal(SITE_URL);
}

const MessageBanner = {
  props: {
    message: { type: Object, required: true },
    lang: { type: String, default: 'en' },
    dismissible: { type: Boolean, default: true },
  },
  emits: ['dismiss'],
  computed: {
    icon() {
      const map = { ok: '✅', warn: '⚠️', error: '⛔', info: 'ℹ️' };
      return map[this.message.tone] || 'ℹ️';
    },
    cls() {
      return 'banner ' + (this.message.tone || 'info');
    },
    dismissLabel() {
      return I18n.t(this.lang, 'common.dismiss');
    },
  },
  template: `
    <div :class="cls">
      <div class="icon">{{ icon }}</div>
      <div class="body">
        <p class="title">{{ message.title }}</p>
        <p class="detail" v-if="message.detail">{{ message.detail }}</p>
      </div>
      <button v-if="dismissible" class="close" :title="dismissLabel" @click="$emit('dismiss')">✕</button>
    </div>
  `,
};

const GitMissing = {
  props: {
    platform: { type: String, default: '' },
    lang: { type: String, default: 'en' },
  },
  emits: ['recheck'],
  computed: {
    osKey() {
      if (this.platform === 'win32') return 'win';
      if (this.platform === 'darwin') return 'mac';
      return 'linux';
    },
    downloadUrl() {
      if (this.platform === 'win32') return 'https://git-scm.com/download/win';
      if (this.platform === 'darwin') return 'https://git-scm.com/download/mac';
      return 'https://git-scm.com/download/linux';
    },
    platformName() {
      return I18n.t(this.lang, 'platform.' + (this.osKey === 'win' ? 'windows' : this.osKey === 'mac' ? 'macos' : 'linux'));
    },
    title() {
      return I18n.t(this.lang, 'git.title');
    },
    intro() {
      return I18n.t(this.lang, 'git.intro');
    },
    steps() {
      return [1, 2, 3].map((i) => I18n.t(this.lang, 'git.steps.' + this.osKey + '.' + i));
    },
    downloadLabel() {
      return I18n.t(this.lang, 'git.downloadButton', { platform: this.platformName });
    },
    recheckLabel() {
      return I18n.t(this.lang, 'git.recheck');
    },
  },
  methods: {
    download() {
      bridge.app.openExternal(this.downloadUrl);
    },
  },
  template: `
    <div class="app-shell">
      <div class="topbar">
        <div class="brand">
          <a class="brand-link" href="https://local-ai-experts.com" @click.prevent="openSite">
            <img class="brand-logo" src="assets/logo-local-ai-experts.svg" alt="Local AI Experts" />
          </a>
          <span>Local AI Experts Sync</span>
        </div>
      </div>
      <div class="center-wrap">
        <div class="welcome card" style="padding:32px">
          <div class="big">🧰</div>
          <h1>{{ title }}</h1>
          <p>{{ intro }}</p>
          <ol class="steps">
            <li v-for="(s, i) in steps" :key="i"><span class="n">{{ i + 1 }}</span><span>{{ s }}</span></li>
          </ol>
          <div class="actions-row" style="justify-content:center;margin-top:22px">
            <button class="btn btn-primary btn-lg" @click="download">⬇️ {{ downloadLabel }}</button>
            <button class="btn btn-lg" @click="$emit('recheck')">{{ recheckLabel }}</button>
          </div>
        </div>
      </div>
    </div>
  `,
};

const LanguageChooser = {
  props: { defaultLang: { type: String, default: 'en' } },
  emits: ['choose'],
  computed: {
    heading() {
      return I18n.t(this.defaultLang, 'lang.title');
    },
    subtitle() {
      return I18n.t(this.defaultLang, 'lang.subtitle');
    },
  },
  methods: {
    pick(l) {
      this.$emit('choose', l);
    },
  },
  template: `
    <div class="app-shell">
      <div class="topbar">
        <div class="brand">
          <a class="brand-link" href="https://local-ai-experts.com" @click.prevent="openSite">
            <img class="brand-logo" src="assets/logo-local-ai-experts.svg" alt="Local AI Experts" />
          </a>
          <span>Local AI Experts Sync</span>
        </div>
      </div>
      <div class="center-wrap">
        <div class="welcome card" style="padding:36px;max-width:520px">
          <div class="big">🌍</div>
          <h1>{{ heading }}</h1>
          <p>{{ subtitle }}</p>
          <div class="actions-row" style="justify-content:center;margin-top:22px">
            <button class="btn btn-lg" :class="{ 'btn-primary': defaultLang === 'en' }" @click="pick('en')">
              🇬🇧 English
            </button>
            <button class="btn btn-lg" :class="{ 'btn-primary': defaultLang === 'fr' }" @click="pick('fr')">
              🇫🇷 Français
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
};

const IdentitySetup = {
  props: {
    lang: { type: String, default: 'en' },
    saving: { type: Boolean, default: false },
    error: { type: String, default: '' },
  },
  emits: ['save', 'later'],
  data() {
    return { name: '', email: '' };
  },
  computed: {
    title() {
      return I18n.t(this.lang, 'identity.setup.title');
    },
    intro() {
      return I18n.t(this.lang, 'identity.setup.intro');
    },
    nameLabel() {
      return I18n.t(this.lang, 'identity.name');
    },
    emailLabel() {
      return I18n.t(this.lang, 'identity.email');
    },
    saveLabel() {
      return I18n.t(this.lang, 'identity.setup.save');
    },
    laterLabel() {
      return I18n.t(this.lang, 'identity.setup.later');
    },
    namePlaceholder() {
      return I18n.t(this.lang, 'identity.namePlaceholder');
    },
    emailPlaceholder() {
      return I18n.t(this.lang, 'identity.emailPlaceholder');
    },
  },
  methods: {
    submit() {
      this.$emit('save', { name: this.name, email: this.email });
    },
  },
  template: `
    <div class="app-shell">
      <div class="topbar">
        <div class="brand">
          <a class="brand-link" href="https://local-ai-experts.com" @click.prevent="openSite">
            <img class="brand-logo" src="assets/logo-local-ai-experts.svg" alt="Local AI Experts" />
          </a>
          <span>Local AI Experts Sync</span>
        </div>
      </div>
      <div class="center-wrap">
        <div class="welcome card" style="padding:32px;max-width:520px;text-align:left">
          <div class="big" style="text-align:center">🪪</div>
          <h1 style="text-align:center">{{ title }}</h1>
          <p style="text-align:center">{{ intro }}</p>
          <div class="field">
            <label>{{ nameLabel }}</label>
            <input type="text" v-model="name" :placeholder="namePlaceholder" @keyup.enter="submit" />
          </div>
          <div class="field">
            <label>{{ emailLabel }}</label>
            <input type="text" v-model="email" :placeholder="emailPlaceholder" @keyup.enter="submit" />
          </div>
          <p class="warn-note" v-if="error">{{ error }}</p>
          <div class="actions-row" style="justify-content:center;margin-top:18px">
            <button class="btn btn-primary btn-lg" :disabled="saving" @click="submit">
              <span class="spinner" v-if="saving"></span>
              <span v-else>{{ saveLabel }}</span>
            </button>
          </div>
          <div style="text-align:center;margin-top:12px">
            <button class="btn btn-ghost btn-sm" @click="$emit('later')">{{ laterLabel }}</button>
          </div>
        </div>
      </div>
    </div>
  `,
};

const app = createApp({
  components: { MessageBanner, GitMissing, LanguageChooser, IdentitySetup },
  data() {
    return {
      booting: true,
      git: null,
      info: null,
      lang: 'en',
      languageChosen: false,
      projects: [],
      selectedId: null,
      status: null,
      counts: null,
      statusMessage: null,
      banner: null,
      busy: '',
      addModal: false,
      newProject: { name: '', path: '', remoteUrl: '' },
      addError: '',
      addRepoInfo: null,
      pushModal: false,
      pushMessage: '',
      remoteInput: '',
      gitIdentity: { name: '', email: '' },
      identityDismissed: false,
      identitySaving: false,
      identityError: '',
      identityFormName: '',
      identityFormEmail: '',
      blockPull: true,
      lastProjectId: '',
      authMode: 'none',
      authUsername: '',
      authSecret: '',
      sshKeyPath: '',
      secretDirty: false,
      deleteConfirm: false,
      settingsModal: false,
      activeTab: 'sync',
    };
  },
  computed: {
    defaultLang() {
      return I18n.normalize(this.info && this.info.locale);
    },
    identityReady() {
      return Boolean(this.gitIdentity.name && this.gitIdentity.email);
    },
    pullBlocked() {
      return this.blockPull && this.changes.length > 0;
    },
    selectedProject() {
      return this.projects.find((p) => p.id === this.selectedId) || null;
    },
    hasGit() {
      return this.git && this.git.installed;
    },
    changes() {
      return (this.status && this.status.changes) || [];
    },
    behind() {
      return (this.status && this.status.behind) || 0;
    },
    ahead() {
      return (this.status && this.status.ahead) || 0;
    },
    encryptionWarning() {
      return this.info && this.info.encryptionAvailable === false;
    },
  },
  methods: {
    t(key, params) {
      return I18n.t(this.lang, key, params);
    },
    async boot() {
      this.booting = true;
      const [gitRes, infoRes, settingsRes] = await Promise.all([
        bridge.app.detectGit(),
        bridge.app.info(),
        bridge.settings.get(),
      ]);
      this.git = gitRes;
      this.info = infoRes;
      const settings = (settingsRes && settingsRes.settings) || {};
      this.languageChosen = !!settings.languageChosen;
      this.lang = this.languageChosen ? settings.language : I18n.normalize(infoRes.locale);
      this.identityDismissed = !!settings.identityPromptDismissed;
      this.blockPull = settings.blockPullWithLocalChanges !== false;
      this.lastProjectId = settings.lastProjectId || '';
      if (gitRes.installed) {
        const idRes = await bridge.identity.get();
        if (idRes && idRes.ok) this.gitIdentity = { name: idRes.name || '', email: idRes.email || '' };
      }
      await this.refreshProjects();
      // Re-open the last project (only if it still exists), otherwise show Welcome.
      if (this.lastProjectId) {
        const last = this.projects.find((p) => p.id === this.lastProjectId);
        if (last && last.exists !== false) await this.selectProject(last);
      }
      this.booting = false;
    },
    async chooseLanguage(lang) {
      this.lang = I18n.languages.indexOf(lang) !== -1 ? lang : this.defaultLang;
      await bridge.settings.set({ language: this.lang, languageChosen: true });
      this.languageChosen = true;
    },
    async changeLanguage(lang) {
      this.lang = I18n.languages.indexOf(lang) !== -1 ? lang : 'en';
      await bridge.settings.set({ language: this.lang, languageChosen: true });
      if (this.selectedProject) await this.refreshStatus();
    },
    async saveIdentity(payload) {
      const name = String((payload && payload.name) || '').trim();
      const email = String((payload && payload.email) || '').trim();
      if (!name || !email) {
        this.identityError = this.t('identity.errorRequired');
        return;
      }
      this.identitySaving = true;
      this.identityError = '';
      const res = await bridge.identity.set({ name, email });
      this.identitySaving = false;
      if (!res || !res.ok) {
        this.identityError = this.t('main.generic.detail');
        return;
      }
      this.gitIdentity = { name: res.name, email: res.email };
      this.identityFormName = res.name;
      this.identityFormEmail = res.email;
      this.setBanner({ tone: 'ok', title: this.t('banner.identitySaved.title'), detail: this.t('banner.identitySaved.detail') });
    },
    async dismissIdentity() {
      this.identityDismissed = true;
      await bridge.settings.set({ identityPromptDismissed: true });
    },
    openSettings() {
      this.identityFormName = this.gitIdentity.name;
      this.identityFormEmail = this.gitIdentity.email;
      this.identityError = '';
      this.settingsModal = true;
    },
    closeSettings() {
      this.settingsModal = false;
    },
    async setBlockPull(value) {
      this.blockPull = !!value;
      await bridge.settings.set({ blockPullWithLocalChanges: this.blockPull });
    },
    closeTopModal() {
      if (this.deleteConfirm) this.deleteConfirm = false;
      else if (this.pushModal) this.pushModal = false;
      else if (this.addModal) this.addModal = false;
      else if (this.settingsModal) this.settingsModal = false;
    },
    onKeydown(evt) {
      if (evt.key === 'Escape') this.closeTopModal();
    },
    async recheckGit() {
      this.git = await bridge.app.detectGit();
    },
    async refreshProjects() {
      const res = await bridge.projects.list();
      if (res.ok) this.projects = res.projects;
      if (this.selectedId && !this.projects.find((p) => p.id === this.selectedId)) {
        this.selectedId = null;
      }
      await this.refreshStates();
    },
    async refreshStates() {
      const res = await bridge.projects.statuses();
      if (!res || !res.ok) return;
      const map = {};
      res.statuses.forEach((s) => {
        map[s.id] = s.state;
      });
      this.projects = this.projects.map((p) => Object.assign({}, p, {
        syncState: map[p.id] || (p.exists === false ? 'missing' : 'upToDate'),
      }));
    },
    computeState(data) {
      if (!data) return 'upToDate';
      const hasLocal = data.changes.length > 0 || data.ahead > 0;
      if (hasLocal) return 'unpushed';
      if (data.behind > 0) return 'toPull';
      return 'upToDate';
    },
    stateGlyph(state) {
      return { upToDate: '🟢', unpushed: '🟠', toPull: '🔵', missing: '⚠️' }[state] || '🟢';
    },
    stateLabel(state) {
      return this.t('legend.' + (['upToDate', 'unpushed', 'toPull', 'missing'].indexOf(state) !== -1 ? state : 'upToDate'));
    },
    setBanner(message) {
      this.banner = message || null;
    },
    dismiss() {
      this.banner = null;
    },
    async selectProject(p) {
      this.selectedId = p.id;
      this.lastProjectId = p.id;
      this.banner = null;
      this.status = null;
      this.statusMessage = null;
      // Until the Git configuration is validated, open that tab first.
      this.activeTab = p.configValidated ? 'sync' : 'config';
      this.populateForms(p);
      await bridge.settings.set({ lastProjectId: p.id });
      await this.refreshStatus();
    },
    populateForms(p) {
      this.remoteInput = p.remoteUrl || '';
      this.authMode = p.auth.mode || 'none';
      this.authUsername = p.auth.username || '';
      this.sshKeyPath = p.auth.sshKeyPath || '';
      this.authSecret = '';
      this.secretDirty = false;
    },
    async refreshStatus() {
      if (!this.selectedProject) return;
      this.busy = 'status';
      const res = await bridge.project.status(this.selectedId);
      this.busy = '';
      if (!res.ok) {
        this.statusMessage = res.message;
        this.setBanner(res.message);
        return;
      }
      this.status = res.data;
      this.counts = res.counts;
      this.statusMessage = res.message;
      // Keep the sidebar icon in sync for the selected project.
      const state = this.computeState(res.data);
      this.projects = this.projects.map((p) => (p.id === this.selectedId ? Object.assign({}, p, { syncState: state }) : p));
    },
    kindLabel(kind) {
      const known = ['new', 'added', 'modified', 'deleted', 'renamed', 'conflict', 'changed'];
      return this.t('change.' + (known.indexOf(kind) !== -1 ? kind : 'changed'));
    },
    platformLabel() {
      const p = this.info && this.info.platform;
      if (p === 'win32') return this.t('platform.windows');
      if (p === 'darwin') return this.t('platform.macos');
      if (p === 'linux') return this.t('platform.linux');
      return '';
    },

    /* ---- add project ---- */
    openAddModal() {
      this.newProject = { name: '', path: '', remoteUrl: '' };
      this.addError = '';
      this.addRepoInfo = null;
      this.addModal = true;
    },
    closeAddModal() {
      this.addModal = false;
    },
    async pickFolder() {
      const res = await bridge.dialog.pickFolder();
      if (res.ok && !res.canceled) {
        this.newProject.path = res.path;
        if (!this.newProject.name) {
          const parts = res.path.split(/[\\/]/).filter(Boolean);
          this.newProject.name = parts[parts.length - 1] || '';
        }
        await this.inspectFolder();
      }
    },
    async inspectFolder() {
      this.addRepoInfo = null;
      if (!this.newProject.path) return;
      const res = await bridge.project.inspect({ path: this.newProject.path });
      if (!res || !res.ok || !res.isRepo) return;
      this.addRepoInfo = { isRepo: true, remoteUrl: res.remoteUrl || '' };
      if (res.remoteUrl && !this.newProject.remoteUrl) this.newProject.remoteUrl = res.remoteUrl;
    },
    async createProject() {
      if (!this.newProject.path) {
        this.addError = this.t('add.errorChooseFolder');
        return;
      }
      this.busy = 'create';
      const res = await bridge.projects.create({
        path: this.newProject.path,
        name: this.newProject.name,
        remoteUrl: this.newProject.remoteUrl,
      });
      this.busy = '';
      if (!res.ok) {
        this.addError = (res.message && res.message.detail) || res.error || this.t('main.generic.detail');
        return;
      }
      this.addModal = false;
      await this.refreshProjects();
      const created = this.projects.find((p) => p.id === res.project.id) || res.project;
      await this.selectProject(created);
      if (res.initialized) {
        this.setBanner({ tone: 'ok', title: this.t('banner.folderReady.title'), detail: this.t('banner.folderReady.detail') });
      } else if (res.alreadyTracked && res.project.remoteUrl) {
        this.setBanner({ tone: 'ok', title: this.t('banner.alreadyGit.title'), detail: this.t('banner.alreadyGit.detail') });
      } else if (res.alreadyTracked) {
        this.setBanner({ tone: 'info', title: this.t('banner.alreadyGit.title'), detail: this.t('banner.alreadyGit.noRemote') });
      } else if (!res.project.remoteUrl) {
        this.setBanner({ tone: 'info', title: this.t('banner.projectAdded.title'), detail: this.t('banner.projectAdded.detail') });
      }
    },
    async removeSelected() {
      if (!this.selectedProject) return;
      this.busy = 'remove';
      await bridge.projects.remove(this.selectedId);
      this.busy = '';
      this.deleteConfirm = false;
      this.selectedId = null;
      this.lastProjectId = '';
      this.status = null;
      this.statusMessage = null;
      await bridge.settings.set({ lastProjectId: '' });
      await this.refreshProjects();
      this.setBanner({ tone: 'info', title: this.t('banner.projectRemoved.title'), detail: this.t('banner.projectRemoved.detail') });
    },

    /* ---- settings ---- */
    async saveRemote() {
      this.busy = 'remote';
      const res = await bridge.projects.update({ id: this.selectedId, patch: { remoteUrl: this.remoteInput } });
      this.busy = '';
      if (!res.ok) {
        this.setBanner(res.message || { tone: 'error', title: this.t('banner.couldNotSave.title'), detail: res.error });
        return;
      }
      await this.refreshProjects();
      this.setBanner({ tone: 'ok', title: this.t('banner.remoteSaved.title'), detail: this.t('banner.remoteSaved.detail') });
    },
    async pickKeyFile() {
      const res = await bridge.dialog.pickKeyFile();
      if (res.ok && !res.canceled) this.sshKeyPath = res.path;
    },
    async saveAuth() {
      this.busy = 'auth';
      const patch = { auth: { mode: this.authMode, username: this.authUsername, sshKeyPath: this.sshKeyPath } };
      const payload = { id: this.selectedId, patch };
      if (this.authMode === 'token' || this.authMode === 'password') {
        if (this.secretDirty) payload.secret = this.authSecret;
      }
      const res = await bridge.projects.update(payload);
      this.busy = '';
      if (!res.ok) {
        this.setBanner(res.message || { tone: 'error', title: this.t('banner.couldNotSave.title'), detail: res.error });
        return;
      }
      await this.refreshProjects();
      this.authSecret = '';
      this.secretDirty = false;
      this.setBanner({ tone: 'ok', title: this.t('banner.authSaved.title'), detail: this.t('banner.authSaved.detail') });
    },
    async clearSecret() {
      this.busy = 'auth';
      const res = await bridge.projects.update({ id: this.selectedId, patch: {}, secret: '' });
      this.busy = '';
      if (res.ok) {
        await this.refreshProjects();
        this.setBanner({ tone: 'info', title: this.t('banner.secretCleared.title'), detail: this.t('banner.secretCleared.detail') });
      }
    },

    /* ---- connection & sync ---- */
    async verifyAuthentication() {
      this.busy = 'test';
      const res = await bridge.project.testConnection({ id: this.selectedId, url: this.remoteInput });
      this.busy = '';
      if (res.ok) {
        // Mark the Git configuration as validated and move to the Sync tab.
        const upd = await bridge.projects.update({ id: this.selectedId, patch: { configValidated: true } });
        if (upd.ok) await this.refreshProjects();
        this.activeTab = 'sync';
        this.setBanner({ tone: 'ok', title: this.t('banner.authValidated.title'), detail: this.t('banner.authValidated.detail') });
      } else {
        this.setBanner(res.message);
      }
    },
    async doFetch() {
      this.busy = 'fetch';
      const res = await bridge.project.fetch(this.selectedId);
      this.busy = '';
      this.setBanner(res.message);
      if (res.ok) await this.refreshStatus();
    },
    async doPull() {
      if (this.pullBlocked) {
        this.setBanner({ tone: 'warn', title: this.t('main.pullBlocked.title'), detail: this.t('main.pullBlocked.detail') });
        return;
      }
      this.busy = 'pull';
      const res = await bridge.project.pull(this.selectedId);
      this.busy = '';
      this.setBanner(res.message);
      await this.refreshStatus();
    },
    openPush() {
      if (this.changes.length > 0) {
        this.pushMessage = '';
        this.pushModal = true;
      } else {
        this.confirmPush();
      }
    },
    closePush() {
      this.pushModal = false;
    },
    async confirmPush() {
      this.pushModal = false;
      this.busy = 'push';
      const res = await bridge.project.push({ id: this.selectedId, message: this.pushMessage });
      this.busy = '';
      this.setBanner(res.message);
      await this.refreshStatus();
    },
    async reveal() {
      if (this.selectedProject) await bridge.project.reveal(this.selectedId);
    },
  },
  mounted() {
    window.addEventListener('keydown', this.onKeydown);
    this.boot();
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.onKeydown);
  },
  template: `
    <div v-if="booting" class="app-shell">
      <div class="centered"><span class="spinner dark"></span><span>{{ t('app.starting') }}</span></div>
    </div>

    <language-chooser v-else-if="!languageChosen" :default-lang="defaultLang" @choose="chooseLanguage" />

    <git-missing v-else-if="!hasGit" :platform="info && info.platform" :lang="lang" @recheck="recheckGit" />

    <identity-setup
      v-else-if="!identityReady && !identityDismissed"
      :lang="lang"
      :saving="identitySaving"
      :error="identityError"
      @save="saveIdentity"
      @later="dismissIdentity"
    />

    <div v-else class="app-shell">
      <div class="topbar">
        <div class="brand">
          <a class="brand-link" href="https://local-ai-experts.com" :title="t('app.siteLink')" @click.prevent="openSite">
            <img class="brand-logo" src="assets/logo-local-ai-experts.svg" alt="Local AI Experts" />
          </a>
          <span>{{ t('app.brand') }}</span>
        </div>
        <div class="spacer"></div>
        <span class="hint" v-if="info">{{ t('app.gitVersionHint', { version: git.version, platform: platformLabel() }) }}</span>
        <button class="icon-btn" :title="t('settings.button')" :aria-label="t('settings.button')" @click="openSettings">⚙️</button>
      </div>

      <div class="main">
        <aside class="sidebar">
          <div class="sidebar-head">
            <h2>{{ t('sidebar.title') }}</h2>
            <button class="btn btn-sm btn-primary" @click="openAddModal">{{ t('sidebar.add') }}</button>
          </div>
          <ul class="project-list" v-if="projects.length">
            <li v-for="p in projects" :key="p.id">
              <button class="project-item" :class="{ active: p.id === selectedId }" @click="selectProject(p)">
                <span class="state" :title="stateLabel(p.syncState)">{{ stateGlyph(p.syncState) }}</span>
                <span class="names">
                  <span class="pname">{{ p.name }}</span>
                </span>
              </button>
            </li>
          </ul>
          <div class="empty-sidebar" v-else>{{ t('sidebar.empty') }}</div>

          <div class="legend" v-if="projects.length">
            <div class="legend-title">{{ t('legend.title') }}</div>
            <div class="legend-item"><span class="legend-glyph">🟢</span><span>{{ t('legend.upToDate') }}</span></div>
            <div class="legend-item"><span class="legend-glyph">🟠</span><span>{{ t('legend.unpushed') }}</span></div>
            <div class="legend-item"><span class="legend-glyph">🔵</span><span>{{ t('legend.toPull') }}</span></div>
            <div class="legend-item"><span class="legend-glyph">⚠️</span><span>{{ t('legend.missing') }}</span></div>
          </div>
        </aside>

        <main class="content">
          <div class="content-narrow">
            <message-banner v-if="banner" :message="banner" :lang="lang" @dismiss="dismiss" />

            <!-- WELCOME -->
            <div v-if="!selectedProject" class="welcome card" style="padding:36px">
              <div class="big">👋</div>
              <h1>{{ t('welcome.title') }}</h1>
              <p>{{ t('welcome.intro') }}</p>
              <ol class="steps">
                <li><span class="n">1</span><span>{{ t('welcome.step1') }}</span></li>
                <li><span class="n">2</span><span>{{ t('welcome.step2') }}</span></li>
                <li><span class="n">3</span><span>{{ t('welcome.step3') }}</span></li>
              </ol>
              <div class="actions-row" style="justify-content:center;margin-top:22px">
                <button class="btn btn-primary btn-lg" @click="openAddModal">{{ t('welcome.addButton') }}</button>
              </div>
            </div>

            <!-- PROJECT DETAIL -->
            <div v-else>
              <div class="tabs">
                <button class="tab" :class="{ active: activeTab === 'config' }" @click="activeTab = 'config'">
                  <span>{{ t('project.tab.config') }}</span>
                  <span v-if="!selectedProject.configValidated" class="tab-dot" :title="t('project.notValidated')">●</span>
                </button>
                <button class="tab" :class="{ active: activeTab === 'sync' }" @click="activeTab = 'sync'">{{ t('project.tab.sync') }}</button>
                <button class="tab" :class="{ active: activeTab === 'project' }" @click="activeTab = 'project'">{{ t('project.tab.project') }}</button>
              </div>

              <!-- GIT CONFIGURATION TAB (shown first until validated) -->
              <div v-show="activeTab === 'config'">
                <div class="warn-note" v-if="!selectedProject.configValidated" style="margin-bottom:18px">
                  {{ t('project.notValidated') }}
                </div>

                <div class="card">
                  <h3>{{ t('server.title') }}</h3>
                  <p class="sub">{{ t('server.sub') }}</p>
                  <div class="field">
                    <div class="input-row">
                      <input type="text" v-model="remoteInput" :placeholder="t('server.placeholder')" />
                      <button class="btn" :disabled="!!busy" @click="saveRemote">{{ t('server.save') }}</button>
                    </div>
                    <div class="help">{{ t('server.tip') }}</div>
                  </div>
                </div>

                <div class="card">
                  <h3>{{ t('auth.title') }}</h3>
                  <p class="sub">{{ t('auth.sub') }}</p>

                  <div class="radio-group">
                    <label class="radio-card" :class="{ active: authMode === 'none' }">
                      <input type="radio" value="none" v-model="authMode" />
                      <span>
                        <span class="rc-title">{{ t('auth.system.title') }}</span>
                        <span class="rc-desc">{{ t('auth.system.desc') }}</span>
                      </span>
                    </label>
                    <label class="radio-card" :class="{ active: authMode === 'ssh' }">
                      <input type="radio" value="ssh" v-model="authMode" />
                      <span>
                        <span class="rc-title">{{ t('auth.ssh.title') }}</span>
                        <span class="rc-desc">{{ t('auth.ssh.desc') }}</span>
                      </span>
                    </label>
                    <label class="radio-card" :class="{ active: authMode === 'token' }">
                      <input type="radio" value="token" v-model="authMode" />
                      <span>
                        <span class="rc-title">{{ t('auth.token.title') }}</span>
                        <span class="rc-desc">{{ t('auth.token.desc') }}</span>
                      </span>
                    </label>
                    <label class="radio-card" :class="{ active: authMode === 'password' }">
                      <input type="radio" value="password" v-model="authMode" />
                      <span>
                        <span class="rc-title">{{ t('auth.password.title') }}</span>
                        <span class="rc-desc">{{ t('auth.password.desc') }}</span>
                      </span>
                    </label>
                  </div>

                  <div v-if="authMode === 'ssh'" style="margin-top:16px">
                    <div class="field">
                      <label>{{ t('auth.sshKey.label') }}</label>
                      <div class="input-row">
                        <input type="text" v-model="sshKeyPath" :placeholder="t('auth.sshKey.placeholder')" />
                        <button class="btn" @click="pickKeyFile">{{ t('auth.sshKey.choose') }}</button>
                      </div>
                      <div class="help">{{ t('auth.sshKey.help') }}</div>
                    </div>
                  </div>

                  <div v-if="authMode === 'token' || authMode === 'password'" style="margin-top:16px">
                    <div class="grid-2">
                      <div class="field">
                        <label>{{ t('auth.username.label') }}</label>
                        <input type="text" v-model="authUsername" :placeholder="t('auth.username.placeholder')" />
                      </div>
                      <div class="field">
                        <label>{{ authMode === 'token' ? t('auth.token.label') : t('auth.password.label') }}</label>
                        <input type="password" v-model="authSecret" @input="secretDirty = true"
                               :placeholder="selectedProject.hasSecret ? '•••••• saved' : (authMode === 'token' ? t('auth.token.placeholder') : t('auth.password.placeholder'))" />
                      </div>
                    </div>
                    <div class="help">{{ t('auth.secret.revealNote') }}</div>
                    <div class="inline-note" v-if="selectedProject.hasSecret">
                      {{ t('auth.secret.savedNote') }}
                      <button class="btn btn-sm btn-danger" style="margin-left:8px" @click="clearSecret">{{ t('auth.secret.remove') }}</button>
                    </div>
                  </div>

                  <div class="warn-note" v-if="encryptionWarning">{{ t('auth.encryptionWarning') }}</div>

                  <div class="divider"></div>
                  <div class="actions-row">
                    <button class="btn" :disabled="!!busy" @click="saveAuth">{{ t('auth.save') }}</button>
                  </div>
                </div>

                <div class="card verify-card">
                  <h3>{{ t('project.verify.title') }}</h3>
                  <p class="sub">{{ t('project.verify.sub') }}</p>
                  <button class="btn btn-primary btn-lg" :disabled="!!busy" @click="verifyAuthentication">
                    <span class="spinner" v-if="busy === 'test'"></span>
                    <span v-else>{{ t('project.verify.button') }}</span>
                  </button>
                </div>
              </div>

              <!-- SYNC TAB -->
              <div v-show="activeTab === 'sync'">
                <message-banner v-if="statusMessage" :message="statusMessage" :lang="lang" :dismissible="false" />

                <div class="sync-row">
                  <button class="sync-btn" :class="{ blocked: pullBlocked }" :disabled="!!busy || pullBlocked" @click="doPull">
                    <span class="glyph">{{ pullBlocked ? '🚫' : '⬇️' }}</span>
                    <span>
                      <span class="label">{{ t('project.pull') }}</span>
                      <span class="desc">{{ pullBlocked ? t('project.pullBlocked.short') : t('project.pullDesc') }}</span>
                    </span>
                    <span class="spinner dark" v-if="busy === 'pull'" style="margin-left:auto"></span>
                  </button>
                  <button class="sync-btn push" :disabled="!!busy" @click="openPush">
                    <span class="glyph">⬆️</span>
                    <span>
                      <span class="label">{{ t('project.push') }}</span>
                      <span class="desc">{{ t('project.pushDesc') }}</span>
                    </span>
                    <span class="spinner dark" v-if="busy === 'push'" style="margin-left:auto"></span>
                  </button>
                </div>

                <div class="warn-note" v-if="pullBlocked" style="margin-top:-6px;margin-bottom:18px">
                  {{ t('project.pullBlocked.detail') }}
                </div>

                <div class="card">
                  <div style="display:flex;align-items:center;justify-content:space-between">
                    <div>
                      <h3>{{ t('files.title') }}</h3>
                      <p class="sub">{{ t('files.sub') }}</p>
                    </div>
                    <button class="btn btn-sm" :disabled="!!busy" @click="refreshStatus">↻ {{ t('common.refresh') }}</button>
                  </div>

                  <ul class="change-list" v-if="changes.length">
                    <li class="change-item" v-for="c in changes" :key="c.path">
                      <span class="tag" :class="c.kind">{{ kindLabel(c.kind) }}</span>
                      <span class="path">{{ c.path }}</span>
                    </li>
                  </ul>
                  <p v-else style="color:var(--ink-soft);font-size:14px;margin:6px 0 0">
                    {{ t('files.none') }}{{ busy === 'status' ? ' ' + t('files.checking') : '' }}
                  </p>

                  <div class="branch-info" v-if="status">
                    <span>{{ t('files.branch') }} <b>{{ status.branch || '—' }}</b></span>
                    <span v-if="status.upstream">{{ t('files.serverBranch') }} <b>{{ status.upstream }}</b></span>
                    <span v-else>{{ t('files.notConnected') }}</span>
                    <span v-if="behind">{{ t('files.newerOnServer') }} <b>{{ behind }}</b></span>
                    <span v-if="ahead">{{ t('files.waitingUpload') }} <b>{{ ahead }}</b></span>
                  </div>
                </div>
              </div>

              <!-- PROJECT TAB -->
              <div v-show="activeTab === 'project'">
                <div class="card">
                  <h3>{{ t('thisproject.title') }}</h3>
                  <div class="kv"><span class="k">{{ t('thisproject.folder') }}</span><span class="readonly-value" style="max-width:60%">{{ selectedProject.path }}</span></div>
                  <div class="actions-row" style="margin-top:12px">
                    <button class="btn" @click="reveal">📂 {{ t('thisproject.open') }}</button>
                    <button class="btn" :disabled="!!busy" @click="doFetch">🔄 {{ t('thisproject.check') }}</button>
                    <button class="btn btn-danger" @click="deleteConfirm = true">{{ t('thisproject.remove') }}</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <!-- ADD PROJECT MODAL -->
      <div class="overlay" v-if="addModal" @click.self="closeAddModal">
        <div class="modal">
          <div class="modal-head">
            <h3>{{ t('add.title') }}</h3>
            <p class="sub">{{ t('add.sub') }}</p>
          </div>
          <div class="modal-body">
            <div class="field">
              <label>{{ t('add.folder') }}</label>
              <div class="input-row">
                <input type="text" v-model="newProject.path" :placeholder="t('add.noFolderChosen')" readonly />
                <button class="btn" @click="pickFolder">{{ t('add.choose') }}</button>
              </div>
            </div>
            <div class="info-note" v-if="addRepoInfo && addRepoInfo.isRepo">
              <span class="info-note-icon">✅</span>
              <span>
                <b>{{ t('add.alreadyGit.title') }}</b>
                {{ addRepoInfo.remoteUrl ? t('add.alreadyGit.withRemote') : t('add.alreadyGit.noRemote') }}
              </span>
            </div>
            <div class="field">
              <label>{{ t('add.name') }}</label>
              <input type="text" v-model="newProject.name" :placeholder="t('add.namePlaceholder')" />
            </div>
            <div class="field">
              <label>{{ t('add.remote') }}</label>
              <input type="text" v-model="newProject.remoteUrl" :placeholder="t('add.remotePlaceholder')" />
              <div class="help">{{ t('add.remoteHelp') }}</div>
            </div>
            <p class="warn-note" v-if="addError">{{ addError }}</p>
          </div>
          <div class="modal-foot">
            <button class="btn" @click="closeAddModal">{{ t('common.cancel') }}</button>
            <button class="btn btn-primary" :disabled="busy === 'create'" @click="createProject">
              <span class="spinner" v-if="busy === 'create'"></span>
              <span v-else>{{ t('add.submit') }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- PUSH MODAL -->
      <div class="overlay" v-if="pushModal" @click.self="closePush">
        <div class="modal">
          <div class="modal-head">
            <h3>{{ t('push.title') }}</h3>
            <p class="sub">{{ t('push.sub') }}</p>
          </div>
          <div class="modal-body">
            <textarea v-model="pushMessage" :placeholder="t('push.placeholder')"></textarea>
            <div class="help">{{ t('push.help', { count: changes.length }) }}</div>
          </div>
          <div class="modal-foot">
            <button class="btn" @click="closePush">{{ t('common.cancel') }}</button>
            <button class="btn btn-primary" :disabled="busy === 'push'" @click="confirmPush">
              <span class="spinner" v-if="busy === 'push'"></span>
              <span v-else>{{ t('push.submit') }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- DELETE CONFIRM -->
      <div class="overlay" v-if="deleteConfirm" @click.self="deleteConfirm = false">
        <div class="modal" style="max-width:440px">
          <div class="modal-head">
            <h3>{{ t('delete.title') }}</h3>
            <p class="sub">{{ t('delete.sub') }}</p>
          </div>
          <div class="modal-foot">
            <button class="btn" @click="deleteConfirm = false">{{ t('common.cancel') }}</button>
            <button class="btn btn-danger" @click="removeSelected">{{ t('delete.confirm') }}</button>
          </div>
        </div>
      </div>

      <!-- SETTINGS -->
      <div class="overlay" v-if="settingsModal" @click.self="closeSettings">
        <div class="modal">
          <div class="modal-head">
            <h3>{{ t('settings.title') }}</h3>
            <p class="sub">{{ t('settings.subtitle') }}</p>
          </div>
          <div class="modal-body">
            <div class="field">
              <label>{{ t('settings.language.label') }}</label>
              <div class="radio-group">
                <label class="radio-card" :class="{ active: lang === 'en' }">
                  <input type="radio" value="en" :checked="lang === 'en'" @change="changeLanguage('en')" />
                  <span><span class="rc-title">English</span></span>
                </label>
                <label class="radio-card" :class="{ active: lang === 'fr' }">
                  <input type="radio" value="fr" :checked="lang === 'fr'" @change="changeLanguage('fr')" />
                  <span><span class="rc-title">Français</span></span>
                </label>
              </div>
              <div class="help">{{ t('settings.language.help') }}</div>
            </div>

            <div class="divider"></div>
            <div class="field">
              <label class="check-row">
                <input type="checkbox" :checked="blockPull" @change="setBlockPull($event.target.checked)" />
                <span>
                  <b>{{ t('settings.blockPull.label') }}</b>
                  <span class="help" style="display:block;margin-top:2px">{{ t('settings.blockPull.help') }}</span>
                </span>
              </label>
            </div>

            <div class="divider"></div>
            <div class="field">
              <label>{{ t('identity.title') }}</label>
              <p class="sub" style="margin:0 0 10px">{{ t('identity.sub') }}</p>
              <div class="grid-2">
                <div class="field">
                  <label>{{ t('identity.name') }}</label>
                  <input type="text" v-model="identityFormName" :placeholder="t('identity.namePlaceholder')" />
                </div>
                <div class="field">
                  <label>{{ t('identity.email') }}</label>
                  <input type="text" v-model="identityFormEmail" :placeholder="t('identity.emailPlaceholder')" />
                </div>
              </div>
              <p class="warn-note" v-if="identityError">{{ identityError }}</p>
              <div class="actions-row" style="margin-top:6px">
                <button class="btn btn-primary" :disabled="identitySaving" @click="saveIdentity({ name: identityFormName, email: identityFormEmail })">
                  <span class="spinner" v-if="identitySaving"></span>
                  <span v-else>{{ t('identity.save') }}</span>
                </button>
              </div>
            </div>

            <div class="divider"></div>
            <h3 style="font-size:14px;margin:0 0 8px">{{ t('settings.about.title') }}</h3>
            <div class="kv"><span class="k">{{ t('settings.about.app') }}</span><span><b>{{ info && info.appVersion }}</b></span></div>
            <div class="kv"><span class="k">{{ t('settings.about.git') }}</span><span><b>{{ git && git.version }}</b></span></div>
            <div class="kv"><span class="k">{{ t('settings.about.platform') }}</span><span><b>{{ platformLabel() }}</b></span></div>
          </div>
          <div class="modal-foot">
            <button class="btn btn-primary" @click="closeSettings">{{ t('settings.close') }}</button>
          </div>
        </div>
      </div>
    </div>
  `,
});

app.config.globalProperties.openSite = openSite;
app.mount('#app');
