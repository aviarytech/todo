# Mission Control Production Readiness Drill (P1-3)

1. Validate alert configs:
   - `npm run mission-control:validate-observability`
2. Execute run-control drill:
   - `npm run mission-control:readiness-drill`
   - Live mode now validates `pause`, `kill` (when >=2 runs are available), and `escalate` control paths.
   - Dry-run mode still verifies API wiring without mutating runs.
   - Local automation check: `npm run mission-control:test-readiness-drill`
3. Verify Team Dashboard run-health cards:
   - stale / critical / errored / stuck-working counts
4. Operator checklist:
   - [ ] pause path tested
   - [ ] kill path tested
   - [ ] escalation path tested
   - [x] alerts routed to Slack + PagerDuty (`npm run mission-control:validate-observability`)

Stop rollout if any run-control path fails or critical stale agents remain unresolved.
