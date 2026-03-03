import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { TestInfo } from "@playwright/test";

export interface PerfGateResult {
  gate: "ac5a_list_open" | "ac5b_activity_open";
  p95Ms: number;
  thresholdMs: number;
  samplesMs: number[];
  fixturePath: string;
  seededListCount?: number;
  itemsPerList?: number;
}

export function computeP95(samples: number[]): number {
  const sorted = [...samples].sort((a, b) => a - b);
  const idx = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[Math.max(0, idx)] ?? 0;
}

export function writePerfGateResult(testInfo: TestInfo, result: PerfGateResult): string {
  const payload = {
    schema: "mission-control.perf-gate.v1",
    timestamp: new Date().toISOString(),
    status: result.p95Ms < result.thresholdMs ? "pass" : "fail",
    ...result,
    samplesMs: [...result.samplesMs].sort((a, b) => a - b),
    testId: testInfo.testId,
    title: testInfo.title,
    project: testInfo.project.name,
    retry: testInfo.retry,
  };

  const defaultPath = resolve(process.cwd(), "test-results", "mission-control-perf-gates.ndjson");
  const outPath = process.env.MISSION_CONTROL_PERF_REPORT_PATH
    ? resolve(process.cwd(), process.env.MISSION_CONTROL_PERF_REPORT_PATH)
    : defaultPath;

  mkdirSync(dirname(outPath), { recursive: true });
  appendFileSync(outPath, `${JSON.stringify(payload)}\n`, "utf8");

  testInfo.attachments.push({
    name: `perf-gate-${result.gate}`,
    contentType: "application/json",
    body: Buffer.from(JSON.stringify(payload, null, 2)),
  });

  return outPath;
}
