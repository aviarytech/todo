import { readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

export interface PerfFixture {
  listOpenRuns: number;
  listOpenP95Ms: number;
  activityOpenRuns: number;
  activityOpenP95Ms: number;
  itemsPerList: number;
  seededListCount: number;
}

export const DEFAULT_PERF_FIXTURE: PerfFixture = {
  listOpenRuns: 6,
  listOpenP95Ms: 500,
  activityOpenRuns: 6,
  activityOpenP95Ms: 700,
  itemsPerList: 1,
  seededListCount: 6,
};

const HARD_LIMITS = {
  runs: 100,
  latencyMs: 10_000,
  itemsPerList: 300,
  seededListCount: 100,
};

const ENV_OVERRIDES: Array<{ env: keyof NodeJS.ProcessEnv; field: keyof PerfFixture }> = [
  { env: "MISSION_CONTROL_PERF_LIST_OPEN_RUNS", field: "listOpenRuns" },
  { env: "MISSION_CONTROL_PERF_LIST_OPEN_P95_MS", field: "listOpenP95Ms" },
  { env: "MISSION_CONTROL_PERF_ACTIVITY_OPEN_RUNS", field: "activityOpenRuns" },
  { env: "MISSION_CONTROL_PERF_ACTIVITY_OPEN_P95_MS", field: "activityOpenP95Ms" },
  { env: "MISSION_CONTROL_PERF_ITEMS_PER_LIST", field: "itemsPerList" },
  { env: "MISSION_CONTROL_PERF_SEEDED_LIST_COUNT", field: "seededListCount" },
];

function asBoundedPositiveInt(value: unknown, fieldName: string, fallback: number, max: number): number {
  if (value === undefined) return fallback;

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`[mission-control/perf-fixture] ${fieldName} must be a finite number.`);
  }

  const asInt = Math.floor(value);
  if (asInt <= 0) {
    throw new Error(`[mission-control/perf-fixture] ${fieldName} must be > 0.`);
  }

  if (asInt > max) {
    throw new Error(`[mission-control/perf-fixture] ${fieldName} must be <= ${max}. Received ${asInt}.`);
  }

  return asInt;
}

function getFieldLimit(fieldName: keyof PerfFixture) {
  if (fieldName === "listOpenRuns" || fieldName === "activityOpenRuns") return HARD_LIMITS.runs;
  if (fieldName === "listOpenP95Ms" || fieldName === "activityOpenP95Ms") return HARD_LIMITS.latencyMs;
  if (fieldName === "itemsPerList") return HARD_LIMITS.itemsPerList;
  return HARD_LIMITS.seededListCount;
}

function parsePerfFixture(rawFixture: unknown): PerfFixture {
  if (!rawFixture || typeof rawFixture !== "object") {
    throw new Error("[mission-control/perf-fixture] fixture JSON must be an object.");
  }

  const fixture = rawFixture as Record<string, unknown>;

  const parsed: PerfFixture = {
    listOpenRuns: asBoundedPositiveInt(
      fixture.listOpenRuns,
      "listOpenRuns",
      DEFAULT_PERF_FIXTURE.listOpenRuns,
      HARD_LIMITS.runs,
    ),
    listOpenP95Ms: asBoundedPositiveInt(
      fixture.listOpenP95Ms,
      "listOpenP95Ms",
      DEFAULT_PERF_FIXTURE.listOpenP95Ms,
      HARD_LIMITS.latencyMs,
    ),
    activityOpenRuns: asBoundedPositiveInt(
      fixture.activityOpenRuns,
      "activityOpenRuns",
      DEFAULT_PERF_FIXTURE.activityOpenRuns,
      HARD_LIMITS.runs,
    ),
    activityOpenP95Ms: asBoundedPositiveInt(
      fixture.activityOpenP95Ms,
      "activityOpenP95Ms",
      DEFAULT_PERF_FIXTURE.activityOpenP95Ms,
      HARD_LIMITS.latencyMs,
    ),
    itemsPerList: asBoundedPositiveInt(
      fixture.itemsPerList,
      "itemsPerList",
      DEFAULT_PERF_FIXTURE.itemsPerList,
      HARD_LIMITS.itemsPerList,
    ),
    seededListCount: asBoundedPositiveInt(
      fixture.seededListCount,
      "seededListCount",
      typeof fixture.listOpenRuns === "number" ? Math.floor(fixture.listOpenRuns) : DEFAULT_PERF_FIXTURE.seededListCount,
      HARD_LIMITS.seededListCount,
    ),
  };

  const totalSeededItems = parsed.seededListCount * parsed.itemsPerList;
  if (totalSeededItems > 3_000) {
    throw new Error(`[mission-control/perf-fixture] seededListCount * itemsPerList must be <= 3000. Received ${totalSeededItems}.`);
  }

  return parsed;
}

function applyEnvOverrides(base: PerfFixture, env: NodeJS.ProcessEnv): PerfFixture {
  const next = { ...base };

  for (const { env: envKey, field } of ENV_OVERRIDES) {
    const raw = env[envKey];
    if (raw === undefined || raw.trim() === "") continue;

    const parsed = Number(raw);
    next[field] = asBoundedPositiveInt(parsed, envKey, next[field], getFieldLimit(field));
  }

  const totalSeededItems = next.seededListCount * next.itemsPerList;
  if (totalSeededItems > 3_000) {
    throw new Error(`[mission-control/perf-fixture] seededListCount * itemsPerList must be <= 3000. Received ${totalSeededItems}.`);
  }

  return next;
}

export function loadPerfFixtureFromEnv(env: NodeJS.ProcessEnv = process.env): PerfFixture {
  const fixturePath = env.MISSION_CONTROL_FIXTURE_PATH;
  let fixture = DEFAULT_PERF_FIXTURE;

  if (fixturePath) {
    const absolutePath = isAbsolute(fixturePath) ? fixturePath : resolve(process.cwd(), fixturePath);

    let raw: string;
    try {
      raw = readFileSync(absolutePath, "utf8");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`[mission-control/perf-fixture] failed to read ${absolutePath}: ${message}`);
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`[mission-control/perf-fixture] invalid JSON in ${absolutePath}: ${message}`);
    }

    fixture = parsePerfFixture(parsedJson);
  }

  return applyEnvOverrides(fixture, env);
}
