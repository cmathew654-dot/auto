---
phase: 01-demo-destination-panel-sample
plan: 06
subsystem: testing
tags: [demo-data, csv-parsing, verdict-engine, node-test]

requires: []
provides:
  - "Two-account, 14-row synthetic DEMO_SAMPLE_CSV replacing the old single-account 4-row sample"
  - "Account 900000001: 6 rows, all eligible, nothing withheld even with override OFF"
  - "Account 900000002: 5 clean rows + CASH_SPECIAL_HANDLING + ZERO_PRICE_NONZERO_VALUE_EXCEPTION + MISSING_LOOKUP_KEY block"
  - "demo-flow.test.cjs buildDemoPacket() now takes an account index, exercising the packet flow for both accounts"
affects: [01-09-guided-tour]

tech-stack:
  added: []
  patterns:
    - "Demo sample doc comment names which row triggers which code, kept in sync with the CSV body"

key-files:
  created: []
  modified:
    - demo-sample.ts
    - demo-sample.test.cjs
    - demo-flow.test.cjs

key-decisions:
  - "DMOL (zero-price row) placed in account 2 alongside the cash row so override ON/OFF has two review-gated rows to demonstrate, per plan"

patterns-established: []

requirements-completed: [SMPL-01, SMPL-02, SMPL-03, SMPL-04]

duration: 12min
completed: 2026-08-06
---

# Phase 01 Plan 06: Two-Account Demo Sample Summary

**Rewrote DEMO_SAMPLE_CSV as a two-account, 14-row synthetic sample (6 clean rows in account 1, 8 mixed-verdict rows in account 2) and re-pinned every downstream test to the new shape.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-08-06T03:47:00Z
- **Completed:** 2026-08-06T03:59:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Closed UAT GAP 2 ("um....it's two holdings?") by expanding the demo sample from 1 account / 4 rows to 2 accounts / 14 rows
- Account 1 is a clean contrast case: every row eligible, nothing withheld, establishing "normal" before Account 2's stops
- Account 2 exercises both manual-review codes (CASH_SPECIAL_HANDLING, ZERO_PRICE_NONZERO_VALUE_EXCEPTION) plus a hard MISSING_LOOKUP_KEY block
- demo-flow.test.cjs packet-building helper now parameterized by account index so both accounts run through the fill-packet flow

## Task Commits

1. **Task 1: Rewrite DEMO_SAMPLE_CSV as a two-account, 14-row synthetic sample** - `1b42185` (feat)
2. **Task 2: Pin the per-account verdict spread and the synthetic-only guarantee** - `75a4737` (test)
3. **Task 3: Update the demo packet tests for the two-account sample** - `e3ad902` (test)

_No plan metadata commit yet — pending final commit below._

## Files Created/Modified
- `demo-sample.ts` - Two-account CSV (900000001 clean x6, 900000002 mixed x8) with updated doc comment
- `demo-sample.test.cjs` - Assertions for 2 accounts/14 rows, account-1-fully-clean, account-2 review/block spread, synthetic-identifier sweep incl. 900000002
- `demo-flow.test.cjs` - `buildDemoPacket(opts, accountIndex)`, both-accounts loop test, account-1-withholds-nothing test, override test now covers both $CASH$ and DMOL

## Decisions Made
- None beyond what the plan specified - executed as written, spot-checked the exact eligibility/blocked-code output via a node script before writing assertions

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Demo sample now matches the shape plan 01-09 (guided tour) needs to narrate "Account 1 = normal, Account 2 = judgment calls"
- Known follow-up (not fixed here, per plan's explicit instruction): main.ts's `onFillPacketReady` still keeps a single `latestPacket`, so with two accounts the last account's packet wins in the UI. Plan 01-09 replaces this with a per-account packet map.

---
*Phase: 01-demo-destination-panel-sample*
*Completed: 2026-08-06*

## Self-Check: PASSED

All task commits (1b42185, 75a4737, e3ad902) and modified files (demo-sample.ts, demo-sample.test.cjs, demo-flow.test.cjs) verified present.
