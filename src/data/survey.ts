import { GAME_W, GAME_H, HUD_TOP, HUD_BOTTOM } from './map';
import { TILE_PX } from './tuning';
import type { FortLayout, Rect, WallDir, WallSegmentDef } from './fort';

export type SurveyTool = 'keep' | 'wall' | 'gate';
export type WallAxis = 'H' | 'V';
export type PieceKind = 'straight' | 'corner' | 'gate';

export const SURVEY = {
  minPieces: 6,
  maxPieces: 12,
  minWallsForGate: 5,
  /** Dark palisade HP on confirm (survey1) */
  darkHp: 160,
  wallThickness: 16,
  /** Suggested ring: tiles out from keep, clamped to grid */
  ringTiles: 4,
  ringTilesMin: 3,
  ringTilesMax: 5,
} as const;

export interface SurveyGrid {
  cols: number;
  rows: number;
  originX: number;
  originY: number;
  tile: number;
}

export interface SurveyPiece {
  id: string;
  kind: PieceKind;
  axis: WallAxis;
  /** H: grid row of the edge; V: grid col of the edge; corner: vertex col */
  a: number;
  /** H: start col; V: start row; corner: vertex row */
  b: number;
  /** Edge tiles in the run. Corners: 1 */
  len: number;
}

export interface SurveyedFort {
  layout: FortLayout;
  keep: { x: number; y: number };
  keepTile: { c: number; r: number };
  segments: WallSegmentDef[];
  pieces: SurveyPiece[];
}

export function surveyGrid(): SurveyGrid {
  const margin = 8;
  const playTop = HUD_TOP + 8;
  const playBot = GAME_H - HUD_BOTTOM;
  const playLeft = margin;
  const playRight = GAME_W - margin;
  const tile = TILE_PX;
  const cols = Math.max(6, Math.floor((playRight - playLeft) / tile));
  const rows = Math.max(8, Math.floor((playBot - playTop) / tile));
  const originX = playLeft + Math.floor((playRight - playLeft - cols * tile) / 2);
  const originY = playTop + Math.floor((playBot - playTop - rows * tile) / 2);
  return { cols, rows, originX, originY, tile };
}

export function tileCenter(grid: SurveyGrid, c: number, r: number): { x: number; y: number } {
  return {
    x: grid.originX + (c + 0.5) * grid.tile,
    y: grid.originY + (r + 0.5) * grid.tile,
  };
}

export function clampTile(grid: SurveyGrid, c: number, r: number): { c: number; r: number } {
  return {
    c: Math.max(0, Math.min(grid.cols - 1, c)),
    r: Math.max(0, Math.min(grid.rows - 1, r)),
  };
}

export function snapKeepTile(
  grid: SurveyGrid,
  x: number,
  y: number,
): { c: number; r: number; x: number; y: number } | null {
  const c = Math.floor((x - grid.originX) / grid.tile);
  const r = Math.floor((y - grid.originY) / grid.tile);
  if (c < 0 || r < 0 || c >= grid.cols || r >= grid.rows) return null;
  const p = tileCenter(grid, c, r);
  return { c, r, x: p.x, y: p.y };
}

export function snapWallEdge(
  grid: SurveyGrid,
  x: number,
  y: number,
): { axis: WallAxis; c: number; r: number } | null {
  const t = grid.tile;
  const lx = x - grid.originX;
  const ly = y - grid.originY;
  if (lx < -t * 0.4 || ly < -t * 0.4 || lx > grid.cols * t + t * 0.4 || ly > grid.rows * t + t * 0.4) {
    return null;
  }
  // Candidate H: nearest horizontal grid line
  const rH = Math.round(ly / t);
  const cH = Math.floor(lx / t);
  const dH =
    rH < 0 || rH > grid.rows || cH < 0 || cH >= grid.cols
      ? Infinity
      : Math.abs(ly - rH * t) + Math.max(0, Math.abs(lx - (cH + 0.5) * t) - t * 0.5);
  // Candidate V: nearest vertical grid line
  const cV = Math.round(lx / t);
  const rV = Math.floor(ly / t);
  const dV =
    cV < 0 || cV > grid.cols || rV < 0 || rV >= grid.rows
      ? Infinity
      : Math.abs(lx - cV * t) + Math.max(0, Math.abs(ly - (rV + 0.5) * t) - t * 0.5);

  const maxD = t * 0.55;
  if (dH <= dV && dH <= maxD) return { axis: 'H', c: cH, r: rH };
  if (dV <= maxD) return { axis: 'V', c: cV, r: rV };
  return null;
}

