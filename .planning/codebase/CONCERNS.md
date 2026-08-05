# Codebase Concerns

**Analysis Date:** 2026-08-05

## Demo Build Metadata

**Issue: Missing __BUILD_INFO__ in demo build**
- Problem: Demo build does not inject `window.__BUILD_INFO__` object, causing build badge to always show "Build dev"
- Files: `scripts/build-demo.mjs`, `main.ts` (lines 126-131)
- Impact: Public demo cannot display actual build SHA or timestamp; loses build traceability for public users
- Current behavior: Falls back to "Build dev" string when `window.__BUILD_INFO__` is undefined
- Fix approach: Inject `window.__BUILD_INFO__` in `build-demo.mjs` similar to `build-portable.mjs` (line 71), extracting git SHA and build timestamp via `execSync` before writing HTML, then inject as inline script before main.js

## Demo Workflow Incompleteness

**Issue: Public demo cannot complete the "fill" step**
- Problem: The final workflow step "Fill in eMoney" requires an actual eMoney Holdings page with the bookmarklet; the public demo has no destination page to fill
- Files: `main.ts` (line 145, 166, 183), `paste-conductor.ts`, `review-export-surface.ts`
- Impact: Demo users can only navigate to the "Prepare Fill Packet" step; cannot demonstrate end-to-end workflow completion
- Scope: "Fill in eMoney" step requires live eMoney web interface—inherent to architecture, not a bug
- Workaround: Documentation clarifies demo scope; portable and Tauri builds can access real eMoney pages; consider link to "how-it-started" intake page as contextual demo
- Fix approach: Not actionable—inherent to public-demo architecture. Document this explicitly in landing copy

## Trademark and Compliance Sensitivity

**Issue: Pervasive eMoney trademark usage without consistent attribution**
- Problem: "eMoney" trademark appears throughout codebase and UI without consistent attribution or disclaimer clarity
- Files: Throughout—`main.ts`, `emoney-browser-helper.ts`, `holdings-schema.ts`, `paste-conductor.ts`, `review-export-surface.ts`, many comments and strings
- Current mitigation: `DISCLAIMER.md` exists and states "not an eMoney product, API integration, or official extension"
- Risk: eMoney (or its owner) could issue C&D over branding; public demo link in README and docs increases visibility and risk exposure
- Recommendations:
  - Add explicit trade-dress notice in footer of public demo (alongside existing badges)
  - Prefix all eMoney-specific features with "eMoney-compatible" rather than "eMoney" alone
  - Consider renaming to "Holdings Entry Bookmarklet" or similar vendor-neutral term for future versions
  - Audit all branded output strings for compliance with vendor trademark guidelines

## Monolithic Stylesheet Injection

**Issue: Large inline stylesheet (1524 lines) injected at runtime**
- Problem: `ledger-styles.ts` is a single 1524-line string of CSS injected as a `<style>` element into the DOM on every page load
- Files: `ledger-styles.ts`, `main.ts` (line 90)
- Impact:
  - Blocks further rendering while parsing/applying styles
  - No external caching possible (for GitHub Pages or static hosting)
  - Makes incremental style updates hard to version
  - Memory footprint for each session instance
- Current state: This is intentional for the portable build (CSP-compatible, no external resources); acceptable for that use case
- Fix approach: No action required for current scope. If distributed as Tauri app or server-backed service, extract CSS to external sheet

## Clipboard API Browser Compatibility

**Issue: Clipboard operations have graceful fallback but limited coverage**
- Problem: `navigator.clipboard` API required for auto-copy; fallback to text display, but user must manually copy
- Files: `review-export-surface.ts` (lines 348-370, 363-369)
- Impact: Older browsers, private browsing contexts, or restrictive privacy configs fail silently; user must manually copy bookmarklet or packet JSON
- Current mitigation: Clear error messages displayed ("Clipboard blocked. Open packet text"); text still provided for manual copy
- Scenarios not fully tested:
  - Iframe contexts where clipboard is blocked
  - Mobile Safari with clipboard restrictions
  - Corporate proxies stripping clipboard access
- Fix approach: Add integration test for clipboard fallback paths; consider QR code or download link as tertiary fallback for bookmarklet

## CSV Format Brittleness

