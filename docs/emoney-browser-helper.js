/**
 * eMoney holdings browser helper (local-only, browser-injected).
 *
 * Notes:
 * - Targets holding rows at `#holdingsTable > tr`.
 * - Does not click Save / does not auto-save.
 * - Does not overwrite asset class or sector (eMoney autolookup owns those fields).
 * - Intended for manual, human-in-the-loop workflows.
 */
const SELECTORS = {
    tableRows: '#holdingsTable > tr',
    addHoldingButton: [
        'button#addHolding',
        'button[data-action="add-holding"]',
        'button[title="Add a Holding"]',
        'a[title="Add a Holding"]',
        'input[value="Add a Holding"]',
    ],
    ticker: ['input[name*="ticker" i]', 'input[id*="ticker" i]'],
    cusip: ['input[name*="cusip" i]', 'input[id*="cusip" i]'],
    description: ['input[name*="description" i]', 'input[id*="description" i]'],
    units: ['input[name*="unit" i]', 'input[id*="unit" i]', 'input[name*="share" i]'],
    costBasis: ['input[name*="cost" i]', 'input[id*="cost" i]'],
    marketValue: ['input[name*="market" i]', 'input[id*="market" i]', 'input[name*="value" i]'],
    assetClass: ['input[name*="assetclass" i]', 'input[id*="assetclass" i]', 'select[name*="assetclass" i]'],
    sector: ['input[name*="sector" i]', 'input[id*="sector" i]', 'select[name*="sector" i]'],
};
function firstMatch(root, selectors) {
    for (const selector of selectors) {
        const el = root.querySelector(selector);
        if (el)
            return el;
    }
    return null;
}
function getInputValue(root, selectors) {
    var _a, _b, _c, _d;
    const el = firstMatch(root, selectors);
    if (!el)
        return null;
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
        return (_b = (_a = el.value) === null || _a === void 0 ? void 0 : _a.trim()) !== null && _b !== void 0 ? _b : null;
    }
    return (_d = (_c = el.textContent) === null || _c === void 0 ? void 0 : _c.trim()) !== null && _d !== void 0 ? _d : null;
}
function setInputValue(root, selectors, value) {
    const el = firstMatch(root, selectors);
    if (!el)
        return false;
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement))
        return false;
    el.focus();
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
}
function blurField(root, selectors) {
    const el = firstMatch(root, selectors);
    if (!el)
        return;
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        el.blur();
        el.dispatchEvent(new Event('blur', { bubbles: true }));
    }
}
function normalizeToken(value) {
    return (value !== null && value !== void 0 ? value : '').trim().toLowerCase();
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/** Returns all table rows under #holdingsTable. */
export function getHoldingRows() {
    return Array.from(document.querySelectorAll(SELECTORS.tableRows));
}
/** Reads key fields from an existing holding row. */
export function readHoldingRow(row) {
    const marketValueEl = firstMatch(row, SELECTORS.marketValue);
    const marketValueDisabled = marketValueEl instanceof HTMLInputElement
        ? marketValueEl.disabled || marketValueEl.getAttribute('aria-disabled') === 'true'
        : false;
    return {
        ticker: getInputValue(row, SELECTORS.ticker),
        cusip: getInputValue(row, SELECTORS.cusip),
        description: getInputValue(row, SELECTORS.description),
        units: getInputValue(row, SELECTORS.units),
        costBasis: getInputValue(row, SELECTORS.costBasis),
        marketValue: getInputValue(row, SELECTORS.marketValue),
        marketValueDisabled,
        assetClass: getInputValue(row, SELECTORS.assetClass),
        sector: getInputValue(row, SELECTORS.sector),
    };
}
/** Clicks add-holding control and returns the new row. */
export async function addHoldingRow() {
    const before = getHoldingRows();
    const addButton = firstMatch(document, SELECTORS.addHoldingButton);
    if (!addButton)
        throw new Error('Add holding button not found.');
    addButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    for (let i = 0; i < 20; i++) {
        await sleep(100);
        const after = getHoldingRows();
        if (after.length > before.length)
            return after[after.length - 1];
    }
    throw new Error('Failed to detect a newly added holding row.');
}
/**
 * Writes holding values into a row.
 * - Writes ticker/cusip then blurs to allow eMoney lookup.
 * - Does not write asset class/sector (autopopulated by eMoney).
 * - Market value disabled is treated as warning, not fatal.
 */
export async function fillHoldingRow(row, holding) {
    var _a, _b;
    const warnings = [];
    const errors = [];
    const lookupValue = normalizeToken(holding.cusip) ? holding.cusip : ((_a = holding.ticker) !== null && _a !== void 0 ? _a : '');
    if (!normalizeToken(lookupValue)) {
        errors.push('Missing ticker/cusip for lookup.');
        return { ok: false, warnings, errors };
    }
    const wroteCusip = normalizeToken(holding.cusip)
        ? setInputValue(row, SELECTORS.cusip, String(holding.cusip).trim())
        : false;
    const wroteTicker = !wroteCusip ? setInputValue(row, SELECTORS.ticker, String((_b = holding.ticker) !== null && _b !== void 0 ? _b : '').trim()) : false;
    if (!wroteCusip && !wroteTicker) {
        errors.push('Could not find ticker/cusip field in row.');
        return { ok: false, warnings, errors };
    }
    blurField(row, wroteCusip ? SELECTORS.cusip : SELECTORS.ticker);
    await sleep(250);
    if (holding.units != null && !setInputValue(row, SELECTORS.units, String(holding.units))) {
        warnings.push('Units field not found; skipped.');
    }
    if (holding.costBasis != null && !setInputValue(row, SELECTORS.costBasis, String(holding.costBasis))) {
        warnings.push('Cost basis field not found; skipped.');
    }
    if (holding.marketValue != null) {
        const marketValueEl = firstMatch(row, SELECTORS.marketValue);
        if (marketValueEl instanceof HTMLInputElement && marketValueEl.disabled) {
            warnings.push('Market value field is disabled in eMoney; treated as warning.');
        }
        else if (!setInputValue(row, SELECTORS.marketValue, String(holding.marketValue))) {
            warnings.push('Market value field not found; skipped.');
        }
    }
    return { ok: errors.length === 0, warnings, errors };
}
/**
 * Resolves row matching with ambiguity awareness:
 * - unique match => safe to update
 * - multiple matches => requires human intervention (no automatic update)
 */
export function findMatchingRow(holding) {
    const rows = getHoldingRows();
    const targetCusip = normalizeToken(holding.cusip);
    const targetTicker = normalizeToken(holding.ticker);
    const targetDescription = normalizeToken(holding.description);
    const byCusip = targetCusip
        ? rows.filter((row) => normalizeToken(readHoldingRow(row).cusip) === targetCusip)
        : [];
    if (byCusip.length > 1)
        return { status: 'ambiguous', matchType: 'cusip', candidateCount: byCusip.length };
    if (byCusip.length === 1)
        return { status: 'unique', matchType: 'cusip', candidateCount: 1, row: byCusip[0] };
    const byTicker = targetTicker
        ? rows.filter((row) => normalizeToken(readHoldingRow(row).ticker) === targetTicker)
        : [];
    if (byTicker.length > 1)
        return { status: 'ambiguous', matchType: 'ticker', candidateCount: byTicker.length };
    if (byTicker.length === 1)
        return { status: 'unique', matchType: 'ticker', candidateCount: 1, row: byTicker[0] };
    const byDescription = targetDescription
        ? rows.filter((row) => normalizeToken(readHoldingRow(row).description) === targetDescription)
        : [];
    if (byDescription.length > 1) {
        return { status: 'ambiguous', matchType: 'description', candidateCount: byDescription.length };
    }
    if (byDescription.length === 1) {
        return { status: 'unique', matchType: 'description', candidateCount: 1, row: byDescription[0] };
    }
    return { status: 'none', candidateCount: 0 };
}
/** Finds an existing row or adds a new one, then fills it. */
export async function upsertHolding(holding) {
    const match = findMatchingRow(holding);
    if (match.status === 'ambiguous') {
        return {
            ok: false,
            warnings: [],
            errors: [
                `Ambiguous ${match.matchType} match; ${match.candidateCount} candidate rows found. Manual intervention required.`,
            ],
            requiresHumanIntervention: true,
            reasonCode: 'AMBIGUOUS_MATCH',
            matchType: match.matchType,
            candidateCount: match.candidateCount,
        };
    }
    const row = match.status === 'unique' && match.row ? match.row : await addHoldingRow();
    return fillHoldingRow(row, holding);
}
/** Processes a batch sequentially to keep UI interactions deterministic. */
export async function processHoldingsBatch(holdings) {
    const results = [];
    for (let i = 0; i < holdings.length; i++) {
        const result = await upsertHolding(holdings[i]);
        results.push({ index: i, holding: holdings[i], ...result });
    }
    return {
        total: holdings.length,
        succeeded: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok).length,
        results,
    };
}
/** Example parser-to-assistant input (minimal shape expected by this helper). */
export const exampleHoldingsInput = [
    { ticker: 'VTI', units: 100, costBasis: 25000 },
    { cusip: '594918104', units: 50, costBasis: 10000, marketValue: 17500 },
];
/** Example usage in browser console / injected script. */
export async function exampleUsage() {
    const outcome = await processHoldingsBatch(exampleHoldingsInput);
    console.log('eMoney batch outcome:', outcome);
    // Intentionally no save click here (no auto-save).
    return outcome;
}
