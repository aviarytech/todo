# Phase 1 Observability Runbook (Baseline)

## What shipped in this baseline

### Client metric collection points
- `src/App.tsx`
  - `client_error_total` from `window.error` and `unhandledrejection` listeners with route tags.
  - `route_view_total` per route navigation (supporting route-level context for UX/error trends).
- `src/pages/ListView.tsx`
  - `list_render_latency_ms` measured once when list + items become ready.
  - `active_presence_sessions` gauge emitted as `1` on list mount, `0` on unmount (initial baseline signal).
- `src/components/ItemDetailsModal.tsx`
  - `activity_panel_open_latency_ms` measured from modal open to first animation frame.

### Server metric collection points
- `convex/lib/observability.ts`
  - `mutation_total`, `mutation_error_total`, `mutation_latency_ms` helpers.
- Instrumented mutations:
  - `convex/items.ts`: `items.addItem`, `items.updateItem`, `items.checkItem`
  - `convex/lists.ts`: `lists.createList`
  - `convex/missionControl.ts`: assignee + presence events emit `activity_event_total`, and presence session lifecycle emits `active_presence_sessions`.
  - `convex/missionControlCore.ts`: dashboard query emits `agent_heartbeat_age_ms` and `agent_stale_total`.
  - `convex/missionControlApi.ts`: run-control endpoints emit `run_control_action_total` on successful operations.

All baseline metrics emit as JSON logs with `[obs]` prefix. This is intentionally provider-neutral and immediately runnable.

## Dashboard + alerts mapping
- Metrics contract: `docs/mission-control/phase1-observability-metrics.json`
- Dashboard spec/config: `docs/mission-control/phase1-observability-dashboard-config.json`
- Alert routing config: `docs/mission-control/phase1-observability-alert-routing.json`
- Planning context: `docs/mission-control/phase1-observability-dashboard-plan.md`
- Consistency validator (catalog ↔ dashboard ↔ alerts ↔ routing ↔ provisioned endpoints):
  - `npm run mission-control:validate-observability`
  - Enforces route parity between dashboard + routing files and fails if a route target is not declared in the routing endpoint catalog (`routing.staging/production channel|pager`).
  - Enforces severity-to-routing policy for production: `low|medium → slack`, `high|critical → slack + pagerduty`.
- Policy unit tests:
  - `npm run mission-control:test-observability`

## Runnable path (today)
1. Start app and Convex dev stack.
2. Perform key flows:
   - open list
   - open item details panel
   - add/update/check item
   - create list
3. Collect logs:
   - browser console `[obs]` events
   - Convex function logs `[obs]` events
4. Feed logs to your sink of choice (Datadog/Grafana Loki/OTel collector).
5. Create dashboard panels + alerts directly from `phase1-observability-dashboard-config.json`.

## E2E fixture/perf gate path
- Default Mission Control e2e uses seeded local auth fixture (`e2e/fixtures/auth.ts`).
- For production-sized perf runs, set fixture path:
  - `MISSION_CONTROL_FIXTURE_PATH=e2e/fixtures/mission-control.production.json npm run test:e2e -- e2e/mission-control-phase1.spec.ts`

## Known gaps (next pass)
- `subscription_latency_ms` not yet wired to Convex subscription timing hooks.
- Data integrity detectors (`invalid_assignee_reference_total`, `duplicate_activity_event_total`, `out_of_order_activity_timestamps_total`) still need scheduled jobs.
- `run_control_action_total` now emits both `result=success` and `result=failed` for run-control endpoints (`monitor`, `pause`, `kill`, `escalate`, `reassign`, `transition`, `retry`) including rejected requests (e.g., missing scope/runId/targetAgentSlug) and server/auth failures.
- Alert acknowledgement + incident note enforcement depends on external paging provider setup.
