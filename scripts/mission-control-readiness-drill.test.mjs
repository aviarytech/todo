import test from "node:test";
import assert from "node:assert/strict";

import { selectRunControlTargets } from "./mission-control-readiness-drill.mjs";

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
