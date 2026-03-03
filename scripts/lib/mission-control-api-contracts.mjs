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

export function validateRetentionSettingsPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("retention settings contract mismatch (object required)");
  }
  if (!Array.isArray(payload.deletionLogs)) {
    throw new Error("retention settings contract mismatch (deletionLogs[] required)");
  }
  if (payload.settings != null && typeof payload.settings !== "object") {
    throw new Error("retention settings contract mismatch (settings object|null)");
  }
}

export function validateRetentionApplyResponse(payload) {
  if (!payload || payload.ok !== true) {
    throw new Error("retention apply contract mismatch (ok=true)");
  }

  for (const field of ["dryRun", "retentionDays", "retentionCutoffAt", "runsScanned", "runsTouched", "deletedArtifacts"]) {
    if (!(field in payload)) {
      throw new Error(`retention apply contract mismatch (${field})`);
    }
  }

  if (typeof payload.dryRun !== "boolean") throw new Error("retention apply contract mismatch (dryRun boolean)");

  for (const numericField of ["retentionDays", "retentionCutoffAt", "runsScanned", "runsTouched", "deletedArtifacts"]) {
    if (typeof payload[numericField] !== "number" || !Number.isFinite(payload[numericField])) {
      throw new Error(`retention apply contract mismatch (${numericField} number)`);
    }
  }
}
