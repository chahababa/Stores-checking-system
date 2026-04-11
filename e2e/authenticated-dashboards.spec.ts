import { expect, test } from "@playwright/test";

const ownerStorageState = process.env.PLAYWRIGHT_OWNER_STORAGE_STATE;
const leaderStorageState = process.env.PLAYWRIGHT_LEADER_STORAGE_STATE;

test.describe("owner dashboard", () => {
  test.skip(!ownerStorageState, "Set PLAYWRIGHT_OWNER_STORAGE_STATE to verify the owner dashboard.");
  test.use({ storageState: ownerStorageState });

  test("owner sees the cross-store operations dashboard", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "營運總覽首頁" })).toBeVisible();
    await expect(page.getByText("管理快捷入口")).toBeVisible();
    await expect(page.locator('a[href="/inspection/new"]')).toBeVisible();
    await expect(page.locator('a[href="/settings/users"]')).toBeVisible();
    await expect(page.locator('a[href="/audit"]')).toBeVisible();
  });
});

test.describe("leader dashboard", () => {
  test.skip(!leaderStorageState, "Set PLAYWRIGHT_LEADER_STORAGE_STATE to verify the leader dashboard.");
  test.use({ storageState: leaderStorageState });

  test("leader sees the single-store workspace and limited navigation", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "單店營運工作台" })).toBeVisible();
    await expect(page.getByText("本店待改善清單")).toBeVisible();
    await expect(page.getByText("最近低分提醒")).toBeVisible();

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
});
