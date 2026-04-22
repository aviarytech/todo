# boop Agent API

REST API for programmatic access to boop lists and items. Designed for agents, scripts, and integrations to interact without using a browser.

## Base URL

```
https://<convex-deployment>.convex.site
```

## Authentication

All endpoints require JWT authentication via the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

To obtain a JWT token, use the standard auth flow:
1. `POST /auth/initiate` with `{ "email": "your@email.com" }`
2. `POST /auth/verify` with `{ "sessionId": "...", "code": "..." }` (OTP from email)
3. Use the returned `token` in subsequent requests

## Endpoints

### Lists

#### Get All Lists
```
GET /api/agent/lists
```

Returns all lists the authenticated user has access to.

**Response:**
```json
{
  "lists": [
    {
      "_id": "abc123...",
      "name": "Shopping List",
      "ownerDid": "did:webvh:...",
      "createdAt": 1704067200000,
      "role": "owner"
    }
  ]
}
```

#### Get List with Items
```
GET /api/agent/lists/:listId
GET /api/agent/lists/:listId/items
```

Returns a list and all its items.

**Response:**
```json
{
  "list": {
    "_id": "abc123...",
    "name": "Shopping List",
    "ownerDid": "did:webvh:...",
    "createdAt": 1704067200000,
    "assetDid": "did:peer:..."
  },
  "items": [
    {
      "_id": "item123...",
      "name": "Milk",
      "checked": false,
      "createdByDid": "did:webvh:...",
      "createdAt": 1704067200000,
      "order": 0,
      "description": "2% organic",
      "priority": "high"
    }
  ],
  "role": "owner"
}
```

#### Add Item to List
```
POST /api/agent/lists/:listId/items
Content-Type: application/json

{
  "name": "Buy groceries",
  "description": "From Whole Foods",
  "priority": "high",
  "dueDate": 1704153600000,
  "url": "https://example.com"
}
```

**Response (201 Created):**
```json
{
  "itemId": "item456...",
  "item": {
    "_id": "item456...",
    "name": "Buy groceries",
    "checked": false,
    "createdByDid": "did:webvh:...",
    "description": "From Whole Foods",
    "priority": "high",
    "dueDate": 1704153600000,
    "url": "https://example.com"
  }
}
```

### Items

#### Update Item
```
PATCH /api/agent/items/:itemId
Content-Type: application/json

{
  "checked": true,
  "name": "Updated name",
  "description": "Updated description",
  "priority": "medium",
  "dueDate": 1704240000000,
  "url": "https://new-url.com"
}
```

All fields are optional. To clear a field, set it to `null`:
```json
{
  "priority": null,
  "dueDate": null
}
```

**Response:**
```json
{
  "success": true,
  "item": {
    "_id": "item123...",
    "name": "Updated name",
    "checked": true,
    ...
  }
}
```

#### Delete Item
```
DELETE /api/agent/items/:itemId
```

**Response:**
```json
{
  "success": true
}
```

## Field Reference

### Item Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Item title (required for creation) |
| `description` | string | Optional notes/details |
| `checked` | boolean | Whether the item is complete |
| `priority` | "high" \| "medium" \| "low" | Priority level |
| `dueDate` | number | Unix timestamp in milliseconds |
| `url` | string | Link to PR, URL, or reference |
| `order` | number | Position in list (lower = higher) |
| `createdByDid` | string | DID of user who created the item |
| `checkedByDid` | string | DID of user who checked the item |
| `createdAt` | number | Creation timestamp |
| `checkedAt` | number | When item was checked |

### Roles

| Role | Permissions |
|------|-------------|
| `owner` | Full access (read, write, delete, share) |
| `editor` | Read and write access |
| `viewer` | Read-only access |

## Mission Control REST v1 (P1)

New endpoints for Agent Mission Control with scoped API keys.

### Auth Modes
- JWT bearer token (`Authorization: Bearer ...`)
- API key (`X-API-Key: pa_xxx...`) for `/api/v1/*` endpoints

### API Keys
- `GET /api/v1/auth/keys` — list keys + recent rotation events (JWT only)
- `POST /api/v1/auth/keys` — create key (JWT only)
  - body: `{ "label": "CI Agent", "scopes": ["tasks:read","memory:write"] }`
- `POST /api/v1/auth/keys/:keyId/rotate` — zero-downtime rotation (JWT only)
  - creates a new key, keeps old key active for grace period
  - body: `{ "gracePeriodHours": 24, "label": "CI Agent v2" }`
