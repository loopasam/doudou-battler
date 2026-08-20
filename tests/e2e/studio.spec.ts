import { expect, test } from '@playwright/test';

test('shows a safe read-only curation showcase on the public site', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));

  await page.goto('/doudou-battler/studio/');

  await expect(page).toHaveTitle('Doudou Card Factory');
  await expect(page.getByRole('heading', { name: 'Meet the next contender.' })).toBeVisible();
  await expect(page.locator('[data-connection]')).toHaveText('Public showcase');

  const original = page.getByAltText('Fort Knight toy reference');
  const concept = page.getByAltText('Fort Knight generated storybook artwork');
  await expect(original).toBeVisible();
  await expect(concept).toBeVisible();
  await expect(original).toHaveJSProperty('complete', true);
  await expect(concept).toHaveJSProperty('complete', true);

  await expect(page.getByText('The reference stays local. Only approved art enters the game.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Approve card' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Try again' })).toBeDisabled();

  expect(runtimeErrors).toEqual([]);
});
