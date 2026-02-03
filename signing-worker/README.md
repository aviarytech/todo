# PooApp Signing Worker

External Cloudflare Worker that handles Turnkey signing operations for PooApp.

## Why?

Convex has a ~43 MiB bundle size limit. The `@originals/auth` and `@turnkey/*` packages add ~20+ MiB of crypto dependencies. By moving signing to an external worker:

- Convex bundle stays small ✓
- Heavy crypto runs on Cloudflare Workers (no limits) ✓
- Same functionality, just via HTTP ✓

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/create-did` | POST | Create a did:webvh DID for a user |
| `/sign-item-action` | POST | Sign an item action credential |
| `/sign-data` | POST | Sign arbitrary data |

All POST endpoints require `Authorization: Bearer <SIGNING_SECRET>` header.

## Setup

1. Install dependencies:
   ```bash
   cd signing-worker
   npm install
   ```

2. Set secrets:
   ```bash
   wrangler secret put TURNKEY_API_PUBLIC_KEY
   wrangler secret put TURNKEY_API_PRIVATE_KEY
   wrangler secret put TURNKEY_ORGANIZATION_ID
   wrangler secret put SIGNING_SECRET
   ```

3. Deploy:
   ```bash
   npm run deploy
   ```

## Environment Variables (Convex)

Add these to your Convex deployment:

```bash
npx convex env set SIGNING_SECRET <same-secret-as-worker>
npx convex env set SIGNING_WORKER_URL https://pooapp-signing.aviarytech.workers.dev
```

## Local Development

```bash
npm run dev
```

Worker runs at `http://localhost:8787`.

For local Convex development, set `SIGNING_WORKER_URL=http://localhost:8787`.
