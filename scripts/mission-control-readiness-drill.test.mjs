import test from "node:test";
import assert from "node:assert/strict";

import {
  selectRunControlTargets,
  validateApiKeyInventoryPayload,
  validateRetentionDryRunPayload,
  validateRetentionSettingsPayload,
} from "./mission-control-readiness-drill.mjs";

test("validateApiKeyInventoryPayload enforces arrays", () => {
  assert.match(validateApiKeyInventoryPayload({}), /apiKeys\[\]/);
  assert.equal(validateApiKeyInventoryPayload({ apiKeys: [], rotationEvents: [] }), null);
});

test("validateRetentionSettingsPayload enforces settings + deletionLogs", () => {
  assert.match(validateRetentionSettingsPayload({ settings: {} }), /deletionLogs\[\]/);
  assert.equal(validateRetentionSettingsPayload({ settings: { artifactRetentionDays: 30 }, deletionLogs: [] }), null);
});

test("validateRetentionDryRunPayload enforces shape", () => {
  assert.match(validateRetentionDryRunPayload({ ok: true, dryRun: true }), /retentionDays/);
  assert.equal(
    validateRetentionDryRunPayload({
      ok: true,
      dryRun: true,
      retentionDays: 30,
      retentionCutoffAt: Date.now(),
      runsScanned: 10,
      runsTouched: 2,
      deletedArtifacts: 4,
    }),
    null,
  );
});

test("selectRunControlTargets picks primary + optional kill run", () => {
  assert.deepEqual(selectRunControlTargets({ runs: [{ _id: "run1" }, { _id: "run2" }] }), {
    primaryRunId: "run1",
    killRunId: "run2",
  });
  assert.deepEqual(selectRunControlTargets({ runs: [{ _id: "run1" }] }), {
    primaryRunId: "run1",
    killRunId: null,
  });
});
