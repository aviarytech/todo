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

All baseline metrics emit as JSON logs with `[obs]` prefix. This is intentionally provider-neutral and immediately runnable.

## Dashboard + alerts mapping
- Metrics contract: `docs/mission-control/phase1-observability-metrics.json`
- Dashboard spec/config: `docs/mission-control/phase1-observability-dashboard-config.json`
- Planning context: `docs/mission-control/phase1-observability-dashboard-plan.md`
- Consistency validator (catalog ↔ dashboard ↔ alerts):
  - `npm run mission-control:validate-observability`

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

## Known gaps (next pass)
- `subscription_latency_ms` not yet wired to Convex subscription timing hooks.
- Data integrity detectors (`invalid_assignee_reference_total`, `duplicate_activity_event_total`, `out_of_order_activity_timestamps_total`) still need scheduled jobs.
- Collaboration throughput currently requires Phase 1 activity table event emission (`activity_event_total`) for full fidelity.
- Alert acknowledgement + incident note enforcement depends on external paging provider setup.
