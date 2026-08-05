# Coding Conventions

**Analysis Date:** 2026-08-05

## Naming Patterns

**Files:**
- TypeScript source: `camelCase.ts` (e.g., `holdings-csv-parser.ts`, `emoney-browser-helper.ts`)
- Test files: `camelCase.test.cjs` (e.g., `holdings-csv-parser.test.cjs`)
- Configuration: `tsconfig.test.json` for test-specific compilation settings
- Entry points: `main.ts`, `index.*` for module exports

**Functions:**
- camelCase for all function names
- Action-verb prefix: `parse*`, `normalize*`, `build*`, `find*`, `upsert*` (e.g., `parseHoldingsCsvToIngestionFile`, `findMatchingRow`, `upsertHolding`)
- Helper functions that compute/normalize data: `normalize*` (e.g., `normalizeHeader`, `normalizeAccountType`, `normalizeNumber`)
- Predicate functions: `is*` or `looks*` (e.g., `isValidIsoDate`, `isBlankRow`, `looksLikeTotalRow`)

**Variables:**
- camelCase for all variable names and properties
- Boolean flags prefixed with `is`, `has`, `can`, or `should` (e.g., `inQuotes`, `blockedIssueCodes`, `requiresManualOverride`)
- Collection names pluralized or suffixed: `rows`, `issues`, `holdings`, `accounts`, `headerMap`, `normalizedCells`
- Status/state variables: explicit status suffixes (e.g., `reviewStatus`, `entryStatus`, `matchStatus`)
- Acronyms preserved uppercase when appropriate: `CUSIP`, `SAMPLE_CSV_INPUT`, `MANUAL_REVIEW_REQUIRED_CODES`

**Types:**
- PascalCase for all type/interface names (e.g., `HoldingRecord`, `AccountRecord`, `ReviewStatus`, `EntryStatus`)
- Discriminated union types for domain models: `type ReviewStatus = 'unreviewed' | 'in_review' | 'approved' | 'rejected'`
- Interface names: no `I` prefix (e.g., `HoldingsIngestionFile` not `IHoldingsIngestionFile`)
- Type aliases for complex fields: `type CanonicalField = '...'` to enumerate valid field names
- Branded types for IDs: `fileId: string`, `accountId: string`, `holdingId: string` (documented in schema)

## Code Style

**Formatting:**
- No dedicated linter/formatter config files in repository
- Manual formatting following these patterns:
  - 2-space indentation (observed in source)
  - Line continuations aligned with opening delimiter
  - Multi-line objects/arrays: one property per line for readability
- Semicolons required at end of statements
- Single quotes for strings (observed in test imports and string literals)
- Template literals for dynamic strings where appropriate

**Linting:**
- No ESLint or Prettier configuration active
- TypeScript strict mode NOT enabled (`"strict": false` in `tsconfig.test.json`)
- `skipLibCheck: true` to avoid node_modules type checking
- Target: `ES2020` for both runtime and tests

**Type Safety:**
- TypeScript used for source files (`.ts`)
- Tests compiled to CommonJS (`.test.cjs`) via `tsconfig.test.json`
- Import statements include explicit `type` keyword for type-only imports: `import type { HoldingsIngestionFile } from './holdings-schema'`
- Partial types used for optional mappings: `Partial<Record<CanonicalField, number>>`

## Import Organization

**Order:**
1. Node built-in modules (e.g., `import test from 'node:test'`)
2. Type-only imports grouped together: `import type { ... } from './module'`
3. Value imports (functions, constants): `import { parseHoldingsCsvToIngestionFile } from './holdings-csv-parser'`
4. Mixed imports: types first in the destructure list

**Example from `holdings-csv-parser.test.cjs`:**
```typescript
const test = require('node:test');
const assert = require('node:assert/strict');

const { parseHoldingsCsvToIngestionFile } = require('./.test-dist/holdings-csv-parser.js');
```

**Example from `review-export-surface.ts`:**
```typescript
import type { AccountRecord, HoldingRecord, HoldingsIngestionFile, Issue } from './holdings-schema';
import type { BrowserHoldingInput } from './emoney-browser-helper';
import {
  buildBatchPastePayload,
  buildEmoneyFillBookmarklet,
  buildEmoneyFillPacket,
  serializeEmoneyFillPacket,
  type BatchPastePayload,
  type EmoneyFillPacket,
} from './paste-conductor';
```

**Path Aliases:**
- Relative imports only (no path aliases configured)
- Sibling modules imported as `'./module-name'`
- Files in `.test-dist/` used by tests after compilation

## Error Handling

**Patterns:**
- Domain-specific `Issue` type for validation/parsing errors: `src/holdings-schema.ts` defines the schema
- Issues stored alongside domain objects (not thrown): holdings have `.issues: Issue[]`, accounts have `.issues: Issue[]`
- Error codes as discriminated union: `code: 'INVALID_FORMAT' | 'LOOKUP_AMBIGUOUS' | 'DUPLICATE_HOLDING'` etc.
- Helper function `toIssue()` in `src/holdings-csv-parser.ts` to create consistent issues:
  ```typescript
  function toIssue(
    message: string,
    source: Issue['source'],
    code: Issue['code'] = 'VALIDATION_WARNING',
    blocking = false,
    field?: Issue['field']
  ): Issue {
    return {
      code,
      severity: blocking ? 'error' : 'warning',
      message,
      field,
      source,
      blocking,
      createdAt: new Date().toISOString(),
    };
  }
  ```

