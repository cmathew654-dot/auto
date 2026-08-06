---
phase: 01-demo-destination-panel-sample
plan: 08
subsystem: ui
tags: [typescript, node-test, demo-copy]

# Dependency graph
requires:
  - phase: 01-demo-destination-panel-sample (plans 01-06, 01-07)
    provides: two-account 14-row demo sample and idempotent runFillIntoPanel reset
provides:
  - buildDemoTourSteps pure data model for the click-through guided tour
  - Tests pinning tour stage order, per-account fill copy contrast, and safety copy
affects: [01-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure step-model function (buildDemoTourSteps) kept separate from DOM wiring so tour copy/order is unit-testable without a browser"

key-files:
  created: []
  modified:
    - main.ts
    - demo-flow.test.cjs

key-decisions:
  - "Contrast/safety copy uses 'human click' (matching existing safety-model test regex) rather than only 'manual click'"
  - "Empty accounts input returns only load+review steps, mirroring demoRunStepOrder(false) === ['review']"

patterns-established:
  - "Tour step copy derives all counts (total rows, account count, eligible/withheld) from the AccountPreflightSummary inputs, never hardcoded, so it stays honest against whatever sample is loaded"

requirements-completed: [DEMO-01, SMPL-04]

# Metrics
duration: 12min
completed: 2026-08-06
---

# Phase 1 Plan 08: Guided Tour Stage Model Summary

**Pure `buildDemoTourSteps(accounts)` exported from main.ts producing an ordered load/review/packet/fill-per-account tour with recruiter-legible, sample-derived copy, and a 7-assertion test suite pinning order, contrast, and safety copy.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-08-06T03:51:00Z
- **Completed:** 2026-08-06T04:03:00Z
- **Tasks:** 2 completed
- **Files modified:** 2

## Accomplishments
- `buildDemoTourSteps` walks load -> review -> packet -> one fill step per account, each with title/body/proof/nextLabel copy
- Clean accounts state nothing was withheld; exception accounts name the withheld count and both stop reasons (manual-review override, missing ticker/CUSIP) without leaking raw issue codes
- Empty-input case (`buildDemoTourSteps([])`) returns only load+review, matching `demoRunStepOrder(false)`
- Test suite builds its account summaries from the real `DEMO_SAMPLE_CSV` sample (not literals), so the tour stays honest against plan 01-06's data

## Task Commits

Each task was committed atomically:

1. **Task 1: Export buildDemoTourSteps with the tour's stage model** - `2f78d4c` (feat)
2. **Task 2: Pin tour order, contrast copy, and safety copy** - `ecd364c` (test)

**Plan metadata:** pending (this commit)

## Files Created/Modified
- `main.ts` - Adds `DemoTourAccount`, `DemoTourStep` types and `buildDemoTourSteps` pure function
- `demo-flow.test.cjs` - Adds 6 tests covering order, per-step copy completeness, contrast, safety, empty input, and plain language

## Decisions Made
- Fill-step copy states Save is a "human click" (plan's own wording) and the panel is "simulat[ed]"; test regex accepts either "human click" or "manual click" to stay aligned with the existing safety-model test's phrasing
- No new files created — kept the step model colocated with `WorkflowStep`/`demoRunStepOrder` in main.ts per plan's `files_modified` scope

## Deviations from Plan

None - plan executed exactly as written. One self-caught test bug (regex expected "manual click" but the copy plan explicitly specified "human click") was fixed within Task 2 before commit — not a deviation from the plan's intent, just a test-authoring correction against the plan's own copy requirement.

## Issues Encountered
None.

## Next Phase Readiness
- `buildDemoTourSteps` and its types are exported and ready for plan 01-09 to wire to Next-button clicks and the stepper UI
- No blockers

---
*Phase: 01-demo-destination-panel-sample*
*Completed: 2026-08-06*

## Self-Check: PASSED
