/**
 * Smoke test: full user journey from landing to paid upgrade.
 *
 * Critical path covered:
 *   1. Land on home (landing) page
 *   2. View pricing page
 *   3. Sign up via email OTP
 *   4. Create lists (home page renders for authenticated user)
 *   5. Hit free tier limit (server returns PLAN_LIMIT)
 *   6. See upgrade modal
 *   7. Navigate to pricing from upgrade modal
 *   8. Click "Upgrade to Pro" → Stripe checkout
 *
 * Network mocking strategy:
 *   - Auth HTTP endpoints (/auth/initiate, /auth/verify) are always mocked.
 *   - Convex WebSocket (queries + mutations) is mocked via page.routeWebSocket().
 *   - Billing checkout HTTP endpoint is mocked to return a fake Stripe URL.
 *
 * This means the suite runs without a live Convex backend or Stripe keys.
 */

import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { seedAuthSession, buildFakeJwt } from "./fixtures/auth";

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

const MOCK_STRIPE_CHECKOUT_URL = "https://checkout.stripe.com/pay/cs_test_e2e_mock_session";

// ---------------------------------------------------------------------------
// Convex WebSocket mock
// ---------------------------------------------------------------------------

/**
 * Minimal Convex sync-protocol WebSocket mock.
 *
 * Handles:
 *   - Connect / Authenticate  → no response needed (app doesn't use Convex auth)
 *   - ModifyQuerySet          → returns deterministic query results
 *   - Mutation                → succeeds or fails with PLAN_LIMIT based on options
 *
 * Protocol notes (Convex 1.31.x):
 *   - Client sends ModifyQuerySet with {baseVersion, newVersion, modifications:[{type:"Add",...}]}
 *   - Server responds with Transition{startVersion:{querySet:baseVersion, ts, identity},
 *                                     endVersion:{querySet:newVersion, ts, identity}, modifications}
 *   - Client sends Mutation{requestId, udfPath, args}
 *   - Server responds with MutationResponse{requestId, success, result|logLines}
 */
async function mockConvexWebSocket(
  page: Page,
  {
    existingListCount = 0,
    failCreateList = false,
  }: {
    /** Number of lists the mock "already has" for the authenticated user */
    existingListCount?: number;
    /** When true, the next createList mutation returns a PLAN_LIMIT error */
    failCreateList?: boolean;
  } = {},
): Promise<void> {
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
            // The app does not use Convex server-side auth — nothing to do.
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
                          ownerDid: "did:webvh:e2e:test",
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
                    did: "did:webvh:e2e:test",
                    displayName: "E2E User",
                    legacyDid: null,
                  };
                } else if (path.includes("getUserSubscription")) {
                  value = null; // free plan, no active subscription
                } else if (path.includes("getUserCategories")) {
                  value = []; // no categories
                }
                // All other queries (notifications, etc.) return null — handled gracefully by hooks.

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

// ---------------------------------------------------------------------------
// Auth HTTP mock helpers
// ---------------------------------------------------------------------------

