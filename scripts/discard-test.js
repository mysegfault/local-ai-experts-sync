'use strict';

/*
 * Tests for the "discard changes" actions (one file / whole project). They run
 * against real throw-away repositories so they cover the same Git commands the
 * application uses, including a repository without any commit yet.
 *
 *   node scripts/discard-test.js
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');

const git = require('../src/main/git');

const results = [];
function check(name, cond, extra) {
  results.push(!!cond);
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + name + (extra ? '  [' + extra + ']' : ''));
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'laes-discard-'));
const identity = { name: 'Discard Test', email: 'discard@example.com' };

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function read(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (_) {
    return '';
  }
}

async function createRepo(name, files) {
  const dir = path.join(tmp, name);
  fs.mkdirSync(dir, { recursive: true });
  const init = await git.init(dir);
  for (const file of Object.keys(files)) write(path.join(dir, file), files[file]);
  const add = await git.addAll(dir);
  const commit = await git.commit(dir, 'initial', identity);
  return init.ok && add.ok && commit.ok ? dir : '';
}

(async () => {
  /* ---- one file at a time ---- */
  const dir = await createRepo('per-file', {
    'tracked.txt': 'one\n',
    'to-rename.txt': 'rename me\n',
    'café accentué.txt': 'saved\n',
    '.gitignore': 'ignored/\n',
  });
  check('test repository created', !!dir);
  if (!dir) throw new Error('could not create the test repository');

  const outside = path.join(tmp, 'outside.txt');
  write(outside, 'do not touch\n');
  check('path outside the project is refused', (await git.discardFile(dir, '../outside.txt')).reason === 'not-changed');
  check('file outside the project is untouched', read(outside) === 'do not touch\n');

  write(path.join(dir, 'tracked.txt'), 'one\nchanged\n');
  write(path.join(dir, 'new.txt'), 'new file\n');
  write(path.join(dir, 'ignored', 'keep.txt'), 'ignored\n');

  const discard = await git.discardFile(dir, 'tracked.txt');
  check('a tracked file goes back to its saved version', discard.ok && read(path.join(dir, 'tracked.txt')) === 'one\n', discard.stderr);
  check('the other local changes are left alone', fs.existsSync(path.join(dir, 'new.txt')));

  const discardNew = await git.discardFile(dir, 'new.txt');
  check('a new file is deleted', discardNew.ok && !fs.existsSync(path.join(dir, 'new.txt')), discardNew.stderr);
  check('ignored files are preserved', fs.existsSync(path.join(dir, 'ignored', 'keep.txt')));

  write(path.join(dir, 'newdir', 'sub', 'file.txt'), 'inside a new folder\n');
  const dirStatus = await git.status(dir);
  const newDir = dirStatus.data.changes.find((c) => c.path === 'newdir/');
  const discardDir = newDir ? await git.discardFile(dir, newDir.path) : { ok: false, stderr: 'folder not reported' };
  check('a new folder is deleted as a whole', discardDir.ok && !fs.existsSync(path.join(dir, 'newdir')), discardDir.stderr);

  const accentName = 'café accentué.txt';
  write(path.join(dir, accentName), 'changed\n');
  const accentStatus = await git.status(dir);
  check(
    'paths with spaces and accents are reported unchanged',
    accentStatus.ok && accentStatus.data.changes.some((c) => c.path === accentName),
    JSON.stringify(accentStatus.data && accentStatus.data.changes.map((c) => c.path))
  );
  const discardAccent = await git.discardFile(dir, accentName);
  check(
    'a file with spaces and accents can be discarded',
    discardAccent.ok && read(path.join(dir, accentName)) === 'saved\n',
    discardAccent.stderr
  );

  check('an unchanged file is reported as such', (await git.discardFile(dir, 'nope.txt')).reason === 'not-changed');

  /* ---- renames ---- */
  execFileSync('git', ['mv', 'to-rename.txt', 'renamed.txt'], { cwd: dir });
  let st = await git.status(dir);
  const renamed = st.ok ? st.data.changes.find((c) => c.kind === 'renamed') : null;
  check(
    'a rename reports both paths',
    renamed && renamed.path === 'renamed.txt' && renamed.origPath === 'to-rename.txt',
    JSON.stringify(renamed)
  );
  const discardRename = await git.discardFile(dir, 'renamed.txt');
  check(
    'discarding a rename brings the old name back',
    discardRename.ok && fs.existsSync(path.join(dir, 'to-rename.txt')) && !fs.existsSync(path.join(dir, 'renamed.txt')),
    discardRename.stderr
  );

  /* ---- whole project ---- */
  write(path.join(dir, 'tracked.txt'), 'one\nchanged again\n');
  write(path.join(dir, 'new.txt'), 'new file again\n');
  write(path.join(dir, 'ignored', 'keep.txt'), 'ignored\n');

  const all = await git.discardAll(dir);
  check('discard all restores tracked files', all.ok && read(path.join(dir, 'tracked.txt')) === 'one\n', all.stderr);
  check('discard all deletes new files', !fs.existsSync(path.join(dir, 'new.txt')));
  check('discard all preserves ignored files', fs.existsSync(path.join(dir, 'ignored', 'keep.txt')));
  st = await git.status(dir);
  check('the project is clean after discard all', st.ok && st.data.changes.length === 0, JSON.stringify(st.data && st.data.changes));

  const nothing = await git.discardAll(dir);
  check('discard all reports when there is nothing left', !nothing.ok && nothing.reason === 'nothing');

  /* ---- repository without any commit ---- */
  const initialDir = path.join(tmp, 'initial');
  fs.mkdirSync(initialDir, { recursive: true });
  await git.init(initialDir);
  write(path.join(initialDir, 'a.txt'), 'a\n');
  write(path.join(initialDir, 'b.txt'), 'b\n');
  await git.addAll(initialDir);

  st = await git.status(initialDir);
  check('a repository without commits starts with staged files', st.ok && st.data.initial && st.data.changes.length === 2);

  const initialOne = await git.discardFile(initialDir, 'a.txt');
  check(
    'discarding one file without commits removes only that file',
    initialOne.ok && !fs.existsSync(path.join(initialDir, 'a.txt')) && fs.existsSync(path.join(initialDir, 'b.txt')),
    initialOne.stderr
  );
  st = await git.status(initialDir);
  check('the other file stays staged', st.ok && st.data.changes.length === 1 && st.data.changes[0].path === 'b.txt');

  const initialAll = await git.discardAll(initialDir);
  check(
    'discard all without commits removes the staged files',
    initialAll.ok && !fs.existsSync(path.join(initialDir, 'a.txt')) && !fs.existsSync(path.join(initialDir, 'b.txt')),
    initialAll.stderr
  );
  st = await git.status(initialDir);
  check('the repository is clean after discarding everything', st.ok && st.data.changes.length === 0);

  fs.rmSync(tmp, { recursive: true, force: true });

  const failed = results.filter((r) => !r).length;
  console.log('\n' + (failed ? 'FAILED ' + failed + ' / ' + results.length : 'ALL ' + results.length + ' CHECKS PASSED'));
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error(err);
  fs.rmSync(tmp, { recursive: true, force: true });
  process.exit(2);
});
