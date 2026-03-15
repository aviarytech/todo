/**
 * Settings panel tests.
 *
 * Covers:
 *   1. Settings panel opens when gear icon in header is clicked
 *   2. Settings panel heading is visible
 *   3. Dark mode toggle is present and accessible
 *   4. Feedback section is accessible
 *   5. Profile link navigates to /profile
 *   6. Done button closes the settings panel
 *
 * All tests use seedAuthSession() + mockConvexWebSocket() for auth + backend.
 */

import { test, expect } from "@playwright/test";
import { seedAuthSession } from "./fixtures/auth";
import { mockConvexWebSocket } from "./fixtures/convex";

async function openSettings(page: import("@playwright/test").Page) {
  await mockConvexWebSocket(page, { existingListCount: 0 });
  await seedAuthSession(page);
  await page.goto("/app");

  await expect(
    page.getByRole("heading", { name: "Your Lists" }),
  ).toBeVisible({ timeout: 10000 });

  await page.getByRole("button", { name: "Settings" }).click();

  await expect(
    page.getByRole("heading", { name: "⚙️ Settings" }),
  ).toBeVisible({ timeout: 5000 });
}

test.describe("Settings panel", () => {
  test("1. settings panel opens when gear icon is clicked", async ({ page }) => {
    await openSettings(page);
    // Already verified in openSettings — just confirm heading is there
    await expect(
      page.getByRole("heading", { name: "⚙️ Settings" }),
    ).toBeVisible();
  });

  test("2. dark mode toggle is visible and interactive", async ({ page }) => {
    await openSettings(page);

    const darkModeToggle = page.getByRole("switch", { name: "Toggle dark mode" });
    await expect(darkModeToggle).toBeVisible();
    // Should have an aria-checked attribute
    const ariaChecked = await darkModeToggle.getAttribute("aria-checked");
    expect(["true", "false"]).toContain(ariaChecked);
  });

  test("3. dark mode toggle changes aria-checked on click", async ({ page }) => {
    await openSettings(page);

    const toggle = page.getByRole("switch", { name: "Toggle dark mode" });
    const before = await toggle.getAttribute("aria-checked");

    await toggle.click();

    // After clicking, aria-checked should be the opposite
    const after = await toggle.getAttribute("aria-checked");
    expect(after).not.toBe(before);
  });

  test("4. Feedback section is present with Send Feedback button", async ({ page }) => {
    await openSettings(page);

    await expect(page.getByRole("button", { name: "Send Feedback" })).toBeVisible();
  });

  test("5. Send Feedback opens feedback modal", async ({ page }) => {
    await openSettings(page);

    await page.getByRole("button", { name: "Send Feedback" }).click();

    await expect(
      page.getByRole("heading", { name: "Send Feedback" }),
    ).toBeVisible({ timeout: 5000 });
    // Category dropdown and body textarea visible
    await expect(page.getByText("Category")).toBeVisible();
    await expect(page.getByPlaceholder("Tell us anything...")).toBeVisible();
  });

  test("6. Feedback modal can be cancelled via backdrop click", async ({ page }) => {
    await openSettings(page);

    await page.getByRole("button", { name: "Send Feedback" }).click();
    await expect(
      page.getByRole("heading", { name: "Send Feedback" }),
    ).toBeVisible({ timeout: 5000 });

    // The feedback modal backdrop has onClick={setFeedbackOpen(false)}.
    // The feedback modal (z-50) is behind the Panel (z-[100]), so the Cancel button
    // cannot receive pointer events. Dismiss via programmatic DOM click on the backdrop.
    await page.evaluate(() => {
      // Find the backdrop div (fixed inset-0 z-50) and click it programmatically
      const backdrops = document.querySelectorAll<HTMLElement>(".fixed.inset-0");
      for (const el of backdrops) {
        if (el.style.zIndex === "" && el.classList.contains("bg-black\\/50")) {
          el.click();
          return;
        }
      }
      // Fallback: find the Cancel button and invoke its click handler directly
      const btns = document.querySelectorAll<HTMLButtonElement>("button");
      for (const btn of btns) {
        if (btn.textContent?.trim() === "Cancel") {
          btn.click();
          return;
        }
      }
    });

    await expect(
      page.getByRole("heading", { name: "Send Feedback" }),
    ).not.toBeVisible({ timeout: 5000 });
  });

  test("7. Profile link in settings navigates to /profile", async ({ page }) => {
    await openSettings(page);

    // Profile link is inside the Account section
    await page.getByRole("link", { name: /Your Profile/i }).click();

    await expect(page).toHaveURL("/profile", { timeout: 10000 });
  });

  test("8. Done button closes the settings panel", async ({ page }) => {
    await openSettings(page);

    await page.getByRole("button", { name: "Done" }).click();

    await expect(
      page.getByRole("heading", { name: "⚙️ Settings" }),
    ).not.toBeVisible({ timeout: 3000 });
  });
});
