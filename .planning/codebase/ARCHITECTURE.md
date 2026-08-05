# Architecture

**Analysis Date:** 2026-08-05

## Pattern Overview

**Overall:** Local-only browser CSV-to-eMoney holdings pipeline with human-in-the-loop review and manual entry.

**Key Characteristics:**
- No backend server or external APIs (except eMoney itself for entry)
- All processing occurs in the browser
- User manually controls every eMoney save operation
- Strict data boundary: clipboard-based transfer only, clears on session end
- Eligibility gates prevent blocked/ambiguous rows from being filled
- Designed for compliance and audit visibility (every row shown before entry)

## Layers

**CSV Ingestion & Parsing:**
- Purpose: Accept CSV holdings exports, auto-detect header, normalize and validate rows
- Location: `holdings-csv-parser.ts`
- Contains: Header detection, field mapping, CSV tokenization, duplicate detection, validation rules
- Depends on: `holdings-schema.ts` (types)
- Used by: `main.ts` (entry point) → `review-export-surface.ts`

**Data Model & Schema:**
- Purpose: Define all types and interfaces for holdings, accounts, issues, ingestion metadata
- Location: `holdings-schema.ts`
- Contains: `HoldingsIngestionFile`, `AccountRecord`, `HoldingRecord`, `Issue`, `ReviewStatus`, `EntryStatus`, `RunLog`
- Depends on: Nothing
- Used by: All other modules

**Review & Eligibility Layer:**
- Purpose: Display parsed holdings, compute eligibility, gate blocked rows from export
- Location: `review-export-surface.ts`
- Contains: Eligibility logic, UI rendering, pre-flight checks, holding-to-display transformation
- Depends on: `holdings-schema.ts`, `paste-conductor.ts`
- Used by: `main.ts` (shell renders it)

**Fill Packet & Paste Conductor:**
- Purpose: Serialize eligible holdings into transfer payloads (eMoney Fill Packet format)
- Location: `paste-conductor.ts`
- Contains: `BatchPastePayload`, `EmoneyFillPacket` serialization, field normalization for clipboard
- Depends on: `holdings-schema.ts`
- Used by: `review-export-surface.ts` (builds packets when operator requests copy)

**eMoney Browser Helper (Bookmarklet):**
- Purpose: DOM manipulation on live eMoney Holdings page; fills forms from clipboard payload
- Location: `emoney-browser-helper.ts`
- Contains: Selectors for eMoney fields, row snapshot capture, form fill logic, event dispatch
- Depends on: Nothing (runs in isolation on eMoney page)
- Used by: Injected via browser bookmarklet after packet is copied

**Styles & Theming:**
- Purpose: CSS-in-JS style system for browser UI (okLCH color palette, typography, spacing)
- Location: `ledger-styles.ts`
- Contains: CSS variables, default light theme, motion easing, responsive layout rules
- Depends on: Nothing
- Used by: `main.ts` (installed at app boot)

**Application Shell & Workflow:**
- Purpose: Main entry point; orchestrates CSV load, parsing, review render, session state
- Location: `main.ts`
- Contains: 4-step workflow stepper, landing page, file input handling, drag-drop, clipboard tracking
- Depends on: All other modules
- Used by: Build scripts generate `index.html` that imports this

## Data Flow

**Load & Parse Phase:**

1. User selects or drags CSV file → `main.ts` validates extension
2. `file.text()` reads CSV as string
3. `parseHoldingsCsvToIngestionFile(csvText)` (`holdings-csv-parser.ts`):
   - Split text by newlines, filter empty rows
   - Auto-detect header row by scoring field name matches
   - Build header-to-column map using `HEADER_ALIASES`
   - For each data row:
     - Repair unquoted thousands separators in numeric fields
     - Extract fields by mapped column position
     - Validate and normalize: numbers, dates, account types
     - Detect duplicates (CUSIP > ticker+desc > ticker+units > desc+units)
     - Flag cash rows, zero-price-with-value exceptions
     - Group holdings by account number
   - Aggregate account-level and file-level issues
   - Return typed `HoldingsIngestionFile` with full validation metadata

**Review & Eligibility Phase:**

1. `renderReviewExportSurface(container, ingestionFile)` (`review-export-surface.ts`):
   - For each account, call `buildAccountPreflightSummary()` to count eligible/blocked holdings
   - Render holdings table with visual status indicators (✓ ok, ⚠ review, ✕ block)
   - For each holding, call `getHoldingEligibility()`:
     - Check for ticker/CUSIP (required lookup key)
     - Check for blocking issues (severity=error or blocking=true)
     - Check for manual-review codes (duplicates, format errors, unmapped types, cash, zero-price)
     - Return eligibility verdict + reason strings + codes
   - Show counts: eligible, blocked, warnings
   - Display full issue messages and field callouts

**Packet Preparation Phase:**

