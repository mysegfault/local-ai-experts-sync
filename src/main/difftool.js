'use strict';

const { spawn, spawnSync } = require('child_process');

/*
 * Optional bridge to a graphical comparison tool already installed on the
 * machine (Meld by default, with kdiff3 as a fallback). The integrated diff
 * viewer in the app always works without any external dependency; this module
 * is only used for the secondary "Open in Meld" action.
 */

const TOOLS = ['meld', 'kdiff3'];
let cached = null;

function commandExists(command) {
  const finder = process.platform === 'win32' ? 'where' : 'which';
  try {
    const res = spawnSync(finder, [command], { stdio: 'ignore' });
    return !!(res && res.status === 0);
  } catch (_) {
    return false;
  }
}

function detect() {
  if (cached) return cached;
  for (const tool of TOOLS) {
    if (commandExists(tool)) {
      cached = { available: true, tool };
      return cached;
    }
  }
  cached = { available: false, tool: '' };
  return cached;
}

function spawnDetached(command, args, cwd) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(command, args, { cwd, detached: true, stdio: 'ignore' });
    } catch (_) {
      resolve(false);
      return;
    }

    let settled = false;
    child.on('error', () => {
      if (!settled) {
        settled = true;
        resolve(false);
      }
    });

    // No immediate ENOENT: consider the tool launched and stop waiting.
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

async function openDiff(dir, filePath) {
  const info = detect();
  if (!info.available) return { ok: false, available: false, tool: '' };

  const args = ['difftool', '--no-prompt', '--tool=' + info.tool];
  if (filePath) args.push('--', filePath);
  else args.push('--dir-diff');

  const ok = await spawnDetached('git', args, dir);
  return { ok, available: true, tool: info.tool };
}

module.exports = { detect, openDiff };
