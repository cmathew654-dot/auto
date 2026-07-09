const test = require('node:test');
const assert = require('node:assert/strict');

const {
  findMatchingRow,
  upsertHolding,
} = require('./.test-dist/emoney-browser-helper.js');

class FakeInput {
  constructor(name, value = '') {
    this.name = name;
    this.value = value;
    this.disabled = false;
    this._attrs = {};
  }
  focus() {}
  blur() {}
  dispatchEvent() { return true; }
  getAttribute(key) { return this._attrs[key] ?? null; }
  setAttribute(key, val) { this._attrs[key] = val; }
}

class FakeRow {
  constructor(fields) {
    this.fields = fields;
  }
  querySelector(selector) {
    const s = selector.toLowerCase();
    if (s.includes('ticker')) return this.fields.ticker ?? null;
    if (s.includes('cusip')) return this.fields.cusip ?? null;
    if (s.includes('description')) return this.fields.description ?? null;
    if (s.includes('unit') || s.includes('share')) return this.fields.units ?? null;
    if (s.includes('cost')) return this.fields.costBasis ?? null;
    if (s.includes('market') || s.includes('value')) return this.fields.marketValue ?? null;
    if (s.includes('assetclass')) return this.fields.assetClass ?? null;
    if (s.includes('sector')) return this.fields.sector ?? null;
    return null;
  }
}

function makeRow(seed = {}) {
  return new FakeRow({
    ticker: new FakeInput('ticker', seed.ticker ?? ''),
    cusip: new FakeInput('cusip', seed.cusip ?? ''),
    description: new FakeInput('description', seed.description ?? ''),
    units: new FakeInput('units', seed.units ?? ''),
    costBasis: new FakeInput('costBasis', seed.costBasis ?? ''),
    marketValue: new FakeInput('marketValue', seed.marketValue ?? ''),
    assetClass: new FakeInput('assetClass', seed.assetClass ?? ''),
    sector: new FakeInput('sector', seed.sector ?? ''),
  });
}

function withFakeDom(rows, fn) {
  const original = {
    document: global.document,
    Event: global.Event,
    MouseEvent: global.MouseEvent,
    HTMLInputElement: global.HTMLInputElement,
    HTMLTextAreaElement: global.HTMLTextAreaElement,
    HTMLSelectElement: global.HTMLSelectElement,
    setTimeout: global.setTimeout,
  };

  const addButton = { dispatchEvent: () => true };
  global.document = {
    querySelectorAll: (selector) => (selector === '#holdingsTable > tr' ? rows : []),
    querySelector: () => addButton,
  };
  global.Event = class Event { constructor(type) { this.type = type; } };
  global.MouseEvent = class MouseEvent { constructor(type) { this.type = type; } };
  global.HTMLInputElement = FakeInput;
  global.HTMLTextAreaElement = FakeInput;
  global.HTMLSelectElement = FakeInput;
  global.setTimeout = (cb) => { cb(); return 0; };

  return Promise.resolve()
    .then(fn)
    .finally(() => {
      global.document = original.document;
      global.Event = original.Event;
      global.MouseEvent = original.MouseEvent;
      global.HTMLInputElement = original.HTMLInputElement;
      global.HTMLTextAreaElement = original.HTMLTextAreaElement;
      global.HTMLSelectElement = original.HTMLSelectElement;
      global.setTimeout = original.setTimeout;
    });
}

test('ambiguous match hard-stops and requires human intervention', async () => {
  const rowA = makeRow({ cusip: '111111111', ticker: 'AAA' });
  const rowB = makeRow({ cusip: '111111111', ticker: 'BBB' });

  await withFakeDom([rowA, rowB], async () => {
    const match = findMatchingRow({ cusip: '111111111' });
    assert.equal(match.status, 'ambiguous');
    assert.equal(match.matchType, 'cusip');
    assert.equal(match.candidateCount, 2);

    const result = await upsertHolding({ cusip: '111111111', units: 10, costBasis: 100 });
    assert.equal(result.ok, false);
    assert.equal(result.requiresHumanIntervention, true);
    assert.equal(result.reasonCode, 'AMBIGUOUS_MATCH');
    assert.equal(result.matchType, 'cusip');
    assert.equal(result.candidateCount, 2);

    // Ensure no silent overwrite occurred.
    assert.equal(rowA.fields.units.value, '');
    assert.equal(rowB.fields.units.value, '');
  });
});

test('unique match proceeds and reports key path', async () => {
  const row = makeRow({ cusip: '222222222', ticker: 'UNIQ' });

  await withFakeDom([row], async () => {
    const match = findMatchingRow({ cusip: '222222222' });
    assert.equal(match.status, 'unique');
    assert.equal(match.matchType, 'cusip');

    const result = await upsertHolding({ cusip: '222222222', units: 5, costBasis: 55 });
    assert.equal(result.ok, true);
    assert.equal(result.errors.length, 0);
    assert.equal(row.fields.units.value, '5');
    assert.equal(row.fields.costBasis.value, '55');
  });
});
