const FIELD_LABELS = {
    ticker: 'Ticker',
    units: 'Units',
    costBasis: 'Cost Basis',
};
const ALLOWED_FIELDS = ['ticker', 'units', 'costBasis'];
const DISALLOWED_FIELDS = ['marketValue', 'assetClass', 'sector', 'save'];
const FILL_PACKET_SCHEMA_VERSION = 'emoney-fill-packet/v1';
function formatClipboardCell(value) {
    if (value == null)
        return '';
    return String(value).replace(/[\t\r\n]+/g, ' ').trim();
}
export function buildBatchPastePayload(payload, opts) {
    var _a;
    const previewRows = payload.holdings.map((holding, holdingIndex) => ({
        rowNumber: holdingIndex + 1,
        ticker: formatClipboardCell(holding.ticker),
        units: formatClipboardCell(holding.units),
        costBasis: formatClipboardCell(holding.costBasis),
    }));
    return {
        accountId: payload.accountId,
        accountNumber: payload.accountNumber,
        accountType: payload.accountType,
        rowCount: previewRows.length,
        blockedCount: (_a = opts === null || opts === void 0 ? void 0 : opts.blockedCount) !== null && _a !== void 0 ? _a : 0,
        includedFields: [...ALLOWED_FIELDS],
        excludedFields: [...DISALLOWED_FIELDS],
        clipboardText: previewRows
            .map((row) => [row.ticker, row.units, row.costBasis].join('\t'))
            .join('\n'),
        previewRows,
    };
}
export function buildEmoneyFillPacket(payload, opts) {
    var _a, _b;
    const holdings = payload.holdings.map((holding, holdingIndex) => ({
        rowNumber: holdingIndex + 1,
        ticker: formatClipboardCell(holding.ticker),
        cusip: formatClipboardCell(holding.cusip),
        units: formatClipboardCell(holding.units),
        costBasis: formatClipboardCell(holding.costBasis),
    }));
    return {
        schemaVersion: FILL_PACKET_SCHEMA_VERSION,
        createdAt: (_a = opts === null || opts === void 0 ? void 0 : opts.createdAt) !== null && _a !== void 0 ? _a : new Date().toISOString(),
        accountId: payload.accountId,
        accountNumber: payload.accountNumber,
        accountType: payload.accountType,
        rowCount: holdings.length,
        blockedCount: (_b = opts === null || opts === void 0 ? void 0 : opts.blockedCount) !== null && _b !== void 0 ? _b : 0,
        approvedFields: [...ALLOWED_FIELDS],
        excludedFields: [...DISALLOWED_FIELDS],
        holdings,
    };
}
export function serializeEmoneyFillPacket(packet) {
    return JSON.stringify(packet, null, 2);
}
const EMONEY_FILL_BUTTON_SCRIPT = `(() => {
  const OVERLAY_ID = 'emoney-fill-button-overlay';
  const PACKET_SCHEMA_VERSION = 'emoney-fill-packet/v1';
  const PACKET_MAX_AGE_MS = 8 * 60 * 60 * 1000;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const state = { packet: null, status: 'idle', busy: false, results: [] };

  function normalize(value) {
    return String(value || '').trim().toLowerCase();
  }

  function visible(el) {
    if (!el || typeof el.getBoundingClientRect !== 'function') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function fire(el) {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('keyup', { bubbles: true }));
  }

  function setValue(el, value) {
    if (!el) throw new Error('Expected field was not found.');
    const text = value == null ? '' : String(value);
    el.focus();
    try {
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
      if (descriptor && descriptor.set) descriptor.set.call(el, text);
      else el.value = text;
    } catch (err) {
      el.value = text;
    }
    fire(el);
    if (typeof el.blur === 'function') el.blur();
  }

  function visibleInputs() {
    return Array.from(document.querySelectorAll('input, textarea'))
      .filter((el) => visible(el) && !el.disabled && !el.readOnly);
  }

  function isExpectedEmoneyHoldingsPage() {
    const host = normalize(location.hostname);
    const pageText = normalize((document.title || '') + ' ' + location.href + ' ' + ((document.body && document.body.innerText) || '').slice(0, 12000));
    // eMoney's advisor portal serves on emaplan.com (legacy EMA Plan domain); emoneyadvisor.com
    // and similar are the alternate branded hosts. Accept either family with the holdings-text guard.
    var isEmoneyHost = host.includes('emoney') || host.includes('emaplan');
    return isEmoneyHost && pageText.includes('holding');
  }

  function buttonText(el) {
    return normalize((el.textContent || '') + ' ' + (el.value || '') + ' ' + (el.getAttribute('title') || '') + ' ' + (el.getAttribute('aria-label') || ''));
  }

  function findAddHoldingButton() {
    return Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="Button"], input[type="submit"]'))
      .find((el) => visible(el) && !el.disabled && buttonText(el).includes('add a holding')) || null;
  }

  function clickAddHolding() {
    const button = findAddHoldingButton();
    if (!button) throw new Error('Could not find Add a Holding. Stop and enter manually.');
    button.click();
  }

  // Click "Add a Holding" and WAIT for the server postback to actually produce a fresh blank
  // row before returning it. "Add a Holding" is an ASP.NET postback that re-renders the grid;
  // a fixed delay races that re-render and the value gets written into a node the postback then
  // replaces (the "row filled, then ends up empty" skip the operator saw, with the scroll
  // thrash of each postback). We must NOT gate on visibleInputs().length growing: at the 20-row
  // pagination boundary the grid flips to a fresh page and the visible ticker count RESETS from
  // 20 back to 1, so "count grew" is false exactly when a new row did appear. Instead we wait
  // for a ticker field that is (a) blank and (b) a different DOM node than the one that was
  // newest before the click -- true whether the grid grew OR flipped pages.
  async function addRowAndWaitForBlankRow() {
    const beforeNewest = newestTickerField();
    clickAddHolding();
    for (let i = 0; i < 60; i += 1) { // up to ~15s: a page-flip postback can be slow
      await sleep(250);
      const ticker = newestTickerField();
      if (ticker && ticker !== beforeNewest && normalize(ticker.value) === '') return ticker;
    }
    throw new Error('Add a Holding did not produce a new blank row (the postback never settled). Stop and enter manually.');
  }

  // The newest (last) Ticker input is the row that "Add a Holding" just created and that we
  // are about to fill. eMoney's grid renders each holding in its own row, so the most
  // recently added row's Ticker is always the last Ticker input on the page.
  function newestTickerField() {
    const candidates = visibleInputs().filter((el) => /ticker/i.test(el.id || '') || /ticker/i.test(el.name || ''));
    return candidates[candidates.length - 1] || null;
  }

  // Discovered eMoney WebForms row order for the Holdings screen (visible, enabled inputs
  // only -- Asset Class / Sector are <select>, Market Value is disabled, so none appear):
  //   0 Ticker, 1 CUSIP, 2 Description, 3 Date Acquired, 4 Units, 5 Cost Basis.
  // We slice from the row's Ticker and read by that fixed offset.
  function rowFieldsFromTicker(tickerEl) {
    const fields = visibleInputs();
    const start = fields.indexOf(tickerEl);
    if (start < 0) throw new Error('Ticker field was not found in the visible input list. Stop and enter manually.');
    const nearby = fields.slice(start, start + 16);
    return {
      ticker: nearby[0],
      units: nearby[4],
      costBasis: nearby[5],
    };
  }

  function existingLookupTokens() {
    const tokens = new Set();
    visibleInputs().forEach((el) => {
      const name = String((el.id || '') + ' ' + (el.name || '')).toLowerCase();
      if (name.includes('ticker') || name.includes('cusip')) {
        const value = normalize(el.value);
        if (value) tokens.add(value);
      }
    });
    return tokens;
  }

  function findDuplicateHolding(packet) {
    const tokens = existingLookupTokens();
    return packet.holdings.find((row) => {
      const ticker = normalize(row.ticker);
      const cusip = normalize(row.cusip);
      return (ticker && tokens.has(ticker)) || (cusip && tokens.has(cusip));
    }) || null;
  }

  function validatePacket(packet) {
    if (!packet || typeof packet !== 'object') throw new Error('Fill packet is malformed.');
    if (packet.schemaVersion !== PACKET_SCHEMA_VERSION) throw new Error('Fill packet version is not supported.');
    const createdMs = Date.parse(packet.createdAt);
    if (!Number.isFinite(createdMs)) throw new Error('Fill packet timestamp is invalid.');
    if (Date.now() - createdMs > PACKET_MAX_AGE_MS) throw new Error('Fill packet is stale. Return to the desktop app and copy a fresh packet.');
    if (!Array.isArray(packet.holdings) || packet.holdings.length === 0) throw new Error('Fill packet has no eligible holdings.');
    if (packet.rowCount !== packet.holdings.length) throw new Error('Fill packet row count does not match holdings.');
    const approved = JSON.stringify(packet.approvedFields || []);
    if (approved !== JSON.stringify(['ticker', 'units', 'costBasis'])) throw new Error('Fill packet approved fields are not allowed.');
    packet.holdings.forEach((row, index) => {
      if (!normalize(row.ticker)) throw new Error('Row ' + (index + 1) + ' is missing ticker.');
      if (!normalize(row.units)) throw new Error('Row ' + (index + 1) + ' is missing units.');
      if (!normalize(row.costBasis)) throw new Error('Row ' + (index + 1) + ' is missing cost basis.');
    });
    return packet;
  }

  function parsePacketText(text) {
    let raw;
    try {
      raw = JSON.parse(text);
    } catch (parseErr) {
      throw new Error('Clipboard did not contain a Fill Packet. Copy a fresh packet from the desktop app, then click Read Clipboard again.');
    }
    return validatePacket(raw);
  }

  function ensureOverlay() {
    const existing = document.getElementById(OVERLAY_ID);
    if (existing) existing.remove();

    const style = document.createElement('style');
    style.textContent = '#' + OVERLAY_ID + '{position:fixed;right:16px;top:16px;z-index:2147483647;width:380px;max-width:calc(100vw - 32px);background:#fafafd;border:1px solid #d6dae2;border-radius:6px;box-shadow:0 8px 24px rgba(20,28,40,.12),0 2px 4px rgba(20,28,40,.06);padding:16px;font-family:"Segoe UI Variable Text","Segoe UI",system-ui,-apple-system,sans-serif;font-size:13px;line-height:1.5;color:#1d1f25}#' + OVERLAY_ID + ' h2{font-family:"Segoe UI Variable Display","Segoe UI Variable","Segoe UI",system-ui,sans-serif;font-size:15px;font-weight:600;letter-spacing:-0.005em;margin:0 0 10px;color:#1d1f25}#' + OVERLAY_ID + ' p{margin:6px 0;font-size:13px}#' + OVERLAY_ID + ' textarea{width:100%;height:96px;margin:8px 0;font-family:"Cascadia Code","Cascadia Mono","Consolas",ui-monospace,monospace;font-size:11.5px;padding:8px;border:1px solid #d6dae2;border-radius:4px;background:#ffffff;color:#1d1f25;resize:vertical}#' + OVERLAY_ID + ' textarea:focus{outline:2px solid #3450b8;outline-offset:1px;border-color:#3450b8}#' + OVERLAY_ID + ' button{margin:8px 6px 0 0;padding:6px 12px;border:1px solid #3450b8;background:#3450b8;color:#fff;border-radius:4px;font-family:"Segoe UI Variable Text","Segoe UI",system-ui,sans-serif;font-size:13px;font-weight:600;line-height:1.2;cursor:pointer;transition:background 120ms cubic-bezier(.22,1,.36,1),border-color 120ms}#' + OVERLAY_ID + ' button:hover{background:#2a3f99;border-color:#2a3f99}#' + OVERLAY_ID + ' button:focus-visible{outline:2px solid #3450b8;outline-offset:2px}#' + OVERLAY_ID + ' button.secondary{background:#fafafd;color:#1d1f25;border-color:#b2bac9}#' + OVERLAY_ID + ' button.secondary:hover{background:#eef0f5;border-color:#8b94a8}#' + OVERLAY_ID + ' button:disabled{opacity:.5;background:#eef0f5;border-color:#d6dae2;color:#8b94a8;cursor:not-allowed}#' + OVERLAY_ID + ' .bad{color:#a13b2e;font-weight:600}#' + OVERLAY_ID + ' .ok{color:#2e7d4f;font-weight:600}#' + OVERLAY_ID + ' .meta{border-top:1px solid #d6dae2;border-bottom:1px solid #d6dae2;padding:10px 0;margin:10px 0;font-family:"Cascadia Code","Cascadia Mono","Consolas",ui-monospace,monospace;font-size:11.5px;line-height:1.55;color:#1d1f25}#' + OVERLAY_ID + ' .meta strong{font-family:"Segoe UI Variable Text","Segoe UI",system-ui,sans-serif;color:#595e6c;font-weight:500}#' + OVERLAY_ID + ' .footer{margin-top:12px;padding-top:10px;border-top:1px solid #d6dae2;color:#595e6c;font-size:12px}';
    document.head.appendChild(style);

    const overlay = document.createElement('section');
    overlay.id = OVERLAY_ID;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Fill eMoney Holdings');
    overlay.innerHTML =
      '<h2>Fill eMoney Holdings</h2>' +
      '<p id="emfb-status">Read the reviewed packet from clipboard, then confirm before any row is changed.</p>' +
      '<div class="meta" id="emfb-meta">No packet loaded.</div>' +
      '<textarea id="emfb-paste" placeholder="Paste packet manually if Chrome blocks clipboard access." hidden></textarea>' +
      '<div>' +
      '<button id="emfb-read">Read Clipboard</button>' +
      '<button id="emfb-use-paste" class="secondary" hidden>Use Pasted Packet</button>' +
      '<button id="emfb-confirm" disabled>Confirm Fill Rows</button>' +
      '<button id="emfb-close" class="secondary">Close</button>' +
      '</div>' +
      '<p><strong>Boundary:</strong> Save remains manual. This helper fills ticker, units, and cost basis only.</p>';
    document.body.appendChild(overlay);
    return overlay;
  }

  function updateOverlay() {
    const status = document.getElementById('emfb-status');
    const meta = document.getElementById('emfb-meta');
    const confirm = document.getElementById('emfb-confirm');
    if (!status || !meta || !confirm) return;
    status.className = state.status.startsWith('Error') ? 'bad' : state.status.startsWith('Complete') ? 'ok' : '';
    status.textContent = state.status;
    if (state.packet) {
      meta.innerHTML =
        '<strong>Account:</strong> ' + state.packet.accountNumber + '<br>' +
        '<strong>Rows:</strong> ' + state.packet.rowCount + ' eligible; ' + state.packet.blockedCount + ' blocked excluded<br>' +
        '<strong>Included:</strong> ticker, units, cost basis<br>' +
        '<strong>Excluded:</strong> market value, asset class, sector, Save';
    }
    confirm.disabled = !state.packet || state.busy;
  }

  function setError(message) {
    state.status = 'Error: ' + message;
    updateOverlay();
  }

  async function loadClipboardPacket() {
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) throw new Error('Chrome blocked clipboard read on this page. Paste the packet manually below.');
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) throw new Error('Clipboard is empty. Copy a fresh packet from the desktop app, then click Read Clipboard.');
      state.packet = parsePacketText(text);
      state.status = 'Packet ready. Confirm this is the correct eMoney Holdings page for account ' + state.packet.accountNumber + '.';
      updateOverlay();
    } catch (err) {
      const paste = document.getElementById('emfb-paste');
      const usePaste = document.getElementById('emfb-use-paste');
      if (paste) paste.hidden = false;
      if (usePaste) usePaste.hidden = false;
      setError(err && err.message ? err.message : String(err));
    }
  }

  function loadPastedPacket() {
    try {
      const paste = document.getElementById('emfb-paste');
      state.packet = parsePacketText(paste ? paste.value : '');
      state.status = 'Packet ready. Confirm this is the correct eMoney Holdings page for account ' + state.packet.accountNumber + '.';
      updateOverlay();
    } catch (err) {
      setError(err && err.message ? err.message : String(err));
    }
  }

  async function fillRows() {
    if (!state.packet || state.busy) return;
    state.busy = true;
    updateOverlay();
    try {
      if (!isExpectedEmoneyHoldingsPage()) throw new Error('This does not look like the expected eMoney Holdings page.');
      const duplicate = findDuplicateHolding(state.packet);
      if (duplicate) throw new Error('Possible duplicate existing holding detected for ' + duplicate.ticker + '. No rows were filled.');
      state.results = [];
      for (let i = 0; i < state.packet.holdings.length; i += 1) {
        const row = state.packet.holdings[i];
        state.status = 'Adding row ' + (i + 1) + ' of ' + state.packet.holdings.length + ': ' + row.ticker;
        updateOverlay();

        // Add a fresh row and wait for the postback to settle on a real blank row, then fill
        // the newest Ticker / Units / Cost Basis. A leftover empty entry row is expected at the
        // end; the operator deletes it during review. Save is never clicked here.
        const tickerEl = await addRowAndWaitForBlankRow();
        if (!tickerEl) throw new Error('Could not find newest ticker field after adding row.');
        const fields = rowFieldsFromTicker(tickerEl);
        if (!fields.ticker || !fields.units || !fields.costBasis) throw new Error('Could not locate ticker, units, and cost basis fields.');
        setValue(fields.ticker, row.ticker);
        await sleep(900); // let eMoney resolve description / asset class / sector from the ticker
        setValue(fields.units, row.units);
        setValue(fields.costBasis, row.costBasis);
        // Read back the ticker we just set. If a postback fired between the wait and the fill,
        // the value would be wiped and the row silently skipped -- turn that into a loud stop so
        // the operator never unknowingly saves a short list.
        if (normalize(fields.ticker.value) !== normalize(row.ticker)) {
          throw new Error('Row ' + (i + 1) + ' (' + row.ticker + ') did not stick after fill (the grid re-rendered mid-row). Stop and enter manually.');
        }
        state.results.push({ row: i + 1, ticker: row.ticker, status: 'filled' });
      }
      state.status = 'Complete: ' + state.results.length + ' rows added to the eMoney entry list. Review every row, then Save in eMoney yourself.';
      console.table(state.results);
      console.log('Fill eMoney Holdings complete. Save remains manual.', state.results);
    } catch (err) {
      setError(err && err.message ? err.message : String(err));
      console.error('Fill eMoney Holdings stopped before completion.', err);
    } finally {
      state.busy = false;
      updateOverlay();
    }
  }

  const overlay = ensureOverlay();
  overlay.querySelector('#emfb-read').addEventListener('click', loadClipboardPacket);
  overlay.querySelector('#emfb-use-paste').addEventListener('click', loadPastedPacket);
  overlay.querySelector('#emfb-confirm').addEventListener('click', fillRows);
  overlay.querySelector('#emfb-close').addEventListener('click', () => overlay.remove());
  state.status = 'Reading clipboard...';
  updateOverlay();
  loadClipboardPacket();
})();`;
export function buildEmoneyFillButtonScript() {
    return EMONEY_FILL_BUTTON_SCRIPT;
}
export function buildEmoneyFillBookmarklet() {
    return `javascript:${encodeURIComponent(EMONEY_FILL_BUTTON_SCRIPT)}`;
}
export function buildPasteConductorSession(payload, opts) {
    var _a;
    const steps = [];
    payload.holdings.forEach((holding, holdingIndex) => {
        var _a;
        const rowNumber = holdingIndex + 1;
        const rowTicker = String((_a = holding.ticker) !== null && _a !== void 0 ? _a : '').trim() || `Row ${rowNumber}`;
        const values = {
            ticker: holding.ticker,
            units: holding.units,
            costBasis: holding.costBasis,
        };
        ALLOWED_FIELDS.forEach((fieldName) => {
            const clipboardValue = values[fieldName] == null ? '' : String(values[fieldName]);
            steps.push({
                stepId: `row-${rowNumber}-${fieldName}`,
                rowNumber,
                fieldName,
                fieldLabel: FIELD_LABELS[fieldName],
                ticker: rowTicker,
                clipboardValue,
                operatorInstruction: `Paste into eMoney row ${rowNumber} ${FIELD_LABELS[fieldName]} field, then mark this step complete.`,
            });
        });
    });
    return {
        accountId: payload.accountId,
        accountNumber: payload.accountNumber,
        accountType: payload.accountType,
        blockedCount: (_a = opts === null || opts === void 0 ? void 0 : opts.blockedCount) !== null && _a !== void 0 ? _a : 0,
        totalRows: payload.holdings.length,
        totalSteps: steps.length,
        currentStepIndex: 0,
        status: steps.length > 0 ? 'ready' : 'complete',
        allowedFields: [...ALLOWED_FIELDS],
        disallowedFields: [...DISALLOWED_FIELDS],
        steps,
    };
}
export function getCurrentTransferStep(session) {
    var _a;
    return (_a = session.steps[session.currentStepIndex]) !== null && _a !== void 0 ? _a : null;
}
export function advanceTransferSession(session) {
    if (session.status === 'complete')
        return session;
    const nextStepIndex = Math.min(session.currentStepIndex + 1, session.totalSteps);
    return {
        ...session,
        currentStepIndex: nextStepIndex,
        status: nextStepIndex >= session.totalSteps ? 'complete' : 'in_progress',
    };
}
export function completeTransferSession(session) {
    return {
        ...session,
        currentStepIndex: session.totalSteps,
        status: 'complete',
    };
}
