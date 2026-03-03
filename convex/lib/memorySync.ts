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

export type SyncConflict = {
  reason: "local_newer" | "remote_newer" | "tie";
  localUpdatedAt: number;
  remoteUpdatedAt: number;
  localTitle: string;
  localContent: string;
  remoteTitle: string;
  remoteContent: string;
};

export type RemoteMemoryData = {
  title: string;
  content: string;
  externalUpdatedAt: number;
};

export type ConflictResolution = {
  winner: "local" | "remote";
  title: string;
  content: string;
};

/**
 * Detect if there's a conflict between local and remote memory versions.
 * Returns null if no conflict (remote is newer or content is identical).
 */
export function detectConflict<TId = string>(
  local: MemorySyncRow<TId>,
  remote: RemoteMemoryData,
): SyncConflict | null {
  const localUpdatedAt = local.updatedAt ?? 0;
  const remoteUpdatedAt = remote.externalUpdatedAt;
  
  // Content is identical - no conflict
  if (local.title === remote.title && local.content === remote.content) {
    return null;
  }
  
  // Remote is strictly newer - no conflict, just update
  if (remoteUpdatedAt > localUpdatedAt) {
    return null;
  }
  
  // Determine conflict reason
  let reason: SyncConflict["reason"];
  if (localUpdatedAt > remoteUpdatedAt) {
    reason = "local_newer";
  } else if (remoteUpdatedAt > localUpdatedAt) {
    reason = "remote_newer";
  } else {
    reason = "tie";
  }
  
  return {
    reason,
    localUpdatedAt,
    remoteUpdatedAt,
    localTitle: local.title,
    localContent: local.content,
    remoteTitle: remote.title,
    remoteContent: remote.content,
  };
}

/**
 * Resolve a conflict using Last-Write-Wins strategy.
 * Local bias on tie (favors user's explicit edits).
 */
export function resolveConflictLWW(conflict: SyncConflict): ConflictResolution {
  // Remote strictly newer wins
  if (conflict.remoteUpdatedAt > conflict.localUpdatedAt) {
    return {
      winner: "remote",
      title: conflict.remoteTitle,
      content: conflict.remoteContent,
    };
  }
  
  // Local wins (including on tie - local bias)
  return {
    winner: "local",
    title: conflict.localTitle,
    content: conflict.localContent,
  };
}

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
