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
2. Select Watchtower (Mangonel after Feudal) and **tap or drag inside the courtyard** to place — live range ring; walls/exterior illegal.
3. Enemies bash walls → breach → hunt the Keep (Keep HP 1000).
4. Tap a tower for kill-gated RoF / range / damage upgrades. Tap wall segments to repair.
5. Age Dark → Feudal → Castle → Imperial. Survive **50 waves**.

## Tuning

Ideas Guy numbers live in `src/data/tuning.ts` (see `TUNING.md`).

## License

Original Keepward IP — geometric placeholders only.
