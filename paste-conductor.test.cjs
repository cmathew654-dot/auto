const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildBatchPastePayload,
  buildEmoneyFillBookmarklet,
  buildEmoneyFillButtonScript,
  buildEmoneyFillPacket,
  buildPasteConductorSession,
  getCurrentTransferStep,
  advanceTransferSession,
  completeTransferSession,
} = require('./.test-dist/paste-conductor.js');

function payload(holdings) {
  return {
    accountId: 'acct-1',
    accountNumber: '123456789',
    accountType: 'Taxable Brokerage',
    holdings,
  };
}

function holding(overrides = {}) {
  return {
    ticker: 'AAPL',
    cusip: null,
    description: 'Apple Incorporated',
    units: 10,
    costBasis: 1450,
    marketValue: 3000,
    ...overrides,
  };
}

test('buildBatchPastePayload creates a one-paste TSV packet for eligible holdings', () => {
  const batch = buildBatchPastePayload(payload([
    holding({ ticker: 'AAPL', units: 10, costBasis: 1450, marketValue: 3000 }),
    holding({ ticker: 'MSFT', units: 5.25, costBasis: 1800.5, marketValue: 2500 }),
  ]), { blockedCount: 2 });

  assert.equal(batch.accountNumber, '123456789');
  assert.equal(batch.rowCount, 2);
  assert.equal(batch.blockedCount, 2);
  assert.deepEqual(batch.includedFields, ['ticker', 'units', 'costBasis']);
  assert.deepEqual(batch.excludedFields, ['marketValue', 'assetClass', 'sector', 'save']);
  assert.equal(batch.clipboardText, 'AAPL\t10\t1450\nMSFT\t5.25\t1800.5');
  assert.deepEqual(batch.previewRows, [
    { rowNumber: 1, ticker: 'AAPL', units: '10', costBasis: '1450' },
    { rowNumber: 2, ticker: 'MSFT', units: '5.25', costBasis: '1800.5' },
  ]);
});

test('buildBatchPastePayload never includes market value, asset class, sector, or save data', () => {
  const batch = buildBatchPastePayload(payload([
    holding({
      ticker: 'AAPL',
      units: 10,
      costBasis: 1450,
      marketValue: 3000,
      assetClass: 'Equity',
      sector: 'Technology',
      save: 'Save',
    }),
  ]));

  assert.equal(batch.clipboardText, 'AAPL\t10\t1450');
  assert.doesNotMatch(batch.clipboardText, /3000|Equity|Technology|Save/i);
  assert.equal(batch.clipboardText.split('\n').length, 1);
  assert.equal(batch.clipboardText.split('\t').length, 3);
});

test('buildBatchPastePayload keeps TSV shape stable when values contain whitespace controls', () => {
  const batch = buildBatchPastePayload(payload([
    holding({ ticker: 'AAPL\tUS', units: '10\nshares', costBasis: '1450\r\nbasis' }),
  ]));

  assert.equal(batch.clipboardText, 'AAPL US\t10 shares\t1450 basis');
});

test('empty batch paste payload is copy-safe', () => {
  const batch = buildBatchPastePayload(payload([]), { blockedCount: 3 });

  assert.equal(batch.rowCount, 0);
  assert.equal(batch.blockedCount, 3);
  assert.equal(batch.clipboardText, '');
  assert.deepEqual(batch.previewRows, []);
});

test('buildEmoneyFillPacket creates reviewed bookmarklet packet for eligible holdings', () => {
  const packet = buildEmoneyFillPacket(payload([
    holding({ ticker: 'AAPL', cusip: '037833100', units: 10, costBasis: 1450, marketValue: 3000 }),
    holding({ ticker: 'MSFT', units: 5.25, costBasis: 1800.5, marketValue: 2500 }),
  ]), {
    blockedCount: 2,
    createdAt: '2026-05-31T12:00:00.000Z',
  });

  assert.equal(packet.schemaVersion, 'emoney-fill-packet/v1');
  assert.equal(packet.createdAt, '2026-05-31T12:00:00.000Z');
  assert.equal(packet.accountNumber, '123456789');
  assert.equal(packet.rowCount, 2);
  assert.equal(packet.blockedCount, 2);
  assert.deepEqual(packet.approvedFields, ['ticker', 'units', 'costBasis']);
  assert.deepEqual(packet.excludedFields, ['marketValue', 'assetClass', 'sector', 'save']);
  assert.deepEqual(packet.holdings, [
    { rowNumber: 1, ticker: 'AAPL', cusip: '037833100', units: '10', costBasis: '1450' },
    { rowNumber: 2, ticker: 'MSFT', cusip: '', units: '5.25', costBasis: '1800.5' },
  ]);
});

test('buildEmoneyFillPacket never serializes market value, asset class, sector, description, or save data', () => {
  const packet = buildEmoneyFillPacket(payload([
    holding({
      ticker: 'AAPL',
      cusip: '037833100',
      description: 'Apple Inc',
      units: 10,
      costBasis: 1450,
      marketValue: 3000,
      assetClass: 'Equity',
      sector: 'Technology',
      save: 'Save',
    }),
  ]), { createdAt: '2026-05-31T12:00:00.000Z' });

  const holdingData = JSON.stringify(packet.holdings);
  assert.match(holdingData, /AAPL/);
  assert.match(holdingData, /037833100/);
  assert.doesNotMatch(holdingData, /3000|Apple Inc|Equity|Technology|Save/);
  assert.deepEqual(packet.excludedFields, ['marketValue', 'assetClass', 'sector', 'save']);
});

