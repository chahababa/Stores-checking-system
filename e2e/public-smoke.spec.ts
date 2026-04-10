import { expect, test } from "@playwright/test";

test.describe("public smoke flows", () => {
  test("login page renders the Google sign-in entry point", async ({ page }) => {
    await page.goto("/login");

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByRole("button")).toHaveCount(1);
    await expect(page.getByRole("button")).toBeVisible();
  });

  test("signed-out visitors are redirected to login from protected pages", async ({ page }) => {
    const protectedPaths = ["/", "/inspection/history", "/settings/staff", "/settings/users"];

    for (const path of protectedPaths) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole("button")).toBeVisible();
    }
  });
});