/** Inclusive vertices of the suggested courtyard ring around a keep cell. */
export function suggestedRing(
  grid: SurveyGrid,
  keepC: number,
  keepR: number,
  tilesOut = SURVEY.ringTiles,
): { c0: number; r0: number; c1: number; r1: number } {
  const d = Math.max(SURVEY.ringTilesMin, Math.min(SURVEY.ringTilesMax, tilesOut));
  let c0 = keepC - d;
  let r0 = keepR - d;
  let c1 = keepC + 1 + d;
  let r1 = keepR + 1 + d;
  c0 = Math.max(0, c0);
  r0 = Math.max(0, r0);
  c1 = Math.min(grid.cols, c1);
  r1 = Math.min(grid.rows, r1);
  if (c1 - c0 < 3) {
    if (c0 === 0) c1 = Math.min(grid.cols, c0 + 3);
    else c0 = Math.max(0, c1 - 3);
  }
  if (r1 - r0 < 3) {
    if (r0 === 0) r1 = Math.min(grid.rows, r0 + 3);
    else r0 = Math.max(0, r1 - 3);
  }
  return { c0, r0, c1, r1 };
}

export function ringWorldRect(grid: SurveyGrid, ring: { c0: number; r0: number; c1: number; r1: number }): Rect {
  return {
    x: grid.originX + ring.c0 * grid.tile,
    y: grid.originY + ring.r0 * grid.tile,
    w: (ring.c1 - ring.c0) * grid.tile,
    h: (ring.r1 - ring.r0) * grid.tile,
  };
}

function nextId(pieces: SurveyPiece[]): string {
  let n = 0;
  for (const p of pieces) {
    const v = Number(p.id.replace(/^\D+/, ''));
    if (Number.isFinite(v) && v >= n) n = v + 1;
  }
  return `w${n}`;
}

function clonePieces(pieces: SurveyPiece[]): SurveyPiece[] {
  return pieces.map((p) => ({ ...p }));
}

function occupiesEdge(p: SurveyPiece, axis: WallAxis, c: number, r: number): boolean {
  if (p.kind === 'corner') return false;
  if (p.axis !== axis) return false;
  if (axis === 'H') return p.a === r && c >= p.b && c < p.b + p.len;
  return p.a === c && r >= p.b && r < p.b + p.len;
}

function vertexOf(p: SurveyPiece): { c: number; r: number }[] {
  if (p.kind === 'corner') return [{ c: p.a, r: p.b }];
  if (p.axis === 'H') return [
    { c: p.b, r: p.a },
    { c: p.b + p.len, r: p.a },
  ];
  return [
    { c: p.a, r: p.b },
    { c: p.a, r: p.b + p.len },
  ];
}

function incidentHV(pieces: SurveyPiece[], vc: number, vr: number): { h: boolean; v: boolean } {
  let h = false;
  let v = false;
  for (const p of pieces) {
    if (p.kind === 'corner') continue;
    if (p.axis === 'H' && p.a === vr && vc >= p.b && vc <= p.b + p.len) h = true;
    if (p.axis === 'V' && p.a === vc && vr >= p.b && vr <= p.b + p.len) v = true;
  }
  return { h, v };
}

type Snapshot = { keep: { c: number; r: number } | null; pieces: SurveyPiece[] };

export class SurveyDraft {
  readonly grid: SurveyGrid;
  keep: { c: number; r: number } | null = null;
  pieces: SurveyPiece[] = [];
  private stack: Snapshot[] = [];

  constructor(grid?: SurveyGrid) {
    this.grid = grid ?? surveyGrid();
  }

