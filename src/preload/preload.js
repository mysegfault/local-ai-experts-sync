'use strict';

const { contextBridge, ipcRenderer } = require('electron');

const invoke = (channel, payload) => ipcRenderer.invoke(channel, payload);

contextBridge.exposeInMainWorld('api', {
  app: {
    info: () => invoke('app:info'),
    detectGit: () => invoke('app:detect-git'),
    getGitDownload: () => invoke('app:git-download'),
    checkUpdate: () => invoke('app:check-update'),
    openExternal: (url) => invoke('app:open-external', url),
  },
  settings: {
    get: () => invoke('settings:get'),
    set: (patch) => invoke('settings:set', patch),
  },
  identity: {
    get: () => invoke('git:identity-get'),
    set: (payload) => invoke('git:identity-set', payload),
  },
  dialog: {
    pickFolder: () => invoke('dialog:pick-folder'),
    pickKeyFile: () => invoke('dialog:pick-key-file'),
  },
  projects: {
    list: () => invoke('projects:list'),
    statuses: () => invoke('projects:statuses'),
    create: (payload) => invoke('projects:create', payload),
    update: (payload) => invoke('projects:update', payload),
    remove: (id) => invoke('projects:remove', id),
  },
  project: {
    reveal: (id) => invoke('project:reveal', id),
    openTerminal: (id) => invoke('project:open-terminal', id),
    init: (id) => invoke('project:init', id),
    inspect: (payload) => invoke('project:inspect', payload),
    status: (id) => invoke('project:status', id),
    testConnection: (payload) => invoke('project:test-connection', payload),
    fetch: (id) => invoke('project:fetch', id),
    pull: (id) => invoke('project:pull', id),
    push: (payload) => invoke('project:push', payload),
    commit: (payload) => invoke('project:commit', payload),
    discardFile: (payload) => invoke('project:discard-file', payload),
    discardAll: (id) => invoke('project:discard-all', id),
    restoreSources: (id) => invoke('project:restore-sources', id),
    diff: (payload) => invoke('project:diff', payload),
    openDiffTool: (payload) => invoke('project:open-diff-tool', payload),
  },
  activity: {
    list: () => invoke('activity:list'),
    clear: () => invoke('activity:clear'),
    onEntry: (callback) => {
      ipcRenderer.on('activity:entry', (_event, entry) => callback(entry));
    },
  },
});
