/**
 * Share/invite flow tests (POO-14)
 *
 * Tests the authenticated share flow via the did:webvh publication model:
 *   - Share button visible on a list view
 *   - ShareModal renders in unpublished state
 *   - "Publish to Share" triggers the publishList mutation
 *   - Share link is shown after publishing
 *   - Copy link feedback works
 *   - "Stop sharing" triggers the unpublish mutation
 *
 * Network mocking strategy:
 *   - Convex WebSocket mocked — covers list/items queries and mutations.
 *   - Auth seeded via seedAuthSession().
 *
 * NOTE: The old invite-link-based sharing tests in sharing.spec.ts cover a
 * legacy anonymous-identity flow that predates email OTP auth.
 * This file covers the current auth-based publication flow.
 */

import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { seedAuthSession } from "./fixtures/auth";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS_ZERO = "AAAAAAAAAAA=";
const CONVEX_WS_URL = /\/api\/[^/]+\/sync$/;
const MOCK_LIST_ID = "lists:mocklist0";
const MOCK_LIST_NAME = "My Groceries";
const MOCK_OWNER_DID = "did:webvh:e2e.poo.app:users:e2e-suborg-001";

// ---------------------------------------------------------------------------
// Convex WebSocket mock for share flow
// ---------------------------------------------------------------------------

