import { describe, expect, test } from "bun:test";

import { selectMemoryChangesSince, type MemorySyncRow } from "./memorySync";

function row(updatedAt: number, id?: string): MemorySyncRow<string> {
  return {
    _id: id ?? `m-${updatedAt}`,
    ownerDid: "did:example:owner",
    authorDid: "did:example:author",
    title: `t-${updatedAt}`,
    content: `c-${updatedAt}`,
    updatedAt,
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
