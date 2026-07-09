/**
 * Human review lifecycle state.
 * - reviewStatus answers: "Has a person reviewed/approved this item?"
 */
export type ReviewStatus = 'unreviewed' | 'in_review' | 'approved' | 'rejected';
/**
 * Data entry lifecycle state.
 * - entryStatus answers: "Where is this item in eMoney entry/lookup processing?"
 */
export type EntryStatus =
  | 'not_started'
  | 'queued'
  | 'lookup_in_progress'
  | 'lookup_resolved'
  | 'entered'
  | 'needs_human'
  | 'failed';

export type Severity = 'info' | 'warning' | 'error';

export interface Issue {
  /**
   * Machine-readable issue category.
   * Notes for common handoff confusion:
   * - VALIDATION_WARNING: non-blocking quality concern
   * - INVALID_FORMAT: value shape/type could not be parsed
   * - LOOKUP_*: eMoney identifier/lookup outcomes
   * - UNMAPPED_ACCOUNT_TYPE: raw account type did not match local normalization map
   */
  code:
    | 'MISSING_REQUIRED_FIELD'
    | 'INVALID_FORMAT'
    | 'LOOKUP_AMBIGUOUS'
    | 'LOOKUP_NOT_FOUND'
    | 'AUTOFILL_MISMATCH'
    | 'DOM_WRITE_FAILURE'
    | 'VALIDATION_WARNING'
    | 'MANUAL_OVERRIDE'
    | 'DUPLICATE_HOLDING'
    | 'UNMAPPED_ACCOUNT_TYPE'
    | 'CASH_SPECIAL_HANDLING'
    | 'ZERO_PRICE_NONZERO_VALUE_EXCEPTION';
  severity: Severity;
  message: string;
  field?:
    | 'ticker'
    | 'cusip'
    | 'description'
    | 'units'
    | 'costBasis'
    | 'marketValue'
    | 'price'
    | 'acquisitionDate'
    | 'excludeFromAA'
    | 'accountNumber'
    | 'accountType';
  source: 'ingestion' | 'validation' | 'emoney_lookup' | 'dom_entry' | 'manual_review';
  blocking: boolean;
  createdAt: string; // ISO-8601 UTC
  resolvedAt?: string; // ISO-8601 UTC
  resolutionNote?: string;
}

export interface HoldingRecord {
  holdingId: string;
  // Zero-based index relative to the first data row after detected header.
  sourceDataRowIndex?: number;

  // User/source-provided fields
  ticker?: string | null;
  cusip?: string | null;
  description?: string | null;
  units?: number | null;
  costBasis?: number | null;
  marketValue?: number | null;
  acquisitionDate?: string | null; // YYYY-MM-DD
  excludeFromAA?: boolean | null;

  // Values read back from eMoney after identifier blur-triggered lookup.
  // This is lookup response metadata, not client-source-of-truth holdings data.
  emoneyLookupResult?: {
    description?: string | null;
    assetClass?: string;
    sector?: string;
    lookupKeyUsed?: 'ticker' | 'cusip';
    lookedUpAt?: string; // ISO-8601 UTC
  };

  reviewStatus: ReviewStatus; // Human review workflow state.
  entryStatus: EntryStatus; // eMoney entry/lookup workflow state.

  issues: Issue[];

  humanReview?: {
    required: boolean;
    reviewer?: string;
    reviewedAt?: string; // ISO-8601 UTC
    notes?: string;
  };
}

export interface AccountRecord {
  accountId: string;
  accountNumber: string;
  accountType: string;

  reviewStatus: ReviewStatus;
  entryStatus: EntryStatus;

  holdings: HoldingRecord[];
  issues: Issue[];

  totals?: {
    holdingCount: number;
    totalMarketValue?: number | null;
    totalCostBasis?: number | null;
  };
}

export interface RunLogEvent {
  at: string; // ISO-8601 UTC
  level: Severity;
  phase:
    | 'file_ingestion'
    | 'validation'
    | 'account_iteration'
    | 'holding_lookup'
    | 'holding_entry'
    | 'manual_review'
    | 'finalization';
  accountId?: string;
  holdingId?: string;
  message: string;
  meta?: Record<string, string | number | boolean | null>;
}

export interface RunLog {
  runId: string;
  startedAt: string; // ISO-8601 UTC
  endedAt?: string; // ISO-8601 UTC
  mode: 'local_browser_manual_confirm';
  autosaveEnabled: false;
  operator?: string;
  machine?: string;

  summary: {
    accountsTotal: number;
    holdingsTotal: number;
    enteredCount: number;
    needsHumanCount: number;
    failedCount: number;
    warningCount: number;
    exceptionCount: number;
  };

  events: RunLogEvent[];
}

