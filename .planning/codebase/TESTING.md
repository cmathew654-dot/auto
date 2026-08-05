# Testing Patterns

**Analysis Date:** 2026-08-05

## Test Framework

**Runner:**
- Node's native `node:test` module (built-in, no external test runner)
- Version: ES2020 target via `tsconfig.test.json`
- Config: `C:\Users\Cyril\Projects\emoney-holdings-injector\tsconfig.test.json`

**Assertion Library:**
- `node:assert/strict` (built-in, strict equality enforcement)

**Run Commands:**
```bash
npm test              # Compile TypeScript sources and run all tests via node --test
npm run typecheck     # Type-check without running
```

The full test command from `package.json`:
```
tsc -p tsconfig.test.json && node --test holdings-csv-parser.test.cjs review-export-surface.test.cjs paste-conductor.test.cjs emoney-browser-helper.test.cjs session-privacy.test.cjs portfolio-public.test.cjs
```

## Test File Organization

**Location:**
- Co-located with source files in repository root (not a separate `tests/` directory)
- Compiled sources go to `.test-dist/` during test run

**Naming:**
- Pattern: `{module}.test.cjs`
- Examples: `holdings-csv-parser.test.cjs`, `emoney-browser-helper.test.cjs`, `session-privacy.test.cjs`

**Test Files:**
| File | Purpose |
|-|-|
| `holdings-csv-parser.test.cjs` | CSV parsing, normalization, header detection, issue flagging |
| `review-export-surface.test.cjs` | UI surface preflight checks, eligibility determination |
| `paste-conductor.test.cjs` | Bookmarklet generation, serialization, clipboard behavior |
| `emoney-browser-helper.test.cjs` | Browser DOM manipulation, field matching, upsert operations |
| `session-privacy.test.cjs` | **Privacy-critical: Validates data isn't exposed in logs/output** |
| `portfolio-public.test.cjs` | **Product identity-critical: Validates public-facing claims** |

**CRITICAL TEST COVERAGE — Privacy & Product Identity:**

### `session-privacy.test.cjs`
Guards against leaking sensitive data. Tests:
1. **clearMatchingClipboard** - verifies clipboard is cleared only if content matches the session payload (privacy-preserving)
2. **Privacy in engineering fallback** - generated devtools snippet must log counts (`completedCount`, `failedCount`) but NOT row data or errors
3. **Privacy in bookmarklet** - generated fill button script must log "rows added" count but NOT tickers, result rows, or errors
4. **Product naming in public demo** - `main.ts` uses "Holdings Entry Assistant", NOT "eMoney Holdings Injector"
5. **No remote font services** - `scripts/build-demo.mjs` must not include googleapis or gstatic fonts

Assertions:
```javascript
assert.doesNotMatch(snippet, /console\.table/);
assert.doesNotMatch(snippet, /console\.(?:log|warn|error)\([^)]*,\s*(?:rows|row|results|err)\b/i);
assert.match(snippet, /completedCount/);
assert.match(snippet, /failedCount/);
```

### `portfolio-public.test.cjs`
Guards product identity and privacy language. Tests:
1. **README identity** - Title is "# Holdings Entry Assistant" (not "eMoney Holdings Injector")
2. **README privacy language** - Must state "does not send holdings data to a project server" and "Save.*manual"
3. **README forbidden phrases** - Forbids: "safe for real client data", "production-ready", "enterprise-ready", "internally deployed", "CTO-requested", "firm-approved", "nothing leaves this machine", "Fidelity's financial planning platform"
4. **Origin story honesty** - `docs/how-it-started.md` labels reconstruction honestly and explains originals not retained
5. **Interview form isolation** - `portfolio/intake-reconstruction.html` has no form submission endpoint, no fetch/XMLHttpRequest, no external fonts
6. **Safety documentation** - `DISCLAIMER.md` and `SECURITY.md` present with appropriate language ("independent", "not endorsed", "authorized data", "do not include.*real")

