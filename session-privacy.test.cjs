const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const {
  buildEmoneyDevtoolsSnippet,
  clearMatchingClipboard,
} = require('./.test-dist/review-export-surface.js');
const {
  buildEmoneyFillButtonScript,
} = require('./.test-dist/paste-conductor.js');

function payload() {
  return {
    accountId: 'acct-private-sentinel',
    accountNumber: 'PRIVATE-ACCOUNT-9981',
    accountType: 'Taxable',
    holdings: [{
      ticker: 'PRIVATE-TICKER-XYZ',
      cusip: null,
      description: null,
      units: 17,
      costBasis: 2468,
      marketValue: 3000,
    }],
  };
}

test('clearMatchingClipboard clears only the payload written by this session', async () => {
  const writes = [];
  const result = await clearMatchingClipboard('session payload', {
    readText: async () => 'session payload',
    writeText: async (value) => writes.push(value),
  });

  assert.equal(result, 'cleared');
  assert.deepEqual(writes, ['']);
});

test('clearMatchingClipboard preserves unrelated clipboard content', async () => {
  const writes = [];
  const result = await clearMatchingClipboard('session payload', {
    readText: async () => 'something the user copied later',
    writeText: async (value) => writes.push(value),
  });

  assert.equal(result, 'unchanged');
  assert.deepEqual(writes, []);
});

test('clearMatchingClipboard reports unavailable permission without overwriting', async () => {
  const writes = [];
  const result = await clearMatchingClipboard('session payload', {
    readText: async () => {
      throw new Error('permission denied');
    },
    writeText: async (value) => writes.push(value),
  });

  assert.equal(result, 'unavailable');
  assert.deepEqual(writes, []);
});

test('generated engineering fallback logs counts but not row data or raw errors', () => {
  const snippet = buildEmoneyDevtoolsSnippet(payload());

  assert.doesNotMatch(snippet, /console\.table/);
  assert.doesNotMatch(snippet, /console\.(?:log|warn|error)\([^)]*,\s*(?:rows|row|results|err)\b/i);
  assert.match(snippet, /completedCount/);
  assert.match(snippet, /failedCount/);
});

test('generated bookmarklet logs counts but not tickers, result rows, or raw errors', () => {
  const script = buildEmoneyFillButtonScript();

  assert.doesNotMatch(script, /console\.table/);
  assert.doesNotMatch(script, /console\.(?:log|warn|error)\([^)]*(?:state\.results|results|ticker|err)/i);
  assert.match(script, /rows added/);
});

test('public demo source uses the portfolio name and no remote font service', () => {
  const main = fs.readFileSync('main.ts', 'utf8');
  const buildDemo = fs.readFileSync('scripts/build-demo.mjs', 'utf8');

  assert.match(main, /Holdings Entry Assistant/);
  assert.doesNotMatch(main, /eMoney Holdings Injector/);
  assert.doesNotMatch(buildDemo, /fonts\.googleapis|fonts\.gstatic/);
});