export interface HoldingsIngestionFile {
  schemaVersion: '1.0.0';
  fileId: string;
  createdAt: string; // ISO-8601 UTC
  sourceFilename?: string;

  workflow: {
    localOnly: true;
    backendUsed: false;
    externalApiUsed: false;
    humanInLoopRequired: true;
    emoneyAutomation: 'browser_ui_only';
    autosaveEnabled: false;
  };

  reviewStatus: ReviewStatus;
  entryStatus: EntryStatus;

  accounts: AccountRecord[];
  issues: Issue[];
  runLog: RunLog;
}

export const sampleHoldingsIngestionFile: HoldingsIngestionFile = {
  schemaVersion: '1.0.0',
  fileId: 'file-2026-04-07-001',
  createdAt: '2026-04-07T12:00:00Z',
  sourceFilename: 'client_holdings_upload.json',
  workflow: {
    localOnly: true,
    backendUsed: false,
    externalApiUsed: false,
    humanInLoopRequired: true,
    emoneyAutomation: 'browser_ui_only',
    autosaveEnabled: false,
  },
  reviewStatus: 'in_review',
  entryStatus: 'queued',
  accounts: [
    {
      accountId: 'acct-1',
      accountNumber: '123456789',
      accountType: 'Taxable Brokerage',
      reviewStatus: 'in_review',
      entryStatus: 'lookup_in_progress',
      issues: [
        {
          code: 'VALIDATION_WARNING',
          severity: 'warning',
          message: 'marketValue missing; can still proceed with units and costBasis.',
          field: 'marketValue',
          source: 'validation',
          blocking: false,
          createdAt: '2026-04-07T12:01:30Z',
        },
      ],
      totals: {
        holdingCount: 2,
        totalCostBasis: 35000,
      },
      holdings: [
        {
          holdingId: 'acct-1-h-1',
          sourceDataRowIndex: 0,
          ticker: 'VTI',
          description: 'Vanguard Total Stock Market ETF',
          units: 100,
          costBasis: 25000,
          acquisitionDate: '2022-05-15',
          excludeFromAA: false,
          emoneyLookupResult: {
            description: 'VANGUARD TOTAL STOCK MARKET ETF',
            assetClass: 'multiple',
            sector: 'NA',
            lookupKeyUsed: 'ticker',
            lookedUpAt: '2026-04-07T12:02:10Z',
          },
          reviewStatus: 'approved',
          entryStatus: 'lookup_resolved',
          issues: [],
          humanReview: {
            required: false,
          },
        },
        {
          holdingId: 'acct-1-h-2',
          sourceDataRowIndex: 1,
          cusip: '594918104',
          units: 50,
          costBasis: 10000,
          marketValue: 17500,
          acquisitionDate: '2021-11-02',
          excludeFromAA: true,
          reviewStatus: 'in_review',
          entryStatus: 'needs_human',
          issues: [
            {
              code: 'LOOKUP_AMBIGUOUS',
              severity: 'error',
              message: 'CUSIP matched multiple securities in eMoney lookup.',
              field: 'cusip',
              source: 'emoney_lookup',
              blocking: true,
              createdAt: '2026-04-07T12:03:01Z',
              resolutionNote: 'Awaiting advisor confirmation of exact share class.',
            },
          ],
          humanReview: {
            required: true,
            reviewer: 'advisor.jane',
            notes: 'Confirm share class before entering units/cost basis.',
          },
        },
      ],
    },
  ],
  issues: [],
  runLog: {
    runId: 'run-2026-04-07T12-00-00Z',
    startedAt: '2026-04-07T12:00:00Z',
    mode: 'local_browser_manual_confirm',
    autosaveEnabled: false,
    operator: 'advisor.jane',
    machine: 'WS-ADVISOR-01',
    summary: {
      accountsTotal: 1,
      holdingsTotal: 2,
      enteredCount: 0,
      needsHumanCount: 1,
      failedCount: 0,
      warningCount: 1,
      exceptionCount: 1,
    },
    events: [
      {
        at: '2026-04-07T12:00:05Z',
        level: 'info',
        phase: 'file_ingestion',
        message: 'Loaded holdings file from local disk.',
      },
      {
        at: '2026-04-07T12:02:10Z',
        level: 'info',
        phase: 'holding_lookup',
        accountId: 'acct-1',
        holdingId: 'acct-1-h-1',
        message: 'Ticker blur triggered eMoney autofill and returned unique match.',
      },
      {
        at: '2026-04-07T12:03:01Z',
        level: 'error',
        phase: 'holding_lookup',
        accountId: 'acct-1',
        holdingId: 'acct-1-h-2',
        message: 'CUSIP lookup ambiguous; manual review required.',
      },
    ],
  },
};
