'use strict';

/*
 * Regression test for the "Git installed while the app was open" bug on
 * Windows. We cannot install Git here, so we simulate a Windows environment:
 * a fake `git.exe` lives in the default Program Files location, PATH does not
 * contain it, and process.platform claims to be win32.
 *
 *   node scripts/git-detect-test.js
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');

const results = [];
function check(name, cond, extra) {
  results.push(!!cond);
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + name + (extra ? '  [' + extra + ']' : ''));
}

if (process.platform === 'win32') {
  console.log('SKIP - Windows simulation is not needed on Windows');
  process.exit(0);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'laes-win-detect-'));
const realGit = execFileSync('sh', ['-c', 'command -v git'], { encoding: 'utf8' }).trim();

// Git's real Windows install folder is %ProgramFiles%\Git\cmd\git.exe.
const programFiles = path.join(tmp, 'Program Files');
const cmdDir = path.join(programFiles, 'Git', 'cmd');
fs.mkdirSync(cmdDir, { recursive: true });
const fakeGit = path.join(cmdDir, 'git.exe');
fs.writeFileSync(
  fakeGit,
  '#!/bin/sh\n' +
    'if [ "$1" = "--version" ]; then\n' +
    '  echo "git version 9.9.9-windows"\n' +
    '  exit 0\n' +
    'fi\n' +
    'exec "' + realGit + '" "$@"\n'
);
fs.chmodSync(fakeGit, 0o755);

// Start the simulation: Git is not on PATH, but it is installed.
const realPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
const realPath = process.env.PATH;
const realProgramFiles = process.env.ProgramFiles;
const emptyPath = path.join(tmp, 'no-git-on-path');
fs.mkdirSync(emptyPath);
process.env.PATH = emptyPath;
process.env.ProgramFiles = programFiles;
Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });

const git = require('../src/main/git');

(async () => {
  const detected = await git.detect();
  check(
    'Git is found in the default Windows install folder',
    detected.installed && detected.version === '9.9.9-windows',
    detected.version || detected.error
  );

  // Every later command must reuse the full path we just found, otherwise it
  // would look at the stale PATH and fail again.
  const projectDir = path.join(tmp, 'repo');
  fs.mkdirSync(projectDir);
  const init = await git.init(projectDir);
  check(
    'later Git commands reuse the detected executable',
    init.ok && fs.existsSync(path.join(projectDir, '.git')),
    (init.stderr || '').trim()
  );

  const gitInstall = require('../src/main/git-install');
  const release = {
    assets: [
      { name: 'Git-2.56.0.4-64-bit.exe', browser_download_url: 'https://example.com/64-bit.exe' },
      { name: 'Git-2.56.0.4-arm64.exe', browser_download_url: 'https://example.com/arm64.exe' },
    ],
  };
  check(
    'Windows x64 installer asset is selected',
    gitInstall.pickInstaller(release, 'x64') === 'https://example.com/64-bit.exe'
  );
  check(
    'Windows ARM64 installer asset is selected',
    gitInstall.pickInstaller(release, 'arm64') === 'https://example.com/arm64.exe'
  );

  Object.defineProperty(process, 'platform', realPlatform);
  process.env.PATH = realPath;
  if (realProgramFiles === undefined) delete process.env.ProgramFiles;
  else process.env.ProgramFiles = realProgramFiles;

  fs.rmSync(tmp, { recursive: true, force: true });

  const failed = results.filter((r) => !r).length;
  console.log('\n' + (failed ? 'FAILED ' + failed + ' / ' + results.length : 'ALL ' + results.length + ' CHECKS PASSED'));
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(2);
});