  get pieceCount(): number {
    return this.pieces.length;
  }

  get gateCount(): number {
    return this.pieces.filter((p) => p.kind === 'gate').length;
  }

  get canPlaceGate(): boolean {
    return this.pieces.length >= SURVEY.minWallsForGate && this.gateCount === 0;
  }

  confirmError(): string | null {
    if (!this.keep) return 'Place the Keep';
    if (this.pieces.length < SURVEY.minPieces) return `Need ${SURVEY.minPieces}–${SURVEY.maxPieces} walls`;
    if (this.pieces.length > SURVEY.maxPieces) return `Max ${SURVEY.maxPieces} wall pieces`;
    if (this.gateCount !== 1) return 'Need exactly 1 gate';
    return null;
  }

  canConfirm(): boolean {
    return this.confirmError() === null;
  }

  private push(): void {
    this.stack.push({ keep: this.keep ? { ...this.keep } : null, pieces: clonePieces(this.pieces) });
    if (this.stack.length > 40) this.stack.shift();
  }

  private restore(s: Snapshot): void {
    this.keep = s.keep ? { ...s.keep } : null;
    this.pieces = clonePieces(s.pieces);
  }

  placeKeep(c: number, r: number): boolean {
    const t = clampTile(this.grid, c, r);
    if (this.keep && this.keep.c === t.c && this.keep.r === t.r) return true;
    this.push();
    this.keep = t;
    return true;
  }

  undo(): boolean {
    const s = this.stack.pop();
    if (!s) return false;
    this.restore(s);
    return true;
  }

  reset(): void {
    if (!this.keep && this.pieces.length === 0) return;
    this.push();
    this.keep = null;
    this.pieces = [];
  }

  private occupied(axis: WallAxis, c: number, r: number): SurveyPiece | undefined {
    return this.pieces.find((p) => occupiesEdge(p, axis, c, r));
  }

  private cornerAt(c: number, r: number): SurveyPiece | undefined {
    return this.pieces.find((p) => p.kind === 'corner' && p.a === c && p.b === r);
  }

  private autoCorners(): void {
    const needed: { c: number; r: number }[] = [];
    for (const p of this.pieces) {
      if (p.kind === 'corner') continue;
      for (const v of vertexOf(p)) {
        const hv = incidentHV(this.pieces, v.c, v.r);
        if (hv.h && hv.v && !this.cornerAt(v.c, v.r)) {
          if (!needed.some((n) => n.c === v.c && n.r === v.r)) needed.push(v);
        }
      }
    }
    for (const v of needed) {
      this.pieces.push({
        id: nextId(this.pieces),
        kind: 'corner',
        axis: 'H',
        a: v.c,
        b: v.r,
        len: 1,
      });
    }
    // Drop corners that are no longer 90°
    this.pieces = this.pieces.filter((p) => {
      if (p.kind !== 'corner') return true;
      const hv = incidentHV(this.pieces, p.a, p.b);
      return hv.h && hv.v;
    });
  }

  placeWall(axis: WallAxis, c: number, r: number): boolean {
    if (this.occupied(axis, c, r)) return false;
    const snap: Snapshot = { keep: this.keep ? { ...this.keep } : null, pieces: clonePieces(this.pieces) };
    this.mergeOrAdd(axis, c, r, 'straight');
    this.autoCorners();
    if (this.pieces.length > SURVEY.maxPieces) {
      this.restore(snap);
      return false;
    }
    this.stack.push(snap);
    if (this.stack.length > 40) this.stack.shift();
    return true;
  }

  placeGate(axis: WallAxis, c: number, r: number): boolean {
    if (this.gateCount >= 1) return false;
    if (this.pieces.length < SURVEY.minWallsForGate) return false;
    const existing = this.occupied(axis, c, r);
    if (existing && existing.kind === 'corner') return false;
    if (existing && existing.kind === 'gate') return false;
    const snap: Snapshot = { keep: this.keep ? { ...this.keep } : null, pieces: clonePieces(this.pieces) };
    if (existing && existing.kind === 'straight') {
      existing.kind = 'gate';
    } else if (!existing) {
      if (this.pieces.length >= SURVEY.maxPieces) return false;
      this.mergeOrAdd(axis, c, r, 'gate');
      this.autoCorners();
      if (this.pieces.length > SURVEY.maxPieces) {
        this.restore(snap);
        return false;
      }
    } else {
      return false;
    }
    this.stack.push(snap);
    if (this.stack.length > 40) this.stack.shift();
    return true;
  }

