# Mission Runs API (v1 hardening)

## List runs
`GET /api/v1/runs`

Query params:
- `status` (optional)
- `listId` (optional)
- `itemId` (optional)
- `startDate` / `endDate` (optional, unix ms)
- `page` (optional, default `1`)
- `limit` (optional, default `25`, max `100`)

## Create run
`POST /api/v1/runs`

Body:
- `listId` (required)
- `agentSlug` (required)
- `itemId`, `provider`, `computerId`, `parentRunId`, `heartbeatIntervalMs` (optional)

Requires scope: `runs:write`.

## Edit run metadata
`PATCH /api/v1/runs/:id`

Body fields (all optional):
- `provider`
- `computerId`
- `costEstimate`
- `tokenUsage`

Requires scope: `runs:write`.

## Run controls
- `POST /api/v1/runs/:id/pause`
- `POST /api/v1/runs/:id/kill`
- `POST /api/v1/runs/:id/escalate`
- `POST /api/v1/runs/:id/reassign` (body: `targetAgentSlug` required)
- `POST /api/v1/runs/:id/retry`
- `POST /api/v1/runs/:id/transition`
- `POST /api/v1/runs/:id/heartbeat`
- `POST /api/v1/runs/:id/artifacts`
- `POST /api/v1/runs/monitor`

Control endpoints require scope: `runs:control`.

## Retention + audit
- `GET /api/v1/runs/retention` (settings + deletion logs, **JWT only**)
- `PUT /api/v1/runs/retention` (update policy, **JWT only**)
- `POST /api/v1/runs/retention` (apply retention dry-run/live, **JWT only**)

### API key rotation contract + guardrails
`POST /api/v1/auth/keys/:id/rotate` hardening now enforces:
- active key only (revoked keys are rejected)
- only one in-flight rotation per old key (`409` if already rotating)
- `gracePeriodHours` must be finite (clamped to `1..168`)
- optional `expiresAt` must be a future unix-ms timestamp and **must be later than** the grace-window end

`POST /api/v1/auth/keys/:id/finalize-rotation` is idempotent and returns the effective `revokedAt` timestamp.

Behavior guarantees:
- Retention day input is clamped to `1..365` and cutoff logic is strict (`createdAt < cutoff` is stale).
- Deletion logs are idempotent per `(runId, retentionCutoffAt, dryRun)` + artifact fingerprint to avoid duplicate audit rows during retries.
- Deletion log artifacts are schema-normalized before response serialization to harden API consumers.

### Readiness drill auth notes
`scripts/mission-control-readiness-drill.mjs` supports split-auth checks so launch gates can validate key rotation and retention/audit integration:
- `MISSION_CONTROL_API_KEY` for API-key scoped routes (dashboard/runs + run controls)
- `MISSION_CONTROL_JWT` for JWT-only routes (`/api/v1/auth/keys`, `/api/v1/runs/retention`)
- `MISSION_CONTROL_BASE_URL` required for remote checks

Live mode (`MISSION_CONTROL_DRILL_DRY_RUN=false`) also runs zero-downtime rotation assertions:
1. create temporary API key
2. rotate key and assert old+new key overlap during grace window
3. finalize rotation and assert old key is rejected while new key remains valid
4. best-effort cleanup of temporary keys

## Dashboard
`GET /api/v1/dashboard/runs`

Returns run-health aggregates:
- success rate
- intervention rate
- timeout rate
- active/degraded run slices

Requires scope: `dashboard:read`.

## Delete run
`DELETE /api/v1/runs/:id`

Requires scope: `runs:control`.
