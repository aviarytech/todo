/**
 * Onboarding flow tests (POO-45)
 *
 * Tests the 2-step new-user onboarding:
 *   Step 1 — auto-create "Getting Started" demo list on first login.
 *   Step 2 — InviteNudge banner shown after user creates their first real list.
 *
 * All tests use:
 *   - seedAuthSession() to inject a valid auth token
 *   - mockConvexWebSocket() to stand in for the Convex backend
 *
 * Network mocking strategy: same as smoke-upgrade-journey.spec.ts.
 */

import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { seedAuthSession } from "./fixtures/auth";

// ---------------------------------------------------------------------------
// Constants (must match smoke-upgrade-journey.spec.ts)
// ---------------------------------------------------------------------------

const TS_ZERO = "AAAAAAAAAAA=";
const CONVEX_WS_URL = /\/api\/[^/]+\/sync$/;

// ---------------------------------------------------------------------------
// Convex WebSocket mock
// ---------------------------------------------------------------------------

async function mockConvexWebSocket(
  page: Page,
  {
    existingListCount = 0,
  }: {
    existingListCount?: number;
  } = {},
): Promise<void> {
  await page.routeWebSocket(CONVEX_WS_URL, (ws) => {
    // Track the latest querySet version so post-mutation Transitions stay in sync.
    let currentQuerySetVersion = 0;

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

            currentQuerySetVersion = newVersion;

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
                          name: i === 0 ? "Getting Started" : `Test List ${i}`,
                          ownerDid: "did:webvh:e2e.poo.app:users:e2e-suborg-001",
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
                    did: "did:webvh:e2e.poo.app:users:e2e-suborg-001",
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
            const requestId = (msg as { requestId: number }).requestId;
            // The Convex client only resolves the mutation Promise when a Transition with
            // ts >= the MutationResponse.ts arrives (requestManager.removeCompleted is called
            // only from the Transition handler). Send MutationResponse first, then a no-op
            // Transition with the same ts to unblock the awaited createList() call.
            ws.send(
              JSON.stringify({
                type: "MutationResponse",
                requestId,
                success: true,
                result: "lists:mocknew1",
                ts: TS_ZERO,
                logLines: [],
              }),
            );
            ws.send(
              JSON.stringify({
                type: "Transition",
                startVersion: { querySet: currentQuerySetVersion, ts: TS_ZERO, identity: 0 },
                endVersion: { querySet: currentQuerySetVersion, ts: TS_ZERO, identity: 0 },
                modifications: [],
              }),
            );
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

test.describe("Onboarding: 2-step new user flow (POO-45)", () => {
  test.beforeEach(async ({ page }) => {
    // Stub createListAsset to bypass @originals/sdk crypto, which can hang in Playwright's
    // Chromium sandbox. Must run before page scripts via addInitScript.
    await page.addInitScript(() => {
      (window as Record<string, unknown>).__E2E_MOCK_ORIGINALS = true;
      localStorage.clear();
    });
  });

  // =========================================================================
  // Step 1 — Demo list auto-creation
  // =========================================================================

  test("1. new user: legacy 4-step OnboardingFlow is NOT shown (2-step flow suppresses it)", async ({
    page,
  }) => {
    // existingListCount=0 triggers demo list auto-creation path
    await mockConvexWebSocket(page, { existingListCount: 0 });
    await seedAuthSession(page);
    await page.goto("/d");

    // Wait for home page to settle
    await expect(
      page.getByRole("heading", { name: /Your lists|Welcome in/i }),
    ).toBeVisible({ timeout: 10000 });

    // The old 4-step flow modal should NOT appear — it's suppressed by the 2-step path
    await expect(
      page.getByRole("heading", { name: "Welcome to boop." }),
    ).not.toBeVisible();
  });

  test("2. new user: demo creation sets localStorage flag boop:onboarding_demo_created", async ({
    page,
  }) => {
    await mockConvexWebSocket(page, { existingListCount: 0 });
    await seedAuthSession(page);
    await page.goto("/d");

    // Wait for the home page to load and the demo creation effect to run
    await expect(
      page.getByRole("heading", { name: /Your lists|Welcome in/i }),
    ).toBeVisible({ timeout: 10000 });

    // Give the async demo creation a moment to fire
    await page.waitForTimeout(2000);

    const flagValue = await page.evaluate(() =>
      localStorage.getItem("boop:onboarding_demo_created"),
    );
    // Should be "pending" or "done" — either means the 2-step flow kicked off
    expect(["pending", "done"]).toContain(flagValue);
  });

  test("3. existing user: demo creation is skipped (flag set immediately)", async ({
    page,
  }) => {
    // existingListCount=1 means user already has lists — skip demo creation
    await mockConvexWebSocket(page, { existingListCount: 1 });
    await seedAuthSession(page);
    await page.goto("/d");

    await expect(
      page.getByRole("heading", { name: /Your lists|Welcome in/i }),
    ).toBeVisible({ timeout: 10000 });

    // Give the effect time to run
    await page.waitForTimeout(1000);

    const flagValue = await page.evaluate(() =>
      localStorage.getItem("boop:onboarding_demo_created"),
    );
    expect(flagValue).toBe("done");
  });

  // =========================================================================
  // Step 2 — InviteNudge after first real list
  // =========================================================================

  test("4. InviteNudge appears after user creates their first real list", async ({
    page,
  }) => {
    // Start with 1 existing list so demo is skipped; inviteNudgeDone is NOT set
    await mockConvexWebSocket(page, { existingListCount: 1 });
    await seedAuthSession(page);
    await page.goto("/d");

    await expect(
      page.getByRole("heading", { name: /Your lists|Welcome in/i }),
    ).toBeVisible({ timeout: 10000 });

    // Open template picker (pill chip "New list" button — first match; FAB is second)
    await page.getByRole("button", { name: /New list/i }).first().click({ timeout: 5000 });

    // Wait for template picker to open and click "Blank List"
    await expect(
      page.getByRole("heading", { name: "Choose a Template" }),
    ).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /Blank List/i }).click();

    // CreateListModal should open
    await expect(page.getByRole("heading", { name: "Create New List" })).toBeVisible({ timeout: 5000 });

    // Fill in name and submit
    await page.getByLabel("List name").pressSequentially("My First Real List");
    // Submit via Enter key — avoids the form="create-list-form" attribute submit issue
    await page.getByLabel("List name").press("Enter");

    // InviteNudge should appear after list creation
    await expect(
      page.getByRole("heading", { name: "Invite someone to collaborate" }),
    ).toBeVisible({ timeout: 10000 });

    await expect(page.getByRole("button", { name: /Invite someone/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Later" })).toBeVisible();
  });

  test("5. InviteNudge is dismissed by clicking Later", async ({ page }) => {
    await mockConvexWebSocket(page, { existingListCount: 1 });
    await seedAuthSession(page);
    await page.goto("/d");

    await expect(
      page.getByRole("heading", { name: /Your lists|Welcome in/i }),
    ).toBeVisible({ timeout: 10000 });

    // Open template picker and create a blank list
    await page.getByRole("button", { name: /New list/i }).first().click({ timeout: 5000 });
    await expect(page.getByRole("heading", { name: "Choose a Template" })).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /Blank List/i }).click();
    await expect(page.getByRole("heading", { name: "Create New List" })).toBeVisible({ timeout: 5000 });
    await page.getByLabel("List name").pressSequentially("Test Dismiss Nudge");
    // Submit via Enter key — avoids the form="create-list-form" attribute submit issue
    await page.getByLabel("List name").press("Enter");

    // Wait for nudge
    await expect(
      page.getByRole("heading", { name: "Invite someone to collaborate" }),
    ).toBeVisible({ timeout: 10000 });

    // Dismiss with Later
    await page.getByRole("button", { name: "Later" }).click();

    // Nudge should be gone
    await expect(
      page.getByRole("heading", { name: "Invite someone to collaborate" }),
    ).not.toBeVisible();

    // localStorage flag should be set
    const flagValue = await page.evaluate(() =>
      localStorage.getItem("boop:onboarding_invite_nudge_done"),
    );
    expect(flagValue).toBe("done");
  });

  test("6. InviteNudge does NOT re-appear if already dismissed (inviteNudgeDone flag set)", async ({
    page,
  }) => {
    // Pre-set the nudge-done flag
    await page.addInitScript(() => {
      localStorage.setItem("boop:onboarding_invite_nudge_done", "done");
    });

    await mockConvexWebSocket(page, { existingListCount: 1 });
    await seedAuthSession(page);
    await page.goto("/d");

    await expect(
      page.getByRole("heading", { name: /Your lists|Welcome in/i }),
    ).toBeVisible({ timeout: 10000 });

    // Create a list
    await page.getByRole("button", { name: /New list/i }).first().click({ timeout: 5000 });
    await expect(page.getByRole("heading", { name: "Choose a Template" })).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /Blank List/i }).click();
    await expect(page.getByRole("heading", { name: "Create New List" })).toBeVisible({ timeout: 5000 });
    await page.getByLabel("List name").pressSequentially("Another List");
    // Submit via Enter key — avoids the form="create-list-form" attribute submit issue
    await page.getByLabel("List name").press("Enter");

    // Nudge should NOT appear
    await page.waitForTimeout(1500);
    await expect(
      page.getByRole("heading", { name: "Invite someone to collaborate" }),
    ).not.toBeVisible();
  });
});
