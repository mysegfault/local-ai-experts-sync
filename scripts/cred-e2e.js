'use strict';

/*
 * Validates the HTTPS credential flow end to end without any external network.
 * Starts a local HTTP server that returns 401 until correct Basic credentials
 * are presented, then drives git.lsRemote() through git.js with token creds.
 *   xvfb-run -a npx electron scripts/cred-e2e.js
 */

const http = require('http');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

app.setPath('userData', path.join(os.tmpdir(), 'laes-cred-' + process.pid));
app.disableHardwareAcceleration();

const git = require('../src/main/git');

const USER = 'alice';
const PASS = 'sekret123';
const expected = 'Basic ' + Buffer.from(USER + ':' + PASS).toString('base64');

const seen = [];

const server = http.createServer((req, res) => {
  const auth = req.headers['authorization'] || '';
  seen.push({ url: req.url, auth });
  if (auth !== expected) {
    res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="git"' });
    res.end('auth required');
    return;
  }
  // Correct creds: give a plausible (empty) smart-http advertisement.
  res.writeHead(200, { 'Content-Type': 'application/x-git-upload-pack-advertisement' });
  res.end('0000');
});

function check(name, cond, extra) {
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + name + (extra ? '  [' + extra + ']' : ''));
  return !!cond;
}

app.whenReady().then(() => {
  server.listen(0, '127.0.0.1', async () => {
    const port = server.address().port;
    const url = 'http://127.0.0.1:' + port + '/repo.git';
    const results = [];

    // 1. With token credentials the helper should supply Basic auth.
    const res = await git.lsRemote(url, { mode: 'token', username: USER, secret: PASS });
    const gotAuth = seen.some((s) => s.auth === expected);
    results.push(check('server received correct Basic auth from helper', gotAuth, 'requests=' + seen.length + ' lastAuth=' + (seen[seen.length - 1] || {}).auth));

    // 2. Without credentials, git must fail and never send an auth header.
    seen.length = 0;
    const res2 = await git.lsRemote(url, { mode: 'none' });
    const sentAuth = seen.some((s) => s.auth);
    results.push(check('no-credential run does not authenticate', !sentAuth));
    results.push(check('no-credential run fails cleanly', !res2.ok, (res2.stderr || '').split('\n')[0]));

    void res;
    const failed = results.filter((r) => !r).length;
    console.log('\n' + (failed ? 'FAILED ' + failed + ' / ' + results.length : 'ALL ' + results.length + ' CHECKS PASSED'));
    server.close();
    app.exit(failed ? 1 : 0);
  });
});
