import { expect, test } from "@playwright/test";

test.describe("Contrast Lens", () => {
  test("renders the checker with the default pair", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /Make readability visible/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Find the signal/i }),
    ).toBeVisible();
    await expect(page.locator(".ratio-number")).toHaveText("4.52");
    await expect(page.getByText("WCAG 2 contrast ratio")).toBeVisible();
  });

  test("shows a static ratio scale with the current 4.52 just past AA", async ({
    page,
  }) => {
    await page.goto("/#checker");
    await expect(
      page.getByText("Static scale · actual ratio positions"),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: /current ratio is 4\.52 to 1/i }),
    ).toBeVisible();

    const currentLeft = Number.parseFloat(
      await page
        .locator(".ratio-scale-current")
        .evaluate(
          (element) =>
            element.getAttribute("style")!.match(/left: ([\d.]+)%/)![1],
        ),
    );
    const aaLeft = Number.parseFloat(
      await page
        .locator(".ratio-scale-threshold")
        .nth(1)
        .evaluate(
          (element) =>
            element.getAttribute("style")!.match(/left: ([\d.]+)%/)![1],
        ),
    );
    expect(currentLeft).toBeGreaterThan(aaLeft);
  });

  test("updates live scores and makes the blur lens available", async ({
    page,
  }) => {
    await page.goto("/#checker");
    await page.getByLabel("Foreground", { exact: true }).fill("#777777");
    await expect(page.locator(".ratio-number")).toHaveText("4.48");
    await expect(page.getByText("Needs attention")).toBeVisible();

    const lens = page.getByLabel("Enable blur lens");
    await lens.check();
    await expect(page.getByLabel("Blur lens intensity")).toBeEnabled();
    await expect(page.locator(".blur-note")).toContainText("blur pressure");
  });

  test("supports format switching, native pickers, and swapping", async ({
    page,
  }) => {
    await page.goto("/#checker");
    await page.getByLabel("Foreground format").selectOption("RGB");
    await expect(page.getByLabel("Foreground", { exact: true })).toHaveValue(
      "rgb(113 91 255)",
    );

    await page.getByRole("button", { name: "Swap colors" }).click();
    await expect(page.getByLabel("Foreground", { exact: true })).toHaveValue(
      "#FFFFFF",
    );
    await expect(page.getByLabel("Background", { exact: true })).toHaveValue(
      "rgb(113 91 255)",
    );
  });

  test("moves the interactive map and recalculates both color knobs", async ({
    page,
  }) => {
    await page.goto("/#checker");
    await expect(page.locator(".contrast-map-label")).toHaveText([
      "3",
      "4.5",
      "7",
    ]);

    const map = page.locator(".contrast-map");
    await map.scrollIntoViewIfNeeded();
    const bounds = await map.boundingBox();
    expect(bounds).not.toBeNull();
    await page.mouse.click(
      bounds!.x + bounds!.width * 0.8,
      bounds!.y + bounds!.height * 0.25,
    );
    await expect(
      page.getByLabel("Foreground", { exact: true }),
    ).not.toHaveValue("#715BFF");

    await page.getByRole("button", { name: "Background", exact: true }).click();
    await page
      .getByRole("slider", { name: "background color position" })
      .press("ArrowDown");
    await expect(
      page.getByLabel("Background", { exact: true }),
    ).not.toHaveValue("#FFFFFF");
  });

  test("lets users choose AA or AAA and shows the chosen success state", async ({
    page,
  }) => {
    await page.goto("/#checker");
    await expect(
      page.getByRole("button", { name: "WCAG AA target" }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "WCAG AAA target" }).click();
    await expect(page.locator(".focus-feedback")).toContainText("AAA review");

    await page.getByLabel("Foreground", { exact: true }).fill("#000000");
    await expect(page.locator(".focus-feedback")).toContainText("AAA success");
    await expect(page.locator(".focus-panel")).toHaveClass(
      /focus-panel-success/,
    );
  });

  test("reveals concise explanations from question-mark buttons", async ({
    page,
  }) => {
    await page.goto("/#checker");
    await page.getByRole("button", { name: "What is APCA?" }).click();
    await expect(page.getByRole("tooltip")).toContainText(
      "directional readability score",
    );

    await page.getByRole("button", { name: "What is WCAG focus?" }).click();
    await expect(page.getByRole("tooltip")).toContainText(
      "AA is the usual minimum",
    );
    await expect(page.getByRole("tooltip")).toHaveCount(1);
  });

  test("keeps the checker keyboard and reduced-motion friendly", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Check a pair" }).press("Enter");
    await expect(page).toHaveURL(/#checker/);
    await expect(page.locator("#checker")).toBeVisible();
    await expect(page.locator("main")).toHaveAttribute("class", "page-shell");
  });
});
