# Phase 1 Observability Dashboard Instrumentation Plan

Status: Block 1 scaffold (implementation planning pass)

## Objective
Ship Phase 1 with a Mission Control internal dashboard that covers:
- Realtime health
- Collaboration throughput
- Data integrity
- User experience latency/errors

## Panel spec (from PRD) → instrumentation mapping

### 1) Realtime Health
- **subscription_latency_ms** (P50/P95)
  - Source: client metric emitted on subscription update callbacks.
  - Dimensions: `route`, `listId`, `env`.
- **mutation_error_rate** (5m/1h)
  - Source: Convex mutation wrapper + HTTP action error middleware.
  - Dimensions: `mutationName`, `errorCode`, `env`.
- **active_presence_sessions**
  - Source: `presence` table count of rows with `lastSeen > now - ttl`.

### 2) Collaboration Throughput
- **activity_events_per_minute** by `action`
  - Source: write path that inserts `activity` row.
- **assignments_per_day**
  - Source: activity rows where `action = assigned`.
- **completion_events_per_day**
  - Source: activity rows where `action = completed`.

### 3) Data Integrity
- **invalid_assignee_reference_pct**
  - Source: scheduled integrity query joining `items.assigneeDid` against known users/collaborators.
- **duplicate_activity_event_count**
  - Source: detector for duplicate action signature `(listId,itemId,actorDid,action,tsBucket)`.
- **out_of_order_activity_timestamps**
  - Source: detector where per-item activity timestamp decreases.

### 4) User Experience
- **activity_panel_open_latency_ms** (P95)
  - Source: client perf marks around panel open and first paint/data-ready.
- **list_render_latency_ms** (P95)
  - Source: client perf marks from route enter to list first interactive render.
- **client_error_rate_by_route**
  - Source: window error/rejection hooks + route tagging.

## Alert thresholds (initial)
- mutation error rate > 2% for 10m
- subscription latency P95 > 1200ms for 10m
- data integrity anomaly count > 0 for 15m

Routing:
- staging: internal dev channel only
- production: on-call channel + pager integration + acknowledgement required

## Proposed implementation slices
1. **Metrics contract + naming**
   - Add `docs/mission-control/phase1-observability-metrics.json` as canonical names/dimensions.
2. **Server instrumentation baseline**
   - Add lightweight wrappers in Convex mutation/action entry points.
3. **Client instrumentation baseline**
   - Add perf mark helper and route-aware error capture utility.
4. **Integrity detectors**
   - Add periodic query jobs (or on-demand admin queries) for duplicate/out-of-order/invalid-assignee checks.
5. **Dashboard provisioning**
   - Add provider-specific dashboard config from the metrics contract.

## Blockers / assumptions
- Telemetry backend provider not yet fixed in repo (Datadog/Grafana/OTel pipeline TBD).
- Need decision on where alert routing config is managed for staging vs production.
- Assumes Phase 1 schema additions (`activity`, `presence`, `items.assigneeDid`) are available.

## Definition of done for this plan
- Metric names frozen
- Data source owner per metric assigned
- Dashboard panels and alerts provisionable from config
- Runbook links attached to each alert
