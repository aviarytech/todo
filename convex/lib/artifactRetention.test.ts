import { describe, expect, test } from "bun:test";
import { artifactFingerprint, clampRetentionDays, computeRetentionCutoff, isValidArtifactRef, normalizeArtifactRefs, selectStaleArtifacts, shouldInsertDeletionLog } from "./artifactRetention";

describe("artifact retention helpers", () => {
  test("clamps retention day boundaries to [1, 365]", () => {
    expect(clampRetentionDays(undefined, 30)).toBe(30);
    expect(clampRetentionDays(0, 30)).toBe(1);
    expect(clampRetentionDays(999, 30)).toBe(365);
  });

  test("uses strict < cutoff semantics", () => {
    const cutoff = computeRetentionCutoff(1_000_000, 1);
    const artifacts = [
      { type: "log" as const, ref: "old", createdAt: cutoff - 1 },
      { type: "log" as const, ref: "edge", createdAt: cutoff },
    ];
    expect(selectStaleArtifacts(artifacts, cutoff).map((a) => a.ref)).toEqual(["old"]);
  });

  test("normalizes artifact schema", () => {
    expect(isValidArtifactRef({ type: "log", ref: "ok", createdAt: 1 })).toBe(true);
    expect(normalizeArtifactRefs([{ type: "log", ref: "ok", createdAt: 1 }, { type: "oops", ref: "no", createdAt: 2 }])).toEqual([
      { type: "log", ref: "ok", createdAt: 1 },
    ]);
  });

  test("fingerprint supports idempotency checks", () => {
    const a = [{ type: "log" as const, ref: "1", createdAt: 1 }, { type: "file" as const, ref: "2", createdAt: 2 }];
    const b = [...a].reverse();
    expect(artifactFingerprint(a)).toBe(artifactFingerprint(b));
    expect(shouldInsertDeletionLog(a, b)).toBe(false);
  });
});
