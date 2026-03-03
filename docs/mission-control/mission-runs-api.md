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

### Readiness drill auth notes
`scripts/mission-control-readiness-drill.mjs` now supports split-auth checks so launch gates can validate both key rotation and retention/audit integration:
- `MISSION_CONTROL_API_KEY` for API-key scoped routes (dashboard/runs + run controls)
- `MISSION_CONTROL_JWT` for JWT-only routes (`/api/v1/auth/keys`, `/api/v1/runs/retention`)
- `MISSION_CONTROL_BASE_URL` required for remote checks

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
