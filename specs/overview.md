# Poo App - Specs Overview

A collaborative list-sharing app with decentralized identity (DID) support.

## Current State (Working)
- OTP authentication via Turnkey
- JWT-based API auth with rate limiting
- List CRUD with categories
- Collaborator system (owner/editor/viewer roles)
- Invite links for sharing
- Offline caching
- did:peer identity (client-generated)

## Tech Stack
- **Frontend**: React + Vite + TypeScript
- **Backend**: Convex (realtime DB + HTTP actions)
- **Auth**: Turnkey OTP + JWT
- **Identity**: DIDs (currently did:peer, moving to did:webvh)
