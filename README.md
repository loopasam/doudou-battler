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
npm run build
```

Every push to `main` is tested, built, and deployed to GitHub Pages.
