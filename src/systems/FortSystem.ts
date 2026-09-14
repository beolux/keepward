import Phaser from 'phaser';
import {
  pointInCourtyard,
  pointInRect,
  type LayoutId,
  type WallDir,
  type FortLayout,
  type WallSegmentDef,
} from '../data/fort';
import type { SurveyedFort } from '../data/survey';
import { SURVEY } from '../data/survey';
import { WallSegment } from '../entities/Wall';
import { TUNING } from '../data/tuning';
import type { AgeId } from '../data/ages';
import { Palette } from '../data/palette';
import { TILE_PX } from '../data/tuning';

export class FortSystem {
  layout: FortLayout;
  layoutId: LayoutId;
  keepPos: { x: number; y: number };
  segments = new Map<WallDir, WallSegment>();
  segmentDefs: WallSegmentDef[] = [];
  hardened = false;
  stoneFaced = false;
  private groundGfx: Phaser.GameObjects.Graphics;
  private courtyardGfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, survey: SurveyedFort) {
    this.layoutId = (survey.layout.id as LayoutId) || 'survey';
    this.layout = survey.layout;
    this.keepPos = survey.keep;
    this.segmentDefs = survey.segments;

    this.groundGfx = scene.add.graphics().setDepth(0);
    this.courtyardGfx = scene.add.graphics().setDepth(1);
    this.drawGround(scene);

    const baseHp = TUNING.wallHpByAge.dark ?? SURVEY.darkHp;
    for (const def of survey.segments) {
      const hp = def.kind === 'gap' ? 0 : baseHp;
      const seg = new WallSegment(scene, def, hp);
      if (def.kind === 'gap') {
        seg.breached = true;
        seg.hp = 0;
        seg.gfx.setVisible(false);
        seg.incomingGlow.setVisible(false);
        seg.hpText.setVisible(false);
        seg.hitZone.disableInteractive();
        seg.hitZone.setActive(false).setVisible(false);
      }
      this.segments.set(def.dir, seg);
    }
  }

  private drawGround(scene: Phaser.Scene): void {
    const g = this.groundGfx;
    const { width, height } = scene.scale;
    // Outer field — muted grass (storybook flat)
    g.fillStyle(Palette.grassDark, 1);
    g.fillRect(0, 0, width, height);
    g.fillStyle(Palette.grass, 1);
    g.fillRect(0, 48, width, height - 148);
    g.fillStyle(Palette.grassLight, 0.28);
    for (let i = 0; i < 50; i++) {
      g.fillCircle(
        Phaser.Math.Between(10, width - 10),
        Phaser.Math.Between(60, height - 120),
        Phaser.Math.Between(4, 14),
      );
    }

    const c = this.layout.courtyard;
    const cg = this.courtyardGfx;
    // Packed earth courtyard
    cg.fillStyle(Palette.dirt, 1);
    cg.fillRect(c.x, c.y, c.w, c.h);
    // Patchy grass islands
    cg.fillStyle(Palette.grass, 0.45);
    for (let i = 0; i < 28; i++) {
      const px = c.x + 8 + ((i * 37) % Math.max(1, c.w - 24));
      const py = c.y + 8 + ((i * 53) % Math.max(1, c.h - 24));
      cg.fillCircle(px, py, 6 + (i % 5));
    }
    cg.fillStyle(Palette.forest, 0.15);
    for (let i = 0; i < 12; i++) {
      cg.fillCircle(
        c.x + 20 + ((i * 41) % Math.max(1, c.w - 40)),
        c.y + 20 + ((i * 29) % Math.max(1, c.h - 40)),
        8,
      );
    }
    // Stone pad only under Keep
    const kx = this.keepPos.x;
    const ky = this.keepPos.y;
    cg.fillStyle(Palette.mortar, 0.95);
    cg.fillEllipse(kx, ky + 18, 56, 22);
    cg.fillStyle(Palette.slate, 0.55);
    cg.fillEllipse(kx, ky + 18, 48, 16);
    cg.lineStyle(1, Palette.ochreDark, 0.35);
    cg.strokeRect(c.x, c.y, c.w, c.h);
  }

  baselineForAge(age: AgeId): number {
    let hp = TUNING.wallHpByAge[age];
    if (this.hardened && age !== 'imperial') {
      // Hardened +60; Stone Facing overrides/sets
      if (!this.stoneFaced) hp += TUNING.wallUpgrades.hardenedTimbers.bonusHp;
    }
    if (this.stoneFaced && (age === 'castle' || age === 'imperial')) {
      // Stone facing: stone 260 or +120 if hardened — baseline already castle 260;
      // if hardened first: 260+120 style via sheet "stone 260 or +120 if hardened"
      if (this.hardened && age === 'castle') {
        hp = TUNING.wallUpgrades.stoneFacing.stoneBaseline + TUNING.wallUpgrades.stoneFacing.hardenedBonus;
      } else {
        hp = TUNING.wallHpByAge[age];
      }
    }
    if (age === 'imperial') hp = TUNING.wallHpByAge.imperial;
    return hp;
  }

  /**
   * Age-up wall HP:
   * undamaged → new baseline; damaged get +Δ of the tier jump (not full heal).
   */
  onAgeUp(prev: AgeId, next: AgeId): void {
    const oldBase = this.baselineForAge(prev);
    const newBase = this.baselineForAge(next);
    const delta = newBase - oldBase;
    for (const seg of this.segments.values()) {
      if (seg.def.kind === 'gap') continue;
      if (seg.breached || seg.rebuilding) continue;
      const wasFull = seg.hp >= seg.maxHp - 0.01;
      if (wasFull) {
        seg.hp = newBase;
        seg.maxHp = newBase;
      } else {
        seg.maxHp = newBase;
        seg.hp = Math.min(newBase, seg.hp + Math.max(0, delta));
      }
      seg.redraw(this.stoneFaced || next === 'imperial' || next === 'castle');
    }
  }

  applyHardenedTimbers(): void {
    this.hardened = true;
    const bonus = TUNING.wallUpgrades.hardenedTimbers.bonusHp;
    for (const seg of this.segments.values()) {
      if (seg.def.kind === 'gap' || seg.breached) continue;
      seg.maxHp += bonus;
      seg.hp += bonus;
      seg.redraw(false);
    }
  }

  applyStoneFacing(): void {
    this.stoneFaced = true;
    // stone 260 or +120 if hardened
    const target = this.hardened
      ? TUNING.wallUpgrades.stoneFacing.stoneBaseline + TUNING.wallUpgrades.stoneFacing.hardenedBonus
      : TUNING.wallUpgrades.stoneFacing.stoneBaseline;
    for (const seg of this.segments.values()) {
      if (seg.def.kind === 'gap' || seg.breached) continue;
      const gain = Math.max(0, target - seg.maxHp);
      seg.maxHp = Math.max(seg.maxHp, target);
      seg.hp += gain;
      seg.hp = Math.min(seg.hp, seg.maxHp);
      seg.redraw(true);
    }
  }

  damageWall(dir: WallDir, amount: number, now: number, splashAdj: boolean): WallDir[] {
    const breached: WallDir[] = [];
    const seg = this.segments.get(dir);
    if (seg && !seg.breached && !seg.rebuilding) {
      if (seg.takeDamage(amount, now)) breached.push(dir);
      seg.redraw(this.stoneFaced);
    }
    if (splashAdj) {
      const splash = amount * TUNING.elephantSplashAdjacent;
      const adjIds = seg?.def.adjacent ?? [];
      for (const adj of adjIds) {
        const a = this.segments.get(adj);
        if (a && !a.breached && !a.rebuilding && a.def.kind !== 'gap') {
          if (a.takeDamage(splash, now)) breached.push(adj);
          a.redraw(this.stoneFaced);
        }
      }
    }
    return breached;
  }

  isBreached(dir: WallDir): boolean {
    return this.segments.get(dir)?.breached ?? false;
  }

  anyBreach(): boolean {
    for (const s of this.segments.values()) {
      if (s.def.kind === 'gap') continue;
      if (s.breached) return true;
    }
    return false;
  }

  closestBreach(from: { x: number; y: number }): { dir: WallDir; point: { x: number; y: number } } | null {
    let best: { dir: WallDir; point: { x: number; y: number } } | null = null;
    let bestD = Infinity;
    for (const [dir, seg] of this.segments) {
      if (!seg.breached) continue;
      const p = seg.def.breachPoint;
      const d = Phaser.Math.Distance.Between(from.x, from.y, p.x, p.y);
      if (d < bestD) {
        bestD = d;
        best = { dir, point: { ...p } };
      }
    }
    return best;
  }

  /** Round-robin cursor so waves never all stack on one segment */
  private hemisphereRR = 0;

  /** Non-breached walls facing a spawn edge (fallback: any intact, else N). */
  private realWalls(): WallSegment[] {
    return [...this.segments.values()].filter((s) => s.def.kind !== 'gap');
  }

  private gapWalls(edge?: 'N' | 'E' | 'S' | 'W'): WallSegment[] {
    return [...this.segments.values()].filter(
      (s) => s.def.kind === 'gap' && (!edge || s.def.faces.includes(edge) || s.def.hemisphere === edge),
    );
  }

  private hemisphereCandidates(edge: 'N' | 'E' | 'S' | 'W'): WallSegment[] {
    let list = this.wallsForEdge(edge).filter((s) => !s.breached && s.def.kind !== 'gap');
    if (list.length === 0) {
      list = this.realWalls().filter((s) => !s.breached);
    }
    if (list.length === 0) {
      const gaps = this.gapWalls(edge);
      if (gaps.length) return gaps;
      const anyGap = this.gapWalls();
      if (anyGap.length) return anyGap;
      const any = this.realWalls();
      if (any.length) return [any[0]];
    }
    return list;
  }

  /**
   * Spread pick across the incoming hemisphere: weighted toward weakest,
   * blended with uniform + round-robin so the wave never 100% stacks one tile.
   * Enemies still retarget via breach→enter if a hole opens later.
   */
  pickSpreadTarget(edge: 'N' | 'E' | 'S' | 'W'): {
    wall: WallSegment;
    attackPoint: { x: number; y: number };
    breachPoint: { x: number; y: number };
  } {
    const gaps = this.gapWalls(edge);
    const intact = this.wallsForEdge(edge).filter((s) => !s.breached && s.def.kind !== 'gap');
    // Mix weakest walls with open gaps on this edge (edges → weakest / gaps / Keep)
    if (gaps.length && (intact.length === 0 || Math.random() < 0.3)) {
      const wall = gaps[Math.floor(Math.random() * gaps.length)];
      return {
        wall,
        attackPoint: { ...wall.def.attackPoint },
        breachPoint: { ...wall.def.breachPoint },
      };
    }
    const list = this.hemisphereCandidates(edge);
    if (!list.length) {
      const wall = this.realWalls()[0] ?? [...this.segments.values()][0];
      return {
        wall,
        attackPoint: { ...wall.def.attackPoint },
        breachPoint: { ...wall.def.breachPoint },
      };
    }
    list.sort((a, b) => a.hp - b.hp);

    // Inverse-HP weights, blended with uniform so weakest cannot monopolize.
    const inv = list.map((s) => 1 / Math.max(s.hp, 1));
    const sumInv = inv.reduce((a, b) => a + b, 0) || 1;
    const uniform = 1 / list.length;
    let weights = inv.map((w) => 0.55 * (w / sumInv) + 0.45 * uniform);

    // Soft round-robin bump across the sorted hemisphere list.
    const rr = this.hemisphereRR % list.length;
    this.hemisphereRR++;
    weights = weights.map((w, i) => w + (i === rr ? 0.18 : 0));
    const sumW = weights.reduce((a, b) => a + b, 0) || 1;
    weights = weights.map((w) => w / sumW);

    let r = Math.random();
    let wall = list[list.length - 1];
    for (let i = 0; i < list.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        wall = list[i];
        break;
      }
    }

    return {
      wall,
      attackPoint: this.jitterAlongSegment(wall),
      breachPoint: { ...wall.def.breachPoint },
    };
  }

  /** Optional jitter along the segment so attackers don't share one pixel. */
  private jitterAlongSegment(seg: WallSegment): { x: number; y: number } {
    const ap = seg.def.attackPoint;
    const r = seg.def.rect;
    const t = Math.random() - 0.5;
    if (r.w >= r.h * 1.2) {
      return { x: ap.x + t * Math.max(r.w * 0.55, 24), y: ap.y };
    }
    if (r.h >= r.w * 1.2) {
      return { x: ap.x, y: ap.y + t * Math.max(r.h * 0.55, 24) };
    }
    return {
      x: ap.x + t * 20,
      y: ap.y + (Math.random() - 0.5) * 20,
    };
  }

  /** @deprecated Prefer pickSpreadTarget — kept for callers that want pure weakest. */
  weakestInHemisphere(edge: 'N' | 'E' | 'S' | 'W'): WallSegment {
    const list = this.hemisphereCandidates(edge);
    list.sort((a, b) => a.hp - b.hp);
    return list[0];
  }

  /** Free placement: anywhere inside courtyard, not on keep/towers/walls */
  canPlace(
    x: number,
    y: number,
    keepPos: { x: number; y: number },
    towers: { x: number; y: number }[],
  ): boolean {
    const inset = TUNING.placement.towerRadius;
    if (!pointInCourtyard(x, y, this.layout.courtyard, inset)) return false;
    // not on wall segments (gaps are open dirt)
    for (const seg of this.segments.values()) {
      if (seg.def.kind === 'gap') continue;
      if (pointInRect(x, y, expandRect(seg.def.rect, TUNING.placement.wallClearance))) return false;
    }
    const kd = Phaser.Math.Distance.Between(x, y, keepPos.x, keepPos.y);
    if (kd < TUNING.placement.keepClearance) return false;
    for (const t of towers) {
      if (Phaser.Math.Distance.Between(x, y, t.x, t.y) < TUNING.placement.towerRadius * 2) return false;
    }
    return true;
  }

  /** Walls in hemisphere of a spawn edge (for incoming tell) */
  wallsForEdge(edge: 'N' | 'E' | 'S' | 'W'): WallSegment[] {
    return [...this.segments.values()].filter((s) => {
      if (s.def.kind === 'gap') return false;
      return s.def.faces?.includes(edge) || s.def.hemisphere === edge;
    });
  }

  /** Glow / clear incoming-side tell on wall segments */
  setIncomingEdge(edge: 'N' | 'E' | 'S' | 'W' | null): void {
    const hot = edge ? new Set(this.wallsForEdge(edge).map((s) => s.dir)) : new Set<WallDir>();
    for (const seg of this.segments.values()) {
      seg.setIncoming(hot.has(seg.dir));
    }
  }

  /** Build-phase: keep damaged wall HP + gold outline visible for repair */
  setBuildRepairHints(on: boolean): void {
    for (const seg of this.segments.values()) {
      seg.setBuildRepairHint(on);
    }
  }

  redrawAll(): void {
    for (const seg of this.segments.values()) {
      seg.redraw(this.stoneFaced);
    }
  }

  destroy(): void {
    for (const seg of this.segments.values()) seg.destroy();
    this.groundGfx.destroy();
    this.courtyardGfx.destroy();
  }
}

function expandRect(r: { x: number; y: number; w: number; h: number }, pad: number) {
  return { x: r.x - pad, y: r.y - pad, w: r.w + pad * 2, h: r.h + pad * 2 };
}

void TILE_PX;
