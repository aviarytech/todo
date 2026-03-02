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

Response:
```json
{
  "runs": [],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "total": 0,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

## Edit run metadata
`PATCH /api/v1/runs/:id`

Body fields (all optional):
- `provider`
- `computerId`
- `costEstimate`
- `tokenUsage`

Requires scope: `runs:write`.

## Delete run
`DELETE /api/v1/runs/:id`

Requires scope: `runs:control`.
