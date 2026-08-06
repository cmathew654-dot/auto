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
import {
  clearMatchingClipboard,
  getAccountRowDisplay,
  getHoldingEligibility,
  renderReviewExportSurface,
} from './review-export-surface';
import { DEMO_SAMPLE_CSV } from './demo-sample';
import { renderDemoDestinationPanel } from './demo-destination-panel';
import { runDemoFill, type EmoneyFillPacket } from './paste-conductor';

export const SAMPLE_CSV_INPUT = DEMO_SAMPLE_CSV;

export type WorkflowStep = 'load' | 'review' | 'packet' | 'fill';

export interface DemoTourAccount {
  accountNumber: string;
  totalRows: number;
  eligibleCount: number;
  withheldCount: number;
}

export interface DemoTourStep {
  id: string;
  stage: WorkflowStep;      // which stepper stage this step lights up
  title: string;            // recruiter-legible headline
  body: string;             // what just happened
  proof: string;            // what it proves
  nextLabel: string;        // Next button text; last step reads "Done"
  fillAccountNumber?: string; // when set, advancing INTO this step fills that account first
  holdsForAccount?: string;   // when set, this step narrates that account's held-back rows -- a
                               // standalone beat with its own Next click, ahead of that account's
                               // fill step, instead of an automatic detour inside one step
  workSteps: string[];      // named, real pipeline steps ticked through before the payoff
}

// Real, derived tallies for the review stage's typed work lines -- computed
// from actual verdict results (getHoldingEligibility), never hardcoded.
export interface DemoTourReviewTally {
  missingLookupKey: number;
  cash: number;
  zeroPrice: number;
}

