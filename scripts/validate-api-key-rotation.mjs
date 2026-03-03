#!/usr/bin/env node

const baseUrl = process.env.MISSION_CONTROL_BASE_URL;
const bearerToken = process.env.MISSION_CONTROL_BEARER_TOKEN;
const probePath = process.env.MISSION_CONTROL_ROTATION_PROBE_PATH || "/api/v1/dashboard/runs";
const gracePeriodMinutes = Number(process.env.MISSION_CONTROL_ROTATION_GRACE_MINUTES || 10);
const label = process.env.MISSION_CONTROL_ROTATION_LABEL || `rotation-drill-${Date.now()}`;

function fail(message, code = 1) {
  console.error(`❌ ${message}`);
  process.exit(code);
}

function ok(message) {
  console.log(`✅ ${message}`);
}

async function callWithJwt(path, { method = "GET", body } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try { data = await res.json(); } catch { data = { raw: await res.text() }; }
  return { ok: res.ok, status: res.status, data };
}

async function callWithApiKey(apiKey, path, { method = "GET", body } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try { data = await res.json(); } catch { data = { raw: await res.text() }; }
  return { ok: res.ok, status: res.status, data };
}

async function main() {
  console.log("Mission Control API key zero-downtime rotation validator");

  if (!baseUrl || !bearerToken) {
    console.log("⚠️ Skipping remote validation: set MISSION_CONTROL_BASE_URL + MISSION_CONTROL_BEARER_TOKEN");
    ok("Validator wiring looks good (env-less mode)");
    return;
  }

  const created = await callWithJwt("/api/v1/auth/keys", {
    method: "POST",
    body: { label, scopes: ["dashboard:read"] },
  });
  if (!created.ok) fail(`create key failed (${created.status}) ${JSON.stringify(created.data)}`);

  const oldKeyId = created.data?.keyId;
  const oldApiKey = created.data?.apiKey;
  if (!oldKeyId || !oldApiKey) fail("create key response missing keyId/apiKey");
  ok(`created baseline key ${oldKeyId}`);

  if (!(await callWithApiKey(oldApiKey, probePath)).ok) fail("old key probe failed before rotation");
  ok("old key accepted before rotation");

  const rotated = await callWithJwt(`/api/v1/auth/keys/${oldKeyId}/rotate`, {
    method: "POST",
    body: { label: `${label}-next`, gracePeriodMinutes },
  });
  if (!rotated.ok) fail(`rotate failed (${rotated.status}) ${JSON.stringify(rotated.data)}`);

  const newKeyId = rotated.data?.newKeyId;
  const newApiKey = rotated.data?.apiKey;
  if (!newKeyId || !newApiKey) fail("rotate response missing newKeyId/apiKey");
  ok(`rotated to new key ${newKeyId}`);

  if (!(await callWithApiKey(oldApiKey, probePath)).ok) fail("old key should work during grace");
  if (!(await callWithApiKey(newApiKey, probePath)).ok) fail("new key should work during grace");
  ok("zero-downtime overlap confirmed (old + new key accepted during grace)");

  const finalized = await callWithJwt(`/api/v1/auth/keys/${oldKeyId}/finalize-rotation`, { method: "POST" });
  if (!finalized.ok) fail(`finalize failed (${finalized.status}) ${JSON.stringify(finalized.data)}`);
  ok("finalized rotation");

  if ((await callWithApiKey(oldApiKey, probePath)).ok) fail("old key should fail after finalize");
  if (!(await callWithApiKey(newApiKey, probePath)).ok) fail("new key should still work after finalize");
  ok("post-finalize behavior confirmed (old denied, new accepted)");

  const cleanup = await callWithJwt(`/api/v1/auth/keys/${newKeyId}`, { method: "DELETE" });
  if (cleanup.ok) ok("cleanup: rotated key revoked");

  console.log("🎯 Rotation validation complete");
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
