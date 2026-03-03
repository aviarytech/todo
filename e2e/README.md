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

When these vars are present, tests seed `lisa-auth-state` + `lisa-jwt-token` in localStorage and skip OTP bootstrap.

## Perf gates (AC5)

Run perf gates against the production-sized fixture profile (10 runs, 50 items/list):

```bash
npm run mission-control:perf-gates
```

Equivalent explicit invocation:

```bash
MISSION_CONTROL_FIXTURE_PATH=e2e/fixtures/mission-control.production.json \
  npm run test:e2e -- e2e/mission-control-phase1.spec.ts -g "AC5"
```
