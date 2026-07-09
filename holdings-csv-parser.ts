import type {
  EntryStatus,
  HoldingsIngestionFile,
  HoldingRecord,
  Issue,
  ReviewStatus,
} from './holdings-schema';

type CanonicalField =
  | 'ticker'
  | 'cusip'
  | 'description'
  | 'units'
  | 'marketValue'
  | 'price'
  | 'costBasis'
  | 'acquisitionDate'
  | 'accountNumber'
  | 'accountType';

const HEADER_ALIASES: Record<CanonicalField, string[]> = {
  ticker: ['symbol', 'ticker', 'security symbol'],
  cusip: ['cusip', 'cusip number'],
  description: ['description', 'security name', 'name'],
  units: ['quantity', 'units', 'shares', 'share quantity'],
  marketValue: ['value', 'market value', 'marketvalue', 'current value'],
  price: ['price', 'unit price', 'market price'],
  costBasis: ['cost basis', 'costbasis', 'total cost basis', 'original cost'],
  acquisitionDate: ['acquisition date', 'acquired', 'date acquired', 'purchase date'],
  accountNumber: ['account number', 'account #', 'acct number', 'acct #'],
  accountType: ['account type', 'acct type', 'registration'],
};

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_\-]+/g, ' ');
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }

    current += ch;
  }

  result.push(current.trim());
  return result;
}

// Local account-type normalization used only for ingestion grouping/readability.
// Unmapped raw values are preserved as issues for human review.
function normalizeAccountType(raw: string | null): string | null {
  if (!raw) return null;
  const v = normalizeHeader(raw);
  if (['taxable brokerage', 'brokerage', 'individual', 'joint'].includes(v)) return 'Taxable Brokerage';
  if (['traditional ira', 'ira', 'rollover ira'].includes(v)) return 'Traditional IRA';
  if (['roth ira'].includes(v)) return 'Roth IRA';
  if (['401k', '403b', 'retirement plan'].includes(v)) return 'Retirement Plan';
  return null;
}

function normalizeNumber(raw?: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[$,%\s]/g, '').replace(/,/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}


function isValidIsoDate(raw: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
  const [yearStr, monthStr, dayStr] = raw.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    Number.isInteger(day) &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}

