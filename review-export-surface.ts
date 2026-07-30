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

/**
 * Review and export surface for the browser workflow.
 * It prepares operator-controlled payloads and never triggers an eMoney Save action.
 */

export interface AssistantHoldingPayload extends BrowserHoldingInput {
  marketValue: number | null;
}

export interface AssistantAccountPayload {
  accountId: string;
  accountNumber: string;
  accountType: string;
  holdings: AssistantHoldingPayload[];
}

export interface HoldingEligibility {
  eligible: boolean;
  reasons: string[];
  blockedIssueCodes: string[];
  requiresManualOverride: boolean;
}

export interface AccountPreflightSummary {
  eligibleCount: number;
  blockedCount: number;
  warningBearingCount: number;
  blockedReasonsByCode: Record<string, number>;
}

export interface AccountRowDisplayItem {
  holding: HoldingRecord;
  eligible: boolean;
  blockedWhy: string;
  blockedIssueCodes: string[];
  marketValue: number | null;
}

export interface ReviewExportSurfaceOptions {
  onExport?: (payload: AssistantAccountPayload) => void;
  onPacketPrepared?: (event: { accountNumber: string; rowCount: number; copied: boolean }) => void;
  onClipboardWrite?: (text: string) => void;
}

export const MANUAL_REVIEW_REQUIRED_CODES = new Set<Issue['code']>([
  'DUPLICATE_HOLDING',
  'INVALID_FORMAT',
  'UNMAPPED_ACCOUNT_TYPE',
  'CASH_SPECIAL_HANDLING',
  'ZERO_PRICE_NONZERO_VALUE_EXCEPTION',
]);


function toFriendlyIssueLabel(code: string): string {
  switch (code) {
    case 'DUPLICATE_HOLDING':
      return 'possible duplicate holding';
    case 'INVALID_FORMAT':
      return 'invalid field format';
    case 'UNMAPPED_ACCOUNT_TYPE':
      return 'unmapped account type';
    case 'CASH_SPECIAL_HANDLING':
      return 'cash row requires manual handling';
    case 'ZERO_PRICE_NONZERO_VALUE_EXCEPTION':
      return 'zero price with nonzero value';
    case 'MISSING_LOOKUP_KEY':
      return 'missing ticker/CUSIP lookup key';
    default:
      return code.toLowerCase().replace(/_/g, ' ');
  }
}

function isBlockingIssue(issue: Issue): boolean {
  return Boolean(issue.blocking) || issue.severity === 'error';
}

export function getHoldingEligibility(
  holding: HoldingRecord,
  opts?: { allowManualOverride?: boolean }
): HoldingEligibility {
  const reasons: string[] = [];
  const blockedIssueCodes: string[] = [];

  const hasLookupKey = Boolean((holding.ticker ?? '').trim() || (holding.cusip ?? '').trim());
  if (!hasLookupKey) {
    reasons.push('blocked: missing ticker/CUSIP lookup key');
    blockedIssueCodes.push('MISSING_LOOKUP_KEY');
  }

  const blockingIssues = holding.issues.filter(isBlockingIssue);
  if (blockingIssues.length) {
    blockingIssues.forEach((i) => blockedIssueCodes.push(i.code));
    reasons.push(`blocked: ${blockingIssues.map((i) => toFriendlyIssueLabel(i.code)).join(', ')}`);
  }

  const manualReviewIssues = holding.issues.filter((i) => MANUAL_REVIEW_REQUIRED_CODES.has(i.code));
  const requiresManualOverride = manualReviewIssues.length > 0;
  if (requiresManualOverride && !opts?.allowManualOverride) {
    manualReviewIssues.forEach((i) => blockedIssueCodes.push(i.code));
    reasons.push(`manual review required before export: ${manualReviewIssues.map((i) => toFriendlyIssueLabel(i.code)).join(', ')}`);
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    blockedIssueCodes: Array.from(new Set(blockedIssueCodes)),
    requiresManualOverride,
  };
}

export function isHoldingEligible(holding: HoldingRecord, opts?: { allowManualOverride?: boolean }): boolean {
  return getHoldingEligibility(holding, opts).eligible;
}

