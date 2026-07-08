# boop — Codebase View & Three Roadmaps

_Written July 2026, from a full review of the codebase (frontend, Convex backend,
Sites/infra, identity, mobile). One codebase, three plans: **reasonable**,
**ambitious**, **moon mission**._

---

## Part 1 — The View

### What's solid

- **The app layer is real and well-built.** React 19 + strict TS with only ~12
  `any`s in ~24k lines, disciplined code-splitting (lazy routes, lazy modals,
  manual vendor chunks), a clean composition root, and Convex as the single
  source of server state. The Explorer slice (thin page → hook → pure `lib/`
  functions, all unit-tested) is the reference architecture the rest of the app
  should converge on.
- **The schema is good.** 25 tables, every access path indexed, queries use
  `withIndex` consistently, honest field-level docs about legacy state.
- **The hard integrations are done correctly where they exist.** Stripe webhook
  signature verification on the raw body; JWT verification with pinned HS256;
  site signing keys AES-256-GCM-encrypted at rest; SCID-preserving custom-domain
  migration in Sites; Cloudflare for SaaS wired end to end.
- **Sites is a genuinely clever feature.** One HTML file → `*.boop.ad` hostname
  with a portable `did:webvh` identity that survives a custom-domain move. The
  serving model isolates user HTML from the app origin.
- **Mobile is productionized, not scaffolding.** Real iOS/Android projects,
  fastlane + match, TestFlight-on-release CI, PR simulator build checks,
  biometrics/haptics/push/deep links all wired with clean web fallbacks.
- **Monetization plumbing exists.** Stripe subscriptions, plan enforcement,
  referrals, waitlist, PostHog, Sentry.

### What's rotting

- **Authorization is broken at the architectural level.** There are two
  parallel APIs: a hardened JWT-verifying HTTP layer, and the public Convex
  mutations the app actually calls. The public mutations self-authorize on
  client-supplied DIDs — which are *public identifiers*, published at
  `/.well-known/did.jsonl`. Consequences, verified in code:
  - `users.deleteUserData` is a public mutation with **no auth check at all**:
    anyone can cascade-delete any account (`convex/users.ts:16`).
  - Any list/site can be written to or read by anyone who knows the owner's
    public DID (`lists.ts`, `items.ts`, `siteInternals.ts:103`).
  - Publishing a list makes it **world-writable by design**
    (`lib/permissions.ts:25`).
  - `didCreation.createListDID` signs with any user's Turnkey key on request
    (`didCreation.ts:112`).
  - No Convex function anywhere uses `ctx.auth`; the client never calls
    `setAuth()`. The JWT layer is currently decorative.
- **The moat described in the business plan is mostly not built.**
  - **Mission Control does not exist.** No `/api/v1/*` routes, no API-key /
    agent / run / memory tables in the schema. `API.md` documents `GET
    /api/agent/lists` endpoints that have no matching route in
    `convex/http.ts`. What exists is JWT-authed POST mirrors of app mutations.
  - **VCs are unsigned placeholders** — `createListOwnershipVC` is documented
    as a placeholder and its `proof` field is a JSON string of the credential
    itself, with no signature. The UI (`ProvenanceInfo.tsx`, 765 lines) renders
    these as "cryptographic proof."
  - **Bitcoin anchoring is simulated** (`SIMULATE_BITCOIN_ANCHOR === "true"`
    fabricates txids; the real integration is commented out).
  - List "asset DIDs" are throwaway `did:peer` strings whose keys are
    discarded at mint time.
  - The one real piece: **user `did:webvh` identity is genuine** and is the
    join key across the whole schema — but its signing key sits unencrypted in
    `localStorage`, while a complete, stronger server-side Turnkey signing path
    (`convex/didCreation.ts` + `lib/turnkeySigner.ts`) sits fully built with
    **zero callers**.
- **Tests exist but don't gate anything.** ~37k lines of source, 6 test files
  in `src/`, zero Convex backend tests, and the focused `scripts/*.test.mjs`
  suites are not run by any CI workflow. There is no `test` script in
  `package.json`. No lint gate in CI. The build script swallows codegen errors
  (`npx convex codegen 2>/dev/null`).