async function mockAuthEndpoints(page: Page): Promise<void> {
  await page.route("**/auth/initiate", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ sessionId: "e2e-session-001" }),
    }),
  );

  await page.route("**/auth/verify", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        token: buildFakeJwt(),
        user: {
          turnkeySubOrgId: "e2e-suborg-001",
          email: "e2e@test.com",
          did: "did:webvh:e2e:test",
          displayName: "E2E User",
        },
      }),
    }),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Smoke: landing to paid upgrade journey", () => {
  // =========================================================================
  // Section 1: Navigation — no backend required
  // =========================================================================

  test("1. landing page loads with branding", async ({ page }) => {
    await page.goto("/");
    // Landing page shows product name and tagline
    await expect(page.getByText("Poo App").first()).toBeVisible();
    // Pricing link is present in the nav
    await expect(page.getByRole("link", { name: "Pricing" })).toBeVisible();
  });

  test("2. pricing link in nav navigates to pricing page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Pricing" }).click();
    await expect(page).toHaveURL("/pricing");
    await expect(
      page.getByRole("heading", { name: "Simple, honest pricing" }),
    ).toBeVisible();
  });

  test("3. pricing page: shows Free, Pro, and Team plans", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: "Free" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pro" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Team" })).toBeVisible();
    // Free plan features
    await expect(page.getByText("Up to 5 lists")).toBeVisible();
    // Pro plan features
    await expect(page.getByText("Unlimited lists")).toBeVisible();
  });

  test("4. pricing page: monthly/yearly billing toggle", async ({ page }) => {
    await page.goto("/pricing");
    // Default is monthly
    await expect(page.getByText("$5/mo")).toBeVisible();
    // Switch to yearly
    await page.getByRole("button", { name: "Yearly" }).click();
    await expect(page.getByText("$48/yr")).toBeVisible();
    // Switch back to monthly
    await page.getByRole("button", { name: "Monthly" }).click();
    await expect(page.getByText("$5/mo")).toBeVisible();
  });

  test("5. pricing page: unauthenticated upgrade redirects to login", async ({
    page,
  }) => {
    await page.goto("/pricing");
    await page.getByRole("button", { name: "Upgrade to Pro" }).click();
    // Unauthenticated user is redirected to login
    await expect(page).toHaveURL("/login");
  });

  // =========================================================================
  // Section 2: Sign up via email OTP (HTTP endpoints mocked)
  // =========================================================================

  test("6. sign-up: email entry shows send-code button", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: "Welcome to Poo App" }),
    ).toBeVisible();
    await expect(
      page.getByPlaceholder("you@example.com"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Send Code/i }),
    ).toBeVisible();
  });

  test("7. sign-up: send code transitions to OTP input", async ({ page }) => {
    await mockAuthEndpoints(page);
    await page.goto("/login");
    await page.getByPlaceholder("you@example.com").fill("e2e@test.com");
    await page.getByRole("button", { name: /Send Code/i }).click();
    // After initiating OTP, the verification step is shown
    await expect(
      page.getByText(/Enter the code we sent to/),
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByLabel("Digit 1"),
    ).toBeVisible();
  });

  test("8. sign-up: completing OTP redirects to /app", async ({ page }) => {
    await mockConvexWebSocket(page);
    await mockAuthEndpoints(page);

    await page.goto("/login");
    await page.getByPlaceholder("you@example.com").fill("e2e@test.com");
    await page.getByRole("button", { name: /Send Code/i }).click();
    await expect(page.getByLabel("Digit 1")).toBeVisible({ timeout: 5000 });

    // Fill OTP: click first digit input, then type — OtpInput auto-advances focus
    await page.getByLabel("Digit 1").click();
    await page.keyboard.type("123456");

    await expect(page).toHaveURL("/app", { timeout: 10000 });
  });

  // =========================================================================
  // Section 3: Authenticated flow (Convex WebSocket mocked)
  // =========================================================================

  test("9. authenticated home page: renders New List button", async ({
    page,
  }) => {
    await mockConvexWebSocket(page, { existingListCount: 0 });
    await seedAuthSession(page);
    await page.goto("/app");

    await expect(
      page.getByRole("heading", { name: "Your Lists" }),
    ).toBeVisible({ timeout: 10000 });
    // FAB / new list button is visible
    await expect(
      page.getByRole("button", { name: /New List/i }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("10. authenticated home page: create list modal opens", async ({
    page,
  }) => {
    await mockConvexWebSocket(page, { existingListCount: 0 });
    await seedAuthSession(page);
    await page.goto("/app");

    await page.getByRole("button", { name: /New List/i }).click({ timeout: 10000 });
    await expect(
      page.getByRole("heading", { name: "Create New List" }),
    ).toBeVisible({ timeout: 5000 });
    await expect(page.getByLabel("List name")).toBeVisible();
  });

  test("11. free tier limit: upgrade CTA shown when createList returns PLAN_LIMIT", async ({
    page,
  }) => {
    // Mock: user has 5 lists and the next createList call fails with PLAN_LIMIT
    await mockConvexWebSocket(page, {
      existingListCount: 5,
      failCreateList: true,
    });
    await seedAuthSession(page);
    await page.goto("/app");

    // Wait for home page to finish loading
    await page.getByRole("button", { name: /New List/i }).waitFor({
      state: "visible",
      timeout: 10000,
    });

    // Open create list modal
    await page.getByRole("button", { name: /New List/i }).click();
    await page.getByLabel("List name").waitFor({ state: "visible", timeout: 5000 });

    // Submit the form — mutation returns PLAN_LIMIT
    await page.getByLabel("List name").fill("My 6th List");
    await page.getByRole("button", { name: "Create List" }).click();

    // Free-tier upgrade gate should appear
    await expect(
      page.getByText("You've reached the free plan limit of 5 lists"),
    ).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("link", { name: "View pricing →" })).toBeVisible();
  });

  test("12. free tier upgrade CTA navigates to pricing page", async ({
    page,
  }) => {
    await mockConvexWebSocket(page, {
      existingListCount: 5,
      failCreateList: true,
    });
    await seedAuthSession(page);
    await page.goto("/app");

    await page.getByRole("button", { name: /New List/i }).waitFor({
      state: "visible",
      timeout: 10000,
    });
    await page.getByRole("button", { name: /New List/i }).click();
    await page.getByLabel("List name").waitFor({ state: "visible", timeout: 5000 });
    await page.getByLabel("List name").fill("6th List");
    await page.getByRole("button", { name: "Create List" }).click();

    await expect(
      page.getByRole("link", { name: "View pricing →" }),
    ).toBeVisible({ timeout: 5000 });

    // Click the upgrade CTA
    await page.getByRole("link", { name: "View pricing →" }).click();
    await expect(page).toHaveURL("/pricing");
  });

  // =========================================================================
  // Section 4: Stripe checkout (billing HTTP endpoint mocked)
  // =========================================================================

  test("13. pricing page (authenticated): Upgrade to Pro calls checkout and redirects", async ({
    page,
  }) => {
    // Mock the Convex WebSocket so billing state resolves (free plan, no subscription)
    await mockConvexWebSocket(page, { existingListCount: 0 });

    // Mock the Stripe checkout endpoint
    await page.route("**/api/billing/checkout", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: MOCK_STRIPE_CHECKOUT_URL }),
      }),
    );

    await seedAuthSession(page);
    await page.goto("/pricing");

    // Wait for billing state to load — plan is "free" so Upgrade button is shown
    await expect(
      page.getByRole("button", { name: "Upgrade to Pro" }),
    ).toBeVisible({ timeout: 10000 });

    // Intercept the navigation to Stripe before clicking
    const navigationPromise = page.waitForURL(
      (url) => url.hostname.includes("stripe.com"),
      { timeout: 10000 },
    );

    await page.getByRole("button", { name: "Upgrade to Pro" }).click();
    await navigationPromise;

    await expect(page).toHaveURL(MOCK_STRIPE_CHECKOUT_URL);
  });
});