export function toAssistantHolding(holding: HoldingRecord): AssistantHoldingPayload {
  return {
    ticker: holding.ticker ?? null,
    cusip: holding.cusip ?? null,
    description: holding.description ?? null,
    units: holding.units ?? null,
    costBasis: holding.costBasis ?? null,
    marketValue: holding.marketValue ?? null,
  };
}

export function buildAccountPreflightSummary(
  account: AccountRecord,
  opts?: { allowManualOverride?: boolean }
): AccountPreflightSummary {
  const blockedReasonsByCode: Record<string, number> = {};
  let eligibleCount = 0;
  let blockedCount = 0;

  for (const holding of account.holdings) {
    const eligibility = getHoldingEligibility(holding, opts);
    if (eligibility.eligible) {
      eligibleCount += 1;
    } else {
      blockedCount += 1;
      eligibility.blockedIssueCodes.forEach((code) => {
        blockedReasonsByCode[code] = (blockedReasonsByCode[code] ?? 0) + 1;
      });
    }
  }

  const warningBearingCount = account.holdings.filter((h) => h.issues.some((i) => i.severity === 'warning')).length;

  return {
    eligibleCount,
    blockedCount,
    warningBearingCount,
    blockedReasonsByCode,
  };
}

export function toAssistantPayloadForAccount(
  account: AccountRecord,
  opts?: { allowManualOverride?: boolean }
): AssistantAccountPayload {
  const eligible = account.holdings
    .filter((h) => isHoldingEligible(h, opts))
    .map(toAssistantHolding);

  return {
    accountId: account.accountId,
    accountNumber: account.accountNumber,
    accountType: account.accountType,
    holdings: eligible,
  };
}


export function buildEmoneyDevtoolsSnippet(payload: AssistantAccountPayload): string {
  const rows = payload.holdings
    .filter((holding) => (holding.ticker ?? '').trim())
    .map((holding) => ({
      ticker: String(holding.ticker ?? '').trim(),
      units: holding.units == null ? '' : String(holding.units),
      costBasis: holding.costBasis == null ? '' : String(holding.costBasis),
      marketValue: holding.marketValue == null ? '' : String(holding.marketValue),
    }));

  return `// eMoney holdings fill snippet generated locally for account ${payload.accountNumber}.
// Engineering fallback only. The operator path is Copy eMoney Fill Packet + Fill eMoney Holdings bookmark.
// Safety: clicks Add a Holding and fills ticker, units, and cost basis only. It NEVER clicks Save.
// Market value stays in the row data for operator reconciliation; eMoney calculates value from shares/pricing.
(async () => {
  const rows = ${JSON.stringify(rows, null, 2)};
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const confirmed = window.confirm('Confirm you are on the correct eMoney Holdings page for account ${payload.accountNumber}. This will fill eligible rows but will NOT click Save.');
  if (!confirmed) {
    console.warn('eMoney fill cancelled before any row changes.');
    return;
  }
  let completedCount = 0;
  let failedCount = 0;

  function visible(el) {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function fire(el) {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  function setValue(el, value) {
    el.focus();
    el.value = String(value);
    fire(el);
  }

  function visibleInputs() {
    return [...document.querySelectorAll('input')]
      .filter((el) => visible(el) && !el.disabled && !el.readOnly);
  }

  function findAddHoldingButton() {
    return [...document.querySelectorAll('button, a, input[type="button"], input[type="submit"]')]
      .find((el) => {
        const text = \`${'${el.textContent || \'\'} ${el.value || \'\'}'}\`.trim().toLowerCase();
        return text.includes('add a holding');
      });
  }

  async function clickAddHolding() {
    const button = findAddHoldingButton();
    if (!button) throw new Error('Could not find Add a Holding button. Stop and enter manually.');
    const before = visibleInputs().length;
    button.click();

    for (let i = 0; i < 20; i += 1) {
      await sleep(250);
      if (visibleInputs().length > before) return;
    }

    console.warn('Clicked Add a Holding, but did not detect additional inputs. Continuing cautiously.');
  }

  function newestTickerField() {
    const candidates = visibleInputs().filter((el) => /ticker/i.test(el.id || '') || /ticker/i.test(el.name || ''));
    return candidates[candidates.length - 1] || null;
  }

  function rowFieldsFromTicker(tickerEl) {
    const fields = visibleInputs();
    const start = fields.indexOf(tickerEl);
    if (start < 0) throw new Error('Ticker field was not found in the visible input list. Stop and enter manually.');

    const nearby = fields.slice(start, start + 16);
    // Discovered eMoney WebForms row order for the current Holdings screen:
    // 0 Ticker, 1 CUSIP, 2 Description, 3 Date Acquired, 4 Units, 5 Cost Basis.
    return {
      ticker: nearby[0],
      units: nearby[4],
      costBasis: nearby[5],
    };
  }

  for (const row of rows) {
    try {
      await clickAddHolding();
      await sleep(500);

      const tickerEl = newestTickerField();
      if (!tickerEl) throw new Error('Could not find the newest Ticker field. Stop and enter manually.');

      const fields = rowFieldsFromTicker(tickerEl);
      if (!fields.units) throw new Error('Could not locate Units field by discovered row offset. Stop and enter manually.');
      if (!fields.costBasis) throw new Error('Could not locate Cost Basis field by discovered row offset. Stop and enter manually.');

      setValue(fields.ticker, row.ticker);
      await sleep(1200); // let eMoney resolve description / asset class / sector from ticker
      setValue(fields.units, row.units);
      setValue(fields.costBasis, row.costBasis);

      completedCount += 1;
      // Market value not filled; eMoney calculates it.
    } catch {
      failedCount += 1;
      console.error('eMoney fill stopped. Review the remaining holdings manually.');
      break;
    }
  }

  console.log(\`eMoney fill finished: \${completedCount} completed, \${failedCount} failed. Review every holding visually. Save remains manual.\`);
})();`;
}


