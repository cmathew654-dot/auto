---
status: diagnosed
phase: 01-demo-destination-panel-sample
source:
  - 01-01-SUMMARY.md
  - 01-02-SUMMARY.md
  - 01-03-SUMMARY.md
  - 01-04-SUMMARY.md
started: 2026-08-05
updated: 2026-08-05
---

## Current Test

number: 1
name: One-click four-stage run (recruiter walkthrough)
expected: |
  A visitor clicks one button and can follow all four pipeline stages —
  what is happening and why — ending on the filled destination panel.
awaiting: none (session closed, gaps recorded)

## Tests

### 1. One click, four stages
expected: Stepper visibly advances Load -> Review -> Prepare Fill Packet -> Fill, ending on stage 4
result: issue
reported: "All I do is run the full demo, and it was like 1 nanosecond later. Very unclear, like what the fuck is going on here" / after fix: "way too fucking fast still. not clear what's happening or why"
severity: blocker

### 2. Verdict mix visible on the review surface
expected: At least one ok, one review-gated, and one hard-blocked row; override flips the review row only
result: pass

### 3. Destination panel appears, neutral, no eMoney trade dress
expected: In-page panel with simulated banner, labeled fields, Save button
result: pass

### 4. Fill lands eligible rows only
expected: Only eligible rows appear in the panel; withheld count stated
result: issue
reported: "um....it's two holdings?" / "pressing add a holding keeps populating the same two random tickers over and over"
severity: major

### 5. Save confirmation never implies a real eMoney save
expected: Local-only confirmation copy
result: skipped
reason: Session stopped at gaps 1 and 4 before reaching Save

### 6. Safety model + build badge
expected: Browser-only processing, no project server, manual save, synthetic data; real short SHA + date
result: pass

## Summary

total: 6
passed: 3
issues: 2
pending: 0
skipped: 1

## Decisions (LOCKED — user decisions from UAT session, honor exactly)

- **Pacing model:** click-through guided tour. Each stage pauses with an explainer card
  (what just happened, what it proves) and a Next button. The visitor controls the pace.
  Rejected: slow autoplay, and autoplay-with-pause-control.
- **Sample shape:** two accounts, ~14 rows total, run **sequentially** in one tour —
  Account 1 clean (all rows eligible, fills straight through), Account 2 with exceptions
  (review-gated and hard-blocked rows). Rejected: side-by-side/simultaneous panes —
  halves the space and doubles the reading load.
- **Contrast is the point:** Account 1 establishes what "normal" looks like so Account 2's
  stops read as judgment rather than breakage. Per-account explanation lands after that
  account's fill completes, while the filled panel is still on screen.
- Audience is a recruiter clicking through a public GitHub demo with no context.

## Gaps

- truth: "A visitor can follow all four pipeline stages and understand what is happening and why"
  status: failed
  reason: "User reported: way too fucking fast still. not clear what's happening or why. It's not geared towards a recruiter going to my GitHub demo and clicking through it. Should we have, like, kind of a guided workflow? And slow it all the way down."
  severity: blocker
  test: 1
  root_cause: "The demo run is autoplay with ~400ms stage pacing and status lines that name the stage but never explain it. There is no per-stage explainer, no visitor-controlled advance, and no narration of why a given row was gated."
  artifacts:
    - path: "main.ts"
      issue: "sampleButton.onclick walks demoRunStepOrder on fixed timers; no explainer card, no Next control"
  missing:
    - "Click-through guided tour: per-stage explainer card stating what just happened and what it proves, advanced by a Next button"
    - "Stage copy written for a recruiter with no context, not for an operator who already knows the tool"
  debug_session: ""

- truth: "The demo sample is substantial enough to read as real custodial work"
  status: failed
  reason: "User reported: um....it's two holdings?"
  severity: major
  test: 4
  root_cause: "demo-sample.ts is a single account of 4 rows yielding only 2 eligible rows, so the fill lands two tickers and reads as a toy."
  artifacts:
    - path: "demo-sample.ts"
      issue: "4 rows, single account, 2 eligible — too thin to demonstrate scale or contrast"
  missing:
    - "Two-account synthetic sample, ~14 rows: Account 1 all-clean, Account 2 carrying review-gated and hard-blocked rows"
    - "Verdict-mix test updated to pin the per-account spread, keeping the 100%-synthetic guarantee (SMPL-03)"
  debug_session: ""

- truth: "Filling the destination panel twice does not duplicate rows"
  status: failed
  reason: "User reported: pressing add a holding keeps populating the same two random tickers over and over the whole thing"
  severity: major
  test: 4
  root_cause: "The fill control appends rows to the panel without resetting prior fill state, so each press re-adds the same eligible rows."
  artifacts:
    - path: "demo-destination-panel.ts"
      issue: "Panel accumulates filled rows across repeat fills"
    - path: "paste-conductor.ts"
      issue: "runDemoFill appends without clearing previously filled rows"
  missing:
    - "Repeat fill resets the panel to empty before re-filling, or the control is disabled once filled"
    - "Test pinning that two consecutive fills leave the same row count as one fill"
  debug_session: ""
