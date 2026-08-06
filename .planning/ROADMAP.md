# Roadmap: eMoney Holdings Entry Assistant

## Overview

The parse -> verdict -> packet -> bookmarklet pipeline already ships and passes
tests (Validated in PROJECT.md). v1 has two remaining jobs: finish the public
demo so a visitor can run the whole flow in one click and watch a simulated
destination page fill in-page, with no eMoney trade dress, and harden the
verdict engine against messy real-world CSV shapes. The demo is the
recruiter-visible artifact and lands first; verdict hardening is real work
but invisible on the demo page, so it follows. A final phase verifies the
finished demo end to end and confirms the full test suite, including the
naming and privacy guards, stays green.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Demo Destination Panel & Sample** - One-click demo fills an in-page simulated destination panel, gated by a mixed-verdict synthetic sample
- [ ] **Phase 2: Verdict Engine Hardening** - Verdict engine produces correct, actionable verdicts against messy CSV shapes
- [ ] **Phase 3: Verification & Public Surface Guards** - Headless check and full test suite confirm the demo and public surface are correct

## Phase Details

### Phase 1: Demo Destination Panel & Sample
**Goal**: A visitor can run the full four-stage pipeline in one click and watch the fill land on an in-page simulated destination panel, with the demo sample actually exercising the safety gates and no eMoney trade dress anywhere on the page.
**Depends on**: Nothing (builds on the existing shipped pipeline)
**Requirements**: DEMO-01, DEMO-02, DEMO-03, DEMO-04, DEMO-05, DEMO-06, DEMO-07, DEMO-08, SMPL-01, SMPL-02, SMPL-03, SMPL-04, TRST-01, TRST-02
**Success Criteria** (what must be TRUE):
  1. A visitor clicks a single button and watches all four pipeline stages run with no file upload, credentials, or setup.
  2. At stage 4, an in-page destination panel appears with neutral styling (no eMoney branding, logo, colors, or page title), a visible "simulated, not eMoney" banner, and labeled Ticker/CUSIP/Units/Cost Basis inputs plus a Save button, matched by visible label rather than element id.
  3. A demo Fill button drives the paste conductor directly with no bookmarklet install step, and the filled rows appear in a results table after the fill completes.
  4. The demo sample CSV yields at least one ok, one review, and one block verdict from synthetic data in the same run.
  5. Blocked rows are visibly withheld from the destination panel while only eligible rows land.
  6. The manual-review override control visibly has something to gate.
  7. Clicking Save in the panel shows a local confirmation that never implies a real eMoney save; the safety model (browser-only processing, no project server, manual save in eMoney, synthetic demo data) is legible from the page itself; the build badge shows the real short git SHA and date instead of "Build dev".
**Plans**: 9 plans

Plans:
- [ ] 01-01-PLAN.md — Synthetic demo sample with a real ok/review/block verdict mix
- [ ] 01-02-PLAN.md — Stamp the real git SHA and build date into the demo build badge
- [ ] 01-03-PLAN.md — Simulated destination panel + label-driven fill driver
- [ ] 01-04-PLAN.md — One-click four-stage run, packet handoff, withheld rows, safety copy
- [ ] 01-05-PLAN.md — Human browser verification of the assembled demo
- [ ] 01-06-PLAN.md — Two-account 14-row synthetic sample with a per-account verdict spread (gap closure)
- [ ] 01-07-PLAN.md — Repeat fills reset the destination panel instead of duplicating rows (gap closure)
- [ ] 01-08-PLAN.md — Guided-tour stage model and recruiter-legible explainer copy (gap closure)
- [ ] 01-09-PLAN.md — Click-through tour card, Next-driven stages, per-account fills (gap closure)

### Phase 2: Verdict Engine Hardening
**Goal**: The verdict engine handles messy real-world CSV shapes correctly, each backed by a fixture, a correct verdict, and an actionable reason string.
**Depends on**: Nothing (hardens the existing shipped pipeline; runs independent of Phase 1)
**Requirements**: VRDT-01, VRDT-02, VRDT-03, VRDT-04, VRDT-05, VRDT-06, VRDT-07
**Success Criteria** (what must be TRUE):
  1. A CSV with a shifted header row (preamble rows above the real header) still parses to the correct columns and produces correct verdicts.
  2. A row with a blank ticker is blocked with a reason string naming the missing lookup key; a row with an unknown or unmappable symbol is flagged for manual review instead of silently passed.
  3. A cash-only account produces a clear verdict on the review surface instead of an empty or misleading one.
  4. Duplicate rows are flagged with the specific matched duplicate key.
  5. Trailing footer/total rows are excluded without corrupting account grouping, and unexpected extra columns are tolerated without breaking header detection or field mapping.
**Plans**: TBD

### Phase 3: Verification & Public Surface Guards
**Goal**: The finished demo is verified end to end by an automated check, and the full test suite -- including naming and privacy guards -- stays green.
**Depends on**: Phase 1 (the demo flow must exist to be checked)
**Requirements**: VERI-01, VERI-02, TRST-03
**Success Criteria** (what must be TRUE):
  1. A headless browser check loads the built demo, runs the one-click flow, and asserts the sample's eligible tickers land correctly in the destination fields with zero console errors.
  2. `npm test` passes cleanly: `tsc` plus all `node --test` suites, including `portfolio-public.test.cjs` and `session-privacy.test.cjs`.
  3. The public surface never displays the string "Injector" anywhere reachable by a visitor.
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 (Phase 1 and Phase 2 have no dependency on each other and may be worked in parallel)

| Phase | Plans Complete | Status | Completed |
|-|-|-|-|
| 1. Demo Destination Panel & Sample | 8/9 | In Progress|  |
| 2. Verdict Engine Hardening | 0/TBD | Not started | - |
| 3. Verification & Public Surface Guards | 0/TBD | Not started | - |
