import { describe, expect, test } from "bun:test";
import { dedupeActivePresenceSessions, isSessionActive } from "./presenceSessions";

describe("presence session helpers", () => {
  test("isSessionActive uses strict expiresAt > now semantics", () => {
    expect(isSessionActive({ userDid: "did:a", sessionId: "s1", lastSeenAt: 100, expiresAt: 200 }, 199)).toBe(true);
    expect(isSessionActive({ userDid: "did:a", sessionId: "s1", lastSeenAt: 100, expiresAt: 200 }, 200)).toBe(false);
  });

  test("dedupes by userDid and keeps most recent active session", () => {
    const sessions = [
      { userDid: "did:a", sessionId: "s-old", lastSeenAt: 100, expiresAt: 500 },
      { userDid: "did:a", sessionId: "s-new", lastSeenAt: 300, expiresAt: 600 },
      { userDid: "did:b", sessionId: "s-b", lastSeenAt: 250, expiresAt: 700 },
    ];

    expect(dedupeActivePresenceSessions(sessions, 200)).toEqual([
      { userDid: "did:a", sessionId: "s-new", lastSeenAt: 300, expiresAt: 600 },
      { userDid: "did:b", sessionId: "s-b", lastSeenAt: 250, expiresAt: 700 },
    ]);
  });

  test("drops expired sessions before dedupe", () => {
    const sessions = [
      { userDid: "did:a", sessionId: "s-expired", lastSeenAt: 100, expiresAt: 120 },
      { userDid: "did:a", sessionId: "s-active", lastSeenAt: 130, expiresAt: 300 },
      { userDid: "did:b", sessionId: "s-expired-b", lastSeenAt: 150, expiresAt: 150 },
    ];

    expect(dedupeActivePresenceSessions(sessions, 150)).toEqual([
      { userDid: "did:a", sessionId: "s-active", lastSeenAt: 130, expiresAt: 300 },
    ]);
  });
});
