import { expect, test } from '@playwright/test';

test('lets visitors explore the plush reference and generated concept', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));

  await page.goto('/doudou-battler/studio/');

  await expect(page).toHaveTitle('Doudou Art Lab');
  await expect(page.getByRole('heading', { name: 'From cuddle to contender.' })).toBeVisible();

  const original = page.getByAltText('Original cream plush dog reference');
  const concept = page.getByAltText('Fantasy hero artwork based on the cream plush dog');
  await expect(original).toBeVisible();
  await expect(concept).toBeVisible();

  await page.getByRole('button', { name: 'Original' }).click();
  await expect(page.locator('[data-art-stage]')).toHaveAttribute('data-mode', 'original');

  await page.getByRole('button', { name: 'Compare' }).click();
  await expect(page.locator('[data-art-stage]')).toHaveAttribute('data-mode', 'compare');
  await expect(page.getByRole('slider', { name: 'Reveal concept artwork' })).toBeVisible();

  expect(runtimeErrors).toEqual([]);
});
