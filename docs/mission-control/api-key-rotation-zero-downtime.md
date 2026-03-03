# API key rotation flow with zero downtime

Launch-gate runbook for rotating Mission Control API keys without interrupting agent traffic.

## Flow

1. Create or select existing key.
2. Rotate old key (`POST /api/v1/auth/keys/:id/rotate`) to mint a new key.
3. During grace period, both old + new keys are valid.
4. Roll out the new key to all clients.
5. Finalize (`POST /api/v1/auth/keys/:id/finalize-rotation`) to revoke old key.

## Rotate payload

```json
{
  "label": "mission-control-prod-v2",
  "gracePeriodMinutes": 30
}
```

Supported grace controls:
- `gracePeriodMinutes` (1..10080)
- `gracePeriodHours` (1..168)

Provide exactly one grace field.

## Validation command

```bash
MISSION_CONTROL_BASE_URL="https://<deployment>" \
MISSION_CONTROL_BEARER_TOKEN="<jwt>" \
MISSION_CONTROL_ROTATION_GRACE_MINUTES=10 \
npm run mission-control:validate-key-rotation
```

Validator asserts:
- old key works before rotate
- old + new keys both work during grace window
- after finalize: old key fails, new key works
