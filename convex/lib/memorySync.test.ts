import { describe, expect, test } from "bun:test";

import {
  selectMemoryChangesSince,
  detectConflict,
  resolveConflictLWW,
  type MemorySyncRow,
  type SyncConflict,
} from "./memorySync";

function row(updatedAt: number, id?: string, overrides?: Partial<MemorySyncRow<string>>): MemorySyncRow<string> {
  return {
    _id: id ?? `m-${updatedAt}`,
    ownerDid: "did:example:owner",
    authorDid: "did:example:author",
    title: `t-${updatedAt}`,
    content: `c-${updatedAt}`,
    updatedAt,
    ...overrides,
  };
}

describe("memory sync cursor semantics", () => {
  test("returns ascending updates with cursor at newest delivered item", () => {
    const rows = [row(400), row(300), row(200), row(100)];

    const result = selectMemoryChangesSince(rows, 0, 3);

    expect(result.changes.map((c) => c.updatedAt)).toEqual([100, 200, 300]);
    expect(result.cursor).toBe(300);
  });

  test("supports lossless paging with since+limit", () => {
    const rows = [row(500), row(400), row(300), row(200), row(100)];

    const page1 = selectMemoryChangesSince(rows, 0, 2);
    const page2 = selectMemoryChangesSince(rows, page1.cursor, 2);
    const page3 = selectMemoryChangesSince(rows, page2.cursor, 2);

    expect(page1.changes.map((c) => c.updatedAt)).toEqual([100, 200]);
    expect(page2.changes.map((c) => c.updatedAt)).toEqual([300, 400]);
    expect(page3.changes.map((c) => c.updatedAt)).toEqual([500]);
  });

  test("returns stable cursor when no changes exist", () => {
    const rows = [row(300), row(200), row(100)];

    const result = selectMemoryChangesSince(rows, 300, 50);

    expect(result.changes.length).toBe(0);
    expect(result.cursor).toBe(300);
  });
});

describe("conflict detection", () => {
  test("detects conflict when local is newer and content differs", () => {
    const local = row(2000, "m1", { title: "Local Title", content: "Local content" });
    const remote = { title: "Remote Title", content: "Remote content", externalUpdatedAt: 1000 };

    const conflict = detectConflict(local, remote);

    expect(conflict).not.toBeNull();
    expect(conflict?.reason).toBe("local_newer");
    expect(conflict?.localUpdatedAt).toBe(2000);
    expect(conflict?.remoteUpdatedAt).toBe(1000);
  });

  test("no conflict when remote is newer", () => {
    const local = row(1000, "m1", { title: "Local Title", content: "Local content" });
    const remote = { title: "Remote Title", content: "Remote content", externalUpdatedAt: 2000 };

    const conflict = detectConflict(local, remote);

    expect(conflict).toBeNull();
  });

  test("no conflict when content is identical", () => {
    const local = row(2000, "m1", { title: "Same Title", content: "Same content" });
    const remote = { title: "Same Title", content: "Same content", externalUpdatedAt: 1000 };

    const conflict = detectConflict(local, remote);

    expect(conflict).toBeNull();
  });

  test("conflict when only title differs", () => {
    const local = row(2000, "m1", { title: "Local Title", content: "Same content" });
    const remote = { title: "Remote Title", content: "Same content", externalUpdatedAt: 1000 };

    const conflict = detectConflict(local, remote);

    expect(conflict).not.toBeNull();
    expect(conflict?.reason).toBe("local_newer");
  });

  test("conflict when only content differs", () => {
    const local = row(2000, "m1", { title: "Same Title", content: "Local content" });
    const remote = { title: "Same Title", content: "Remote content", externalUpdatedAt: 1000 };

    const conflict = detectConflict(local, remote);

    expect(conflict).not.toBeNull();
  });
});

describe("LWW conflict resolution", () => {
  test("picks local when local is newer", () => {
    const conflict: SyncConflict = {
      reason: "local_newer",
      localUpdatedAt: 2000,
      remoteUpdatedAt: 1000,
      localTitle: "Local Title",
      localContent: "Local content",
      remoteTitle: "Remote Title",
      remoteContent: "Remote content",
    };

    const result = resolveConflictLWW(conflict);

    expect(result.winner).toBe("local");
    expect(result.title).toBe("Local Title");
    expect(result.content).toBe("Local content");
  });

  test("picks remote when remote is newer", () => {
    const conflict: SyncConflict = {
      reason: "remote_newer",
      localUpdatedAt: 1000,
      remoteUpdatedAt: 2000,
      localTitle: "Local Title",
      localContent: "Local content",
      remoteTitle: "Remote Title",
      remoteContent: "Remote content",
    };

    const result = resolveConflictLWW(conflict);

    expect(result.winner).toBe("remote");
    expect(result.title).toBe("Remote Title");
    expect(result.content).toBe("Remote content");
  });

  test("picks local on tie (local bias)", () => {
    const conflict: SyncConflict = {
      reason: "tie",
      localUpdatedAt: 1000,
      remoteUpdatedAt: 1000,
      localTitle: "Local Title",
      localContent: "Local content",
      remoteTitle: "Remote Title",
      remoteContent: "Remote content",
    };

    const result = resolveConflictLWW(conflict);

    expect(result.winner).toBe("local");
    expect(result.title).toBe("Local Title");
    expect(result.content).toBe("Local content");
  });
});

describe("bidirectional sync scenarios", () => {
  test("filters pending items for outbound sync", () => {
    const rows = [
      row(500, "m1", { syncStatus: "synced" }),
      row(400, "m2", { syncStatus: "pending" }),
      row(300, "m3", { syncStatus: "conflict" }),
      row(200, "m4", { syncStatus: "pending" }),
      row(100, "m5", { syncStatus: undefined }),
    ];

    const pending = rows.filter((r) => r.syncStatus === "pending");

    expect(pending.length).toBe(2);
    expect(pending.map((r) => r._id)).toEqual(["m2", "m4"]);
  });

  test("filters conflicts for resolution UI", () => {
    const rows = [
      row(500, "m1", { syncStatus: "synced" }),
      row(400, "m2", { syncStatus: "conflict", conflictNote: "LWW skipped" }),
      row(300, "m3", { syncStatus: "conflict", conflictNote: "Preserved copy" }),
      row(200, "m4", { syncStatus: "pending" }),
    ];

    const conflicts = rows.filter((r) => r.syncStatus === "conflict");

    expect(conflicts.length).toBe(2);
    expect(conflicts.every((c) => c.conflictNote !== undefined)).toBe(true);
  });

  test("tracks external IDs for round-trip sync", () => {
    const rows = [
      row(500, "m1", { externalId: "ext-1", syncStatus: "synced" }),
      row(400, "m2", { externalId: undefined, syncStatus: "pending" }),
      row(300, "m3", { externalId: "ext-3", syncStatus: "synced" }),
    ];

    const withExternal = rows.filter((r) => r.externalId !== undefined);
    const needsExternal = rows.filter((r) => r.externalId === undefined);

    expect(withExternal.length).toBe(2);
    expect(needsExternal.length).toBe(1);
    expect(needsExternal[0]._id).toBe("m2");
  });
});
