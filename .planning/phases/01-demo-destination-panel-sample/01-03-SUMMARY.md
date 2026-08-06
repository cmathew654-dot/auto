---
phase: 01-demo-destination-panel-sample
plan: 03
subsystem: ui
tags: [dom, typescript, node-test]

requires:
  - phase: 01-demo-destination-panel-sample
    provides: demo-sample.ts fixture data (01-01)
provides:
  - "renderDemoDestinationPanel: neutral in-page simulated destination panel with not-eMoney banner, labeled Ticker/CUSIP/Units/Cost Basis fields, Add a Holding + Save, filled-rows table"
  - "runDemoFill + findFieldByLabel in paste-conductor.ts: label-driven fill of an EmoneyFillPacket into any DOM subtree, entirely separate from the real bookmarklet script"
affects: [01-demo-destination-panel-sample plans 04-05 (demo page wiring)]

tech-stack:
  added: []
  patterns:
    - "Idempotent per-module style injection guarded by a style-id existence check (mirrors ledger-styles.ts's installRegulatedLedgerStyles pattern), scoped under demo-dest- prefixed classes"
    - "Label-driven DOM field resolution (findFieldByLabel) as the trust boundary between a fill driver and a form: match on visible label text only, never element id"

key-files:
  created:
    - demo-destination-panel.ts
    - demo-destination-panel.test.cjs
  modified:
    - paste-conductor.ts
    - tsconfig.test.json
    - package.json

key-decisions:
  - "runDemoFill deliberately has no host guard (unlike isApprovedEmoneyLocation) because it only ever drives an element the demo page itself created — the real bookmarklet's eMoney-host guard stays untouched"
  - "runDemoFill never looks for or clicks Save — Save stays a human click matching DEMO-08, enforced by a test that slices the function body and asserts no /Save/ match"

patterns-established:
  - "Trust-surface tests read module source text directly (no DOM) to assert on banner copy, forbidden strings, and class-name prefixes, matching the existing portfolio-public.test.cjs approach"

requirements-completed: [DEMO-02, DEMO-04, DEMO-05, DEMO-06, DEMO-07, DEMO-08]

duration: 12min
completed: 2026-08-05
---

# Phase 01 Plan 03: Demo Destination Panel & Label-Driven Fill Driver Summary

**In-page simulated destination panel (banner, labeled fields, filled-rows table, local-only Save) plus a label-matching `runDemoFill` driver in `paste-conductor.ts`, kept fully separate from the real eMoney bookmarklet.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-08-05T00:00:00Z (approx, not tracked precisely)
- **Completed:** 2026-08-05
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- `renderDemoDestinationPanel` renders a neutral, greyscale/dashed-border panel with a "not eMoney" banner, four visibly labeled inputs, Add a Holding + Save buttons, and a filled-rows table with empty-state text
- `findFieldByLabel` / `runDemoFill` added to `paste-conductor.ts` as a separate demo-only entry point that fills an `EmoneyFillPacket` by visible label text, never by element id, and never touches Save
- Confirmed via diff that the real `EMONEY_FILL_BUTTON_SCRIPT` bookmarklet template and `isApprovedEmoneyLocation` guard are byte-identical to their pre-change form
- Added 5 new source-level tests enforcing the trust boundaries (banner text, labeled fields, save copy, label-based matching, bookmarklet untouched); full suite (71 tests) passes

## Task Commits

1. **Task 1: Create demo-destination-panel.ts** - `5ab07bf` (feat)
2. **Task 2: Add label-driven runDemoFill to paste-conductor.ts** - `3264164` (feat)
3. **Task 3: Add demo-destination-panel.test.cjs and register it** - `6392f98` (test)

## Files Created/Modified
- `demo-destination-panel.ts` - `renderDemoDestinationPanel`, neutral demo-dest- styled panel, banner/fields/table/save-confirmation behavior
- `paste-conductor.ts` - added `findFieldByLabel`, `runDemoFill`, `DemoFillProgress` alongside existing exports; bookmarklet script untouched
- `demo-destination-panel.test.cjs` - source-level trust-surface and label-matching tests
- `tsconfig.test.json` - added `demo-destination-panel.ts` to `include`
- `package.json` - registered new test file in `test` script and new source file in `typecheck` script

## Decisions Made
- No new decisions beyond those already recorded in frontmatter `key-decisions` (no-host-guard on `runDemoFill`; Save stays human-only)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `renderDemoDestinationPanel` and `runDemoFill` are ready to be wired into the demo page (likely 01-04/01-05) to drive the end-to-end "watch the pipeline land" demo flow
- No blockers

---
*Phase: 01-demo-destination-panel-sample*
*Completed: 2026-08-05*

## Self-Check: PASSED

All created files and task commit hashes verified present.
