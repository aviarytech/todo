# Constraints & Requirements

## Performance

- **Initial load:** < 3 seconds on 3G connection
- **Item sync:** < 1 second for changes to appear for partner
- **Optimistic updates:** UI responds immediately, syncs in background

## Browser Support

- Modern evergreen browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (responsive design required)
- No IE11 support

## Scalability (v1)

- Max 2 collaborators per list
- Max 500 items per list
- Max 50 lists per user
- These limits are soft and can be raised in future versions

## Security

- All credentials signed with user's DID private key
- Invite tokens: single-use, 24-hour expiry
- No sensitive data in URLs (except invite tokens, which are single-use)
- HTTPS required in production

## Testing

- Unit tests for utility functions
- Integration tests for Convex functions
- E2E tests for critical flows:
  - Create list
  - Add/check/remove item
  - Invite and join flow

## Deployment

- **Platform:** Railway
- **Build:** Vite production build
- **Environment variables:**
  - `CONVEX_DEPLOYMENT` — Convex project URL
  - `VITE_CONVEX_URL` — Convex public URL for client

## Dependencies

### Core
- `react` / `react-dom` — UI framework
- `convex` — Backend and real-time sync
- `@originals/sdk` — Asset protocol and identity

### Likely Additions
- `react-router-dom` — Client-side routing
- `zustand` or `jotai` — Local state (if needed beyond Convex)
- `tailwindcss` — Styling (or similar utility-first CSS)

## Development Workflow

- Bun as package manager (matches Originals SDK)
- Vite for dev server and builds
- TypeScript throughout
- ESLint + Prettier for code quality
