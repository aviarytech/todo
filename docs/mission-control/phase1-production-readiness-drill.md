# Mission Control Production Readiness Drill (P1-3)

1. Validate alert configs:
   - `npm run mission-control:validate-observability`
2. Execute run-control drill:
   - `npm run mission-control:readiness-drill`
3. Verify Team Dashboard run-health cards:
   - stale / critical / errored / stuck-working counts
4. Operator checklist:
   - [ ] pause path tested
   - [ ] kill path tested
   - [ ] escalation path tested
   - [ ] alerts routed to Slack + PagerDuty

Stop rollout if any run-control path fails or critical stale agents remain unresolved.
