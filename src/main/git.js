'use strict';

const path = require('path');
const { spawn } = require('child_process');

function helperPath() {
  // Inside a packaged app the source lives in app.asar, which plain Node
  // (ELECTRON_RUN_AS_NODE) cannot read, so we ship the helper as an
  // extraResource and use that copy instead.
  try {
    const { app } = require('electron');
    if (app && app.isPackaged) {
      return path.join(process.resourcesPath, 'askpass-helper.js');
    }
  } catch (_) {
    /* not running under Electron */
  }
  return path.join(__dirname, 'askpass-helper.js');
}

function run(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd || process.cwd(),
      env: options.env || process.env,
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const timeoutMs = options.timeoutMs || 120000;
    const timer = setTimeout(() => {
      if (!settled) {
        try {
          child.kill();
        } catch (_) {
          /* ignore */
        }
      }
    }, timeoutMs);

    child.stdout.on('data', (d) => {
      stdout += d.toString();
    });
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    child.on('error', (err) => {
      settled = true;
      clearTimeout(timer);
      resolve({ code: -1, stdout, stderr: stderr + (err.message || ''), ok: false });
    });
    child.on('close', (code) => {
      settled = true;
      clearTimeout(timer);
      resolve({ code, stdout, stderr, ok: code === 0 });
    });
  });
}

