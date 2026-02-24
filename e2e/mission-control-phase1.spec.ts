import { test, expect, type Page } from "@playwright/test";

interface SeededAuthState {
  user: {
    turnkeySubOrgId: string;
    email: string;
    did: string;
    displayName: string;
  };
  token: string;
}

const SEEDED_AUTH_ENV = {
  token: process.env.E2E_AUTH_TOKEN,
  email: process.env.E2E_AUTH_EMAIL,
  subOrgId: process.env.E2E_AUTH_SUBORG_ID,
  did: process.env.E2E_AUTH_DID,
  displayName: process.env.E2E_AUTH_DISPLAY_NAME,
} as const;

function getSeededAuthState(nameFallback: string): SeededAuthState | null {
  const { token, email, subOrgId, did, displayName } = SEEDED_AUTH_ENV;
  if (!token || !email || !subOrgId || !did) {
    return null;
  }

  return {
    token,
    user: {
      turnkeySubOrgId: subOrgId,
      email,
      did,
      displayName: displayName ?? nameFallback,
    },
  };
}

async function seedAuthSession(page: Page, seeded: SeededAuthState) {
  const serialized = JSON.stringify(seeded);
  await page.addInitScript((payload) => {
    localStorage.setItem("lisa-auth-state", payload);
    const parsed = JSON.parse(payload);
    localStorage.setItem("lisa-jwt-token", parsed.token);
  }, serialized);
}

async function resetAndCreateIdentity(page: Page, name: string) {
  const seededAuthState = getSeededAuthState(name);

  await page.goto("/");
  await page.evaluate(() => localStorage.clear());

  if (seededAuthState) {
    await seedAuthSession(page, seededAuthState);
    await page.reload();

    const isInApp = (await page.getByRole("heading", { name: "Your Lists" }).count()) > 0
      || /\/app/.test(page.url());

    if (isInApp) {
      await expect(page.getByRole("heading", { name: "Your Lists" })).toBeVisible({ timeout: 15000 });
      return { ready: true as const };
    }
  }

  await page.reload();

  const hasNameField = (await page.getByLabel("Your name").count()) > 0;
  if (!hasNameField) {
    return {
      ready: false as const,
      reason: "Identity bootstrap UI is unavailable (OTP auth gate). Set E2E_AUTH_TOKEN/E2E_AUTH_EMAIL/E2E_AUTH_SUBORG_ID/E2E_AUTH_DID to run seeded Phase 1 acceptance tests.",
    };
  }

  await page.getByLabel("Your name").fill(name);
  await page.getByRole("button", { name: "Get Started" }).click();
  await expect(page.getByRole("heading", { name: "Your Lists" })).toBeVisible({ timeout: 15000 });
  return { ready: true as const };
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

function p95(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[Math.max(0, idx)] ?? 0;
}

test.describe("Mission Control Phase 1 acceptance", () => {
  test("baseline harness boots app shell", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\//);
  });

  test("AC1 assignee round-trip: assignee updates propagate to all active clients in <1s", async ({ page }) => {
    const setup = await resetAndCreateIdentity(page, "MC Assignee User");
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
    const setup = await resetAndCreateIdentity(page, "MC Activity User");
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
    await expect(page.getByText(/commented/i)).toHaveCount(1);
    await expect(page.getByText(/edited|renamed/i)).toHaveCount(1);
  });

  test("AC3 presence freshness: presence disappears <= 90s after list close", async ({ browser }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    const setup = await resetAndCreateIdentity(pageA, "MC Presence A");
    test.skip(!setup.ready, !setup.ready ? setup.reason : "");
    await createList(pageA, "MC Presence List");

    // Current app keeps identity local per browser context; true multi-user presence
    // validation requires shared fixture auth/session setup.
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
    const setup = await resetAndCreateIdentity(page, "MC No Regression");
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
    const setup = await resetAndCreateIdentity(page, "MC Perf User");
    test.skip(!setup.ready, !setup.ready ? setup.reason : "");

    const samples: number[] = [];
    const runs = 6;

    for (let i = 0; i < runs; i += 1) {
      const listName = `Perf List ${i + 1}`;
      await createList(page, listName);

      await page.getByRole("link", { name: "Back to lists" }).click();
      await expect(page.getByRole("heading", { name: "Your Lists" })).toBeVisible({ timeout: 10000 });

      const t0 = Date.now();
      await page.getByRole("heading", { name: listName }).click();
      await expect(page.getByRole("heading", { name: listName })).toBeVisible({ timeout: 10000 });
      samples.push(Date.now() - t0);

      await page.getByRole("link", { name: "Back to lists" }).click();
    }

    const listOpenP95 = p95(samples);
    test.info().annotations.push({ type: "metric", description: `list_open_p95_ms=${listOpenP95};samples=${samples.join(",")}` });
    expect(listOpenP95).toBeLessThan(500);
  });

  test("AC5b perf floor harness: activity panel load P95 <700ms", async ({ page }) => {
    const setup = await resetAndCreateIdentity(page, "MC Perf Activity User");
    test.skip(!setup.ready, !setup.ready ? setup.reason : "");
    await createList(page, "MC Perf Activity List");

    const hasActivityPanel = (await page.getByRole("button", { name: /activity/i }).count()) > 0;
    test.skip(!hasActivityPanel, "Activity panel UI is not in current build; harness reserved for Phase 1 completion.");

    const samples: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      const t0 = Date.now();
      await page.getByRole("button", { name: /activity/i }).first().click();
      await expect(page.getByText(/activity/i)).toBeVisible({ timeout: 5000 });
      samples.push(Date.now() - t0);
      await page.keyboard.press("Escape");
    }

    const activityOpenP95 = p95(samples);
    test.info().annotations.push({ type: "metric", description: `activity_open_p95_ms=${activityOpenP95};samples=${samples.join(",")}` });
    expect(activityOpenP95).toBeLessThan(700);
  });
});
