'use strict';

const { spawn } = require('child_process');

/*
 * Opens a native terminal window in the given directory, cross-platform.
 * Returns true if a terminal could be launched, false otherwise.
 */

function trySpawn(command, args, options) {
  return new Promise((resolve) => {
    let settled = false;
    let child;
    try {
      child = spawn(command, args, Object.assign({ detached: true, stdio: 'ignore' }, options));
    } catch (_) {
      resolve(false);
      return;
    }
    child.on('error', () => {
      if (!settled) {
        settled = true;
        resolve(false);
      }
    });
    // If it did not fail immediately (ENOENT), consider it launched.
    setTimeout(() => {
      if (!settled) {
        settled = true;
        try {
          child.unref();
        } catch (_) {
          /* ignore */
        }
        resolve(true);
      }
    }, 300);
  });
}

async function openTerminal(dir) {
  if (process.platform === 'win32') {
    return trySpawn('cmd.exe', ['/K', `cd /d "${dir}"`], { cwd: dir });
  }
  if (process.platform === 'darwin') {
    return trySpawn('open', ['-a', 'Terminal', dir]);
  }

  const candidates = [
    ['gnome-terminal', ['--working-directory', dir]],
    ['konsole', ['--workdir', dir]],
    ['xfce4-terminal', ['--working-directory', dir]],
    ['mate-terminal', ['--working-directory', dir]],
    ['tilix', ['--working-directory', dir]],
    ['kitty', ['--directory', dir]],
    ['alacritty', ['--working-directory', dir]],
    ['x-terminal-emulator', ['--working-directory', dir]],
    ['xterm', []],
  ];

  for (const [command, args] of candidates) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await trySpawn(command, args, { cwd: dir });
    if (ok) return true;
  }
  return false;
}

module.exports = { openTerminal };
