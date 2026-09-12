# Keepward

Medieval tower defense — hold the keep. Portrait mobile-first PWA (iPhone Safari + Add to Home Screen).

**Play:** https://beolux.github.io/keepward/

## Stack

- Phaser 3 + TypeScript + Vite
- PWA via `vite-plugin-pwa` (manifest + service worker)
- GitHub Pages project site (`base: /keepward/`)

## Local

```bash
npm install
npm run dev
```

Open the printed local URL (use your machine IP for phone testing on the same network).

```bash
npm run build    # output in dist/
npm run preview  # preview production build
```

## How to play

1. Tap **DEFEND** on the title screen.
2. Select **Watchtower** (or **Mangonel Nest** after Feudal) in the bottom tray.
3. Tap a **stone pad** along the path to place (snap-to-pad only).
4. Earn Wood & Gold from kills; **Age Up** once (Dark → Feudal) to unlock Mangonel Nest and a global damage/fire-rate buff.
5. Survive **10 waves**. Lose when Lives hit 0. The **Keep** is pre-placed and fires for you.

## GitHub Pages

Deploys from `main` via `.github/workflows/deploy.yml` (build → upload `dist` → Pages).

After the first Actions run succeeds, the game is at:

`https://beolux.github.io/keepward/`

## A2HS (iPhone)

Safari → Share → **Add to Home Screen**. Manifest + icons ship with the build; `orientation: portrait`.

## License

Original Keepward IP — geometric placeholders only. No third-party licensed art.