- **Complexity hot spots.** `pages/ListView.tsx` is 1,363 lines holding ~12
  concerns (three drag systems, multi-select, notifications, streaks, view
  modes, observability). `items.ts` is 997 lines with the recurrence block
  copy-pasted between `checkItem` and `batchCheckItems`. The auth preamble is
  copy-pasted across ~16 HTTP handlers.
- **Operational debt.** Session/rate-limit cleanup crons exist but are never
  scheduled (unbounded table growth); no delete-site path (keys and bucket
  objects accumulate); transient Cloudflare errors permanently stall domain
  verification until a manual retry; no CD for `server.ts` or Convex.
- **Cruft.** Stale committed Android web assets that could never boot; a
  0-byte `credentialSigning.js`; a 632-line legacy `OnboardingFlow` designed
  never to render; `@originals/auth` declared but never imported (its code was
  forked into `convex/lib/` and has drifted); three product names (lisa →
  pooapp → boop) layered in storage keys; a per-render `console.log` of the
  user's DID and email domain in `useCurrentUser.tsx:52`.

### The honest one-paragraph verdict

boop is a **good app wrapped in an unbuilt story**. The collaborative-list
product, Sites, mobile, and billing are real and closer to launch-grade than
most side projects ever get. But the two things the business plan calls the
moat — verifiable provenance and the agent Mission Control API — are
respectively *decorative* and *absent*, and the security model currently
undermines the trust claim entirely: you cannot sell "cryptographic proof of
who did what" while any actor who knows a public DID can impersonate its
owner. The gap between the pitch and the code is the roadmap.

---

## Part 2 — Three Roadmaps

### Roadmap A — Reasonable

_Could start Monday. Current team, current constraints, no heroics. Roughly
4–6 weeks of focused work. Theme: **make what exists true and safe.**_

1. **Stop the bleeding (days, not weeks).**
   - Lock `users.deleteUserData` behind verified caller identity today.
   - Add auth to `didCreation.createListDID` and the Sites create paths.
   - Decide explicitly whether published lists are world-writable; if not,
     split "public read" from "open write" in `canUserEditList`.
2. **Make the JWT layer load-bearing.** Convert identity-bearing `lists.*`,
   `items.*`, `users.*`, `sites.*` mutations to `internalMutation` and route
   the client through the authenticated HTTP actions — or wire Convex native
   auth (`setAuth` + `ctx.auth`) and check identity inside each function.
   Either path deletes the whole IDOR class at once.
3. **Wire the safety net into CI.** Add a `test` script; run `bun test`,
   `scripts/*.test.mjs`, eslint, and an honest `tsc` (no swallowed codegen) in
   a PR workflow. Stand up `convex-test` with an authorization-matrix suite —
   the tests that would have caught all of the above.
4. **Schedule the janitors.** Cron `authSessions.cleanupExpiredSessions` and
   `rateLimits.cleanupExpired`; make Cloudflare polling self-heal transient
   errors instead of stalling; add a delete-site path.
5. **Truth in labeling.** Until VCs are signed, stop rendering "Verified" and
   "cryptographic proof" in `ProvenanceInfo`/`VerificationBadge`; label
   simulated anchors as simulated. This is a UI-copy change that restores
   honesty in an afternoon.
6. **Debt sweep (parallelizable, agent-friendly).** Decompose `ListView.tsx`
   into feature hooks following the Explorer pattern; extract the shared HTTP
   auth preamble (`lib/authUser.ts` already exists — adopt it everywhere);
   dedupe the recurrence block; `git rm --cached` the stale native web assets;
   delete `credentialSigning.js`, the legacy onboarding, and the per-render
   PII log; finish the lisa/pooapp → boop rename.

_Exit criteria: no known auth bypass; CI red on lint/type/test failures;
provenance UI claims match stored reality._

### Roadmap B — Ambitious

_Real bets, visible risk — worth a quarter if they land. Assumes Roadmap A's
security items are done first (they are the foundation, not optional). Theme:
**build the product the business plan already sells.**_

1. **Mission Control, for real.** The schema and API the plan describes:
   scoped API keys with zero-downtime rotation, agent profiles, mission runs
   (heartbeat/transition/retry/artifacts/retention), agent memory store, and a
   run dashboard. Convex is well-suited to this — runs and heartbeats are just
   indexed tables plus crons for timeout detection. Ship `API.md` as a real
   OpenAPI spec generated from the routes.
