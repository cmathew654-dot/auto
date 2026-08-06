const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { DEMO_SAMPLE_CSV } = require('./.test-dist/demo-sample.js');
const { parseHoldingsCsvToIngestionFile } = require('./.test-dist/holdings-csv-parser.js');
const { getHoldingEligibility, MANUAL_REVIEW_REQUIRED_CODES } = require('./.test-dist/review-export-surface.js');

test('demo sample yields exactly two accounts and 14 holdings', () => {
  const ingestion = parseHoldingsCsvToIngestionFile(DEMO_SAMPLE_CSV, { fileId: 'test-file' });
  assert.equal(ingestion.accounts.length, 2);
  assert.equal(
    ingestion.accounts.reduce((n, a) => n + a.holdings.length, 0),
    14
  );
});

test('the first account is fully clean, establishing what normal looks like', () => {
  const ingestion = parseHoldingsCsvToIngestionFile(DEMO_SAMPLE_CSV, { fileId: 'test-file' });
  const [account] = ingestion.accounts;

  assert.ok(account.holdings.length >= 5, 'account 1 should carry at least 5 holdings');
  account.holdings.forEach((holding) => {
    assert.ok(
      getHoldingEligibility(holding, { allowManualOverride: false }).eligible,
      `holding ${holding.ticker} should be eligible with override OFF`
    );
  });
});

test('the second account has eligible rows, two manual-review-gated rows, and one hard block', () => {
  const ingestion = parseHoldingsCsvToIngestionFile(DEMO_SAMPLE_CSV, { fileId: 'test-file' });
  const account = ingestion.accounts[1];

  const classified = account.holdings.map((holding) => ({
    holding,
    off: getHoldingEligibility(holding),
    on: getHoldingEligibility(holding, { allowManualOverride: true }),
  }));

  const ok = classified.filter((c) => c.off.eligible);
  const review = classified.filter((c) => !c.off.eligible && c.on.eligible && c.off.requiresManualOverride);
  const blocked = classified.filter((c) => !c.on.eligible && c.on.blockedIssueCodes.includes('MISSING_LOOKUP_KEY'));

  assert.ok(ok.length >= 1, 'expected at least one eligible (ok) holding');
  assert.ok(review.length >= 2, 'expected at least two manual-review-gated holdings');
  assert.ok(blocked.length >= 1, 'expected at least one hard-blocked holding (MISSING_LOOKUP_KEY)');

  review.forEach((c) => {
    const hasManualReviewCode = c.holding.issues.some((i) => MANUAL_REVIEW_REQUIRED_CODES.has(i.code));
    assert.ok(hasManualReviewCode, 'review-gated holding should carry a manual-review-required issue code');
  });

  const reviewCodes = new Set(
    review.flatMap((c) => c.holding.issues.map((i) => i.code)).filter((code) => MANUAL_REVIEW_REQUIRED_CODES.has(code))
  );
  assert.ok(reviewCodes.has('CASH_SPECIAL_HANDLING'), 'review-gated rows should include CASH_SPECIAL_HANDLING');
  assert.ok(
    reviewCodes.has('ZERO_PRICE_NONZERO_VALUE_EXCEPTION'),
    'review-gated rows should include ZERO_PRICE_NONZERO_VALUE_EXCEPTION'
  );
});

test('across both accounts, a single parse yields at least one ok, one review, and one blocked verdict', () => {
  const ingestion = parseHoldingsCsvToIngestionFile(DEMO_SAMPLE_CSV, { fileId: 'test-file' });
  const holdings = ingestion.accounts.flatMap((a) => a.holdings);

  const classified = holdings.map((holding) => ({
    holding,
    off: getHoldingEligibility(holding),
    on: getHoldingEligibility(holding, { allowManualOverride: true }),
  }));

  const ok = classified.filter((c) => c.off.eligible);
  const review = classified.filter((c) => !c.off.eligible && c.on.eligible && c.off.requiresManualOverride);
  const blocked = classified.filter((c) => !c.on.eligible && c.on.blockedIssueCodes.includes('MISSING_LOOKUP_KEY'));

  assert.ok(ok.length >= 1, 'expected at least one eligible (ok) holding');
  assert.ok(review.length >= 1, 'expected at least one manual-review-gated holding');
  assert.ok(blocked.length >= 1, 'expected at least one hard-blocked holding (MISSING_LOOKUP_KEY)');
});

test('demo sample uses real market tickers but every account detail is fabricated', () => {
  const text = fs.readFileSync(path.join(__dirname, 'demo-sample.ts'), 'utf8');

  // Real, recognizable ticker symbols are the whole point (SMPL-03 update):
  // the guarantee is fabricated positions, not fabricated tickers.
  const realTickers = [/\bAAPL\b/, /\bMSFT\b/, /\bVTI\b/, /\bBND\b/];
  realTickers.forEach((pattern) => {
    assert.ok(pattern.test(text), `demo-sample.ts should carry a recognizable real ticker matching ${pattern}`);
  });

  assert.ok(text.includes('900000001'), 'demo-sample.ts should use the fabricated account number 900000001');
  assert.ok(text.includes('900000002'), 'demo-sample.ts should use the fabricated account number 900000002');

  // Every data row's Owner column is the generic "Demo Household", never a real name.
  const dataRows = text.match(/'Demo Household[^']*'/g) || [];
  assert.ok(dataRows.length >= 14, 'expected all 14 demo rows to carry the generic Demo Household owner');
});