export function getAccountRowDisplay(
  account: AccountRecord,
  opts?: { allowManualOverride?: boolean }
): AccountRowDisplayItem[] {
  return account.holdings.map((holding) => {
    const eligibility = getHoldingEligibility(holding, opts);
      return {
      holding,
      eligible: eligibility.eligible,
      blockedWhy: eligibility.reasons.join('; ') || 'n/a',
      blockedIssueCodes: eligibility.blockedIssueCodes,
      marketValue: holding.marketValue ?? null,
    };
  });
}

function formatIssues(issues: Issue[]): string {
  if (!issues.length) return 'none';
  return issues
    .map((i) => `${i.severity.toUpperCase()}:${i.code}${i.field ? ` (${i.field})` : ''} - ${i.message}`)
    .join(' | ');
}

function makeButton(label: string, className = 'ledger-button'): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  return button;
}

function appendCell(row: HTMLTableRowElement, text: string): void {
  const cell = document.createElement('td');
  cell.textContent = text;
  row.appendChild(cell);
}

export interface ClipboardAccess {
  readText?: () => Promise<string>;
  writeText?: (text: string) => Promise<void>;
}

export type ClearClipboardResult = 'cleared' | 'unchanged' | 'unavailable';

export async function clearMatchingClipboard(
  expectedText: string | null,
  clipboard?: ClipboardAccess
): Promise<ClearClipboardResult> {
  if (!expectedText || !clipboard?.readText || !clipboard.writeText) return 'unavailable';
  try {
    const currentText = await clipboard.readText();
    if (currentText !== expectedText) return 'unchanged';
    await clipboard.writeText('');
    return 'cleared';
  } catch {
    return 'unavailable';
  }
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!navigator.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function formatFieldNames(fields: string[]): string {
  const labels: Record<string, string> = {
    ticker: 'Ticker',
    units: 'Units',
    costBasis: 'Cost Basis',
    marketValue: 'Market Value',
    assetClass: 'Asset Class',
    sector: 'Sector',
    save: 'Save',
  };
  return fields.map((field) => labels[field] ?? field).join(', ');
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatMoney(value: number): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function reasonLabelFromCode(code: string): string {
  switch (code) {
    case 'CASH_SPECIAL_HANDLING':
      return 'Cash position';
    case 'MISSING_LOOKUP_KEY':
      return 'Missing ticker';
    case 'UNMAPPED_ACCOUNT_TYPE':
      return 'Unsupported type';
    case 'INVALID_FORMAT':
      return 'Invalid units';
    case 'DUPLICATE_HOLDING':
      return 'Duplicate CUSIP';
    case 'ZERO_PRICE_NONZERO_VALUE_EXCEPTION':
      return 'Review pricing';
    default:
      return toFriendlyIssueLabel(code).replace(/^\w/, (char) => char.toUpperCase());
  }
}

function appendMetric(parent: HTMLElement, label: string, value: string, className = ''): void {
  const item = document.createElement('div');
  item.className = `preflight-metric ${className}`.trim();
  item.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
  parent.appendChild(item);
}

function appendFieldList(parent: HTMLElement, title: string, fields: string[], className: string): void {
  const group = document.createElement('div');
  group.className = `field-list ${className}`;
  const heading = document.createElement('strong');
  heading.textContent = title;
  group.appendChild(heading);
  const list = document.createElement('ul');
  fields.forEach((field) => {
    const item = document.createElement('li');
    item.textContent = field;
    list.appendChild(item);
  });
  group.appendChild(list);
  parent.appendChild(group);
}

function appendReasonChips(cell: HTMLElement, codes: string[], fallback: string): void {
  if (!codes.length) {
    cell.textContent = fallback;
    return;
  }

  codes.forEach((code) => {
    const chip = document.createElement('span');
    chip.className = 'reason-chip';
    chip.textContent = reasonLabelFromCode(code);
    cell.appendChild(chip);
  });
}

function buildBatchTransferReport(batch: BatchPastePayload): string {
  const lines = [
    'Manual Spreadsheet Paste Fallback',
    `Account: ${batch.accountNumber} (${batch.accountType})`,
    `Rows prepared: ${batch.rowCount}`,
    `Blocked rows excluded: ${batch.blockedCount}`,
    `Included fields: ${formatFieldNames(batch.includedFields)}`,
    `Excluded fields: ${formatFieldNames(batch.excludedFields)}`,
    '',
    'Safety boundary:',
    '- Manual spreadsheet-style TSV packet only.',
    '- No browser extension.',
    '- No Fill Button or page helper.',
    '- No auto-keystrokes.',
    '- No eMoney Save action.',
    '- No market value, asset class, or sector paste steps.',
    '',
    'Placement:',
    'Click the first eMoney Ticker cell, then press Ctrl+V once.',
    '',
    'Rows:',
  ];

  batch.previewRows.forEach((row) => {
    lines.push(`${row.rowNumber}. ${row.ticker}\t${row.units}\t${row.costBasis}`);
  });

  return lines.join('\n');
}

function buildFillPacketReport(packet: EmoneyFillPacket): string {
  const lines = [
    'eMoney Fill Packet',
    `Account: ${packet.accountNumber} (${packet.accountType})`,
    `Created: ${packet.createdAt}`,
    `Rows prepared: ${packet.rowCount}`,
    `Blocked rows excluded: ${packet.blockedCount}`,
    `Included fields: ${formatFieldNames(packet.approvedFields)}`,
    `Excluded fields: ${formatFieldNames(packet.excludedFields)}`,
    '',
    'Operator flow:',
    '1. Copy this reviewed fill packet.',
    '2. Open the correct eMoney Holdings page.',
    '3. Click the Fill eMoney Holdings bookmark.',
    '4. Confirm the overlay before rows are filled.',
    '5. Review every row in eMoney and manually Save.',
    '',
    'Safety boundary:',
    '- Runs only when the operator clicks the bookmark.',
    '- Shows a visible in-page confirmation overlay.',
    '- Clicks Add a Holding and fills ticker, units, and cost basis only.',
    '- Does not use a browser extension, backend, eMoney API, or local bridge service.',
    '- Does not write market value, asset class, sector, description, or Save.',
    '',
    'Rows:',
  ];

  packet.holdings.forEach((row) => {
    lines.push(`${row.rowNumber}. ${row.ticker}\t${row.units}\t${row.costBasis}`);
  });

  return lines.join('\n');
}

function downloadBatchReport(batch: BatchPastePayload): void {
  const blob = new Blob([buildBatchTransferReport(batch)], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `emoney-transfer-packet-${batch.accountNumber}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadFillPacketReport(packet: EmoneyFillPacket): void {
  const blob = new Blob([buildFillPacketReport(packet)], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `emoney-fill-packet-report-${packet.accountNumber}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

export function renderReviewExportSurface(
  root: HTMLElement,
  ingestion: HoldingsIngestionFile,
  opts?: ReviewExportSurfaceOptions
): void {
  root.innerHTML = '';
  root.className = 'review-root';

  const outputDetails = document.createElement('details');
  outputDetails.className = 'output-details';

  const outputSummary = document.createElement('summary');
  outputSummary.textContent = 'Session Report';
  outputDetails.appendChild(outputSummary);

  const output = document.createElement('pre');
  output.className = 'output-panel';
  output.textContent = 'No session report generated yet.';
  outputDetails.appendChild(output);

  const showOutput = (message: string, opts?: { summary?: string; open?: boolean }) => {
    output.textContent = message;
    outputDetails.open = opts?.open ?? false;
    outputSummary.textContent = opts?.summary ?? 'Session report available';
  };

  ingestion.accounts.forEach((account) => {
    const accountWrap = document.createElement('section');
    accountWrap.className = 'account-panel';

    const accountHeader = document.createElement('div');
    accountHeader.className = 'account-header';
    const accountHeaderCopy = document.createElement('div');
    const header = document.createElement('h3');
    header.textContent = `${account.accountNumber} (${account.accountType})`;
    accountHeaderCopy.appendChild(header);

    const accountIssues = document.createElement('p');
    accountIssues.textContent = `Account Issues: ${formatIssues(account.issues)}`;
    accountHeaderCopy.appendChild(accountIssues);
    accountHeader.appendChild(accountHeaderCopy);
    accountWrap.appendChild(accountHeader);

    const overrideLabel = document.createElement('label');
    overrideLabel.className = 'override-row';
    const overrideInput = document.createElement('input');
    overrideInput.type = 'checkbox';
    overrideLabel.appendChild(overrideInput);
    overrideLabel.appendChild(document.createTextNode('Override safety gate for manual-review-required codes (use carefully)'));
    accountWrap.appendChild(overrideLabel);

    const preflight = document.createElement('section');
    accountWrap.appendChild(preflight);

    const accountBody = document.createElement('div');
    accountBody.className = 'account-body';

    const accountMain = document.createElement('div');
    accountMain.className = 'account-main';
    const tableHeading = document.createElement('h3');
    tableHeading.className = 'table-heading';
    tableHeading.textContent = 'Holdings Review';
    accountMain.appendChild(tableHeading);

    const table = document.createElement('table');
    table.className = 'holdings-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Status</th><th>Ticker</th><th>CUSIP</th><th>Units</th><th>Cost Basis</th><th>Market Value <span>reconciliation only</span></th><th>Blocked Reason</th><th>Issues</th></tr>';
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    table.appendChild(tbody);
    const tableWrap = document.createElement('div');
    tableWrap.className = 'holdings-table-wrap';
    tableWrap.appendChild(table);
    accountMain.appendChild(tableWrap);

    const transferPanel = document.createElement('section');
    transferPanel.className = 'transfer-rail';
    accountBody.appendChild(accountMain);
    accountBody.appendChild(transferPanel);
    accountWrap.appendChild(accountBody);

    let activeFillPacket: EmoneyFillPacket | null = null;
    let activeManualBatch: BatchPastePayload | null = null;
    let packetCopyStatus: 'idle' | 'copied' | 'blocked' = 'idle';
    let packetCopiedAt: Date | null = null;

    const buildActivePackets = () => {
      const payload = toAssistantPayloadForAccount(account, {
        allowManualOverride: overrideInput.checked,
      });
      const summary = buildAccountPreflightSummary(account, {
        allowManualOverride: overrideInput.checked,
      });
      activeFillPacket = buildEmoneyFillPacket(payload, { blockedCount: summary.blockedCount });
      activeManualBatch = buildBatchPastePayload(payload, { blockedCount: summary.blockedCount });
      return { payload, summary };
    };

    const renderRows = () => {
      tbody.innerHTML = '';
      const rowDisplay = getAccountRowDisplay(account, { allowManualOverride: overrideInput.checked });
      rowDisplay.forEach(({ holding, eligible, blockedWhy, blockedIssueCodes }, index) => {
        const tr = document.createElement('tr');
        tr.className = eligible ? 'row-eligible' : 'row-blocked';
        tr.tabIndex = 0;
        tr.style.animationDelay = `${Math.min(index * 24, 240)}ms`;
        tr.setAttribute('aria-label', `${eligible ? 'Eligible' : 'Blocked'} holding ${holding.ticker ?? holding.cusip ?? 'without lookup key'}`);
        if (!eligible) {
          tr.title = blockedWhy;
          tr.dataset.blockedDetail = blockedWhy;
        }

        const statusCell = document.createElement('td');
        const badge = document.createElement('span');
        badge.className = `status-pill ${eligible ? 'ok' : 'bad'}`;
        badge.textContent = eligible ? 'Eligible' : 'Blocked';
        statusCell.appendChild(badge);
        tr.appendChild(statusCell);

        appendCell(tr, holding.ticker ?? '');
        appendCell(tr, holding.cusip ?? '');
        appendCell(tr, holding.units == null ? '' : String(holding.units));
        appendCell(tr, holding.costBasis == null ? '' : formatMoney(holding.costBasis));
        appendCell(tr, holding.marketValue == null ? '' : formatMoney(holding.marketValue));
        const reasonCell = document.createElement('td');
        reasonCell.className = 'blocked-reason-cell';
        reasonCell.dataset.detail = eligible ? '' : blockedWhy;
        appendReasonChips(reasonCell, eligible ? [] : blockedIssueCodes, eligible ? '-' : blockedWhy);
        tr.appendChild(reasonCell);

        const issueCell = document.createElement('td');
        issueCell.className = 'issues-cell';
        const issueText = formatIssues(holding.issues);
        issueCell.appendChild(document.createTextNode(issueText));
        if (holding.issues.length) {
          const info = document.createElement('span');
          info.className = 'issue-info';
          info.title = issueText;
          info.textContent = 'i';
          issueCell.appendChild(info);
        }
        tr.appendChild(issueCell);
        tbody.appendChild(tr);
      });
    };

    const renderSummary = () => {
      const summary = buildAccountPreflightSummary(account, { allowManualOverride: overrideInput.checked });
      const blockedReasonText = Object.keys(summary.blockedReasonsByCode).length
        ? JSON.stringify(summary.blockedReasonsByCode)
        : '{}';
      preflight.className = `preflight-summary account-preflight ${summary.blockedCount > 0 ? 'blocked' : 'clean'}`;
      preflight.innerHTML = '';
      appendMetric(preflight, 'Eligible rows', String(summary.eligibleCount), 'is-eligible');
      appendMetric(preflight, 'Blocked rows', String(summary.blockedCount), 'is-blocked');
      appendMetric(preflight, 'Warnings', String(summary.warningBearingCount), 'is-warning');
      appendMetric(preflight, 'Account number', account.accountNumber, 'is-account');
      const overrideState = document.createElement('p');
      overrideState.className = 'override-state';
      overrideState.textContent = overrideInput.checked
        ? `Override ON. Blocked reason counts: ${blockedReasonText}`
        : `Override OFF. Blocked reason counts: ${blockedReasonText}`;
      preflight.appendChild(overrideState);
    };

    const renderTransferPacket = () => {
      const { payload } = buildActivePackets();
      if (!activeFillPacket || !activeManualBatch) return;
      transferPanel.innerHTML = '';

      const packetCard = document.createElement('article');
      packetCard.className = 'rail-card transfer-card';
      const panelTitle = document.createElement('h3');
      panelTitle.textContent = 'Transfer Packet';
      packetCard.appendChild(panelTitle);

      const summary = document.createElement('p');
      summary.textContent = `${activeFillPacket.rowCount} eligible rows prepared. ${activeFillPacket.blockedCount} blocked rows excluded. This packet is used with a browser bookmarklet on the visible eMoney Holdings page.`;
      packetCard.appendChild(summary);

      const fieldGrid = document.createElement('div');
      fieldGrid.className = 'field-list-grid';
      appendFieldList(fieldGrid, 'Included', ['Ticker', 'Units', 'Cost Basis'], 'included');
      appendFieldList(fieldGrid, 'Excluded', ['Market Value', 'Asset Class', 'Sector', 'Save'], 'excluded');
      packetCard.appendChild(fieldGrid);

      const boundary = document.createElement('p');
      boundary.className = 'manual-boundary';
      boundary.textContent = 'Save remains manual.';
      packetCard.appendChild(boundary);

      const copyBtn = makeButton('Copy eMoney Fill Packet', 'ledger-button full-width');
      copyBtn.disabled = activeFillPacket.rowCount === 0;
      copyBtn.onclick = async () => {
        if (!activeFillPacket || activeFillPacket.rowCount === 0) return;
        const serializedPacket = serializeEmoneyFillPacket(activeFillPacket);
        const copied = await copyTextToClipboard(serializedPacket);
        packetCopyStatus = copied ? 'copied' : 'blocked';
        packetCopiedAt = copied ? new Date() : null;
        if (copied) opts?.onClipboardWrite?.(serializedPacket);
        opts?.onPacketPrepared?.({
          accountNumber: activeFillPacket.accountNumber,
          rowCount: activeFillPacket.rowCount,
          copied,
        });
        opts?.onExport?.(payload);
        showOutput(
          copied
            ? buildFillPacketReport(activeFillPacket)
            : `${buildFillPacketReport(activeFillPacket)}\n\nJSON fill packet:\n${serializedPacket}`,
          {
            summary: copied ? 'Fill packet copied. Session report' : 'Clipboard blocked. Open packet text',
            open: !copied,
          }
        );
        renderTransferPacket();
      };
      packetCard.appendChild(copyBtn);

      const copyState = document.createElement('p');
      copyState.className = `transfer-copy-state ${packetCopyStatus}`;
      copyState.textContent = activeFillPacket.rowCount === 0
        ? 'No eligible rows are available to copy.'
        : packetCopyStatus === 'copied' && packetCopiedAt
          ? `Packet copied to clipboard ${formatClock(packetCopiedAt)}`
          : packetCopyStatus === 'blocked'
            ? 'Clipboard copy was blocked. Open Session Report and use the paste fallback inside the Fill Button.'
            : 'Ready to copy a reviewed packet.';
      packetCard.appendChild(copyState);

      transferPanel.appendChild(packetCard);

      const bookmarkCard = document.createElement('article');
      bookmarkCard.className = 'rail-card bookmark-installer';
      const bookmarkletHref = buildEmoneyFillBookmarklet();
      bookmarkCard.innerHTML = '<span>One-time setup</span><strong>Install Fill Button</strong><p>Drag the Fill eMoney Holdings button to your browser bookmarks bar.</p>';
      const bookmarklet = document.createElement('a');
      bookmarklet.href = bookmarkletHref;
      bookmarklet.className = 'bookmarklet-link';
      bookmarklet.draggable = true;
      bookmarklet.textContent = 'Fill eMoney Holdings';
      bookmarklet.title = 'Fill eMoney Holdings';
      bookmarklet.setAttribute('aria-label', 'Fill eMoney Holdings');
      bookmarklet.onclick = (event) => {
        event.preventDefault();
        showOutput('Drag the Fill eMoney Holdings button to your browser bookmarks bar. Clicking it inside this app is intentionally ignored.', {
          summary: 'Bookmark install reminder',
          open: true,
        });
      };
      bookmarkCard.appendChild(bookmarklet);
      const bookmarkActions = document.createElement('div');
      bookmarkActions.className = 'bookmark-actions';
      const copyBookmarkBtn = makeButton('Copy Bookmark URL', 'ledger-button ghost');
      copyBookmarkBtn.onclick = async () => {
        const copied = await copyTextToClipboard(bookmarkletHref);
        if (copied) {
          opts?.onClipboardWrite?.(bookmarkletHref);
          opts?.onPacketPrepared?.({
            accountNumber: account.accountNumber,
            rowCount: activeFillPacket?.rowCount ?? 0,
            copied: true,
          });
        }
        showOutput(
          copied
            ? 'Bookmark URL copied. In Chrome, create a new bookmark named "Fill eMoney Holdings" and paste this into the URL field if drag-install is awkward.'
            : `Clipboard copy was blocked. Manually copy this bookmark URL into a Chrome bookmark:\n${bookmarkletHref}`,
          { summary: copied ? 'Bookmark URL copied' : 'Bookmark URL copy blocked', open: !copied }
        );
      };
      bookmarkActions.appendChild(copyBookmarkBtn);
      bookmarkCard.appendChild(bookmarkActions);
      const bookmarkletNote = document.createElement('p');
      bookmarkletNote.className = 'transfer-copy-state';
      bookmarkletNote.textContent = 'The saved bookmark should be named Fill eMoney Holdings. No extension or developer mode.';
      bookmarkCard.appendChild(bookmarkletNote);
      transferPanel.appendChild(bookmarkCard);

      const guidance = document.createElement('article');
      guidance.className = 'rail-card operator-guidance';
      guidance.innerHTML = [
        '<strong>Use Chrome or Edge separately.</strong>',
        '<p>Open the eMoney Holdings page, click the saved bookmark, confirm the overlay, review populated rows, then manually save in eMoney.</p>',
        '<p><b>Manual save remains explicit in every completion state.</b></p>',
      ].join('');
      transferPanel.appendChild(guidance);

      const fallbackDetails = document.createElement('details');
      fallbackDetails.className = 'fallback-details';
      const fallbackSummary = document.createElement('summary');
      fallbackSummary.textContent = 'Manual Spreadsheet Paste Fallback';
      fallbackDetails.appendChild(fallbackSummary);
      const fallbackActions = document.createElement('div');
      fallbackActions.className = 'ledger-actions';

      const reportBtn = makeButton('Export Packet Report', 'ledger-button ghost');
      reportBtn.onclick = () => {
        if (!activeFillPacket) return;
        showOutput(buildFillPacketReport(activeFillPacket), { summary: 'Exported packet report', open: true });
        downloadFillPacketReport(activeFillPacket);
      };
      fallbackActions.appendChild(reportBtn);

      const fallbackBtn = makeButton('Copy Manual Spreadsheet Paste Fallback', 'ledger-button ghost');
      fallbackBtn.disabled = !activeManualBatch || activeManualBatch.rowCount === 0;
      fallbackBtn.onclick = async () => {
        if (!activeManualBatch || activeManualBatch.rowCount === 0) return;
        const copied = await copyTextToClipboard(activeManualBatch.clipboardText);
        if (copied) opts?.onClipboardWrite?.(activeManualBatch.clipboardText);
        showOutput(
          copied
            ? buildBatchTransferReport(activeManualBatch)
            : `${buildBatchTransferReport(activeManualBatch)}\n\nTSV fallback packet:\n${activeManualBatch.clipboardText}`,
          {
            summary: copied ? 'Manual fallback copied. Session report' : 'Manual fallback copy blocked',
            open: !copied,
          }
        );
      };
      fallbackActions.appendChild(fallbackBtn);
      fallbackDetails.appendChild(fallbackActions);
      transferPanel.appendChild(fallbackDetails);
    };

    overrideInput.onchange = () => {
      packetCopyStatus = 'idle';
      packetCopiedAt = null;
      renderSummary();
      renderRows();
      renderTransferPacket();
    };

    const actions = document.createElement('div');
    actions.className = 'account-actions';

    const exportBtn = makeButton('Export JSON Payload', 'ledger-button ghost');
    exportBtn.onclick = () => {
      const payload = toAssistantPayloadForAccount(account, {
        allowManualOverride: overrideInput.checked,
      });
      showOutput(`Exported JSON payload for ${payload.holdings.length} eligible holdings.\n\n${JSON.stringify(payload, null, 2)}`, {
        summary: 'JSON payload export',
        open: true,
      });
      opts?.onExport?.(payload);
    };
    actions.appendChild(exportBtn);
    accountWrap.appendChild(actions);

    renderSummary();
    renderRows();
    renderTransferPacket();
    root.appendChild(accountWrap);
  });

  root.appendChild(outputDetails);
}

/** Example usage:
 * const root = document.getElementById('app')!;
 * renderReviewExportSurface(root, parsedIngestionFile);
 */
