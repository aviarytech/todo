# Poo App 💩

A collaborative list-sharing app with decentralized identifiers (DID) and verifiable credentials (VCs) built using Originals.

## Features Backlog

**The source of truth for features is the app itself:**  
👉 **[https://trypoo.app/list/js77strp35s0br8deqf30bvrxh80pm4t](https://trypoo.app/user-20ed9d43-2d31-44/resources/list-k172r0frhyxtm5dj6cqx1mh48h81k6wp)**

Check that list for what needs to be built. Mark items done when you ship them.

## Tech Stack

- **Frontend**: React 19 + Vite + TypeScript + TailwindCSS v4
- **Backend**: Convex (realtime DB + HTTP actions)
- **Auth**: Turnkey OTP + JWT (via @originals/auth)
- **Identity**: DIDs (did:webvh + did:key)
- **Credentials**: Verifiable Credentials (via @originals/sdk)
- **Deploy**: Railway (frontend) + Convex Cloud (backend)

## Development

```bash
# Install dependencies
bun install

# Run locally (requires .env.local with Convex/Turnkey config)
bun dev

# Deploy frontend to Railway
railway up

# Deploy Convex functions
npx convex deploy
```

## Domains

- **Production**: https://trypoo.app
- **Railway**: https://pooapp-frontend-production.up.railway.app
- **Convex HTTP**: https://pooapp-http.aviarytech.com

