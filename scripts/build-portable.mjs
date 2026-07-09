// Builds a single self-contained HTML for double-click distribution from file://.
// One artifact, no Node, no server, no .exe install. The CSP meta makes
// "no network" auditable by grep rather than by trust.

import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { build } from 'esbuild';

const root = process.cwd();
const outDir = join(root, 'demo-dist-portable');

function sh(cmd) {
  try { return execSync(cmd, { encoding: 'utf8' }).trim(); } catch { return ''; }
}

const sha = sh('git rev-parse --short HEAD') || 'unknown';
const branch = sh('git rev-parse --abbrev-ref HEAD') || 'unknown';
const dirty = sh('git status --porcelain') ? '-dirty' : '';
const builtAt = new Date().toISOString();

const buildInfo = { sha: `${sha}${dirty}`, branch, builtAt, schemaVersion: 'emoney-fill-packet/v1' };

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const result = await build({
  entryPoints: [join(root, 'main.ts')],
  bundle: true,
  format: 'iife',
  globalName: 'HoldingsApp',
  target: 'es2020',
  platform: 'browser',
  minify: true,
  write: false,
  legalComments: 'none',
  loader: { '.ts': 'ts' },
});

const bundleJs = result.outputFiles[0].text;
const bundleSize = bundleJs.length;

// CSP locks the document to its own inline script + style, blocks every network sink.
// img-src data: lets us use small inline SVG icons if added later; default-src 'none'
// makes any future fetch / WebSocket / script-src failure auditable in console.
const csp = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "img-src data:",
  "font-src data:",
  "form-action 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
].join('; ');

const buildInfoJson = JSON.stringify(buildInfo);

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-build-sha" content="${buildInfo.sha}">
<meta name="x-built-at" content="${buildInfo.builtAt}">
<title>Holdings eMoney Assistant</title>
</head>
<body>
<div id="app"></div>
<script>window.__BUILD_INFO__ = ${buildInfoJson};</script>
<script>${bundleJs}
HoldingsApp.renderLocalMvpShell(document.getElementById('app'));</script>
</body>
</html>
`;

const outPath = join(outDir, 'Holdings-eMoney-Assistant.html');
writeFileSync(outPath, html, 'utf8');

const totalBytes = Buffer.byteLength(html, 'utf8');
console.log(`Portable build complete: ${outPath}`);
console.log(`  build sha:  ${buildInfo.sha}`);
console.log(`  built at:   ${buildInfo.builtAt}`);
console.log(`  bundle js:  ${(bundleSize / 1024).toFixed(1)} KB`);
console.log(`  total html: ${(totalBytes / 1024).toFixed(1)} KB`);
