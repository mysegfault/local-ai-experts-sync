'use strict';

const { Menu } = require('electron');

/*
 * The app has no use for the default "File / Edit / View…" menu on
 * Windows/Linux, so we remove it entirely. macOS keeps a minimal menu because
 * standard shortcuts (Quit, Copy, Paste, Minimise…) depend on it.
 */
function applyMenu() {
  if (process.platform === 'darwin') {
    const template = [
      { role: 'appMenu' },
      { role: 'editMenu' },
      { role: 'windowMenu' },
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  } else {
    Menu.setApplicationMenu(null);
  }
}

module.exports = { applyMenu };
