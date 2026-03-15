/**
 * Shared Convex WebSocket mock for E2E tests.
 *
 * Implements the minimal Convex sync-protocol needed to drive the app
 * without a live backend.  Import mockConvexWebSocket and MOCK_LIST_ID
 * from this module in any spec file that needs a Convex backend.
 */

import type { Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Base64 encoding of 8 zero bytes (little-endian u64 = 0).
 * Used as the `ts` field in Convex Transition version objects.
 *
 * Derivation: Long.fromNumber(0).toBytesLE() = [0,0,0,0,0,0,0,0]
 *             btoa(String.fromCharCode(...)) = "AAAAAAAAAAA="
 */
const TS_ZERO = "AAAAAAAAAAA=";

/**
 * Matches the Convex sync WebSocket URL: ws[s]://{host}/api/{version}/sync
 * Works for both cloud (convex.cloud) and local dev (127.0.0.1:321x).
 */
const CONVEX_WS_URL = /\/api\/[^/]+\/sync$/;

/** List ID used by the shared mock when pre-seeding a single list. */
export const MOCK_LIST_ID = "lists:mocklist0";

/** User DID used by the shared mock. */
export const MOCK_USER_DID = "did:webvh:e2e:test";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MockItem {
  name: string;
  checked?: boolean;
}

interface MutableMockItem {
  _id: string;
  _creationTime: number;
  listId: string;
  name: string;
  checked: boolean;
  createdByDid: string;
  checkedByDid: string | null;
  createdAt: number;
  checkedAt: number | null;
  order: number;
}

// ---------------------------------------------------------------------------
// Convex WebSocket mock
// ---------------------------------------------------------------------------

/**
 * Minimal Convex sync-protocol WebSocket mock.
 *
 * Handles:
 *   - Connect / Authenticate  → no response needed
 *   - ModifyQuerySet          → returns deterministic query results
 *   - Mutation                → succeeds or fails with PLAN_LIMIT based on options
 *
 * Tracks mutable item state and pushes QueryUpdated after mutations that
 * affect items (checkItem, uncheckItem, removeItem) to simulate Convex
 * real-time reactivity.
 *
 * Query handlers (ordered to avoid substring collisions):
 *   getUserLists, getUserByTurnkeyId, getUserSubscription, getUserCategories,
 *   getUserTemplates, getListAnchors, getItemAnchors, getListItems, getList,
 *   getPublicationStatus, getUsersByDids
 */
export async function mockConvexWebSocket(
  page: Page,
  {
    existingListCount = 0,
    failCreateList = false,
    existingItems = [] as MockItem[],
    mockListId = MOCK_LIST_ID,
  }: {
    /** Number of lists the mock "already has" for the authenticated user */
    existingListCount?: number;
    /** When true, the next createList mutation returns a PLAN_LIMIT error */
    failCreateList?: boolean;
    /** Pre-seeded items for the mock list (used by items/sharing tests) */
    existingItems?: MockItem[];
    /** Override the mock list ID (default: MOCK_LIST_ID) */
    mockListId?: string;
  } = {},
): Promise<void> {
  await page.routeWebSocket(CONVEX_WS_URL, (ws) => {
    // Mutable item state — mirrors what the server would track.
    const mutableItems: MutableMockItem[] = existingItems.map((item, i) => ({
      _id: `items:mockitem${i}`,
      _creationTime: Date.now() - i * 60_000,
      listId: mockListId,
      name: item.name,
      checked: item.checked ?? false,
      createdByDid: MOCK_USER_DID,
      checkedByDid: null,
      createdAt: Date.now() - i * 60_000,
      checkedAt: null,
      order: i,
    }));

    // Track the queryId for getListItems so we can push updates after mutations.
    let getListItemsQueryId: number | null = null;
    // Track version counter for Transition messages.
    let querySetVersion = 1;

    /**
     * Push an empty Transition to advance the querySet version.
     *
     * Convex v1.x resolves mutation promises only after receiving a Transition
     * whose endVersion.ts >= the mutation's committed ts.  For mutations that
     * don't change any subscribed queries (e.g. createList on the home page),
     * no QueryUpdated modification is needed — an empty Transition is enough.
     */
    function pushTransition(extraModifications: unknown[] = []) {
      const version = ++querySetVersion;
      ws.send(
        JSON.stringify({
          type: "Transition",
          startVersion: { querySet: version - 1, ts: TS_ZERO, identity: 0 },
          endVersion: { querySet: version, ts: TS_ZERO, identity: 0 },
          modifications: extraModifications,
        }),
      );
    }

    /** Push an updated getListItems result to the client. */
    function pushItemsUpdate() {
      if (getListItemsQueryId === null) {
        // No items query subscribed — just advance the version so the
        // mutation promise resolves (Convex v1.x confirmation requirement).
        pushTransition();
        return;
      }
      pushTransition([
        {
          type: "QueryUpdated",
          queryId: getListItemsQueryId,
          value: [...mutableItems],
          logLines: [],
        },
      ]);
    }

    ws.onMessage((rawMessage) => {
      try {
        const text =
          typeof rawMessage === "string"
            ? rawMessage
            : Buffer.from(rawMessage as ArrayBuffer).toString("utf8");
        const msg = JSON.parse(text) as {
          type: string;
          baseVersion?: number;
          newVersion?: number;
          modifications?: Array<{
            type: string;
            queryId: number;
            udfPath?: string;
            args?: unknown[];
          }>;
          requestId?: number;
          udfPath?: string;
          args?: unknown[];
        };

        switch (msg.type) {
          case "Connect":
          case "Authenticate":
            // The app does not use Convex server-side auth — nothing to do.
            break;

          case "ModifyQuerySet": {
            const { baseVersion = 0, newVersion = 1, modifications = [] } = msg;

            // Always advance the tracked version so pushItemsUpdate() uses correct startVersion.
            querySetVersion = newVersion;

            // Track queryId for getListItems so we can push reactive updates after mutations.
            for (const mod of modifications) {
              if (mod.type === "Add" && mod.udfPath?.includes("getListItems") && !mod.udfPath.includes("getListAnchors")) {
                getListItemsQueryId = mod.queryId;
              }
            }

            const responseModifications = modifications
              .filter((m) => m.type === "Add")
              .map((add) => {
                const path = add.udfPath ?? "";
                let value: unknown = null;

                if (path.includes("getUserLists")) {
                  value =
                    existingListCount > 0
                      ? Array.from({ length: existingListCount }, (_, i) => ({
                          _id: `lists:mocklist${i}`,
                          _creationTime: Date.now() - (existingListCount - i) * 3600_000,
                          name: `Test List ${i + 1}`,
                          ownerDid: MOCK_USER_DID,
                          assetDid: `did:example:asset${i}`,
                          createdAt: Date.now() - (existingListCount - i) * 3600_000,
                        }))
                      : [];
                } else if (path.includes("getUserByTurnkeyId")) {
                  value = {
                    _id: "users:mockuser1",
                    _creationTime: Date.now(),
                    turnkeySubOrgId: "e2e-suborg-001",
                    email: "e2e@test.com",
                    did: MOCK_USER_DID,
                    displayName: "E2E User",
                    legacyDid: null,
                  };
                } else if (path.includes("getUserSubscription")) {
                  value = null; // free plan, no active subscription
                } else if (path.includes("getUserCategories")) {
                  value = []; // no categories
                } else if (path.includes("getUserTemplates")) {
                  value = []; // no saved templates
                } else if (path.includes("getListAnchors") || path.includes("getItemAnchors")) {
                  value = []; // no Bitcoin anchors in test environment
                } else if (path.includes("getListItems")) {
                  // Must be checked before getList — "getListItems" contains "getList" as a prefix.
                  // Return current mutable state (reflects mutations applied so far).
                  value = [...mutableItems];
                } else if (path.includes("getList")) {
                  // lists:getList — specific list by ID
                  value = {
                    _id: mockListId,
                    _creationTime: Date.now() - 3600_000,
                    name: "Test List 1",
                    ownerDid: MOCK_USER_DID,
                    assetDid: "did:example:asset0",
                    createdAt: Date.now() - 3600_000,
                  };
                } else if (path.includes("getPublicationStatus")) {
                  value = null; // list not published
                } else if (path.includes("getUsersByDids")) {
                  // Return a record mapping each requested DID to a user profile.
                  // Args are passed as an array; first arg is { dids: string[] }.
                  const argsObj = (add.args?.[0] ?? {}) as { dids?: string[] };
                  const dids: string[] = argsObj.dids ?? [];
                  const record: Record<string, { displayName: string | null; email: string | null }> = {};
                  for (const did of dids) {
                    record[did] = { displayName: "E2E User", email: "e2e@test.com" };
                  }
                  value = record;
                }
                // All other queries (notifications, presence, etc.) return null —
                // handled gracefully by hooks.

                return {
                  type: "QueryUpdated",
                  queryId: add.queryId,
                  value,
                  logLines: [],
                };
              });

            ws.send(
              JSON.stringify({
                type: "Transition",
                startVersion: { querySet: baseVersion, ts: TS_ZERO, identity: 0 },
                endVersion: { querySet: newVersion, ts: TS_ZERO, identity: 0 },
                modifications: responseModifications,
              }),
            );
            break;
          }

          case "Mutation": {
            const path = String(msg.udfPath ?? "");
            const requestId = msg.requestId ?? 0;
            const args = (msg.args?.[0] ?? {}) as Record<string, unknown>;

            if (failCreateList && path.includes("createList")) {
              ws.send(
                JSON.stringify({
                  type: "MutationResponse",
                  requestId,
                  success: false,
                  // Must include "PLAN_LIMIT" — checked in CreateListModal.handleSubmit
                  result: "PLAN_LIMIT: Free plan allows a maximum of 5 lists",
                  logLines: [],
                }),
              );
            } else {
              let result: unknown = null;

              if (path.includes("createList")) {
                result = "lists:mocknew1";
              } else if (path.includes("removeItem")) {
                // Mutate mutable state: remove the item from the tracked list.
                const itemId = args.itemId as string | undefined;
                if (itemId) {
                  const idx = mutableItems.findIndex((it) => it._id === itemId);
                  if (idx !== -1) mutableItems.splice(idx, 1);
                }
              } else if (path.includes("checkItem")) {
                // Mark the item as checked.
                const itemId = args.itemId as string | undefined;
                const checkedAt = typeof args.checkedAt === "number" ? args.checkedAt : Date.now();
                if (itemId) {
                  const it = mutableItems.find((i) => i._id === itemId);
                  if (it) {
                    it.checked = true;
                    it.checkedByDid = MOCK_USER_DID;
                    it.checkedAt = checkedAt;
                  }
                }
              } else if (path.includes("uncheckItem")) {
                // Mark the item as unchecked.
                const itemId = args.itemId as string | undefined;
                if (itemId) {
                  const it = mutableItems.find((i) => i._id === itemId);
                  if (it) {
                    it.checked = false;
                    it.checkedByDid = null;
                    it.checkedAt = null;
                  }
                }
              }

              ws.send(
                JSON.stringify({
                  type: "MutationResponse",
                  requestId,
                  success: true,
                  result,
                  ts: TS_ZERO,
                  logLines: [],
                }),
              );

              // After mutations, push a Transition so the Convex client resolves
              // the mutation promise (v1.x requires a Transition confirming the ts).
              // For item mutations, include an updated QueryUpdated for real-time UI.
              if (
                path.includes("removeItem") ||
                path.includes("checkItem") ||
                path.includes("uncheckItem")
              ) {
                pushItemsUpdate();
              } else {
                // createList and other mutations: empty Transition to confirm commit.
                pushTransition();
              }
            }
            break;
          }
        }
      } catch {
        // Silently ignore unparseable frames (e.g. pings).
      }
    });
  });
}