Assertions:
```javascript
assert.match(readme, /^# Holdings Entry Assistant/m);
for (const phrase of forbidden) assert.doesNotMatch(readme, new RegExp(phrase, 'i'));
assert.doesNotMatch(interview, /<form[^>]+action=/i);
assert.doesNotMatch(interview, /fetch\(|XMLHttpRequest|fonts\.googleapis|fonts\.gstatic/i);
```

## Test Structure

**Suite Organization:**
Tests are flat (no nested describe blocks). Each test is independent.

```javascript
const test = require('node:test');
const assert = require('node:assert/strict');

const { parseHoldingsCsvToIngestionFile } = require('./.test-dist/holdings-csv-parser.js');

function parse(csv) {
  return parseHoldingsCsvToIngestionFile(csv, { fileId: 'test-file' });
}

test('parses a basic happy-path holdings CSV', () => {
  const csv = [
    'Account Number,Account Type,Symbol,CUSIP,Security Name,Shares,Market Value,Cost Basis,Acquisition Date',
    '123,Taxable Brokerage,VTI,,Vanguard Total Stock Market ETF,100,25000,20000,2022-05-15',
  ].join('\n');

  const result = parse(csv);
  assert.equal(result.accounts.length, 1);
  assert.equal(result.accounts[0].holdings.length, 1);

  const holding = result.accounts[0].holdings[0];
  assert.equal(holding.ticker, 'VTI');
  assert.equal(holding.marketValue, 25000);
  assert.equal(holding.entryStatus, 'queued');
});
```

**Patterns:**
- Helper functions for common setup (e.g., `parse()`, `makeRow()`) defined at module level
- Each test is a simple `test('name', () => { ... })` or `test('name', async () => { ... })`
- No setup/teardown fixtures; state is restored by each test's cleanup

## Mocking

**Framework:** Inline fake objects (no mocking library)

**Patterns:**
- Create simple class stubs: `FakeInput`, `FakeRow` in `emoney-browser-helper.test.cjs`
- Override global objects temporarily in a helper: `withFakeDom(rows, async fn)`
- Restore globals in finally block

Example from `emoney-browser-helper.test.cjs`:
```javascript
class FakeInput {
  constructor(name, value = '') {
    this.name = name;
    this.value = value;
    this.disabled = false;
    this._attrs = {};
  }
  focus() {}
  blur() {}
  dispatchEvent() { return true; }
  getAttribute(key) { return this._attrs[key] ?? null; }
  setAttribute(key, val) { this._attrs[key] = val; }
}

function withFakeDom(rows, fn) {
  const original = {
    document: global.document,
    Event: global.Event,
    // ... save all globals that will be stubbed
  };

  global.document = { querySelectorAll: (selector) => (selector === '#holdingsTable > tr' ? rows : []) };
  global.Event = class Event { constructor(type) { this.type = type; } };
  // ... set up fake globals

  return Promise.resolve()
    .then(fn)
    .finally(() => {
      // Restore all globals
      global.document = original.document;
      // ...
    });
}
```

**What to Mock:**
- DOM elements and browser APIs when testing headless utilities
- Global objects (document, Event, setTimeout) for browser-dependent code
- Clipboard API with controllable read/write methods

**What NOT to Mock:**
- CSV parser input data (use real CSV strings)
- Schema validation and issue tracking (test the real logic)
- File reading in portfolio tests (read real files from disk)

## Fixtures and Factories

**Test Data:**
- Simple payload factory functions: `payload()` in `session-privacy.test.cjs` returns test holding data
- CSV strings built inline for readability: `.join('\n')` to build multi-line test input
- Realistic data preserved: Uses real ticker symbols (VTI, MSFT, AAPL), real CUSIPs where appropriate

Example from `session-privacy.test.cjs`:
```javascript
function payload() {
  return {
    accountId: 'acct-private-sentinel',
    accountNumber: 'PRIVATE-ACCOUNT-9981',
    accountType: 'Taxable',
    holdings: [{
      ticker: 'PRIVATE-TICKER-XYZ',
      cusip: null,
      description: null,
      units: 17,
      costBasis: 2468,
      marketValue: 3000,
    }],
  };
}
```

