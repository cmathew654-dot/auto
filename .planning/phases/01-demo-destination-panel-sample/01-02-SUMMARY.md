---
phase: 01-demo-destination-panel-sample
plan: 02
subsystem: infra
tags: [build-script, git, provenance, node-test]

# Dependency graph
requires: []
provides:
  - "demo-dist/index.html carries a real window.__BUILD_INFO__ stamp (git short SHA + commit date) instead of the honest-but-fake 'Build dev' fallback"
  - "Test coverage guarding against a hardcoded/fake SHA ever being stamped into the build"
affects: [demo-destination-panel-sample, verification]

# Tech tracking
tech-stack:
  added: []
  patterns: ["spawnSync git subprocess resolution with layered fallback (git -> GITHUB_SHA env -> null/now)"]

key-files:
  created: []
  modified:
    - scripts/build-demo.mjs
    - portfolio-public.test.cjs

key-decisions:
  - "Omit the inline __BUILD_INFO__ script entirely when sha cannot be resolved, so main.ts's existing 'Build dev' fallback stays honest rather than stamping a placeholder"

patterns-established:
  - "Build-time provenance stamping: resolve via git subprocess first, environment variable fallback (CI shallow clone), and a safe absent/default value last — never fabricate the stamped value"

requirements-completed: [TRST-02]

# Metrics
duration: 15min
completed: 2026-08-05
---

# Phase 01 Plan 02: Real Build Stamp Summary

**scripts/build-demo.mjs now stamps window.__BUILD_INFO__ with the real short git SHA and commit date, replacing the always-false "Build dev" badge on the deployed demo**

## Performance

- **Duration:** 15 min
- **Started:** 2026-08-05T19:34:00Z
- **Completed:** 2026-08-05T19:49:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Build script resolves short git SHA via `git rev-parse --short HEAD`, falling back to `GITHUB_SHA` env var, then `null`
- Build script resolves commit timestamp via `git log -1 --format=%cI`, falling back to current time
- Inline `<script>` stamping `window.__BUILD_INFO__` is injected only when a real SHA resolves, preserving the honest "Build dev" fallback otherwise
- Test suite now asserts the resolution logic, the `__BUILD_INFO__` injection, the `GITHUB_SHA` fallback, and guards against a hardcoded fake SHA ever being stamped

## Task Commits

1. **Task 1: Stamp git SHA and build date into demo-dist/index.html** - `df2d1ea` (feat)
2. **Task 2: Assert the build stamp in portfolio-public.test.cjs** - `20457ce` (test)

**Plan metadata:** (this commit)

## Files Created/Modified
- `scripts/build-demo.mjs` - Added `resolveGit` helper and SHA/builtAt resolution with layered fallbacks; injects `window.__BUILD_INFO__` inline script before the module script when a SHA is available
- `portfolio-public.test.cjs` - Added a test asserting the build script resolves git metadata, stamps `__BUILD_INFO__`, has a `GITHUB_SHA` fallback, and never hardcodes a literal SHA

## Decisions Made
- Omitting the inline script (rather than stamping `null`/placeholder values) when git metadata is unavailable was chosen so `main.ts`'s existing fallback logic (`buildInfo?.sha ? ... : 'Build dev'`) continues to render an honest state instead of a broken or fake one.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test regex needed non-whitespace-only match for spawnSync arg array**
- **Found during:** Task 2 verification (`npm test`)
- **Issue:** The planned regex `/rev-parse\s+--short\s+HEAD/` assumed the source contained the literal string `rev-parse --short HEAD` with only whitespace between tokens, but `build-demo.mjs` passes them as separate array elements to `spawnSync` (`'rev-parse', '--short', 'HEAD'`), so `\s+` didn't match the intervening `', '` characters.
- **Fix:** Changed the regex to `/rev-parse.*--short.*HEAD/` to tolerate the array-literal syntax between tokens.
- **Files modified:** portfolio-public.test.cjs
- **Verification:** `npm test` — all 63 tests pass
- **Committed in:** 20457ce (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor test-regex correction; no scope creep, no behavior change to the build script.

## Issues Encountered
None beyond the auto-fixed regex above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Build stamp is real and verified end-to-end (`npm run build:demo` produced `demo-dist/index.html` with SHA `bd4bbb2` matching `git rev-parse --short HEAD` at build time)
- No blockers for subsequent plans in this phase

---
*Phase: 01-demo-destination-panel-sample*
*Completed: 2026-08-05*

## Self-Check: PASSED
