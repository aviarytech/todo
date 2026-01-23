import { test, expect } from "@playwright/test";

test.describe("Item management", () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Create identity and a list
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Create identity
    await page.getByLabel("Your name").fill("Item Tester");
    await page.getByRole("button", { name: "Get Started" }).click();
    await expect(page.getByRole("heading", { name: "Your Lists" })).toBeVisible({ timeout: 10000 });

    // Create a list
    await page.getByRole("button", { name: "New List" }).click();
    await page.getByLabel("List name").fill("Test List");
    await page.getByRole("button", { name: "Create List" }).click();
    await expect(page.getByRole("heading", { name: "Test List" })).toBeVisible({ timeout: 10000 });
  });

  test("shows empty state when no items exist", async ({ page }) => {
    await expect(page.getByText("No items yet. Add one below!")).toBeVisible();
  });

  test("adds a new item", async ({ page }) => {
    // Add an item
    await page.getByPlaceholder("Add an item...").fill("Milk");
    await page.getByRole("button", { name: "Add" }).click();

    // Item should appear
    await expect(page.getByText("Milk")).toBeVisible({ timeout: 5000 });
  });

  test("checks and unchecks an item", async ({ page }) => {
    // Add an item
    await page.getByPlaceholder("Add an item...").fill("Bread");
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByText("Bread")).toBeVisible({ timeout: 5000 });

    // Check the item
    await page.getByRole("button", { name: "Check item" }).click();

    // Item should be checked (wait for mutation)
    await expect(page.getByRole("button", { name: "Uncheck item" })).toBeVisible({ timeout: 5000 });

    // Uncheck the item
    await page.getByRole("button", { name: "Uncheck item" }).click();

    // Item should be unchecked
    await expect(page.getByRole("button", { name: "Check item" })).toBeVisible({ timeout: 5000 });
  });

  test("removes an item", async ({ page }) => {
    // Add an item
    await page.getByPlaceholder("Add an item...").fill("Eggs");
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByText("Eggs")).toBeVisible({ timeout: 5000 });

    // Remove the item
    await page.getByRole("button", { name: "Remove item" }).click();

    // Item should be gone
    await expect(page.getByText("Eggs")).not.toBeVisible({ timeout: 5000 });
  });

  test("can navigate back to home", async ({ page }) => {
    await page.getByRole("link", { name: "Back to lists" }).click();

    await expect(page.getByRole("heading", { name: "Your Lists" })).toBeVisible();
  });
});
