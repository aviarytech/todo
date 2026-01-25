import { test, expect } from "@playwright/test";

test.describe("Identity creation flow", () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("shows identity setup modal when no identity exists", async ({ page }) => {
    await page.goto("/");

    // Should show the welcome modal
    await expect(page.getByRole("heading", { name: "Welcome to Poo App" })).toBeVisible();
    await expect(page.getByLabel("Your name")).toBeVisible();
    await expect(page.getByRole("button", { name: "Get Started" })).toBeVisible();
  });

  test("creates identity when user enters name", async ({ page }) => {
    await page.goto("/");

    // Fill in the name
    await page.getByLabel("Your name").fill("Test User");

    // Click get started
    await page.getByRole("button", { name: "Get Started" }).click();

    // Wait for identity creation and modal to close
    await expect(page.getByRole("heading", { name: "Welcome to Poo App" })).not.toBeVisible({ timeout: 10000 });

    // Should show the home page with user's name in profile badge
    await expect(page.getByText("Test User")).toBeVisible();
  });

  test("validates empty name", async ({ page }) => {
    await page.goto("/");

    // Try to submit without entering a name
    await page.getByRole("button", { name: "Get Started" }).click();

    // Should show error
    await expect(page.getByText("Please enter a display name")).toBeVisible();
  });

  test("persists identity after page reload", async ({ page }) => {
    await page.goto("/");

    // Create identity
    await page.getByLabel("Your name").fill("Persistent User");
    await page.getByRole("button", { name: "Get Started" }).click();

    // Wait for identity creation
    await expect(page.getByText("Persistent User")).toBeVisible({ timeout: 10000 });

    // Reload page
    await page.reload();

    // Identity should persist
    await expect(page.getByText("Persistent User")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Welcome to Poo App" })).not.toBeVisible();
  });
});
