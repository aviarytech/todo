# PRD: Poo App — Agent Mission Control

**Version:** 1.1 (Orgo-first runtime revision)  
**Date:** 2026-02-22  
**Author:** Krusty 🦞🤡 + Brian  
**Status:** Draft (Revised)

---

## 1. Vision

Poo App is a beautifully simple todo list that *happens to be* the best way to manage AI agents.

For a regular person, it's a fast, clean task manager with lists, due dates, streaks, and offline sync. For someone running AI agents (via OpenClaw, ClawBootBot, or any future platform), it's a Mission Control — a real-time dashboard where humans and agents collaborate on work, share context, and stay in sync. In V1, agents execute tasks on Orgo computers by default, with activity and artifacts surfaced directly in Poo App.

**The key principle: every "agent" feature must also make sense as a "human collaboration" feature.** Assigning a task to an agent is the same UX as assigning it to a teammate. An agent's activity feed is the same pattern as a shared list's activity log. The agent layer is invisible until you turn it on.

---

## 2. Problem Statement

Today's AI agent setups have a visibility problem:
- Agents log work to markdown files buried on a machine
- Cron jobs and scheduled tasks are invisible (config files, CLI only)
- Sub-agents spin up and die with no trace in the UI
- The human has no real-time view of what their agent is doing
- There's no bidirectional task assignment — you can't just drop a task for your agent to pick up
- Compute context is fragmented — no standard runtime session record (computer/workspace/artifacts) shared back to the task layer

Meanwhile, Poo App already has:
- Task management with lists, subtasks, due dates, priorities
- Real-time sync via Convex
- DID-based identity (Originals)
- Mobile app (iOS via Capacitor)
- Offline mode with full sync
- Streaks and gamification

The gap is small. Poo App needs **agent awareness** — the ability to recognize that some collaborators are AI agents, and to surface their work in a way that's useful.

---

## 3. Users & Personas

### Persona 1: Regular Human ("Sam")
- Wants a simple, fast todo app
- Doesn't know or care about AI agents
- Uses lists for groceries, work tasks, personal goals
- Expects: clean UI, fast add, satisfying check-off, maybe streaks

### Persona 2: Agent Operator ("Brian")
- Runs one or more AI agents via OpenClaw/ClawBootBot
- Wants to see what agents are doing in real-time
- Wants to assign tasks to agents and have them pick them up
- Wants a memory browser, activity feed, and schedule view
- Expects: Mission Control dashboard, API access, multi-agent support

### Persona 3: AI Agent ("Krusty")
- Needs to read/write tasks, log activity, store memories
- Needs an API (not a UI) — agents don't click buttons
- Needs to report status, claim tasks, mark complete
- Expects: REST/Convex API, webhooks, structured data

**Design rule:** Build for Sam first. Everything Brian and Krusty need should be additive — feature flags, optional views, API endpoints that don't affect the core UX.

---

## 4. Architecture Principles

### 4.1 Progressive Disclosure
The app has three "layers" of complexity:

| Layer | Who sees it | What it adds |
|-------|-------------|--------------|
| **Core** | Everyone | Lists, items, due dates, tags, streaks |
| **Collaboration** | Users who share lists | Assignees, comments, activity log, real-time cursors |
| **Agent** | Users who connect an agent | Agent identity, activity feed, memory browser, schedule view, API keys |

Each layer builds on the previous. Agent features are a *superset* of collaboration features.

### 4.2 Agents Are Just Collaborators
In the data model, an agent is a user with a DID — same as a human. The `users` table already has `did`, `displayName`, `email`. An agent gets the same fields, plus:
- `isAgent: true` flag
- `agentPlatform: "openclaw" | "clawboot" | ...` (optional metadata)
- `connectedBy: userId` (which human linked this agent)

This means:
- Assigning a task to an agent = assigning to a collaborator
- An agent completing a task = a collaborator checking it off
- Agent activity = collaboration activity
- No separate "agent" data model

