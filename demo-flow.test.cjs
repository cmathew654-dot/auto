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
const { buildDemoTourSteps } = require('./.test-dist/main.js');

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

function buildDemoTourAccounts(opts = { allowManualOverride: false }) {
  const ingestion = parseHoldingsCsvToIngestionFile(DEMO_SAMPLE_CSV, { fileId: 'demo-flow-test' });
  return ingestion.accounts.map((account) => {
    const summary = buildAccountPreflightSummary(account, opts);
    return {
      accountNumber: account.accountNumber,
      totalRows: account.holdings.length,
      eligibleCount: summary.eligibleCount,
      withheldCount: summary.blockedCount,
    };
  });
}

test('the guided tour walks load -> review -> packet -> one fill per account, in sample order', () => {
  const accounts = buildDemoTourAccounts();
  const steps = buildDemoTourSteps(accounts);

  assert.deepEqual(steps.map((s) => s.stage), ['load', 'review', 'packet', 'fill', 'fill']);
  assert.deepEqual(
    steps.filter((s) => s.fillAccountNumber).map((s) => s.fillAccountNumber),
    accounts.map((a) => a.accountNumber)
  );
  assert.equal(
    steps.filter((s) => s.fillAccountNumber).length,
    accounts.length,
    'exactly one fill step per account'
  );
});

test('every tour step has non-empty copy, and only the last step reads Done', () => {
  const steps = buildDemoTourSteps(buildDemoTourAccounts());

  steps.forEach((step, index) => {
    assert.ok(step.title && step.title.trim(), `step ${index} must have a title`);
    assert.ok(step.body && step.body.trim(), `step ${index} must have a body`);
    assert.ok(step.proof && step.proof.trim(), `step ${index} must have a proof`);
    assert.ok(step.nextLabel && step.nextLabel.trim(), `step ${index} must have a nextLabel`);
    if (index < steps.length - 1) {
      assert.notEqual(step.nextLabel, 'Done', `only the last step should read Done (step ${index} did)`);
    }
  });
  assert.equal(steps[steps.length - 1].nextLabel, 'Done');
});

test('clean vs. exception account fill copy carries the contrast', () => {
  const accounts = buildDemoTourAccounts();
  const steps = buildDemoTourSteps(accounts);
  const fillSteps = steps.filter((s) => s.stage === 'fill');

  const cleanAccount = accounts.find((a) => a.withheldCount === 0);
  const exceptionAccount = accounts.find((a) => a.withheldCount > 0);
  assert.ok(cleanAccount, 'sample must contain a clean account for this test to be meaningful');
  assert.ok(exceptionAccount, 'sample must contain an exception account for this test to be meaningful');

  const cleanStep = fillSteps.find((s) => s.fillAccountNumber === cleanAccount.accountNumber);
  const exceptionStep = fillSteps.find((s) => s.fillAccountNumber === exceptionAccount.accountNumber);
  const cleanCopy = `${cleanStep.body} ${cleanStep.proof}`;
  const exceptionCopy = `${exceptionStep.body} ${exceptionStep.proof}`;

  assert.doesNotMatch(cleanCopy, /withheld|held back|blocked/i, 'clean account copy must not claim anything was withheld');

  assert.match(exceptionCopy, new RegExp(String(exceptionAccount.withheldCount)), 'exception copy must state the withheld count');
  assert.match(exceptionCopy, /manual.review/i, 'exception copy must reference the manual-review stop');
  assert.match(exceptionCopy, /ticker.*cusip|cusip.*ticker/i, 'exception copy must reference the missing ticker/CUSIP stop');
});

test('tour copy never overclaims safety and states Save is a manual click', () => {
  const steps = buildDemoTourSteps(buildDemoTourAccounts());

  steps.forEach((step) => {
    const copy = `${step.title} ${step.body} ${step.proof}`;
    assert.doesNotMatch(copy, /saved to eMoney/i);
    assert.doesNotMatch(copy, /successfully saved/i);
    assert.doesNotMatch(copy, /save is automatic/i);
  });

  const fillSteps = steps.filter((s) => s.stage === 'fill');
  assert.ok(
    fillSteps.some((s) => /human click|manual click/i.test(s.body) && /simulat/i.test(s.body)),
    'at least one fill step must state Save is a manual click and the panel is simulated'
  );
});

test('the tour never claims a packet or fill stage when nothing cleared review', () => {
  assert.deepEqual(buildDemoTourSteps([]).map((s) => s.stage), ['load', 'review']);
});

test('tour copy stays in plain language, no raw issue codes leak to the visitor', () => {
  const steps = buildDemoTourSteps(buildDemoTourAccounts());
  const allCopy = steps.map((s) => `${s.title} ${s.body} ${s.proof}`).join(' ');
  assert.doesNotMatch(allCopy, /CASH_SPECIAL_HANDLING|MISSING_LOOKUP_KEY|ZERO_PRICE_NONZERO_VALUE_EXCEPTION/);
});

test('the safety model is legible on the page', () => {
  const mainSource = fs.readFileSync(path.join(__dirname, 'main.ts'), 'utf8');

  assert.match(mainSource, /SYNTHETIC DEMO DATA/);
  assert.match(mainSource, /NO PROJECT SERVER/);
  assert.match(mainSource, /BROWSER PROCESSING/);
  assert.match(mainSource, /manual operator click|Save.*manual/i);
});

test('the guided tour is Next-driven, not timer-driven', () => {
  const mainSource = fs.readFileSync(path.join(__dirname, 'main.ts'), 'utf8');
  const tourStart = mainSource.indexOf('buildDemoTourSteps(tourAccounts)');
  assert.ok(tourStart >= 0, 'sampleButton.onclick must build the tour from buildDemoTourSteps');
  const handlerEnd = mainSource.indexOf('\n  };', tourStart);
  const tourSection = mainSource.slice(tourStart, handlerEnd);

  assert.match(tourSection, /advanceTour/, 'the tour section must drive an advanceTour step machine');
  assert.doesNotMatch(tourSection, /delay\(/, 'the tour must not pace itself with delay(); Next presses drive it');
});

test('main.ts carries no dead demoRunStepOrder export', () => {
  const mainSource = fs.readFileSync(path.join(__dirname, 'main.ts'), 'utf8');
  assert.doesNotMatch(mainSource, /demoRunStepOrder/);
});

test('the tour fills through the shared runFillIntoPanel helper, not runDemoFill directly', () => {
  const mainSource = fs.readFileSync(path.join(__dirname, 'main.ts'), 'utf8');
  const advanceStart = mainSource.indexOf('const advanceTour = async');
  const advanceEnd = mainSource.indexOf('\n      };', advanceStart);
  const advanceBody = mainSource.slice(advanceStart, advanceEnd);

  assert.match(advanceBody, /runFillIntoPanel\(/);
  assert.doesNotMatch(advanceBody, /runDemoFill\(/);
});

test('per-account fills read from a packet map, not a single last-writer-wins packet', () => {
  const mainSource = fs.readFileSync(path.join(__dirname, 'main.ts'), 'utf8');
  assert.match(mainSource, /packetsByAccount\.get\(step\.fillAccountNumber/);
  assert.match(mainSource, /packetsByAccount\.set\(/);
});

test('ledger-styles.ts styles the tour card and carries no eMoney trade dress', () => {
  const stylesSource = fs.readFileSync(path.join(__dirname, 'ledger-styles.ts'), 'utf8');
  assert.match(stylesSource, /\.ledger-tour-card/);
  assert.doesNotMatch(stylesSource, /emoney/i);
});