**Issue: CSV parsing tightly coupled to common custodian export formats**
- Problem: Parser expects specific column names and structure; custodian export formats change without notice
- Files: `holdings-csv-parser.ts` (lines 1-186)
- Impact: User uploads fail or produce silent parsing errors when column names shift; new asset classes or account types may not be recognized
- Current mitigation: `DISCLAIMER.md` notes "Browser pages and CSV formats change, so compatibility can break"
- Not tested: Older CSV exports, edge-case custodians, Excel-to-CSV conversions with locale-specific delimiters
- Fix approach:
  - Add schema version header detection to CSV (e.g., first row: `# CSV_FORMAT_VERSION=1`)
  - Log column mapping mismatches instead of silently skipping
  - Build optional custodian-specific parsers (Fidelity, Schwab, E*TRADE) with validation

## Hardcoded Demo Sample

**Issue: Demo sample is embedded in code**
- Problem: `SAMPLE_CSV_INPUT` in `main.ts` (lines 21-26) is hardcoded; cannot be updated without rebuild/redeploy
- Files: `main.ts` (lines 21-26, 310)
- Impact: Sample data becomes stale; cannot demonstrate new account types or edge cases without code changes
- Fix approach: Load demo sample from `demo-sample.csv` file at build time instead of hardcoding; inject into demo-dist during build

## Untested Error Paths

**Issue: Some error conditions lack explicit test coverage**
- Problem: Clipboard access, file drag-and-drop, and network-error handling are guarded but not directly tested in suite
- Files: `main.ts` (lines 276-341 file loading, 344-387 drag-drop, 325 clipboard)
- Coverage gaps:
  - File loading with non-UTF-8 CSV
  - CSV files exceeding browser memory limits
  - Multiple rapid file drops
  - Clipboard access denied scenarios
- Impact: Silent failures or confusing error messages in edge cases
- Fix approach: Add integration tests for drag-drop, file codec edge cases, and clipboard denial

## Potential XSS via CSV Content

**Issue: CSV values rendered into HTML without sanitization**
- Problem: Holding ticker, description, account names read from CSV and rendered into DOM nodes via `textContent` (safe) or `innerHTML` (risky if ever used)
- Files: `review-export-surface.ts` rendering logic; verify no `innerHTML` with unsanitized CSV data
- Current state: Appears safe (uses `textContent` in observed locations), but no explicit validation
- Fix approach:
  - Add test case with CSV row containing `<script>`, `onclick`, etc.
  - Audit all CSV-to-DOM rendering paths for `innerHTML` usage
  - If any remain, switch to `textContent` or use `createTextNode()`

## Git-based Build Metadata Accuracy

**Issue: Build SHA accuracy in portable build**
- Problem: `build-portable.mjs` uses `git rev-parse --short HEAD` to capture SHA; succeeds silently if git is unavailable (falls back to 'unknown')
- Files: `scripts/build-portable.mjs` (lines 13-22)
- Impact: Portable builds created outside of git context (e.g., manual download and build) show "unknown" SHA; loses reproducibility tracking
- Fix approach: Add validation that build is in git repo; fail loudly if SHA cannot be determined; document requirement in README

## Session State Persistence Risk

**Issue: Session cleared only from memory; no protection against accidental data retention**
- Problem: When "Clear session" button is clicked, clipboard is conditionally cleared only if it still contains the last payload; user data persists if they copied something else afterward
- Files: `main.ts` (lines 324-341), `review-export-surface.ts` (lines 348-357)
- Impact: User may believe session is cleared but holdings data remains in system clipboard; operator responsible for verification
- Current mitigation: UI message states "Newer clipboard content was preserved"; user must manually verify
- Fix approach: Add option to force-clear clipboard regardless of current content; or, show warning if newer clipboard content detected; consider localStorage/sessionStorage wipe on page unload

## TypeScript Strict Mode Not Enforced

**Issue: TypeScript compilation does not use strict mode uniformly**
- Problem: `tsconfig.json` likely has `strict: false` or partial strict settings; type safety not maximally enforced
- Files: `tsconfig.json`, `tsconfig.test.json`
- Impact: Some TypeScript type errors pass silently; runtime bugs possible from narrowing failures
- Fix approach: Set `strict: true` in tsconfig.json; run `npm run typecheck` and fix resulting errors; add pre-commit hook to enforce

## Accessibility Gaps

**Issue: ARIA labels and semantic HTML incomplete in some areas**
- Problem: Workflow stepper and form controls have ARIA labels, but some interactive elements may lack focus indicators or keyboard navigation
- Files: `main.ts`, `ledger-styles.ts`
- Not tested: Screen reader announce order, keyboard Tab order, focus visibility in all contexts
- Fix approach: Audit with keyboard-only navigation; test with screen reader (NVDA, JAWS); ensure all interactive elements reachable via Tab

---

*Concerns audit: 2026-08-05*
