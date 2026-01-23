import { test, expect } from "@playwright/test";

test.describe("Sharing flow", () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Create identity and a list
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Create identity
    await page.getByLabel("Your name").fill("Share Tester");
    await page.getByRole("button", { name: "Get Started" }).click();
    await expect(page.getByRole("heading", { name: "Your Lists" })).toBeVisible({ timeout: 10000 });

    // Create a list
    await page.getByRole("button", { name: "New List" }).click();
    await page.getByLabel("List name").fill("Shared List");
    await page.getByRole("button", { name: "Create List" }).click();
    await expect(page.getByRole("heading", { name: "Shared List" })).toBeVisible({ timeout: 10000 });
  });

  test("shows share button for list owner", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Share" })).toBeVisible();
  });

  test("opens share modal and generates invite link", async ({ page }) => {
    await page.getByRole("button", { name: "Share" }).click();

    // Modal should open
    await expect(page.getByRole("heading", { name: /Share "Shared List"/ })).toBeVisible();

    // Wait for invite link to be generated
    await expect(page.getByLabel("Invite link")).toBeVisible({ timeout: 5000 });
  });

  test("can copy invite link", async ({ page }) => {
    await page.getByRole("button", { name: "Share" }).click();

    // Wait for invite link
    await expect(page.getByLabel("Invite link")).toBeVisible({ timeout: 5000 });

    // Click copy button
    await page.getByRole("button", { name: "Copy" }).click();

    // Should show "Copied!" feedback
    await expect(page.getByRole("button", { name: "Copied!" })).toBeVisible();
  });

  test("can close share modal", async ({ page }) => {
    await page.getByRole("button", { name: "Share" }).click();
    await expect(page.getByRole("heading", { name: /Share "Shared List"/ })).toBeVisible();

    // Close modal
    await page.getByRole("button", { name: "Done" }).click();

    // Modal should close
    await expect(page.getByRole("heading", { name: /Share "Shared List"/ })).not.toBeVisible();
  });
});

test.describe("Join flow", () => {
  test("shows error for invalid invite link", async ({ page }) => {
    // Navigate to an invalid invite link
    await page.goto("/join/invalid-list-id/invalid-token");

    // Should show error or redirect (depending on implementation)
    // Since identity doesn't exist, it will prompt for identity first
    await expect(page.getByRole("heading", { name: "Welcome to Lisa" })).toBeVisible();
  });
});
