/**
 * Demo sample data — real market ticker symbols, fabricated positions
 * (SMPL-03). Account numbers, owner name, quantities, prices, and cost
 * bases are 100% fabricated; nothing here is a real client's holding. The
 * ticker symbols themselves are real, recognizable market symbols so the
 * demo reads as a plausible diversified retail portfolio rather than a
 * placeholder-ticker toy.
 *
 * The sample carries two accounts (14 rows total) so a demo run reads as
 * real custodial work, and so Account 1's clean run establishes what
 * "normal" looks like before Account 2's stops read as judgment, not
 * breakage:
 *
 *   Account 900000001 (Demo Household - Taxable Brokerage) — 6 rows, ALL eligible,
 *   nothing withheld even with override OFF.
 *
 *   Account 900000002 (Demo Household - Rollover IRA) — 8 rows:
 *     - KO, PG, XOM, NVDA, BND: 5 clean rows -> ok / export-eligible
 *     - SPAXX (money-market cash) row: CASH_SPECIAL_HANDLING -> manual-review
 *       gated (override clears it)
 *     - PFE, $0.00 price row: ZERO_PRICE_NONZERO_VALUE_EXCEPTION -> manual-review
 *       gated (override clears it)
 *     - blank-symbol row: MISSING_LOOKUP_KEY -> hard blocked (no override clears it)
 */

export const DEMO_SAMPLE_CSV = [
  'Account Description,Account Number,Owner,Last Updated,Symbol,Description,Quantity,Price,Cost Basis,Value,Asset Class',
  'Demo Household - Taxable Brokerage,900000001,Demo Household,05/26/2026,AAPL,APPLE INC,10,$50.00,$450.00,$500.00,US Large Cap Blend',
  'Demo Household - Taxable Brokerage,900000001,Demo Household,05/26/2026,MSFT,MICROSOFT CORP,5,$80.00,$350.00,$400.00,US Large Cap Growth',
  'Demo Household - Taxable Brokerage,900000001,Demo Household,05/26/2026,JNJ,JOHNSON & JOHNSON,20,$25.00,$450.00,$500.00,US Large Cap Value',
  'Demo Household - Taxable Brokerage,900000001,Demo Household,05/26/2026,AMZN,AMAZON.COM INC,8,$60.00,$420.00,$480.00,US Large Cap Growth',
  'Demo Household - Taxable Brokerage,900000001,Demo Household,05/26/2026,VTI,VANGUARD TOTAL STOCK MARKET ETF,12,$45.00,$500.00,$540.00,US Total Market ETF',
  'Demo Household - Taxable Brokerage,900000001,Demo Household,05/26/2026,VXUS,VANGUARD TOTAL INTERNATIONAL STOCK ETF,6,$90.00,$500.00,$540.00,International Blend ETF',
  'Demo Household - Rollover IRA,900000002,Demo Household,05/26/2026,KO,COCA-COLA CO,15,$40.00,$550.00,$600.00,US Large Cap Value',
  'Demo Household - Rollover IRA,900000002,Demo Household,05/26/2026,PG,PROCTER & GAMBLE CO,9,$70.00,$600.00,$630.00,US Large Cap Value',
  'Demo Household - Rollover IRA,900000002,Demo Household,05/26/2026,XOM,EXXON MOBIL CORP,25,$20.00,$470.00,$500.00,US Large Cap Value',
  'Demo Household - Rollover IRA,900000002,Demo Household,05/26/2026,NVDA,NVIDIA CORP,7,$65.00,$430.00,$455.00,US Large Cap Growth',
  'Demo Household - Rollover IRA,900000002,Demo Household,05/26/2026,BND,VANGUARD TOTAL BOND MARKET ETF,18,$30.00,$500.00,$540.00,US Bond ETF',
  'Demo Household - Rollover IRA,900000002,Demo Household,05/26/2026,SPAXX,FIDELITY GOVERNMENT MONEY MARKET,,$1.00,,$250.00,Cash',
  'Demo Household - Rollover IRA,900000002,Demo Household,05/26/2026,PFE,PFIZER INC,11,$0.00,$300.00,$300.00,US Large Cap Value',
  'Demo Household - Rollover IRA,900000002,Demo Household,05/26/2026,,UNIDENTIFIED SECURITY POSITION,4,$25.00,,$100.00,US Large Cap Blend',
].join('\n');
