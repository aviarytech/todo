import test from "node:test";
import assert from "node:assert/strict";
import {
  validateApiKeyInventoryPayload,
  validateFinalizeRotationResponse,
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
