# Technology Stack

**Analysis Date:** 2026-08-05

## Languages

**Primary:**
- TypeScript 5.9.3 - All source code and build scripts
- Rust 2021 edition - Tauri desktop shell (optional)

**Secondary:**
- JavaScript - Output targets (ES2019 for demo, ES2020 for browser builds)

## Runtime

**Environment:**
- Node.js 22 (as specified in `.github/workflows/pages.yml` line 26)
- Tauri runtime (optional, for desktop shell)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present (745 lines)

## Frameworks

**Core:**
- Tauri 2 - Desktop shell wrapper (optional)
  - Located: `src-tauri/`
  - Bundles to Windows NSIS installer
  - Configuration: `src-tauri/tauri.conf.json`

**Build/Compilation:**
- TypeScript 5.9.3 - Transpilation and type checking
- esbuild 0.27.7 - Portable artifact bundling
- Tauri Build 2 (build-dependencies) - Desktop build support

**Testing:**
- Node's built-in test runner (no external test framework)
- Run via: `npm test` (compiles .test.cjs files and runs via node --test)

## Key Dependencies

**No Runtime Dependencies**
- All dependencies are devDependencies only
- Application is zero-dependency at runtime

**Dev/Build Only:**
- `@tauri-apps/cli` 2.11.2 - Desktop shell CLI
- `esbuild` 0.27.7 - ES module bundler (portable.html generation)
- `typescript` 5.9.3 - TypeScript compiler

**Tauri Core:**
- `tauri` 2.x - Desktop application framework (Rust, in Cargo.toml)
- `tauri-build` 2.x - Build support (Rust, in Cargo.toml)

## Configuration

**TypeScript:**
- Demo build: `tsconfig.json` (inferred from scripts) - target ES2020, module ES2020
- Test build: `tsconfig.test.json` (lines 2-23) - target ES2020, module CommonJS, output `.test-dist/`
- Typecheck only: `tsconfig` - target ES2019 (for browser/Node compatibility)

**Tauri:**
- Configuration: `src-tauri/tauri.conf.json` (lines 1-42)
  - App: Holdings Entry Assistant
  - Window: 1280x860, min 1040x720
  - Bundle: Windows NSIS installer only
  - DevTools: disabled
  - CSP: null (permissive during dev)

**Environment:**
- No .env file exists or required (checked `.gitignore` line 16-17)
- No environment variables used in build or runtime

## Build & Test Scripts

**Commands defined in `package.json`:**
- `npm test` - Compile TS and run Node tests via built-in test runner
- `npm run typecheck` - Type check only (no emit)
- `npm run build:demo` - Compile to ES2020, write to `demo-dist/`, fix ESM imports
- `npm run build:portable` - Create single self-contained HTML file
- `npm run test:portable` - Test portable build
- `npm run start:demo` - `build:demo` + serve locally via `scripts/serve-demo.mjs`
- `npm run desktop:dev` - `build:demo` + `tauri dev`
- `npm run desktop:build` - `build:demo` + `tauri build`

**Build Scripts:**
- `scripts/build-demo.mjs` - TypeScript compilation + ESM import rewriting
- `scripts/build-portable.mjs` - esbuild bundling to single HTML file
- `scripts/serve-demo.mjs` - Local dev server
- `scripts/test-portable.mjs` - Portable artifact testing

## Compilation Targets

**Demo (Browser):**
- Input: TypeScript source files (8 .ts files)
- Output: `demo-dist/` with index.html + compiled .js files
- Target: ES2020 module
- CSP: Inline styles, no external resources

**Portable (Self-Contained):**
- Input: Compiled demo build
- Output: Single `demo-dist-portable/index.html`
- Bundle: esbuild bundles all JS + inlines styles
- Target: Works in any modern browser, no server required

**Desktop (Tauri):**
- Input: Demo build (from `beforeBuildCommand` in tauri.conf.json)
- Output: Windows NSIS installer
- Runtime: Tauri webview + Rust shell
- Assets: `frontend-dist` references `../demo-dist`

**Test:**
- Input: Source .ts files + .test.cjs files
- Output: `.test-dist/` with CommonJS modules
- Runner: Node.js built-in test runner
- Coverage: Not configured

## Platform Requirements

**Development:**
- Node.js 22+
- TypeScript (installed locally)
- esbuild (installed locally)
- For desktop: Rust toolchain + Tauri CLI

**Production:**
- Browser: Modern ES2020 support (2020+ browsers)
- Desktop: Windows 10+ (NSIS installer)
- No external services, no API keys, no database

---

*Stack analysis: 2026-08-05*