**Location:**
- Defined inline in test files (no shared fixture libraries)
- Kept minimal and descriptive
- Real CSV samples in holdings tests; sentinel values (PRIVATE-*) in privacy tests

## Coverage

**Requirements:** None enforced (no coverage threshold)

**View Coverage:** No coverage tooling configured

## Test Types

**Unit Tests:**
- **Scope:** Single function or small module behavior
- **Approach:** Pass test data, assert output matches expectation
- **Examples:**
  - `normalizeHeader()` and `normalizeNumber()` behavior
  - `parseHoldingsCsvToIngestionFile()` with various CSV formats
  - `findMatchingRow()` matching logic
  - Issue flag generation (`DUPLICATE_HOLDING`, `UNMAPPED_ACCOUNT_TYPE`, etc.)

**Integration Tests:**
- **Scope:** Multiple modules working together
- **Approach:** Parse CSV end-to-end, verify account/holding structure, check preflight gates
- **Examples:**
  - `holds CSV with preamble rows` - header detection + parsing
  - `keeps holding/account IDs stable when rows are interleaved` - full ingestion flow
  - `computes top-level reviewStatus from file + account + holding issues` - status aggregation

**System/Contract Tests:**
- **Scope:** Public API contracts and product claims
- **Approach:** File-level assertions on real artifacts
- **Examples:**
  - Privacy tests reading generated snippets/bookmarklets
  - Portfolio tests reading real README, DISCLAIMER, SECURITY files
  - No submission endpoint in interview form

## Common Patterns

**Async Testing:**
```javascript
test('clearMatchingClipboard clears only the payload written by this session', async () => {
  const writes = [];
  const result = await clearMatchingClipboard('session payload', {
    readText: async () => 'session payload',
    writeText: async (value) => writes.push(value),
  });

  assert.equal(result, 'cleared');
  assert.deepEqual(writes, ['']);
});

test('ambiguous match hard-stops and requires human intervention', async () => {
  const rowA = makeRow({ cusip: '111111111', ticker: 'AAA' });
  const rowB = makeRow({ cusip: '111111111', ticker: 'BBB' });

  await withFakeDom([rowA, rowB], async () => {
    const result = await upsertHolding({ cusip: '111111111', units: 10, costBasis: 100 });
    assert.equal(result.ok, false);
    assert.equal(result.requiresHumanIntervention, true);
  });
});
```

**Validation/Issue Testing:**
```javascript
test('emits UNMAPPED_ACCOUNT_TYPE when account type cannot be normalized', () => {
  const csv = [
    'Account Number,Account Type,Symbol,Security Name,Shares',
    '123,Crypto Vault,VTI,Vanguard Total Stock Market ETF,100',
  ].join('\n');

  const result = parse(csv);
  const issueCodes = result.accounts[0].issues.map((x) => x.code);
  assert.ok(issueCodes.includes('UNMAPPED_ACCOUNT_TYPE'));
  assert.equal(result.accounts[0].accountType, 'Unknown');
});
```

**Regex Assertions (Privacy Guards):**
```javascript
test('generated bookmarklet logs counts but not tickers, result rows, or raw errors', () => {
  const script = buildEmoneyFillButtonScript();

  assert.doesNotMatch(script, /console\.table/);
  assert.doesNotMatch(script, /console\.(?:log|warn|error)\([^)]*(?:state\.results|results|ticker|err)/i);
  assert.match(script, /rows added/);
});
```

**File Content Assertions:**
```javascript
test('public README uses the portfolio identity and bounded privacy language', () => {
  const readme = fs.readFileSync('README.md', 'utf8');
  const forbidden = [
    'eMoney Holdings Injector',
    'safe for real client data',
    'production-ready',
    // ...
  ];

  assert.match(readme, /^# Holdings Entry Assistant/m);
  for (const phrase of forbidden) assert.doesNotMatch(readme, new RegExp(phrase, 'i'));
});
```

---

*Testing analysis: 2026-08-05*
