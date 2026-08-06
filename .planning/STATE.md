# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-05)

**Core value:** No holdings row reaches eMoney without a human seeing its verdict first.
**Current focus:** Phase 1 (Demo Destination Panel & Sample) / Phase 2 (Verdict Engine Hardening) — no cross-dependency, either can start first; demo lands first as the recruiter-visible artifact

## Current Position

Phase: 1 of 3 (Demo Destination Panel & Sample)
Plan: 9 of 9 in current phase
Status: In progress — checkpoint closed on delegated authority, human browser sign-off pending
Last activity: 2026-08-06 — Plan 01-05 (seven rounds of human-verification defect closure on the guided demo tour) closed

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 7
- Average duration: 13.9 min
- Total execution time: 1.6 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-|-|-|-|
| 01-demo-destination-panel-sample | 7 | 98 min | 14 min |

**Recent Trend:**
- Last 5 plans: 01-03 (12 min, 3 tasks, 5 files), 01-04 (20 min, 3 tasks, 4 files), 01-06 (12 min, 3 tasks, 3 files), 01-07 (12 min, tasks per SUMMARY), 01-08 (12 min, 2 tasks, 2 files)
- Trend: stable

*Updated after each plan completion*
| Phase 01 P09 | 25min | 3 tasks | 3 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table. Recent decisions affecting current work:

- Roadmap: Phase 1 (demo panel + sample) and Phase 2 (verdict hardening) have no dependency on each other — parallelizable per config.json
- Roadmap: demo work leads (Phase 1) because it's the recruiter-visible artifact; verdict hardening (Phase 2) is real work but invisible on the demo page
- Roadmap: Phase 3 (verification) depends on Phase 1's demo flow existing, so it runs last
- [Phase 01-demo-destination-panel-sample]: Demo sample: blocked row keeps a description so the parser doesn't drop it as an empty line, while leaving Symbol blank to trigger MISSING_LOOKUP_KEY
- [Phase 01-demo-destination-panel-sample]: Build stamp omits the inline __BUILD_INFO__ script entirely (rather than a placeholder) when git metadata can't be resolved, so main.ts's existing "Build dev" fallback stays honest
- [Phase 01-demo-destination-panel-sample]: runDemoFill deliberately has no eMoney-host guard (unlike isApprovedEmoneyLocation) because it only ever drives an element the demo page itself created; the real bookmarklet's guard stays untouched
- [Phase 01-demo-destination-panel-sample]: runDemoFill never looks for or clicks Save — Save stays a human click, enforced by a test slicing the function body
- [Phase 01-demo-destination-panel-sample]: onFillPacketReady is fired at the end of renderTransferPacket (not a separate event system) so the override checkbox's existing re-render automatically re-fires the demo handoff
- [Phase 01-demo-destination-panel-sample]: destinationRoot hide/reset logic centralized in hideDestinationPanel(), shared by Clear session and by re-running the demo
- [Phase 01]: runFillIntoPanel is the sole call site for runDemoFill so future consumers reuse the reset behavior for free
- [Phase 01-06]: DMOL (zero-price row) placed alongside the $CASH$ row in account 2 so override ON/OFF exercises both manual-review codes in one demo run
- [Phase 01-08]: buildDemoTourSteps kept pure (no DOM/timers) and colocated with WorkflowStep/demoRunStepOrder in main.ts; tour copy derives all counts from the real demo sample rather than literals
- [Phase 01-09]: packetsByAccount keyed by accountNumber fixes the onFillPacketReady last-writer-wins bug; demoRunStepOrder deleted outright (superseded by buildDemoTourSteps, no remaining callers)
- [Phase 01-05]: Tour card rebuilt as a fixed viewport dock (not sticky) because sticky cannot fix a card whose DOM slot sits below its subject
- [Phase 01-05]: Scroll-reserve blip fixed by predicting the settled scrollable range up front instead of reserving-then-retracting layout space, root-caused via in-page instrumentation
- [Phase 01-05]: Roboto bundled locally as an inlined base64 variable woff2 because a passing test forbids remote font services
- [Phase 01-05]: Checkpoint closed on delegated authority with orchestrator-measured Playwright evidence against c5266db; human browser sign-off still pending

### Pending Todos

None yet.

### Blockers/Concerns

- TRST-03: GitHub Pages URL will contain "Injector" via the repo name `emoney-holdings-injector`; intended fix is a repo rename to `emoney-holdings-entry-assistant`, blocked by a hardcoded VC policy preventing remote/ref-writing operations
- Ten local commits from 01-05 (`004af2c`..`c5266db`) have not been pushed; local main and origin/main are in sync at the pre-round state

## Session Continuity

Last session: 2026-08-06
Stopped at: Completed 01-05-PLAN.md (checkpoint closed on delegated authority; human browser sign-off still pending)
Resume file: None
