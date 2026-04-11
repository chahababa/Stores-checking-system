import { expect, test } from "@playwright/test";

const ownerStorageState = process.env.PLAYWRIGHT_OWNER_STORAGE_STATE;

test.describe.serial("inspection core flow", () => {
  test.skip(!ownerStorageState, "Set PLAYWRIGHT_OWNER_STORAGE_STATE to verify the inspection core flow.");
  test.use({ storageState: ownerStorageState! });

  let createdTimeSlot = "";
  let createdNote = "";

  test("owner can create an inspection and generate a follow-up task", async ({ page }) => {
    const uniqueId = Date.now();
    createdTimeSlot = `QA-E2E-${uniqueId}`;
    createdNote = `QA-E2E note ${uniqueId}`;

    await page.goto("/inspection/new");

    await expect(page.getByTestId("inspection-create-form")).toBeVisible();
    await page.getByTestId("inspection-time-slot-input").fill(createdTimeSlot);
    await page.getByTestId("inspection-bulk-score-3").click();

    const firstItem = page.locator('[data-testid^="inspection-item-"]').first();
    await firstItem.locator('button[data-score="1"]').click();
    await firstItem.locator('textarea[data-testid^="inspection-note-"]').fill(createdNote);

    await page.getByTestId("inspection-submit-button").click();
    await page.waitForURL("**/inspection/history");

    const historyRow = page.locator("tr", { hasText: createdTimeSlot }).first();
    await expect(historyRow).toBeVisible();

    await historyRow.locator('[data-testid^="inspection-history-view-"]').click();
    await page.waitForURL(/\/inspection\/history\/[^/]+$/);

    await expect(page.getByTestId("inspection-detail-page")).toBeVisible();
    await expect(page.getByTestId("inspection-detail-overall-grade")).toBeVisible();
    await expect(page.getByText(createdNote)).toBeVisible();

    await page.goto("/inspection/improvements");

    const taskCard = page.locator('[data-testid^="improvement-task-"]', { hasText: createdNote }).first();
    await expect(taskCard).toBeVisible();
    await expect(taskCard).toContainText("待處理");
  });

  test("owner can edit the inspection and move the generated task through statuses", async ({ page }) => {
    test.skip(!createdTimeSlot || !createdNote, "The creation step must succeed before editing.");

    await page.goto("/inspection/history");
    const historyRow = page.locator("tr", { hasText: createdTimeSlot }).first();
    await expect(historyRow).toBeVisible();
    await historyRow.locator('[data-testid^="inspection-history-view-"]').click();

    await page.waitForURL(/\/inspection\/history\/[^/]+$/);
    await expect(page.getByTestId("inspection-detail-page")).toBeVisible();

    await page.getByTestId("inspection-edit-link").click();
    await page.waitForURL(/\/inspection\/history\/[^/]+\/edit$/);
    await expect(page.getByTestId("inspection-edit-form")).toBeVisible();

    const firstItem = page.locator('[data-testid^="inspection-item-"]').first();
    await firstItem.locator('button[data-score="2"]').click();
    await firstItem.locator('textarea[data-testid^="inspection-note-"]').fill(`${createdNote} updated`);

    await page.getByTestId("inspection-submit-button").click();
    await page.waitForURL("**/inspection/history");

    await page.goto("/inspection/improvements");
    const taskCard = page.locator('[data-testid^="improvement-task-"]', { hasText: createdNote }).first();
    await expect(taskCard).toBeVisible();

    await taskCard.locator('[data-testid^="improvement-task-status-resolved-"]').click();
    await expect(taskCard).toContainText("已改善");

    await taskCard.locator('[data-testid^="improvement-task-status-verified-"]').click();
    await expect(taskCard).toContainText("已確認");
  });
});
