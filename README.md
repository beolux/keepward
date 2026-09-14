# Keepward

Medieval fort-siege tower defense — hold the keep. Portrait mobile-first PWA.

**Play:** https://beolux.github.io/keepward/?v=night1

Hard-refresh / open with `?v=night1` if a prior build left a stuck service worker.

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

1. **Survey** the palisade (Keep · walls · one gate) or tap Quick fort. Confirm is free.
2. **Build phase** (13s) before each wave: place/upgrade towers, tap walls to repair, tap **BREACH** to rebuild, watch the **incoming side** tell.
3. Thumb **Start Wave** (or wait for countdown) — enemies then bash walls → breach → hunt the Keep (Keep HP 1000).
4. **Hold a dock tower and drag** into the courtyard — live green/red range ghost; lift to place, drag-off to cancel.
5. Tap a tower for the thumb sheet: kill-gated upgrades + Sell / Undo.
6. Age Dark → Feudal → Castle → Imperial. Survive **50 waves**.

## Feel

- Drag-to-place ghost, kill pop + bounty float, wave-clear beat, age fanfare, 2s undo
- Procedural WebAudio (mute toggle) · pause-on-hide · safe-area HUD · ≥44pt targets
- Wave-1 teach (≤8 words, skippable)

## Tuning

Ideas Guy numbers live in `src/data/tuning.ts` (see `TUNING.md`).

## License

Original Keepward IP — geometric placeholders only.
