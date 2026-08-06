---
phase: 01-demo-destination-panel-sample
plan: 01
subsystem: demo-sample-data
tags: [demo, sample-data, verdict-engine, testing]
requires: []
provides:
  - demo-sample.ts (DEMO_SAMPLE_CSV)
  - demo-sample.test.cjs
affects:
  - main.ts (SAMPLE_CSV_INPUT now sourced from demo-sample.ts)
tech-stack:
  added: []
  patterns:
    - "Fabricated single-account CSV sample mixing ok/review/block verdicts, verified against real getHoldingEligibility logic"
key-files:
  created:
    - demo-sample.ts
    - demo-sample.test.cjs
  modified:
    - main.ts
    - tsconfig.test.json
    - package.json
decisions:
  - "Blocked row keeps a description ('UNIDENTIFIED SECURITY POSITION') so the parser doesn't drop it as an empty line, while leaving Symbol blank to trigger MISSING_LOOKUP_KEY."
metrics:
  duration: "~15 min"
  completed: 2026-08-05
---

# Phase 1 Plan 1: Demo Sample Verdict Mix Summary

Replaced the all-clean hardcoded demo sample (3 real tickers, always 0 blocked) with a fabricated single-account CSV that exercises all three verdict gates in one run: 2 eligible rows, 1 manual-review-gated cash row, and 1 hard-blocked row with no lookup key.

## What Was Built

- `demo-sample.ts` exports `DEMO_SAMPLE_CSV`, a single-account synthetic holdings CSV (account `900000001`, owner `Demo Household`) with:
  - `DMOA` / `DMOB` — clean rows, export-eligible.
  - `$CASH$` row — triggers `CASH_SPECIAL_HANDLING`, gated behind the manual-review override checkbox.
  - Blank-symbol row (`UNIDENTIFIED SECURITY POSITION`) — triggers `MISSING_LOOKUP_KEY`, blocked even with override on.
- `demo-sample.test.cjs` parses the sample and classifies every holding with the real `getHoldingEligibility` (override off and on), asserting at least one ok, one review-gated, and one hard-blocked holding, plus a synthetic-content check that fails on any real ticker/issuer name.
- `main.ts` now imports `DEMO_SAMPLE_CSV` and re-exports it as `SAMPLE_CSV_INPUT`, so no other caller needed to change.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `npm test` — 66/66 passing (including new `demo-sample.test.cjs`).
- `npm run typecheck` — passes.
- `npm run build:demo` — succeeds; `demo-dist/demo-sample.js` carries the fabricated `DMOA` ticker; `demo-dist/main.js` imports `./demo-sample.js` (build does not bundle).
- No real-world ticker or issuer name appears in `demo-sample.ts` (enforced by test).

## Self-Check: PASSED

- FOUND: demo-sample.ts
- FOUND: demo-sample.test.cjs
- FOUND: commit b69ce94 (Task 1)
- FOUND: commit 44c3d7f (Task 2)
- FOUND: commit a24df34 (Task 3)
