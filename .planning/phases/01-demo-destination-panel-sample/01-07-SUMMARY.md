---
phase: 01-demo-destination-panel-sample
plan: 07
subsystem: ui
tags: [typescript, dom, demo]

# Dependency graph
requires:
  - phase: 01-demo-destination-panel-sample (plan 04)
    provides: one-click demo flow (load -> review -> packet -> destination panel fill)
provides:
  - Idempotent fill path — repeat presses of the fill button never duplicate rows
affects: [01-08 guided tour (will reuse runFillIntoPanel), 03-verification]

# Tech tracking
tech-stack:
  added: []
  patterns: [single fill entry point that resets state before writing, source-text regression pins via fs.readFileSync]

key-files:
  created: []
  modified: [main.ts, demo-destination-panel.test.cjs]

key-decisions:
  - "runFillIntoPanel is the sole call site for runDemoFill, so future consumers (guided tour) reuse the reset behavior for free instead of risking a second unreset call site"

patterns-established:
  - "Fill entry points must reset consumer-facing state before writing, enforced by a test asserting reset() precedes the write call within the same function body"

requirements-completed: [DEMO-05]

# Metrics
duration: 12min
completed: 2026-08-06
---

# Phase 1 Plan 07: Idempotent Fill via runFillIntoPanel Summary

**Added a single `runFillIntoPanel` helper in main.ts that resets the simulated destination panel before every fill, closing UAT GAP 3 (repeat fills duplicating rows).**

## Performance

- **Duration:** 12 min
- **Completed:** 2026-08-06T03:58:44Z
- **Tasks:** 2 completed
- **Files modified:** 2

## Accomplishments
- `runFillIntoPanel` resets `demoPanel` then calls `runDemoFill`, and is now the only `runDemoFill` call site in main.ts
- `fillButton.onclick` delegates to `runFillIntoPanel` instead of calling `runDemoFill` directly
- Regression test pins reset-before-fill ordering and the single-call-site invariant; verified it fails when the reset line is reverted

## Task Commits

1. **Task 1: Route every fill through a resetting runFillIntoPanel helper** - `7589c60` (fix)
2. **Task 2: Pin reset-before-fill as a regression test** - `81fe935` (test)

**Plan metadata:** (this commit)

## Files Created/Modified
- `main.ts` - Added `runFillIntoPanel` helper (reset then fill); `fillButton.onclick` now delegates to it
- `demo-destination-panel.test.cjs` - Added tests pinning reset-before-fill ordering, single `runDemoFill` call site, and `onclick` delegation

## Decisions Made
None beyond what's captured in key-decisions above — plan followed as specified.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

`npm test` shows one pre-existing failure in `demo-flow.test.cjs` ("the manual-review override changes the packet contents"), unrelated to this plan's files. It traces to plan 01-06 (running in parallel) mid-flight rewriting `demo-sample.ts` — `demo-sample.test.cjs` was uncommitted/modified in the working tree from that parallel work, not from this plan. Logged in `.planning/phases/01-demo-destination-panel-sample/deferred-items.md`; out of scope for 01-07 per the plan's declared files (main.ts and demo-destination-panel.test.cjs only).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- The guided tour plan (01-08 or later) can call `runFillIntoPanel` directly without re-adding reset logic
- `paste-conductor.ts` and `demo-destination-panel.ts` remain unmodified, per plan constraints

---
*Phase: 01-demo-destination-panel-sample*
*Completed: 2026-08-06*

## Self-Check: PASSED