  private mergeOrAdd(axis: WallAxis, c: number, r: number, kind: 'straight' | 'gate'): void {
    if (axis === 'H') {
      const left = this.pieces.find(
        (p) => p.kind !== 'corner' && p.axis === 'H' && p.a === r && p.b + p.len === c,
      );
      const right = this.pieces.find(
        (p) => p.kind !== 'corner' && p.axis === 'H' && p.a === r && p.b === c + 1,
      );
      if (kind === 'gate') {
        // Gate is a 1-tile piece — do not merge into a long run
        if (left && left.kind === 'straight' && left.len > 1) {
          /* still place standalone */
        }
        this.pieces.push({ id: nextId(this.pieces), kind, axis: 'H', a: r, b: c, len: 1 });
        return;
      }
      if (left && right && left.kind === 'straight' && right.kind === 'straight') {
        left.len += 1 + right.len;
        this.pieces = this.pieces.filter((p) => p !== right);
        return;
      }
      if (left && left.kind === 'straight') {
        left.len += 1;
        return;
      }
      if (right && right.kind === 'straight') {
        right.b = c;
        right.len += 1;
        return;
      }
      this.pieces.push({ id: nextId(this.pieces), kind, axis: 'H', a: r, b: c, len: 1 });
      return;
    }
    const up = this.pieces.find(
      (p) => p.kind !== 'corner' && p.axis === 'V' && p.a === c && p.b + p.len === r,
    );
    const down = this.pieces.find(
      (p) => p.kind !== 'corner' && p.axis === 'V' && p.a === c && p.b === r + 1,
    );
    if (kind === 'gate') {
      this.pieces.push({ id: nextId(this.pieces), kind, axis: 'V', a: c, b: r, len: 1 });
      return;
    }
    if (up && down && up.kind === 'straight' && down.kind === 'straight') {
      up.len += 1 + down.len;
      this.pieces = this.pieces.filter((p) => p !== down);
      return;
    }
    if (up && up.kind === 'straight') {
      up.len += 1;
      return;
    }
    if (down && down.kind === 'straight') {
      down.b = r;
      down.len += 1;
      return;
    }
    this.pieces.push({ id: nextId(this.pieces), kind, axis: 'V', a: c, b: r, len: 1 });
  }

  pieceWorldRect(p: SurveyPiece): Rect {
    const g = this.grid;
    const th = SURVEY.wallThickness;
    if (p.kind === 'corner') {
      return {
        x: g.originX + p.a * g.tile - th / 2,
        y: g.originY + p.b * g.tile - th / 2,
        w: th,
        h: th,
      };
    }
    if (p.axis === 'H') {
      return {
        x: g.originX + p.b * g.tile,
        y: g.originY + p.a * g.tile - th / 2,
        w: p.len * g.tile,
        h: th,
      };
    }
    return {
      x: g.originX + p.a * g.tile - th / 2,
      y: g.originY + p.b * g.tile,
      w: th,
      h: p.len * g.tile,
    };
  }

  toLayout(): SurveyedFort {
    if (!this.keep) {
      throw new Error('SurveyDraft.toLayout requires a Keep');
    }
    return compileSurvey(this);
  }
}

