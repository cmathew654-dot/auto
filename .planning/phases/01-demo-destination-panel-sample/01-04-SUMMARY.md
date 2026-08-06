---
phase: 01-demo-destination-panel-sample
plan: 04
subsystem: ui
tags: [typescript, dom, demo-flow, review-export-surface, paste-conductor]

# Dependency graph
requires:
  - phase: 01-demo-destination-panel-sample
    provides: DEMO_SAMPLE_CSV mixed-verdict sample (01-01), renderDemoDestinationPanel + runDemoFill (01-03)
provides:
  - One-click "Run the full demo" flow wiring load -> review -> packet -> destination panel
  - onFillPacketReady handoff from review-export-surface.ts to main.ts
  - Visible withheld-row reporting and the fourth safety claim (SYNTHETIC DEMO DATA)
  - demo-flow.test.cjs pinning eligible-rows-only packet contents
affects: [01-demo-destination-panel-sample verification plan, portfolio README/demo copy]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Live packet handoff via an onFillPacketReady callback fired at the end of renderTransferPacket, so any override re-render also re-fires the callback"

key-files:
  created:
    - demo-flow.test.cjs
  modified:
    - review-export-surface.ts
    - main.ts
    - package.json

key-decisions:
  - "Rendered the demo Fill button, withheld-row line, and panel host as separate children under destinationRoot rather than passing destinationRoot itself into renderDemoDestinationPanel, so the header controls and the panel don't fight over the same container"
  - "hideDestinationPanel() centralizes the destinationRoot hide/reset logic shared by Clear session and by re-running the demo, rather than duplicating it inline"

patterns-established:
  - "Stage handoff pattern: options callbacks (onFillPacketReady) thread packet state from review-export-surface.ts through LocalMvpOptions into main.ts without main.ts recomputing eligibility"

requirements-completed: [DEMO-01, DEMO-03, SMPL-04, TRST-01]

duration: 20min
completed: 2026-08-05
---

# Phase 1 Plan 4: One-Click Demo Flow Summary

**Wired demo-sample.ts, review-export-surface.ts, and the destination panel into one visitor-facing "Run the full demo" flow with a direct runDemoFill call, no bookmarklet or upload required.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 3
- **Files modified:** 4 (review-export-surface.ts, main.ts, demo-flow.test.cjs, package.json)

## Accomplishments
- `renderReviewExportSurface` now hands the caller the live eligible-rows-only `EmoneyFillPacket` via `onFillPacketReady`, re-firing whenever the manual-review override toggles
- `main.ts`'s "Run the full demo" button drives all four workflow stages from one click, reveals the stage-4 destination panel, and its Fill button calls `runDemoFill` directly against the panel DOM
- Withheld-row count and the fourth safety claim (`SYNTHETIC DEMO DATA` badge, check, footer sentence) are now visible on the page
- `demo-flow.test.cjs` reproduces the packet build from the demo sample and pins eligible-rows-only contents, override behavior, and the four safety claims

## Task Commits

1. **Task 1: Hand the live fill packet out of the review surface** - `f721626` (feat)
2. **Task 2: One-click demo run + destination panel + demo Fill button** - `36866f6` (feat)
3. **Task 3: Pin eligible-rows-only in demo-flow.test.cjs** - `833bffe` (test)

**Plan metadata:** (this commit)

## Files Created/Modified
- `review-export-surface.ts` - Added `onFillPacketReady` option, fired from `renderTransferPacket`
- `main.ts` - One-click demo run, stage-4 destination panel + Fill button, withheld-row line, SYNTHETIC DEMO DATA safety claim, `onFillPacketReady` plumbed through `LocalMvpOptions`
- `demo-flow.test.cjs` - New test pinning eligible-rows-only packet contents and safety claims
- `package.json` - Registered `demo-flow.test.cjs` in the `test` script

## Decisions Made
- Used a dedicated `destinationPanelHost` div inside `destinationRoot` for `renderDemoDestinationPanel`, keeping the Fill button and withheld-row line as siblings rather than injected into the panel itself
- Centralized panel hide/reset in `hideDestinationPanel()`, called from both `sampleButton` re-runs and `clearSessionButton`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The one-click demo flow, destination panel, and safety claims are all in place; `npm test`, `npm run typecheck`, and `npm run build:demo` all pass
- Ready for phase verification (01-05) to confirm the end-to-end visitor experience in a browser

---
*Phase: 01-demo-destination-panel-sample*
*Completed: 2026-08-05*

## Self-Check: PASSED
