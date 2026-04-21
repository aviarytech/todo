/**
 * Offline indicator tests.
 *
 * Covers:
 *   1. Offline banner appears when the browser goes offline
 *   2. Banner text includes "You're offline"
 *   3. Banner disappears when the browser comes back online
 *
 * Strategy:
 *   - Simulate offline via window.dispatchEvent(new Event('offline')),
 *     which matches the web fallback in src/lib/network.ts.
 *   - Online is restored via window.dispatchEvent(new Event('online')).
 *   - No live backend required; Convex WebSocket is mocked.
 */

import { test, expect } from "@playwright/test";
import { seedAuthSession } from "./fixtures/auth";
import { mockConvexWebSocket } from "./fixtures/convex";

async function gotoAppOnline(page: import("@playwright/test").Page) {
  await mockConvexWebSocket(page, { existingListCount: 0 });
  await seedAuthSession(page);
  await page.goto("/d");
  await expect(
    page.getByRole("heading", { name: /Your lists|Welcome in/i }),
  ).toBeVisible({ timeout: 10000 });
}

test.describe("Offline indicator", () => {
  test("1. offline banner appears when browser goes offline", async ({ page }) => {
    await gotoAppOnline(page);

    // Fire the native browser 'offline' event — matches the network.ts web fallback
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));

    // OfflineIndicator renders a role="alert" banner
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("alert")).toContainText("You're offline");
  });

  test("2. offline banner message includes sync hint", async ({ page }) => {
    await gotoAppOnline(page);

    await page.evaluate(() => window.dispatchEvent(new Event("offline")));

    await expect(page.getByRole("alert")).toBeVisible({ timeout: 5000 });
    // With no pending changes, message includes "changes will sync when reconnected"
    await expect(page.getByRole("alert")).toContainText(
      "changes will sync when reconnected",
    );
  });

  test("3. offline banner disappears when browser comes back online", async ({ page }) => {
    await gotoAppOnline(page);

    // Go offline
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 5000 });

    // Come back online
    await page.evaluate(() => window.dispatchEvent(new Event("online")));

    // Banner should disappear (the alert role is removed)
    await expect(page.getByRole("alert")).not.toBeVisible({ timeout: 5000 });
  });

  test("4. app remains functional while offline — existing content still visible", async ({ page }) => {
    await gotoAppOnline(page);

    await page.evaluate(() => window.dispatchEvent(new Event("offline")));

    // The home page content should still be visible despite being offline
    await expect(
      page.getByRole("heading", { name: /Your lists|Welcome in/i }),
    ).toBeVisible({ timeout: 5000 });
  });
});
