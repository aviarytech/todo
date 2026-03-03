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
- `GET /api/v1/runs/retention` (settings + deletion logs)
- `PUT /api/v1/runs/retention` (update policy)
- `POST /api/v1/runs/retention` (apply retention dry-run/live)

Behavior:
- Default policy is `30` days unless overridden per owner.
- A daily scheduler job (`mission-control-artifact-retention`) performs non-dry-run cleanup across owners.
- Every deletion operation writes an auditable row to `missionArtifactDeletionLogs`, including:
  - `trigger` (`operator` or `system`)
  - `actorDid`
  - `retentionCutoffAt`
  - `deletedArtifacts[]`
  - `schedulerJobId` (when triggered by cron)

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
