import test from "node:test";
import assert from "node:assert/strict";

import {
  requiredSchemesForSeverity,
  routeSchemes,
  validateSeverityRoutePolicy,
} from "./mission-control-alert-severity-policy.mjs";

test("required schemes by severity are stable", () => {
  assert.deepEqual(requiredSchemesForSeverity("low"), ["slack"]);
  assert.deepEqual(requiredSchemesForSeverity("medium"), ["slack"]);
  assert.deepEqual(requiredSchemesForSeverity("high"), ["slack", "pagerduty"]);
  assert.deepEqual(requiredSchemesForSeverity("critical"), ["slack", "pagerduty"]);
});

test("route schemes normalize and dedupe", () => {
  const schemes = routeSchemes([
    "slack://aviary-oncall-mission-control",
    " pagerduty://mission-control-primary ",
    "slack://aviary-oncall-mission-control",
  ]);

  assert.deepEqual(schemes, ["pagerduty", "slack"]);
});

test("high severity requires pagerduty in production", () => {
  const errors = validateSeverityRoutePolicy({
    name: "phase1_subscription_latency_p95_high",
    severity: "high",
    productionRoutes: ["slack://aviary-oncall-mission-control"],
  });

  assert.equal(errors.length, 1);
  assert.match(errors[0], /missing production route scheme\(s\): pagerduty/);
});

test("critical severity passes with slack + pagerduty", () => {
  const errors = validateSeverityRoutePolicy({
    name: "phase1_run_control_failure",
    severity: "critical",
    productionRoutes: [
      "slack://aviary-oncall-mission-control",
      "pagerduty://mission-control-primary",
    ],
  });

  assert.deepEqual(errors, []);
});

test("unsupported severity reports an error", () => {
  const errors = validateSeverityRoutePolicy({
    name: "phase1_unknown",
    severity: "sev0",
    productionRoutes: ["slack://aviary-oncall-mission-control"],
  });

  assert.equal(errors.length, 1);
  assert.match(errors[0], /unsupported severity/);
});
