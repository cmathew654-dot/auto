/**
 * Demo sample data — 100% fabricated (SMPL-03).
 *
 * No real tickers, account numbers, owner names, or issuer names appear here.
 * The sample carries two accounts (14 rows total) so a demo run reads as real
 * custodial work, not a toy, and so Account 1's clean run establishes what
 * "normal" looks like before Account 2's stops read as judgment, not breakage:
 *
 *   Account 900000001 (Demo Household - Taxable Brokerage) — 6 rows, ALL eligible,
 *   nothing withheld even with override OFF.
 *
 *   Account 900000002 (Demo Household - Rollover IRA) — 8 rows:
 *     - DMOG..DMOK: 5 clean rows -> ok / export-eligible
 *     - $CASH$ row: CASH_SPECIAL_HANDLING -> manual-review gated (override clears it)
 *     - DMOL, $0.00 price row: ZERO_PRICE_NONZERO_VALUE_EXCEPTION -> manual-review
 *       gated (override clears it)
 *     - blank-symbol row: MISSING_LOOKUP_KEY -> hard blocked (no override clears it)
 */

export const DEMO_SAMPLE_CSV = [
  'Account Description,Account Number,Owner,Last Updated,Symbol,Description,Quantity,Price,Cost Basis,Value,Asset Class',
  'Demo Household - Taxable Brokerage,900000001,Demo Household,05/26/2026,DMOA,DEMO ALPHA HOLDINGS INC,10,$50.00,$450.00,$500.00,US Large Cap Blend',
  'Demo Household - Taxable Brokerage,900000001,Demo Household,05/26/2026,DMOB,DEMO BETA HOLDINGS INC,5,$80.00,$350.00,$400.00,US Large Cap Value',
  'Demo Household - Taxable Brokerage,900000001,Demo Household,05/26/2026,DMOC,DEMO GAMMA HOLDINGS INC,20,$25.00,$450.00,$500.00,US Mid Cap Blend',
  'Demo Household - Taxable Brokerage,900000001,Demo Household,05/26/2026,DMOD,DEMO DELTA HOLDINGS INC,8,$60.00,$420.00,$480.00,US Small Cap Growth',
  'Demo Household - Taxable Brokerage,900000001,Demo Household,05/26/2026,DMOE,DEMO EPSILON HOLDINGS INC,12,$45.00,$500.00,$540.00,International Blend',
  'Demo Household - Taxable Brokerage,900000001,Demo Household,05/26/2026,DMOF,DEMO ZETA HOLDINGS INC,6,$90.00,$500.00,$540.00,US Large Cap Growth',
  'Demo Household - Rollover IRA,900000002,Demo Household,05/26/2026,DMOG,DEMO ETA HOLDINGS INC,15,$40.00,$550.00,$600.00,US Large Cap Blend',
  'Demo Household - Rollover IRA,900000002,Demo Household,05/26/2026,DMOH,DEMO THETA HOLDINGS INC,9,$70.00,$600.00,$630.00,US Large Cap Value',
  'Demo Household - Rollover IRA,900000002,Demo Household,05/26/2026,DMOI,DEMO IOTA HOLDINGS INC,25,$20.00,$470.00,$500.00,US Mid Cap Blend',
  'Demo Household - Rollover IRA,900000002,Demo Household,05/26/2026,DMOJ,DEMO KAPPA HOLDINGS INC,7,$65.00,$430.00,$455.00,US Small Cap Value',
  'Demo Household - Rollover IRA,900000002,Demo Household,05/26/2026,DMOK,DEMO LAMBDA HOLDINGS INC,18,$30.00,$500.00,$540.00,International Blend',
  'Demo Household - Rollover IRA,900000002,Demo Household,05/26/2026,$CASH$,CASH,,$1.00,,$250.00,Cash',
  'Demo Household - Rollover IRA,900000002,Demo Household,05/26/2026,DMOL,DEMO MU HOLDINGS INC,11,$0.00,$300.00,$300.00,US Mid Cap Growth',
  'Demo Household - Rollover IRA,900000002,Demo Household,05/26/2026,,UNIDENTIFIED SECURITY POSITION,4,$25.00,,$100.00,US Large Cap Blend',
].join('\n');
