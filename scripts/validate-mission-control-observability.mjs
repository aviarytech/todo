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

const metricsPath = "docs/mission-control/phase1-observability-metrics.json";
const dashboardPath = "docs/mission-control/phase1-observability-dashboard-config.json";

const metrics = readJson(metricsPath);
const dashboard = readJson(dashboardPath);

if (!Array.isArray(metrics.metrics) || metrics.metrics.length === 0) {
  fail(`${metricsPath} must contain a non-empty metrics array`);
  process.exit(process.exitCode ?? 1);
}

if (!Array.isArray(dashboard.dashboard?.panels) || dashboard.dashboard.panels.length === 0) {
  fail(`${dashboardPath} must contain dashboard.panels`);
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

const normalizeMetricRef = (metricRef) => String(metricRef)
  .split("/")
  .map((part) => part.trim())
  .filter(Boolean);

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

const missingInDashboard = [...metricAlertNames].filter((name) => !dashboardAlertNames.has(name));
const missingInMetrics = [...dashboardAlertNames].filter((name) => !metricAlertNames.has(name));

if (missingInDashboard.length > 0) {
  fail(`Alerts declared in metrics but missing in dashboard config: ${missingInDashboard.join(", ")}`);
}
if (missingInMetrics.length > 0) {
  fail(`Alerts declared in dashboard config but missing in metrics catalog: ${missingInMetrics.join(", ")}`);
}
if (missingInDashboard.length === 0 && missingInMetrics.length === 0) {
  pass(`Alert definitions are in sync (${dashboardAlertNames.size} total)`);
}

if (process.exitCode && process.exitCode !== 0) {
  console.error("Mission Control observability validation failed.");
  process.exit(process.exitCode);
}

console.log("Mission Control observability validation passed.");