**Privacy-aware error handling:**
- Errors logged with counts/codes only, never with sensitive data (tickers, account numbers, holdings data)
- See `session-privacy.test.cjs` for validation of this pattern
- Engineering fallback logs `completedCount` and `failedCount`, not row data
- Bookmarklet logs "rows added" count, not ticker symbols or result rows

**Human intervention:**
- Results use `ok: boolean` flag and `requiresHumanIntervention: boolean`
- Ambiguous matches return `{ ok: false, requiresHumanIntervention: true, reasonCode: 'AMBIGUOUS_MATCH', candidateCount: N }`

## Logging

**Framework:** console methods (console.log, console.warn, console.error) only

**Patterns:**
- Status/progress messages only (not data)
- Used in UI state transitions: `setStatus(element, 'message', 'success' | 'error' | 'info')`
- Timestamps in ISO-8601 format when recorded: `createdAt: new Date().toISOString()`
- Run logs aggregate counts, not row-level details
- Demo/portable tests output progress only; never output holdings data, tickers, or account numbers

**Where to log:**
- UI transitions (loading, parsing, preflight checks): via `setStatus()` in `main.ts`
- Batch operations: aggregate counts in `RunLog.events` array
- Never in generated snippets or exported bookmarklets (privacy-critical)

## Comments

**When to Comment:**
- Non-obvious algorithm logic (e.g., CSV header detection heuristic)
- Data privacy constraints and why they matter
- Mapping between raw input formats and internal schemas
- Workarounds for edge cases (e.g., thousands separators in unquoted CSV fields)

**JSDoc/TSDoc:**
- Used sparingly; code is self-documenting where possible
- File-level comments for module purpose (e.g., `review-export-surface.ts`)
- Inline comments for complex conditionals or validation logic
- No parameter/return type comments (TypeScript handles this)

**Example from `holdings-csv-parser.ts`:**
```typescript
/**
 * Review and export surface for the browser workflow.
 * It prepares operator-controlled payloads and never triggers an eMoney Save action.
 */

// Repairs row tokenization when CSV numeric/currency values contain unquoted thousands commas
// (e.g., $25,000) so downstream column mapping stays aligned with detected header positions.
function repairUnquotedThousandsSeparators(
  row: string[],
  expectedLength: number,
  headerMap: Partial<Record<CanonicalField, number>>
): string[] {
  // ...
}
```

## Function Design

**Size:**
- Small, focused functions (most < 20 lines)
- Parser helpers like `normalizeHeader()`, `getCell()`, `parseCsvLine()` are single-responsibility
- Complex operations split into sub-functions: `detectHeaderRow()`, then `buildHeaderMap()`, then cell extraction

**Parameters:**
- Immutable inputs preferred: functions take values, return new objects
- Options objects for optional parameters: `interface LocalMvpOptions { sourceFilename?: string; ... }`
- Generics used for discriminated unions: `Issue['code']`, `Issue['field']`, `Issue['source']`

**Return Values:**
- Explicit return types on all functions
- Nullable returns marked: `string | null`, `number | null`
- Result objects for operations with side effects: `{ ok: boolean, errors: string[], ...details }`
- Status values: `'unique' | 'ambiguous' | 'not_found'` discriminated unions

**Example from `emoney-browser-helper.ts`:**
```typescript
function findMatchingRow(criteria: Partial<BrowserHoldingInput>): 
  { status: 'unique' | 'ambiguous' | 'not_found'; matchType?: string; candidateCount?: number } {
  // ...
}

async function upsertHolding(input: BrowserHoldingInput): 
  Promise<{ ok: boolean; errors: string[]; requiresHumanIntervention?: boolean; reasonCode?: string }> {
  // ...
}
```

## Module Design

**Exports:**
- Explicit named exports (no default exports)
- Type exports prefixed with `type`: `export type ReviewStatus = '...'`
- Functions grouped by domain: parser functions in `holdings-csv-parser.ts`, browser helpers in `emoney-browser-helper.ts`
- Schema definitions centralized in `holdings-schema.ts`

**Barrel Files:**
- Not used; imports are direct module references
- Tests import from `.test-dist/compiled-module.js`

**Organization by layer:**
- **Data Schema:** `holdings-schema.ts` (types, interfaces, sample data)
- **Ingestion:** `holdings-csv-parser.ts` (CSV parsing, normalization, validation)
- **Browser Integration:** `emoney-browser-helper.ts` (DOM interaction, field mapping)
- **Review/Export:** `review-export-surface.ts` (preflight checks, UI surface)
- **Clipboard/Scripting:** `paste-conductor.ts` (bookmarklet generation, serialization)
- **UI Styling:** `ledger-styles.ts` (CSS injection, visual framework)
- **Entry Point:** `main.ts` (orchestration, workflow state)

## Privacy & Product Naming Conventions

**Critical:** See `session-privacy.test.cjs` and `portfolio-public.test.cjs` for enforcement of:
- Public demo uses "Holdings Entry Assistant" (not "eMoney Holdings Injector")
- No remote font services in public demo
- Logging never exposes tickers, account numbers, or holdings data
- README forbidden words: "safe for real client data", "production-ready", "enterprise-ready", "nothing leaves this machine"
- Interview form has no submission endpoint or external API calls

These are enforced by test assertions and must remain valid during code changes.

---

*Convention analysis: 2026-08-05*