function gitEnv(creds) {
  const env = Object.assign({}, process.env);
  env.GIT_TERMINAL_PROMPT = '0';
  delete env.GIT_ASKPASS;
  delete env.SSH_ASKPASS;
  delete env.GIT_CONFIG_PARAMETERS;

  if (creds && (creds.mode === 'token' || creds.mode === 'password')) {
    env.ELECTRON_RUN_AS_NODE = '1';
    env.LAES_GIT_USER = creds.username || '';
    env.LAES_GIT_SECRET = creds.secret || '';
  }

  if (creds && creds.mode === 'ssh' && creds.sshKeyPath) {
    const key = String(creds.sshKeyPath).replace(/"/g, '\\"');
    env.GIT_SSH_COMMAND =
      `ssh -i "${key}" -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new`;
  }

  return env;
}

function credentialConfigArgs(creds) {
  if (!creds || (creds.mode !== 'token' && creds.mode !== 'password')) return [];
  const exec = process.execPath.replace(/\\/g, '/');
  const helper = helperPath().replace(/\\/g, '/');
  const command = `!"${exec}" "${helper}"`;
  return ['-c', 'credential.helper=', '-c', `credential.helper=${command}`];
}

async function git(args, opts = {}) {
  const fullArgs = credentialConfigArgs(opts.creds).concat(args);
  return run('git', fullArgs, {
    cwd: opts.cwd,
    env: gitEnv(opts.creds),
    timeoutMs: opts.timeoutMs,
  });
}

async function detect() {
  const res = await run('git', ['--version'], { timeoutMs: 15000 });
  if (!res.ok) {
    return { installed: false, version: '', error: (res.stderr || res.stdout || '').trim() };
  }
  const version = (res.stdout || '').trim().replace(/^git version\s*/i, '');
  return { installed: true, version, error: '' };
}

async function isRepo(dir) {
  const res = await git(['rev-parse', '--is-inside-work-tree'], { cwd: dir, timeoutMs: 15000 });
  return res.ok && res.stdout.trim() === 'true';
}

async function init(dir) {
  return git(['init'], { cwd: dir, timeoutMs: 30000 });
}

async function getRemote(dir) {
  const res = await git(['remote', 'get-url', 'origin'], { cwd: dir, timeoutMs: 15000 });
  if (!res.ok) return '';
  return res.stdout.trim();
}

async function setRemote(dir, url) {
  const existing = await getRemote(dir);
  if (existing) {
    return git(['remote', 'set-url', 'origin', url], { cwd: dir, timeoutMs: 15000 });
  }
  return git(['remote', 'add', 'origin', url], { cwd: dir, timeoutMs: 15000 });
}

async function getIdentity(dir) {
  const name = await git(['config', '--get', 'user.name'], { cwd: dir, timeoutMs: 15000 });
  const email = await git(['config', '--get', 'user.email'], { cwd: dir, timeoutMs: 15000 });
  const localName = await git(['config', '--local', '--get', 'user.name'], { cwd: dir, timeoutMs: 15000 });
  const localEmail = await git(['config', '--local', '--get', 'user.email'], { cwd: dir, timeoutMs: 15000 });
  return {
    name: name.stdout.trim(),
    email: email.stdout.trim(),
    localName: localName.stdout.trim(),
    localEmail: localEmail.stdout.trim(),
  };
}

async function setIdentity(dir, identity) {
  if (identity.name !== undefined) {
    await git(['config', '--local', 'user.name', identity.name], { cwd: dir, timeoutMs: 15000 });
  }
  if (identity.email !== undefined) {
    await git(['config', '--local', 'user.email', identity.email], { cwd: dir, timeoutMs: 15000 });
  }
  return { ok: true };
}

// App-level identity, stored in the machine's global git configuration and
// read on every startup.
async function getGlobalIdentity() {
  const name = await git(['config', '--global', '--get', 'user.name'], { timeoutMs: 15000 });
  const email = await git(['config', '--global', '--get', 'user.email'], { timeoutMs: 15000 });
  return { name: name.stdout.trim(), email: email.stdout.trim() };
}

async function setGlobalIdentity(identity) {
  if (identity.name !== undefined) {
    await git(['config', '--global', 'user.name', identity.name], { timeoutMs: 15000 });
  }
  if (identity.email !== undefined) {
    await git(['config', '--global', 'user.email', identity.email], { timeoutMs: 15000 });
  }
  return { ok: true };
}

function parseStatus(text) {
  const result = {
    branch: '',
    upstream: '',
    ahead: 0,
    behind: 0,
    detached: false,
    initial: false,
    changes: [],
  };

  for (const line of text.split('\n')) {
    if (!line) continue;
    if (line.startsWith('# branch.head ')) {
      const value = line.slice('# branch.head '.length).trim();
      result.detached = value === '(detached)';
      result.branch = value;
    } else if (line.startsWith('# branch.oid ')) {
      const value = line.slice('# branch.oid '.length).trim();
      result.initial = value === '(initial)';
    } else if (line.startsWith('# branch.upstream ')) {
      result.upstream = line.slice('# branch.upstream '.length).trim();
    } else if (line.startsWith('# branch.ab ')) {
      const m = line.match(/\+(\d+)\s+-(\d+)/);
      if (m) {
        result.ahead = parseInt(m[1], 10);
        result.behind = parseInt(m[2], 10);
      }
    } else if (line.startsWith('? ')) {
      result.changes.push({ path: line.slice(2), untracked: true, index: '.', worktree: '?', kind: 'new' });
    } else if (line.startsWith('! ')) {
      continue;
    } else if (line.startsWith('1 ') || line.startsWith('2 ') || line.startsWith('u ')) {
      const parts = line.split(' ');
      // porcelain v2: <xy> <sub> <mH> <mI> <mW> <hH> <hI> <path>
      const xy = parts[1] || '..';
      const filePath = parts.slice(parts.length - 1).join(' ');
      const index = xy[0];
      const worktree = xy[1];
      result.changes.push({
        path: filePath,
        untracked: false,
        index,
        worktree,
        kind: classify(index, worktree),
      });
    }
  }

  return result;
}

function classify(index, worktree) {
  const x = index;
  const y = worktree;
  if (x === '?' || y === '?') return 'new';
  if (x === 'U' || y === 'U' || (x === 'A' && y === 'A') || (x === 'D' && y === 'D')) return 'conflict';
  if (x === 'R' || y === 'R') return 'renamed';
  if (x === 'D' || y === 'D') return 'deleted';
  if (x === 'A') return 'added';
  if (x === 'M' || y === 'M') return 'modified';
  return 'changed';
}

async function status(dir) {
  const res = await git(['status', '--porcelain=v2', '--branch'], { cwd: dir, timeoutMs: 30000 });
  if (!res.ok) {
    return { ok: false, error: (res.stderr || res.stdout || '').trim(), data: null };
  }
  return { ok: true, error: '', data: parseStatus(res.stdout) };
}

function summarizeChanges(changes) {
  // Aggregate by kind for a friendly count.
  const counts = { new: 0, modified: 0, deleted: 0, renamed: 0, added: 0, conflict: 0, changed: 0 };
  for (const c of changes) {
    if (counts[c.kind] === undefined) counts[c.kind] = 0;
    counts[c.kind] += 1;
  }
  return counts;
}

async function addAll(dir) {
  return git(['add', '-A'], { cwd: dir, timeoutMs: 60000 });
}

async function commit(dir, message, identity) {
  const args = [];
  if (identity && identity.name) args.push('-c', `user.name=${identity.name}`);
  if (identity && identity.email) args.push('-c', `user.email=${identity.email}`);
  args.push('commit', '-m', message);
  return git(args, { cwd: dir, timeoutMs: 60000 });
}

async function fetch(dir, creds) {
  return git(['fetch', '--prune'], { cwd: dir, creds, timeoutMs: 180000 });
}

async function pull(dir, creds) {
  return git(['pull', '--ff-only'], { cwd: dir, creds, timeoutMs: 300000 });
}

async function push(dir, creds) {
  return git(['push'], { cwd: dir, creds, timeoutMs: 300000 });
}

async function pushSetUpstream(dir, creds) {
  return git(['push', '--set-upstream', 'origin', 'HEAD'], { cwd: dir, creds, timeoutMs: 300000 });
}

async function lsRemote(url, creds) {
  return git(['ls-remote', url], { cwd: require('os').tmpdir(), creds, timeoutMs: 60000 });
}

module.exports = {
  detect,
  isRepo,
  init,
  getRemote,
  setRemote,
  getIdentity,
  setIdentity,
  getGlobalIdentity,
  setGlobalIdentity,
  status,
  summarizeChanges,
  addAll,
  commit,
  fetch,
  pull,
  push,
  pushSetUpstream,
  lsRemote,
};
