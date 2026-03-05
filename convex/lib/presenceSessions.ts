type PresenceSession = {
  _id?: string;
  _creationTime?: number;
  listId?: string;
  userDid: string;
  sessionId: string;
  lastSeenAt: number;
  expiresAt: number;
};

export function isSessionActive(session: PresenceSession, now: number) {
  return session.expiresAt > now;
}

export function dedupeActivePresenceSessions<T extends PresenceSession>(sessions: T[], now: number): T[] {
  const latestByUser = new Map<string, T>();

  for (const session of sessions) {
    if (!isSessionActive(session, now)) continue;

    const existing = latestByUser.get(session.userDid);
    if (!existing || session.lastSeenAt > existing.lastSeenAt) {
      latestByUser.set(session.userDid, session);
    }
  }

  return Array.from(latestByUser.values()).sort((a, b) => b.lastSeenAt - a.lastSeenAt);
}
