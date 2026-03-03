export function validateApiKeyInventoryPayload(payload) {
  if (!payload || !Array.isArray(payload.apiKeys) || !Array.isArray(payload.rotationEvents)) {
    throw new Error("api key inventory contract mismatch (apiKeys[] + rotationEvents[] required)");
  }
}

export function validateRotateApiKeyResponse(payload) {
  if (!payload || payload.success !== true) throw new Error("rotation response contract mismatch (success=true)");
  if (payload.zeroDowntime !== true) throw new Error("rotation response contract mismatch (zeroDowntime=true)");
  if (typeof payload.newKeyId !== "string" || !payload.newKeyId) throw new Error("rotation response contract mismatch (newKeyId)");
  if (typeof payload.apiKey !== "string" || !payload.apiKey.startsWith("pa_")) throw new Error("rotation response contract mismatch (apiKey)");
  if (typeof payload.oldKeyId !== "string" || !payload.oldKeyId) throw new Error("rotation response contract mismatch (oldKeyId)");
}

export function validateFinalizeRotationResponse(payload) {
  if (!payload || payload.success !== true) throw new Error("rotation finalize contract mismatch (success=true)");
  if (typeof payload.revokedAt !== "number" || !Number.isFinite(payload.revokedAt)) {
    throw new Error("rotation finalize contract mismatch (revokedAt)");
  }
}
