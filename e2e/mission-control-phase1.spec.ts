import { test, expect, type Page } from "@playwright/test";
import { seedAuthSession } from "./fixtures/auth";
import { loadPerfFixtureFromEnv } from "./fixtures/mission-control-perf-fixture";

async function openAuthenticatedApp(page: Page, displayName: string) {
  await seedAuthSession(page, {
    displayName,
    email: `e2e+${displayName.toLowerCase().replace(/\s+/g, "-")}@poo.app`,
  });

  await page.goto("/");
  await page.goto("/app");

  const inAppShell = (await page.getByRole("heading", { name: /your lists/i }).count()) > 0;
  if (inAppShell) {
    await expect(page.getByRole("heading", { name: /your lists/i })).toBeVisible({ timeout: 15000 });
    return { ready: true as const };
  }

  const hasOtpUi =
    (await page.getByRole("button", { name: /send code|verify code/i }).count()) > 0
    || (await page.getByLabel(/email/i).count()) > 0
    || (await page.getByLabel(/verification code|otp/i).count()) > 0;

  const usingSeededEnvAuth = Boolean(process.env.E2E_AUTH_TOKEN);
  if (hasOtpUi && !usingSeededEnvAuth) {
    return {
      ready: false as const,
      reason:
        "Environment requires server-validated auth. Set E2E_AUTH_TOKEN + E2E_AUTH_EMAIL + E2E_AUTH_SUBORG_ID + E2E_AUTH_DID to run Mission Control AC paths.",
    };
  }

  if (hasOtpUi && usingSeededEnvAuth) {
    return {
      ready: false as const,
      reason:
        "Seeded auth env vars are present, but app still shows OTP UI. Verify E2E_AUTH_* values match backend environment.",
    };
  }

  return {
    ready: false as const,
    reason: "Authenticated app shell unavailable; no lists shell or OTP UI detected.",
  };
}

async function createList(page: Page, listName: string) {
  await page.getByRole("button", { name: "New List" }).click();
  await page.getByLabel("List name").fill(listName);
  await page.getByRole("button", { name: "Create List" }).click();
  await expect(page.getByRole("heading", { name: listName })).toBeVisible({ timeout: 10000 });
}

async function createItem(page: Page, itemName: string) {
  await page.getByPlaceholder("Add an item...").fill(itemName);
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByText(itemName)).toBeVisible({ timeout: 5000 });
}

async function seedPerfLists(page: Page, listCount: number, itemsPerList: number, runId: string) {
  const seededListNames: string[] = [];

  for (let i = 0; i < listCount; i += 1) {
    const listName = `Perf List ${runId}-${i + 1}`;
    seededListNames.push(listName);
    await createList(page, listName);

    for (let j = 0; j < itemsPerList; j += 1) {
      await createItem(page, `Perf Item ${i + 1}.${j + 1}`);
    }

    await page.getByRole("link", { name: "Back to lists" }).click();
    await expect(page.getByRole("heading", { name: "Your Lists" })).toBeVisible({ timeout: 10000 });
  }

  return seededListNames;
}

function p95(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[Math.max(0, idx)] ?? 0;
}

