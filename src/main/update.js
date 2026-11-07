'use strict';

/*
 * Check the latest GitHub release and pick the download that matches how this
 * copy of the app was installed:
 *
 *   Windows NSIS install  -> ...-x64-Setup.exe
 *   Windows portable exe  -> ...-x64-portable.exe
 *   Linux AppImage        -> ...-x86_64.AppImage
 *   Linux Debian package  -> ...-amd64.deb
 *   macOS                 -> ...-x64.dmg
 *
 * If the matching asset cannot be found (unsupported architecture, missing
 * file, unreachable API), the caller falls back to the releases page.
 */

const https = require('https');

const REPO = 'mysegfault/local-ai-experts-sync';
const RELEASE_API = 'https://api.github.com/repos/' + REPO + '/releases/latest';
const RELEASES_PAGE = 'https://github.com/' + REPO + '/releases/latest';

const VARIANTS = {
  'win-installer': /-setup\.exe$/i,
  'win-portable': /-portable\.exe$/i,
  'linux-deb': /\.deb$/i,
  'linux-appimage': /\.appimage$/i,
  'mac-dmg': /\.dmg$/i,
};

const ARCH_TOKENS = {
  win32: {
    x64: ['x64', 'amd64'],
    arm64: ['arm64'],
    ia32: ['ia32'],
  },
  linux: {
    x64: ['x86_64', 'amd64'],
    arm64: ['arm64', 'aarch64'],
    arm: ['armv7l', 'armhf'],
  },
  darwin: {
    x64: ['x64', 'amd64', 'intel'],
    arm64: ['arm64', 'aarch64'],
  },
};

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
        if (body.length > 2 * 1024 * 1024) req.destroy(new Error('Response too large'));
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

function normalizeVersion(value) {
  const text = String(value || '').trim().replace(/^v/i, '');
  const match = text.match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  return match ? match[1] + '.' + match[2] + '.' + match[3] : '';
}

function compareVersions(a, b) {
  const left = normalizeVersion(a);
  const right = normalizeVersion(b);
  if (!left || !right) return 0;
  const pa = left.split('.').map(Number);
  const pb = right.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] !== pb[i]) return pa[i] > pb[i] ? 1 : -1;
  }
  return 0;
}

function detectVariant(platform, env) {
  if (platform === 'win32') {
    return env.PORTABLE_EXECUTABLE_DIR || env.PORTABLE_EXECUTABLE_FILE
      ? 'win-portable'
      : 'win-installer';
  }
  if (platform === 'linux') {
    return env.APPIMAGE || env.APPDIR ? 'linux-appimage' : 'linux-deb';
  }
  if (platform === 'darwin') return 'mac-dmg';
  return '';
}

function hasArchToken(name, token) {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Token boundaries: separators used by electron-builder in file names.
  return new RegExp('(^|[-_.])' + escaped + '($|[-_.])', 'i').test(name);
}

function pickAsset(release, platform, arch, variant) {
  const pattern = VARIANTS[variant];
  const assets = Array.isArray(release && release.assets) ? release.assets : [];
  const candidates = assets.filter((asset) => {
    const name = String((asset && asset.name) || '');
    const url = String((asset && asset.browser_download_url) || '');
    return Boolean(pattern && pattern.test(name) && /^https:\/\/github\.com\//i.test(url));
  });

  const tokens = (ARCH_TOKENS[platform] && ARCH_TOKENS[platform][arch]) || [];
  const matchingArch = candidates.filter((asset) => tokens.some((token) => hasArchToken(asset.name, token)));
  const chosen = matchingArch[0] || (candidates.length === 1 ? candidates[0] : null);
  return chosen ? String(chosen.browser_download_url) : '';
}

/*
 * Pure evaluation, split from the network call so it can be tested without
 * reaching GitHub.
 */
function evaluate(release, currentVersion, options = {}) {
  const platform = options.platform || process.platform;
  const arch = options.arch || process.arch;
  const env = options.env || process.env;

  const latest = normalizeVersion(release && (release.tag_name || release.name));
  if (!latest) return { ok: false, error: 'The release has no usable version number.' };

  const current = normalizeVersion(currentVersion) || String(currentVersion || '');
  if (compareVersions(latest, current) <= 0) {
    return { ok: true, available: false, version: latest, current };
  }

  const variant = detectVariant(platform, env);
  const assetUrl = pickAsset(release, platform, arch, variant);
  const pageUrl = release && typeof release.html_url === 'string' ? release.html_url : '';

  return {
    ok: true,
    available: true,
    version: latest,
    current,
    variant,
    direct: Boolean(assetUrl),
    url: assetUrl || pageUrl || RELEASES_PAGE,
  };
}

async function check(options = {}) {
  try {
    const release = await fetchJson(RELEASE_API, options.timeoutMs || 8000);
    return evaluate(release, options.currentVersion, options);
  } catch (err) {
    // Offline, rate-limited or GitHub unavailable: stay silent at startup.
    return { ok: false, error: String((err && err.message) || err) };
  }
}

module.exports = {
  check,
  evaluate,
  compareVersions,
  normalizeVersion,
  detectVariant,
  pickAsset,
  REPO,
  RELEASES_PAGE,
};
