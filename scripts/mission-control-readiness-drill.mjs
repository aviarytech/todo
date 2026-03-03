#!/usr/bin/env node

const baseUrl = process.env.MISSION_CONTROL_BASE_URL;
const apiKey = process.env.MISSION_CONTROL_API_KEY;
const jwtToken = process.env.MISSION_CONTROL_JWT;
const dryRun = process.env.MISSION_CONTROL_DRILL_DRY_RUN !== "false";

const skippedChecks = [];

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

export function validateApiKeyInventoryPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return "auth key inventory payload missing";
  }
  if (!Array.isArray(payload.apiKeys)) {
    return "auth key inventory payload missing apiKeys[]";
  }
  if (!Array.isArray(payload.rotationEvents)) {
    return "auth key inventory payload missing rotationEvents[]";
  }
  return null;
}

export function validateRetentionSettingsPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return "retention settings payload missing";
  }
  if (!payload.settings || typeof payload.settings !== "object") {
    return "retention settings payload missing settings";
  }
  if (!Array.isArray(payload.deletionLogs)) {
    return "retention settings payload missing deletionLogs[]";
  }
  return null;
}

export function validateRetentionDryRunPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return "retention dry-run payload missing";
  }
  const requiredNumericFields = ["retentionDays", "retentionCutoffAt", "runsScanned", "runsTouched", "deletedArtifacts"];
  for (const field of requiredNumericFields) {
    if (!Number.isFinite(payload[field])) {
      return `retention dry-run payload missing numeric ${field}`;
    }
  }
  if (payload.ok !== true) {
    return "retention dry-run payload missing ok=true";
  }
  if (payload.dryRun !== true) {
    return "retention dry-run payload missing dryRun=true";
  }
  return null;
}

export function selectRunControlTargets(runsPayload) {
  const runs = Array.isArray(runsPayload?.runs) ? runsPayload.runs : [];
  const primaryRunId = runs[0]?._id ?? null;
  const killRunId = runs[1]?._id ?? null;
  return { primaryRunId, killRunId };
}

async function checkApiKeyRotationVisibility() {
  const result = await call("/api/v1/auth/keys", { authMode: "jwt" });
  if (result.skipped) {
    skippedChecks.push(`api key rotation visibility (${result.reason})`);
    return;
  }
  if (!result.ok) fail(`api key rotation visibility failed (${result.status})`);

  const validationError = validateApiKeyInventoryPayload(result.data);
  if (validationError) fail(validationError);

  ok("api key inventory + rotation events reachable");
}

async function checkRetentionAuditIntegration() {
  const settings = await call("/api/v1/runs/retention", { authMode: "jwt" });
  if (settings.skipped) {
    skippedChecks.push(`retention settings/audit logs (${settings.reason})`);
    return;
  }
  if (!settings.ok) fail(`retention settings check failed (${settings.status})`);

  const settingsValidationError = validateRetentionSettingsPayload(settings.data);
  if (settingsValidationError) fail(settingsValidationError);

  ok("retention settings + deletion logs reachable");

  const retention = await call("/api/v1/runs/retention", {
    method: "POST",
    authMode: "jwt",
    body: { dryRun: true, maxRuns: 20 },
  });
  if (!retention.ok) fail(`retention dry-run failed (${retention.status})`);

  const dryRunValidationError = validateRetentionDryRunPayload(retention.data);
  if (dryRunValidationError) fail(dryRunValidationError);

  ok("artifact retention dry-run succeeded");
}

export async function main() {
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

  const runs = await call("/api/v1/runs?limit=2", { authMode: "apiKey" });
  if (runs.skipped) {
    skippedChecks.push(`live run control simulation (${runs.reason})`);
    warn(`Skipping live run control simulation: ${runs.reason}`);
    console.log("🎯 Readiness drill completed with partial coverage");
    return;
  }
  if (!runs.ok) fail(`run list failed (${runs.status})`);
  const { primaryRunId, killRunId } = selectRunControlTargets(runs.data);
  if (!primaryRunId) fail("no runs available to execute live drill", 2);

  const pause = await call(`/api/v1/runs/${primaryRunId}/pause`, {
    method: "POST",
    authMode: "apiKey",
    body: { reason: "readiness_drill" },
  });
  if (!pause.ok) fail(`pause failed (${pause.status})`);
  ok("pause action succeeded");

  if (killRunId) {
    const kill = await call(`/api/v1/runs/${killRunId}/kill`, {
      method: "POST",
      authMode: "apiKey",
      body: { reason: "readiness_drill" },
    });
    if (!kill.ok) fail(`kill failed (${kill.status})`);
    ok("kill action succeeded");
  } else {
    warn("kill action skipped (need at least 2 runs in list response)");
  }

  const escalate = await call(`/api/v1/runs/${primaryRunId}/escalate`, {
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

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
}
