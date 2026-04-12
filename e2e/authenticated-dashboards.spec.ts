import { expect, test } from "@playwright/test";

const ownerStorageState = process.env.PLAYWRIGHT_OWNER_STORAGE_STATE;
const leaderStorageState = process.env.PLAYWRIGHT_LEADER_STORAGE_STATE;

test.describe("owner experience", () => {
  test.skip(!ownerStorageState, "Set PLAYWRIGHT_OWNER_STORAGE_STATE to verify the owner experience.");
  test.use({ storageState: ownerStorageState });

  test("owner sees the cross-store operations dashboard", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "跨店營運總覽" })).toBeVisible();
    await expect(page.getByText("本月總評")).toBeVisible();
    await expect(page.getByText("各分類健康度")).toBeVisible();
    await expect(page.getByText("必查異常")).toBeVisible();
    await expect(page.locator('a[href="/inspection/new"]')).toBeVisible();
    await expect(page.locator('a[href="/settings/users"]')).toBeVisible();
    await expect(page.locator('a[href="/audit"]')).toBeVisible();
  });

  test("owner report page shows category health and tag issue metrics", async ({ page }) => {
    await page.goto("/inspection/reports");

    await expect(page.getByRole("heading", { name: "巡店月報" })).toBeVisible();
    await expect(page.getByText("各大項表現")).toBeVisible();
    await expect(page.getByText("必查異常")).toBeVisible();
    await expect(page.getByText("本月加強異常")).toBeVisible();
    await expect(page.locator('select[name="store"]')).toBeVisible();
  });

  test("owner can open notification center", async ({ page }) => {
    await page.goto("/notifications");

    await expect(page.getByTestId("notifications-page")).toBeVisible();
    await expect(page.getByTestId("notifications-summary")).toBeVisible();
    await expect(page.getByTestId("notifications-section-high")).toBeVisible();
    await expect(page.getByTestId("notifications-section-medium")).toBeVisible();
    await expect(page.getByTestId("notifications-section-low")).toBeVisible();
  });
});

test.describe("leader experience", () => {
  test.skip(!leaderStorageState, "Set PLAYWRIGHT_LEADER_STORAGE_STATE to verify the leader experience.");
  test.use({ storageState: leaderStorageState });

  test("leader sees the single-store workspace and limited navigation", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "單店營運工作台" })).toBeVisible();
    await expect(page.getByText("今天先看這三件事")).toBeVisible();
    await expect(page.getByText("本店待改善清單")).toBeVisible();
    await expect(page.getByText("必查異常")).toBeVisible();

    await expect(page.locator('a[href="/inspection/history"]')).toBeVisible();
    await expect(page.locator('a[href="/inspection/improvements"]')).toBeVisible();
    await expect(page.locator('a[href="/inspection/reports"]')).toBeVisible();
    await expect(page.locator('a[href="/settings/staff"]')).toBeVisible();

    await expect(page.locator('a[href="/inspection/new"]')).toHaveCount(0);
    await expect(page.locator('a[href="/audit"]')).toHaveCount(0);
    await expect(page.locator('a[href="/settings/users"]')).toHaveCount(0);
    await expect(page.locator('a[href="/settings/stores"]')).toHaveCount(0);
    await expect(page.locator('a[href="/settings/items"]')).toHaveCount(0);
    await expect(page.locator('a[href="/settings/focus-items"]')).toHaveCount(0);
  });

  test("leader report page locks to the assigned store", async ({ page }) => {
    await page.goto("/inspection/reports");

    await expect(page.getByRole("heading", { name: "巡店月報" })).toBeVisible();
    await expect(page.getByText("目前店別")).toBeVisible();
    await expect(page.locator('select[name="store"]')).toHaveCount(0);
    await expect(page.getByText("本月加強異常")).toBeVisible();
  });

  test("leader can open notification center", async ({ page }) => {
    await page.goto("/notifications");

    await expect(page.getByTestId("notifications-page")).toBeVisible();
    await expect(page.getByTestId("notifications-summary")).toBeVisible();
    await expect(page.getByTestId("notifications-section-high")).toBeVisible();
    await expect(page.getByTestId("notifications-section-medium")).toBeVisible();
    await expect(page.getByTestId("notifications-section-low")).toBeVisible();
  });

  test("leader is blocked from owner and manager only routes", async ({ page }) => {
    for (const path of ["/inspection/new", "/audit", "/settings/users"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/forbidden\?reason=role/);
      await expect(page.getByRole("heading", { name: "權限不足" })).toBeVisible();
    }
  });
});
