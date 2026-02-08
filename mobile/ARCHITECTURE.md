# Poo App Mobile — Architecture & Approach

## Recommendation: Capacitor ✅

### Why Capacitor?

| Approach | Code Reuse | Effort | Native Access | Risk |
|----------|-----------|--------|---------------|------|
| **Capacitor** | ~95%+ | Low | Good (plugins) | Low |
| React Native | ~40-60% | High | Excellent | Medium |
| Expo | ~40-60% | Medium | Good | Medium |

**Capacitor wins** because:
1. **Wraps the existing web app as-is** — no rewrite, no new UI framework
2. The existing app is already React + Vite + Tailwind — Capacitor just adds a native shell
3. Convex real-time sync works identically in the WebView
4. Native features (push, camera, haptics) available via Capacitor plugins
5. Same build pipeline — `vite build` → Capacitor copies `dist/` into native projects

### How It Works

```
┌─────────────────────────────┐
│      Native Shell           │
│  (iOS: Swift, Android: Java)│
│                             │
│  ┌───────────────────────┐  │
│  │   WKWebView / WebView │  │
│  │                       │  │
│  │  Existing React App   │  │
│  │  (Vite + Convex)      │  │
│  │                       │  │
│  └───────────────────────┘  │
│                             │
│  Capacitor Bridge ←→ Plugins│
│  (push, storage, haptics)   │
└─────────────────────────────┘
```

### What Changes in the Existing Codebase
- Add `@capacitor/core` + `@capacitor/cli` as dependencies
- Add `capacitor.config.ts` at project root
- Add `ios/` and `android/` directories (gitignored native projects)
- Minor conditional code for native-only features (push token registration, etc.)
- That's it. The React app stays the same.

### Key Capacitor Plugins Needed
- `@capacitor/push-notifications` — Push notifications
- `@capacitor/preferences` — Key-value storage
- `@capacitor/haptics` — Tactile feedback
- `@capacitor/splash-screen` — Launch screen
- `@capacitor/status-bar` — Status bar styling
- `@capacitor/app` — App state, deep links

### Alternatives Considered

**React Native:** Would require rewriting all UI components. Business logic (Convex queries/mutations) could be shared, but that's maybe 30% of the code. Not worth it for an app that already works great as a web app.

**Expo:** Same fundamental issue as React Native — requires a UI rewrite. Expo's managed workflow is nice but doesn't help when the goal is maximum reuse of an existing web app.

## Project Structure

```
aviarytech/todo/
├── src/              # Existing React app (unchanged)
├── convex/           # Existing Convex backend (unchanged)
├── dist/             # Vite build output
├── ios/              # Capacitor iOS project (generated)
├── android/          # Capacitor Android project (generated)
├── capacitor.config.ts  # Capacitor config
├── mobile/           # Mobile-specific docs
│   ├── PROJECT_GOALS.md
│   ├── TIMELINE.md
│   ├── ARCHITECTURE.md
│   └── README.md
└── ...
```
