'use strict';

/*
 * Pure-Node checks for the shared i18n module (no Electron needed):
 *   node scripts/i18n-test.js
 */

const I18n = require('../src/shared/i18n');

const results = [];
function check(name, cond, extra) {
  results.push(!!cond);
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + name + (extra ? '  [' + extra + ']' : ''));
}

// locale normalisation
check('fr-FR -> fr', I18n.normalize('fr-FR') === 'fr');
check('fr -> fr', I18n.normalize('fr') === 'fr');
check('fr-CA -> fr', I18n.normalize('fr-CA') === 'fr');
check('en-US -> en', I18n.normalize('en-US') === 'en');
check('de-DE -> en (fallback)', I18n.normalize('de-DE') === 'en');
check('empty -> en (fallback)', I18n.normalize('') === 'en');

// interpolation
check(
  'interpolation works (en)',
  I18n.t('en', 'main.status.behind.detail', { behind: 3 }).indexOf('3') !== -1,
  I18n.t('en', 'main.status.behind.detail', { behind: 3 })
);
check(
  'interpolation works (fr)',
  I18n.t('fr', 'main.status.behind.detail', { behind: 3 }).indexOf('3') !== -1,
  I18n.t('fr', 'main.status.behind.detail', { behind: 3 })
);

// fallback to English then key
check('missing key falls back to key', I18n.t('fr', 'totally.missing.key') === 'totally.missing.key');

// dictionary completeness: every EN key must have an FR translation
const en = require('../src/shared/i18n');
// Re-load raw dictionaries by re-evaluating the module's closure is not possible,
// so we compare via the public API using a sentinel: if FR resolves to the EN
// string AND differs by key presence, we detect it through a direct file read.
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'shared', 'i18n.js'), 'utf8');

function keysIn(section) {
  const m = src.match(new RegExp('const ' + section + ' = \\{([\\s\\S]*?)\\n  \\};'));
  if (!m) return [];
  const keys = [];
  const re = /'([^']+)':/g;
  let match;
  while ((match = re.exec(m[1]))) keys.push(match[1]);
  return keys;
}

const enKeys = keysIn('en');
const frKeys = keysIn('fr');
const missingInFr = enKeys.filter((k) => frKeys.indexOf(k) === -1);
const missingInEn = frKeys.filter((k) => enKeys.indexOf(k) === -1);
check('EN dictionary is non-trivial', enKeys.length > 80, 'keys=' + enKeys.length);
check('no keys missing in FR', missingInFr.length === 0, 'missing: ' + missingInFr.join(', '));
check('no keys missing in EN', missingInEn.length === 0, 'missing: ' + missingInEn.join(', '));

const failed = results.filter((r) => !r).length;
console.log('\n' + (failed ? 'FAILED ' + failed + ' / ' + results.length : 'ALL ' + results.length + ' CHECKS PASSED'));
process.exit(failed ? 1 : 0);