1. Operator clicks "Copy eMoney Fill Packet"
2. `toAssistantPayloadForAccount()` filters holdings to eligible only
3. `buildBatchPastePayload()` formats for clipboard:
   - Serialize ticker, units, cost basis (skipping market value)
   - Format numbers as tab-separated rows
4. `serializeEmoneyFillPacket()` wraps in versioned JSON schema
5. Copy to clipboard via `navigator.clipboard.writeText()`
6. `clearMatchingClipboard()` on session clear only removes if still matched

**Fill on eMoney Page:**

1. Operator navigates to eMoney Holdings page
2. Operator clicks bookmarklet (loads `emoney-browser-helper.ts` code)
3. Bookmarklet reads clipboard, parses `EmoneyFillPacket` JSON
4. For each row in packet:
   - Click "Add a Holding" button
   - Find newest ticker input field
   - Locate units and cost basis fields by offset from ticker
   - Set ticker, wait for eMoney autolookup (1.2s delay)
   - Set units and cost basis
   - Loop to next row
5. Operator manually clicks Save in eMoney (not automated)

**State Management:**

- `HoldingsIngestionFile` is immutable once parsed
- Browser session state tracks: loaded file, last clipboard text, workflow step
- On "Clear session": clears DOM, resets file input, clears clipboard (if unmodified), resets workflow step
- No persistence layer; page refresh = session lost

## Key Abstractions

**Issue System:**
- Purpose: Represent every validation/lookup/entry failure with code, severity, source, and blocking status
- Examples: `holdings-schema.ts` Issue type; usage in `holdings-csv-parser.ts` (validation rules) and `review-export-surface.ts` (eligibility gating)
- Pattern: Issues are collected at row, account, and file level; top-level review status reflects any issue presence

**Eligibility Gates:**
- Purpose: Declaratively block rows from export without removing them from review
- Examples: `getHoldingEligibility()` function in `review-export-surface.ts`
- Pattern: Check lookup key presence → check blocking issues → check manual review codes → return verdict + reasons

**Field Aliases & Header Detection:**
- Purpose: Handle CSV column name variation (Symbol vs Ticker, Shares vs Quantity, etc.)
- Examples: `HEADER_ALIASES` map in `holdings-csv-parser.ts` with normalized aliases for each canonical field
- Pattern: Normalize to lowercase, remove punctuation/spaces; score by match count; pick highest-scoring header

**Fill Packet Schema Versioning:**
- Purpose: Support future clipboard format changes while maintaining compatibility
- Examples: `EmoneyFillPacket` with `schemaVersion: 'emoney-fill-packet/v1'` in `paste-conductor.ts`
- Pattern: Header includes version; bookmarklet checks version before deserializing

## Entry Points

**Browser App Entry:**
- Location: `main.ts` exports `renderLocalMvpShell(root)`
- Triggers: Called by `demo-dist/index.html` script tag
- Responsibilities: Render entire UI shell, install styles, wire file input and drag-drop, manage session workflow

**Bookmarklet Entry:**
- Location: `emoney-browser-helper.ts` (bundled separately)
- Triggers: Operator clicks bookmark on eMoney Holdings page
- Responsibilities: Read clipboard, parse fill packet, auto-fill form fields, dispatch events

**Tauri Desktop Entry:**
- Location: `src-tauri/src/main.rs` (optional)
- Triggers: User launches desktop app
- Responsibilities: Host browser build in Tauri webview, provide desktop-specific features (file dialog, clipboard)

## Error Handling

**Strategy:** Defensive validation at CSV ingestion; graceful degradation in UI; no throwing required at entry.

**Patterns:**

- **CSV Parsing:** Every invalid row → issue object (non-blocking); skip total rows; preserve unmapped account types as warnings
- **Eligibility Check:** Blocking issues accumulate in `blockedIssueCodes` array; UI shows all reasons
- **Field Lookup:** Missing field → null value (nullable types throughout schema); display empty string in UI
- **Bookmarklet:** Try-catch wraps each row fill; stops on first failure; logs error to console; operator completes manually
- **Clipboard Access:** Wrapped in try-catch; graceful fallback if access denied (notify operator)

## Cross-Cutting Concerns

**Logging:** 
- `RunLog` structure in schema tracks phase, severity, account/holding context
- Logged at file ingestion and per-holding; available for export/audit
- No external logging service; runs locally

**Validation:**
- At ingestion: CSV header detection, field type normalization, duplicate detection
- At export: Eligibility gates (blocking issues, manual review flags, missing lookup keys)
- Validation rules declared in `holdings-csv-parser.ts`; displayed in UI via `review-export-surface.ts`

**Authentication:**
- None. Local browser processing only; eMoney login is out-of-scope (operator already authenticated on eMoney page)

**Data Privacy:**
- No network transmission from demo build
- Clipboard used for inter-process transfer only
- Session state cleared on operator request (also clears clipboard if still owned by this session)
- Portable build uses restrictive Content Security Policy

---

*Architecture analysis: 2026-08-05*
