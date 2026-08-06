# Requirements: eMoney Holdings Entry Assistant

**Defined:** 2026-08-05
**Core Value:** No holdings row reaches eMoney without a human seeing its verdict first.

## v1 Requirements

Scope: complete the public demo end to end, and formally harden the verdict
engine against messy real-world CSV shapes. The existing pipeline (parse →
verdict → packet → bookmarklet fill) is already shipped and enters as Validated
in PROJECT.md — it is not re-specified here.

### Demo Flow

- [ ] **DEMO-01**: Visitor can run all four pipeline stages from a single button click, with no file upload, credentials, or setup
- [ ] **DEMO-02**: Visitor sees a simulated destination page as an in-page panel revealed at stage 4, without leaving the demo page
- [ ] **DEMO-03**: Visitor can trigger the fill with a demo button that drives the paste conductor directly, with no bookmarklet install step
- [ ] **DEMO-04**: Destination panel exposes labeled Ticker, CUSIP, Units, and Cost Basis inputs plus a Save button, matched by visible label rather than element id
- [ ] **DEMO-05**: Destination panel shows the filled rows in a table after the fill completes, so the visitor sees the result and not just the animation
- [ ] **DEMO-06**: Destination panel carries a visible banner stating it is a simulated destination page and not eMoney
- [ ] **DEMO-07**: Destination panel uses neutral styling with no eMoney branding, logo, colors, or page title
- [ ] **DEMO-08**: Clicking Save in the destination panel confirms the operator's action locally and never implies a real eMoney save

### Demo Sample

- [ ] **SMPL-01**: Demo sample CSV produces at least one ok, one review, and one block verdict in the same run
- [ ] **SMPL-02**: Demo sample exercises the manual-review safety gate, so the override control visibly has something to gate
- [ ] **SMPL-03**: Demo sample uses synthetic tickers, accounts, and values only
- [ ] **SMPL-04**: Only eligible rows from the demo sample reach the destination panel; blocked rows are visibly withheld

### Verdict Engine Hardening

Each shape below gets a fixture, a correct verdict, and a reason string the
operator can act on.

- [ ] **VRDT-01**: Parser assigns correct verdicts when the header row is shifted below preamble rows
- [ ] **VRDT-02**: Rows with a blank ticker are blocked with a stated missing-lookup-key reason
- [ ] **VRDT-03**: Rows with an unknown or unmappable symbol are flagged for manual review rather than silently passed
- [ ] **VRDT-04**: Cash-only accounts produce a clear verdict instead of an empty or misleading review surface
- [ ] **VRDT-05**: Duplicate rows are detected and flagged with the matched duplicate key
- [ ] **VRDT-06**: Trailing footer or total rows are excluded without corrupting account grouping
- [ ] **VRDT-07**: Unexpected extra columns are tolerated without breaking header detection or field mapping

### Trust Surface

- [ ] **TRST-01**: Safety model is legible from the demo page itself — browser processing, no project server, manual save in eMoney, synthetic demo data
- [ ] **TRST-02**: Build badge on the public demo shows the real short git SHA and build date instead of falling back to "Build dev"
- [ ] **TRST-03**: Public surface never says "Injector"; the existing naming and privacy guards stay green

### Verification

- [ ] **VERI-01**: A headless browser check loads the built demo, runs the one-click flow, and asserts the sample's eligible tickers land in the destination fields with zero console errors
- [ ] **VERI-02**: `npm test` stays green — `tsc` plus all `node --test` suites, including `portfolio-public.test.cjs` and `session-privacy.test.cjs`

## v2 Requirements

Acknowledged, deferred. Drawn from `.planning/codebase/CONCERNS.md`.

### Test Coverage

- **COVR-01**: Clipboard-denied and clipboard-fallback paths have direct test coverage
- **COVR-02**: Drag-drop and non-UTF-8 CSV loading have integration tests
- **COVR-03**: A CSV row containing script-like content is asserted to render inert

### Code Health

- **HLTH-01**: TypeScript strict mode enforced uniformly across `tsconfig.json` and `tsconfig.test.json`
- **HLTH-02**: Demo sample loaded from a `demo-sample.csv` file at build time rather than hardcoded in `main.ts`
- **HLTH-03**: Portable build fails loudly when the git SHA cannot be determined, instead of silently writing "unknown"

### Accessibility

- **A11Y-01**: Keyboard-only navigation reaches every interactive element with a visible focus indicator
- **A11Y-02**: Screen reader announce order verified across the workflow stepper and review table

## Out of Scope

| Feature | Reason |
|-|-|
| Order management | The tool prepares data entry, not trading |
| Custodian API integration | CSV export is the deliberate boundary; an API means credentials and a server |
| Trading | Same boundary as order management |
| Automated eMoney Save | A human clicking Save is the entire safety model |
| Real client data in demo or fixtures | Public artifact; synthetic data only |
| eMoney trade dress in the demo | Registered-rep compliance risk a neutral labeled form does not carry |
| Project server or backend | Browser-only processing is a promise made on the page |
| Bookmarklet drag-and-install in the demo flow | Install ceremony is an eMoney deployment detail, not the mechanic being demonstrated |
| Vendor-neutral rename of the tool | Audit suggested it; name is accurate and load-bearing for the portfolio. Mitigated by disclaimer plus trade-dress avoidance |
| Automatic push to origin | Cyril runs every push himself |

## Traceability

| Requirement | Phase | Status |
|-|-|-|
| DEMO-01 | 1 | Pending |
| DEMO-02 | 1 | Pending |
| DEMO-03 | 1 | Pending |
| DEMO-04 | 1 | Pending |
| DEMO-05 | 1 | Pending |
| DEMO-06 | 1 | Pending |
| DEMO-07 | 1 | Pending |
| DEMO-08 | 1 | Pending |
| SMPL-01 | 1 | Pending |
| SMPL-02 | 1 | Pending |
| SMPL-03 | 1 | Pending |
| SMPL-04 | 1 | Pending |
| VRDT-01 | 2 | Pending |
| VRDT-02 | 2 | Pending |
| VRDT-03 | 2 | Pending |
| VRDT-04 | 2 | Pending |
| VRDT-05 | 2 | Pending |
| VRDT-06 | 2 | Pending |
| VRDT-07 | 2 | Pending |
| TRST-01 | 1 | Pending |
| TRST-02 | 1 | Pending |
| TRST-03 | 3 | Pending |
| VERI-01 | 3 | Pending |
| VERI-02 | 3 | Pending |

**Coverage:**
- v1 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0 ✓

---
*Requirements defined: 2026-08-05*
*Last updated: 2026-08-05 after roadmap revision (demo phase reordered first)*