export function makeQuickFort(): SurveyedFort {
  const draft = new SurveyDraft();
  const g = draft.grid;
  const kc = Math.floor(g.cols / 2);
  const kr = Math.floor(g.rows / 2);
  draft.placeKeep(kc, kr);
  const ring = suggestedRing(g, kc, kr);
  for (let c = ring.c0; c < ring.c1; c++) draft.placeWall('H', c, ring.r0);
  for (let c = ring.c0; c < ring.c1; c++) draft.placeWall('H', c, ring.r1);
  for (let r = ring.r0; r < ring.r1; r++) draft.placeWall('V', ring.c0, r);
  for (let r = ring.r0; r < ring.r1; r++) draft.placeWall('V', ring.c1, r);
  const gateC = Math.floor((ring.c0 + ring.c1) / 2);
  if (!draft.placeGate('H', gateC, ring.r1)) {
    // Fallback: convert whatever occupies south-center
    draft.placeGate('H', Math.max(ring.c0, gateC - 1), ring.r1);
  }
  return draft.toLayout();
}

function compileSurvey(draft: SurveyDraft): SurveyedFort {
  const g = draft.grid;
  const keepTile = draft.keep!;
  const keep = tileCenter(g, keepTile.c, keepTile.r);
  const t = SURVEY.wallThickness;
  const segs: WallSegmentDef[] = [];

  const pieceById = new Map<string, SurveyPiece>();
  for (const p of draft.pieces) pieceById.set(p.id, p);

  const verts = (p: SurveyPiece) => vertexOf(p);

  const shareVertex = (a: SurveyPiece, b: SurveyPiece): boolean => {
    const va = verts(a);
    const vb = verts(b);
    return va.some((x) => vb.some((y) => x.c === y.c && x.r === y.r));
  };

  for (const p of draft.pieces) {
    const rect = draft.pieceWorldRect(p);
    const mx = rect.x + rect.w / 2;
    const my = rect.y + rect.h / 2;
    const dx = mx - keep.x;
    const dy = my - keep.y;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist;
    const uy = dy / dist;
    const hemisphere: 'N' | 'E' | 'S' | 'W' =
      Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'E' : 'W') : dy > 0 ? 'S' : 'N';
    const faces: Array<'N' | 'E' | 'S' | 'W'> = [hemisphere];
    if (p.kind === 'corner') {
      const other: 'N' | 'E' | 'S' | 'W' =
        Math.abs(dx) > Math.abs(dy) ? (dy > 0 ? 'S' : 'N') : dx > 0 ? 'E' : 'W';
      if (!faces.includes(other)) faces.push(other);
    }
    const adjacent: WallDir[] = draft.pieces.filter((q) => q.id !== p.id && shareVertex(p, q)).map((q) => q.id);
    segs.push({
      dir: p.id,
      kind: p.kind,
      rect,
      attackPoint: { x: mx + ux * 16, y: my + uy * 16 },
      breachPoint: { x: mx - ux * 4, y: my - uy * 4 },
      hemisphere,
      faces,
      adjacent,
    });
  }

  // Courtyard AABB from wall inner box (fallback: ring around keep)
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const s of segs) {
    minX = Math.min(minX, s.rect.x);
    minY = Math.min(minY, s.rect.y);
    maxX = Math.max(maxX, s.rect.x + s.rect.w);
    maxY = Math.max(maxY, s.rect.y + s.rect.h);
  }
  if (!Number.isFinite(minX)) {
    const ring = ringWorldRect(g, suggestedRing(g, keepTile.c, keepTile.r));
    minX = ring.x;
    minY = ring.y;
    maxX = ring.x + ring.w;
    maxY = ring.y + ring.h;
  }
  const courtyard: Rect = {
    x: Math.round(minX + t),
    y: Math.round(minY + t),
    w: Math.max(48, Math.round(maxX - minX - 2 * t)),
    h: Math.max(48, Math.round(maxY - minY - 2 * t)),
  };
  // Keep must sit inside the placement courtyard
  const pad = 36;
  if (keep.x < courtyard.x + pad) {
    const d = courtyard.x + pad - keep.x;
    courtyard.x -= d;
    courtyard.w += d;
  }
  if (keep.x > courtyard.x + courtyard.w - pad) courtyard.w = keep.x + pad - courtyard.x;
  if (keep.y < courtyard.y + pad) {
    const d = courtyard.y + pad - keep.y;
    courtyard.y -= d;
    courtyard.h += d;
  }
  if (keep.y > courtyard.y + courtyard.h - pad) courtyard.h = keep.y + pad - courtyard.y;

  addGaps(segs, courtyard, t, keep);

  const layout: FortLayout = {
    id: 'survey',
    name: 'Surveyed Keep',
    courtyard,
    wallThickness: t,
  };

  return {
    layout,
    keep,
    keepTile,
    segments: segs,
    pieces: clonePieces(draft.pieces),
  };
}

