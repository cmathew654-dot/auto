# eMoney Holdings Entry Assistant

## What This Is

A local-only browser tool that turns a custodian's holdings CSV export into a
reviewed, human-confirmed entry pass into eMoney Advisor. It plans and prepares
the entry; it never saves. The operator clicks Save in eMoney.

Two audiences, both real: an operating advisor doing held-away account entry
during client onboarding, and recruiters or hiring managers reading this repo as
a portfolio artifact linked from a resume and GitHub profile. The second audience
is why a public demo exists, and it changes what "done" means — the demo has to
be self-explanatory and safe to click, not merely correct.

## Core Value

No holdings row reaches eMoney without a human seeing its verdict first.

The paper trail over manual entry is the product. Speed is secondary; silent
wrong data is the failure mode the tool exists to prevent.

## Requirements

### Validated

Shipped, tested, and relied upon. Inferred from the codebase map (2026-08-05).

- ✓ Operator can load a custodian holdings CSV via file picker or drag-drop — existing
- ✓ Parser auto-detects the header row and maps varying column names via `HEADER_ALIASES` — existing
- ✓ Parser normalizes numbers, dates, and account types, repairing unquoted thousands separators — existing
- ✓ Parser detects duplicates by CUSIP, then ticker+description, then ticker+units, then description+units — existing
- ✓ Parser flags cash rows and zero-price-with-value exceptions — existing
- ✓ Holdings group by account number into a typed `HoldingsIngestionFile` — existing
- ✓ Every row gets an ok / review / block verdict with reason strings and codes — existing
- ✓ Blocked and manual-review rows are gated out of the fill packet — existing
- ✓ Review surface shows eligible / blocked / warning counts and full issue messages per account — existing
- ✓ Operator can copy a versioned `emoney-fill-packet/v1` payload to the clipboard — existing
- ✓ Bookmarklet fills ticker, units, and cost basis on a live eMoney page by label matching, never saving — existing
- ✓ Clear-session resets state and clears the clipboard only if this session still owns it — existing
- ✓ Public demo builds to `demo-dist/` and deploys via GitHub Pages — existing
- ✓ `npm test` runs `tsc` plus 6 `node --test` suites, including public-surface and privacy guards — existing

### Active

v1 scope: complete the public demo end-to-end and formally harden the verdict
engine against messy real-world CSV shapes.

- [ ] Demo shows all four pipeline stages end to end with no file, credentials, or setup
- [ ] Simulated destination page appears in-page as a revealed stage-4 panel
- [ ] A demo button drives the fill directly through the paste conductor — no bookmarklet install
- [ ] Demo sample CSV produces mixed ok / review / block verdicts so stage 2 visibly earns its keep
- [ ] Safety gate is exercised by the demo sample, not just described
- [ ] Safety model is legible from the page itself, not only the README
- [ ] Build badge shows the real git SHA and date instead of falling back to "Build dev"
- [ ] Verdict engine verified against messy shapes: shifted header rows, blank tickers, unknown symbols, cash-only accounts, duplicates, footer rows, extra columns
- [ ] All tests stay green, including the two public-surface guards

### Out of Scope

- Order management — this tool prepares data entry, not trading
- Custodian API integration — CSV export is the deliberate boundary; an API means credentials and a server
- Trading — same reason as order management
- Any automated eMoney Save — a human clicking Save is the entire safety model
- Real client data anywhere public — demo and fixtures are synthetic only
- eMoney trade dress in the demo — no branding, logo, colors, or page title imitating the vendor
- A project server or backend — browser processing only is a hard promise on the page

## Context

**The job it replaced.** Held-away account holdings arrive as a custodian CSV and
get typed into eMoney by hand, position by position, during onboarding. It is
repetitive and the errors are silent — a fat-fingered cost basis just becomes
wrong data in a financial plan. The tool keeps a paper trail over that step
instead of trusting a person to retype 40 rows correctly.

**Existing architecture.** Seven browser modules with no backend:
`holdings-schema.ts` (types), `holdings-csv-parser.ts` (ingestion),
`review-export-surface.ts` (verdicts and gating), `paste-conductor.ts` (packet
serialization), `emoney-browser-helper.ts` (bookmarklet DOM fill),
`ledger-styles.ts` (CSS-in-JS), `main.ts` (shell and 4-step workflow). Full detail
in `.planning/codebase/`.

**Why the bookmarklet stops being necessary in the demo.** The bookmarklet exists
only because eMoney is a third-party page — there is no other way to get code onto
someone else's site. The demo's destination panel is our own document, so a button
can call the paste conductor directly. Same conductor, same label matching, no
install. The codebase map recorded this gap as "inherent to the architecture, not
actionable"; that conclusion is wrong once the destination is in-page.

**Why label matching makes the destination page cheap.** `paste-conductor` targets
ticker, CUSIP, units, and cost basis by scanning `input, textarea` and matching
visible labels, not eMoney DOM ids. Any page with those four labeled inputs and a
Save button works. No reverse-engineering of eMoney is required.

**Known concerns carried in.** `scripts/build-demo.mjs` never injects
`window.__BUILD_INFO__`, so `main.ts` falls back to "Build dev" on the public
demo. `SAMPLE_CSV_INPUT` is hardcoded in `main.ts` and currently all-eligible.
Clipboard fallback paths, drag-drop, and CSV-derived XSS lack direct test
coverage. TypeScript strict mode is not uniformly enforced.

## Constraints

- **Naming**: The tool is always "eMoney Holdings Entry Assistant", never "Injector" — a stale git index entry carrying the old name was removed 2026-08-05; `portfolio-public.test.cjs` and `session-privacy.test.cjs` guard the public surface
- **Compliance**: No eMoney trade dress on any public page — Cyril is a registered rep at a Custodian RIA, and a public page imitating a vendor's UI is a risk a neutral labeled form does not carry
- **Privacy**: Browser processing only, no project server, nothing leaves the machine — this is stated on the page and must stay true
- **Safety**: The tool never triggers an eMoney Save; the manual-review override is explicit and off by default
- **Data**: Public demo and fixtures use synthetic data only
- **Git**: No pushes without Cyril running them himself
- **Stack**: TypeScript, no framework, `node --test`, GitHub Pages deploy of `demo-dist/`

## Key Decisions

| Decision | Rationale | Outcome |
|-|-|-|
| v1 = demo completion plus verdict hardening | Existing pipeline ships and passes tests, so it enters as Validated; the demo gap and the untested messy shapes are the real work | — Pending |
| Destination page is an in-page revealed panel, not a new tab | Keeps the visitor in one context; tab switching is where casual demos lose people | — Pending |
| Fill is triggered by a demo button, not a bookmarklet drag | Same conductor code path with no install step; the bookmarklet ritual is an eMoney deployment detail, not the mechanic being demonstrated | — Pending |
| Demo sample CSV is messy with mixed verdicts | An all-eligible sample makes stage 2 look like a formality when it is the reason the tool exists | — Pending |
| Keep the "eMoney" name, mitigate with disclaimer and neutral UI | The codebase audit recommended a vendor-neutral rename; the name is accurate and load-bearing for the portfolio, so the mitigation is trade-dress avoidance plus explicit disclaimer instead | — Pending |
| Fix the build badge rather than remove it | It falls back to "Build dev" because the demo build never injects `__BUILD_INFO__`; deleting the pill would discard a real provenance signal on a portfolio piece | — Pending |

---
*Last updated: 2026-08-05 after initialization*
