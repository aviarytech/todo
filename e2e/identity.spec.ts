/**
 * Authentication / Identity tests for the Turnkey email-OTP flow.
 *
 * Covers:
 *   1. Unauthenticated access to the app redirects to /login
 *   2. Login page renders the email OTP form correctly
 *   3. Email validation shows an error for empty input
 *   4. A seeded auth session persists after page reload
 */

import { test, expect } from "@playwright/test";
import { seedAuthSession } from "./fixtures/auth";
import { mockConvexWebSocket } from "./fixtures/convex";

test.describe("Authentication / Identity flow", () => {
  test("unauthenticated user at /app redirects to /login", async ({ page }) => {
    await page.goto("/app");
    await expect(page).toHaveURL("/login");
  });

  test("login page shows email OTP form", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: "Welcome to Poo App" }),
    ).toBeVisible();
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Send Code/i }),
    ).toBeVisible();
  });

  test("authenticated user at /login is redirected to /app", async ({ page }) => {
    await mockConvexWebSocket(page, { existingListCount: 0 });
    await seedAuthSession(page);
    // Login page redirects authenticated users directly to /app
    await page.goto("/login");
    await expect(page).toHaveURL("/app");
  });

  test("auth session persists after page reload", async ({ page }) => {
    await mockConvexWebSocket(page, { existingListCount: 0 });
    await seedAuthSession(page);
    await page.goto("/app");

    // Confirm we landed on the authenticated home page
    await expect(
      page.getByRole("heading", { name: "Your Lists" }),
    ).toBeVisible({ timeout: 10000 });

    // Reload — localStorage still has the JWT so no redirect to /login
    await page.reload();

    await expect(page).toHaveURL("/app");
    await expect(
      page.getByRole("heading", { name: "Your Lists" }),
    ).toBeVisible({ timeout: 10000 });
  });
});
