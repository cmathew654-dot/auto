/**
 * Demo sample data — 100% fabricated (SMPL-03).
 *
 * No real tickers, account numbers, owner names, or issuer names appear here.
 * The sample is single-account and intentionally mixes verdicts so the
 * in-page demo exercises all three gate outcomes in one run:
 *   - DMOA, DMOB: clean rows -> ok / export-eligible
 *   - $CASH$ row: CASH_SPECIAL_HANDLING -> manual-review gated (override clears it)
 *   - blank-symbol row: MISSING_LOOKUP_KEY -> hard blocked (no override clears it)
 */

export const DEMO_SAMPLE_CSV = [
  'Account Description,Account Number,Owner,Last Updated,Symbol,Description,Quantity,Price,Cost Basis,Value,Asset Class',
  'Demo Household - Taxable Brokerage,900000001,Demo Household,05/26/2026,DMOA,DEMO ALPHA HOLDINGS INC,10,$50.00,$450.00,$500.00,US Large Cap Blend',
  'Demo Household - Taxable Brokerage,900000001,Demo Household,05/26/2026,DMOB,DEMO BETA HOLDINGS INC,5,$80.00,$350.00,$400.00,US Large Cap Value',
  'Demo Household - Taxable Brokerage,900000001,Demo Household,05/26/2026,$CASH$,CASH,,$1.00,,$250.00,Cash',
  'Demo Household - Taxable Brokerage,900000001,Demo Household,05/26/2026,,UNIDENTIFIED SECURITY POSITION,4,$25.00,,$100.00,US Large Cap Blend',
].join('\n');
