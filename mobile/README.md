# Poo App Mobile

Native iOS + Android app for [Poo App](https://trypoo.app), built with **Capacitor** wrapping the existing React + Vite + Convex web app.

## Quick Start

```bash
# Install Capacitor (from project root)
npm install @capacitor/core @capacitor/cli
npx cap init "Poo App" app.trypoo.poo

# Build web app
npm run build

# Add platforms
npx cap add ios
npx cap add android

# Sync web assets to native projects
npx cap sync

# Open in Xcode / Android Studio
npx cap open ios
npx cap open android
```

## Documentation

- [Project Goals](./PROJECT_GOALS.md)
- [Timeline & Milestones](./TIMELINE.md)
- [Architecture & Approach](./ARCHITECTURE.md)

## Why Capacitor?

The existing web app works great. Capacitor wraps it in a native shell with access to native APIs (push notifications, offline storage, haptics) while reusing ~95%+ of the existing code. No rewrite needed.

## Stakeholders

- **Brian** — Founder/developer
- **Krusty** — AI agent/developer
