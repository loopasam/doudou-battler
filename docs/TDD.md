# Red–green–refactor workflow

Every behavior change in Doudou Battler follows test-driven development across the lowest practical layer.

## The cycle

1. **Red:** Write the smallest test that describes the missing behavior. Run it and confirm it fails for the expected reason.
2. **Green:** Add the minimum production code needed to pass that test.
3. **Refactor:** Improve names and structure without changing behavior, keeping the focused test green.
4. **Full green:** Run `npm run test:all` before publishing the branch.

CI can prove the final green state, but it cannot reliably reconstruct whether red was observed first. Pull requests therefore record the failing test and its expected failure as review evidence.

## Choose the lowest test layer

| Behavior | Test layer | Red-loop command |
| --- | --- | --- |
| Card schema and deck constraints | Vitest data contract | `npm run tdd -- cards.test.ts` |
| Turns, comparisons, AI decisions, and win rules | Vitest engine unit | `npm run tdd -- engine.test.ts` |
| Canvas startup, responsive layout, input, and player-visible state | Playwright browser | `npm run tdd:e2e` |
| Production compilation and GitHub Pages delivery | CI/CD verification | Push the focused branch |

Avoid testing a rule through the browser when a fast engine test expresses it clearly. Add a browser test when the behavior crosses Phaser, DOM accessibility state, user input, or responsive rendering.

## Full-stack green gate

```bash
npm run test:all
```

This command enforces coverage thresholds, performs strict TypeScript and production builds, and runs desktop and mobile Chromium journeys. After a successful `main` deployment, CI also verifies the public Pages document and JavaScript bundle over HTTPS.
