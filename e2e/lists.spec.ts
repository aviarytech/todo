import { test, expect } from "@playwright/test";

test.describe("List management", () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Create identity if needed
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Create identity
    await page.getByLabel("Your name").fill("List Tester");
    await page.getByRole("button", { name: "Get Started" }).click();

    // Wait for home page
    await expect(page.getByRole("heading", { name: "Your Lists" })).toBeVisible({ timeout: 10000 });
  });

  test("shows empty state when no lists exist", async ({ page }) => {
    await expect(page.getByText("No lists yet")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create List" })).toBeVisible();
  });

  test("opens create list modal", async ({ page }) => {
    await page.getByRole("button", { name: "New List" }).click();

    await expect(page.getByRole("heading", { name: "Create New List" })).toBeVisible();
    await expect(page.getByLabel("List name")).toBeVisible();
  });

  test("creates a new list", async ({ page }) => {
    await page.getByRole("button", { name: "New List" }).click();

    // Fill in list name
    await page.getByLabel("List name").fill("Groceries");
    await page.getByRole("button", { name: "Create List" }).click();

    // Should navigate to the list view
    await expect(page.getByRole("heading", { name: "Groceries" })).toBeVisible({ timeout: 10000 });
  });

  test("validates empty list name", async ({ page }) => {
    await page.getByRole("button", { name: "New List" }).click();

    // Try to create without a name
    await page.getByRole("button", { name: "Create List" }).click();

    // Should show error
    await expect(page.getByText("Please enter a list name")).toBeVisible();
  });

  test("can cancel list creation", async ({ page }) => {
    await page.getByRole("button", { name: "New List" }).click();

    // Cancel
    await page.getByRole("button", { name: "Cancel" }).click();

    // Modal should close
    await expect(page.getByRole("heading", { name: "Create New List" })).not.toBeVisible();
  });
});