function coverageAlong(
  segs: WallSegmentDef[],
  edge: 'N' | 'E' | 'S' | 'W',
  courtyard: Rect,
  t: number,
): number {
  const band = 22;
  let covered = 0;
  for (const s of segs) {
    if (s.kind === 'gap') continue;
    if (!s.faces.includes(edge) && s.hemisphere !== edge) continue;
    if (edge === 'N' || edge === 'S') {
      const y = edge === 'N' ? courtyard.y : courtyard.y + courtyard.h;
      if (Math.abs(s.rect.y + s.rect.h / 2 - y) > t + band) continue;
      const lo = Math.max(courtyard.x, s.rect.x);
      const hi = Math.min(courtyard.x + courtyard.w, s.rect.x + s.rect.w);
      covered += Math.max(0, hi - lo);
    } else {
      const x = edge === 'W' ? courtyard.x : courtyard.x + courtyard.w;
      if (Math.abs(s.rect.x + s.rect.w / 2 - x) > t + band) continue;
      const lo = Math.max(courtyard.y, s.rect.y);
      const hi = Math.min(courtyard.y + courtyard.h, s.rect.y + s.rect.h);
      covered += Math.max(0, hi - lo);
    }
  }
  return covered;
}

function addGaps(
  segs: WallSegmentDef[],
  courtyard: Rect,
  t: number,
  keep: { x: number; y: number },
): void {
  const edges: Array<'N' | 'E' | 'S' | 'W'> = ['N', 'E', 'S', 'W'];
  for (const edge of edges) {
    const side = edge === 'N' || edge === 'S' ? courtyard.w : courtyard.h;
    const cov = coverageAlong(segs, edge, courtyard, t);
    if (cov >= side * 0.82) continue;
    let rect: Rect;
    let attack: { x: number; y: number };
    let breach: { x: number; y: number };
    if (edge === 'N') {
      rect = { x: courtyard.x + courtyard.w * 0.35, y: courtyard.y - t, w: courtyard.w * 0.3, h: t };
      attack = { x: courtyard.x + courtyard.w / 2, y: courtyard.y - t - 16 };
      breach = { x: courtyard.x + courtyard.w / 2, y: courtyard.y };
    } else if (edge === 'S') {
      rect = { x: courtyard.x + courtyard.w * 0.35, y: courtyard.y + courtyard.h, w: courtyard.w * 0.3, h: t };
      attack = { x: courtyard.x + courtyard.w / 2, y: courtyard.y + courtyard.h + t + 16 };
      breach = { x: courtyard.x + courtyard.w / 2, y: courtyard.y + courtyard.h };
    } else if (edge === 'E') {
      rect = { x: courtyard.x + courtyard.w, y: courtyard.y + courtyard.h * 0.35, w: t, h: courtyard.h * 0.3 };
      attack = { x: courtyard.x + courtyard.w + t + 16, y: courtyard.y + courtyard.h / 2 };
      breach = { x: courtyard.x + courtyard.w, y: courtyard.y + courtyard.h / 2 };
    } else {
      rect = { x: courtyard.x - t, y: courtyard.y + courtyard.h * 0.35, w: t, h: courtyard.h * 0.3 };
      attack = { x: courtyard.x - t - 16, y: courtyard.y + courtyard.h / 2 };
      breach = { x: courtyard.x, y: courtyard.y + courtyard.h / 2 };
    }
    segs.push({
      dir: `gap-${edge}`,
      kind: 'gap',
      rect,
      attackPoint: attack,
      breachPoint: breach,
      hemisphere: edge,
      faces: [edge],
      adjacent: [],
    });
    void keep;
  }
}
