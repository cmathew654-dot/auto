const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { DEMO_SAMPLE_CSV } = require('./.test-dist/demo-sample.js');
const { parseHoldingsCsvToIngestionFile } = require('./.test-dist/holdings-csv-parser.js');
const {
  getHoldingEligibility,
  toAssistantPayloadForAccount,
  buildAccountPreflightSummary,
} = require('./.test-dist/review-export-surface.js');
const { buildEmoneyFillPacket } = require('./.test-dist/paste-conductor.js');
const { demoRunStepOrder } = require('./.test-dist/main.js');

function buildDemoPacket(opts, accountIndex = 0) {
  const ingestion = parseHoldingsCsvToIngestionFile(DEMO_SAMPLE_CSV, { fileId: 'demo-flow-test' });
  const account = ingestion.accounts[accountIndex];
  const payload = toAssistantPayloadForAccount(account, opts);
  const summary = buildAccountPreflightSummary(account, opts);
  const packet = buildEmoneyFillPacket(payload, { blockedCount: summary.blockedCount });
  return { account, packet };
}

test('demo packet (override off) carries only eligible rows, withholds review-gated and blocked rows', () => {
  [0, 1].forEach((accountIndex) => {
    const { account, packet } = buildDemoPacket({ allowManualOverride: false }, accountIndex);

    packet.holdings.forEach((row) => {
      const holding = account.holdings.find((h) => (h.ticker ?? '') === row.ticker);
      assert.ok(holding, `packet row ${row.ticker} should map back to a demo-sample holding`);
      assert.ok(getHoldingEligibility(holding, { allowManualOverride: false }).eligible, `${row.ticker} should be eligible`);
    });

    const tickers = packet.holdings.map((row) => row.ticker);
    assert.ok(!tickers.includes(''), 'the MISSING_LOOKUP_KEY row (blank symbol) must never reach the fill packet');
    assert.ok(!tickers.includes('$CASH$'), 'the manual-review-gated cash row must not appear with override OFF');

    const withheldCount = account.holdings.length - packet.holdings.length;
    assert.equal(packet.blockedCount, withheldCount, 'blockedCount must equal the number of withheld holdings');
  });
});

test('account 1 override-OFF packet withholds nothing', () => {
  const { account, packet } = buildDemoPacket({ allowManualOverride: false }, 0);

  assert.equal(packet.blockedCount, 0, 'account 1 should withhold nothing even with override OFF');
  assert.equal(packet.rowCount ?? packet.holdings.length, account.holdings.length, 'every account 1 row should reach the packet');
});

test('the manual-review override changes the packet contents', () => {
  const off = buildDemoPacket({ allowManualOverride: false }, 1).packet;
  const on = buildDemoPacket({ allowManualOverride: true }, 1).packet;

  assert.ok(!off.holdings.some((row) => row.ticker === '$CASH$'), 'cash row absent with override OFF');
  assert.ok(on.holdings.some((row) => row.ticker === '$CASH$'), 'cash row present with override ON');
  assert.ok(!off.holdings.some((row) => row.ticker === 'DMOL'), 'zero-price row absent with override OFF');
  assert.ok(on.holdings.some((row) => row.ticker === 'DMOL'), 'zero-price row present with override ON');
  assert.ok(!on.holdings.some((row) => row.ticker === ''), 'the MISSING_LOOKUP_KEY row still never appears with override ON');
});

test('a demo run with an eligible packet ends the stepper on "fill", not regressed to "review"', () => {
  const order = demoRunStepOrder(true);
  assert.equal(order[order.length - 1], 'fill', 'the stepper must end on fill, matching the visible destination panel');
  assert.deepEqual(order, ['review', 'packet', 'fill'], 'all three post-load stages must be walked in order');
});

test('a demo run with no eligible rows stays on "review" and never claims a packet or fill stage', () => {
  const order = demoRunStepOrder(false);
  assert.deepEqual(order, ['review']);
});

test('the safety model is legible on the page', () => {
  const mainSource = fs.readFileSync(path.join(__dirname, 'main.ts'), 'utf8');

  assert.match(mainSource, /SYNTHETIC DEMO DATA/);
  assert.match(mainSource, /NO PROJECT SERVER/);
  assert.match(mainSource, /BROWSER PROCESSING/);
  assert.match(mainSource, /manual operator click|Save.*manual/i);
});
