/**
 * Sharing flow tests.
 *
 * All tests use seedAuthSession() + mockConvexWebSocket() — the old
 * getByLabel("Your name") / "Get Started" identity-modal pattern has been
 * replaced by Turnkey email-OTP auth.
 *
 * The Share modal now uses a did:webvh publication model:
 *   - Unpublished list → shows "🔗 Share List" + "Publish to Share" button
 *   - Published list   → shows "🌐 Shared List" + copy link + "Stop sharing"
 *
 * The mock returns publicationStatus = null (not published), so tests
 * cover the pre-publish state.
 */

import { test, expect } from "@playwright/test";
import { seedAuthSession } from "./fixtures/auth";
import { mockConvexWebSocket, MOCK_LIST_ID } from "./fixtures/convex";

/** Navigate to the mock list page and wait for it to load. */
async function gotoListPage(page: import("@playwright/test").Page) {
  await mockConvexWebSocket(page, { existingListCount: 1 });
  await seedAuthSession(page);
  await page.goto(`/list/${MOCK_LIST_ID}`);
  await expect(page.getByText("Test List 1")).toBeVisible({ timeout: 10000 });
}

test.describe("Sharing flow", () => {
  test("shows share button for list owner", async ({ page }) => {
    await gotoListPage(page);

    await expect(page.getByRole("button", { name: "Share" })).toBeVisible();
  });

  test("opens share modal", async ({ page }) => {
    await gotoListPage(page);

    await page.getByRole("button", { name: "Share" }).click();

    // Modal header for unpublished list
    await expect(
      page.getByRole("heading", { name: "🔗 Share List" }),
    ).toBeVisible({ timeout: 5000 });
  });

  test("share modal shows publish button when list is not published", async ({
    page,
  }) => {
    await gotoListPage(page);

    await page.getByRole("button", { name: "Share" }).click();
    await expect(
      page.getByRole("heading", { name: "🔗 Share List" }),
    ).toBeVisible({ timeout: 5000 });

    // Not yet published — "Publish to Share" CTA is shown
    await expect(
      page.getByRole("button", { name: "Publish to Share" }),
    ).toBeVisible({ timeout: 5000 });
  });

  test("can close share modal", async ({ page }) => {
    await gotoListPage(page);

    await page.getByRole("button", { name: "Share" }).click();
    await expect(
      page.getByRole("heading", { name: "🔗 Share List" }),
    ).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: "Done" }).click();

    await expect(
      page.getByRole("heading", { name: "🔗 Share List" }),
    ).not.toBeVisible();
  });
});

test.describe("Join flow", () => {
  test("invalid join link shows invite-links-deprecated message", async ({
    page,
  }) => {
    await page.goto("/join/invalid-list-id/invalid-token");

    // Invite links are no longer supported — the page explains the new sharing model
    await expect(
      page.getByRole("heading", { name: "Invite Links No Longer Supported" }),
    ).toBeVisible();
  });
});
