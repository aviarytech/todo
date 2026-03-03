export type MemorySyncRow<TId = string> = {
  _id: TId;
  ownerDid: string;
  authorDid: string;
  externalId?: string;
  title: string;
  content: string;
  tags?: string[];
  source?: "manual" | "openclaw" | "clawboot" | "import" | "api";
  sourceRef?: string;
  updatedAt: number;
  externalUpdatedAt?: number;
  syncStatus?: "synced" | "conflict" | "pending";
  conflictNote?: string;
};

export function selectMemoryChangesSince<TId = string>(
  rows: MemorySyncRow<TId>[],
  since: number,
  limit: number,
) {
  const changes = rows
    .filter((row) => row.updatedAt > since)
    .sort((a, b) => a.updatedAt - b.updatedAt)
    .slice(0, limit)
    .map((row) => ({
      id: row._id,
      ownerDid: row.ownerDid,
      authorDid: row.authorDid,
      externalId: row.externalId,
      title: row.title,
      content: row.content,
      tags: row.tags,
      source: row.source,
      sourceRef: row.sourceRef,
      updatedAt: row.updatedAt,
      externalUpdatedAt: row.externalUpdatedAt,
      syncStatus: row.syncStatus,
      conflictNote: row.conflictNote,
    }));

  return {
    changes,
    cursor: changes.length ? changes[changes.length - 1].updatedAt : since,
  };
}
