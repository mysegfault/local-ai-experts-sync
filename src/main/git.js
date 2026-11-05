'use strict';

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

/* ---------------------------------------------------------------------------
 * Activity log
 *
 * Every command launched by this module is recorded (command, arguments, working
 * directory, exit code, duration, stdout and stderr) so the interface can always
 * show what happened, even when Git succeeds silently or fails in a way that is
 * hard to translate. Secrets are never logged: we only keep the command line.
 * ------------------------------------------------------------------------- */

const MAX_ACTIVITY = 300;
let activity = [];
let activityCounter = 0;
let activityListener = null;

function redactArg(value) {
  // Hide credentials embedded in URLs (https://user:token@host/...).
  return String(value).replace(/([a-z][a-z0-9+.-]*:\/\/)([^/@\s]+)@/gi, '$1***@');
}

function recordActivity(entry) {
  const full = Object.assign({ id: ++activityCounter, timestamp: Date.now() }, entry);
  activity.push(full);
  if (activity.length > MAX_ACTIVITY) activity = activity.slice(-MAX_ACTIVITY);
  if (activityListener) {
    try {
      activityListener(full);
    } catch (_) {
      /* a broken listener must never break Git operations */
    }
  }
  return full;
}

function setActivityListener(listener) {
  activityListener = typeof listener === 'function' ? listener : null;
}

function getActivity() {
  return activity.slice();
}

function clearActivity() {
  activity = [];
}

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
  const startedAt = Date.now();
  const cwd = options.cwd || process.cwd();
  const safeArgs = (args || []).map(redactArg);

  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env: options.env || process.env,
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    let settled = false;
    let timedOut = false;

    const finish = (code, errorText) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const finalStderr = stderr + (errorText || '');
      const finalCode = timedOut ? -2 : code;
      const result = { code: finalCode, stdout, stderr: finalStderr, ok: !timedOut && code === 0 };
      if (timedOut) {
        result.stderr = finalStderr + (finalStderr && !finalStderr.endsWith('\n') ? '\n' : '') +
          'Command timed out after ' + timeoutMs + ' ms';
      }
      recordActivity({
        command,
        args: safeArgs,
        cwd,
        label: options.label || '',
        code: result.code,
        ok: result.ok,
        durationMs: Date.now() - startedAt,
        timedOut,
        stdout: result.stdout,
        stderr: result.stderr,
      });
      resolve(result);
    };

    const timeoutMs = options.timeoutMs || 120000;
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill();
      } catch (_) {
        /* ignore */
      }
    }, timeoutMs);

    child.stdout.on('data', (d) => {
      stdout += d.toString();
    });
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    child.on('error', (err) => {
      finish(-1, err.message || String(err));
    });
    child.on('close', (code) => {
      finish(code);
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
    label: opts.label,
  });
}

async function detect() {
  const res = await run('git', ['--version'], { timeoutMs: 15000, label: 'detect' });
  if (!res.ok) {
    return { installed: false, version: '', error: (res.stderr || res.stdout || '').trim() };
  }
  const version = (res.stdout || '').trim().replace(/^git version\s*/i, '');
  return { installed: true, version, error: '' };
}

async function isRepo(dir) {
  const res = await git(['rev-parse', '--is-inside-work-tree'], { cwd: dir, timeoutMs: 15000, label: 'inspect' });
  return res.ok && res.stdout.trim() === 'true';
}

async function init(dir) {
  return git(['init'], { cwd: dir, timeoutMs: 30000, label: 'init' });
}

async function getRemote(dir) {
  const res = await git(['remote', 'get-url', 'origin'], { cwd: dir, timeoutMs: 15000, label: 'remote' });
  if (!res.ok) return '';
  return res.stdout.trim();
}

async function setRemote(dir, url) {
  const existing = await getRemote(dir);
  if (existing) {
    return git(['remote', 'set-url', 'origin', url], { cwd: dir, timeoutMs: 15000, label: 'setRemote' });
  }
  return git(['remote', 'add', 'origin', url], { cwd: dir, timeoutMs: 15000, label: 'setRemote' });
}

