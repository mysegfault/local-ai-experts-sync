'use strict';

/*
 * Resolve the download link shown on the "Git is missing" screen.
 *
 * On Windows we ask GitHub for the latest Git for Windows release and use the
 * installer asset directly, so the button starts downloading the .exe instead
 * of opening a web page where the user has to find the right file.
 * If the API cannot be reached we fall back to the official download page.
 */

const https = require('https');

const WINDOWS_RELEASE_API = 'https://api.github.com/repos/git-for-windows/git/releases/latest';
const DOWNLOAD_PAGES = {
  win32: 'https://git-scm.com/download/win',
  darwin: 'https://git-scm.com/download/mac',
  linux: 'https://git-scm.com/download/linux',
};

let cachedWindowsUrl = '';

function fetchJson(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Local-AI-Experts-Sync',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        reject(new Error('HTTP ' + res.statusCode));
        return;
      }

      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
        if (body.length > 1024 * 1024) {
          req.destroy(new Error('Response too large'));
        }
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          reject(err);
        }
      });
    });

    req.setTimeout(timeoutMs, () => req.destroy(new Error('Request timed out')));
    req.on('error', reject);
  });
}

function installerPattern(arch) {
  if (arch === 'arm64') return /^Git-[\d.]+-arm64\.exe$/i;
  if (arch === 'ia32') return /^Git-[\d.]+-32-bit\.exe$/i;
  return /^Git-[\d.]+-64-bit\.exe$/i;
}

function pickInstaller(release, arch) {
  const assets = (release && release.assets) || [];
  const pattern = installerPattern(arch);
  const asset = assets.find((item) => item && pattern.test(item.name || ''));
  return asset ? asset.browser_download_url || '' : '';
}

async function resolveDownload(platform = process.platform) {
  if (platform !== 'win32') {
    return { url: DOWNLOAD_PAGES[platform] || DOWNLOAD_PAGES.win32, direct: false };
  }

  if (cachedWindowsUrl) return { url: cachedWindowsUrl, direct: true };

  try {
    const release = await fetchJson(WINDOWS_RELEASE_API, 8000);
    const url = pickInstaller(release, process.arch);
    if (url) {
      cachedWindowsUrl = url;
      return { url, direct: true };
    }
  } catch (_) {
    /* fall through to the official download page */
  }

  return { url: DOWNLOAD_PAGES.win32, direct: false };
}

module.exports = { resolveDownload, pickInstaller };