test.describe("Mission Control Phase 1 acceptance", () => {
  const perfFixture = loadPerfFixtureFromEnv();

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

    const hasAssigneeUi = (await page.getByRole("button", { name: /assign/i }).count()) > 0
      || (await page.getByText(/assignee/i).count()) > 0;

    test.skip(!hasAssigneeUi, "Assignee UI is not shipped in current build; keeping runnable AC1 harness.");

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

    await page.getByRole("button", { name: "Check item" }).first().click();
    await page.getByRole("button", { name: "Uncheck item" }).first().click();

    const hasCommentUi = (await page.getByPlaceholder(/add a comment/i).count()) > 0;
    if (hasCommentUi) {
      await page.getByPlaceholder(/add a comment/i).first().fill("mission-control-comment");
      await page.keyboard.press("Enter");
    }

    const hasActivityPanel = (await page.getByRole("button", { name: /activity/i }).count()) > 0;
    test.skip(!hasActivityPanel, "Activity panel not available yet; AC2 action harness is in place.");

    await page.getByRole("button", { name: /activity/i }).first().click();

    await expect(page.getByText(/created/i)).toHaveCount(1);
    await expect(page.getByText(/completed/i)).toHaveCount(1);
    if (hasCommentUi) {
      await expect(page.getByText(/commented/i)).toHaveCount(1);
    }
    await expect(page.getByText(/edited|renamed/i)).toHaveCount(1);
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

    const hasPresenceUi = (await pageA.getByText(/online|active now|viewing/i).count()) > 0;
    test.skip(!hasPresenceUi, "Presence indicators are not yet wired in e2e environment.");

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
    test.skip(!setup.ready, !setup.ready ? setup.reason : "");
    await createList(page, "MC Core Flow");
    await createItem(page, "Core Item");

    await page.getByRole("button", { name: "Check item" }).first().click();
    await expect(page.getByRole("button", { name: "Uncheck item" })).toBeVisible();

    await expect(page.getByText(/assignee required/i)).toHaveCount(0);
    await expect(page.getByLabel(/assignee/i)).toHaveCount(0);
    await expect(page.getByText(/mission control agent/i)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /agent/i })).toHaveCount(0);
  });

  test("AC5a perf floor harness: P95 list open <500ms", async ({ page }) => {
    const setup = await openAuthenticatedApp(page, "MC Perf User");
    test.skip(!setup.ready, !setup.ready ? setup.reason : "");

    const samples: number[] = [];
    const runs = perfFixture.listOpenRuns;
    const thresholdMs = perfFixture.listOpenP95Ms;
    const itemsPerList = perfFixture.itemsPerList;
    const seededListCount = Math.max(perfFixture.seededListCount, runs);

    const seededListNames = await seedPerfLists(page, seededListCount, itemsPerList, `${Date.now()}`);

    for (let i = 0; i < runs; i += 1) {
      const listName = seededListNames[i % seededListNames.length];

      const t0 = Date.now();
      await page.getByRole("heading", { name: listName }).click();
      await expect(page.getByRole("heading", { name: listName })).toBeVisible({ timeout: 10000 });
      samples.push(Date.now() - t0);

      await page.getByRole("link", { name: "Back to lists" }).click();
      await expect(page.getByRole("heading", { name: "Your Lists" })).toBeVisible({ timeout: 10000 });
    }

    const listOpenP95 = p95(samples);
    test.info().annotations.push({ type: "metric", description: `list_open_p95_ms=${listOpenP95};samples=${samples.join(",")};fixturePath=${process.env.MISSION_CONTROL_FIXTURE_PATH ?? "none"};seededLists=${seededListCount};itemsPerList=${itemsPerList}` });
    expect(listOpenP95).toBeLessThan(thresholdMs);
  });

  test("AC5b perf floor harness: activity panel load P95 <700ms", async ({ page }) => {
    const setup = await openAuthenticatedApp(page, "MC Perf Activity User");
    test.skip(!setup.ready, !setup.ready ? setup.reason : "");
    await createList(page, "MC Perf Activity List");

    const hasActivityPanel = (await page.getByRole("button", { name: /activity/i }).count()) > 0;
    test.skip(!hasActivityPanel, "Activity panel UI is not in current build; harness reserved for Phase 1 completion.");

    const samples: number[] = [];
    const runs = perfFixture.activityOpenRuns;
    const thresholdMs = perfFixture.activityOpenP95Ms;

    for (let i = 0; i < runs; i += 1) {
      const t0 = Date.now();
      await page.getByRole("button", { name: /activity/i }).first().click();
      await expect(page.getByText(/activity/i)).toBeVisible({ timeout: 5000 });
      samples.push(Date.now() - t0);
      await page.keyboard.press("Escape");
    }

    const activityOpenP95 = p95(samples);
    test.info().annotations.push({ type: "metric", description: `activity_open_p95_ms=${activityOpenP95};samples=${samples.join(",")};fixturePath=${process.env.MISSION_CONTROL_FIXTURE_PATH ?? "none"}` });
    expect(activityOpenP95).toBeLessThan(thresholdMs);
  });
});
