'use strict';

/*
 * Tests for the update check without reaching GitHub: version comparison,
 * package-kind detection and installer selection.
 *
 *   node scripts/update-test.js
 */

const update = require('../src/main/update');

const results = [];
function check(name, cond, extra) {
  results.push(!!cond);
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + name + (extra ? '  [' + extra + ']' : ''));
}

const asset = (name) => ({
  name,
  browser_download_url: 'https://github.com/mysegfault/local-ai-experts-sync/releases/download/v0.3.0/' + name,
});

const release = {
  tag_name: 'v0.3.0',
  html_url: 'https://github.com/mysegfault/local-ai-experts-sync/releases/tag/v0.3.0',
  assets: [
    asset('Local.AI.Experts.Sync-0.3.0-x64-Setup.exe'),
    asset('Local.AI.Experts.Sync-0.3.0-x64-portable.exe'),
    asset('Local.AI.Experts.Sync-0.3.0-x86_64.AppImage'),
    asset('Local.AI.Experts.Sync-0.3.0-amd64.deb'),
    asset('Local.AI.Experts.Sync-0.3.0-x64.dmg'),
    asset('Local.AI.Experts.Sync-0.3.0-arm64-Setup.exe'),
    asset('Local.AI.Experts.Sync-0.3.0-arm64-portable.exe'),
    asset('Local.AI.Experts.Sync-0.3.0-arm64.AppImage'),
    asset('Local.AI.Experts.Sync-0.3.0-arm64.deb'),
    asset('Local.AI.Experts.Sync-0.3.0-arm64.dmg'),
  ],
};

function run(platform, arch, env) {
  return update.evaluate(release, '0.2.0', { platform, arch, env: env || {} });
}

check('versions normalize the leading v', update.normalizeVersion('v1.2.3') === '1.2.3');
check('newer versions compare greater', update.compareVersions('0.3.0', '0.2.0') === 1);
check('equal versions compare equal', update.compareVersions('v0.2.0', '0.2.0') === 0);
check('older versions compare lower', update.compareVersions('0.1.9', '0.2.0') === -1);

const winInstalled = run('win32', 'x64');
check('Windows installer download is selected for an installed app', /-x64-Setup\.exe$/.test(winInstalled.url), winInstalled.url);
check('the Windows installer link is marked direct', winInstalled.direct === true);
check('installed Windows knows its package kind', winInstalled.variant === 'win-installer');

const winPortable = run('win32', 'x64', { PORTABLE_EXECUTABLE_DIR: 'C:\\Temp\\app' });
check('Windows portable download is selected for the portable app', /-x64-portable\.exe$/.test(winPortable.url), winPortable.url);
check('portable Windows knows its package kind', winPortable.variant === 'win-portable');

const linuxDeb = run('linux', 'x64');
check('Debian package is selected for an installed Linux app', /-amd64\.deb$/.test(linuxDeb.url), linuxDeb.url);
check('installed Linux knows its package kind', linuxDeb.variant === 'linux-deb');

const linuxAppImage = run('linux', 'x64', { APPIMAGE: '/home/user/App.AppImage' });
check('AppImage is selected for the AppImage build', /-x86_64\.AppImage$/.test(linuxAppImage.url), linuxAppImage.url);
check('AppImage knows its package kind', linuxAppImage.variant === 'linux-appimage');

const mac = run('darwin', 'x64');
check('macOS disk image is selected when available', /-x64\.dmg$/.test(mac.url), mac.url);

const winArm = run('win32', 'arm64');
check('Windows ARM64 gets the ARM64 installer', /-arm64-Setup\.exe$/.test(winArm.url), winArm.url);

const linuxArm = run('linux', 'arm64', { APPIMAGE: '/tmp/App.AppImage' });
check('Linux ARM64 gets the ARM64 AppImage', /-arm64\.AppImage$/.test(linuxArm.url), linuxArm.url);

const unsupported = run('linux', 'riscv64');
check('unsupported architectures fall back to the release page', unsupported.direct === false && unsupported.url === release.html_url, unsupported.url);

const current = update.evaluate({ ...release, tag_name: 'v0.2.0' }, '0.2.0', { platform: 'linux', arch: 'x64', env: {} });
check('no update is offered for the same version', current.ok && current.available === false);

const older = update.evaluate({ ...release, tag_name: 'v0.1.9' }, '0.2.0', { platform: 'linux', arch: 'x64', env: {} });
check('no update is offered for an older release', older.ok && older.available === false);

const malformed = update.evaluate({ assets: [] }, '0.2.0', { platform: 'linux', arch: 'x64', env: {} });
check('a release without a version is rejected', malformed.ok === false);

const missingAsset = update.evaluate({ tag_name: 'v0.3.0', html_url: release.html_url, assets: [] }, '0.2.0', {
  platform: 'win32',
  arch: 'x64',
  env: {},
});
check('a missing asset falls back to the release page', missingAsset.available && !missingAsset.direct && missingAsset.url === release.html_url);

const failed = results.filter((r) => !r).length;
console.log('\n' + (failed ? 'FAILED ' + failed + ' / ' + results.length : 'ALL ' + results.length + ' CHECKS PASSED'));
process.exit(failed ? 1 : 0);
