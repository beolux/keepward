import { GAME_W, GAME_H, HUD_TOP, HUD_BOTTOM } from './map';

export type WallDir = string;
export type LayoutId = 'square' | 'wide' | 'tall' | 'survey';
export type WallKind = 'straight' | 'corner' | 'gate' | 'gap';
export type SpawnEdge = 'N' | 'E' | 'S' | 'W';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FortLayout {
  id: string;
  name: string;
  /** Inner courtyard AABB (placement-legal interior) */
  courtyard: Rect;
  wallThickness: number;
}

/** Fort fills most of the play view — not a postage stamp in the grass */
const playH = GAME_H - HUD_TOP - HUD_BOTTOM;
const cx = GAME_W / 2;
const cy = HUD_TOP + playH / 2;

/**
 * Fit courtyard so (courtyard + walls) covers ~fill of the playfield.
 * Thin grass ring outside the walls; locked camera (no pinch).
 */
function fitCourtyard(
  aspectW: number,
  aspectH: number,
  wallThickness: number,
  fill = 0.9,
): Rect {
  const grass = 10;
  // Max outer fort box (walls included) inside playfield
  const maxOuterW = Math.min(GAME_W - 2 * grass, GAME_W * fill + wallThickness);
  const maxOuterH = Math.min(playH - 2 * grass, playH * fill + wallThickness);
  const maxW = maxOuterW - 2 * wallThickness;
  const maxH = maxOuterH - 2 * wallThickness;
  const scale = Math.min(maxW / aspectW, maxH / aspectH);
  const w = Math.round(aspectW * scale);
  const h = Math.round(aspectH * scale);
  return {
    x: Math.round(cx - w / 2),
    y: Math.round(cy - h / 2),
    w,
    h,
  };
}

export const FORT_LAYOUTS: Record<Exclude<LayoutId, "survey">, FortLayout> = {
  square: {
    id: 'square',
    name: 'Square Keep',
    courtyard: fitCourtyard(1, 1.45, 18, 0.94),
    wallThickness: 18,
  },
  wide: {
    id: 'wide',
    name: 'Wide Bailey',
    courtyard: fitCourtyard(1.28, 1.05, 16, 0.94),
    wallThickness: 16,
  },
  tall: {
    id: 'tall',
    name: 'Tall Ward',
    courtyard: fitCourtyard(1, 1.85, 18, 0.94),
    wallThickness: 18,
  },
};

export const LAYOUT_ORDER: Array<Exclude<LayoutId, 'survey'>> = ['square', 'wide', 'tall'];

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
  kind: WallKind;
  /** Segment AABB */
  rect: Rect;
  /** Point just outside the wall where attackers stand */
  attackPoint: { x: number; y: number };
  /** Point on the wall center (breach / path target) */
  breachPoint: { x: number; y: number };
  /** Hemisphere for spawn targeting: which edge spawns prefer this wall */
  hemisphere: SpawnEdge;
  /** Edges this piece faces (corners may face two) */
  faces: SpawnEdge[];
  /** Piece ids sharing a vertex — elephant splash */
  adjacent: WallDir[];
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

  const segs: Array<Omit<WallSegmentDef, "kind" | "faces" | "adjacent">> = [
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
  const adj: Record<string, WallDir[]> = {
    N: ['NW', 'NE'],
    NE: ['N', 'E'],
    E: ['NE', 'SE'],
    SE: ['E', 'S'],
    S: ['SE', 'SW'],
    SW: ['S', 'W'],
    W: ['SW', 'NW'],
    NW: ['W', 'N'],
  };
  return segs.map((s) => {
    const corner = s.dir.length > 1;
    const faces: SpawnEdge[] = corner
      ? (s.dir.includes('N') ? ['N'] : s.dir.includes('S') ? ['S'] : []).concat(
          s.dir.includes('E') ? ['E'] : s.dir.includes('W') ? ['W'] : [],
        ) as SpawnEdge[]
      : [s.hemisphere];
    return {
      ...s,
      kind: (corner ? 'corner' : 'straight') as WallKind,
      faces: faces.length ? faces : [s.hemisphere],
      adjacent: adj[s.dir] ?? [],
    };
  });
}

export function keepCenter(layout: FortLayout): { x: number; y: number } {
  return {
    x: layout.courtyard.x + layout.courtyard.w / 2,
    y: layout.courtyard.y + layout.courtyard.h / 2,
  };
}

export function generateFort(layoutId: Exclude<LayoutId, "survey">): {
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