### 4.3 API-First for Agent Features
Agents interact via API, not UI. Every agent feature needs:
- A Convex mutation/query (for direct Convex clients)
- An HTTP API endpoint (for agents that use REST)
- Auth via API key or DID-signed token

### 4.4 The Convex Advantage
Convex gives us real-time subscriptions for free. When an agent updates a task, the human sees it *instantly* in the UI. No polling, no websocket plumbing. This is the core magic of Mission Control — you watch your agent work in real-time.

### 4.5 Compute Substrate Abstraction (Orgo-first)
Mission Control should not assume where agents run. For V1, we standardize on **Orgo computers** as the default execution substrate, with OpenClaw/ClawBoot as orchestration.

Principles:
- `AgentControl API` in Poo App is substrate-agnostic (`claimTask`, `heartbeat`, `logActivity`, `attachArtifact`, `completeTask`).
- Runtime metadata is first-class: computer ID, workspace ID, provider (`orgo`), session status, and last screenshot artifact.
- Every critical agent action should emit artifacts (screenshot/logs) for auditability in the activity feed.
- Keep portability: if we swap Orgo later, Poo App data model and API remain stable.

---

## 5. Features — Phased Rollout

### Phase 1: Collaborative Tasks (Foundation)
*Makes the app better for everyone, enables agent features later.*

**1.1 Assignees**
- Any item can have an `assigneeDid` field
- UI: avatar/initials next to the item, filter by assignee
- For Sam: assign tasks to family members on shared lists
- For Brian: assign tasks to Krusty

**1.2 Activity Log**
- Per-list log of actions: created, completed, commented, assigned, edited
- New table: `activity` with `listId`, `actorDid`, `action`, `itemId`, `timestamp`, `details`
- UI: slide-up panel on a list showing recent activity
- For Sam: see what your partner checked off the grocery list
- For Brian: see exactly what Krusty did and when

**1.3 Real-Time Presence**
- Show who's currently viewing a list (avatar dots)
- Convex presence via heartbeat mutations
- For Sam: know your roommate is also editing the list
- For Brian: see that Krusty is actively working on tasks

**Schema additions:**
```typescript
// In items table
assigneeDid: v.optional(v.string()),
assignedAt: v.optional(v.number()),

// New table
activity: defineTable({
  listId: v.id("lists"),
  actorDid: v.string(),
  action: v.string(), // "created" | "completed" | "assigned" | "commented" | "edited"
  itemId: v.optional(v.id("items")),
  details: v.optional(v.string()), // JSON blob for action-specific data
  timestamp: v.number(),
}).index("by_list", ["listId"])
  .index("by_list_time", ["listId", "timestamp"])
  .index("by_actor", ["actorDid"]),

// New table
presence: defineTable({
  listId: v.id("lists"),
  userDid: v.string(),
  lastSeen: v.number(),
}).index("by_list", ["listId"])
  .index("by_user", ["userDid"]),
```

---

### Phase 2: Agent Identity, API & Runtime Sessions
*Connect agents to the app and track execution sessions. This is where it becomes Mission Control.*