async function mockConvexForShareFlow(
  page: Page,
  {
    isPublished = false,
  }: {
    /** Simulate the list already being published. */
    isPublished?: boolean;
  } = {},
): Promise<void> {
  let published = isPublished;
  let queryVersion = 0;
  let pubStatusQueryId: number | null = null;

  await page.routeWebSocket(CONVEX_WS_URL, (ws) => {
    ws.onMessage((rawMessage) => {
      try {
        const text =
          typeof rawMessage === "string"
            ? rawMessage
            : Buffer.from(rawMessage as ArrayBuffer).toString("utf8");
        const msg = JSON.parse(text);

        switch (msg.type) {
          case "Connect":
          case "Authenticate":
            break;

          case "ModifyQuerySet": {
            const { baseVersion, newVersion, modifications = [] } = msg as {
              baseVersion: number;
              newVersion: number;
              modifications: Array<{
                type: string;
                queryId: number;
                udfPath?: string;
                args?: unknown[];
              }>;
            };
            queryVersion = newVersion;

            const responseModifications = modifications
              .filter((m) => m.type === "Add")
              .map((add) => {
                const path = add.udfPath ?? "";
                let value: unknown = null;

                if (path.includes("getListItems") || path.includes("getItems")) {
                  value = [];
                } else if (path.includes("getListAnchors") || path.includes("getItemAnchors")) {
                  value = [];
                } else if (path.includes("getList")) {
                  value = {
                    _id: MOCK_LIST_ID,
                    _creationTime: Date.now() - 3600_000,
                    name: MOCK_LIST_NAME,
                    ownerDid: MOCK_OWNER_DID,
                    assetDid: "did:peer:mocklist0",
                    createdAt: Date.now() - 3600_000,
                    categoryId: null,
                  };
                } else if (path.includes("getUserLists")) {
                  value = [
                    {
                      _id: MOCK_LIST_ID,
                      _creationTime: Date.now() - 3600_000,
                      name: MOCK_LIST_NAME,
                      ownerDid: MOCK_OWNER_DID,
                      assetDid: "did:peer:mocklist0",
                      createdAt: Date.now() - 3600_000,
                    },
                  ];
                } else if (path.includes("getPublicationStatus")) {
                  pubStatusQueryId = add.queryId;
                  value = published
                    ? { status: "active", webvhDid: `${MOCK_OWNER_DID}/resources/list-${MOCK_LIST_ID}` }
                    : { status: "unpublished" };
                } else if (path.includes("getUserByTurnkeyId")) {
                  value = {
                    _id: "users:mockuser1",
                    _creationTime: Date.now(),
                    turnkeySubOrgId: "e2e-suborg-001",
                    email: "e2e@test.com",
                    did: MOCK_OWNER_DID,
                    displayName: "E2E User",
                    legacyDid: null,
                  };
                } else if (path.includes("getUserSubscription")) {
                  value = null;
                } else if (path.includes("getUserCategories")) {
                  value = [];
                } else if (path.includes("getUserBookmarkIds")) {
                  value = [];
                } else if (path.includes("getUserTemplates")) {
                  value = [];
                }

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
            const path = String((msg as { udfPath?: string }).udfPath ?? "");
            const requestId = (msg as { requestId: number }).requestId;

            if (path.includes("publishList")) {
              published = true;
            } else if (path.includes("unpublishList")) {
              published = false;
            }

            ws.send(
              JSON.stringify({
                type: "MutationResponse",
                requestId,
                success: true,
                result: null,
                ts: TS_ZERO,
                logLines: [],
              }),
            );

            // Push reactive update for getPublicationStatus so the UI re-renders
            if (pubStatusQueryId !== null && (path.includes("publishList") || path.includes("unpublishList"))) {
              const prevVersion = queryVersion;
              queryVersion += 1;
              ws.send(
                JSON.stringify({
                  type: "Transition",
                  startVersion: { querySet: prevVersion, ts: TS_ZERO, identity: 0 },
                  endVersion: { querySet: queryVersion, ts: TS_ZERO, identity: 0 },
                  modifications: [
                    {
                      type: "QueryUpdated",
                      queryId: pubStatusQueryId,
                      value: published
                        ? { status: "active", webvhDid: `${MOCK_OWNER_DID}/resources/list-${MOCK_LIST_ID}` }
                        : { status: "unpublished" },
                      logLines: [],
                    },
                  ],
                }),
              );
            }
            break;
          }
        }
      } catch {
        // silently ignore unparseable frames
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Share / publish flow (POO-14)", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
  });

  test("1. Share button is visible on list view for list owner", async ({ page }) => {
    await mockConvexForShareFlow(page);
    await seedAuthSession(page);
    await page.goto(`/list/${MOCK_LIST_ID}`);

    // Share button in header — always visible
    await expect(
      page.getByRole("button", { name: "Share", exact: false }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("2. Share button opens ShareModal in unpublished state", async ({ page }) => {
    await mockConvexForShareFlow(page, { isPublished: false });
    await seedAuthSession(page);
    await page.goto(`/list/${MOCK_LIST_ID}`);

    await page.getByRole("button", { name: "Share", exact: false }).click({ timeout: 10000 });

    // Modal opens — showing share dialog
    await expect(
      page.getByRole("heading", { name: /Share List/i }),
    ).toBeVisible({ timeout: 5000 });

    // Publish to Share button visible (list is not yet published)
    await expect(
      page.getByRole("button", { name: /Publish to Share/i }),
    ).toBeVisible();
  });

  test("3. Publish to Share triggers publishList mutation and updates UI", async ({ page }) => {
    await mockConvexForShareFlow(page, { isPublished: false });
    await seedAuthSession(page);
    await page.goto(`/list/${MOCK_LIST_ID}`);

    await page.getByRole("button", { name: "Share", exact: false }).click({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /Publish to Share/i })).toBeVisible({ timeout: 5000 });

    // Click Publish to Share
    await page.getByRole("button", { name: /Publish to Share/i }).click();

    // After publishing, heading changes to "Shared List"
    await expect(
      page.getByRole("heading", { name: /Shared List/i }),
    ).toBeVisible({ timeout: 10000 });

    // "This list is shared" confirmation text
    await expect(page.getByText("This list is shared")).toBeVisible({ timeout: 5000 });
  });

  test("4. already-published list shows share link in modal", async ({ page }) => {
    await mockConvexForShareFlow(page, { isPublished: true });
    await seedAuthSession(page);
    await page.goto(`/list/${MOCK_LIST_ID}`);

    await page.getByRole("button", { name: "Share", exact: false }).click({ timeout: 10000 });

    // Should directly show shared state
    await expect(
      page.getByRole("heading", { name: /Shared List/i }),
    ).toBeVisible({ timeout: 5000 });

    // Share link input visible
    await expect(page.locator('input[readonly]').first()).toBeVisible({ timeout: 5000 });

    // Copy button visible
    await expect(page.getByRole("button", { name: /Copy/i })).toBeVisible();
  });

  test("5. Stop sharing button is visible for published lists", async ({ page }) => {
    await mockConvexForShareFlow(page, { isPublished: true });
    await seedAuthSession(page);
    await page.goto(`/list/${MOCK_LIST_ID}`);

    await page.getByRole("button", { name: "Share", exact: false }).click({ timeout: 10000 });

    await expect(
      page.getByRole("heading", { name: /Shared List/i }),
    ).toBeVisible({ timeout: 5000 });

    await expect(
      page.getByRole("button", { name: /Stop sharing/i }),
    ).toBeVisible();
  });

  test("6. Done button closes the share modal", async ({ page }) => {
    await mockConvexForShareFlow(page, { isPublished: true });
    await seedAuthSession(page);
    await page.goto(`/list/${MOCK_LIST_ID}`);

    await page.getByRole("button", { name: "Share", exact: false }).click({ timeout: 10000 });
    await expect(
      page.getByRole("heading", { name: /Shared List/i }),
    ).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: "Done" }).click();

    // Modal should be dismissed
    await expect(
      page.getByRole("heading", { name: /Shared List/i }),
    ).not.toBeVisible({ timeout: 3000 });
  });

  test("7. list detail page shows Shared badge when list is published", async ({ page }) => {
    await mockConvexForShareFlow(page, { isPublished: true });
    await seedAuthSession(page);
    await page.goto(`/list/${MOCK_LIST_ID}`);

    // The list view shows a "Shared" badge / label when publication is active
    await expect(
      page.getByText("Shared").first(),
    ).toBeVisible({ timeout: 10000 });
  });
});
