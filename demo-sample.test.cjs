const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { DEMO_SAMPLE_CSV } = require('./.test-dist/demo-sample.js');
const { parseHoldingsCsvToIngestionFile } = require('./.test-dist/holdings-csv-parser.js');
const { getHoldingEligibility, MANUAL_REVIEW_REQUIRED_CODES } = require('./.test-dist/review-export-surface.js');

test('demo sample yields exactly one account', () => {
  const ingestion = parseHoldingsCsvToIngestionFile(DEMO_SAMPLE_CSV, { fileId: 'test-file' });
  assert.equal(ingestion.accounts.length, 1);
});

test('demo sample has at least one ok, one review-gated, and one blocked holding', () => {
  const ingestion = parseHoldingsCsvToIngestionFile(DEMO_SAMPLE_CSV, { fileId: 'test-file' });
  const holdings = ingestion.accounts[0].holdings;

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

  // Sanity: manual review holding must actually carry a MANUAL_REVIEW_REQUIRED_CODES issue.
  review.forEach((c) => {
    const hasManualReviewCode = c.holding.issues.some((i) => MANUAL_REVIEW_REQUIRED_CODES.has(i.code));
    assert.ok(hasManualReviewCode, 'review-gated holding should carry a manual-review-required issue code');
  });
});

test('demo sample contains no real-world identifiers', () => {
  const text = fs.readFileSync(path.join(__dirname, 'demo-sample.ts'), 'utf8');
  const realTickers = [/\bAAPL\b/, /\bMSFT\b/, /\bGOOG\b/, /\bVTI\b/, /\bVXUS\b/, /\bBND\b/];
  const realNames = [/Apple/i, /Microsoft/i, /Alphabet/i, /Vanguard/i];

  [...realTickers, ...realNames].forEach((pattern) => {
    assert.ok(!pattern.test(text), `demo-sample.ts should not match ${pattern}`);
  });

  assert.ok(text.includes('900000001'), 'demo-sample.ts should use the fabricated account number 900000001');
});
