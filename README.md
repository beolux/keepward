# Keepward

Medieval fort-siege tower defense — hold the keep. Portrait mobile-first PWA.

**Play:** https://beolux.github.io/keepward/

## Stack

- Phaser 3 + TypeScript + Vite
- PWA via `vite-plugin-pwa`
- GitHub Pages (`base: /keepward/`)

## Local

```bash
npm install
npm run dev
npm run build
```

## How to play

1. Pick a fort layout (square / wide / tall).
2. **Hold a dock tower and drag** into the courtyard — live green/red range ghost; lift to place, drag-off to cancel.
3. Enemies bash walls → breach → hunt the Keep (Keep HP 1000).
4. Tap a tower for the thumb sheet: kill-gated upgrades + Sell / Undo.
5. Age Dark → Feudal → Castle → Imperial. Survive **50 waves**.

## Feel

- Drag-to-place ghost, kill squash + gold-to-tower, breach dust/shake
- Procedural WebAudio (mute toggle) · pause-on-hide · safe-area HUD · ≥44pt targets
- Wave-1 teach (≤8 words, skippable)

## Tuning

Ideas Guy numbers live in `src/data/tuning.ts` (see `TUNING.md`).

## License

Original Keepward IP — geometric placeholders only.
