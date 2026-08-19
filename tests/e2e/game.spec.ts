import { expect, test } from '@playwright/test';
import { GAME_LAYOUT, getStatRowCenter } from '../../src/game/rendering';

test('renders a battle and accepts a stat choice without runtime errors', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });

  await page.goto('/doudou-battler/');
  await expect(page).toHaveTitle('Doudou Battler');
  const status = page.getByRole('status');
  await expect(status).toHaveText('Round 1. Your pick. You have 10 cards and AI has 10 cards.');

  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThan(300);
  expect(box!.height).toBeGreaterThan(160);

  await canvas.click({
    position: {
      x: Math.round(box!.width * (GAME_LAYOUT.playerCardX / GAME_LAYOUT.width)),
      y: Math.round(
        box!.height * ((GAME_LAYOUT.cardY + getStatRowCenter(0)) / GAME_LAYOUT.height),
      ),
    },
  });
  await expect(status).toContainText('Revealing AI card.');
  await expect(status).toContainText('Round 1 resolved.');
  const roundOneResult = await status.textContent();
  const aiControlsRoundTwo = roundOneResult?.includes('AI wins the round.') ?? false;

  await canvas.click({
    position: {
      x: Math.round(box!.width * (GAME_LAYOUT.nextButtonX / GAME_LAYOUT.width)),
      y: Math.round(box!.height * (GAME_LAYOUT.nextButtonY / GAME_LAYOUT.height)),
    },
  });
  await expect(status).toHaveText(
    /Round 1\. Moving cards to (your deck|the AI deck|the pot)\./,
    { timeout: 10_000 },
  );
  await expect(status).toContainText(
    aiControlsRoundTwo ? 'Round 2. AI pick.' : 'Round 2. Your pick.',
  );

  if (!aiControlsRoundTwo) {
    await canvas.click({
      position: {
        x: Math.round(box!.width * (GAME_LAYOUT.playerCardX / GAME_LAYOUT.width)),
        y: Math.round(
          box!.height * ((GAME_LAYOUT.cardY + getStatRowCenter(0)) / GAME_LAYOUT.height),
        ),
      },
    });
  }

  await expect(status).toContainText('Round 2 resolved.', { timeout: 10_000 });

  await expect(canvas).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});
