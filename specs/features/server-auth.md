# Server-Side Authentication

## Overview

Migrate authentication from client-side Turnkey direct calls to server-side authentication using `@originals/auth/server`. This provides:

1. **Better security** — Turnkey API credentials stay server-side, not exposed to browser
2. **JWT-based auth** — Convex mutations can validate requests cryptographically
3. **Centralized auth logic** — OTP flow handled by server, not browser

## Current Architecture (Client-Side)

```
Browser → Turnkey Proxy → Turnkey API
   ↓
Convex (trusts client-provided data)
```

- Client calls `initOtp`/`completeOtp` directly via `@originals/auth/client`
- Client tells Convex "I am this user" via `upsertUser` mutation
- No cryptographic verification that client actually authenticated

## New Architecture (Server-Side)

```
Browser → Convex HTTP → Turnkey API (server-side)
   ↓          ↓
   ←── JWT ←──┘
   ↓
Convex mutations (validate JWT)
```

- Convex HTTP endpoints handle OTP flow via `@originals/auth/server`
- Server issues JWT after successful verification
- Client includes JWT in requests
- Mutations verify JWT before executing

## Scope

This is a **small change** focused on auth validation:
- Add Convex HTTP endpoints for auth flow
- Add JWT validation to mutations
- Update client to use new endpoints
- Keep existing client-side wallet/signer for DID signing operations

## Environment Variables

Required on Convex:
- `TURNKEY_API_PUBLIC_KEY` — Server API key
- `TURNKEY_API_PRIVATE_KEY` — Server API secret
- `TURNKEY_ORGANIZATION_ID` — Parent org ID
- `JWT_SECRET` — Secret for signing/verifying JWTs

## API Endpoints

### POST /auth/initiate
Request:
```json
{ "email": "user@example.com" }
```

Response:
```json
{ "sessionId": "session_xxx", "message": "..." }
```

### POST /auth/verify
Request:
```json
{ "sessionId": "session_xxx", "code": "123456" }
```

Response:
```json
{
  "token": "eyJ...",
  "user": {
    "turnkeySubOrgId": "...",
    "email": "...",
    "did": "...",
    "displayName": "..."
  }
}
```

Sets `auth_token` HTTP-only cookie.

### POST /auth/logout
Clears auth cookie.

## Client Changes

1. **Login flow** — Call `/auth/initiate` and `/auth/verify` instead of Turnkey directly
2. **Token storage** — Store JWT in memory (cookie handles persistence)
3. **Request auth** — Include `Authorization: Bearer <token>` header or rely on cookie
4. **Wallet access** — Keep `TurnkeyDIDSigner` for client-side signing (uses session token from JWT)

## Session Storage

Since Convex is serverless, in-memory session storage won't work. Options:
1. **Convex table** — Store auth sessions in database with TTL cleanup
2. **Stateless** — Encode session data in signed token returned to client

Recommendation: Use Convex `authSessions` table with scheduled cleanup.

## Migration Path

1. Add new HTTP endpoints alongside existing client-side flow
2. Update client to use new endpoints
3. Add JWT validation to mutations (check header/cookie)
4. Remove client-side Turnkey OTP calls
5. Keep client-side wallet/signer for signing operations

## Security Considerations

- JWT expiry: 7 days (matches current session persistence)
- HTTP-only cookie prevents XSS token theft
- Session tokens stored in JWT allow server-side Turnkey operations if needed
- Rate limiting on auth endpoints (existing backlog item)
