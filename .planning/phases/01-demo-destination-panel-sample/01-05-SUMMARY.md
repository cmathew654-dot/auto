---
phase: 01-demo-destination-panel-sample
plan: 05
subsystem: ui
tags: [guided-tour, demo-flow, typography, motion, human-verification]

# Dependency graph
requires:
  - phase: 01-demo-destination-panel-sample
    provides: One-click demo flow and destination panel (01-01 through 01-04, 01-06 through 01-09)
provides:
  - Seven rounds of defect closure against the assembled demo, driven by human browser verification
  - Fixed-viewport tour dock replacing sticky positioning
  - Character-by-character terminal transcript for visible-work steps
  - Predicted-range scroll fix eliminating the tour's document-height blip
  - Locally bundled Roboto woff2 (no remote font service)
  - Per-account closing session report
affects: [01-demo-destination-panel-sample public surface, Phase 3 verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fixed viewport dock (not sticky) for any UI element that must stay visible across a page whose DOM slot sits below its subject"
    - "Predict the settled scrollable range up front rather than reserving-then-retracting layout space, to avoid a visible scroll blip"
    - "Character-by-character terminal transcript for visible-work steps, naming real pipeline work with real derived counts (labor-illusion rationale: Buell & Norton, HBS)"

key-files:
  created: []
  modified:
    - main.ts (or equivalent tour/demo wiring — see commit diffs 004af2c..c5266db)
    - review-export-surface.ts
    - styles/demo tour CSS
    - fonts (Roboto woff2 bundled locally)
    - demo-sample.ts (real ticker symbols, fabricated accounts/positions)
    - associated pinned tests (synthetic-data claim, header badge, status tile, footer copy)

key-decisions:
  - "Checkpoint closed on delegated authority, not human browser sign-off — see Verification Status below"
  - "Tour card rebuilt as a fixed viewport dock instead of sticky, because sticky cannot fix a card whose DOM slot sits below its subject"
  - "Scroll-reserve retraction blip root-caused via in-page instrumentation (not guessed) and fixed by predicting the settled scrollable range up front instead of reserving-then-retracting"
  - "Roboto bundled locally as an inlined base64 variable woff2 (43KB) because a passing test forbids remote font services"
  - "Demo sample moved to real market ticker symbols with fabricated accounts/positions; every surface claim (pinned synthetic-data test, header badge, status tile, footer copy) updated to match"

requirements-completed: [DEMO-01, DEMO-02, DEMO-05, DEMO-06, DEMO-07, DEMO-08, SMPL-01, SMPL-04, TRST-01, TRST-02]

duration: overnight (seven rounds, unclocked)
completed: 2026-08-06
---

# Phase 1 Plan 5: Human Browser Verification & Defect Closure Summary

**Seven rounds of defect closure driven by human browser walkthrough of the one-click demo, closing tour visibility, motion, honesty, and font-bundling defects; checkpoint closed on delegated authority with orchestrator-measured Playwright evidence, human sign-off still pending.**

## Verification Status

This plan started as `checkpoint:human-verify` — a human watching the assembled demo in a real browser. Cyril walked it across seven rounds of feedback, then explicitly delegated closure: "treat this as a goal and not ask for anything from here on out, just assume you have permission... after you're done, just push it all," and went to sleep.

**What this SUMMARY certifies:** the checkpoint is closed on delegated authority, backed by orchestrator-run Playwright instrumentation (not agent self-report) against the final commit. **What it does not certify:** a human has not yet opened a browser and clicked "approved" against this final build. That sign-off is still outstanding.

## Defects Found and Fixed (seven rounds)

1. **Tour card below the fold** — no scroll-into-view on stage advance; rebuilt entirely as a fixed viewport dock, since sticky positioning cannot fix a card whose DOM slot sits below its subject.
2. **Premature success copy** — fill stage claimed "all 6 rows in account 900000001 landed" while the panel was still empty.
3. **Mobile clamp hiding a trust claim** — `-webkit-line-clamp: 1` silently hid "the file never leaves the browser" (measured clientHeight 0); replaced with a scrollable dock content area.
4. **Invisible highlight ring** — drawn in the same color as every static panel border; later still rounded when sharp corners were requested (CSS cascade tie), resolved with `!important`.
5. **Whip-fast motion** — no deceleration; rebuilt with distance-scaled eased scrolls, settle beats, and strict one-thing-at-a-time sequencing.
6. **Unreadable visible-work steps** — blinked past too fast; rebuilt as a character-by-character terminal transcript naming real pipeline work with real derived counts (labor-illusion rationale: Buell & Norton, HBS).
7. **Held rows never shown** — stage 5 ("a fill with holds") never displayed the held rows; split into its own Next-gated stage that scrolls to and marks them.
8. **Dead-end "Done" state** — abandoned the viewer mid-page; replaced with a closing beat that scrolls to top and types a per-account session report ending in a restrained summary line.
9. **Scroll-reserve blip** — a scroll-reserve retraction shrank the document under a settled scrollY, causing a visible jump; root-caused via 50ms in-page instrumentation and fixed by predicting the settled scrollable range up front.
10. **Typography churn** — Inter to serif to Roboto, bundled locally as an inlined base64 variable woff2 (43KB) because a passing test forbids remote font services.
11. **Stale demo data claims** — sample moved to real market ticker symbols with fabricated accounts/positions; pinned synthetic-data test, header badge, status tile, and footer copy all updated so no surface claims something untrue.

## Commits (oldest to newest)

`004af2c`, `4795e7b`, `7915a94`, `fdda172`, `a0f9874`, `eec4d6a`, `6eb41a0`, `9a8e66a`, `a1f293d`, `c5266db`

(A history rewrite by another session rehashed the repo between `eec4d6a` and `6eb41a0`; commit content is unaffected.)

## Final Measured State (orchestrator's own Playwright probes, 1440x900, against c5266db)

- Stage 1: click to typing 362ms; click to Next enabled 4745ms (was 8014ms at worst).
- Typing rate: ~11-12ms/char.
- Row landings 280-380ms apart at both fill stages.
- Dock clearance positive at every stage and closing: 24, 141, 36, 159, 37, 27, 25px.
- `.tour-highlight` computed `border-radius: 0px`.
- Held-rows stage: 0 scroll reversals at 40ms sampling; scroll decelerates 1813 to 889 with deltas tapering to 1px, while document height shrinks 3369 to 2822 without dragging the viewport.
- Closing report renders correctly: "14 rows processed across 2 accounts", "Account 900000001: 6 rows processed, 6 landed, 0 held", "Account 900000002: 8 rows processed, 5 landed, 3 held", per-row hold reasons (SPAXX cash, PFE zero-price, missing ticker), plus a summary line. No "(s)" pluralization artifacts.
- "Explore the full session" scrolls to page top; the report persists and the button closes it.
- 92/92 tests pass, typecheck clean, `build:demo` succeeds.

## Deviations from Plan

The plan's six numbered checks (DEMO-01 through TRST-02) were all eventually satisfied, but only after seven rounds of Rule 1/Rule 2 fixes (bugs and missing critical UX behavior) surfaced by the checkpoint itself — this is the intended function of a `checkpoint:human-verify` plan, not a deviation from it. No architectural (Rule 4) changes were required; all fixes were auto-fixable bug/UX corrections.

## Known Open Items (not fixed — recorded per instruction)

**(a) Repo name conflicts with TRST-03.** The GitHub Pages URL will contain the string "Injector" via the repo name `emoney-holdings-injector`, conflicting with the requirement that the public surface never display "Injector." README and docs already link to `emoney-holdings-entry-assistant`, so a repo rename is the intended fix. Blocked: a hardcoded VC policy prevents all remote/ref-writing operations until Cyril lifts it.

**(b) Nothing has been pushed.** Local `main` and `origin/main` are both in sync at the pre-round state; all ten commits of 01-05 work (`004af2c`..`c5266db`) are committed locally only.

## User Setup Required

None for the code itself. Outstanding: (1) a human browser sign-off against `c5266db` or later, (2) lifting the push-block policy so the ten local commits can reach `origin/main`, (3) the TRST-03 repo rename.

## Next Phase Readiness

Phase 1 plan count is 9/9 with this closure. Phase 3 (Verification & Public Surface Guards) depends on this demo flow existing and should re-check TRST-03 once the repo rename lands.

---
*Phase: 01-demo-destination-panel-sample*
*Completed: 2026-08-06*

## Self-Check: PASSED
