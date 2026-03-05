# Mission Control — How to Use and Test

This document is the operator guide for the current Mission Control implementation in `pooapp`.

## 1) Feature overview: what was built

Mission Control is now implemented as a **collaboration + operations layer** on top of the core list app.

### Phase 1 (collaboration foundation)
- **Assignees on items** (`assigneeDid`, `assignedAt`)
- **List activity log** (created/completed/assigned/commented/edited action stream)
- **Realtime presence** (who is currently in a list)
- **Phase 1 perf harness** for list-open and activity-panel P95 checks
- **Observability assets**:
  - metrics catalog: `docs/mission-control/phase1-observability-metrics.json`
  - dashboard config: `docs/mission-control/phase1-observability-dashboard-config.json`
  - alert routing: `docs/mission-control/phase1-observability-alert-routing.json`
  - runbook: `docs/mission-control/phase1-observability-runbook.md`
  - validator: `scripts/validate-mission-control-observability.mjs`

### Phase 3 (memory system)
- **Memory schema + search index** (`memories` table with full-text search)
- **Memory CRUD + sync backend** (`convex/memories.ts`, `convex/lib/memorySync.ts`)
- **Memory HTTP API** (list/create/update/delete + bidirectional sync)
- **Memory UI** (`/app/memory`) with:
  - search
  - source filter
  - sync-status filter
  - conflict banner/count
  - create-memory form
- **Validation + tests**:
  - static validator: `scripts/validate-mission-control-phase3.mjs`
  - memory sync unit tests
  - Phase 3 e2e suite: `e2e/mission-control-phase3-memory.spec.ts`

### Production-readiness drill
- Scripted readiness check for:
  - alert routing integrity (Slack + PagerDuty for high/critical)
  - dashboard reachability
  - retention/audit route health
  - API key inventory/rotation contract checks
  - live operator controls (`pause`, optional `kill`, `escalate`) in non-dry mode
- Drill script: `scripts/mission-control-readiness-drill.mjs`

---

## 2) How to run validation scripts

From repo root:

```bash
cd /Users/krusty/clawd/pooapp
```

### A. Observability config validation
```bash
npm run mission-control:validate-observability
```
What it validates:
- metric catalog shape + uniqueness
- dashboard metric references
- cross-file alert sync (metrics/dashboard/routing)
- concrete (non-placeholder) routes
- severity policy and Slack/PagerDuty escalation coverage

### B. Phase 3 implementation validation
```bash
npm run mission-control:validate-phase3
```
What it validates:
- schema, backend, API, UI, and e2e coverage markers for memory system
- currently reports 24 checks

### C. Readiness drill unit/contract tests
```bash
npm run mission-control:test-readiness-drill
```
What it validates:
- readiness helper logic
- API contract validators for key inventory, rotation, finalize, retention payloads

---

## 3) How to run e2e tests

## Prereqs
- Node deps installed
- Playwright browsers installed (`npx playwright install` if needed)
- App is launched automatically by Playwright via `bun run dev`

### A. Phase 1 Mission Control acceptance suite
```bash
npm run test:e2e:mission-control
```
Includes AC0–AC5 harness scenarios in `e2e/mission-control-phase1.spec.ts`.

**Important gating note:**
- Many AC paths are intentionally **environment-gated** and may skip if backend-auth-ready session data is not available.
- To reduce auth-gated skips, provide:
  - `E2E_AUTH_TOKEN`
  - `E2E_AUTH_EMAIL`
  - `E2E_AUTH_SUBORG_ID`
  - `E2E_AUTH_DID`

### B. Phase 3 Memory e2e suite
```bash
npm run test:e2e:mission-control:phase3
```
Runs `e2e/mission-control-phase3-memory.spec.ts`.

**For API scenarios (non-skip):**
- set `E2E_API_KEY`
- optionally set `E2E_CONVEX_SITE_URL` (defaults to `https://poo-app.convex.site`)

Without `E2E_API_KEY`, API-focused tests are expected to skip.

### C. Full e2e suite (optional)
```bash
npm run test:e2e
```

---

## 4) How to use the readiness drill

The readiness drill supports **dry-run** (default) and **live** mode.

