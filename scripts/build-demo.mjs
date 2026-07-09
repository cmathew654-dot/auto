import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const outDir = join(root, 'demo-dist');

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const tscArgs = [
  '--target', 'es2019',
  '--module', 'es2020',
  '--lib', 'es2019,dom',
  '--skipLibCheck',
  '--outDir', outDir,
  'main.ts',
  'holdings-schema.ts',
  'holdings-csv-parser.ts',
  'ledger-styles.ts',
  'paste-conductor.ts',
  'review-export-surface.ts',
  'emoney-browser-helper.ts',
];

const tscBin = join(root, 'node_modules', 'typescript', 'bin', 'tsc');
const result = spawnSync(process.execPath, [tscBin, ...tscArgs], { stdio: 'inherit' });
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

for (const file of readdirSync(outDir)) {
  if (!file.endsWith('.js')) continue;
  const path = join(outDir, file);
  let content = readFileSync(path, 'utf8');
  content = content.replace(/from '(\.\/[A-Za-z0-9_-]+)'/g, "from '$1.js'");
  content = content.replace(/import\('(\.\/[A-Za-z0-9_-]+)'\)/g, "import('$1.js')");
  writeFileSync(path, content);
}

writeFileSync(join(outDir, 'index.html'), `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Holdings Transformer + eMoney Entry Assistant</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module">
      import { renderLocalMvpShell } from './main.js';
      renderLocalMvpShell(document.getElementById('app'));
    </script>
  </body>
</html>
`);

console.log('Demo build complete: demo-dist/index.html');
