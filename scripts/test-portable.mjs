// Headless Chrome E2E for the portable single-file HTML.
// Asserts the file:// load works, the demo sample loads, the Fill Packet
// is byte-identical to the schema, and no unexpected network requests happen.
// Default: headless; pass --headed to watch.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const headed = process.argv.includes('--headed');
const portableHtml = resolve('demo-dist-portable', 'Holdings-Entry-Assistant.html');
if (!existsSync(portableHtml)) {
  console.error(`Portable bundle not found at ${portableHtml}. Run 'npm run build:portable' first.`);
  process.exit(1);
}
const portableUrl = 'file:///' + portableHtml.replace(/\\/g, '/');

const userData = mkdtempSync(join(tmpdir(), 'chrome-test-portable-'));
const chromeCandidates = [
  process.env.CHROME_BIN,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);
const chrome = chromeCandidates.find((p) => existsSync(p));
if (!chrome) {
  console.error('Could not find Chrome or Edge. Set CHROME_BIN.');
  process.exit(1);
}

const port = 9224 + Math.floor(Math.random() * 50);
const args = [
  ...(headed ? [] : ['--headless=new']),
  '--disable-gpu', '--no-sandbox',
  `--user-data-dir=${userData}`,
  `--remote-debugging-port=${port}`,
  '--window-size=1440,1700',
  portableUrl,
];
const cp = spawn(chrome, args, { stdio: 'ignore' });
let ws = null;
let cleanedUp = false;
function cleanup() {
  if (cleanedUp) return;
  cleanedUp = true;
  try { ws?.close(); } catch {}
  if (!cp.killed) cp.kill();
}
process.once('exit', cleanup);
process.once('unhandledRejection', (error) => {
  console.error(error instanceof Error ? error.message : String(error));
  cleanup();
  process.exit(1);
});
process.once('SIGINT', () => { cleanup(); process.exit(130); });
cp.on('error', (e) => { console.error('spawn error', e.message); cleanup(); process.exit(1); });

async function waitForPort() {
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(`http://localhost:${port}/json/version`)).ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}
if (!await waitForPort()) {
  console.error('cdp port did not open');
  cp.kill(); process.exit(1);
}

let target = null;
for (let attempt = 0; attempt < 40 && !target; attempt += 1) {
  const tabs = await (await fetch(`http://localhost:${port}/json`)).json();
  target = tabs.find((entry) =>
    entry.type === 'page' &&
    entry.url?.startsWith('file:') &&
    entry.url.endsWith('Holdings-Entry-Assistant.html')
  ) || null;
  if (!target) await new Promise((resolve) => setTimeout(resolve, 100));
}
if (!target?.webSocketDebuggerUrl) {
  console.error('CDP did not expose a page target.');
  cleanup();
  process.exit(1);
}
ws = new WebSocket(target.webSocketDebuggerUrl);
await Promise.race([
  new Promise((resolve, reject) => {
    if (ws.readyState === WebSocket.OPEN) return resolve();
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', () => reject(new Error('CDP websocket failed to open')), { once: true });
  }),
  new Promise((_, reject) => setTimeout(() => reject(new Error('CDP websocket open timed out')), 10000)),
]);
let msgId = 0;
const pending = new Map();
const unexpectedRequests = [];
const consoleEntries = [];
const runtimeErrors = [];
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.method === 'Network.requestWillBeSent') {
    const url = msg.params.request.url;
    if (!url.startsWith('file://') && !url.startsWith('about:') && !url.startsWith('data:') && url !== '') {
      unexpectedRequests.push(url);
    }
  }
  if (msg.method === 'Runtime.consoleAPICalled') {
    consoleEntries.push(msg.params.args.map((arg) => arg.value ?? arg.description ?? '').join(' '));
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    runtimeErrors.push(msg.params.exceptionDetails.text || msg.params.exceptionDetails.exception?.description || 'runtime exception');
  }
  if (msg.id && pending.has(msg.id)) {
    const request = pending.get(msg.id);
    clearTimeout(request.timer);
    pending.delete(msg.id);
    if (msg.error) request.reject(new Error(`${request.method}: ${msg.error.message}`));
    else request.resolve(msg);
  }
});
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`${method} timed out`));
    }, 10000);
    pending.set(id, { resolve, reject, timer, method });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');

// The exact portable file target was selected above.
await new Promise((r) => setTimeout(r, 1800));

const shellExpr = `JSON.stringify({
  href: location.href,
  readyState: document.readyState,
  bodyPreview: document.body?.textContent?.slice(0, 120) || '',
  hasShell: !!document.querySelector('.ledger-shell'),
  hasStepper: !!document.querySelector('.workflow-stepper'),
  title: document.querySelector('.ledger-title')?.textContent || '',
  buildPill: document.querySelector('.build-pill')?.textContent || '',
  safetyBadges: [...document.querySelectorAll('.ledger-safety-badges > span')].map(s => s.textContent),
  buildInfo: window.__BUILD_INFO__,
})`;
const shellCheck = await send('Runtime.evaluate', { expression: shellExpr });
const shell = JSON.parse(shellCheck.result.result.value);

await send('Runtime.evaluate', {
  expression: `[...document.querySelectorAll('button')].find(b => b.textContent.includes('Load demo sample'))?.click()`,
});
await new Promise((r) => setTimeout(r, 2200));

