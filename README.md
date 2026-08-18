# Doudou Battler

A browser-based card battler built with Phaser, TypeScript, and Vite.

## Current rules

- The 20-card deck is shuffled and split evenly between the player and AI.
- The player and AI alternate choosing Strength, Speed, or Agility.
- The higher stat wins both cards and places them at the bottom of the winner's deck.
- Tied cards enter a shared pot that is collected by the next round winner.
- The first player to collect the full deck wins.

## Development

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm test
npm run test:coverage
npm run build
npm run test:e2e
```

See the complete [test strategy](docs/TESTING.md). Pull requests and pushes to `main` are tested in GitHub Actions. A push to `main` is deployed to GitHub Pages only after the full test pipeline passes.
