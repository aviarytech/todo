/**
 * Rename list flow tests.
 *
 * Covers:
 *   1. "Rename list" option is present in the More actions menu
 *   2. Clicking "Rename list" opens the Rename dialog
 *   3. Dialog input is pre-filled with the current list name
 *   4. Cancel button closes the dialog
 *   5. Rename button is disabled when input is empty
 *   6. Confirming rename with a new name submits the mutation and closes the dialog
 *   7. Pressing Enter in the input submits the rename
 *
 * The Convex mock auto-succeeds the renameList mutation (returns null → onClose() fires).
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

async function openRenameDialog(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "More actions" }).click();
  await page.getByRole("button", { name: "Rename list" }).click();

  await expect(
    page.getByRole("dialog", { name: "Rename list" }),
  ).toBeVisible({ timeout: 5000 });
}

test.describe("Rename list flow", () => {
  test("1. Rename list option is present in the actions menu", async ({ page }) => {
    await gotoListPage(page);

    await page.getByRole("button", { name: "More actions" }).click();

    await expect(
      page.getByRole("button", { name: "Rename list" }),
    ).toBeVisible({ timeout: 5000 });
  });

  test("2. clicking Rename list opens the rename dialog", async ({ page }) => {
    await gotoListPage(page);
    await openRenameDialog(page);

    await expect(
      page.getByRole("heading", { name: "Rename list" }),
    ).toBeVisible();
  });

  test("3. rename dialog input is pre-filled with the current list name", async ({ page }) => {
    await gotoListPage(page);
    await openRenameDialog(page);

    const input = page.getByLabel("List name", { exact: false });
    await expect(input).toHaveValue("Test List 1");
  });

  test("4. Cancel button closes the rename dialog", async ({ page }) => {
    await gotoListPage(page);
    await openRenameDialog(page);

    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(
      page.getByRole("dialog", { name: "Rename list" }),
    ).not.toBeVisible({ timeout: 3000 });
    // Still on the list page
    await expect(page).toHaveURL(new RegExp(MOCK_LIST_ID));
  });

  test("5. Rename button is disabled when input is empty", async ({ page }) => {
    await gotoListPage(page);
    await openRenameDialog(page);

    // Clear the pre-filled name
    await page.getByLabel("List name", { exact: false }).clear();

    await expect(
      page.getByRole("button", { name: "Rename" }),
    ).toBeDisabled();
  });

  test("6. confirming rename submits mutation and closes the dialog", async ({ page }) => {
    await gotoListPage(page);
    await openRenameDialog(page);

    // Type a new name
    await page.getByLabel("List name", { exact: false }).fill("My Renamed List");
    await page.getByRole("button", { name: "Rename" }).click();

    // After mutation resolves and onClose() is called, dialog should be gone
    await expect(
      page.getByRole("dialog", { name: "Rename list" }),
    ).not.toBeVisible({ timeout: 10000 });
  });

  test("7. pressing Enter in the input submits the rename", async ({ page }) => {
    await gotoListPage(page);
    await openRenameDialog(page);

    const input = page.getByLabel("List name", { exact: false });
    await input.fill("Enter Key Rename");
    await input.press("Enter");

    // Dialog should close after Enter triggers rename
    await expect(
      page.getByRole("dialog", { name: "Rename list" }),
    ).not.toBeVisible({ timeout: 10000 });
  });
});
