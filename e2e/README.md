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
