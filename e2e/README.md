# E2E Test Notes

## Mission Control Phase 1 seeded auth fixture

`e2e/mission-control-phase1.spec.ts` supports a deterministic seeded auth session for OTP-gated environments.

Set these env vars before running Playwright:

- `E2E_AUTH_TOKEN`
- `E2E_AUTH_EMAIL`
- `E2E_AUTH_SUBORG_ID`
- `E2E_AUTH_DID`
- `E2E_AUTH_DISPLAY_NAME` (optional)

Example:

```bash
E2E_AUTH_TOKEN="<jwt>" \
E2E_AUTH_EMAIL="e2e-mission-control@aviary.tech" \
E2E_AUTH_SUBORG_ID="suborg_e2e_mission_control" \
E2E_AUTH_DID="did:webvh:e2e:mission-control" \
npm run test:e2e -- e2e/mission-control-phase1.spec.ts
```

When these vars are present, tests seed `lisa-auth-state` + `lisa-jwt-token` in localStorage using your real backend JWT and skip OTP bootstrap.

If these vars are absent, the fixture falls back to a fake local token (fine for local/dev auth, but cloud environments that validate JWTs will redirect to OTP and AC tests will skip with an explicit reason).

## Mission Control AC5 perf fixture

Set `MISSION_CONTROL_FIXTURE_PATH` to a JSON file for AC5 perf gate tuning (example: `e2e/fixtures/mission-control.production.json`).

Supported fields:
- `listOpenRuns`
- `listOpenP95Ms`
- `activityOpenRuns`
- `activityOpenP95Ms`
- `itemsPerList`
- `seededListCount` (optional, defaults to `listOpenRuns`)

The loader validates shape/ranges and fails fast for runaway seed plans (`seededListCount * itemsPerList > 3000`) so production-sized fixture jobs error clearly instead of hanging/flaking.
