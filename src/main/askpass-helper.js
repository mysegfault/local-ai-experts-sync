'use strict';

/*
 * Git credential helper / askpass bridge.
 *
 * Invoked by git as a credential helper: <electron> askpass-helper.js <action>
 * (with ELECTRON_RUN_AS_NODE=1 so the Electron binary behaves as plain Node).
 * Credentials are supplied by the parent git process through environment
 * variables, so no secret is ever written to disk by this helper.
 */

const action = process.argv[2] || 'get';

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    if (process.stdin.isTTY) {
      resolve('');
      return;
    }
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', () => resolve(data));
    // Safety: git always closes stdin, but never hang forever.
    setTimeout(() => resolve(data), 5000);
  });
}

function parseRequest(text) {
  const req = {};
  for (const line of text.split('\n')) {
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    req[line.slice(0, idx)] = line.slice(idx + 1);
  }
  return req;
}

function credential() {
  const secret = process.env.LAES_GIT_SECRET || '';
  let username = process.env.LAES_GIT_USER || '';
  if (!username) username = secret;
  return { username, password: secret };
}

async function main() {
  if (action !== 'get') {
    // 'store' / 'erase' -> nothing to do.
    process.exit(0);
  }

  const cred = credential();
  if (!cred.password) {
    process.exit(1);
  }

  await readStdin();
  process.stdout.write(`username=${cred.username}\npassword=${cred.password}\n`);
  process.exit(0);
}

main();