**2.1 Agent Registration**
- Settings → "Connect an Agent"
- Generate an API key (scoped to the user's lists)
- Agent authenticates via API key in HTTP header
- Agent gets a `users` record with `isAgent: true`

**2.2 HTTP API**
REST endpoints backed by Convex HTTP actions:

```
POST   /api/v1/tasks              — Create a task
PATCH  /api/v1/tasks/:id          — Update a task (status, description, etc.)
GET    /api/v1/tasks?list=X       — List tasks (filterable)
POST   /api/v1/tasks/:id/claim    — Agent claims an unassigned task
POST   /api/v1/tasks/:id/complete — Agent marks task complete
POST   /api/v1/activity           — Log an activity entry
GET    /api/v1/activity?list=X    — Get activity feed
POST   /api/v1/memory             — Store a memory entry
GET    /api/v1/memory?q=search    — Search memories
```

Auth: `Authorization: Bearer <api-key>`

**2.3 Agent Profile**
- Agent appears as a collaborator with a distinct avatar (robot icon or custom)
- Shows agent platform, connection status, last active time
- Agent DID is a real Originals DID — cryptographic identity

**2.4 Mission Runs (Orgo runtime session tracking)**
- Every claimed task can have one or more `missionRuns`.
- A run tracks provider + runtime context + evidence artifacts.
- UI: task detail shows run timeline (started, heartbeats, artifacts, completed/failed).

**Schema additions:**
```typescript
// In users table
isAgent: v.optional(v.boolean()),
agentPlatform: v.optional(v.string()),
connectedByUserId: v.optional(v.id("users")),

// New table
apiKeys: defineTable({
  userId: v.id("users"),
  keyHash: v.string(), // SHA-256 of the API key (never store raw)
  name: v.string(), // "Krusty's key", "ClawBot #3"
  scopes: v.array(v.string()), // ["tasks:read", "tasks:write", "memory:write"]
  lastUsedAt: v.optional(v.number()),
  createdAt: v.number(),
  revokedAt: v.optional(v.number()),
}).index("by_key_hash", ["keyHash"])
  .index("by_user", ["userId"]),

// New table
missionRuns: defineTable({
  ownerDid: v.string(),
  taskId: v.id("items"),
  agentDid: v.string(),
  provider: v.string(), // "orgo"
  workspaceId: v.optional(v.string()),
  computerId: v.optional(v.string()),
  state: v.string(), // starting | running | blocked | failed | finished
  startedAt: v.number(),
  endedAt: v.optional(v.number()),
  error: v.optional(v.string()),
  artifactRefs: v.optional(v.array(v.string())),
}).index("by_task", ["taskId"])
  .index("by_agent_time", ["agentDid", "startedAt"])
  .index("by_owner_time", ["ownerDid", "startedAt"]),
```

---

### Phase 3: Memory & Knowledge
*Give agents persistent, searchable memory inside the app.*

**3.1 Memory Store**
- Key-value + full-text searchable memory entries
- Replaces (or syncs with) markdown `MEMORY.md` files
- Each entry: title, content (markdown), tags, source, timestamp

**3.2 Memory Browser UI**
- New tab/view in the app: "Memory" (only visible if agent features enabled)
- Card-based layout showing recent memories
- Full-text search across all memories
- Filter by tag, date range, source (which agent wrote it)

**3.3 Memory Sync**
- OpenClaw skill that syncs `MEMORY.md` ↔ Convex memory store
- Bidirectional: human can edit memories in UI, agent sees changes
- Conflict resolution: last-write-wins with merge UI for conflicts

**Schema:**
```typescript
memories: defineTable({
  ownerDid: v.string(), // User who owns this memory space
  authorDid: v.string(), // Who wrote it (human or agent)
  title: v.string(),
  content: v.string(), // Markdown
  tags: v.optional(v.array(v.string())),
  source: v.optional(v.string()), // "manual" | "openclaw" | "clawboot" | "import"
  sourceRef: v.optional(v.string()), // e.g. "memory/2026-02-19.md#L15"
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_owner", ["ownerDid"])
  .index("by_owner_time", ["ownerDid", "updatedAt"])
  .searchIndex("search_content", {
    searchField: "content",
    filterFields: ["ownerDid", "tags"],
  }),
```

---

### Phase 4: Schedule & Calendar
*Visualize what agents (and humans) have planned.*

**4.1 Schedule View**
- Calendar UI showing:
  - Tasks with due dates (already exists partially)
  - Recurring tasks (already exists)
  - Agent cron jobs (new — synced from OpenClaw)
  - One-time scheduled events

**4.2 Cron Sync**
- OpenClaw pushes cron job metadata to Convex via API
- Shows job name, schedule, last run, next run, status
- Human can enable/disable crons from the UI (writes back to OpenClaw)

**4.3 Schedule Entries**
```typescript
scheduleEntries: defineTable({
  ownerDid: v.string(),
  agentDid: v.optional(v.string()), // Which agent owns this schedule
  title: v.string(),
  description: v.optional(v.string()),
  scheduleType: v.union(v.literal("cron"), v.literal("once"), v.literal("recurring")),
  cronExpr: v.optional(v.string()), // "0 9 * * 1" 
  scheduledAt: v.optional(v.number()), // For one-time
  lastRunAt: v.optional(v.number()),
  nextRunAt: v.optional(v.number()),
  lastStatus: v.optional(v.string()), // "ok" | "error" | "skipped"
  enabled: v.boolean(),
  externalId: v.optional(v.string()), // OpenClaw cron job ID for sync
  createdAt: v.number(),
}).index("by_owner", ["ownerDid"])
  .index("by_next_run", ["ownerDid", "nextRunAt"]),
```

---

### Phase 5: Team & Multi-Agent
*For users running multiple agents (power users, ClawBootBot).*

**5.1 Team View**
- Dashboard showing all connected agents
- Each agent card: name, avatar, status, current task, last active
- Role/specialty tags ("developer", "researcher", "writer")

**5.2 Agent Status**
- Agents periodically push status via API: idle, working, error
- Current task shown on agent card
- Activity sparkline (how active over last 24h)

**5.3 Sub-Agent Awareness**
- When an agent spawns sub-agents, they register in the team view
- Tree structure: main agent → sub-agents
- Sub-agents auto-archive when their task completes

---

### Phase 6: Dashboard / Home
*The actual "Mission Control" view.*

**6.1 Dashboard View**
- Replaces or augments the home screen (toggle-able)
- Widgets:
  - **Active Tasks** — what's being worked on right now
  - **Recent Activity** — live feed across all lists
  - **Agent Status** — who's online, what they're doing
  - **Upcoming** — next 24h of due dates and scheduled jobs
  - **Memory Highlights** — recent memories or search
- Customizable layout (drag to reorder widgets)

**6.2 Quick Actions**
- "Assign to agent" button on any task
- "Ask agent" — send a message/instruction to an agent from the UI
- "Pause agent" — temporarily stop an agent's scheduled work

---

## 6. What We're NOT Building (Yet)

- **Chat with agent in-app** — Use Telegram/Signal for now; in-app chat is a future phase
- **Agent marketplace** — No third-party agent installation; connect your own
- **In-app compute scheduler** — Poo App will not run VMs itself; Orgo handles computer lifecycle
- **Office/avatar view** — Fun but low priority; focus on utility first
- **Billing/paid tiers** — Free for now; monetization strategy TBD

---

## 7. OpenClaw + Orgo Integration (Technical)

### 7.1 OpenClaw Skill: `poo-app`
A new OpenClaw skill that teaches agents how to use the Poo App API:

```
Skills:
  poo-app:
    description: "Manage tasks, log activity, and store memories in Poo App"
    commands:
      - task create "Buy milk" --list "Groceries" --priority high
      - task complete <id>
      - task list --assigned-to me --status open
      - activity log "Reviewed PR #142, left 3 comments"
      - memory store "Brian prefers Railway for deploys"
      - memory search "deployment preferences"
      - schedule sync  # Push local crons to Poo App
```

### 7.2 Orgo Computer Adapter (V1 default runtime)
Each active agent session can optionally bind to an Orgo computer.

**Lifecycle**
1. Agent claims task in Poo App.
2. OpenClaw provisions/attaches Orgo computer (`workspaceId`, `computerId`).
3. Agent executes work (browser/desktop actions) on Orgo.
4. Agent posts periodic heartbeats + artifacts to Poo App.
5. On completion/failure, agent closes task and releases/stops computer.

**Runtime metadata captured in activity/missions**
- `provider: "orgo"`
- `workspaceId`
- `computerId`
- `sessionState: starting | running | blocked | failed | finished`
- `artifactRefs` (screenshots, logs, exported files)

### 7.3 Webhook Support (Future)
- Poo App fires webhooks when tasks are created/assigned/completed.
- OpenClaw listens and reacts (e.g., auto-claim unassigned tasks).
- Enables fully autonomous task pickup.

### 7.4 ClawBootBot Integration
- ClawBootBot-managed agents register in Poo App as team members.
- Each bot gets its own agent profile and API key.
- Default execution target for bot work is Orgo unless explicitly overridden.
- Centralized dashboard for all bots across ClawBootBot + OpenClaw.

---

## 8. Data Model Summary

### Existing tables (unchanged)
`users`, `lists`, `items`, `tags`, `categories`, `comments`, `didLogs`, `publications`, `bookmarks`, `listTemplates`, `pushSubscriptions`, `pushTokens`, `authSessions`, `rateLimits`, `bitcoinAnchors`

### Modified tables
- **`users`** — add `isAgent`, `agentPlatform`, `connectedByUserId`
- **`items`** — add `assigneeDid`, `assignedAt`

### New tables
- **`activity`** — action log per list
- **`presence`** — who's currently viewing what
- **`apiKeys`** — agent API authentication
- **`memories`** — searchable agent/human memory store
- **`scheduleEntries`** — cron jobs and scheduled tasks
- **`missionRuns`** — per-task runtime session records (provider, computerId, status, artifacts)

---

## 9. Success Metrics

| Metric | Target | How |
|--------|--------|-----|
| Regular users don't notice agent features | 0 complaints about complexity | Agent layer hidden by default |
| Agent task completion visible in <1s | P95 < 1s latency | Convex real-time subscriptions |
| API response time | P95 < 200ms | Convex HTTP actions |
| Agent operators use dashboard daily | >60% DAU among agent users | Analytics |
| Mission run observability | >90% runs have at least 1 artifact + terminal state | `missionRuns` completeness checks |
| Orgo-backed task completion | >80% success without manual intervention | Run state + activity analytics |
| Memory search returns relevant results | >80% satisfaction | Full-text + semantic search |

---

## 10. Rollout Plan

| Phase | Timeline | Milestone |
|-------|----------|-----------|
| **Phase 1** — Collaborative Tasks | 2 weeks | Assignees + activity log + presence |
| **Phase 2** — Agent Identity, API & Runtime Sessions | 2 weeks | API keys, REST endpoints, agent profiles, `missionRuns`, Orgo runtime adapter |
| **Phase 3** — Memory & Knowledge | 2 weeks | Memory store, browser UI, search |
| **Phase 4** — Schedule & Calendar | 1 week | Calendar view with cron sync |
| **Phase 5** — Team & Multi-Agent | 2 weeks | Team dashboard, status, sub-agents |
| **Phase 6** — Dashboard | 2 weeks | Mission Control home view |

**Phase 1 is the priority** — it makes the app better for *everyone* and lays the foundation for everything else.

---

## 11. Open Questions

1. **Memory sync direction** — Should Poo App be the source of truth for memories, or just a mirror of the markdown files? (Recommendation: Poo App becomes source of truth, with export to markdown.)

2. **Multi-agent auth** — One API key per agent, or one key per human that acts on behalf of multiple agents? (Recommendation: one key per agent for auditability.)

3. **Webhook vs polling** — Should agents poll for new tasks, or should Poo App push via webhooks? (Recommendation: webhooks for real-time, with polling as fallback.)

4. **ClawBootBot free tier** — Should free-tier ClawBootBot users get Mission Control features? (Recommendation: yes, with limits on number of agents.)

5. **Privacy** — Agent memories may contain sensitive info. Per-memory visibility controls? (Recommendation: yes, private by default, share explicitly.)

6. **Orgo tenancy model** — Shared workspace per user, or per-agent workspace isolation? (Recommendation: per-agent default with optional shared workspace for cost optimization.)

7. **Artifact retention** — How long should screenshots/log artifacts from mission runs be retained? (Recommendation: 30 days default, configurable by workspace.)

---

*This PRD is a living document. Update as we build and learn.*