// Pure step model for the click-through guided tour. No DOM, no timers, no
// module state — 01-09 wires this list to Next-button clicks on the page.
export function buildDemoTourSteps(
  accounts: DemoTourAccount[],
  reviewTally?: DemoTourReviewTally
): DemoTourStep[] {
  const totalRows = accounts.reduce((sum, a) => sum + a.totalRows, 0);
  const totalEligible = accounts.reduce((sum, a) => sum + a.eligibleCount, 0);
  const totalWithheld = accounts.reduce((sum, a) => sum + a.withheldCount, 0);
  const steps: DemoTourStep[] = [
    {
      id: 'load',
      stage: 'load',
      title: 'The sample CSV loads in your browser',
      body: 'A synthetic holdings file was just read and parsed locally, in this browser tab.',
      proof: 'No upload, no account, no project server involved — the file never leaves the browser.',
      nextLabel: 'Next: see every row get a verdict',
      workSteps: [
        'Reading demo-sample.csv locally, in this browser tab',
        'Parsing holdings rows and normalizing account fields',
        'Running preflight gates: missing lookup keys, cash rows, zero-price exceptions',
      ],
    },
    {
      id: 'review',
      stage: 'review',
      title: 'Every row gets a verdict',
      body: `All ${totalRows} rows across ${accounts.length} account${accounts.length === 1 ? '' : 's'} were checked and given a clear pass or hold decision.`,
      proof: 'A human sees every verdict before anything is entered anywhere.',
      nextLabel: accounts.length === 0 ? 'Done' : 'Next: see what gets packaged',
      workSteps: [
        `Checking every row for a ticker or CUSIP lookup key${reviewTally ? ` — ${reviewTally.missingLookupKey} missing` : ''}`,
        `Flagging cash rows for manual review${reviewTally ? ` — ${reviewTally.cash} found` : ''}`,
        `Checking for zero-price-with-value exceptions${reviewTally ? ` — ${reviewTally.zeroPrice} found` : ''}`,
        `Assigning a pass or hold verdict to every row — ${totalEligible} pass, ${totalWithheld} hold`,
      ],
    },
  ];

  if (accounts.length === 0) {
    steps[steps.length - 1].nextLabel = 'Done';
    return steps;
  }

  steps.push({
    id: 'packet',
    stage: 'packet',
    title: 'Only approved rows get packaged',
    body: 'Only the rows that cleared review are bundled into the fill packet for the destination page.',
    proof: 'Blocked rows physically cannot reach the destination page.',
    nextLabel: 'Next: fill the first account',
    workSteps: [
      `Filtering out every row that didn't clear review — ${totalWithheld} held`,
      `Bundling only approved rows into the fill packet — ${totalEligible} row${totalEligible === 1 ? '' : 's'}`,
    ],
  });

  accounts.forEach((account, index) => {
    const isLast = index === accounts.length - 1;
    const clean = account.withheldCount === 0;
    const body = clean
      ? `All ${account.totalRows} rows in account ${account.accountNumber} landed on the destination panel.`
      : `${account.eligibleCount} of ${account.totalRows} rows in account ${account.accountNumber} landed on the destination panel; ${account.withheldCount} were held back — some are waiting on a manual-review override, and some (like a cash row that needs a human decision) have no ticker or CUSIP and can never be auto-entered.`;
    const proof = clean
      ? 'This is what a clean account looks like — the baseline for the next one.'
      : 'The panel above shows only what passed: the gates are doing judgment, not breaking.';
    const fillWorkSteps = clean
      ? ["Matching packet rows to the destination page's fields", 'Copying only ticker, units, and cost basis for each eligible row']
      : [
          'Confirming blocked rows are excluded from the packet',
          "Matching packet rows to the destination page's fields",
          'Copying only ticker, units, and cost basis for each eligible row',
        ];

    // A standalone beat, with its own Next click, before an account with
    // holds ever scrolls to its destination panel -- so the visitor is
    // never whipped up to the held rows and back down to the panel inside
    // a single, un-pauseable step.
    if (!clean) {
      steps.push({
        id: `holds-${account.accountNumber}`,
        stage: 'fill',
        title: `First: the ${account.withheldCount} row${account.withheldCount === 1 ? '' : 's'} that don't go`,
        body: `Account ${account.accountNumber} is holding back ${account.withheldCount} of ${account.totalRows} rows before anything reaches the destination page — some need a manual-review override, and some (like a cash row with no ticker or CUSIP) can never be auto-entered.`,
        proof: 'Every blocked row stays visible with its reason. Nothing here is hidden, only withheld.',
        nextLabel: 'Next: watch the rest land',
        holdsForAccount: account.accountNumber,
        workSteps: [],
      });
    }

    steps.push({
      id: `fill-${account.accountNumber}`,
      stage: 'fill',
      title: clean
        ? `Account ${account.accountNumber}: a clean fill`
        : `Account ${account.accountNumber}: a fill with holds`,
      body: `${body} Save is still a human click — this destination panel is a simulation, not eMoney.`,
      proof,
      nextLabel: isLast ? 'Done' : 'Next: fill the next account',
      fillAccountNumber: account.accountNumber,
      workSteps: fillWorkSteps,
    });
  });

  return steps;
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
  ['BROWSER PROCESSING', 'NO PROJECT SERVER', 'Manual Save in eMoney', 'REAL SYMBOLS, FABRICATED ACCOUNTS'].forEach((label) => {
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

  const tourCard = document.createElement('section');
  tourCard.className = 'ledger-tour-card';
  tourCard.hidden = true;
  tourCard.setAttribute('role', 'region');
  tourCard.setAttribute('aria-live', 'polite');
  const tourContent = document.createElement('div');
  tourContent.className = 'ledger-tour-content';
  const tourCounter = document.createElement('p');
  tourCounter.className = 'ledger-tour-counter';
  const tourTitle = document.createElement('h2');
  const tourBody = document.createElement('p');
  const tourProof = document.createElement('p');
  tourProof.className = 'ledger-tour-proof';
  const tourWork = document.createElement('ul');
  tourWork.className = 'ledger-tour-work';
  tourWork.hidden = true;
  tourContent.append(tourCounter, tourTitle, tourBody, tourProof, tourWork);
  const tourRunAgainButton = document.createElement('button');
  tourRunAgainButton.type = 'button';
  tourRunAgainButton.className = 'ledger-button secondary';
  tourRunAgainButton.textContent = 'Run it again';
  tourRunAgainButton.hidden = true;
  const tourNextButton = document.createElement('button');
  tourNextButton.type = 'button';
  tourNextButton.className = 'ledger-button';
  tourCard.append(tourContent, tourRunAgainButton, tourNextButton);
  shell.appendChild(tourCard);

  const reduceMotion = (): boolean => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

  const renderTourStep = (step: DemoTourStep, index: number, total: number): void => {
    tourCounter.textContent = `Stage ${index + 1} of ${total}`;
    tourTitle.textContent = step.title;
    tourBody.textContent = step.body;
    tourProof.textContent = step.proof;
    tourNextButton.textContent = step.nextLabel;
    tourCard.hidden = false;
  };

  // Fade the old stage copy out, swap it, fade the new copy in — a calm
  // hand-off instead of an instant text swap.
  const FADE_MS = 160;
  const swapTourStep = async (step: DemoTourStep, index: number, total: number): Promise<void> => {
    if (reduceMotion()) {
      renderTourStep(step, index, total);
      return;
    }
    tourContent.classList.add('is-swapping');
    await wait(FADE_MS);
    renderTourStep(step, index, total);
    void tourContent.offsetHeight; // force layout so the fade-in transition runs
    tourContent.classList.remove('is-swapping');
    await wait(FADE_MS);
  };

  // Named, honest steps typed out one character at a time, like a terminal
  // transcript -- the labor illusion: visibly showing real work builds
  // trust and gives the eye time to orient. A 4-item list runs roughly
  // 4-7s end to end; that pace is intentional. Collapses to the finished
  // transcript instantly under prefers-reduced-motion.
  const TYPE_CHAR_MS = 22;
  const TYPE_LINE_PAUSE_MS = 400;
  const TYPE_NEXT_LINE_GAP_MS = 300;
  const runWorkingSequence = async (workSteps: string[]): Promise<void> => {
    if (workSteps.length === 0) return;
    tourTitle.hidden = true;
    tourBody.hidden = true;
    tourProof.hidden = true;
    tourWork.innerHTML = '';
    tourWork.hidden = false;

    if (reduceMotion()) {
      workSteps.forEach((text) => {
        const li = document.createElement('li');
        li.className = 'is-active is-done';
        li.textContent = text;
        tourWork.appendChild(li);
      });
      tourWork.hidden = true;
      tourTitle.hidden = false;
      tourBody.hidden = false;
      tourProof.hidden = false;
      return;
    }

    for (let lineIndex = 0; lineIndex < workSteps.length; lineIndex += 1) {
      const text = workSteps[lineIndex];
      const li = document.createElement('li');
      li.classList.add('is-active');
      const textSpan = document.createElement('span');
      textSpan.className = 'ledger-tour-work-text';
      const cursor = document.createElement('span');
      cursor.className = 'ledger-tour-work-cursor';
      li.append(textSpan, cursor);
      tourWork.appendChild(li);
      tourContent.scrollTop = tourContent.scrollHeight; // keep the newest line in view as it types
      for (let i = 1; i <= text.length; i += 1) {
        textSpan.textContent = text.slice(0, i);
        tourContent.scrollTop = tourContent.scrollHeight;
        await wait(TYPE_CHAR_MS);
      }
      await wait(TYPE_LINE_PAUSE_MS);
      cursor.remove();
      li.classList.add('is-done');
      // No gap after the LAST line -- that gap was dead air with nothing
      // left to wait for (item 1: stage 1's post-typing pause).
      if (lineIndex < workSteps.length - 1) {
        await wait(TYPE_NEXT_LINE_GAP_MS);
      }
    }
    await wait(120);
    tourWork.hidden = true;
    tourTitle.hidden = false;
    tourBody.hidden = false;
    tourProof.hidden = false;
  };

  // One deliberate, unhurried scroll instead of the browser's native
  // smooth-scroll (which snaps hard over long distances). Distance is kept
  // short in the first place by applyStageFocus hiding everything that
  // isn't this stage's subject. Longer moves get a longer, softer glide;
  // every move ends with a settle beat baked in so nothing else may start
  // while the camera is still coming to rest.
  const SCROLL_MIN_MS = 950;
  const SCROLL_LONG_MS = 1650;
  const SCROLL_LONG_THRESHOLD_PX = 400;
  const SCROLL_SETTLE_MS = 500;
  const easeOutQuart = (t: number): number => 1 - (1 - t) ** 4;

  // Centers the subject in the usable band between the app header and the
  // fixed dock (not the raw viewport), biased slightly low per feedback
  // that centered content read as sitting too high.
  const scrollTargetForSubject = (subject: HTMLElement): number => {
    const rect = subject.getBoundingClientRect();
    const headerBottom = Math.max(0, appHeader.getBoundingClientRect().bottom);
    const dockTop = tourCard.hidden ? window.innerHeight : tourCard.getBoundingClientRect().top;
    const bandTop = headerBottom + 16;
    const bandBottom = Math.max(bandTop + 1, dockTop - 16);
    const bandHeight = bandBottom - bandTop;
    // Center with a low bias, but never let that bias push the bottom edge
    // under the dock (clamped first) or the top edge under the header
    // (clamped second, so header clearance always wins for oversized
    // subjects that can't fit the band at all).
    let idealTop = bandTop + bandHeight * 0.55 - rect.height / 2;
    idealTop = Math.min(idealTop, bandBottom - rect.height);
    idealTop = Math.max(idealTop, bandTop);
    const delta = rect.top - idealTop;
    const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    return Math.max(0, Math.min(maxY, window.scrollY + delta));
  };

  // Shared window-scroll animator -- used both to bring a stage's subject
  // into view and (Explore the full session) to return to the page top.
  const animateScrollTo = (targetY: number): Promise<void> => {
    const startY = window.scrollY;
    const distance = Math.abs(targetY - startY);
    if (reduceMotion() || distance < 2) {
      window.scrollTo(0, targetY);
      return Promise.resolve();
    }
    const duration = distance > SCROLL_LONG_THRESHOLD_PX ? SCROLL_LONG_MS : SCROLL_MIN_MS;
    return new Promise((resolve) => {
      const delta = targetY - startY;
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        window.scrollTo(0, startY + delta * easeOutQuart(t));
        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          wait(SCROLL_SETTLE_MS).then(resolve);
        }
      };
      requestAnimationFrame(step);
    });
  };

  const scrollSubjectIntoView = (subject: HTMLElement): Promise<void> =>
    animateScrollTo(scrollTargetForSubject(subject));

  let highlightedSubject: HTMLElement | null = null;
  const setHighlightedSubject = (subject: HTMLElement | null): void => {
    highlightedSubject?.classList.remove('tour-highlight');
    highlightedSubject = subject;
    highlightedSubject?.classList.add('tour-highlight');
  };

  // Reserve viewport space under the fixed dock so it never covers the
  // content it is currently narrating.
  const updateTourDockSpacing = (settled = false): void => {
    if (tourCard.hidden) {
      shell.style.paddingBottom = '';
      return;
    }
    const dockReserve = tourCard.getBoundingClientRect().height + 32;
    // While a scroll is being planned, the reserve must be at least a full
    // viewport tall: a subject near the natural end of the page (e.g. the
    // destination panel) cannot be scrolled flush to the viewport's top
    // unless the document has that much extra scrollable room below it.
    // Once the scroll has settled, shrink back to just what the dock
    // needs — otherwise that same full-viewport reserve sits as dead
    // whitespace under a subject that's already near the page's end.
    const reserve = settled ? dockReserve : Math.max(dockReserve, window.innerHeight);
    shell.style.paddingBottom = `${reserve}px`;
  };
  window.addEventListener('resize', () => {
    if (!tourCard.hidden) updateTourDockSpacing();
  });

  // Keep consecutive stages physically close together: hide every section
  // that isn't this stage's subject instead of leaving a 4000px page for
  // the visitor to be flown across.
  const stepAccountNumber = (step: DemoTourStep): string | undefined => step.fillAccountNumber ?? step.holdsForAccount;

  const applyStageFocus = (step: DemoTourStep): void => {
    controls.hidden = step.stage !== 'load';
    Array.from(reviewRoot.querySelectorAll<HTMLElement>('.account-panel')).forEach((panel, index) => {
      if (step.stage === 'review') {
        panel.hidden = false;
      } else if (step.stage === 'packet') {
        panel.hidden = index !== 0;
      } else if (step.stage === 'fill') {
        panel.hidden = !panel.querySelector('h3')?.textContent?.startsWith(stepAccountNumber(step) ?? '\0');
      } else {
        panel.hidden = true;
      }
    });
  };

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
    '<span>The demo sample above uses real market ticker symbols with fabricated accounts and positions &mdash; no real client data; saving in the real system is always a manual operator click.</span>',
  ].join('');
  shell.appendChild(footer);

  let lastCopiedText: string | null = null;
  let latestPacket: EmoneyFillPacket | null = null;
  let demoPanel: ReturnType<typeof renderDemoDestinationPanel> | null = null;
  const packetsByAccount = new Map<string, EmoneyFillPacket>();
  // Tracks whether the destination panel's slow entrance has already played
  // this run -- it plays once, the first time the panel appears, not on
  // every subsequent account's fill.
  let panelRevealed = false;

  const trackClipboardWrite = (text: string) => {
    lastCopiedText = text;
  };

  const hideDestinationPanel = () => {
    destinationRoot.hidden = true;
    destinationRoot.classList.remove('is-pre-reveal');
    panelRevealed = false;
    latestPacket = null;
    fillButton.disabled = true;
    withheldLine.textContent = '';
    demoPanel?.reset();
    packetsByAccount.clear();
    tourCard.hidden = true;
    tourRunAgainButton.hidden = true;
    setHighlightedSubject(null);
    updateTourDockSpacing();
    landingCopy.hidden = false;
    controls.hidden = false;
    shell.classList.remove('tour-active');
    reviewRoot.querySelectorAll<HTMLElement>('.account-panel').forEach((panel) => {
      panel.hidden = false;
    });
  };

  // Which DOM node a tour step is narrating — scrolled into view and
  // highlighted on every stage advance so the copy always has its subject
  // on screen next to the dock.
  const getStageSubject = (step: DemoTourStep): HTMLElement => {
    switch (step.stage) {
      case 'load':
        return actionCard;
      case 'review':
        // reviewRoot can run well past viewport height with both accounts
        // shown; ring a single account's height-capped table instead so
        // the highlight's edges stay on screen.
        return reviewRoot.querySelector<HTMLElement>('.holdings-table-wrap') ?? reviewRoot;
      case 'packet':
        // The whole rail (packet card + bookmarklet card + fallback) is
        // taller than the thing being narrated; ring just the Transfer
        // Packet card itself so the camera frames the packet, not
        // whatever else happens to share its column.
        return reviewRoot.querySelector<HTMLElement>('.transfer-card') ?? reviewRoot;
      case 'fill':
        if (step.holdsForAccount) {
          return (
            reviewRoot.querySelector<HTMLElement>('.account-panel:not([hidden]) .row-blocked')?.closest<HTMLElement>(
              '.holdings-table-wrap'
            ) ??
            reviewRoot.querySelector<HTMLElement>('.account-panel:not([hidden]) .holdings-table-wrap') ??
            reviewRoot
          );
        }
        return demoPanel?.root.querySelector<HTMLElement>('.demo-dest-table-wrap') ?? destinationRoot;
    }
  };

  const runFillIntoPanel = async (packet: EmoneyFillPacket): Promise<void> => {
    if (!demoPanel) return;
    demoPanel.reset(); // idempotent fill: never append onto a prior fill's rows
    await runDemoFill(demoPanel.root, packet, {
      onRow: (row) => setStatus(status, `Filled row ${row.rowNumber}: ${row.ticker}`),
      // Visible, staggered landing (250-350ms/row) so each row is
      // individually watchable instead of the table appearing already full.
      stepDelayMs: reduceMotion() ? 0 : 300,
    });
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
      await runFillIntoPanel(packet);
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

  let tourIndex = -1;
  let tourNext: () => void = () => {};
  tourNextButton.onclick = () => tourNext();

  const startDemoTour = async (): Promise<void> => {
    try {
      hideDestinationPanel();
      tourIndex = -1;
      setWorkflowStep('load');
      renderLedgerSkeleton(reviewRoot, 'demo-sample.csv');
      await stageLoadStatus(status, 'demo-sample.csv');
      const ingestion = runLocalMvp(reviewRoot, SAMPLE_CSV_INPUT, {
        sourceFilename: 'demo-sample.csv',
        onPacketPrepared: (event) => setWorkflowStep(event.copied ? 'fill' : 'packet'),
        onClipboardWrite: trackClipboardWrite,
        onFillPacketReady: (packet) => {
          latestPacket = packet;
          fillButton.disabled = !packet;
          if (packet) {
            packetsByAccount.set(packet.accountNumber, packet);
            withheldLine.textContent = `Withheld from the destination page: ${packet.blockedCount} row(s) that failed review.`;
          }
        },
      });
      markSessionActive(ingestion);

      const tourAccounts: DemoTourAccount[] = ingestion.accounts
        .filter((account) => packetsByAccount.has(account.accountNumber))
        .map((account) => {
          const packet = packetsByAccount.get(account.accountNumber)!;
          return {
            accountNumber: account.accountNumber,
            totalRows: account.holdings.length,
            eligibleCount: packet.rowCount,
            withheldCount: packet.blockedCount,
          };
        });
      // Real, derived counts for the review stage's typed lines -- never
      // hardcoded (item 2).
      const allHoldings = ingestion.accounts.flatMap((account) => account.holdings);
      const eligibilities = allHoldings.map((holding) => getHoldingEligibility(holding));
      const reviewTally: DemoTourReviewTally = {
        missingLookupKey: eligibilities.filter((e) => e.blockedIssueCodes.includes('MISSING_LOOKUP_KEY')).length,
        cash: eligibilities.filter((e) => e.blockedIssueCodes.includes('CASH_SPECIAL_HANDLING')).length,
        zeroPrice: eligibilities.filter((e) => e.blockedIssueCodes.includes('ZERO_PRICE_NONZERO_VALUE_EXCEPTION')).length,
      };
      const steps = buildDemoTourSteps(tourAccounts, reviewTally);
      // The guided tour is now the page: fold the pre-run marketing hero away
      // so the walkthrough isn't mostly landing copy while it runs, and keep
      // consecutive stages physically close together (applyStageFocus).
      landingCopy.hidden = true;
      shell.classList.add('tour-active');

      // Rows marked as "held" for the callout in a holds beat -- cleared at
      // the top of every subsequent advance so the callout never lingers
      // past the step that narrated it.
      let markedHeldRows: HTMLElement[] = [];

      // The tour's own closing beat: a deliberate arrival (not wherever the
      // last stage happened to leave the scroll), a typed recap in the same
      // transcript voice as the stages, and an explicit affordance instead
      // of the dock simply vanishing.
      const runClosingBeat = async (): Promise<void> => {
        tourNextButton.disabled = true;

        // Reveal the sections the tour folded away, but hold the visual
        // scroll position steady while they reflow in -- revealing must
        // never itself move the camera. Only after a settle beat does the
        // camera make its own, separate, deliberate move.
        const scrollYBeforeReveal = window.scrollY;
        const heightBeforeReveal = document.documentElement.scrollHeight;
        markedHeldRows.forEach((row) => row.classList.remove('tour-held-row'));
        markedHeldRows = [];
        setHighlightedSubject(null);
        controls.hidden = false;
        reviewRoot.querySelectorAll<HTMLElement>('.account-panel').forEach((panel) => {
          panel.hidden = false;
        });
        updateTourDockSpacing();
        const revealedHeight = Math.max(0, document.documentElement.scrollHeight - heightBeforeReveal);
        if (revealedHeight > 0) window.scrollTo(0, scrollYBeforeReveal + revealedHeight);
        await wait(reduceMotion() ? 0 : 500);

        // Land somewhere deliberate: the review table, where every verdict
        // -- including the held rows -- is legible with its own reason
        // chip. That is the product's whole value, so it reads as the
        // punchline here, not as breakage.
        const closingSubject =
          reviewRoot.querySelector<HTMLElement>('.account-panel .row-blocked')?.closest<HTMLElement>(
            '.holdings-table-wrap'
          ) ??
          reviewRoot.querySelector<HTMLElement>('.holdings-table-wrap') ??
          reviewRoot;
        await scrollSubjectIntoView(closingSubject);
        updateTourDockSpacing(true);
        setHighlightedSubject(closingSubject);

        const totalRows = tourAccounts.reduce((sum, a) => sum + a.totalRows, 0);
        const totalEligible = tourAccounts.reduce((sum, a) => sum + a.eligibleCount, 0);
        const totalWithheld = tourAccounts.reduce((sum, a) => sum + a.withheldCount, 0);
        const closingLines = [
          `${totalRows} row(s) processed across ${tourAccounts.length} account(s)`,
          `${totalEligible} row(s) landed on the destination panel`,
          `${totalWithheld} row(s) held back for manual review or a missing lookup key`,
        ];
        // Per-account breakdown, typed into the same transcript -- real
        // counts and reasons, derived from the actual verdict results for
        // every held row (item 5).
        ingestion.accounts
          .filter((account) => packetsByAccount.has(account.accountNumber))
          .forEach((account) => {
            const packet = packetsByAccount.get(account.accountNumber)!;
            closingLines.push(
              `Account ${account.accountNumber}: ${account.holdings.length} row(s) processed, ${packet.rowCount} landed, ${packet.blockedCount} held`
            );
            if (packet.blockedCount > 0) {
              getAccountRowDisplay(account, { allowManualOverride: false })
                .filter((row) => !row.eligible)
                .forEach((row) => {
                  const label = (row.holding.ticker ?? row.holding.cusip ?? '').trim() || 'no ticker/CUSIP';
                  const reason = row.blockedWhy.replace(/^blocked: |^manual review required before export: /, '');
                  closingLines.push(`Held in ${account.accountNumber}: ${label} — ${reason}`);
                });
            }
          });
        closingLines.push(
          'Browser-only processing -- no project server, no auto-save',
          'Real market symbols, fabricated accounts and positions -- Save is always a manual operator click'
        );

        const renderClosingCopy = (): void => {
          tourCounter.textContent = 'Session complete';
          tourTitle.textContent = 'That was the full walkthrough';
          tourBody.textContent = 'Here is everything that just happened, held rows included.';
          tourProof.textContent = 'The demo is over — everything above is now yours to explore freely.';
          tourNextButton.textContent = 'Explore the full session';
        };
        if (reduceMotion()) {
          renderClosingCopy();
        } else {
          tourContent.classList.add('is-swapping');
          await wait(FADE_MS);
          renderClosingCopy();
          void tourContent.offsetHeight;
          tourContent.classList.remove('is-swapping');
          await wait(FADE_MS);
        }

        await runWorkingSequence(closingLines);

        tourRunAgainButton.hidden = false;
        tourNextButton.disabled = false;
        // First click: scroll to the top so the report's "explore" promise
        // actually delivers somewhere, keep the dock (and its report) up,
        // and relabel to a dismiss affordance. Second click: close it.
        let sessionReportOpen = false;
        tourNext = () => {
          if (!sessionReportOpen) {
            sessionReportOpen = true;
            tourNextButton.disabled = true;
            tourNextButton.textContent = 'Close the report';
            void animateScrollTo(0).then(() => {
              updateTourDockSpacing(true);
              tourNextButton.disabled = false;
            });
            return;
          }
          tourCard.hidden = true;
          tourRunAgainButton.hidden = true;
          setHighlightedSubject(null);
          updateTourDockSpacing();
          shell.classList.remove('tour-active');
        };
      };

      // Single writer for the remaining stages: the visitor advances one
      // step at a time via Next (see advanceTour) — nothing after this may
      // touch setWorkflowStep for this run.
      const advanceTour = async (): Promise<void> => {
        tourIndex += 1;
        if (tourIndex >= steps.length) {
          await runClosingBeat();
          return;
        }
        const step = steps[tourIndex];
        tourNextButton.disabled = true;
        setWorkflowStep(step.stage);

        // Clear the previous step's held-row callout before this step's
        // own focus takes over.
        markedHeldRows.forEach((row) => row.classList.remove('tour-held-row'));
        markedHeldRows = [];

        // Prep any DOM the step needs BEFORE anything scrolls, so the
        // scroll settles against the final layout -- and leave the
        // destination panel empty so nothing fills until the scroll has
        // fully settled (a fill racing the scroll is what caused the old
        // clip-then-correct jump). The panel's own slow entrance plays once,
        // after the scroll settles -- never during the camera move.
        const isFirstPanelReveal = Boolean(step.fillAccountNumber) && !panelRevealed;
        if (step.fillAccountNumber) {
          destinationRoot.hidden = false;
          if (!demoPanel) demoPanel = renderDemoDestinationPanel(destinationPanelHost);
          demoPanel.reset();
          if (isFirstPanelReveal) destinationRoot.classList.add('is-pre-reveal');
        }
        // The packet stage occurs exactly once per run; give its subject
        // the same pre-reveal treatment as the destination panel's first
        // appearance, so it arrives with the camera instead of booming in
        // already-visible the instant the scroll settles.
        const isPacketStage = step.stage === 'packet';
        if (isPacketStage) {
          reviewRoot.querySelector<HTMLElement>('.transfer-card')?.classList.add('is-pre-reveal');
        }
        // One movement at a time: focus the layout on this stage's subject,
        // settle a single deliberate scroll, THEN highlight, THEN swap the
        // dock's "what just happened" copy — never simultaneously.
        applyStageFocus(step);
        updateTourDockSpacing();
        const subject = getStageSubject(step);
        await scrollSubjectIntoView(subject);
        updateTourDockSpacing(true);
        setHighlightedSubject(subject);

        if (step.holdsForAccount) {
          markedHeldRows = Array.from(
            reviewRoot.querySelectorAll<HTMLElement>('.account-panel:not([hidden]) .row-blocked')
          );
          markedHeldRows.forEach((row) => row.classList.add('tour-held-row'));
        }

        if (isFirstPanelReveal) {
          void destinationRoot.offsetHeight; // force the pre-reveal state to paint before it's removed
          destinationRoot.classList.remove('is-pre-reveal');
          await wait(reduceMotion() ? 0 : 750);
          panelRevealed = true;
        }
        if (isPacketStage) {
          void subject.offsetHeight; // force the pre-reveal state to paint before it's removed
          subject.classList.remove('is-pre-reveal');
          await wait(reduceMotion() ? 0 : 750);
        }

        await runWorkingSequence(step.workSteps);

        if (step.fillAccountNumber) {
          setStatus(status, `Filling account ${step.fillAccountNumber} into the simulated destination page...`);
          // The action this step narrates must fully finish before anything
          // below shows or claims it happened.
          await runFillIntoPanel(packetsByAccount.get(step.fillAccountNumber)!);
        }

        await swapTourStep(step, tourIndex, steps.length);
        updateTourDockSpacing(true);
        // The subject was framed against the dock's PREVIOUS copy, and a
        // fill can grow the subject itself as rows land -- either can leave
        // it a few pixels under the dock once this step's own (possibly
        // taller) copy is showing. One more small, deliberate settle
        // re-frames it, but only if that actually happened.
        {
          const dockTopFinal = tourCard.hidden ? window.innerHeight : tourCard.getBoundingClientRect().top;
          const overlap = subject.getBoundingClientRect().bottom - (dockTopFinal - 16);
          // Small overlaps aren't worth a second, visible camera move (that
          // second move is what read as zoom/drift on stage 5) -- only
          // re-settle when the dock would meaningfully cover the subject.
          if (overlap > 40) {
            await scrollSubjectIntoView(subject);
            updateTourDockSpacing(true);
          }
        }
        tourNextButton.disabled = false;
        if (step.stage === 'review') {
          setStatus(status, 'Demo sample is ready for review.', 'success');
        } else if (step.stage === 'packet') {
          setStatus(status, 'Preparing the eMoney Fill Packet from eligible rows...');
        } else if (step.stage === 'fill' && step.fillAccountNumber) {
          setStatus(status, `Account ${step.fillAccountNumber} filled into the simulated destination page.`, 'success');
        }
      };
      tourNext = () => void advanceTour();
      await advanceTour();
    } catch (err) {
      console.error('Could not load the demo sample.');
      setStatus(status, `Could not load demo sample: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };
  sampleButton.onclick = () => void startDemoTour();
  tourRunAgainButton.onclick = () => {
    tourRunAgainButton.hidden = true;
    void startDemoTour();
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
