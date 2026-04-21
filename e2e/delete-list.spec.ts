/**
 * Delete list flow tests.
 *
 * Covers:
 *   1. "More actions" menu opens on the list detail page
 *   2. "Delete list" option is visible in the actions menu
 *   3. Clicking "Delete list" opens the Delete confirmation dialog
 *   4. Dialog shows the list name in the confirmation text
 *   5. Cancel button closes the dialog without navigating
 *   6. Confirm delete triggers mutation and navigates back to /app
 *
 * The Convex mock auto-succeeds any mutation (deleteList returns null → onDeleted() fires).
 */

import { test, expect } from "@playwright/test";
import { seedAuthSession } from "./fixtures/auth";
import { mockConvexWebSocket, MOCK_LIST_ID } from "./fixtures/convex";

async function gotoListPage(page: import("@playwright/test").Page) {
  await mockConvexWebSocket(page, { existingListCount: 1 });
  await seedAuthSession(page);
  await page.goto(`/list/${MOCK_LIST_ID}`);
  await expect(page.getByText("Test List 1")).toBeVisible({ timeout: 10000 });
}

test.describe("Delete list flow", () => {
  test("1. More actions menu opens on list page", async ({ page }) => {
    await gotoListPage(page);

    await page.getByRole("button", { name: "More actions" }).click();

    // The dropdown menu should be visible
    await expect(page.getByRole("button", { name: "Delete list" })).toBeVisible({
      timeout: 5000,
    });
  });

  test("2. Delete list option is present in the actions menu", async ({ page }) => {
    await gotoListPage(page);

    await page.getByRole("button", { name: "More actions" }).click();

    await expect(page.getByRole("button", { name: "Delete list" })).toBeVisible();
  });

  test("3. clicking Delete list opens confirmation dialog", async ({ page }) => {
    await gotoListPage(page);

    await page.getByRole("button", { name: "More actions" }).click();
    await page.getByRole("button", { name: "Delete list" }).click();

    // DeleteListDialog renders an alertdialog role
    await expect(
      page.getByRole("alertdialog"),
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByRole("heading", { name: "Delete List" }),
    ).toBeVisible();
  });

  test("4. confirmation dialog shows the list name", async ({ page }) => {
    await gotoListPage(page);

    await page.getByRole("button", { name: "More actions" }).click();
    await page.getByRole("button", { name: "Delete list" }).click();

    await expect(page.getByRole("alertdialog")).toBeVisible({ timeout: 5000 });
    // Dialog description includes the list name
    await expect(page.getByRole("alertdialog")).toContainText("Test List 1");
  });

  test("5. Cancel button closes the dialog without navigating", async ({ page }) => {
    await gotoListPage(page);

    await page.getByRole("button", { name: "More actions" }).click();
    await page.getByRole("button", { name: "Delete list" }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: "Cancel" }).click();

    // Dialog is dismissed
    await expect(page.getByRole("alertdialog")).not.toBeVisible({ timeout: 3000 });
    // Still on the list page
    await expect(page).toHaveURL(new RegExp(MOCK_LIST_ID));
  });

  test("6. confirming delete triggers mutation and navigates to /app", async ({ page }) => {
    await gotoListPage(page);

    await page.getByRole("button", { name: "More actions" }).click();
    await page.getByRole("button", { name: "Delete list" }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible({ timeout: 5000 });

    // Click the destructive Delete button (inside the dialog)
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();

    // After onDeleted() is called, the app navigates to /app
    await expect(page).toHaveURL("/app", { timeout: 10000 });
    await expect(
      page.getByRole("heading", { name: /Your lists|Welcome in/i }),
    ).toBeVisible({ timeout: 10000 });
  });
});
