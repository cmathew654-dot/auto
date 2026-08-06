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
 * The current build parses and renders in the browser, does not call a project
 * server, and never triggers an eMoney Save action.
 */

import { parseHoldingsCsvToIngestionFile } from './holdings-csv-parser';
import type { HoldingsIngestionFile } from './holdings-schema';
import { installRegulatedLedgerStyles } from './ledger-styles';
import { clearMatchingClipboard, renderReviewExportSurface } from './review-export-surface';
import { DEMO_SAMPLE_CSV } from './demo-sample';
import { renderDemoDestinationPanel } from './demo-destination-panel';
import { runDemoFill, type EmoneyFillPacket } from './paste-conductor';

export const SAMPLE_CSV_INPUT = DEMO_SAMPLE_CSV;

export type WorkflowStep = 'load' | 'review' | 'packet' | 'fill';

// Single source of truth for the stage order a demo run walks through, so the
// async handler has exactly one writer driving the stepper (no code after it
// races to overwrite the stage — see demo-flow.test.cjs for the regression this pins).
export function demoRunStepOrder(hasEligiblePacket: boolean): WorkflowStep[] {
  return hasEligiblePacket ? ['review', 'packet', 'fill'] : ['review'];
}

interface LocalMvpOptions {
  sourceFilename?: string;
  onPacketPrepared?: (event: { accountNumber: string; rowCount: number; copied: boolean }) => void;
  onClipboardWrite?: (text: string) => void;
  onFillPacketReady?: (packet: EmoneyFillPacket | null) => void;
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
    onPacketPrepared: opts?.onPacketPrepared,
    onClipboardWrite: opts?.onClipboardWrite,
    onFillPacketReady: opts?.onFillPacketReady,
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
    '<div class="ledger-mark" aria-hidden="true">HE</div>',
    '<div>',
    '  <h1 class="ledger-title">Holdings Entry Assistant</h1>',
    '  <p class="ledger-subtitle">reviewed csv &#8594; browser entry</p>',
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
  ['BROWSER PROCESSING', 'NO PROJECT SERVER', 'Manual Save in eMoney', 'SYNTHETIC DEMO DATA'].forEach((label) => {
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
      fillStep.title = active === 'fill' ? 'Ready — rows are entered on the destination page.' : '';
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
    '  <li><b>4</b><span><strong>Fill the destination</strong> &mdash; rows are entered on the destination page automatically; you click Save.</span></li>',
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
  sampleButton.textContent = 'Run the full demo';
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

  const clearSessionButton = document.createElement('button');
  clearSessionButton.type = 'button';
  clearSessionButton.textContent = 'Clear session';
  clearSessionButton.className = 'ledger-button ghost full-width';
  clearSessionButton.disabled = true;
  actions.appendChild(clearSessionButton);
  actions.appendChild(fileInput);

  actionCard.appendChild(actions);

  const checks = document.createElement('div');
  checks.className = 'ledger-checks';
  [
    ['Current step', 'Local CSV review'],
    ['Storage', 'No auto-save'],
    ['Network', 'No project server'],
    ['eMoney Save', 'Manual'],
    ['Demo data', 'Synthetic only'],
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

  const destinationRoot = document.createElement('section');
  destinationRoot.id = 'demo-destination-root';
  destinationRoot.className = 'ledger-panel';
  destinationRoot.hidden = true;
  shell.appendChild(destinationRoot);

  const destinationHeader = document.createElement('div');
  destinationHeader.className = 'demo-destination-header';
  const fillButton = document.createElement('button');
  fillButton.type = 'button';
  fillButton.textContent = 'Fill the simulated destination page';
  fillButton.className = 'ledger-button full-width';
  fillButton.disabled = true;
  destinationHeader.appendChild(fillButton);
  const withheldLine = document.createElement('p');
  withheldLine.className = 'ledger-status-line';
  destinationHeader.appendChild(withheldLine);
  destinationRoot.appendChild(destinationHeader);

  const destinationPanelHost = document.createElement('div');
  destinationRoot.appendChild(destinationPanelHost);

  const footer = document.createElement('footer');
  footer.className = 'ledger-footer';
  footer.innerHTML = [
    '<strong>BROWSER PROCESSING <span aria-hidden="true">&bull;</span> NO PROJECT SERVER</strong>',
    '<span>The current build does not send holdings data to a project server. Use only authorized data. Save in eMoney is always manual.</span>',
    '<span>The demo sample above is fabricated data; saving in the real system is always a manual operator click.</span>',
  ].join('');
  shell.appendChild(footer);

  let lastCopiedText: string | null = null;
  let latestPacket: EmoneyFillPacket | null = null;
  let demoPanel: ReturnType<typeof renderDemoDestinationPanel> | null = null;

  const trackClipboardWrite = (text: string) => {
    lastCopiedText = text;
  };

  const hideDestinationPanel = () => {
    destinationRoot.hidden = true;
    latestPacket = null;
    fillButton.disabled = true;
    withheldLine.textContent = '';
    demoPanel?.reset();
  };

  const markSessionActive = (ingestion: HoldingsIngestionFile) => {
    session.innerHTML = `Account: ${summarizeSessionAccount(ingestion)} <span aria-hidden="true">&bull;</span> Session Active <i aria-hidden="true"></i>`;
    session.classList.add('is-active');
    clearSessionButton.disabled = false;
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
        onClipboardWrite: trackClipboardWrite,
      });
      markSessionActive(ingestion);
      setWorkflowStep('review');
      setStatus(status, `${file.name} is ready for review.`, 'success');
    } catch (err) {
      console.error('Could not load the selected CSV.');
      setStatus(status, `Could not load CSV: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  fileInput.onchange = () => {
    const file = fileInput.files?.[0];
    if (file) void loadCsvFile(file);
  };

  fillButton.onclick = async () => {
    if (!latestPacket || !demoPanel) return;
    const packet = latestPacket;
    fillButton.disabled = true;
    setStatus(status, 'Filling the simulated destination page...');
    try {
      await runDemoFill(demoPanel.root, packet, {
        onRow: (row) => setStatus(status, `Filled row ${row.rowNumber}: ${row.ticker}`),
      });
      setStatus(
        status,
        `${packet.rowCount} eligible rows filled. ${packet.blockedCount} blocked rows were withheld.`,
        'success'
      );
    } catch (err) {
      setStatus(status, err instanceof Error ? err.message : String(err), 'error');
    } finally {
      fillButton.disabled = false;
    }
  };

  sampleButton.onclick = async () => {
    try {
      hideDestinationPanel();
      setWorkflowStep('load');
      renderLedgerSkeleton(reviewRoot, 'demo-sample.csv');
      await stageLoadStatus(status, 'demo-sample.csv');
      let preparedPacket: EmoneyFillPacket | null = null;
      const ingestion = runLocalMvp(reviewRoot, SAMPLE_CSV_INPUT, {
        sourceFilename: 'demo-sample.csv',
        onPacketPrepared: (event) => setWorkflowStep(event.copied ? 'fill' : 'packet'),
        onClipboardWrite: trackClipboardWrite,
        onFillPacketReady: (packet) => {
          preparedPacket = packet;
          latestPacket = packet;
          fillButton.disabled = !packet;
          if (packet) {
            withheldLine.textContent = `Withheld from the destination page: ${packet.blockedCount} row(s) that failed review.`;
          }
        },
      });
      markSessionActive(ingestion);

      // Single writer for the remaining stages: walk demoRunStepOrder in
      // order, with pacing, so the visitor watches each stage land instead
      // of everything landing in one tick (and nothing after this loop may
      // touch setWorkflowStep for this run).
      for (const step of demoRunStepOrder(!!preparedPacket)) {
        setWorkflowStep(step);
        if (step === 'review') {
          setStatus(status, 'Demo sample is ready for review.', 'success');
        } else if (step === 'packet') {
          setStatus(status, 'Preparing the eMoney Fill Packet from eligible rows...');
        } else if (step === 'fill') {
          setStatus(status, 'Opening the simulated destination panel...');
          destinationRoot.hidden = false;
          if (!demoPanel) demoPanel = renderDemoDestinationPanel(destinationPanelHost);
          else demoPanel.reset();
        }
        await delay(400);
      }
      if (preparedPacket) {
        destinationRoot.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (err) {
      console.error('Could not load the demo sample.');
      setStatus(status, `Could not load demo sample: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  clearSessionButton.onclick = async () => {
    const clipboardResult = await clearMatchingClipboard(lastCopiedText, navigator.clipboard);
    reviewRoot.replaceChildren();
    reviewRoot.className = '';
    fileInput.value = '';
    lastCopiedText = null;
    hideDestinationPanel();
    session.innerHTML = 'Account: Not loaded <span aria-hidden="true">&bull;</span> Session Idle <i aria-hidden="true"></i>';
    session.classList.remove('is-active');
    clearSessionButton.disabled = true;
    setWorkflowStep('load');

    if (clipboardResult === 'cleared') {
      setStatus(status, 'Session cleared. The matching clipboard payload was also removed.', 'success');
    } else if (clipboardResult === 'unchanged') {
      setStatus(status, 'Session cleared. Newer clipboard content was preserved.', 'success');
    } else {
      setStatus(status, 'Session cleared. Clipboard content was preserved because access was unavailable.', 'info');
    }
  };

  // Drag-and-drop: drop a CSV anywhere on the window to load it.
  const dropOverlay = document.createElement('div');
  dropOverlay.className = 'ledger-drop-overlay';
  dropOverlay.innerHTML = '<div class="ledger-drop-card"><strong>Drop CSV to load</strong><span>Browser processing · No project server</span></div>';
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
