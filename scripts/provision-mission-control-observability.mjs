#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const env = process.argv[2] ?? "staging";
if (!["staging", "production"].includes(env)) {
  console.error(`Usage: node scripts/provision-mission-control-observability.mjs <staging|production>`);
  process.exit(1);
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8"));
}

const dashboardPath = "docs/mission-control/phase1-observability-dashboard-config.json";
const routingPath = "docs/mission-control/phase1-observability-alert-routing.json";
const outDir = resolve(process.cwd(), "docs/mission-control/provisioned");
const outPath = resolve(outDir, `phase1-observability-${env}.json`);

const dashboard = readJson(dashboardPath);
const routing = readJson(routingPath);

const environmentDefaults = routing.routing?.[env] ?? {};

const provisioned = {
  version: 1,
  phase: "phase1",
  environment: env,
  generatedAt: new Date().toISOString(),
  source: {
    dashboard: dashboardPath,
    routing: routingPath,
  },
  dashboard: dashboard.dashboard,
  policies: {
    escalation: environmentDefaults.escalation ?? null,
    acknowledgement: environmentDefaults.acknowledgement ?? {
      required: false,
      incidentNoteRequired: false,
    },
  },
  alerts: (dashboard.alerts ?? []).map((alert) => ({
    name: alert.name,
    severity: alert.severity,
    condition: alert.condition,
    route: alert.route?.[env] ?? [],
    runbook: "docs/mission-control/phase1-observability-runbook.md",
  })),
};

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, `${JSON.stringify(provisioned, null, 2)}\n`, "utf8");

console.log(`✅ Wrote ${outPath}`);
console.log(`   alerts: ${provisioned.alerts.length}`);
console.log(`   acknowledgement.required: ${Boolean(provisioned.policies.acknowledgement?.required)}`);