async function getIdentity(dir) {
  const name = await git(['config', '--get', 'user.name'], { cwd: dir, timeoutMs: 15000, label: 'identity' });
  const email = await git(['config', '--get', 'user.email'], { cwd: dir, timeoutMs: 15000, label: 'identity' });
  const localName = await git(['config', '--local', '--get', 'user.name'], { cwd: dir, timeoutMs: 15000, label: 'identity' });
  const localEmail = await git(['config', '--local', '--get', 'user.email'], { cwd: dir, timeoutMs: 15000, label: 'identity' });
  return {
    name: name.stdout.trim(),
    email: email.stdout.trim(),
    localName: localName.stdout.trim(),
    localEmail: localEmail.stdout.trim(),
  };
}

async function setIdentity(dir, identity) {
  if (identity.name !== undefined) {
    await git(['config', '--local', 'user.name', identity.name], { cwd: dir, timeoutMs: 15000, label: 'identity' });
  }
  if (identity.email !== undefined) {
    await git(['config', '--local', 'user.email', identity.email], { cwd: dir, timeoutMs: 15000, label: 'identity' });
  }
  return { ok: true };
}

// App-level identity, stored in the machine's global git configuration and
// read on every startup.
async function getGlobalIdentity() {
  const name = await git(['config', '--global', '--get', 'user.name'], { timeoutMs: 15000, label: 'identity' });
  const email = await git(['config', '--global', '--get', 'user.email'], { timeoutMs: 15000, label: 'identity' });
  return { name: name.stdout.trim(), email: email.stdout.trim() };
}

