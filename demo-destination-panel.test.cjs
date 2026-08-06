const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const panelSource = fs.readFileSync('demo-destination-panel.ts', 'utf8');
const conductorSource = fs.readFileSync('paste-conductor.ts', 'utf8');
const mainSource = fs.readFileSync('main.ts', 'utf8');

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

test('reset() clears the table body so repeat fills never append', () => {
  assert.match(panelSource, /tbody\.innerHTML = ''/);
});

test('main.ts routes every fill through a resetting runFillIntoPanel helper', () => {
  const helperStart = mainSource.indexOf('const runFillIntoPanel');
  assert.ok(helperStart >= 0, 'runFillIntoPanel not found in main.ts');
  const afterHelper = mainSource.slice(helperStart + 'const runFillIntoPanel'.length);
  const nextConstIdx = afterHelper.search(/\n  const /);
  const helperBody = nextConstIdx >= 0 ? afterHelper.slice(0, nextConstIdx) : afterHelper;

  // runFillIntoPanel resets the panel before filling it.
  const resetIdx = helperBody.indexOf('reset()');
  const fillIdx = helperBody.indexOf('runDemoFill(');
  assert.ok(resetIdx >= 0 && fillIdx >= 0, 'runFillIntoPanel must reset and fill');
  assert.ok(resetIdx < fillIdx, 'reset() must happen before runDemoFill(');

  // runFillIntoPanel is the ONLY call site that fills the REAL, on-screen
  // destination panel. predictFillSubjectHeight is a separate, allowed
  // exception: it runs the same fill into a throwaway, off-screen clone
  // purely to measure the table's final height before the tour scrolls --
  // it never touches the visible panel and is excluded from this check
  // the same way runFillIntoPanel's own body is.
  const measureStart = mainSource.indexOf('const predictFillSubjectHeight');
  assert.ok(measureStart >= 0, 'predictFillSubjectHeight not found in main.ts');
  const afterMeasure = mainSource.slice(measureStart + 'const predictFillSubjectHeight'.length);
  const measureEndIdx = afterMeasure.search(/\n  const /);
  const measureBody = measureEndIdx >= 0 ? afterMeasure.slice(0, measureEndIdx) : afterMeasure;
  const measureEnd = measureStart + 'const predictFillSubjectHeight'.length + measureBody.length;
  const helperEnd = helperStart + 'const runFillIntoPanel'.length + helperBody.length;

  // Excise both regions regardless of which one appears first in the file.
  const regions = [
    [helperStart, helperEnd],
    [measureStart, measureEnd],
  ].sort((a, b) => a[0] - b[0]);
  const outsideHelper =
    mainSource.slice(0, regions[0][0]) +
    mainSource.slice(regions[0][1], regions[1][0]) +
    mainSource.slice(regions[1][1]);
  assert.doesNotMatch(outsideHelper, /runDemoFill\(/);

  // fillButton.onclick delegates instead of calling runDemoFill directly.
  const onclickStart = mainSource.indexOf('fillButton.onclick');
  assert.ok(onclickStart >= 0, 'fillButton.onclick not found');
  const afterOnclick = mainSource.slice(onclickStart);
  const onclickEndIdx = afterOnclick.indexOf('\n  };');
  const onclickBody = onclickEndIdx >= 0 ? afterOnclick.slice(0, onclickEndIdx) : afterOnclick;
  assert.match(onclickBody, /runFillIntoPanel\(/);
  assert.doesNotMatch(onclickBody, /runDemoFill\(/);
});

test('the real bookmarklet script and its host guard are untouched', () => {
  assert.match(conductorSource, /isApprovedEmoneyLocation/);
  assert.match(conductorSource, /isExpectedEmoneyHoldingsPage/);
  const scriptStart = conductorSource.indexOf('const EMONEY_FILL_BUTTON_SCRIPT');
  const scriptSlice = conductorSource.slice(scriptStart);
  assert.match(scriptSlice, /isApprovedEmoneyLocation/);
  assert.match(scriptSlice, /isExpectedEmoneyHoldingsPage/);
});
