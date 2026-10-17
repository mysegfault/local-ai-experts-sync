'use strict';

/*
 * End-to-end functional test of the git layer against a local bare repo.
 *   xvfb-run -a npx electron scripts/e2e.js
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');
const { app } = require('electron');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'laes-e2e-'));
app.setPath('userData', path.join(tmp, 'userData'));
app.disableHardwareAcceleration();

// Hermetic identity: point git's global config at a temp file so commits work
// regardless of the machine's real ~/.gitconfig.
const globalGitConfig = path.join(tmp, 'gitconfig');
fs.writeFileSync(globalGitConfig, '[user]\n\tname = E2E Tester\n\temail = e2e@example.com\n');
process.env.GIT_CONFIG_GLOBAL = globalGitConfig;

const git = require('../src/main/git');
const config = require('../src/main/config');
const messages = require('../src/main/messages');

const results = [];
function check(name, cond, extra) {
  results.push({ name, ok: !!cond, extra: extra || '' });
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + name + (extra ? '  [' + extra + ']' : ''));
}

function rawGit(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

async function main() {
  console.log('temp: ' + tmp);

  const det = await git.detect();
  check('git detected', det.installed, det.version);

  const remote = path.join(tmp, 'remote.git');
  execFileSync('git', ['init', '--bare', remote]);

  // ---- project A ----
  const workA = path.join(tmp, 'workA');
  fs.mkdirSync(workA);
  await git.init(workA);
  const projectA = config.addProject({
    name: 'Test A',
    path: workA,
    remoteUrl: remote,
    identity: { name: 'Tester', email: 'tester@example.com' },
  });
  await git.setRemote(workA, remote);

  fs.writeFileSync(path.join(workA, 'hello.txt'), 'hello world\n');
  let st = await git.status(workA);
  check('status sees new file', st.ok && st.data.changes.length === 1 && st.data.changes[0].kind === 'new', JSON.stringify(st.data && st.data.changes));

  await git.addAll(workA);
  const commitA = await git.commit(workA, 'first commit', projectA.identity);
  check('commit succeeds', commitA.ok, (commitA.stderr || '').split('\n')[0]);

  let push = await git.push(workA, { mode: 'none' });
  if (!push.ok && /no upstream|set-upstream|push destination/i.test(push.stderr + push.stdout)) {
    push = await git.pushSetUpstream(workA, { mode: 'none' });
  }
  check('push to bare remote succeeds', push.ok, (push.stderr || '').split('\n')[0]);

  const remoteLog = rawGit(['--git-dir', remote, 'log', '--oneline']);
  check('remote has the commit', remoteLog.length > 0, remoteLog.split('\n')[0]);

  // status should now be clean and upstream set
  st = await git.status(workA);
  check('status clean with upstream', st.ok && st.data.changes.length === 0 && !!st.data.upstream, 'branch=' + (st.data && st.data.branch) + ' upstream=' + (st.data && st.data.upstream));

  // ---- project B (clone from remote) ----
  const workB = path.join(tmp, 'workB');
  execFileSync('git', ['clone', remote, workB]);
  const projectB = config.addProject({
    name: 'Test B',
    path: workB,
    remoteUrl: remote,
    identity: { name: 'Tester', email: 'tester@example.com' },
  });

  fs.writeFileSync(path.join(workB, 'second.txt'), 'from B\n');
  await git.addAll(workB);
  await git.commit(workB, 'second commit from B', projectB.identity);
  let pushB = await git.push(workB, { mode: 'none' });
  check('push from B succeeds', pushB.ok, (pushB.stderr || '').split('\n')[0]);

  // ---- project A pulls the change ----
  const fetchA = await git.fetch(workA, { mode: 'none' });
  check('fetch from A succeeds', fetchA.ok, (fetchA.stderr || '').split('\n')[0]);

  st = await git.status(workA);
  check('A sees it is behind', st.ok && st.data.behind === 1, 'behind=' + (st.data && st.data.behind));

  const pullA = await git.pull(workA, { mode: 'none' });
  check('pull into A succeeds', pullA.ok, (pullA.stderr || '').trim().split('\n')[0]);
  check('A now has B\'s file', fs.existsSync(path.join(workA, 'second.txt')));

  // ---- ls-remote ----
  const ls = await git.lsRemote(remote, { mode: 'none' });
  check('ls-remote works', ls.ok && ls.stdout.length > 0);

  // ---- divergent push should be rejected in a friendly way ----
  fs.writeFileSync(path.join(workB, 'third.txt'), 'x\n');
  await git.addAll(workB);
  await git.commit(workB, 'third from B', projectB.identity);
  // make A diverge
  fs.writeFileSync(path.join(workA, 'a-only.txt'), 'y\n');
  await git.addAll(workA);
  await git.commit(workA, 'a-only commit', projectA.identity);
  await git.push(workB, { mode: 'none' });
  const pushA = await git.push(workA, { mode: 'none' });
  check('divergent push rejected', !pushA.ok, (pushA.stderr || '').split('\n')[0]);
  const mapped = messages.friendlyError(pushA, 'x');
  check('divergent push gives friendly guidance', /server has changes/i.test(mapped.title), mapped.title);

  // ---- fresh repo with no commits ----
  const workC = path.join(tmp, 'workC');
  fs.mkdirSync(workC);
  await git.init(workC);
  const stC = await git.status(workC);
  check('fresh repo reports initial state', stC.ok && stC.data.initial === true, 'initial=' + stC.data.initial);
  const pullC = await git.pull(workC, { mode: 'none' });
  check('pull with no upstream fails', !pullC.ok);
  const mappedC = messages.friendlyError(pullC, 'x');
  check('no-upstream pull gives friendly guidance', /not connected|not have|server/i.test(mappedC.detail), mappedC.title);

  const failed = results.filter((r) => !r.ok);
  console.log('\n' + (failed.length ? 'FAILED ' + failed.length + ' / ' + results.length : 'ALL ' + results.length + ' CHECKS PASSED'));
  app.exit(failed.length ? 1 : 0);
}

app.whenReady().then(() => {
  main().catch((err) => {
    console.error('E2E ERROR: ' + (err && err.stack ? err.stack : err));
    app.exit(2);
  });
});