async function setGlobalIdentity(identity) {
  if (identity.name !== undefined) {
    await git(['config', '--global', 'user.name', identity.name], { timeoutMs: 15000, label: 'identity' });
  }
  if (identity.email !== undefined) {
    await git(['config', '--global', 'user.email', identity.email], { timeoutMs: 15000, label: 'identity' });
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
  const res = await git(['status', '--porcelain=v2', '--branch'], { cwd: dir, timeoutMs: 30000, label: 'status' });
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
  return git(['add', '-A'], { cwd: dir, timeoutMs: 60000, label: 'add' });
}

async function commit(dir, message, identity) {
  const args = [];
  if (identity && identity.name) args.push('-c', `user.name=${identity.name}`);
  if (identity && identity.email) args.push('-c', `user.email=${identity.email}`);
  args.push('commit', '-m', message);
  return git(args, { cwd: dir, timeoutMs: 60000, label: 'commit' });
}

async function fetch(dir, creds) {
  return git(['fetch', '--prune'], { cwd: dir, creds, timeoutMs: 180000, label: 'fetch' });
}

async function pull(dir, creds) {
  return git(['pull', '--ff-only'], { cwd: dir, creds, timeoutMs: 300000, label: 'pull' });
}

async function push(dir, creds) {
  return git(['push'], { cwd: dir, creds, timeoutMs: 300000, label: 'push' });
}

async function pushSetUpstream(dir, creds) {
  return git(['push', '--set-upstream', 'origin', 'HEAD'], { cwd: dir, creds, timeoutMs: 300000, label: 'push' });
}

async function lsRemote(url, creds) {
  return git(['ls-remote', url], { cwd: require('os').tmpdir(), creds, timeoutMs: 60000, label: 'lsRemote' });
}

async function listRemoteBranches(dir, creds) {
  const res = await git(['for-each-ref', '--format=%(refname:short)', 'refs/remotes/origin'], {
    cwd: dir,
    creds,
    timeoutMs: 30000,
    label: 'branches',
  });
  if (!res.ok) return [];
  return res.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((ref) => ref && ref !== 'origin' && ref !== 'origin/HEAD');
}

function stripOrigin(ref) {
  return String(ref || '').replace(/^origin\//, '');
}

async function defaultRemoteBranch(dir, creds) {
  // Prefer the remote's own HEAD when we already know it locally.
  const head = await git(['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'], {
    cwd: dir,
    creds,
    timeoutMs: 15000,
    label: 'branches',
  });
  if (head.ok && head.stdout.trim()) return stripOrigin(head.stdout.trim());

  const names = (await listRemoteBranches(dir, creds)).map(stripOrigin);
  for (const candidate of ['main', 'master', 'development', 'dev']) {
    if (names.indexOf(candidate) !== -1) return candidate;
  }
  return names[0] || '';
}

/*
 * Restore the actual project files when a folder only contains a `.git`
 * directory (or an empty repository with a configured remote). We fetch from
 * the server, then check out the matching remote branch into the working tree.
 */
async function restoreSources(dir, creds, preferredBranch) {
  const fetched = await git(['fetch', '--prune', 'origin'], {
    cwd: dir,
    creds,
    timeoutMs: 180000,
    label: 'fetch',
  });
  if (!fetched.ok) return fetched;

  const refs = await listRemoteBranches(dir, creds);
  if (!refs.length) {
    const message = 'No branch was found on the server (origin). Check the server address and your access rights.';
    recordActivity({
      command: 'git',
      args: ['for-each-ref', 'refs/remotes/origin'],
      cwd: dir,
      label: 'branches',
      code: 1,
      ok: false,
      durationMs: 0,
      timedOut: false,
      stdout: '',
      stderr: message,
    });
    return { ok: false, code: 1, stdout: '', stderr: message };
  }

  const current = await status(dir);
  const currentBranch = current.ok ? current.data.branch : '';

  let branch = '';
  if (preferredBranch && refs.indexOf('origin/' + preferredBranch) !== -1) {
    branch = preferredBranch;
  } else if (currentBranch && refs.indexOf('origin/' + currentBranch) !== -1) {
    branch = currentBranch;
  } else {
    branch = await defaultRemoteBranch(dir, creds);
  }
  if (!branch) branch = stripOrigin(refs[0]);

  const checkout = await git(['checkout', '-B', branch, 'origin/' + branch], {
    cwd: dir,
    timeoutMs: 180000,
    label: 'checkout',
  });
  if (!checkout.ok) return checkout;

  // Attach the local branch to its server counterpart so Pull/Push work next.
  await git(['branch', '--set-upstream-to', 'origin/' + branch, branch], {
    cwd: dir,
    timeoutMs: 15000,
    label: 'branches',
  });

  return { ok: true, code: 0, stdout: checkout.stdout, stderr: checkout.stderr, branch };
}

/* ---------------------------------------------------------------------------
 * Diffs
 *
 * Produces a unified diff for one changed file or for every local change. The
 * renderer turns it into a coloured side-by-side-ish view with line numbers.
 * Untracked files (and folders) are turned into "new file" diffs ourselves,
 * because `git diff` ignores them.
 * ------------------------------------------------------------------------- */

const MAX_DIFF_FILE_BYTES = 600 * 1024;
const MAX_DIFF_TOTAL_CHARS = 1200 * 1024;
const MAX_DIFF_FILES = 300;

function safeJoin(dir, rel) {
  const root = path.resolve(dir);
  const target = path.resolve(root, rel);
  if (target !== root && !target.startsWith(root + path.sep)) return null;
  return target;
}

function splitLines(text) {
  const normalized = String(text).replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

function newFileDiff(rel, text) {
  const lines = splitLines(text);
  const body = [`diff --git a/${rel} b/${rel}`, 'new file mode 100644', '--- /dev/null', `+++ b/${rel}`];
  if (!lines.length) {
    body.push('@@ -0,0 +0,0 @@');
  } else {
    body.push(`@@ -0,0 +1,${lines.length} @@`);
    lines.forEach((line) => body.push('+' + line));
  }
  return body.join('\n') + '\n';
}

function collectFiles(root, limit) {
  const files = [];
  const walk = (dir) => {
    if (files.length >= limit) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (_) {
      return;
    }
    for (const entry of entries) {
      if (files.length >= limit) return;
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        files.push(full);
      }
    }
  };
  walk(root);
  return files;
}

function readUntrackedFile(dir, rel, fullPath) {
  let stat;
  try {
    stat = fs.statSync(fullPath);
  } catch (err) {
    return { path: rel, kind: 'new', diff: '', error: String((err && err.message) || err) };
  }
  if (stat.size > MAX_DIFF_FILE_BYTES) {
    return { path: rel, kind: 'new', diff: '', tooLarge: true };
  }
  let buffer;
  try {
    buffer = fs.readFileSync(fullPath);
  } catch (err) {
    return { path: rel, kind: 'new', diff: '', error: String((err && err.message) || err) };
  }
  if (buffer.includes(0)) {
    return { path: rel, kind: 'new', diff: '', binary: true };
  }
  return { path: rel, kind: 'new', diff: newFileDiff(rel, buffer.toString('utf8')) };
}

function untrackedDiff(dir, rel) {
  const fullPath = safeJoin(dir, rel);
  if (!fullPath) return { path: rel, kind: 'new', diff: '', error: 'Invalid path' };

  let stat;
  try {
    stat = fs.statSync(fullPath);
  } catch (err) {
    return { path: rel, kind: 'new', diff: '', error: String((err && err.message) || err) };
  }

  if (!stat.isDirectory()) return readUntrackedFile(dir, rel, fullPath);

  // Git lists a brand-new folder as a single untracked entry: expand it into
  // one "new file" diff per contained file.
  const files = collectFiles(fullPath, MAX_DIFF_FILES);
  const root = path.resolve(dir);
  let diff = '';
  let truncated = false;
  for (const file of files) {
    const childRel = path.relative(root, file).split(path.sep).join('/');
    const part = readUntrackedFile(dir, childRel, file);
    if (part.binary) {
      diff += `Binary file ${childRel} (not shown)\n`;
    } else if (part.tooLarge) {
      diff += `File ${childRel} is too large to display\n`;
    } else if (part.diff) {
      diff += part.diff;
    }
    if (diff.length > MAX_DIFF_FILE_BYTES) {
      truncated = true;
      break;
    }
  }
  return { path: rel, kind: 'new', diff, truncated };
}

async function hasHeadCommit(dir) {
  const res = await git(['rev-parse', '--verify', '--quiet', 'HEAD'], {
    cwd: dir,
    timeoutMs: 15000,
    label: 'status',
  });
  return res.ok;
}

async function trackedDiff(dir, change, headExists) {
  const rel = change.path;
  const args = ['-c', 'core.quotepath=false', 'diff', '--no-color', '--no-ext-diff', '--no-textconv'];
  if (headExists) args.push('HEAD');
  args.push('--', rel);
  const res = await git(args, { cwd: dir, timeoutMs: 60000, label: 'diff' });
  const diff = res.stdout || '';
  const file = {
    path: rel,
    kind: change.kind,
    untracked: false,
    diff,
    binary: /Binary files .* differ/.test(diff),
    tooLarge: false,
    truncated: false,
    error: '',
  };
  if (!res.ok && !diff) file.error = (res.stderr || res.stdout || '').trim();
  return file;
}

async function projectDiff(dir, requestedPath) {
  const st = await status(dir);
  if (!st.ok) return { ok: false, error: st.error };

  const changes = st.data.changes || [];
  const wanted = String(requestedPath || '').trim();
  const selected = wanted ? changes.filter((c) => c.path === wanted) : changes;
  if (!selected.length) return { ok: true, files: [] };

  const headExists = await hasHeadCommit(dir);
  const files = [];
  let total = 0;

  for (const change of selected) {
    if (files.length >= MAX_DIFF_FILES) break;
    // eslint-disable-next-line no-await-in-loop
    let file = change.untracked ? untrackedDiff(dir, change.path) : await trackedDiff(dir, change, headExists);
    if (file.path === undefined) file.path = change.path;
    if (file.kind === undefined) file.kind = change.kind;
    if (file.untracked === undefined) file.untracked = !!change.untracked;

    const remaining = MAX_DIFF_TOTAL_CHARS - total;
    if (file.diff && file.diff.length > remaining) {
      file.diff = file.diff.slice(0, Math.max(0, remaining)) + '\n… (diff truncated)\n';
      file.truncated = true;
    }
    total += (file.diff || '').length;
    files.push(file);
    if (total >= MAX_DIFF_TOTAL_CHARS) break;
  }

  return { ok: true, files };
}

module.exports = {
  setActivityListener,
  getActivity,
  clearActivity,
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
  listRemoteBranches,
  defaultRemoteBranch,
  restoreSources,
  projectDiff,
};
