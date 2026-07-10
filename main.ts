/**
 * Local MVP Entrypoint
 *
 * Operator usage (local browser demo):
 * 1) Run `npm run start:demo` from the repo root.
 * 2) Open the printed localhost URL.
 * 3) Click "Choose CSV File" or "Load Demo Sample".
 *
 * Developer usage remains available:
 *   runLocalMvp(document.getElementById('review-root')!, myCsvText);
 *
 * Safety: all parsing/rendering happens locally in the browser. There is no
 * backend, no network upload, no persistence, and no auto-save behavior.
 */

import { parseHoldingsCsvToIngestionFile } from './holdings-csv-parser';
import type { HoldingsIngestionFile } from './holdings-schema';
import { installRegulatedLedgerStyles } from './ledger-styles';
import { renderReviewExportSurface } from './review-export-surface';

export const SAMPLE_CSV_INPUT = [
  'Account Description,Account Number,Owner,Last Updated,Symbol,Description,Quantity,Price,Cost Basis,Value,Asset Class',
  'Demo Account,123456789,Demo Client,05/26/2026,AAPL,APPLE INCORPORATED,10,$100.00,$1450.00,$3000.00,US Large Cap Blend',
  'Demo Account,123456789,Demo Client,05/26/2026,MSFT,MICROSOFT CORPORATION,5,$100.00,$1800.00,$2500.00,US Large Cap Value',
  'Demo Account,123456789,Demo Client,05/26/2026,GOOG,ALPHABET INCORPORATED CAP STK CLASS C,3,$100.00,$900.00,$1200.00,US Large Cap Blend',
].join('\n');

type WorkflowStep = 'load' | 'review' | 'packet' | 'fill';

interface LocalMvpOptions {
  sourceFilename?: string;
  onPacketPrepared?: (event: { accountNumber: string; rowCount: number; copied: boolean }) => void;
}

