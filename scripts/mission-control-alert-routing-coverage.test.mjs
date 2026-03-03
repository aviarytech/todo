import test from "node:test";
import assert from "node:assert/strict";

import { validateEscalationChannelCoverage } from "./lib/mission-control-alert-routing-coverage.mjs";

test("passes when high/critical alerts include Slack + PagerDuty in production", () => {
  const errors = validateEscalationChannelCoverage({
    alerts: [
      {
        name: "phase1_mutation_error_rate_high",
        severity: "high",
        route: {
          production: ["slack://aviary-oncall-mission-control", "pagerduty://mission-control-primary"],
        },
      },
      {
        name: "phase1_data_integrity_anomaly",
        severity: "critical",
        route: {
          production: ["pagerduty://mission-control-primary", "slack://aviary-oncall-mission-control"],
        },
      },
      {
        name: "phase1_info_only",
        severity: "low",
        route: {
          production: ["slack://aviary-oncall-mission-control"],
        },
      },
    ],
  });

  assert.deepEqual(errors, []);
});

test("reports missing PagerDuty and Slack coverage", () => {
  const errors = validateEscalationChannelCoverage({
    alerts: [
      {
        name: "phase1_agent_heartbeat_stale",
        severity: "high",
        route: {
          production: ["slack://aviary-oncall-mission-control"],
        },
      },
      {
        name: "phase1_run_control_failure",
        severity: "critical",
        route: {
          production: ["pagerduty://mission-control-primary"],
        },
      },
    ],
  });

  assert.equal(errors.length, 2);
  assert.match(errors[0], /missing PagerDuty/i);
  assert.match(errors[1], /missing Slack/i);
});

test("reports missing production routes for escalation severities", () => {
  const errors = validateEscalationChannelCoverage({
    alerts: [
      {
        name: "phase1_mutation_error_rate_high",
        severity: "high",
      },
    ],
  });

  assert.equal(errors.length, 1);
  assert.match(errors[0], /missing production routes/i);
});
