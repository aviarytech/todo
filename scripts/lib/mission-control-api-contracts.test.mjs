import test from "node:test";
import assert from "node:assert/strict";
import {
  validateApiKeyInventoryPayload,
  validateFinalizeRotationResponse,
  validateRetentionApplyResponse,
  validateRetentionSettingsPayload,
  validateRotateApiKeyResponse,
} from "./mission-control-api-contracts.mjs";

test("validateApiKeyInventoryPayload accepts expected shape", () => {
  assert.doesNotThrow(() => validateApiKeyInventoryPayload({ apiKeys: [], rotationEvents: [] }));
});

test("validateApiKeyInventoryPayload rejects malformed payload", () => {
  assert.throws(() => validateApiKeyInventoryPayload({ apiKeys: {} }));
});

test("validateRotateApiKeyResponse accepts zero-downtime response", () => {
  assert.doesNotThrow(() => validateRotateApiKeyResponse({
    success: true,
    zeroDowntime: true,
    oldKeyId: "abc123",
    newKeyId: "def456",
    apiKey: "pa_deadbeef_token",
  }));
});

test("validateRotateApiKeyResponse rejects missing contract fields", () => {
  assert.throws(() => validateRotateApiKeyResponse({ success: true }));
});

test("validateFinalizeRotationResponse accepts finalize contract", () => {
  assert.doesNotThrow(() => validateFinalizeRotationResponse({ success: true, revokedAt: Date.now() }));
});

test("validateFinalizeRotationResponse rejects malformed contract", () => {
  assert.throws(() => validateFinalizeRotationResponse({ success: true, revokedAt: "now" }));
});

test("validateRetentionSettingsPayload accepts expected shape", () => {
  assert.doesNotThrow(() => {
    validateRetentionSettingsPayload({
      settings: { artifactRetentionDays: 14 },
      deletionLogs: [{ runId: "run_1" }],
    });
  });

  assert.doesNotThrow(() => {
    validateRetentionSettingsPayload({
      settings: null,
      deletionLogs: [],
    });
  });
});

test("validateRetentionSettingsPayload rejects malformed payload", () => {
  assert.throws(() => validateRetentionSettingsPayload(null), /object required/);
  assert.throws(() => validateRetentionSettingsPayload({ settings: {}, deletionLogs: null }), /deletionLogs\[\] required/);
  assert.throws(() => validateRetentionSettingsPayload({ settings: "bad", deletionLogs: [] }), /settings object\|null/);
});

test("validateRetentionApplyResponse accepts expected shape", () => {
  assert.doesNotThrow(() => {
    validateRetentionApplyResponse({
      ok: true,
      dryRun: true,
      retentionDays: 30,
      retentionCutoffAt: Date.now(),
      runsScanned: 5,
      runsTouched: 2,
      deletedArtifacts: 7,
    });
  });
});

test("validateRetentionApplyResponse rejects malformed payload", () => {
  assert.throws(() => validateRetentionApplyResponse({ ok: false }), /ok=true/);
  assert.throws(() => validateRetentionApplyResponse({ ok: true, dryRun: true, retentionDays: 30 }), /retentionCutoffAt/);
  assert.throws(
    () =>
      validateRetentionApplyResponse({
        ok: true,
        dryRun: "true",
        retentionDays: 30,
        retentionCutoffAt: Date.now(),
        runsScanned: 5,
        runsTouched: 2,
        deletedArtifacts: 7,
      }),
    /dryRun boolean/
  );
});
