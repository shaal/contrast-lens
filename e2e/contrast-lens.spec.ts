import { expect, test } from '@playwright/test';

test.describe('Contrast Lens', () => {
  test('renders the checker with the default pair', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Make readability visible/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Find the signal/i })).toBeVisible();
    await expect(page.locator('.ratio-number')).toHaveText('4.52');
    await expect(page.getByText('WCAG 2 contrast ratio')).toBeVisible();
  });

  test('updates live scores and makes the blur lens available', async ({ page }) => {
    await page.goto('/#checker');
    await page.getByLabel('Foreground', { exact: true }).fill('#777777');
    await expect(page.locator('.ratio-number')).toHaveText('4.48');
    await expect(page.getByText('Needs attention')).toBeVisible();

    const lens = page.getByLabel('Enable blur lens');
    await lens.check();
    await expect(page.getByLabel('Blur lens intensity')).toBeEnabled();
    await expect(page.locator('.blur-note')).toContainText('blur pressure');
  });

  test('supports format switching, native pickers, and swapping', async ({ page }) => {
    await page.goto('/#checker');
    await page.getByLabel('Foreground format').selectOption('RGB');
    await expect(page.getByLabel('Foreground', { exact: true })).toHaveValue('rgb(113 91 255)');

    await page.getByRole('button', { name: 'Swap colors' }).click();
    await expect(page.getByLabel('Foreground', { exact: true })).toHaveValue('#FFFFFF');
    await expect(page.getByLabel('Background', { exact: true })).toHaveValue('rgb(113 91 255)');
  });

  test('keeps the checker keyboard and reduced-motion friendly', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Check a pair' }).press('Enter');
    await expect(page).toHaveURL(/#checker/);
    await expect(page.locator('#checker')).toBeVisible();
    await expect(page.locator('main')).toHaveAttribute('class', 'page-shell');
  });
});
