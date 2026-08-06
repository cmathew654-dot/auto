const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const panelSource = fs.readFileSync('demo-destination-panel.ts', 'utf8');
const conductorSource = fs.readFileSync('paste-conductor.ts', 'utf8');

test('panel carries the simulated-page banner and no eMoney trade dress', () => {
  assert.match(panelSource, /Simulated destination page\. This is not eMoney\./);
  assert.match(panelSource, /not eMoney/);
  assert.match(panelSource, /Nothing was sent to eMoney/);
  assert.doesNotMatch(panelSource, /logo/i);
  assert.doesNotMatch(panelSource, /emoney-/);

  const classNames = panelSource.match(/className\s*=\s*'([^']+)'/g) || [];
  for (const decl of classNames) {
    const [, value] = decl.match(/className\s*=\s*'([^']+)'/);
    for (const cls of value.split(/\s+/)) {
      assert.match(cls, /^demo-dest-/, `class "${cls}" is not demo-dest- prefixed`);
    }
  }
});

test('panel exposes visibly labeled fields and buttons', () => {
  assert.match(panelSource, /'Ticker'/);
  assert.match(panelSource, /'CUSIP'/);
  assert.match(panelSource, /'Units'/);
  assert.match(panelSource, /'Cost Basis'/);
  assert.match(panelSource, /Save/);
  assert.match(panelSource, /Add a Holding/);
});

test('save confirmation is local-only, never implies a real eMoney save', () => {
  assert.match(panelSource, /Recorded in this simulated panel only/);
  assert.doesNotMatch(panelSource, /saved to eMoney/i);
  assert.doesNotMatch(panelSource, /successfully saved/i);
});

test('findFieldByLabel and runDemoFill match by visible label text, never by id', () => {
  assert.match(conductorSource, /function findFieldByLabel/);
  assert.match(conductorSource, /querySelectorAll\('label'\)/);

  const startIdx = conductorSource.indexOf('export async function runDemoFill');
  assert.ok(startIdx >= 0, 'runDemoFill not found');
  const afterStart = conductorSource.slice(startIdx + 'export async function runDemoFill'.length);
  const nextExportIdx = afterStart.indexOf('export ');
  const runDemoFillBody = nextExportIdx >= 0 ? afterStart.slice(0, nextExportIdx) : afterStart;

  assert.doesNotMatch(runDemoFillBody, /Save/);
});

test('the real bookmarklet script and its host guard are untouched', () => {
  assert.match(conductorSource, /isApprovedEmoneyLocation/);
  assert.match(conductorSource, /isExpectedEmoneyHoldingsPage/);
  const scriptStart = conductorSource.indexOf('const EMONEY_FILL_BUTTON_SCRIPT');
  const scriptSlice = conductorSource.slice(scriptStart);
  assert.match(scriptSlice, /isApprovedEmoneyLocation/);
  assert.match(scriptSlice, /isExpectedEmoneyHoldingsPage/);
});
