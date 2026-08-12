const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');

test('public README uses the portfolio identity and bounded privacy language', () => {
  const readme = fs.readFileSync('README.md', 'utf8');
  const forbidden = [
    'eMoney Holdings Injector',
    'safe for real client data',
    "Fidelity's financial planning platform",
    'internally deployed',
    'CTO-requested',
    'firm-approved',
    'production-ready',
    'enterprise-ready',
    'nothing leaves this machine',
    '1[–-]2 hour',
    '3[–-]5 minute',
  ];

  assert.match(readme, /^# Holdings Entry Assistant/m);
  assert.match(readme, /does not send holdings data to a project server/i);
  assert.match(readme, /Save.*manual/i);
  for (const phrase of forbidden) assert.doesNotMatch(readme, new RegExp(phrase, 'i'));
});

test('tracked public tree excludes internal agent artifacts', () => {
  const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split(/\r?\n/);
  const forbidden = /^(?:\.agents|\.claude|\.codex|\.planning|\.ship|\.superpowers|docs\/(?:codex|superpowers))(?:\/|$)/;

  assert.deepEqual(tracked.filter((path) => forbidden.test(path)), []);
});

test('origin reconstruction is labeled honestly and the interview page has no submission endpoint', () => {
  const story = fs.readFileSync('docs/how-it-started.md', 'utf8');
  const interview = fs.readFileSync('portfolio/intake-reconstruction.html', 'utf8');
  const build = fs.readFileSync('scripts/build-demo.mjs', 'utf8');

  assert.match(story, /reconstruction/i);
  assert.match(story, /original.*not retained/i);
  assert.match(interview, /How many plans do you release/i);
  assert.match(interview, /How long does holdings entry take/i);
  assert.match(interview, /mailto:/i);
  assert.doesNotMatch(interview, /<form[^>]+action=/i);
  assert.doesNotMatch(interview, /fetch\(|XMLHttpRequest|fonts\.googleapis|fonts\.gstatic/i);
  assert.match(build, /intake-reconstruction\.html/);
});

test('build-demo stamps real git metadata into the build, never a hardcoded SHA', () => {
  const build = fs.readFileSync('scripts/build-demo.mjs', 'utf8');

  assert.match(build, /rev-parse.*--short.*HEAD/);
  assert.match(build, /__BUILD_INFO__/);
  assert.match(build, /GITHUB_SHA/);
  assert.doesNotMatch(build, /"sha"\s*:\s*['"][0-9a-f]{7}['"]/);
});

test('public safety and reporting notes are present', () => {
  const disclaimer = fs.readFileSync('DISCLAIMER.md', 'utf8');
  const security = fs.readFileSync('SECURITY.md', 'utf8');

  assert.match(disclaimer, /independent/i);
  assert.match(disclaimer, /not endorsed/i);
  assert.match(disclaimer, /authorized data/i);
  assert.match(security, /Security Advisor(?:y|ies)/i);
  assert.match(security, /do not include.*real/i);
});