2. **The MCP server.** The plan correctly identifies this as the
   highest-leverage build: a boop MCP server makes every Claude/agent user a
   potential workspace in one config line. It's also the forcing function for
   API quality — the agent API becomes the product's second front door, used
   daily by the Ralph/Lisa loop itself (the meta-story writes itself when the
   repo's own backlog list is worked through boop's MCP server).
3. **Make provenance real.** Retire the localStorage key; adopt the
   already-built Turnkey custodial signing path (`didCreation.ts` — it's dead
   code today). Sign item/list VCs server-side with real proofs; verify them in
   the Explorer instead of hard-coding "Verified." Turn on real signet
   anchoring behind a flag. This converts the ceremony into the moat.
4. **Offline sync v2.** Replace the name+5-second-window temp-item
   reconciliation heuristic with client-generated correlation IDs echoed by
   the server; extract `useCachedQuery` to kill the duplicated cache-mirroring
   pattern; version the IndexedDB schema and fix `OfflineItem` drift; test
   `SyncManager` and `useOptimisticItems` properly.
5. **Sites grows teeth.** Baseline CSP/security headers on served HTML; serve
   assets from the site's own origin instead of the shared bucket origin;
   quotas + the Free/Pro packaging from the plan (1 site free, custom domains
   paid); per-key salts and a rotation story for site key encryption.
6. **CD + a public status page.** Deploy workflows for Railway and Convex;
   readiness drill in CI; status page hosted — naturally — on a boop Site.

_Exit criteria: an external agent can auth with a scoped key, work a list,
report a run, and every one of those actions carries a **real** signature a
third party can verify. That sentence is the demo, the launch post, and the
pitch._

### Roadmap C — Moon Mission

_Assume nothing is sacred: rewrites, new architecture, new rules allowed.
Theme: **boop stops being an app with provenance features and becomes the
trust protocol for human–agent work — with the app as its reference client.**_

1. **The signed action log as the core data model.** Rebuild the write path as
   an append-only, hash-chained event log where *every* mutation — human or
   agent — is a signed credential. Tables like `items` and `lists` become
   materialized views over the log. Provenance stops being a decoration you
   mint after the fact; it becomes the only way to write. Convex stays as the
   realtime materialization layer; the log itself is portable.
2. **Keys where they belong.** Humans sign with passkeys/secure-enclave keys
   (WebAuthn — the mobile shells already have biometrics wired); agents sign
   with delegated keys carrying scoped, expiring authorization credentials
   ("this agent may check items on this list until Friday"), all chained to
   the owner's `did:webvh`. Delegation-as-credential replaces the roles table.
3. **Workspace portability as a product promise.** Today a Site's DID survives
   a domain move — extend that to the whole workspace. Export any workspace
   (log + DID + credentials) to your own domain and it remains verifiable and
   even hostable elsewhere. Anchor log checkpoints to Bitcoin mainnet, not
   simulated signet. "Your work history is yours" becomes structurally true —
   a claim no incumbent bolt-on can copy.
4. **boop Receipts.** Exportable, third-party-verifiable activity reports
   generated from the signed log — the compliance artifact for the
   provenance-sensitive verticals in the business plan (legal ops, regulated
   fintech, journalism). A standalone verifier (a static page on a boop Site,
   naturally) checks a receipt with no boop account.
5. **Local-first sync engine.** Replace the mutation-queue offline layer with
   a CRDT-based local-first store whose sync protocol *is* the signed event
   log — offline, realtime, and provenance collapse into one mechanism instead
   of three subsystems (Convex reactivity + IndexedDB cache + optimistic
   heuristics).
6. **Open the protocol.** Specify the log/credential/delegation formats
   publicly and extract them into a documented package. The app, Mission
   Control, MCP server, and Receipts verifier all become clients of it.
   Winning the spec is the durable answer to "Linear/Notion will add agent
   APIs" — they can copy features, not a protocol with an ecosystem.

_The bet: within two years "which agent did this, on whose authority, and can
I prove it?" is a procurement question in every agent deployment. The moon
mission makes boop the default answer by making the proof the substrate
instead of the feature._

---

## Sequencing note

The three roadmaps nest: A is the first month of B, and B's real-signing +
Mission Control work is the prerequisite for everything in C. The single
non-negotiable across all three altitudes is the authorization fix — no
version of this product survives its trust story being falsifiable by anyone
who can read a public DID.
