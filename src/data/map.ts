/** Portrait playfield — aspect matches visual viewport at boot (no FIT letterbox). */
const vw = typeof window !== 'undefined' ? window.innerWidth || 390 : 390;
const vh = typeof window !== 'undefined' ? window.innerHeight || 780 : 780;

/** Design width stays iPhone-logical; height tracks viewport aspect (clamped). */
export const GAME_W = 390;
export const GAME_H = Math.min(920, Math.max(700, Math.round(GAME_W * (vh / Math.max(vw, 1)))));

/** Backing-store / camera zoom factor for crisp iPhone screens (cap 3). */
export const VIEW_DPR = Math.min(
  typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
  3,
);

/** HUD reserved bands (gameplay sits between) — safe-area friendly */
export const HUD_TOP = 48;
export const HUD_BOTTOM = 118;