export function runLocalMvp(
  container: HTMLElement,
  csvText: string = SAMPLE_CSV_INPUT,
  opts?: LocalMvpOptions
): HoldingsIngestionFile {
  const ingestionFile = parseHoldingsCsvToIngestionFile(csvText, {
    fileId: `file-${new Date().toISOString()}`,
    sourceFilename: opts?.sourceFilename ?? 'inline-sample.csv',
  });

  renderReviewExportSurface(container, ingestionFile, {
    onExport: (payload) => {
      // Local visibility for operator/engineer; no network or persistence.
      console.log('Exported assistant payload:', payload);
    },
    onPacketPrepared: opts?.onPacketPrepared,
  });

  return ingestionFile;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setStatus(el: HTMLElement, message: string, tone: 'info' | 'success' | 'error' = 'info'): void {
  el.textContent = message;
  el.style.color = tone === 'error' ? '#9f3a32' : tone === 'success' ? '#276b53' : '#746c5d';
}

async function stageLoadStatus(status: HTMLElement, sourceName: string): Promise<void> {
  setStatus(status, `Reading ${sourceName} locally...`);
  await delay(180);
  setStatus(status, 'Parsing holdings and normalizing account rows...');
  await delay(220);
  setStatus(status, 'Running preflight gates: blocked rows, warnings, export eligibility...');
  await delay(260);
}

function summarizeSessionAccount(ingestion: HoldingsIngestionFile): string {
  if (ingestion.accounts.length === 0) return 'No account detected';
  if (ingestion.accounts.length === 1) return ingestion.accounts[0].accountNumber;
  return `${ingestion.accounts[0].accountNumber} + ${ingestion.accounts.length - 1} more`;
}

function renderLedgerSkeleton(container: HTMLElement, sourceName: string): void {
  container.innerHTML = [
    '<section class="ledger-skeleton" aria-label="Preparing local review">',
    `  <p>Parsing ${sourceName} locally and preparing review gates...</p>`,
    '  <span></span>',
    '  <span></span>',
    '  <span></span>',
    '</section>',
  ].join('');
}

export function renderLocalMvpShell(root: HTMLElement): void {
  installRegulatedLedgerStyles();
  root.innerHTML = '';

  const shell = document.createElement('main');
  shell.className = 'ledger-shell';

  const appHeader = document.createElement('header');
  appHeader.className = 'ledger-app-header';

  const brand = document.createElement('div');
  brand.className = 'ledger-brand';
  brand.innerHTML = [
    '<div class="ledger-mark" aria-hidden="true">eH</div>',
    '<div>',
    '  <h1 class="ledger-title">eMoney Holdings Injector</h1>',
    '  <p class="ledger-subtitle">reviewed, human-gated csv &#8594; emoney holdings entry</p>',
    '</div>',
  ].join('');
  appHeader.appendChild(brand);

  const headerRight = document.createElement('div');
  headerRight.className = 'ledger-header-right';

  const session = document.createElement('p');
  session.className = 'ledger-session';
  session.innerHTML = 'Account: Not loaded <span aria-hidden="true">&bull;</span> Session Idle <i aria-hidden="true"></i>';
  headerRight.appendChild(session);

  const badges = document.createElement('div');
  badges.className = 'ledger-safety-badges';
  ['LOCAL ONLY', 'NO API', 'NO BACKEND', 'Manual Save in eMoney'].forEach((label) => {
    const badge = document.createElement('span');
    badge.textContent = label;
    badges.appendChild(badge);
  });

  const buildInfo = (window as unknown as { __BUILD_INFO__?: { sha?: string; builtAt?: string } }).__BUILD_INFO__;
  const buildPill = document.createElement('span');
  buildPill.className = 'build-pill';
  buildPill.textContent = buildInfo?.sha
    ? `Build ${buildInfo.sha}${buildInfo.builtAt ? ` · ${buildInfo.builtAt.slice(0, 10)}` : ''}`
    : 'Build dev';
  badges.appendChild(buildPill);

  headerRight.appendChild(badges);
  appHeader.appendChild(headerRight);
  shell.appendChild(appHeader);

  const workflow = document.createElement('nav');
  workflow.className = 'workflow-stepper';
  workflow.setAttribute('aria-label', 'Holdings workflow');
  const workflowSteps: Array<[WorkflowStep, string]> = [
    ['load', 'Load CSV'],
    ['review', 'Review Holdings'],
    ['packet', 'Prepare Fill Packet'],
    ['fill', 'Fill in eMoney'],
  ];
  const stepEls = new Map<string, HTMLElement>();
  workflowSteps.forEach(([key, label], index) => {
    const step = document.createElement('span');
    step.className = 'workflow-step';
    step.dataset.step = key;
    step.innerHTML = `<b>${index + 1}</b><span>${label}</span>`;
    workflow.appendChild(step);
    stepEls.set(key, step);
  });
  shell.appendChild(workflow);

  const setWorkflowStep = (active: WorkflowStep) => {
    const rank: Record<string, number> = { load: 0, review: 1, packet: 2, fill: 3 };
    stepEls.forEach((step, key) => {
      step.classList.toggle('is-active', key === active);
      step.classList.toggle('is-complete', rank[key] < rank[active]);
    });
    const fillStep = stepEls.get('fill');
    if (fillStep) {
      fillStep.title = active === 'fill' ? 'Ready — run the bookmarklet on the eMoney page.' : '';
    }
  };
  setWorkflowStep('load');

  const controls = document.createElement('section');
  controls.className = 'ledger-panel ledger-load-panel';

  const landingCopy = document.createElement('div');
  landingCopy.className = 'landing-copy';
  landingCopy.innerHTML = [
    '<h2 class="landing-headline">Held-away holdings, entered with a paper trail.</h2>',
    '<p class="landing-lede">A holdings CSV becomes a reviewed eMoney Fill Packet. Every row is checked before it is prepared, and nothing is saved into eMoney without an operator clicking Save.</p>',
    '<ol class="landing-steps">',
    '  <li><b>1</b><span><strong>Load CSV</strong> &mdash; import a custodian holdings export.</span></li>',
    '  <li><b>2</b><span><strong>Review Holdings</strong> &mdash; every row gets an ok, review, or block verdict.</span></li>',
    '  <li><b>3</b><span><strong>Prepare Fill Packet</strong> &mdash; only eligible rows are copied into a packet.</span></li>',
    '  <li><b>4</b><span><strong>Fill in eMoney</strong> &mdash; a bookmarklet fills the page; you click Save.</span></li>',
    '</ol>',
  ].join('');
  controls.appendChild(landingCopy);

  const actionCard = document.createElement('div');
  actionCard.className = 'landing-action-card';

  const actionEyebrow = document.createElement('p');
  actionEyebrow.className = 'landing-action-eyebrow';
  actionEyebrow.textContent = 'Start here';
  actionCard.appendChild(actionEyebrow);

  const status = document.createElement('p');
  status.className = 'ledger-status-line';
  status.textContent = 'No file loaded yet.';
  actionCard.appendChild(status);

  const actions = document.createElement('div');
  actions.className = 'ledger-actions ledger-actions-stacked';

  const sampleButton = document.createElement('button');
  sampleButton.type = 'button';
  sampleButton.textContent = 'Load demo sample';
  sampleButton.className = 'ledger-button full-width';
  actions.appendChild(sampleButton);

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.csv,text/csv';
  fileInput.className = 'ledger-file-input-hidden';
  fileInput.tabIndex = -1;
  fileInput.setAttribute('aria-hidden', 'true');

  const chooseFileButton = document.createElement('button');
  chooseFileButton.type = 'button';
  chooseFileButton.textContent = 'Choose CSV file';
  chooseFileButton.className = 'ledger-button secondary full-width';
  chooseFileButton.onclick = () => fileInput.click();
  actions.appendChild(chooseFileButton);
  actions.appendChild(fileInput);

  actionCard.appendChild(actions);

  const checks = document.createElement('div');
  checks.className = 'ledger-checks';
  [
    ['Current step', 'Local CSV review'],
    ['Storage', 'No auto-save'],
    ['Network', 'No backend'],
    ['eMoney Save', 'Manual'],
  ].forEach(([label, value]) => {
    const check = document.createElement('div');
    check.className = 'ledger-check';
    check.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
    checks.appendChild(check);
  });
  actionCard.appendChild(checks);

  controls.appendChild(actionCard);
  shell.appendChild(controls);

  const reviewRoot = document.createElement('section');
  reviewRoot.id = 'review-root';
  shell.appendChild(reviewRoot);

  const footer = document.createElement('footer');
  footer.className = 'ledger-footer';
  footer.innerHTML = [
    '<strong>LOCAL ONLY <span aria-hidden="true">&bull;</span> NO API <span aria-hidden="true">&bull;</span> NO BACKEND</strong>',
    '<span>Local-only tool &mdash; nothing leaves this machine. Save in eMoney is always manual.</span>',
  ].join('');
  shell.appendChild(footer);

  const markSessionActive = (ingestion: HoldingsIngestionFile) => {
    session.innerHTML = `Account: ${summarizeSessionAccount(ingestion)} <span aria-hidden="true">&bull;</span> Session Active <i aria-hidden="true"></i>`;
    session.classList.add('is-active');
  };

  const loadCsvFile = async (file: File): Promise<void> => {
    if (!/\.csv$/i.test(file.name)) {
      setStatus(status, `Not a CSV file: ${file.name}. Save as CSV UTF-8 first.`, 'error');
      return;
    }
    try {
      setWorkflowStep('load');
      renderLedgerSkeleton(reviewRoot, file.name);
      await stageLoadStatus(status, file.name);
      const text = await file.text();
      const ingestion = runLocalMvp(reviewRoot, text, {
        sourceFilename: file.name,
        onPacketPrepared: (event) => setWorkflowStep(event.copied ? 'fill' : 'packet'),
      });
      markSessionActive(ingestion);
      setWorkflowStep('review');
      setStatus(status, `${file.name} is ready for review.`, 'success');
    } catch (err) {
      console.error(err);
      setStatus(status, `Could not load CSV: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  fileInput.onchange = () => {
    const file = fileInput.files?.[0];
    if (file) void loadCsvFile(file);
  };

  sampleButton.onclick = async () => {
    try {
      setWorkflowStep('load');
      renderLedgerSkeleton(reviewRoot, 'demo-sample.csv');
      await stageLoadStatus(status, 'demo-sample.csv');
      const ingestion = runLocalMvp(reviewRoot, SAMPLE_CSV_INPUT, {
        sourceFilename: 'demo-sample.csv',
        onPacketPrepared: (event) => setWorkflowStep(event.copied ? 'fill' : 'packet'),
      });
      markSessionActive(ingestion);
      setWorkflowStep('review');
      setStatus(status, 'Demo sample is ready for review.', 'success');
    } catch (err) {
      console.error(err);
      setStatus(status, `Could not load demo sample: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  // Drag-and-drop: drop a CSV anywhere on the window to load it.
  const dropOverlay = document.createElement('div');
  dropOverlay.className = 'ledger-drop-overlay';
  dropOverlay.innerHTML = '<div class="ledger-drop-card"><strong>Drop CSV to load</strong><span>Local only · No upload</span></div>';
  document.body.appendChild(dropOverlay);

  let dragCounter = 0;
  const isFileDrag = (e: DragEvent): boolean => {
    const types = e.dataTransfer?.types;
    if (!types) return false;
    for (let i = 0; i < types.length; i++) if (types[i] === 'Files') return true;
    return false;
  };

  document.addEventListener('dragenter', (e: DragEvent) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    dragCounter += 1;
    dropOverlay.classList.add('is-visible');
  });

  document.addEventListener('dragover', (e: DragEvent) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  });

  document.addEventListener('dragleave', (e: DragEvent) => {
    if (!isFileDrag(e)) return;
    dragCounter -= 1;
    if (dragCounter <= 0) {
      dragCounter = 0;
      dropOverlay.classList.remove('is-visible');
    }
  });

  document.addEventListener('drop', (e: DragEvent) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    dragCounter = 0;
    dropOverlay.classList.remove('is-visible');
    const file = e.dataTransfer?.files[0];
    if (file) void loadCsvFile(file);
  });

  root.appendChild(shell);
}

// Convenience globals for local manual use when loaded in browser.
declare global {
  interface Window {
    runLocalMvp?: typeof runLocalMvp;
    renderLocalMvpShell?: typeof renderLocalMvpShell;
  }
}

if (typeof window !== 'undefined') {
  window.runLocalMvp = runLocalMvp;
  window.renderLocalMvpShell = renderLocalMvpShell;
}
