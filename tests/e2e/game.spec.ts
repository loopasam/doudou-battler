import { expect, test } from '@playwright/test';

test('renders a battle and accepts a stat choice without runtime errors', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });

  await page.goto('/doudou-battler/');
  await expect(page).toHaveTitle('Doudou Battler');

  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThan(300);
  expect(box!.height).toBeGreaterThan(160);

  await canvas.click({
    position: {
      x: Math.round(box!.width * 0.305),
      y: Math.round(box!.height * 0.64),
    },
  });
  await page.waitForTimeout(350);

  await expect(canvas).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});
