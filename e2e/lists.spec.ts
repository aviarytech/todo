/**
 * List management tests.
 *
 * All tests use seedAuthSession() + mockConvexWebSocket() — the old
 * getByLabel("Your name") / "Get Started" identity-modal pattern has been
 * replaced by Turnkey email-OTP auth.
 */

import { test, expect } from "@playwright/test";
import { seedAuthSession } from "./fixtures/auth";
import { mockConvexWebSocket } from "./fixtures/convex";

test.describe("List management", () => {
  test("shows empty state when no lists exist", async ({ page }) => {
    await mockConvexWebSocket(page, { existingListCount: 0 });
    await seedAuthSession(page);
    await page.goto("/d");

    await expect(
      page.getByRole("heading", { name: /Your lists|Welcome in/i }),
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Nothing here yet.")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Make your first list" }),
    ).toBeVisible();
  });

  test("opens create list modal via template picker", async ({ page }) => {
    await mockConvexWebSocket(page, { existingListCount: 0 });
    await seedAuthSession(page);
    await page.goto("/d");

    await page.getByRole("button", { name: "Create new list" }).click({ timeout: 10000 });

    // Template picker opens first
    await expect(
      page.getByRole("heading", { name: "Choose a Template" }),
    ).toBeVisible({ timeout: 5000 });

    // Select "Blank List" to get the create-name form
    await page.getByRole("button", { name: "Blank List" }).click();
    await expect(
      page.getByRole("heading", { name: "Create New List" }),
    ).toBeVisible({ timeout: 5000 });
    await expect(page.getByLabel("List name")).toBeVisible();
  });

  test("creates a new list", async ({ page }) => {
    await mockConvexWebSocket(page, { existingListCount: 0 });
    await seedAuthSession(page);
    await page.goto("/d");

    await page.getByRole("button", { name: "Create new list" }).click({ timeout: 10000 });
    await expect(
      page.getByRole("heading", { name: "Choose a Template" }),
    ).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "Blank List" }).click();
    await page.getByLabel("List name").waitFor({ state: "visible", timeout: 5000 });

    await page.getByLabel("List name").fill("Groceries");
    await page.getByRole("button", { name: "Create List" }).click();

    // Mock mutation returns success — heading changes to "List created!"
    await expect(
      page.getByRole("heading", { name: "List created!" }),
    ).toBeVisible({ timeout: 5000 });
  });

  test("create list button is disabled when name is empty", async ({ page }) => {
    await mockConvexWebSocket(page, { existingListCount: 0 });
    await seedAuthSession(page);
    await page.goto("/d");

    await page.getByRole("button", { name: "Create new list" }).click({ timeout: 10000 });
    await expect(
      page.getByRole("heading", { name: "Choose a Template" }),
    ).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "Blank List" }).click();
    await page.getByLabel("List name").waitFor({ state: "visible", timeout: 5000 });

    // Create List button is disabled when no name is entered (form validation)
    await expect(
      page.getByRole("button", { name: "Create List" }),
    ).toBeDisabled();
  });

  test("can cancel list creation", async ({ page }) => {
    await mockConvexWebSocket(page, { existingListCount: 0 });
    await seedAuthSession(page);
    await page.goto("/d");

    await page.getByRole("button", { name: "Create new list" }).click({ timeout: 10000 });
    await expect(
      page.getByRole("heading", { name: "Choose a Template" }),
    ).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "Blank List" }).click();
    await page.getByLabel("List name").waitFor({ state: "visible", timeout: 5000 });

    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(
      page.getByRole("heading", { name: "Create New List" }),
    ).not.toBeVisible();
  });
});
