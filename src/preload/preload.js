'use strict';

const { contextBridge, ipcRenderer } = require('electron');

const invoke = (channel, payload) => ipcRenderer.invoke(channel, payload);

contextBridge.exposeInMainWorld('api', {
  app: {
    info: () => invoke('app:info'),
    detectGit: () => invoke('app:detect-git'),
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
    create: (payload) => invoke('projects:create', payload),
    update: (payload) => invoke('projects:update', payload),
    remove: (id) => invoke('projects:remove', id),
  },
  project: {
    reveal: (id) => invoke('project:reveal', id),
    init: (id) => invoke('project:init', id),
    inspect: (payload) => invoke('project:inspect', payload),
    status: (id) => invoke('project:status', id),
    testConnection: (payload) => invoke('project:test-connection', payload),
    fetch: (id) => invoke('project:fetch', id),
    pull: (id) => invoke('project:pull', id),
    push: (payload) => invoke('project:push', payload),
    commit: (payload) => invoke('project:commit', payload),
  },
});