## Required env vars
- `MISSION_CONTROL_BASE_URL` (required for remote checks)
- at least one auth mode for remote checks:
  - `MISSION_CONTROL_API_KEY` (API key routes)
  - `MISSION_CONTROL_JWT` (JWT-only routes)

## Dry-run mode (default)
```bash
MISSION_CONTROL_BASE_URL="https://<your-host>" \
MISSION_CONTROL_API_KEY="<key>" \
MISSION_CONTROL_JWT="<jwt>" \
npm run mission-control:readiness-drill
```
- Verifies routing + API reachability + auth/retention contracts
- Does **not** mutate runs

## Live mode (run-control + rotation flow)
```bash
MISSION_CONTROL_BASE_URL="https://<your-host>" \
MISSION_CONTROL_API_KEY="<key>" \
MISSION_CONTROL_JWT="<jwt>" \
MISSION_CONTROL_DRILL_DRY_RUN=false \
npm run mission-control:readiness-drill
```
- Executes zero-downtime key rotation assertions
- Executes run controls:
  - `pause` (required)
  - `kill` (if second run available)
  - `escalate` (required)
- Script performs best-effort cleanup for temporary drill keys

## Interpreting results
- ✅ all checks pass: rollout/readiness can proceed
- ⚠ skipped checks: coverage was partial due to missing env/auth/data
- ❌ any failed control path or routing/auth contract: stop rollout and resolve

---

## 5) API endpoints summary

## Runs & operations
- `GET /api/v1/runs`
- `POST /api/v1/runs`
- `PATCH /api/v1/runs/:id`
- `DELETE /api/v1/runs/:id`

## Run control endpoints
- `POST /api/v1/runs/:id/pause`
- `POST /api/v1/runs/:id/kill`
- `POST /api/v1/runs/:id/escalate`
- `POST /api/v1/runs/:id/reassign`
- `POST /api/v1/runs/:id/retry`
- `POST /api/v1/runs/:id/transition`
- `POST /api/v1/runs/:id/heartbeat`
- `POST /api/v1/runs/:id/artifacts`
- `POST /api/v1/runs/monitor`

## Dashboard
- `GET /api/v1/dashboard/runs`

## Retention + audit (JWT-only)
- `GET /api/v1/runs/retention`
- `PUT /api/v1/runs/retention`
- `POST /api/v1/runs/retention`

## API key lifecycle
- `POST /api/v1/auth/keys/:id/rotate`
- `POST /api/v1/auth/keys/:id/finalize-rotation`

## Memory API (Phase 3)
- `GET /api/v1/memory`
- `POST /api/v1/memory`
- `PATCH /api/v1/memory/:id`
- `DELETE /api/v1/memory/:id`
- `GET /api/v1/memory/sync`
- `POST /api/v1/memory/sync`

See `docs/mission-control/mission-runs-api.md` for contract details and auth scope notes.

---

## 6) Known limitations / blockers

1. **E2E environment gating still causes skips**
   - Phase 1 AC flows skip when authenticated app-shell state cannot be seeded/validated.
   - Requires stable `E2E_AUTH_*` values aligned with backend environment.

2. **Phase 3 API e2e tests require `E2E_API_KEY`**
   - Without it, Memory API/bidirectional-sync test cases skip by design.

3. **Live readiness drill requires realistic run inventory**
   - `kill` control path requires at least two runs in list response.

4. **Remote drill coverage is partial without both auth modes**
   - Best coverage needs both `MISSION_CONTROL_API_KEY` and `MISSION_CONTROL_JWT`.

5. **Agent API tracking credential blocker (project tracking workflow)**
   - Prior overnight tracking noted missing local agent API credentials/session for some task-write automation.

6. **No localhost assumption in team workflow**
   - For shared validation/review, use deployed environment targets (not local-only assumptions) where required by operator workflow.

---

## Quick command bundle (copy/paste)

```bash
cd /Users/krusty/clawd/pooapp
npm run mission-control:validate-observability
npm run mission-control:validate-phase3
npm run mission-control:test-readiness-drill
npm run test:e2e:mission-control
npm run test:e2e:mission-control:phase3
```