- `POST /api/v1/auth/keys/:keyId/finalize-rotation` — revoke old key after cutover (JWT only)
- `DELETE /api/v1/auth/keys/:keyId` — revoke key immediately (JWT only)

### Agent Registration / Profiles
- `GET /api/v1/agents` — list agent profiles (`agents:read`)
- `POST /api/v1/agents` — create/update profile (`agents:write`)

### Tasks
- `GET /api/v1/tasks?listId=<listId>&limit=100` (`tasks:read`)
- `GET /api/v1/tasks/:taskId` (`tasks:read`)

### Activity
- `GET /api/v1/activity?listId=<listId>&limit=100` (`activity:read`)

### Memory
- `GET /api/v1/memory?agentSlug=<slug>[&key=<key>]` (`memory:read`)
- `POST /api/v1/memory` (`memory:write`)
- `GET /api/v1/memory/sync?since=<ms>&limit=<n>` (`memory:read`) — pull Convex memory changes for OpenClaw
- `POST /api/v1/memory/sync` (`memory:write`) — push OpenClaw memory entries into Convex with conflict policy (`lww` or `preserve_both`)
  - body: `{ "agentSlug": "platform", "key": "runbook", "value": "...", "listId": "...optional..." }`

### Mission Runs (P0-6 hardening)
- `GET /api/v1/runs?[listId=<id>&itemId=<id>&status=<status>&limit=100]` (`runs:read`)
- `POST /api/v1/runs` (`runs:write`)
  - body: `{ "listId": "...", "itemId": "...optional...", "agentSlug": "planner", "provider": "openclaw", "computerId": "orgo-1", "parentRunId": "...optional..." }`
- `POST /api/v1/runs/:runId/heartbeat` (`runs:write`)
- `POST /api/v1/runs/:runId/transition` (`runs:control`)
  - body: `{ "nextStatus": "running|degraded|blocked|failed|finished", "terminalReason": "completed|killed|timeout|error|escalated" }`
- `POST /api/v1/runs/:runId/retry` (`runs:control`)
- `POST /api/v1/runs/:runId/artifacts` (`runs:write`)
  - body: `{ "type": "screenshot|log|diff|file|url", "ref": "...", "label": "...optional..." }`
- `POST /api/v1/runs/monitor` (`runs:control`) — applies heartbeat timeout state updates for all owner runs
- `GET /api/v1/runs/retention` (JWT only) — retention config + recent deletion logs
- `PUT /api/v1/runs/retention` (JWT only) — set artifact retention days (default 30)
- `POST /api/v1/runs/retention` (JWT only) — run retention job (`dryRun` defaults to `true`)

### Run Dashboard
- `GET /api/v1/dashboard/runs?[windowMs=86400000]` (`dashboard:read`)
  - returns success/intervention/timeout rates plus active/degraded run visibility

### Scopes
- `tasks:read`, `tasks:write`
- `activity:read`
- `memory:read`, `memory:write`
- `agents:read`, `agents:write`
- `runs:read`, `runs:write`, `runs:control`
- `dashboard:read`

## Error Responses

All errors return JSON with an `error` field:

```json
{
  "error": "Error message here"
}
```

| Status | Description |
|--------|-------------|
| 400 | Bad request (missing/invalid parameters) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (no access to resource) |
| 404 | Not found |
| 405 | Method not allowed |
| 500 | Server error |

## Examples

### cURL

```bash
# Get all lists
curl -H "Authorization: Bearer $TOKEN" \
  https://your-deployment.convex.site/api/agent/lists

# Get a specific list with items
curl -H "Authorization: Bearer $TOKEN" \
  https://your-deployment.convex.site/api/agent/lists/abc123xyz

# Add an item
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "New task", "priority": "high"}' \
  https://your-deployment.convex.site/api/agent/lists/abc123xyz/items

# Check off an item
curl -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"checked": true}' \
  https://your-deployment.convex.site/api/agent/items/item123xyz

# Delete an item
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  https://your-deployment.convex.site/api/agent/items/item123xyz
```

### JavaScript/TypeScript

```typescript
const BASE_URL = "https://your-deployment.convex.site";
const TOKEN = "your-jwt-token";

// Get all lists
const lists = await fetch(`${BASE_URL}/api/agent/lists`, {
  headers: { Authorization: `Bearer ${TOKEN}` }
}).then(r => r.json());

// Add an item
const newItem = await fetch(`${BASE_URL}/api/agent/lists/${listId}/items`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ name: "New task", priority: "high" })
}).then(r => r.json());

// Check off an item
await fetch(`${BASE_URL}/api/agent/items/${itemId}`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ checked: true })
});
```
