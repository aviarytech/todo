#!/usr/bin/env node

import {
  validateApiKeyInventoryPayload,
  validateFinalizeRotationResponse,
  validateRotateApiKeyResponse,
} from "./lib/mission-control-api-contracts.mjs";

const baseUrl = process.env.MISSION_CONTROL_BASE_URL;
const apiKey = process.env.MISSION_CONTROL_API_KEY;
const jwtToken = process.env.MISSION_CONTROL_JWT;
const dryRun = process.env.MISSION_CONTROL_DRILL_DRY_RUN !== "false";

const skippedChecks = [];
const createdKeys = [];

function fail(msg, code = 1) {
  console.error(`❌ ${msg}`);
  process.exit(code);
}

function ok(msg) {
  console.log(`✅ ${msg}`);
}

function warn(msg) {
  console.log(`⚠️ ${msg}`);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function canAuth(mode) {
  if (mode === "apiKey") return Boolean(apiKey);
  if (mode === "jwt") return Boolean(jwtToken);
  return Boolean(apiKey || jwtToken);
}

function authHeaders(mode) {
  if (mode === "apiKey") return { "X-API-Key": apiKey };
  if (mode === "jwt") return { Authorization: `Bearer ${jwtToken}` };

  if (apiKey) return { "X-API-Key": apiKey };
  if (jwtToken) return { Authorization: `Bearer ${jwtToken}` };
  return {};
}

async function call(path, { method = "GET", body, authMode = "auto" } = {}) {
  if (!baseUrl || !canAuth(authMode)) {
    return {
      skipped: true,
      reason: !baseUrl
        ? "MISSION_CONTROL_BASE_URL missing"
        : authMode === "jwt"
          ? "MISSION_CONTROL_JWT missing"
          : authMode === "apiKey"
            ? "MISSION_CONTROL_API_KEY missing"
            : "MISSION_CONTROL_API_KEY or MISSION_CONTROL_JWT missing",
    };
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(authMode),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = { raw: await res.text() };
  }

  return { ok: res.ok, status: res.status, data };
}

async function checkApiKeyRotationVisibility() {
  const result = await call("/api/v1/auth/keys", { authMode: "jwt" });
  if (result.skipped) {
    skippedChecks.push(`api key rotation visibility (${result.reason})`);
    return;
  }
  if (!result.ok) fail(`api key rotation visibility failed (${result.status})`);
  validateApiKeyInventoryPayload(result.data);
  ok("api key inventory + rotation events reachable");
}

async function checkRetentionAuditIntegration() {
  const settings = await call("/api/v1/runs/retention", { authMode: "jwt" });
  if (settings.skipped) {
    skippedChecks.push(`retention settings/audit logs (${settings.reason})`);
    return;
  }
  if (!settings.ok) fail(`retention settings check failed (${settings.status})`);
  ok("retention settings + deletion logs reachable");

  const retention = await call("/api/v1/runs/retention", {
    method: "POST",
    authMode: "jwt",
    body: { dryRun: true, maxRuns: 20 },
  });
  if (!retention.ok) fail(`retention dry-run failed (${retention.status})`);
  ok("artifact retention dry-run succeeded");
}

async function checkZeroDowntimeRotationFlow() {
  if (!jwtToken || !apiKey) {
    skippedChecks.push("zero-downtime api key rotation drill (requires both MISSION_CONTROL_JWT and MISSION_CONTROL_API_KEY)");
    return;
  }

  const create = await call("/api/v1/auth/keys", {
    method: "POST",
    authMode: "jwt",
    body: { label: `readiness-drill-${Date.now()}`, scopes: ["dashboard:read"] },
  });
  if (!create.ok) fail(`api key create for rotation drill failed (${create.status})`);
  assert(typeof create.data?.keyId === "string", "rotation drill create contract mismatch (keyId)");
  assert(typeof create.data?.apiKey === "string", "rotation drill create contract mismatch (apiKey)");
  createdKeys.push(create.data.keyId);

  const rotate = await call(`/api/v1/auth/keys/${create.data.keyId}/rotate`, {
    method: "POST",
    authMode: "jwt",
    body: { gracePeriodHours: 1, label: `readiness-rotated-${Date.now()}` },
  });
  if (!rotate.ok) fail(`api key rotate drill failed (${rotate.status})`);
  validateRotateApiKeyResponse(rotate.data);
  createdKeys.push(rotate.data.newKeyId);

  const oldDuringGrace = await fetch(`${baseUrl}/api/v1/dashboard/runs`, {
    headers: { "X-API-Key": create.data.apiKey },
  });
  assert(oldDuringGrace.ok, `old api key should remain usable during grace (${oldDuringGrace.status})`);

  const newDuringGrace = await fetch(`${baseUrl}/api/v1/dashboard/runs`, {
    headers: { "X-API-Key": rotate.data.apiKey },
  });
  assert(newDuringGrace.ok, `new api key should be usable immediately (${newDuringGrace.status})`);

  const finalize = await call(`/api/v1/auth/keys/${create.data.keyId}/finalize-rotation`, {
    method: "POST",
    authMode: "jwt",
  });
  if (!finalize.ok) fail(`api key finalize rotation failed (${finalize.status})`);
  validateFinalizeRotationResponse(finalize.data);

  const oldAfterFinalize = await fetch(`${baseUrl}/api/v1/dashboard/runs`, {
    headers: { "X-API-Key": create.data.apiKey },
  });
  assert(oldAfterFinalize.status === 401, `old api key should be rejected after finalize (${oldAfterFinalize.status})`);

  const newAfterFinalize = await fetch(`${baseUrl}/api/v1/dashboard/runs`, {
    headers: { "X-API-Key": rotate.data.apiKey },
  });
  assert(newAfterFinalize.ok, `new api key should keep working after finalize (${newAfterFinalize.status})`);

  ok("zero-downtime API key rotation flow assertions passed");
}

async function cleanupCreatedKeys() {
  if (!jwtToken || !baseUrl || createdKeys.length === 0) return;
  for (const keyId of createdKeys.reverse()) {
    const result = await call(`/api/v1/auth/keys/${keyId}`, { method: "DELETE", authMode: "jwt" });
    if (!result.skipped && !result.ok && result.status !== 400 && result.status !== 404) {
      warn(`cleanup failed for ${keyId} (${result.status})`);
    }
  }
}

async function main() {
  console.log("Mission Control readiness drill");
  console.log(`Mode: ${dryRun ? "dry-run" : "live"}`);

  const dashboard = await call("/api/v1/dashboard/runs", { authMode: "auto" });
  if (dashboard.skipped) {
    warn(`Skipping remote checks: ${dashboard.reason}`);
    ok("Readiness drill script wiring validated (env-less mode)");
    return;
  }
  if (!dashboard.ok) fail(`dashboard check failed (${dashboard.status})`);
  ok("dashboard/runs reachable");

  await checkApiKeyRotationVisibility();
  await checkRetentionAuditIntegration();

  if (dryRun) {
    if (skippedChecks.length) {
      warn(`Skipped checks: ${skippedChecks.join("; ")}`);
    }
    ok("Operator control simulation complete (dry-run, no run mutations sent)");
    return;
  }

  await checkZeroDowntimeRotationFlow();

  const runs = await call("/api/v1/runs?limit=1", { authMode: "apiKey" });
  if (runs.skipped) {
    skippedChecks.push(`live run control simulation (${runs.reason})`);
    warn(`Skipping live run control simulation: ${runs.reason}`);
    console.log("🎯 Readiness drill completed with partial coverage");
    return;
  }
  if (!runs.ok) fail(`run list failed (${runs.status})`);
  const runId = runs.data?.runs?.[0]?._id;
  if (!runId) fail("no runs available to execute live drill", 2);

  const pause = await call(`/api/v1/runs/${runId}/pause`, {
    method: "POST",
    authMode: "apiKey",
    body: { reason: "readiness_drill" },
  });
  if (!pause.ok) fail(`pause failed (${pause.status})`);
  ok("pause action succeeded");

  const escalate = await call(`/api/v1/runs/${runId}/escalate`, {
    method: "POST",
    authMode: "apiKey",
    body: { reason: "readiness_drill" },
  });
  if (!escalate.ok) fail(`escalate failed (${escalate.status})`);
  ok("escalate action succeeded");

  if (skippedChecks.length) {
    warn(`Skipped checks: ${skippedChecks.join("; ")}`);
  }
  console.log("🎯 Readiness drill completed");
}

main()
  .catch((error) => fail(error instanceof Error ? error.message : String(error)))
  .finally(async () => {
    await cleanupCreatedKeys();
  });
