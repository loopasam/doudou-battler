# Test strategy

Doudou Battler uses a small test pyramid designed for fast feedback and safe GitHub Pages deployments.

## 1. Game-engine unit tests

Vitest exercises the rendering-independent `BattleEngine` with deterministic decks. The suite covers:

- even dealing and initial state;
- stat comparison and card capture;
- alternating player/AI category selection;
- AI category choice;
- tie-pot behavior;
- end-of-game detection.

Coverage is collected for the engine with minimum thresholds of 90% for lines, statements, and functions, and 80% for branches.

Run locally:

```bash
npm test
npm run test:coverage
```

## 2. Production build validation

`npm run build` runs strict TypeScript checks before creating the Vite production bundle. This catches type errors, invalid imports, and build-time asset or configuration failures.

## 3. Browser smoke tests

Playwright serves the production bundle and opens it in Chromium using desktop and mobile-sized viewports. The smoke test verifies that:

- the application loads at the GitHub Pages subpath;
- Phaser creates a visible, correctly sized canvas;
- a player stat can be selected;
- the interaction produces no uncaught browser or console errors.

Run locally after installing Chromium once with `npx playwright install chromium`:

```bash
npm run build
npm run test:e2e
```

## CI/CD policy

The GitHub Actions workflow runs the complete test stack for pull requests targeting `main`, pushes to `main`, and manual dispatches. A push to `main` is deployed to GitHub Pages only after coverage, build, and both browser projects pass.

Failed browser runs retain traces and screenshots as workflow artifacts for diagnosis.
