import { expect, test } from "@playwright/test";

test.describe("FaceLens E2E Critical Flows", () => {
  test("marketing landing page renders private-collection hero and navigates to login", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByText(/Authorized Private Collection/i).first()).toBeVisible();
    await page
      .getByRole("link", { name: /Sign in/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated access to protected dashboard redirects to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
  });
});
