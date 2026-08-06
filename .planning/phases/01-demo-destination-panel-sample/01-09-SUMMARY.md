---
phase: 01-demo-destination-panel-sample
plan: 09
subsystem: ui
tags: [demo, guided-tour, state-machine, css]

# Dependency graph
requires:
  - phase: 01-06
    provides: two-account 14-row demo sample
  - phase: 01-07
    provides: runFillIntoPanel (sole runDemoFill call site, resets panel before fill)
  - phase: 01-08
    provides: buildDemoTourSteps pure stage model
provides:
  - Next-driven click-through guided tour replacing the timed autoplay loop
  - Per-account packet map (packetsByAccount) fixing the last-writer-wins bug
  - Tour explainer card UI and styling
affects: [01-UAT, phase-3-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "advanceTour state machine: single async function reads tourIndex, drives setWorkflowStep, fills via runFillIntoPanel, then renders the explainer card — no timers"

key-files:
  created: []
  modified: [main.ts, ledger-styles.ts, demo-flow.test.cjs]

key-decisions:
  - "packetsByAccount keyed by accountNumber (not a queue/index) so the override checkbox's re-render can freely re-fire onFillPacketReady without desyncing the tour"
  - "demoRunStepOrder deleted outright (no remaining callers) rather than kept dead; buildDemoTourSteps tests from 01-08 already cover the equivalent invariants"
  - "tourNext held as a mutable reference reassigned each demo run so the Next button always calls into the current run's advanceTour closure"

patterns-established:
  - "Guided tour explainer card: .ledger-tour-card sits between reviewRoot and destinationRoot, hidden by default, unhidden by renderTourStep"

requirements-completed: [DEMO-01, DEMO-05, SMPL-04]

duration: 25min
completed: 2026-08-06
---

# Phase 01 Plan 09: Next-Driven Guided Tour Summary

**Replaced the 400ms-timer autoplay demo loop with a click-through Next-button tour, and fixed the per-account packet bug (`onFillPacketReady` last-writer-wins) that would have broken two-account fills.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-08-06T03:44:00Z
- **Completed:** 2026-08-06T04:09:32Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Visitor now clicks Next through 5 stages (load, review, packet, fill x2), each landing on an explainer card with a title/body/proof, instead of watching stages flash by on a timer
- `packetsByAccount` map fixes the deferred bug where only the last account's fill packet was retained; each account's fill now reads its own packet
- Account 1 fills clean (6/6 rows), then the panel resets and Account 2 fills only its 5 eligible rows, explainer naming the withheld ones — verified end-to-end with a headless Playwright run against the built demo
- Re-running the demo restarts cleanly at stage 1 with the destination panel hidden and cleared
- Deleted `demoRunStepOrder` (superseded, no callers left) and its two tests; added 5 new regression pins for Next-driven/no-timer, per-account lookup, and no-eMoney-trade-dress in styles

## Task Commits

Each task was committed atomically:

1. **Task 1+2: Per-account packet map + Next-driven tour state machine** - `eae40c8` (feat)
2. **Task 3: Tour card styling + regression pins** - `b38d310` (test)

**Plan metadata:** (this commit)

_Note: Tasks 1 and 2 both touched main.ts as one cohesive change (packet map is read by the tour's fill step), so they were committed together rather than split across two commits with an intermediate broken state._

## Files Created/Modified
- `main.ts` - Added `packetsByAccount` map, tour card DOM + `renderTourStep`, `advanceTour` state machine replacing the `demoRunStepOrder` timer loop; deleted `demoRunStepOrder`
- `ledger-styles.ts` - Added `.ledger-tour-card` and friends (counter, proof, right-aligned Next button), reusing existing panel/color tokens
- `demo-flow.test.cjs` - Removed the two `demoRunStepOrder` tests (function deleted); added 5 tests pinning Next-driven pacing, `runFillIntoPanel` usage, `packetsByAccount` read/write sites, and no eMoney trade dress in styles

## Decisions Made
- Kept `latestPacket` for the uploaded-CSV `fillButton` path unchanged (single-account flow, no map needed there)
- Combined Task 1 and Task 2 into a single commit since they're inseparable within one file's logic (packet map exists only to be read by the tour fill step)

## Deviations from Plan

None - plan executed exactly as written. `packetsByAccount` set/delete/clear sites match the plan's spec (`set` in `onFillPacketReady`, `clear` in `hideDestinationPanel`).

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- UAT GAP 1 closed: the demo is now a click-through tour with per-account fills verified via a headless browser run (both accounts fill correctly, panel resets between them, re-run restarts at stage 1)
- `npm test` (90/90 passing) and `npm run build:demo` both green
- Ready for human browser verification against the tour flow (01-05-PLAN.md steps, applied to the new Next-button flow instead of the old autoplay flow)

---
*Phase: 01-demo-destination-panel-sample*
*Completed: 2026-08-06*

## Self-Check: PASSED

All claimed files and commits verified present on disk / in git history.
