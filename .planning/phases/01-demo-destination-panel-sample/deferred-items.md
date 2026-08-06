# Deferred Items

## demo-flow.test.cjs: "the manual-review override changes the packet contents" failing

- **Found during:** 01-07 Task 2 verification (`npm test`)
- **Scope:** Out of scope for 01-07 — 01-07 only touches `main.ts` and
  `demo-destination-panel.test.cjs`. This failure is in `demo-flow.test.cjs`
  against packet/override logic, unrelated to the fill-reset fix.
- **Likely cause:** Plan 01-06 (running in parallel) is mid-flight rewriting
  `demo-sample.ts` — `demo-sample.test.cjs` shows as modified but uncommitted
  in the working tree, not from 01-07's changes.
- **Action:** Not fixed here. Owner of 01-06 (or a follow-up check) should
  confirm this clears once 01-06 lands.
