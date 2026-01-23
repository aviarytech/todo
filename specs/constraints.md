# Constraints

## Performance

- **Initial load:** < 3 seconds on 3G connection
- **Item sync:** < 1 second real-time update
- **Offline-to-online sync:** < 5 seconds for typical queue (10 items)

## Scalability

- **Items per list:** Max 1000 items
- **Lists per user:** Max 100 lists
- **Collaborators per list:** Unlimited (practical limit ~50 for UI)
- **Categories per user:** Max 20

## Security

- Private keys never exposed to frontend (Turnkey manages)
- Session tokens in httpOnly cookies only
- CSRF protection via SameSite cookies
- All API calls validate user authorization
- Rate limiting on auth endpoints (10 attempts/minute)

## Browser Support

- Chrome 90+
- Firefox 90+
- Safari 14+
- Edge 90+
- Mobile Safari iOS 14+
- Chrome Android 90+

## Offline

- Cache size: Max 50MB per device
- Mutation queue: Max 100 pending operations
- Stale data warning after 24 hours offline

## Accessibility

- WCAG 2.1 AA compliance
- Keyboard navigation for all actions
- Screen reader support
- Minimum touch target: 44x44px

## Tech Stack Constraints

- React 19 (already in use)
- Convex for backend (already in use)
- @originals/sdk 1.5+ for DIDs and credentials
- @originals/auth 1.5+ for Turnkey integration
- Service Worker for offline (no external libraries)
- idb for IndexedDB wrapper

## Deployment

- Railway for hosting
- Convex Cloud for backend
- Environment variables for secrets
- No self-hosted components (except app server)
