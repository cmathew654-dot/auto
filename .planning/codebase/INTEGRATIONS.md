# External Integrations

**Analysis Date:** 2026-08-05

## APIs & External Services

**None**

Application makes no external API calls. Parsing, validation, and review logic runs entirely in the browser. No backend service, no hosted API, no SaaS integrations.

- Confirmed in `main.ts` line 501: "Does not use a browser extension, backend, eMoney API, or local bridge service."
- Confirmed in `holdings-csv-parser.ts` lines 528, 586: `externalApiUsed: false`
- Confirmed in `holdings-schema.ts` lines 168, 190: `externalApiUsed: false`

## Data Storage

**Databases:**
- None. No database integration.

**File Storage:**
- Local filesystem only (user's system clipboard)
- Demo uses synthetic sample data only
- Real CSV files: user selects via file input, parsed in memory
- No cloud storage, no local database, no persistence layer

**Caching:**
- None. Each session is independent.
- Sample data at `sample-data/` is committed for demo purposes

**Data Boundary:**
- CSV data loaded by user remains in browser memory
- Prepared data packet copied to system clipboard when user requests
- Clipboard cleared only if still contains last packet written by this session (see `review-export-surface.ts`)
- No data sent to server, no remote persistence

## Authentication & Identity

**Auth Provider:**
- None. No authentication system.

**Access Control:**
- None. Application is standalone, runs entirely client-side.
- Desktop shell (Tauri) runs locally without network access

## Monitoring & Observability

**Error Tracking:**
- None. No error reporting service.

**Logs:**
- None. No persistent logging.
- Console output for development only

**Health Checks:**
- None.

## CI/CD & Deployment

**Hosting:**
- GitHub Pages via `https://cmathew654-dot.github.io/emoney-holdings-entry-assistant/`
- Configured in `.github/workflows/pages.yml`

**CI Pipeline:**
- GitHub Actions (`.github/workflows/pages.yml`)
- Triggers: push to main branch, manual workflow_dispatch
- Permissions: read contents, write pages, write id-token
- Steps:
  1. Checkout code
  2. Set up Node 22 with npm cache
  3. npm ci (install dependencies)
  4. npm test (run all tests)
  5. npm run typecheck (type validation)
  6. npm run build:demo (build browser artifact)
  7. Configure GitHub Pages
  8. Upload Pages artifact (`demo-dist/` directory)
  9. Deploy to GitHub Pages (automatic)

**Build Isolation:**
- Runs on: `ubuntu-latest` (GitHub-hosted runner)
- No secrets required
- No external service credentials

**Desktop Distribution:**
- Optional Windows NSIS installer via Tauri
- Built locally by developer, not in CI/CD pipeline
- No automated desktop release pipeline

## Environment Configuration

**Required Environment Variables:**
- None. Application requires no environment configuration.

**Optional Configuration:**
- None.

**Secrets Location:**
- None used. `.gitignore` excludes `.env*` files as precaution only.

## Webhooks & Callbacks

**Incoming:**
- None. Application receives no webhooks.

**Outgoing:**
- None. Application sends no webhooks or callbacks.

**Third-party Integrations:**
- eMoney Advisor: User manually copies prepared packet to eMoney Holdings page
- No API integration, no webhook, no direct communication
- User controls timing and execution via browser bookmark (external to this app)

## External Dependencies Runtime

**No Runtime Dependencies**

The application bundles with zero external runtime dependencies:
- No network libraries (axios, fetch polyfills, etc.)
- No state management (Redux, MobX, etc.)
- No UI frameworks (React, Vue, etc.)
- No utilities (lodash, etc.)

All logic built with:
- TypeScript (compile-time only)
- JavaScript standard library (ES2019+)
- DOM APIs (browser built-in)
- Node.js built-ins (build/test time only)

## Cross-Origin & Security

**CORS:**
- Not applicable. Application makes no cross-origin requests.

**Content Security Policy:**
- `src-tauri/tauri.conf.json` line 26: CSP set to null (permissive)
- No external resource restrictions during desktop mode

**Data Privacy:**
- No analytics
- No telemetry
- No tracking
- No external data transmission
- User data never leaves their system/clipboard

See `SECURITY.md` for private vulnerability reporting and `DISCLAIMER.md` for project boundaries.

---

*Integration audit: 2026-08-05*