const reviewExpr = `JSON.stringify({
  activeStep: document.querySelector('.workflow-step.is-active span:last-child')?.textContent || '',
  hasTransferRail: !!document.querySelector('.transfer-rail'),
  includedFields: [...document.querySelectorAll('.field-list:not(.excluded) li')].map(li => li.textContent.trim()),
  excludedFields: [...document.querySelectorAll('.field-list.excluded li')].map(li => li.textContent.trim()),
  eligibleCount: document.querySelector('.preflight-metric.is-eligible strong')?.textContent || '',
  tickers: [...document.querySelectorAll('.holdings-table tbody tr')].map(tr => tr.querySelector('td:nth-child(2)')?.textContent?.trim()),
})`;
const reviewCheck = await send('Runtime.evaluate', { expression: reviewExpr });
const review = JSON.parse(reviewCheck.result.result.value);

const packetExpr = `(async () => {
  let captured = '';
  if (navigator.clipboard) navigator.clipboard.writeText = async (t) => { captured = t; };
  const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Copy eMoney Fill Packet'));
  if (!btn) return JSON.stringify({ found: false });
  btn.click();
  await new Promise(r => setTimeout(r, 500));
  let parsed = null;
  try { parsed = JSON.parse(captured); } catch {}
  return JSON.stringify({
    found: true,
    rawLength: captured.length,
    schemaVersion: parsed?.schemaVersion,
    rowCount: parsed?.rowCount,
    approvedFields: parsed?.approvedFields,
    excludedFields: parsed?.excludedFields,
    firstHolding: parsed?.holdings?.[0],
    topLevelKeys: parsed ? Object.keys(parsed) : [],
  });
})()`;
const packetCheck = await send('Runtime.evaluate', { expression: packetExpr, awaitPromise: true });
const packet = JSON.parse(packetCheck.result.result.value);

await send('Runtime.evaluate', {
  expression: `[...document.querySelectorAll('button')].find(b => b.textContent.includes('Export JSON Payload'))?.click()`,
});
await new Promise((resolve) => setTimeout(resolve, 250));

cleanup();

const failures = [];
const expect = (cond, msg) => { if (!cond) failures.push(msg); };

expect(shell.hasShell, `shell did not render (href=${shell.href}, ready=${shell.readyState}, body="${shell.bodyPreview}")`);
expect(shell.hasStepper, 'workflow stepper did not render');
expect(shell.title === 'Holdings Entry Assistant', `title mismatch: "${shell.title}"`);
expect(shell.buildPill.startsWith('Build '), `build pill wrong: "${shell.buildPill}"`);
expect(shell.buildInfo && shell.buildInfo.sha, 'window.__BUILD_INFO__.sha missing');
expect(shell.buildInfo && shell.buildInfo.schemaVersion === 'emoney-fill-packet/v1', '__BUILD_INFO__.schemaVersion wrong');
expect(shell.safetyBadges.includes('BROWSER PROCESSING'), 'BROWSER PROCESSING badge missing');
expect(shell.safetyBadges.includes('NO PROJECT SERVER'), 'NO PROJECT SERVER badge missing');
expect(shell.safetyBadges.includes('Manual Save in eMoney'), 'Manual Save in eMoney badge missing');

expect(review.activeStep === 'Review Holdings', `active step should be Review Holdings, got "${review.activeStep}"`);
expect(review.hasTransferRail, 'transfer-rail did not render');
expect(review.includedFields.join(',') === 'Ticker,Units,Cost Basis', `included fields wrong: ${review.includedFields.join(',')}`);
expect(review.excludedFields.join(',') === 'Market Value,Asset Class,Sector,Save', `excluded fields wrong: ${review.excludedFields.join(',')}`);
expect(review.eligibleCount === '3', `expected 3 eligible, got "${review.eligibleCount}"`);
expect(review.tickers?.join(',') === 'AAPL,MSFT,GOOG', `tickers wrong: ${review.tickers?.join(',')}`);

expect(packet.found, 'Copy eMoney Fill Packet button not found');
expect(packet.schemaVersion === 'emoney-fill-packet/v1', `packet schemaVersion wrong: ${packet.schemaVersion}`);
expect(packet.rowCount === 3, `packet rowCount expected 3, got ${packet.rowCount}`);
expect(JSON.stringify(packet.approvedFields) === '["ticker","units","costBasis"]', `approvedFields wrong: ${JSON.stringify(packet.approvedFields)}`);
expect(JSON.stringify(packet.excludedFields) === '["marketValue","assetClass","sector","save"]', `excludedFields wrong: ${JSON.stringify(packet.excludedFields)}`);
expect(packet.firstHolding && !('marketValue' in packet.firstHolding), 'packet leaks marketValue per row');
expect(packet.firstHolding && !('assetClass' in packet.firstHolding), 'packet leaks assetClass per row');
expect(packet.firstHolding && !('sector' in packet.firstHolding), 'packet leaks sector per row');
expect(packet.firstHolding && !('description' in packet.firstHolding), 'packet leaks description per row');

expect(unexpectedRequests.length === 0, `${unexpectedRequests.length} unexpected network requests: ${unexpectedRequests.slice(0, 5).join(', ')}`);

const consoleText = consoleEntries.join('\n');
const forbiddenPayloadLabel = ['Exported assistant', ' payload'].join('');
expect(!(new RegExp(forbiddenPayloadLabel, 'i')).test(consoleText), 'complete payload log label reached console');
expect(!/123456789|AAPL|MSFT|GOOG|1450|1800|900/.test(consoleText), 'account or position values reached console');
expect(runtimeErrors.length === 0, `runtime errors: ${runtimeErrors.join(' | ')}`);

if (failures.length) {
  console.error('Portable E2E failures:');
  for (const f of failures) console.error('  -', f);
  process.exit(1);
}
console.log(`Portable E2E passed. Build: ${shell.buildPill}. No network requests fired.`);
