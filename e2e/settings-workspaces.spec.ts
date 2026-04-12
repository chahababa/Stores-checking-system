import { expect, test } from "@playwright/test";

const ownerStorageState = process.env.PLAYWRIGHT_OWNER_STORAGE_STATE;

test.describe("owner settings workspaces", () => {
  test.skip(!ownerStorageState, "Set PLAYWRIGHT_OWNER_STORAGE_STATE to verify settings workspaces.");
  test.use({ storageState: ownerStorageState! });

  test("owner can open tag management workspace", async ({ page }) => {
    await page.goto("/settings/focus-items");

    await expect(page.getByTestId("tag-management-page")).toBeVisible();
    await expect(page.getByTestId("tag-management-overview")).toBeVisible();
    await expect(page.getByTestId("tag-section-critical")).toBeVisible();
    await expect(page.getByTestId("tag-section-monthly-attention")).toBeVisible();
    await expect(page.getByTestId("tag-section-complaint-watch")).toBeVisible();
    await expect(page.getByTestId("monthly-tag-store-filter")).toBeVisible();
    await expect(page.getByTestId("complaint-tag-store-filter")).toBeVisible();
  });

  test("owner can open staff management workspace", async ({ page }) => {
    await page.goto("/settings/staff");

    await expect(page.getByTestId("staff-settings-page")).toBeVisible();
    await expect(page.getByTestId("staff-create-form")).toBeVisible();
    await expect(page.getByTestId("staff-store-select")).toBeVisible();
    await expect(page.getByTestId("staff-list")).toBeVisible();
  });

  test("owner can preview qa cleanup workspace without running deletion", async ({ page }) => {
    await page.goto("/settings/qa-cleanup");

    await expect(page.getByTestId("qa-cleanup-page")).toBeVisible();
    await expect(page.getByTestId("qa-cleanup-summary")).toBeVisible();
    await expect(page.getByTestId("qa-preview-stores")).toBeVisible();
    await expect(page.getByTestId("qa-preview-users")).toBeVisible();
    await expect(page.getByTestId("qa-preview-staff")).toBeVisible();
    await expect(page.getByTestId("qa-preview-inspections")).toBeVisible();
    await expect(page.getByTestId("qa-preview-tags")).toBeVisible();
    await expect(page.getByTestId("qa-cleanup-submit")).toBeVisible();
  });

  test("owner can open users, stores, and items workspaces", async ({ page }) => {
    await page.goto("/settings/users");
    await expect(page.getByTestId("users-settings-page")).toBeVisible();
    await expect(page.getByTestId("users-create-form")).toBeVisible();
    await expect(page.getByTestId("users-role-select")).toBeVisible();
    await expect(page.getByTestId("users-store-select")).toBeVisible();
    await expect(page.getByTestId("users-table")).toBeVisible();

    await page.goto("/settings/stores");
    await expect(page.getByTestId("stores-settings-page")).toBeVisible();
    await expect(page.getByTestId("stores-create-form")).toBeVisible();
    await expect(page.getByTestId("stores-list")).toBeVisible();

    await page.goto("/settings/items");
    await expect(page.getByTestId("items-settings-page")).toBeVisible();
    await expect(page.getByTestId("items-category-create-form")).toBeVisible();
    await expect(page.getByTestId("items-category-list")).toBeVisible();
    await expect(page.getByTestId("items-base-list")).toBeVisible();
    await expect(page.getByTestId("items-store-filter-form")).toBeVisible();
    await expect(page.getByTestId("items-store-select")).toBeVisible();
    await expect(page.getByTestId("items-extra-form")).toBeVisible();
    await expect(page.getByTestId("items-item-editing")).toBeVisible();
  });
});
