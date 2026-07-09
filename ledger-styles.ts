const STYLE_ID = 'regulated-ledger-style';

export function installRegulatedLedgerStyles(): void {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    :root {
      --bg: oklch(0.985 0.004 240);
      --surface: oklch(0.998 0.002 240);
      --surface-recess: oklch(0.972 0.005 240);
      --surface-strong: oklch(0.965 0.006 240);
      --ink: oklch(0.20 0.012 250);
      --ink-muted: oklch(0.46 0.011 245);
      --ink-soft: oklch(0.60 0.009 245);
      --line: oklch(0.89 0.005 240);
      --line-strong: oklch(0.80 0.007 240);
      --accent: oklch(0.45 0.13 250);
      --accent-ink: oklch(0.99 0.005 240);
      --accent-soft: oklch(0.95 0.022 250);
      --accent-line: oklch(0.84 0.05 250);
      --ok: oklch(0.50 0.13 155);
      --ok-soft: oklch(0.96 0.02 155);
      --ok-line: oklch(0.85 0.05 155);
      --review: oklch(0.55 0.15 70);
      --review-soft: oklch(0.96 0.04 80);
      --review-line: oklch(0.84 0.08 75);
      --block: oklch(0.50 0.18 25);
      --block-soft: oklch(0.97 0.022 25);
      --block-line: oklch(0.86 0.07 25);

      --sans: "Segoe UI Variable Display", "Segoe UI Variable", "Segoe UI", system-ui, -apple-system, sans-serif;
      --sans-text: "Segoe UI Variable Text", "Segoe UI Variable", "Segoe UI", system-ui, -apple-system, sans-serif;
      --mono: "Cascadia Code", "Cascadia Mono", "Consolas", ui-monospace, "SFMono-Regular", monospace;

      --r-sm: 3px;
      --r: 4px;
      --r-lg: 6px;

      --s-1: 4px;
      --s-2: 8px;
      --s-3: 12px;
      --s-4: 16px;
      --s-5: 20px;
      --s-6: 24px;
      --s-8: 32px;
      --s-10: 40px;

      --ease: cubic-bezier(0.22, 1, 0.36, 1);
      --motion-fast: 120ms var(--ease);
      --motion: 180ms var(--ease);
      --motion-slow: 240ms var(--ease);

      --hairline: 0 0 0 1px var(--line);
      --shadow-rest: 0 1px 0 oklch(0.92 0.004 240 / 0.6);
      --shadow-lift: 0 1px 2px rgba(20, 28, 40, 0.06), 0 1px 1px rgba(20, 28, 40, 0.04);
    }

    * { box-sizing: border-box; }

    html { color-scheme: light; }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: var(--sans-text);
      font-size: 14px;
      line-height: 1.5;
      font-feature-settings: "ss01", "cv11";
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }

    .ledger-shell {
      width: min(1280px, calc(100vw - 32px));
      margin: 0 auto;
      padding: var(--s-5) 0 var(--s-8);
      display: grid;
      gap: var(--s-4);
    }

    /* ── App header ───────────────────────────────────────────────────── */

    .ledger-app-header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: var(--s-6);
      align-items: center;
      padding: var(--s-4) var(--s-5);
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--r);
      box-shadow: var(--shadow-rest);
    }

    .ledger-brand {
      display: flex;
      gap: var(--s-4);
      align-items: center;
      min-width: 0;
    }

    .ledger-mark {
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      flex: 0 0 auto;
      background: var(--ink);
      color: var(--accent-ink);
      border-radius: var(--r);
      font-family: var(--sans);
      font-weight: 600;
      font-size: 18px;
      line-height: 1;
      letter-spacing: -0.01em;
    }

    .ledger-title {
      font-family: var(--sans);
      font-size: 18px;
      font-weight: 600;
      line-height: 1.2;
      letter-spacing: -0.005em;
      margin: 0;
      color: var(--ink);
    }

    .ledger-subtitle {
      margin: 2px 0 0;
      font-family: var(--mono);
      font-size: 10.5px;
      font-weight: 400;
      letter-spacing: 0.04em;
      color: var(--ink-soft);
      text-transform: uppercase;
    }

    .ledger-header-right {
      display: grid;
      justify-items: end;
      gap: var(--s-2);
      min-width: 0;
    }

    .ledger-session {
      display: inline-flex;
      gap: var(--s-2);
      align-items: center;
      margin: 0;
      color: var(--ink-muted);
      font-size: 12px;
      font-weight: 500;
    }

    .ledger-session i {
      width: 6px;
      height: 6px;
      border-radius: 999px;
      background: var(--ink-soft);
      transition: background var(--motion-fast);
    }

    .ledger-session.is-active i {
      background: var(--ok);
    }

    .ledger-safety-badges {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 6px;
    }

    .ledger-safety-badges span {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border: 1px solid var(--line);
      border-radius: var(--r-sm);
      background: var(--surface-recess);
      color: var(--ink-muted);
      font-family: var(--mono);
      font-size: 10.5px;
      font-weight: 400;
      letter-spacing: 0.02em;
      white-space: nowrap;
    }

    .ledger-safety-badges span::before {
      content: "";
      display: inline-block;
      width: 5px;
      height: 5px;
      border-radius: 999px;
      background: var(--ok);
    }

    .ledger-safety-badges .build-pill {
      color: var(--ink-soft);
    }

    .ledger-safety-badges .build-pill::before {
      background: var(--accent);
    }

    /* ── Workflow stepper ─────────────────────────────────────────────── */

    .workflow-stepper {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0;
      padding: 0;
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--r);
    }

    .workflow-step {
      position: relative;
      display: flex;
      align-items: center;
      gap: var(--s-3);
      padding: var(--s-3) var(--s-4);
      color: var(--ink-soft);
      font-size: 13px;
      font-weight: 500;
      border-right: 1px solid var(--line);
    }

    .workflow-step:last-child { border-right: 0; }

    .workflow-step b {
      display: grid;
      place-items: center;
      width: 22px;
      height: 22px;
      flex: 0 0 auto;
      border: 1px solid var(--line-strong);
      background: var(--surface);
      color: var(--ink-soft);
      border-radius: 999px;
      font-family: var(--mono);
      font-size: 11px;
      font-weight: 600;
      transition: background var(--motion-fast), border-color var(--motion-fast), color var(--motion-fast);
    }

    .workflow-step.is-complete {
      color: var(--ink-muted);
    }

    .workflow-step.is-complete b {
      border-color: var(--ok);
      background: var(--ok);
      color: var(--accent-ink);
      font-size: 0;
    }

    .workflow-step.is-complete b::before {
      content: "\\2713";
      font-family: var(--sans);
      font-size: 12px;
      font-weight: 700;
    }

    .workflow-step.is-active {
      color: var(--ink);
      font-weight: 600;
      background: var(--accent-soft);
    }

    .workflow-step.is-active b {
      border-color: var(--accent);
      background: var(--accent);
      color: var(--accent-ink);
      animation: stepPulse 220ms var(--ease) 1;
    }

    /* Kept name 'stepPulse' for source-level test compatibility; redefined as a one-shot,
       state-conveying enter, not the decorative infinite loop the prior design used. */
    @keyframes stepPulse {
      from { transform: scale(0.78); opacity: 0.4; }
      to   { transform: scale(1);    opacity: 1; }
    }

    /* ── Panels ───────────────────────────────────────────────────────── */

    .ledger-panel {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--r);
      padding: var(--s-4);
    }

    .ledger-load-panel {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: var(--s-5);
      align-items: center;
    }

    .ledger-panel h2,
    .ledger-panel h3 {
      font-family: var(--sans);
      letter-spacing: -0.005em;
      margin: 0;
      color: var(--ink);
      font-weight: 600;
    }

    .ledger-panel h2 { font-size: 16px; }
    .ledger-panel h3 { font-size: 14px; }

    .ledger-status-line {
      margin: var(--s-2) 0 0;
      color: var(--ink-muted);
      font-size: 13px;
      min-height: 20px;
    }

    .ledger-checks {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0;
      margin: var(--s-3) 0 0;
      border: 1px solid var(--line);
      border-radius: var(--r);
      background: var(--surface-recess);
    }

    .ledger-check {
      padding: var(--s-3) var(--s-4);
      border-right: 1px solid var(--line);
    }

    .ledger-check:last-child { border-right: 0; }

    .ledger-check span {
      display: block;
      color: var(--ink-soft);
      font-family: var(--mono);
      font-size: 10.5px;
      font-weight: 400;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .ledger-check strong {
      display: block;
      margin-top: 4px;
      font-family: var(--sans-text);
      font-size: 13px;
      font-weight: 600;
      color: var(--ink);
    }

    /* ── Actions / buttons ────────────────────────────────────────────── */

    .ledger-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--s-2);
      align-items: center;
    }

    .ledger-button {
      appearance: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--s-2);
      padding: 7px 12px;
      border: 1px solid var(--accent);
      background: var(--accent);
      color: var(--accent-ink);
      border-radius: var(--r);
      font-family: var(--sans-text);
      font-size: 13px;
      font-weight: 600;
      line-height: 1.2;
      letter-spacing: 0;
      cursor: pointer;
      transition: background var(--motion-fast), border-color var(--motion-fast), color var(--motion-fast);
    }

    .ledger-button:hover {
      background: oklch(0.40 0.14 250);
      border-color: oklch(0.40 0.14 250);
    }

    .ledger-button:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }

    .ledger-button.secondary {
      background: var(--surface);
      color: var(--ink);
      border-color: var(--line-strong);
    }

    .ledger-button.secondary:hover {
      background: var(--surface-recess);
      border-color: var(--ink-soft);
    }

    .ledger-button.ghost {
      background: transparent;
      color: var(--ink);
      border-color: transparent;
    }

    .ledger-button.ghost:hover {
      background: var(--surface-recess);
      border-color: var(--line);
    }

    .ledger-button:disabled,
    .ledger-button[aria-disabled="true"] {
      cursor: not-allowed;
      opacity: 0.5;
      background: var(--surface-recess);
      color: var(--ink-soft);
      border-color: var(--line);
    }

    .ledger-button.full-width {
      width: 100%;
    }

    .ledger-file-input {
      max-width: 280px;
      color: var(--ink-muted);
      font-family: var(--sans-text);
      font-size: 13px;
    }

    .ledger-file-input::file-selector-button {
      margin-right: var(--s-2);
      padding: 6px 10px;
      border: 1px solid var(--line-strong);
      background: var(--surface);
      color: var(--ink);
      border-radius: var(--r);
      font-family: var(--sans-text);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background var(--motion-fast), border-color var(--motion-fast);
    }

    .ledger-file-input::file-selector-button:hover {
      background: var(--surface-recess);
      border-color: var(--ink-soft);
    }

    /* ── Review surface ───────────────────────────────────────────────── */

    .review-root {
      display: grid;
      gap: var(--s-4);
    }

    .review-heading {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: var(--s-4);
      align-items: end;
    }

    .review-heading h2 {
      font-family: var(--sans);
      font-size: 22px;
      font-weight: 600;
      letter-spacing: -0.01em;
      margin: 0;
      color: var(--ink);
    }

    .review-heading p {
      margin: 4px 0 0;
      color: var(--ink-muted);
      max-width: 70ch;
      font-size: 13px;
      line-height: 1.5;
    }

    /* ── Metric strip ─────────────────────────────────────────────────── */

    .metric-strip {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0;
      border: 1px solid var(--line);
      border-radius: var(--r);
      background: var(--surface);
    }

    .metric-card {
      padding: var(--s-3) var(--s-4);
      border-right: 1px solid var(--line);
    }

    .metric-card:last-child { border-right: 0; }

    .metric-card span {
      display: block;
      color: var(--ink-soft);
      font-family: var(--mono);
      font-size: 10.5px;
      font-weight: 400;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .metric-card strong {
      display: block;
      margin-top: var(--s-1);
      font-family: var(--mono);
      font-size: 22px;
      font-weight: 500;
      font-variant-numeric: tabular-nums;
      line-height: 1.1;
      color: var(--ink);
    }

    /* ── Safety banner ────────────────────────────────────────────────── */

    .safety-banner {
      display: flex;
      gap: var(--s-3);
      align-items: flex-start;
      border: 1px solid var(--review-line);
      background: var(--review-soft);
      border-radius: var(--r);
      padding: var(--s-3) var(--s-4);
      color: oklch(0.32 0.08 75);
      font-size: 13px;
      font-weight: 500;
      line-height: 1.5;
    }

    /* ── Preflight summary (sticky) ──────────────────────────────────── */

    .preflight-summary {
      position: sticky;
      top: 0;
      z-index: 3;
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0;
      border: 1px solid var(--line);
      border-radius: var(--r);
      background: var(--surface);
      box-shadow: var(--shadow-lift);
    }

    .preflight-summary-global {
      margin-bottom: 0;
    }

    .preflight-metric {
      padding: var(--s-3) var(--s-4);
      border-right: 1px solid var(--line);
    }

    .preflight-metric:last-of-type { border-right: 0; }

    .preflight-metric span {
      display: block;
      margin-bottom: var(--s-1);
      color: var(--ink-soft);
      font-family: var(--mono);
      font-size: 10.5px;
      font-weight: 400;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .preflight-metric strong {
      font-family: var(--mono);
      font-size: 18px;
      font-weight: 500;
      font-variant-numeric: tabular-nums;
      line-height: 1.1;
      color: var(--ink);
    }

    .preflight-metric.is-eligible strong { color: var(--ok); }
    .preflight-metric.is-blocked strong  { color: var(--block); }
    .preflight-metric.is-warning strong  { color: var(--review); }

    /* ── Account panel ────────────────────────────────────────────────── */

    .account-panel {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--r);
      overflow: hidden;
    }

    .account-header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: var(--s-4);
      padding: var(--s-3) var(--s-4);
      border-bottom: 1px solid var(--line);
      background: var(--surface);
    }

    .account-header h3 {
      font-family: var(--sans);
      font-size: 16px;
      font-weight: 600;
      letter-spacing: -0.005em;
      margin: 0;
      color: var(--ink);
    }

    .account-header h3 small {
      display: inline-block;
      margin-left: var(--s-2);
      font-family: var(--mono);
      font-weight: 400;
      font-size: 12px;
      color: var(--ink-muted);
    }

    .account-header p {
      color: var(--ink-muted);
      margin: 4px 0 0;
      font-size: 12.5px;
    }

    .account-preflight {
      top: 0;
      border-width: 0 0 1px;
      border-radius: 0;
      box-shadow: none;
    }

    .override-row {
      display: flex;
      gap: var(--s-3);
      align-items: center;
      padding: var(--s-3) var(--s-4);
      background: var(--surface-recess);
      border-bottom: 1px solid var(--line);
      color: var(--ink-muted);
      font-size: 13px;
      font-weight: 500;
    }

    .override-row input[type="checkbox"] {
      width: 14px;
      height: 14px;
      accent-color: var(--accent);
    }

    .override-state {
      grid-column: 1 / -1;
      margin: 0;
      padding: var(--s-2) var(--s-4);
      border-top: 1px solid var(--line);
      color: var(--ink-soft);
      font-family: var(--mono);
      font-size: 11.5px;
      letter-spacing: 0.02em;
      background: var(--surface-recess);
    }

    .preflight {
      margin: 0;
      padding: var(--s-2) var(--s-4);
      border-bottom: 1px solid var(--line);
      font-size: 12px;
      font-weight: 500;
    }

    .preflight.clean { background: var(--ok-soft); color: var(--ok); }
    .preflight.blocked { background: var(--block-soft); color: var(--block); }

    .account-body {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 320px;
      gap: var(--s-5);
      align-items: start;
      padding: var(--s-4);
    }

    .account-main { min-width: 0; }

    .table-heading {
      margin: 0 0 var(--s-2);
      font-family: var(--sans);
      font-size: 13px;
      font-weight: 600;
      color: var(--ink-muted);
      text-transform: none;
      letter-spacing: 0;
    }

    /* ── Holdings table ───────────────────────────────────────────────── */

    .holdings-table-wrap {
      overflow: auto;
      max-height: 460px;
      border: 1px solid var(--line);
      border-radius: var(--r);
      background: var(--surface);
    }

    .holdings-table {
      width: 100%;
      border-collapse: collapse;
      min-width: 920px;
      font-family: var(--sans-text);
      font-size: 13px;
      font-variant-numeric: tabular-nums;
    }

    .holdings-table th {
      position: sticky;
      top: 0;
      background: var(--surface-recess);
      color: var(--ink-muted);
      padding: 8px 12px;
      text-align: left;
      font-family: var(--mono);
      font-size: 10.5px;
      font-weight: 500;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      border-bottom: 1px solid var(--line-strong);
      z-index: 1;
    }

    .holdings-table th span {
      display: block;
      margin-top: 1px;
      color: var(--ink-soft);
      font-family: var(--mono);
      font-size: 9.5px;
      letter-spacing: 0.02em;
      text-transform: none;
      font-weight: 400;
    }

    .holdings-table td {
      padding: 8px 12px;
      border-top: 1px solid var(--line);
      vertical-align: top;
      color: var(--ink);
    }

    .holdings-table tbody tr {
      transition: background var(--motion-fast);
    }

    .holdings-table tbody tr:first-child td {
      border-top: 0;
    }

    .row-eligible td {
      box-shadow: inset 2px 0 0 var(--ok);
    }

    .row-blocked td {
      box-shadow: inset 2px 0 0 var(--block);
      color: var(--ink-muted);
    }

    .holdings-table tbody tr:hover {
      background: var(--surface-recess);
    }

    .holdings-table tbody tr:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: -2px;
    }

    /* ── Badges / pills ───────────────────────────────────────────────── */

    .badge,
    .status-pill,
    .reason-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 7px;
      border-radius: 999px;
      font-family: var(--sans-text);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0;
      white-space: nowrap;
      border: 1px solid transparent;
    }

    .badge.ok,
    .status-pill.ok {
      background: var(--ok-soft);
      color: var(--ok);
      border-color: var(--ok-line);
    }

    .badge.bad,
    .status-pill.bad {
      background: var(--block-soft);
      color: var(--block);
      border-color: var(--block-line);
    }

    .badge.info {
      background: var(--accent-soft);
      color: var(--accent);
      border-color: var(--accent-line);
    }

    .reason-chip {
      background: var(--review-soft);
      color: oklch(0.42 0.13 70);
      border-color: var(--review-line);
    }

    .blocked-reason-cell {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .row-blocked:hover .blocked-reason-cell::after {
      content: attr(data-detail);
      flex-basis: 100%;
      color: var(--ink-soft);
      font-size: 11px;
      line-height: 1.4;
    }

    .issues-cell {
      color: var(--ink-muted);
      font-family: var(--mono);
      font-size: 11.5px;
    }

    .issue-info {
      display: inline-grid;
      place-items: center;
      width: 14px;
      height: 14px;
      margin-left: 4px;
      border-radius: 999px;
      border: 1px solid var(--line-strong);
      color: var(--ink-muted);
      font-family: var(--sans-text);
      font-size: 9px;
      font-weight: 700;
      cursor: help;
    }

    /* ── Account actions ──────────────────────────────────────────────── */

    .account-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--s-2);
      padding: var(--s-3) var(--s-4);
      border-top: 1px solid var(--line);
      background: var(--surface-recess);
    }

    /* ── Transfer rail ────────────────────────────────────────────────── */

    .transfer-panel {
      margin: 0 var(--s-4) var(--s-4);
      border: 1px solid var(--line);
      border-radius: var(--r);
      background: var(--surface);
      padding: var(--s-4);
    }

    .transfer-panel[hidden] { display: none; }

    .transfer-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 320px;
      gap: var(--s-4);
      align-items: stretch;
    }

    .transfer-rail {
      display: grid;
      gap: var(--s-3);
      align-content: start;
    }

    .rail-card {
      border: 1px solid var(--line);
      border-radius: var(--r);
      background: var(--surface);
      padding: var(--s-4);
    }

    .rail-card h3,
    .rail-card strong {
      margin: 0;
      font-family: var(--sans);
      font-size: 14px;
      font-weight: 600;
      color: var(--ink);
      letter-spacing: -0.005em;
    }

    .rail-card p {
      color: var(--ink-muted);
      font-size: 13px;
      line-height: 1.5;
      margin: var(--s-2) 0;
    }

    /* Side-stripe accent borders are banned; the field lists use a header label
       and a full hairline border + tinted background to signal allow vs. exclude. */

    .field-list-grid {
      display: grid;
      gap: var(--s-3);
      margin: var(--s-3) 0;
    }

    .field-list {
      border: 1px solid var(--ok-line);
      background: var(--ok-soft);
      border-radius: var(--r);
      padding: var(--s-3);
    }

    .field-list.excluded {
      border-color: var(--block-line);
      background: var(--block-soft);
    }

    .field-list strong {
      display: block;
      margin-bottom: var(--s-1);
      font-family: var(--mono);
      font-size: 10.5px;
      font-weight: 500;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--ok);
    }

    .field-list.excluded strong { color: var(--block); }

    .field-list ul {
      margin: var(--s-2) 0 0;
      padding-left: 18px;
      color: var(--ink);
      font-family: var(--sans-text);
      font-size: 13px;
      line-height: 1.5;
    }

    .field-list.excluded ul { color: var(--ink-muted); }

    .field-list li { font-family: var(--mono); font-size: 12.5px; }

    .manual-boundary {
      font-family: var(--sans-text);
      font-weight: 600;
      color: var(--ink);
    }

    /* ── Progress / packet preview / state ────────────────────────────── */

    .progress-track {
      height: 4px;
      border-radius: 999px;
      background: var(--surface-recess);
      border: 1px solid var(--line);
      overflow: hidden;
      margin: var(--s-2) 0;
    }

    .progress-fill {
      display: block;
      height: 100%;
      width: 0;
      background: var(--accent);
      transition: width var(--motion-slow);
    }

    .next-value {
      border: 1px solid var(--line);
      border-radius: var(--r);
      padding: var(--s-3);
      background: var(--surface-recess);
    }

    .next-value span {
      display: block;
      color: var(--ink-soft);
      font-family: var(--mono);
      font-size: 10.5px;
      font-weight: 400;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .next-value strong {
      display: block;
      margin-top: var(--s-1);
      font-family: var(--mono);
      font-size: 18px;
      font-weight: 500;
      font-variant-numeric: tabular-nums;
      color: var(--ink);
      word-break: break-word;
    }

    /* ── Bookmark installer ───────────────────────────────────────────── */

    .bookmark-installer {
      border: 1px solid var(--accent-line);
      border-radius: var(--r);
      padding: var(--s-3) var(--s-4);
      background: var(--accent-soft);
    }

    .bookmark-installer span {
      display: block;
      color: var(--accent);
      font-family: var(--mono);
      font-size: 10.5px;
      font-weight: 500;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .bookmark-installer strong {
      display: block;
      margin-top: var(--s-1);
      font-family: var(--sans);
      font-size: 16px;
      font-weight: 600;
      color: var(--ink);
      letter-spacing: -0.005em;
    }

    .bookmark-installer p {
      color: var(--ink);
      font-size: 13px;
      line-height: 1.5;
      margin: var(--s-2) 0;
    }

    .bookmarklet-link {
      display: inline-flex;
      align-items: center;
      gap: var(--s-2);
      margin-top: var(--s-3);
      padding: 8px 12px;
      border: 1px solid var(--ink);
      background: var(--ink);
      color: var(--accent-ink);
      border-radius: var(--r);
      font-family: var(--sans-text);
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      cursor: grab;
      user-select: none;
      box-shadow: var(--shadow-lift);
      transition: transform var(--motion-fast), box-shadow var(--motion-fast);
    }

    .bookmarklet-link::before {
      content: "\\2630";
      color: oklch(0.78 0.005 240);
      font-family: var(--mono);
      font-size: 11px;
    }

    .bookmarklet-link:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 10px rgba(20, 28, 40, 0.18);
    }

    .bookmarklet-link:active {
      cursor: grabbing;
      transform: translateY(0);
      box-shadow: var(--shadow-rest);
    }

    .bookmark-actions {
      margin-top: var(--s-2);
    }

    .transfer-copy-state {
      color: var(--ink-muted);
      font-size: 12px;
      min-height: 18px;
      margin: var(--s-2) 0 0;
    }

    .transfer-copy-state.copied {
      color: var(--ok);
      font-weight: 600;
    }

    .packet-preview {
      margin-top: var(--s-3);
      border: 1px solid var(--line);
      border-radius: var(--r);
      overflow: hidden;
      background: var(--surface-recess);
    }

    .packet-preview pre,
    .packet-preview code {
      font-family: var(--mono);
      font-size: 11.5px;
      line-height: 1.5;
      color: var(--ink);
    }

    /* ── Output details ───────────────────────────────────────────────── */

    .output-details {
      border: 1px solid var(--line);
      border-radius: var(--r);
      background: var(--surface);
      padding: 0;
    }

    .output-details[hidden] { display: none; }

    .output-details summary {
      cursor: pointer;
      padding: var(--s-3) var(--s-4);
      color: var(--ink-muted);
      font-family: var(--sans-text);
      font-size: 13px;
      font-weight: 600;
    }

    .output-details[open] summary {
      border-bottom: 1px solid var(--line);
      color: var(--ink);
    }

    .output-panel {
      white-space: pre-wrap;
      border: 0;
      background: var(--surface-recess);
      padding: var(--s-3) var(--s-4);
      max-height: 320px;
      overflow: auto;
      margin: 0;
      font-family: var(--mono);
      font-size: 11.5px;
      line-height: 1.55;
      color: var(--ink);
    }

    /* ── Operator guidance / fallback details ─────────────────────────── */

    .operator-guidance {
      background: var(--surface-recess);
    }

    .operator-guidance strong {
      font-family: var(--sans);
      font-size: 13px;
      font-weight: 600;
    }

    .fallback-details {
      border-top: 1px solid var(--line);
      padding-top: var(--s-2);
      color: var(--ink-muted);
      font-size: 12.5px;
    }

    .fallback-details summary {
      cursor: pointer;
      font-family: var(--sans-text);
      font-size: 12.5px;
      font-weight: 600;
      color: var(--ink-muted);
    }

    /* ── Skeleton ─────────────────────────────────────────────────────── */

    .ledger-skeleton {
      display: grid;
      gap: var(--s-2);
      padding: var(--s-4);
      border: 1px solid var(--line);
      border-radius: var(--r);
      background: var(--surface);
    }

    .ledger-skeleton p {
      margin: 0;
      color: var(--ink-muted);
      font-size: 13px;
      font-weight: 500;
    }

    .ledger-skeleton span {
      display: block;
      height: 10px;
      border-radius: var(--r-sm);
      background: linear-gradient(90deg, var(--surface-recess) 0%, var(--surface-strong) 48%, var(--surface-recess) 100%);
      background-size: 220% 100%;
      animation: skeletonSweep 1100ms var(--ease) infinite;
    }

    .ledger-skeleton span:nth-child(3) { width: 84%; }
    .ledger-skeleton span:nth-child(4) { width: 62%; }

    @keyframes skeletonSweep {
      from { background-position: 100% 0; }
      to   { background-position: -100% 0; }
    }

    /* ── Footer ───────────────────────────────────────────────────────── */

    .ledger-footer {
      display: grid;
      justify-items: center;
      gap: 4px;
      padding: var(--s-3) 0 var(--s-2);
      color: var(--ink-soft);
      text-align: center;
    }

    .ledger-footer strong {
      font-family: var(--mono);
      font-size: 10.5px;
      font-weight: 500;
      letter-spacing: 0.04em;
      word-spacing: 0.04em;
    }

    .ledger-footer span {
      font-family: var(--mono);
      font-size: 9.5px;
      letter-spacing: 0.04em;
    }

    /* ── Drag-and-drop overlay ────────────────────────────────────────── */

    .ledger-drop-overlay {
      position: fixed;
      inset: 0;
      display: none;
      align-items: center;
      justify-content: center;
      background: oklch(0.20 0.012 250 / 0.42);
      z-index: 100;
      pointer-events: none;
      backdrop-filter: blur(2px);
    }

    .ledger-drop-overlay.is-visible {
      display: flex;
    }

    .ledger-drop-card {
      display: grid;
      gap: var(--s-2);
      padding: var(--s-6) var(--s-8);
      background: var(--surface);
      border: 2px dashed var(--accent);
      border-radius: var(--r-lg);
      text-align: center;
      box-shadow: 0 12px 32px rgba(20, 28, 40, 0.18);
    }

    .ledger-drop-card strong {
      font-family: var(--sans);
      font-size: 18px;
      font-weight: 600;
      color: var(--ink);
      letter-spacing: -0.005em;
    }

    .ledger-drop-card span {
      font-family: var(--mono);
      font-size: 11px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--ink-soft);
    }

    /* ── Focus, reduced motion ────────────────────────────────────────── */

    :focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
      border-radius: var(--r-sm);
    }

    @media (prefers-reduced-motion: reduce) {
      *,
      *::before,
      *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        scroll-behavior: auto !important;
        transition-duration: 0.01ms !important;
      }
    }

    /* ── Responsive ───────────────────────────────────────────────────── */

    @media (max-width: 1024px) {
      .account-body,
      .transfer-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 880px) {
      .ledger-app-header,
      .ledger-load-panel,
      .review-heading,
      .account-header {
        grid-template-columns: 1fr;
      }

      .ledger-header-right {
        justify-items: start;
      }

      .ledger-safety-badges {
        justify-content: flex-start;
      }

      .workflow-stepper,
      .ledger-checks,
      .metric-strip,
      .preflight-summary {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .workflow-step,
      .ledger-check,
      .metric-card,
      .preflight-metric {
        border-right: 0;
        border-bottom: 1px solid var(--line);
      }

      .workflow-step:nth-last-child(-n+1),
      .ledger-check:nth-last-child(-n+1),
      .metric-card:nth-last-child(-n+1),
      .preflight-metric:nth-last-of-type(-n+1) {
        border-bottom: 0;
      }
    }

    @media (max-width: 540px) {
      .ledger-shell {
        width: calc(100vw - 16px);
        padding: var(--s-3) 0 var(--s-6);
      }

      .workflow-stepper,
      .ledger-checks,
      .metric-strip,
      .preflight-summary {
        grid-template-columns: 1fr;
      }
    }
  `;
  document.head.appendChild(style);
}
