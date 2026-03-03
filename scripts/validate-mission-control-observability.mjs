#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readJson(path) {
  return JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8"));
}

function unique(values) {
  return new Set(values);
}

function fail(message) {
  console.error(`❌ ${message}`);
  process.exitCode = 1;
}

function pass(message) {
  console.log(`✅ ${message}`);
}

function normalizeMetricRef(metricRef) {
  return String(metricRef)
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeRouteList(routeList) {
  return [...new Set((routeList ?? []).map((value) => String(value).trim()).filter(Boolean))].sort();
}

const metricsPath = "docs/mission-control/phase1-observability-metrics.json";
const dashboardPath = "docs/mission-control/phase1-observability-dashboard-config.json";
const routingPath = "docs/mission-control/phase1-observability-alert-routing.json";

const metrics = readJson(metricsPath);
const dashboard = readJson(dashboardPath);
const routing = readJson(routingPath);

if (!Array.isArray(metrics.metrics) || metrics.metrics.length === 0) {
  fail(`${metricsPath} must contain a non-empty metrics array`);
  process.exit(process.exitCode ?? 1);
}

if (!Array.isArray(dashboard.dashboard?.panels) || dashboard.dashboard.panels.length === 0) {
  fail(`${dashboardPath} must contain dashboard.panels`);
  process.exit(process.exitCode ?? 1);
}

if (!Array.isArray(routing.alerts) || routing.alerts.length === 0) {
  fail(`${routingPath} must contain alerts`);
  process.exit(process.exitCode ?? 1);
}

const metricNames = metrics.metrics.map((m) => m.name);
const uniqueNames = unique(metricNames);
if (uniqueNames.size !== metricNames.length) {
  const dupes = metricNames.filter((name, index) => metricNames.indexOf(name) !== index);
  fail(`Duplicate metric names found: ${[...new Set(dupes)].join(", ")}`);
} else {
  pass(`Metric catalog has ${metricNames.length} unique metrics`);
}

const chartMetrics = dashboard.dashboard.panels
  .flatMap((panel) => panel.charts ?? [])
  .flatMap((chart) => normalizeMetricRef(chart.metric))
  .filter(Boolean);

const missingFromCatalog = [...new Set(chartMetrics.filter((name) => !uniqueNames.has(name)))];
if (missingFromCatalog.length > 0) {
  fail(`Dashboard references metrics missing from catalog: ${missingFromCatalog.join(", ")}`);
} else {
  pass("Dashboard chart metrics are all declared in metric catalog");
}

const metricAlertNames = new Set((metrics.alerts ?? []).map((a) => a.name));
const dashboardAlertNames = new Set((dashboard.alerts ?? []).map((a) => a.name));
const routingAlertNames = new Set((routing.alerts ?? []).map((a) => a.name));

const missingInDashboard = [...metricAlertNames].filter((name) => !dashboardAlertNames.has(name));
const missingInMetrics = [...dashboardAlertNames].filter((name) => !metricAlertNames.has(name));
const missingInRouting = [...metricAlertNames].filter((name) => !routingAlertNames.has(name));

if (missingInDashboard.length > 0) {
  fail(`Alerts declared in metrics but missing in dashboard config: ${missingInDashboard.join(", ")}`);
}
if (missingInMetrics.length > 0) {
  fail(`Alerts declared in dashboard config but missing in metrics catalog: ${missingInMetrics.join(", ")}`);
}
if (missingInRouting.length > 0) {
  fail(`Alerts declared in metrics but missing in routing config: ${missingInRouting.join(", ")}`);
}
if (missingInDashboard.length === 0 && missingInMetrics.length === 0 && missingInRouting.length === 0) {
  pass(`Alert definitions are in sync (${metricAlertNames.size} total)`);
}

const placeholderTokens = ["internal-dev-channel", "on-call-channel", "pager"];
const routes = (dashboard.alerts ?? []).flatMap((a) => [
  ...(a.route?.staging ?? []),
  ...(a.route?.production ?? []),
]);

const hasPlaceholder = routes.some((r) => placeholderTokens.includes(String(r)));
if (hasPlaceholder) {
  fail("Dashboard alert routes still contain placeholder values");
} else {
  pass("Dashboard alert routes are concrete (non-placeholder)");
}

const severityAllowed = new Set(["low", "medium", "high", "critical"]);
for (const alert of dashboard.alerts ?? []) {
  if (!severityAllowed.has(String(alert.severity))) {
    fail(`Dashboard alert ${alert.name} has invalid severity: ${alert.severity}`);
  }
  if (!alert.condition || typeof alert.condition !== "string") {
    fail(`Dashboard alert ${alert.name} missing condition expression`);
  }
}
pass("Dashboard alert sanity checks passed");

for (const alert of metrics.alerts ?? []) {
  if (!/^[0-9]+m$/.test(String(alert.window ?? ""))) {
    fail(`Metrics alert ${alert.name} has invalid window format: ${alert.window}`);
  }
}
pass("Metrics alert windows are normalized");

const endpointCandidates = [
  routing.routing?.staging?.channel,
  routing.routing?.staging?.pager,
  routing.routing?.production?.channel,
  routing.routing?.production?.pager,
]
  .map((value) => String(value ?? "").trim())
  .filter(Boolean);
const endpointCatalog = new Set(endpointCandidates);

if (!endpointCatalog.size) {
  fail("Routing endpoint catalog is empty (routing.staging/production channel|pager)");
}

const allowedSchemes = new Set(["slack", "pagerduty"]);
for (const endpoint of endpointCatalog) {
  const [scheme] = endpoint.split("://");
  if (!allowedSchemes.has(scheme)) {
    fail(`Unsupported routing endpoint scheme: ${endpoint}`);
  }
}
if (endpointCatalog.size > 0) {
  pass(`Routing endpoint catalog validated (${endpointCatalog.size} endpoints)`);
}

for (const alert of routing.alerts ?? []) {
  if (!Array.isArray(alert.route?.staging) || alert.route.staging.length === 0) {
    fail(`Routing alert ${alert.name} missing staging route`);
  }
  if (!Array.isArray(alert.route?.production) || alert.route.production.length === 0) {
    fail(`Routing alert ${alert.name} missing production route`);
  }

  const inDashboard = (dashboard.alerts ?? []).find((a) => a.name === alert.name);
  if (inDashboard && String(inDashboard.severity) !== String(alert.severity)) {
    fail(`Severity mismatch for ${alert.name}: dashboard=${inDashboard.severity} routing=${alert.severity}`);
  }

  const routingStaging = normalizeRouteList(alert.route?.staging);
  const routingProduction = normalizeRouteList(alert.route?.production);

  for (const target of [...routingStaging, ...routingProduction]) {
    if (!endpointCatalog.has(target)) {
      fail(`Routing alert ${alert.name} references unprovisioned target: ${target}`);
    }
  }

  if (inDashboard) {
    const dashboardStaging = normalizeRouteList(inDashboard.route?.staging);
    const dashboardProduction = normalizeRouteList(inDashboard.route?.production);

    if (JSON.stringify(dashboardStaging) !== JSON.stringify(routingStaging)) {
      fail(`Staging route mismatch for ${alert.name}: dashboard=${dashboardStaging.join("|")} routing=${routingStaging.join("|")}`);
    }
    if (JSON.stringify(dashboardProduction) !== JSON.stringify(routingProduction)) {
      fail(`Production route mismatch for ${alert.name}: dashboard=${dashboardProduction.join("|")} routing=${routingProduction.join("|")}`);
    }

    if (String(alert.severity) === "critical") {
      const hasPagerDuty = routingProduction.some((target) => target.startsWith("pagerduty://"));
      if (!hasPagerDuty) {
        fail(`Critical alert ${alert.name} must include a pagerduty:// production route`);
      }
    }
  }
}
pass("Routing config includes staging and production targets for each alert");
pass("Alert routes match between dashboard and routing config");

if (process.exitCode && process.exitCode !== 0) {
  console.error("Mission Control observability validation failed.");
  process.exit(process.exitCode);
}

console.log("Mission Control observability validation passed.");
