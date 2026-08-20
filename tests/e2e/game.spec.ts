import { expect, test } from '@playwright/test';
import { GAME_LAYOUT, getStatRowCenter } from '../../src/game/rendering';
import { START_LAYOUT } from '../../src/game/settings';

test('renders a battle and accepts a stat choice without runtime errors', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });

  await page.goto('/doudou-battler/');
  await expect(page).toHaveTitle('Doudou Battler');
  const status = page.getByRole('status');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThan(300);
  expect(box!.height).toBeGreaterThan(160);

  await expect(status).toHaveText(
    'Game setup. EASY // STARS selected. Choose a difficulty and number style, then start the game.',
  );
  await canvas.click({
    position: {
      x: Math.round(box!.width * (START_LAYOUT.choiceXs[1] / START_LAYOUT.width)),
      y: Math.round(box!.height * (START_LAYOUT.difficultyY / START_LAYOUT.height)),
    },
  });
  await canvas.click({
    position: {
      x: Math.round(box!.width * (START_LAYOUT.choiceXs[1] / START_LAYOUT.width)),
      y: Math.round(box!.height * (START_LAYOUT.valueDisplayY / START_LAYOUT.height)),
    },
  });
  await expect(status).toContainText('MEDIUM // ROUNDED TENS selected.');
  await canvas.click({
    position: {
      x: Math.round(box!.width * (START_LAYOUT.startButtonX / START_LAYOUT.width)),
      y: Math.round(box!.height * (START_LAYOUT.startButtonY / START_LAYOUT.height)),
    },
  });
  await expect(status).toHaveText('Round 1. Dealing cards from both decks.');
  await expect(status).toHaveText('Round 1. Your pick. You have 10 cards and AI has 10 cards.');

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
  await expect(status).toContainText('Next picker: AI.');

  await canvas.click({
    position: {
      x: Math.round(box!.width * (GAME_LAYOUT.nextButtonX / GAME_LAYOUT.width)),
      y: Math.round(box!.height * (GAME_LAYOUT.nextButtonY / GAME_LAYOUT.height)),
    },
  });
  await expect(status).toHaveText(
    /Round 1\. (Moving cards to (your deck|the AI deck)|Returning each card to its owner)\./,
    { timeout: 10_000 },
  );
  await expect(status).toHaveText('Round 2. Dealing cards from both decks.');
  await expect(status).toContainText('Round 2. AI pick.');
  await expect(status).toContainText('Round 2 resolved.', { timeout: 10_000 });

  await expect(canvas).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});