function normalizeDuplicateText(raw: string): string {
  return normalizeHeader(raw).replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

function isBlankRow(row: string[]): boolean {
  return row.every((cell) => cell.trim() === '');
}

function looksLikeTotalRow(row: string[]): boolean {
  const normalizedCells = row.map((cell) => normalizeHeader(cell));
  return normalizedCells.some((cell) => /^(subtotal|total|grand total|account total)$/.test(cell));
}

function detectHeaderRow(rows: string[][]): number {
  let bestIndex = 0;
  let bestScore = -1;

  for (let i = 0; i < rows.length; i++) {
    const normalized = rows[i].map(normalizeHeader);
    let score = 0;

    for (const aliases of Object.values(HEADER_ALIASES)) {
      if (normalized.some((cell) => aliases.includes(cell))) score++;
    }

    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return bestIndex;
}

// Maps canonical field names to detected CSV column positions.
function buildHeaderMap(header: string[]): Partial<Record<CanonicalField, number>> {
  const normalized = header.map(normalizeHeader);
  const map: Partial<Record<CanonicalField, number>> = {};

  (Object.keys(HEADER_ALIASES) as CanonicalField[]).forEach((field) => {
    const aliases = HEADER_ALIASES[field];
    const idx = normalized.findIndex((h) => aliases.includes(h));
    if (idx >= 0) map[field] = idx;
  });

  return map;
}

function getCell(row: string[], idx?: number): string | null {
  if (idx === undefined) return null;
  const value = row[idx];
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

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

function makeHoldingId(accountId: string, index: number): string {
  return `${accountId}-h-${index + 1}`;
}

// Repairs row tokenization when CSV numeric/currency values contain unquoted thousands commas
// (e.g., $25,000) so downstream column mapping stays aligned with detected header positions.
function repairUnquotedThousandsSeparators(
  row: string[],
  expectedLength: number,
  headerMap: Partial<Record<CanonicalField, number>>
): string[] {
  if (row.length <= expectedLength) return row;
  const repaired = [...row];
  const numericFields: CanonicalField[] = ['units', 'price', 'marketValue', 'costBasis'];
  let guard = 0;

  while (repaired.length > expectedLength && guard < 20) {
    guard += 1;
    let merged = false;

    for (const field of numericFields) {
      const idx = headerMap[field];
      if (idx === undefined || idx >= repaired.length - 1) continue;
      const left = repaired[idx]?.trim() ?? '';
      const right = repaired[idx + 1]?.trim() ?? '';
      if (/^[\-$()]?\d{1,3}$/.test(left.replace('$', '')) && /^\d{3}(\.\d+)?\)?$/.test(right)) {
        repaired[idx] = `${left},${right}`;
        repaired.splice(idx + 1, 1);
        merged = true;
        if (repaired.length <= expectedLength) break;
      }
    }

    if (!merged) break;
  }

  return repaired;
}

export function parseHoldingsCsvToIngestionFile(
  csvText: string,
  opts?: { fileId?: string; sourceFilename?: string; operator?: string; machine?: string }
): HoldingsIngestionFile {
  // Keep only non-empty physical lines; header detection is run on these rows.
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const rows = lines.map(parseCsvLine);
  const headerIndex = detectHeaderRow(rows);
  const header = rows[headerIndex] ?? [];
  const headerMap = buildHeaderMap(header);

  const startedAt = new Date().toISOString();
  const fileIssues: Issue[] = [];

  const requiredSignal: Array<CanonicalField> = ['ticker', 'cusip', 'description', 'units', 'accountNumber'];
  const foundSignals = requiredSignal.filter((k) => headerMap[k] !== undefined).length;
  if (foundSignals < 2) {
    fileIssues.push(
      toIssue('Header detection confidence is low; review mapped columns before entry.', 'validation')
    );
  }

  const accountBuckets = new Map<
    string,
    {
      accountId: string;
      accountType: string;
      holdings: HoldingRecord[];
      issues: Issue[];
      skippedTotalRows: number;
      seenHoldingKeys: Set<string>;
    }
  >();

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = repairUnquotedThousandsSeparators(rows[i], header.length, headerMap);
    if (isBlankRow(row)) continue;

    const accountNumber = getCell(row, headerMap.accountNumber) ?? 'UNASSIGNED';
    // Workbook exports often put the grand-total marker in the first column before account grouping fields.
    // Skip that kind of total row before creating an account bucket, so it cannot create a bogus account.
    const firstCell = normalizeHeader(row[0] ?? '');
    if (looksLikeTotalRow(row) && (firstCell === 'total' || normalizeHeader(accountNumber) === 'total')) {
      fileIssues.push(
        toIssue(
          `Skipped likely workbook total row at CSV line ${i + 1}.`,
          'ingestion',
          'VALIDATION_WARNING',
          false
        )
      );
      continue;
    }

    const rawAccountType = getCell(row, headerMap.accountType);
    const normalizedAccountType = normalizeAccountType(rawAccountType);
    const accountType = normalizedAccountType ?? 'Unknown';
    // Preserve raw unmapped account-type identity in the key to avoid collapsing distinct unknown classifications.
    const accountKey = normalizedAccountType
      ? `${accountNumber}::${accountType}`
      : `${accountNumber}::UNMAPPED:${rawAccountType ?? 'MISSING'}`;

    if (!accountBuckets.has(accountKey)) {
      // Assign stable accountId at bucket creation so holding/account IDs remain consistent
      // even when CSV rows are interleaved across multiple accounts.
      const accountId = `acct-${accountBuckets.size + 1}`;
      accountBuckets.set(accountKey, {
        accountId,
        accountType,
        holdings: [],
        issues: [],
        skippedTotalRows: 0,
        seenHoldingKeys: new Set<string>(),
      });
    }

    const bucket = accountBuckets.get(accountKey)!;
    if (rawAccountType && !normalizedAccountType) {
      bucket.issues.push(
        toIssue(
          `Unmapped account type "${rawAccountType}" at CSV line ${i + 1}.`,
          'validation',
          'UNMAPPED_ACCOUNT_TYPE',
          false,
          'accountType'
        )
      );
    }

    if (looksLikeTotalRow(row)) {
      bucket.skippedTotalRows += 1;
      bucket.issues.push(
        toIssue(
          `Skipped likely subtotal/total row at CSV line ${i + 1}.`,
          'ingestion',
          'VALIDATION_WARNING',
          false
        )
      );
      continue;
    }

    const ticker = getCell(row, headerMap.ticker);
    const cusip = getCell(row, headerMap.cusip);
    const description = getCell(row, headerMap.description);
    const unitsRaw = getCell(row, headerMap.units);
    const priceRaw = getCell(row, headerMap.price);
    const costBasisRaw = getCell(row, headerMap.costBasis);
    const marketValueRaw = getCell(row, headerMap.marketValue);
    const acquisitionDate = getCell(row, headerMap.acquisitionDate);

    if (!ticker && !cusip && !description) {
      bucket.issues.push(
        toIssue(
          `Skipped row at CSV line ${i + 1}: no ticker, CUSIP, or description.`,
          'validation',
          'MISSING_REQUIRED_FIELD',
          false
        )
      );
      continue;
    }

    const rowIssues: Issue[] = [];
    const units = normalizeNumber(unitsRaw ?? undefined);
    const price = normalizeNumber(priceRaw ?? undefined);
    const costBasis = normalizeNumber(costBasisRaw ?? undefined);
    const marketValue = normalizeNumber(marketValueRaw ?? undefined);

    if (unitsRaw && units === null) {
      rowIssues.push(
        toIssue(`Could not parse units value "${unitsRaw}".`, 'validation', 'INVALID_FORMAT', false, 'units')
      );
    }
    if (priceRaw && price === null) {
      rowIssues.push(
        toIssue(`Could not parse price value "${priceRaw}".`, 'validation', 'INVALID_FORMAT', false, 'price')
      );
    }
    if (costBasisRaw && costBasis === null) {
      rowIssues.push(
        toIssue(
          `Could not parse cost basis value "${costBasisRaw}".`,
          'validation',
          'INVALID_FORMAT',
          false,
          'costBasis'
        )
      );
    }
    if (marketValueRaw && marketValue === null) {
      rowIssues.push(
        toIssue(
          `Could not parse market value "${marketValueRaw}".`,
          'validation',
          'INVALID_FORMAT',
          false,
          'marketValue'
        )
      );
    }

    const normalizedTicker = normalizeDuplicateText(ticker ?? '');
    const rawAssetClass = row[header.length - 1]?.trim() ?? '';
    const isCashRow = normalizedTicker === 'cash' || normalizeDuplicateText(rawAssetClass) === 'cash';
    if (isCashRow) {
      rowIssues.push(
        toIssue(
          'Cash row requires manual handling and is excluded from eMoney public-security auto-entry by default.',
          'validation',
          'CASH_SPECIAL_HANDLING',
          false,
          'ticker'
        )
      );
    }

    if (!isCashRow && price === 0 && marketValue != null && marketValue !== 0) {
      rowIssues.push(
        toIssue(
          'Zero price with nonzero market value requires manual review before eMoney auto-entry.',
          'validation',
          'ZERO_PRICE_NONZERO_VALUE_EXCEPTION',
          false,
          'price'
        )
      );
    }

    if (acquisitionDate && !isValidIsoDate(acquisitionDate)) {
      rowIssues.push(
        toIssue(
          `Could not parse acquisition date "${acquisitionDate}". Expected YYYY-MM-DD.`,
          'validation',
          'INVALID_FORMAT',
          false,
          'acquisitionDate'
        )
      );
    }

    // Conservative duplicate heuristic: prefer strong identifiers first (CUSIP, then ticker+description,
    // then ticker+units, then description+units) and only compare within the same account bucket.
    const duplicateKeyCandidates: string[] = [];
    if (cusip) duplicateKeyCandidates.push(`cusip:${normalizeDuplicateText(cusip)}`);
    if (ticker && description) {
      duplicateKeyCandidates.push(
        `ticker_desc:${normalizeDuplicateText(ticker)}|${normalizeDuplicateText(description)}`
      );
    }
    if (ticker && units != null) duplicateKeyCandidates.push(`ticker_units:${normalizeDuplicateText(ticker)}|${units}`);
    if (description && units != null) {
      duplicateKeyCandidates.push(`desc_units:${normalizeDuplicateText(description)}|${units}`);
    }

    if (duplicateKeyCandidates.some((key) => bucket.seenHoldingKeys.has(key))) {
      rowIssues.push(
        toIssue(
          'Likely duplicate holding detected within the same account.',
          'validation',
          'DUPLICATE_HOLDING',
          false
        )
      );
    }

    duplicateKeyCandidates.forEach((key) => bucket.seenHoldingKeys.add(key));

    const holding: HoldingRecord = {
      holdingId: makeHoldingId(bucket.accountId, bucket.holdings.length),
      // Zero-based index relative to first data row after detected header.
      sourceDataRowIndex: i - (headerIndex + 1),
      ticker,
      cusip,
      description,
      units,
      costBasis,
      marketValue,
      acquisitionDate,
      excludeFromAA: null,
      reviewStatus: 'in_review',
      entryStatus: ticker || cusip ? 'queued' : 'needs_human',
      issues: rowIssues,
      humanReview: {
        required: rowIssues.some((x) => x.blocking) || (!ticker && !cusip),
      },
    };

    bucket.holdings.push(holding);
  }

  const accounts = Array.from(accountBuckets.entries()).map(([key, bucket]) => {
    const [accountNumber] = key.split('::');
    const allHoldingIssues = bucket.holdings.flatMap((h) => h.issues).length;
    const hasAnyMarketValue = bucket.holdings.some((h) => h.marketValue != null);
    const hasAnyCostBasis = bucket.holdings.some((h) => h.costBasis != null);

    const reviewStatus: ReviewStatus = allHoldingIssues > 0 || bucket.issues.length > 0 ? 'in_review' : 'unreviewed';
    const entryStatus: EntryStatus = bucket.holdings.length === 0 ? 'needs_human' : 'not_started';

    return {
      accountId: bucket.accountId,
      accountNumber,
      accountType: bucket.accountType,
      reviewStatus,
      entryStatus,
      holdings: bucket.holdings,
      issues: bucket.issues,
      totals: {
        holdingCount: bucket.holdings.length,
        totalMarketValue: hasAnyMarketValue
          ? bucket.holdings.reduce((sum, h) => sum + (h.marketValue ?? 0), 0)
          : null,
        totalCostBasis: hasAnyCostBasis
          ? bucket.holdings.reduce((sum, h) => sum + (h.costBasis ?? 0), 0)
          : null,
      },
    };
  });

  const warningCount =
    fileIssues.filter((x) => x.severity === 'warning').length +
    accounts.reduce(
      (sum, a) => sum + a.issues.filter((x) => x.severity === 'warning').length + a.holdings.reduce((s, h) => s + h.issues.filter((x) => x.severity === 'warning').length, 0),
      0
    );
  const errorCount =
    fileIssues.filter((x) => x.severity === 'error').length +
    accounts.reduce(
      (sum, a) => sum + a.issues.filter((x) => x.severity === 'error').length + a.holdings.reduce((s, h) => s + h.issues.filter((x) => x.severity === 'error').length, 0),
      0
    );

  const endedAt = new Date().toISOString();
  // Top-level reviewStatus should reflect issues at every level, not only file-level issues.
  const hasAnyIssues =
    fileIssues.length > 0 ||
    accounts.some((a) => a.issues.length > 0 || a.holdings.some((h) => h.issues.length > 0));

  return {
    schemaVersion: '1.0.0',
    fileId: opts?.fileId ?? `file-${startedAt}`,
    createdAt: startedAt,
    sourceFilename: opts?.sourceFilename,
    workflow: {
      localOnly: true,
      backendUsed: false,
      externalApiUsed: false,
      humanInLoopRequired: true,
      emoneyAutomation: 'browser_ui_only',
      autosaveEnabled: false,
    },
    reviewStatus: hasAnyIssues ? 'in_review' : 'unreviewed',
    entryStatus: accounts.length > 0 ? 'not_started' : 'needs_human',
    accounts,
    issues: fileIssues,
    runLog: {
      runId: `run-${startedAt}`,
      startedAt,
      endedAt,
      mode: 'local_browser_manual_confirm',
      autosaveEnabled: false,
      ...(opts?.operator ? { operator: opts.operator } : {}),
      ...(opts?.machine ? { machine: opts.machine } : {}),
      summary: {
        accountsTotal: accounts.length,
        holdingsTotal: accounts.reduce((sum, a) => sum + a.holdings.length, 0),
        enteredCount: 0,
        needsHumanCount: accounts.reduce(
          (sum, a) => sum + a.holdings.filter((h) => h.entryStatus === 'needs_human').length,
          0
        ),
        failedCount: 0,
        warningCount,
        exceptionCount: errorCount,
      },
      events: [
        {
          at: startedAt,
          level: 'info',
          phase: 'file_ingestion',
          message: 'Parsed local CSV text into holdings ingestion schema.',
          meta: { headerRowIndex: headerIndex, rows: rows.length },
        },
      ],
    },
  };
}

// Inline sample input + expected output shape
export const sampleCsvInput = `
Account Number,Account Type,Symbol,CUSIP,Security Name,Shares,Market Value,Cost Basis,Acquisition Date
123456789,Taxable Brokerage,VTI,,Vanguard Total Stock Market ETF,100,$25,000,$20,000,2022-05-15
123456789,Taxable Brokerage,,594918104,Microsoft Corp,50,$17,500,$10,000,2021-11-02
123456789,Taxable Brokerage,Subtotal,,,,,,
`;

export const sampleParsedShape: Pick<
  HoldingsIngestionFile,
  'schemaVersion' | 'workflow' | 'reviewStatus' | 'entryStatus' | 'accounts' | 'issues'
> = {
  schemaVersion: '1.0.0',
  workflow: {
    localOnly: true,
    backendUsed: false,
    externalApiUsed: false,
    humanInLoopRequired: true,
    emoneyAutomation: 'browser_ui_only',
    autosaveEnabled: false,
  },
  reviewStatus: 'in_review',
  entryStatus: 'not_started',
  issues: [],
  accounts: [
    {
      accountId: 'acct-1',
      accountNumber: '123456789',
      accountType: 'Taxable Brokerage',
      reviewStatus: 'in_review',
      entryStatus: 'not_started',
      issues: [
        {
          code: 'VALIDATION_WARNING',
          severity: 'warning',
          message: 'Skipped likely subtotal/total row at CSV line 4.',
          source: 'ingestion',
          blocking: false,
          createdAt: '2026-04-07T00:00:00.000Z',
        },
      ],
      totals: {
        holdingCount: 2,
        totalMarketValue: 42500,
        totalCostBasis: 30000,
      },
      holdings: [
        {
          holdingId: 'acct-1-h-1',
          sourceDataRowIndex: 0,
          ticker: 'VTI',
          cusip: null,
          description: 'Vanguard Total Stock Market ETF',
          emoneyLookupResult: {
            description: 'VANGUARD TOTAL STOCK MARKET ETF',
            assetClass: 'multiple',
            sector: 'NA',
            lookupKeyUsed: 'ticker',
          },
          units: 100,
          marketValue: 25000,
          costBasis: 20000,
          acquisitionDate: '2022-05-15',
          excludeFromAA: null,
          reviewStatus: 'in_review',
          entryStatus: 'queued',
          issues: [],
          humanReview: { required: false },
        },
      ],
    },
  ],
};
