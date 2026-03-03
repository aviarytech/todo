import { test, expect } from "@playwright/test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_PERF_FIXTURE, loadPerfFixtureFromEnv } from "./fixtures/mission-control-perf-fixture";

test.describe("mission-control perf fixture parser", () => {
  test("returns hardened defaults when env path is missing", () => {
    expect(loadPerfFixtureFromEnv({})).toEqual(DEFAULT_PERF_FIXTURE);
  });

  test("loads valid fixture and applies seededListCount fallback from listOpenRuns", () => {
    const dir = mkdtempSync(join(tmpdir(), "mc-perf-fixture-"));
    const fixturePath = join(dir, "fixture.json");

    try {
      writeFileSync(
        fixturePath,
        JSON.stringify({
          listOpenRuns: 10,
          listOpenP95Ms: 500,
          activityOpenRuns: 8,
          activityOpenP95Ms: 700,
          itemsPerList: 40,
        }),
      );

      const fixture = loadPerfFixtureFromEnv({ MISSION_CONTROL_FIXTURE_PATH: fixturePath });
      expect(fixture.seededListCount).toBe(10);
      expect(fixture.itemsPerList).toBe(40);
      expect(fixture.listOpenRuns).toBe(10);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("rejects runaway production seeding plans", () => {
    const dir = mkdtempSync(join(tmpdir(), "mc-perf-fixture-"));
    const fixturePath = join(dir, "fixture.json");

    try {
      writeFileSync(
        fixturePath,
        JSON.stringify({
          seededListCount: 100,
          itemsPerList: 100,
        }),
      );

      expect(() => loadPerfFixtureFromEnv({ MISSION_CONTROL_FIXTURE_PATH: fixturePath })).toThrow(
        /seededListCount \* itemsPerList must be <= 3000/i,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
