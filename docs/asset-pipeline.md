# Doudou Battler asset pipeline

The only human intake step is attaching toy photos in the Codex conversation. Codex registers
each attachment, generates consistent artwork, creates reaction sounds, and places the result in
the private local review queue.

## Privacy boundary

- `.codex-remote-attachments/` and `asset-workbench/` are gitignored.
- Reference photos, prompts, rejected candidates, and curator notes stay in `asset-workbench/`.
- Only an approved illustration, approved reaction sounds, and public card metadata are copied to
  `public/assets/cards/`.
- Never place a family photo under `public/`.

## Codex workflow

1. Register an uploaded photo:
   `npm run assets:intake -- --source <attachment> --id <slug> --name <name>`
2. Generate artwork with the built-in image tool using the style anchor and the prompt version in
   `asset-workbench/manifest.json`.
3. Register each candidate:
   `npm run assets:candidate -- --id <slug> --source <generated-image> --prompt-version storybook-fort-v1`
4. Generate the initial win and lose sound pair:
   `npm run assets:sounds -- --id <slug>`
5. Start the local studio with `npm run dev`, then open `/doudou-battler/studio/`.
6. The curator selects artwork and sounds, adds notes, then either approves or requests a redo.
7. Approval promotes final files into `public/assets/cards/<slug>/` and updates the public manifest.
8. A later Codex turn reads `npm run assets:status`, handles redo requests, tests, commits, and
   deploys approved assets.

## Style lock

Current style ID and prompt version: `storybook-fort-v1`.

Every prompt uses the original photo only as a subject reference and uses the Fort Knight concept
as the collection style anchor. Images are vertical, full-character, centered, card-safe,
kid-friendly, tactile storybook portraits with warm blanket-fort lighting and no text or logos.

Changing the style requires a new version rather than silently editing the existing prompt.
