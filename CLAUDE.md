# CLAUDE.md — Keepward

Keepward is an original-IP Middle Ages fort tower defense, built iPhone-first (Safari plus Add to Home Screen PWA). It's single-player and portrait, with a locked camera (no pan or zoom).

## Stack
- Phaser 3.87 + TypeScript 5.7 + Vite 6 + `vite-plugin-pwa`
- Deploy: GitHub Pages through `.github/workflows/deploy.yml` on every push to `main`
- Atlas: `scripts/generate-atlas.mjs` (runs as part of `npm run build`)

## Commands
```bash
npm ci
npm run dev        # local dev server
npm run build      # generate:atlas + tsc + vite build (must pass before any PR)
npm run preview    # serve dist/
```
There's no unit test suite. `npm run build` (which includes `tsc`) is the gate, followed by a manual play pass.

## Layout
- `src/scenes/` holds Menu, Survey, Game, UI, and Boot
- `src/systems/` holds Fort, Fx, and Audio
- `src/data/` holds tuning (`tuning.ts`), survey rules (`survey.ts`), fort layouts (`fort.ts`), and build tags (`version.ts`)
- `src/utils/view.ts` handles the locked view and pointer-to-world mapping

## Build tags (`?v=`)
One bundle serves every tag. `src/data/version.ts` reads `?v=` at runtime, and any new behavior that's still waiting on Nick's approval is gated behind its own tag (for example `SURVEY_V2` for `?v=survey2`). New work gets a new tag, and the bare URL plus older tags must keep their current behavior.

## iPhone playability checks (every PR)
- Test at an iPhone viewport (390×844 portrait) with DPR 3 if possible. Use Safari for the real check.
- The fullscreen ENVELOP and DPR canvas must still fill the screen with no letterbox.
- Touch: drag-to-place uses `getWorldPoint` / `pointerToWorld`. Never use raw pointer coordinates.
- Tap targets should be at least 44pt, and a finger shouldn't hide the hit zone (this was the place-freeze bug).
- The service worker caches aggressively, so verify with a fresh `?v=` tag and a hard refresh.
- Play one full loop: Survey, Confirm/Ready, the 13s build, then waves 1–3, with no console errors.

## Do not touch (without an explicit issue saying so)
- The **night3 build behavior**: the bare URL and `?v=night3` must play exactly as they do today
- `.github/workflows/deploy.yml` and the Pages / live deploy path
- `vite.config.ts` PWA / service worker config
- Regression-sensitive fixes: dock-drag world coordinates, the place-freeze hit zone, fullscreen/DPR, the Keep research hall, 2× kill bounties, survey stroke-draw / fat snap / magnet
- Pan/zoom or an editor camera, IAP

## Rules
- **Never push to `main`.** Work on `claude/<issue#>-<slug>` and open a PR. Only Nick merges.
- **No secrets** in code, commits, issues, or this file. No employer or client material.
- Keep Claude Code's permission prompts on.
- Keep PRs small and limited to the issue, and list the playability checks you ran in the PR body.
