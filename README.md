# Keepward

Medieval fort-siege tower defense — hold the keep. Portrait mobile-first PWA.

**Play:** https://beolux.github.io/keepward/?v=night3

Hard-refresh / open with `?v=night3` if a prior build left a stuck service worker.

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

- Drag-to-place ghost (smooth follow · clear green/red), kill pop + bounty float, wave-clear beat, age fanfare, 2s undo
- Royale wood/gold HUD flash on gain · Keep stamp sheet (Age/Attack/Defense/Siege)
- CoC rebuild: rubble → hammer → pop · Survey 0.35 magnet · Confirm reason · gate chevrons
- Procedural WebAudio (mute toggle) · pause-on-hide · safe-area HUD · ≥44pt targets
- Teach: wave 1 place + waves 2–3 one-liners (skippable, once)

## Tuning

Ideas Guy numbers live in `src/data/tuning.ts` (see `TUNING.md`).

## License

Original Keepward IP — geometric placeholders only.
