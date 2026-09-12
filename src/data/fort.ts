import { GAME_W, GAME_H, HUD_TOP, HUD_BOTTOM } from './map';

export type WallDir = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
export type LayoutId = 'square' | 'wide' | 'tall';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FortLayout {
  id: LayoutId;
  name: string;
  /** Inner courtyard AABB (placement-legal interior) */
  courtyard: Rect;
  wallThickness: number;
}

/** Fort ~70% of play view; 3 seeded layouts */
const playH = GAME_H - HUD_TOP - HUD_BOTTOM;
const cx = GAME_W / 2;
const cy = HUD_TOP + playH / 2;

/** Courtyards scaled ~√2 so interior placeable area ≈2× (still 8 segments). */
export const FORT_LAYOUTS: Record<LayoutId, FortLayout> = {
  square: {
    id: 'square',
    name: 'Square Keep',
    courtyard: { x: cx - 155, y: cy - 184, w: 310, h: 368 },
    wallThickness: 18,
  },
  wide: {
    id: 'wide',
    name: 'Wide Bailey',
    // Cap width so walls stay on-canvas (390 - margins)
    courtyard: { x: cx - 162, y: cy - 140, w: 324, h: 280 },
    wallThickness: 16,
  },
  tall: {
    id: 'tall',
    name: 'Tall Ward',
    courtyard: { x: cx - 127, y: cy - 226, w: 254, h: 452 },
    wallThickness: 18,
  },
};

export const LAYOUT_ORDER: LayoutId[] = ['square', 'wide', 'tall'];

export const WALL_DIRS: WallDir[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/** Adjacent dirs for elephant splash */
export const WALL_ADJACENT: Record<WallDir, WallDir[]> = {
  N: ['NW', 'NE'],
  NE: ['N', 'E'],
  E: ['NE', 'SE'],
  SE: ['E', 'S'],
  S: ['SE', 'SW'],
  SW: ['S', 'W'],
  W: ['SW', 'NW'],
  NW: ['W', 'N'],
};

export interface WallSegmentDef {
  dir: WallDir;
  /** Segment AABB */
  rect: Rect;
  /** Point just outside the wall where attackers stand */
  attackPoint: { x: number; y: number };
  /** Point on the wall center (breach / path target) */
  breachPoint: { x: number; y: number };
  /** Hemisphere for spawn targeting: which edge spawns prefer this wall */
  hemisphere: 'N' | 'E' | 'S' | 'W';
}

function buildSegments(layout: FortLayout): WallSegmentDef[] {
  const { courtyard: c, wallThickness: t } = layout;
  const ox = c.x;
  const oy = c.y;
  const r = c.x + c.w;
  const b = c.y + c.h;
  const midX = c.x + c.w / 2;
  const midY = c.y + c.h / 2;
  const corner = Math.min(c.w, c.h) * 0.22;

  const segs: WallSegmentDef[] = [
    {
      dir: 'N',
      rect: { x: ox + corner, y: oy - t, w: c.w - corner * 2, h: t },
      attackPoint: { x: midX, y: oy - t - 14 },
      breachPoint: { x: midX, y: oy },
      hemisphere: 'N',
    },
    {
      dir: 'NE',
      rect: { x: r - corner, y: oy - t, w: corner + t, h: t + corner },
      attackPoint: { x: r + 14, y: oy - 14 },
      breachPoint: { x: r - 4, y: oy + 4 },
      hemisphere: 'N',
    },
    {
      dir: 'E',
      rect: { x: r, y: oy + corner, w: t, h: c.h - corner * 2 },
      attackPoint: { x: r + t + 14, y: midY },
      breachPoint: { x: r, y: midY },
      hemisphere: 'E',
    },
    {
      dir: 'SE',
      rect: { x: r - corner, y: b - corner, w: corner + t, h: corner + t },
      attackPoint: { x: r + 14, y: b + 14 },
      breachPoint: { x: r - 4, y: b - 4 },
      hemisphere: 'S',
    },
    {
      dir: 'S',
      rect: { x: ox + corner, y: b, w: c.w - corner * 2, h: t },
      attackPoint: { x: midX, y: b + t + 14 },
      breachPoint: { x: midX, y: b },
      hemisphere: 'S',
    },
    {
      dir: 'SW',
      rect: { x: ox - t, y: b - corner, w: corner + t, h: corner + t },
      attackPoint: { x: ox - 14, y: b + 14 },
      breachPoint: { x: ox + 4, y: b - 4 },
      hemisphere: 'S',
    },
    {
      dir: 'W',
      rect: { x: ox - t, y: oy + corner, w: t, h: c.h - corner * 2 },
      attackPoint: { x: ox - t - 14, y: midY },
      breachPoint: { x: ox, y: midY },
      hemisphere: 'W',
    },
    {
      dir: 'NW',
      rect: { x: ox - t, y: oy - t, w: corner + t, h: t + corner },
      attackPoint: { x: ox - 14, y: oy - 14 },
      breachPoint: { x: ox + 4, y: oy + 4 },
      hemisphere: 'N',
    },
  ];
  return segs;
}

export function keepCenter(layout: FortLayout): { x: number; y: number } {
  return {
    x: layout.courtyard.x + layout.courtyard.w / 2,
    y: layout.courtyard.y + layout.courtyard.h / 2,
  };
}

export function generateFort(layoutId: LayoutId): {
  layout: FortLayout;
  segments: WallSegmentDef[];
  keep: { x: number; y: number };
} {
  const layout = FORT_LAYOUTS[layoutId];
  return {
    layout,
    segments: buildSegments(layout),
    keep: keepCenter(layout),
  };
}

/** Point-in-courtyard (interior only — walls/exterior illegal) */
export function pointInCourtyard(x: number, y: number, courtyard: Rect, inset = 0): boolean {
  return (
    x >= courtyard.x + inset &&
    x <= courtyard.x + courtyard.w - inset &&
    y >= courtyard.y + inset &&
    y <= courtyard.y + courtyard.h - inset
  );
}

export function pointInRect(x: number, y: number, r: Rect): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

/** Spawn along an outer edge; optional bias toward a wall attack point (spread). */
export function edgeSpawnPoints(
  edge: 'N' | 'E' | 'S' | 'W',
  bias?: { x: number; y: number },
): { x: number; y: number } {
  const margin = 20;
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const jitter = (span: number) => (Math.random() - 0.5) * span;
  switch (edge) {
    case 'N': {
      const baseX = bias ? bias.x : GAME_W / 2;
      return { x: clamp(baseX + jitter(bias ? 48 : 120), 40, GAME_W - 40), y: HUD_TOP + margin };
    }
    case 'E': {
      const baseY = bias ? bias.y : cy;
      return { x: GAME_W - margin, y: clamp(baseY + jitter(bias ? 56 : 160), HUD_TOP + 40, GAME_H - HUD_BOTTOM - 40) };
    }
    case 'S': {
      const baseX = bias ? bias.x : GAME_W / 2;
      return {
        x: clamp(baseX + jitter(bias ? 48 : 120), 40, GAME_W - 40),
        y: GAME_H - HUD_BOTTOM - margin,
      };
    }
    case 'W': {
      const baseY = bias ? bias.y : cy;
      return { x: margin, y: clamp(baseY + jitter(bias ? 56 : 160), HUD_TOP + 40, GAME_H - HUD_BOTTOM - 40) };
    }
  }
}

export const SPAWN_EDGES: Array<'N' | 'E' | 'S' | 'W'> = ['N', 'E', 'S', 'W'];
