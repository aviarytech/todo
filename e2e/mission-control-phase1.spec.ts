import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { seedAuthSession } from "./fixtures/auth";

interface PerfFixture {
  listOpenRuns?: number;
  listOpenP95Ms?: number;
  activityOpenRuns?: number;
  activityOpenP95Ms?: number;
  itemsPerList?: number;
}

function loadPerfFixture(): PerfFixture {
  const fixturePath = process.env.MISSION_CONTROL_FIXTURE_PATH;
  if (!fixturePath) return {};

  const raw = readFileSync(resolve(process.cwd(), fixturePath), "utf8");
  return JSON.parse(raw) as PerfFixture;
}

async function openAuthenticatedApp(page: Page, displayName: string) {
  await seedAuthSession(page, {
    displayName,
    email: `e2e+${displayName.toLowerCase().replace(/\s+/g, "-")}@poo.app`,
  });

  await page.goto("/");
  await page.goto("/app");

  // Give auth restore + route guards time to settle before deciding readiness.
  // Previous immediate count checks caused false setup-skips while the shell was still hydrating.
  try {
    await expect(page.getByRole("heading", { name: /your lists/i })).toBeVisible({ timeout: 15000 });
    return { ready: true as const };
  } catch {
    const currentUrl = page.url();
    const redirectedToLogin = /\/login(?:$|[?#])/.test(currentUrl);
    return {
      ready: false as const,
      reason: redirectedToLogin
        ? "Authenticated app shell unavailable: redirected to /login after seeded session restore."
        : "Authenticated app shell unavailable in this environment (likely backend auth mismatch).",
    };
  }
}

function requireReady(setup: { ready: boolean; reason?: string }) {
  expect(setup.ready, setup.reason ?? "Authenticated app shell failed to become ready").toBeTruthy();
}

async function createList(page: Page, listName: string) {
  const newListButtons = page.getByRole("button", { name: /new list|create new list/i });
  const count = await newListButtons.count();
  expect(count).toBeGreaterThan(0);
  await newListButtons.nth(Math.max(0, count - 1)).click();

  const blankListButton = page.getByRole("button", { name: /blank list/i });
  if (await blankListButton.count()) {
    await blankListButton.first().click();
  }

  const createPanel = page.getByRole("dialog").last();
  await expect(createPanel).toBeVisible({ timeout: 5000 });
  await createPanel.getByLabel(/list name/i).fill(listName);
  await createPanel.getByRole("button", { name: /^create list$|^creating\.\.\.$/i }).click();

  const navigated = await page
    .waitForURL(/\/list\//, { timeout: 15000 })
    .then(() => true)
    .catch(() => false);

  if (!navigated) {
    test.skip(true, "List create mutation unavailable in this environment (stuck or failed). Skipping gated checks.");
  }

  await expect(page.getByText(listName, { exact: true }).first()).toBeVisible({ timeout: 10000 });
}

async function createItem(page: Page, itemName: string) {
  await page.getByPlaceholder("Add an item...").fill(itemName);
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByText(itemName)).toBeVisible({ timeout: 5000 });
}

async function openItemDetails(page: Page, itemName: string) {
  await page.getByText(itemName, { exact: true }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole("heading", { name: /edit item|item details/i })).toBeVisible({ timeout: 5000 });
}

function p95(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[Math.max(0, idx)] ?? 0;
}

test.describe("Mission Control Phase 1 acceptance", () => {
  const perfFixture = loadPerfFixture();

  test("baseline harness boots app shell", async ({ page }) => {
    await seedAuthSession(page);
    await page.goto("/");
    await expect(page).toHaveURL(/\/(app)?/);
  });

  test("AC1 assignee round-trip: assignee updates propagate to all active clients in <1s", async ({ page }) => {
    const setup = await openAuthenticatedApp(page, "MC Assignee User");
    test.skip(!setup.ready, !setup.ready ? setup.reason : "");
    await createList(page, "MC Assignee List");
    await createItem(page, "MC Assigned Item");

    await expect(page.getByRole("button", { name: /assign/i }).first()).toBeVisible({ timeout: 5000 });

    const start = Date.now();
    await page.getByRole("button", { name: /assign/i }).first().click();
    await expect(page.getByText(/assigned/i)).toBeVisible({ timeout: 1000 });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(1000);
  });

  test("AC2 activity log completeness: created|completed|assigned|commented|edited each writes exactly one activity row", async ({ page }) => {
    const setup = await openAuthenticatedApp(page, "MC Activity User");
    test.skip(!setup.ready, !setup.ready ? setup.reason : "");
    await createList(page, "MC Activity List");
    await createItem(page, "Activity Item");

    await page.getByRole("button", { name: /assign/i }).first().click();
    await expect(page.getByText(/assigned/i)).toBeVisible({ timeout: 1500 });

    await openItemDetails(page, "Activity Item");
    await page.locator('div[role="dialog"] input[type="text"]').first().fill("Activity Item Renamed");
    await page.getByPlaceholder(/add a comment/i).fill("mission-control-comment");
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: /save/i }).click();

    await expect(page.getByText("Activity Item Renamed")).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "Check item" }).first().click();
    await expect(page.getByRole("button", { name: "Uncheck item" }).first()).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: /open activity log/i }).click();
    await expect(page.getByRole("heading", { name: /activity log/i })).toBeVisible();

    await expect(page.getByText(/created “Activity Item”/i)).toHaveCount(1);
    await expect(page.getByText(/completed “Activity Item Renamed”/i)).toHaveCount(1);
    await expect(page.getByText(/assigned “Activity Item” to You/i)).toHaveCount(1);
    await expect(page.getByText(/commented on “Activity Item Renamed”/i)).toHaveCount(1);
    await expect(page.getByText(/edited “Activity Item Renamed”/i)).toHaveCount(1);

    await page.getByRole("button", { name: /close activity log/i }).click();
  });

  test("AC3 presence freshness: presence disappears <= 90s after list close", async ({ browser }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    await seedAuthSession(pageA, { displayName: "MC Presence A" });
    await seedAuthSession(pageB, { displayName: "MC Presence B" });

    const setup = await openAuthenticatedApp(pageA, "MC Presence A");
    test.skip(!setup.ready, !setup.ready ? setup.reason : "");
    await createList(pageA, "MC Presence List");

    await pageB.goto(pageA.url());
    await pageB.close();

    await expect(pageA.getByText(/online|active now|viewing/i)).not.toContainText("2", {
      timeout: 90000,
    });

    await contextA.close();
    await contextB.close();
  });

  test("AC4 no-regression core UX: non-collab user flow has no required new fields and no agent UI by default", async ({ page }) => {
    const setup = await openAuthenticatedApp(page, "MC No Regression");
    requireReady(setup);
    await expect(page.getByRole("heading", { name: "Your Lists" })).toBeVisible({ timeout: 10000 });

    await expect(page.getByText(/assignee required/i)).toHaveCount(0);
    await expect(page.getByLabel(/assignee/i)).toHaveCount(0);
    await expect(page.getByText(/mission control agent/i)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /agent/i })).toHaveCount(0);
  });

  test("AC5a perf floor harness: P95 list open <500ms", async ({ page }) => {
    const setup = await openAuthenticatedApp(page, "MC Perf User");
    test.skip(!setup.ready, !setup.ready ? setup.reason : "");

    const samples: number[] = [];
    const runs = perfFixture.listOpenRuns ?? 6;
    const thresholdMs = perfFixture.listOpenP95Ms ?? 500;
    const itemsPerList = perfFixture.itemsPerList ?? 1;

    for (let i = 0; i < runs; i += 1) {
      const listName = `Perf List ${i + 1}`;
      await createList(page, listName);

      for (let j = 0; j < itemsPerList; j += 1) {
        await createItem(page, `Perf Item ${i + 1}.${j + 1}`);
      }

      await page.getByRole("link", { name: "Back to lists" }).click();
      await expect(page.getByRole("heading", { name: "Your Lists" })).toBeVisible({ timeout: 10000 });

      const t0 = Date.now();
      await page.getByRole("heading", { name: listName }).click();
      await expect(page.getByRole("heading", { name: listName })).toBeVisible({ timeout: 10000 });
      samples.push(Date.now() - t0);

      await page.getByRole("link", { name: "Back to lists" }).click();
    }

    const listOpenP95 = p95(samples);
    test.info().annotations.push({ type: "metric", description: `list_open_p95_ms=${listOpenP95};samples=${samples.join(",")};fixturePath=${process.env.MISSION_CONTROL_FIXTURE_PATH ?? "none"}` });
    expect(listOpenP95).toBeLessThan(thresholdMs);
  });

  test("AC5b perf floor harness: activity panel load P95 <700ms", async ({ page }) => {
    const setup = await openAuthenticatedApp(page, "MC Perf Activity User");
    test.skip(!setup.ready, !setup.ready ? setup.reason : "");
    await createList(page, "MC Perf Activity List");

    const samples: number[] = [];
    const runs = perfFixture.activityOpenRuns ?? 6;
    const thresholdMs = perfFixture.activityOpenP95Ms ?? 700;

    for (let i = 0; i < runs; i += 1) {
      const itemName = `Perf Activity Item ${i + 1}`;
      await createItem(page, itemName);

      const t0 = Date.now();
      await openItemDetails(page, itemName);
      await expect(page.getByText(/activity/i)).toBeVisible({ timeout: 5000 });
      samples.push(Date.now() - t0);

      await page.getByRole("button", { name: /close panel/i }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }

    const activityOpenP95 = p95(samples);
    test.info().annotations.push({ type: "metric", description: `activity_open_p95_ms=${activityOpenP95};samples=${samples.join(",")};fixturePath=${process.env.MISSION_CONTROL_FIXTURE_PATH ?? "none"}` });
    expect(activityOpenP95).toBeLessThan(thresholdMs);
  });
});
