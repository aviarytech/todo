# Shared List App — Overview

## Vision

A real-time shared todo/grocery list app with cryptographic provenance. Users can create lists, organize them by category, share with unlimited collaborators, and optionally publish lists for public discovery via did:webvh.

## Users

- **Primary:** Couples, families, roommates, small teams sharing lists
- **Use case:** "Add milk to the list" and collaborators see it instantly with cryptographic proof of who added it

## Goals

1. **Simple** — Create a list and share it in seconds
2. **Real-time** — Changes sync instantly across all collaborators
3. **Provenance** — Every action is cryptographically attributable via Originals credentials
4. **Secure** — Turnkey-managed keys replace insecure localStorage storage
5. **Organized** — Multiple lists with categories for better organization
6. **Discoverable** — Optional did:webvh publication for public lists
7. **Resilient** — Works offline with automatic sync when reconnected

## Evolution from MVP

This builds on the deployed MVP (https://lisa-production-6b0f.up.railway.app) which has:
- [x] Basic identity (localStorage-based DIDs)
- [x] Single lists with max 2 collaborators
- [x] Real-time sync via Convex
- [x] Item management with attribution

New capabilities:
- [x] Turnkey-based authentication (@originals/auth)
- [x] Multiple lists with categories
- [x] Unlimited collaborators per list
- [x] did:webvh publication for public lists
- [x] Offline support with sync

## Success Criteria

- User can authenticate via email OTP (Turnkey)
- User can organize lists into custom categories
- Lists support 2+ collaborators with real-time sync
- User can publish a list to did:webvh for public discovery
- App works offline and syncs changes when reconnected