test('empty eMoney fill packet is not actionable', () => {
  const packet = buildEmoneyFillPacket(payload([]), {
    blockedCount: 3,
    createdAt: '2026-05-31T12:00:00.000Z',
  });

  assert.equal(packet.rowCount, 0);
  assert.equal(packet.blockedCount, 3);
  assert.deepEqual(packet.holdings, []);
});

test('buildEmoneyFillButtonScript emits guarded bookmarklet runtime with clipboard fallback', () => {
  const script = buildEmoneyFillButtonScript();

  assert.match(script, /Fill eMoney Holdings/);
  assert.match(script, /navigator\.clipboard\.readText/);
  assert.match(script, /Paste packet manually/);
  assert.match(script, /Add a Holding/i);
  assert.match(script, /expected eMoney Holdings page/i);
  assert.match(script, /duplicate/i);
  assert.match(script, /Save remains manual/i);
  assert.doesNotMatch(script, /activeElement/);
  assert.doesNotMatch(script, /save[^\n;]*\.click/i);
  assert.doesNotMatch(script, /setValue\([^)]*market/i);
  assert.doesNotMatch(script, /setValue\([^)]*asset/i);
  assert.doesNotMatch(script, /setValue\([^)]*sector/i);
  assert.doesNotThrow(() => new Function(script));
});

test('buildEmoneyFillBookmarklet produces installable javascript URL', () => {
  const bookmarklet = buildEmoneyFillBookmarklet();

  assert.match(bookmarklet, /^javascript:/);
  assert.match(decodeURIComponent(bookmarklet.slice('javascript:'.length)), /Fill eMoney Holdings/);
});

test('buildPasteConductorSession creates only human-paste steps for eligible holdings', () => {
  const session = buildPasteConductorSession(payload([
    holding({ ticker: 'AAPL', units: 10, costBasis: 1450, marketValue: 3000 }),
    holding({ ticker: 'MSFT', units: 5, costBasis: 1800, marketValue: 2500 }),
  ]), { blockedCount: 2 });

  assert.equal(session.accountNumber, '123456789');
  assert.equal(session.blockedCount, 2);
  assert.equal(session.totalRows, 2);
  assert.equal(session.totalSteps, 6);
  assert.equal(session.currentStepIndex, 0);
  assert.equal(session.status, 'ready');
  assert.deepEqual(session.allowedFields, ['ticker', 'units', 'costBasis']);
  assert.deepEqual(session.disallowedFields, ['marketValue', 'assetClass', 'sector', 'save']);
  assert.deepEqual(session.steps.map((step) => step.fieldName), [
    'ticker',
    'units',
    'costBasis',
    'ticker',
    'units',
    'costBasis',
  ]);
  assert.deepEqual(session.steps.map((step) => step.clipboardValue), [
    'AAPL',
    '10',
    '1450',
    'MSFT',
    '5',
    '1800',
  ]);
  assert(session.steps.every((step) => step.operatorInstruction.includes('Paste into eMoney')));
});

test('buildPasteConductorSession never creates market value, asset class, sector, or save steps', () => {
  const session = buildPasteConductorSession(payload([
    holding({ ticker: 'AAPL', units: 10, costBasis: 1450, marketValue: 3000 }),
  ]));

  const serializedSteps = JSON.stringify(session.steps);
  assert.doesNotMatch(serializedSteps, /assetClass|sector|save/i);
  assert.equal(session.steps.some((step) => step.fieldName === 'marketValue'), false);
  assert.equal(session.steps.some((step) => step.clipboardValue === '3000'), false);
});

test('transfer session advances predictably and completes manually', () => {
  const session = buildPasteConductorSession(payload([
    holding({ ticker: 'AAPL', units: 10, costBasis: 1450 }),
  ]));

  assert.equal(getCurrentTransferStep(session).clipboardValue, 'AAPL');

  const afterTicker = advanceTransferSession(session);
  assert.equal(afterTicker.currentStepIndex, 1);
  assert.equal(afterTicker.status, 'in_progress');
  assert.equal(getCurrentTransferStep(afterTicker).fieldName, 'units');

  const afterUnits = advanceTransferSession(afterTicker);
  assert.equal(afterUnits.currentStepIndex, 2);
  assert.equal(getCurrentTransferStep(afterUnits).fieldName, 'costBasis');

  const afterBasis = advanceTransferSession(afterUnits);
  assert.equal(afterBasis.currentStepIndex, 3);
  assert.equal(afterBasis.status, 'complete');
  assert.equal(getCurrentTransferStep(afterBasis), null);

  const completed = completeTransferSession(afterUnits);
  assert.equal(completed.currentStepIndex, 3);
  assert.equal(completed.status, 'complete');
});

test('empty transfer session stays complete and copy-safe', () => {
  const session = buildPasteConductorSession(payload([]), { blockedCount: 3 });

  assert.equal(session.totalRows, 0);
  assert.equal(session.totalSteps, 0);
  assert.equal(session.blockedCount, 3);
  assert.equal(session.status, 'complete');
  assert.equal(getCurrentTransferStep(session), null);
  assert.deepEqual(advanceTransferSession(session), session);
});
