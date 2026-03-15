/**
 * Item management tests.
 *
 * All tests use seedAuthSession() + mockConvexWebSocket() — the old
 * getByLabel("Your name") / "Get Started" identity-modal pattern has been
 * replaced by Turnkey email-OTP auth.
 *
 * The Convex mock simulates real-time reactivity: after item mutations
 * (check, uncheck, remove) it pushes QueryUpdated so the app reflects the
 * new state without a live backend.
 */

import { test, expect } from "@playwright/test";
import { seedAuthSession } from "./fixtures/auth";
import { mockConvexWebSocket, MOCK_LIST_ID } from "./fixtures/convex";

/** Navigate to the mock list page and wait for the list to finish loading. */
async function gotoListPage(
  page: import("@playwright/test").Page,
  existingItems: { name: string; checked?: boolean }[] = [],
) {
  await mockConvexWebSocket(page, { existingListCount: 1, existingItems });
  await seedAuthSession(page);
  await page.goto(`/list/${MOCK_LIST_ID}`);
  // The list name comes from the mock — wait for it to confirm the page loaded
  await expect(page.getByText("Test List 1")).toBeVisible({ timeout: 10000 });
}

test.describe("Item management", () => {
  test("shows empty state when no items exist", async ({ page }) => {
    await gotoListPage(page, []);

    await expect(page.getByText("This list is empty")).toBeVisible();
    await expect(
      page.getByText("Add your first item below to get started!"),
    ).toBeVisible();
  });

  test("adds a new item", async ({ page }) => {
    await gotoListPage(page, []);

    await page.getByPlaceholder("Add item...").fill("Milk");
    await page.getByRole("button", { name: "Add" }).click();

    // Optimistic update — item appears immediately without a server round-trip
    await expect(page.getByText("Milk")).toBeVisible({ timeout: 5000 });
  });

  test("checks and unchecks an item", async ({ page }) => {
    await gotoListPage(page, [{ name: "Bread", checked: false }]);

    // Item should be present from the mock
    await expect(page.getByText("Bread")).toBeVisible({ timeout: 5000 });

    // Check the item — aria-label includes the item name
    await page.getByRole("button", { name: "Check Bread" }).click();

    // After checking, the item moves to the collapsed Done section.
    // Expand it to access the Uncheck button.
    await page.getByRole("button", { name: /^Done/ }).click({ timeout: 5000 });

    // Uncheck button is now visible in the expanded Done section
    await expect(
      page.getByRole("button", { name: "Uncheck Bread" }),
    ).toBeVisible({ timeout: 5000 });

    // Uncheck it — item moves back to the active items list
    await page.getByRole("button", { name: "Uncheck Bread" }).click();

    await expect(
      page.getByRole("button", { name: "Check Bread" }),
    ).toBeVisible({ timeout: 5000 });
  });

  test("removes an item", async ({ page }) => {
    await gotoListPage(page, [{ name: "Eggs", checked: false }]);

    await expect(page.getByText("Eggs")).toBeVisible({ timeout: 5000 });

    // Remove button aria-label includes the item name
    await page.getByRole("button", { name: "Remove Eggs" }).click();

    // The mock pushes QueryUpdated after the mutation so the server state
    // reflects the removal and the item disappears from the list.
    await expect(page.getByText("Eggs")).not.toBeVisible({ timeout: 5000 });
  });

  test("can navigate back to home", async ({ page }) => {
    await gotoListPage(page, []);

    await page.getByRole("link", { name: "Back to lists" }).click();

    await expect(
      page.getByRole("heading", { name: "Your Lists" }),
    ).toBeVisible({ timeout: 10000 });
  });
});
