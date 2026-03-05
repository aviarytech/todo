import test from "node:test";
import assert from "node:assert/strict";

import {
  selectRunControlTargets,
  validateAlertRoutingReadiness,
} from "./mission-control-readiness-drill.mjs";

test("selectRunControlTargets picks primary and optional kill run IDs", () => {
  assert.deepEqual(selectRunControlTargets({ runs: [{ _id: "run1" }, { _id: "run2" }] }), {
    primaryRunId: "run1",
    killRunId: "run2",
  });

  assert.deepEqual(selectRunControlTargets({ runs: [{ _id: "run1" }] }), {
    primaryRunId: "run1",
    killRunId: null,
  });

  assert.deepEqual(selectRunControlTargets({ runs: [] }), {
    primaryRunId: null,
    killRunId: null,
  });
});

test("validateAlertRoutingReadiness passes when production has slack + pagerduty", () => {
  const errors = validateAlertRoutingReadiness({
    routing: {
      production: {
        channel: "slack://aviary-oncall-mission-control",
        pager: "pagerduty://mission-control-primary",
      },
    },
    alerts: [
      {
        name: "phase1_run_control_failure",
        severity: "critical",
        route: {
          production: [
            "slack://aviary-oncall-mission-control",
            "pagerduty://mission-control-primary",
          ],
        },
      },
    ],
  });

  assert.deepEqual(errors, []);
});

test("validateAlertRoutingReadiness flags missing pagerduty production routes", () => {
  const errors = validateAlertRoutingReadiness({
    routing: {
      production: {
        channel: "slack://aviary-oncall-mission-control",
        pager: "pagerduty://mission-control-primary",
      },
    },
    alerts: [
      {
        name: "phase1_subscription_latency_p95_high",
        severity: "high",
        route: {
          production: ["slack://aviary-oncall-mission-control"],
        },
      },
    ],
  });

  assert.equal(errors.length, 1);
  assert.match(errors[0], /missing pagerduty production route/);
});

test("validateAlertRoutingReadiness flags invalid production endpoint schemes", () => {
  const errors = validateAlertRoutingReadiness({
    routing: {
      production: {
        channel: "webhook://ops-channel",
        pager: "email://oncall@example.com",
      },
    },
    alerts: [],
  });

  assert.equal(errors.length, 2);
  assert.match(errors[0], /routing\.production\.channel/);
  assert.match(errors[1], /routing\.production\.pager/);
});
