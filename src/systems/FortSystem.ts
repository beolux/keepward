import Phaser from 'phaser';
import {
  generateFort,
  pointInCourtyard,
  pointInRect,
  WALL_ADJACENT,
  WALL_DIRS,
  type LayoutId,
  type WallDir,
  type FortLayout,
  type WallSegmentDef,
} from '../data/fort';
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

  constructor(scene: Phaser.Scene, layoutId: LayoutId) {
    this.layoutId = layoutId;
    const gen = generateFort(layoutId);
    this.layout = gen.layout;
    this.keepPos = gen.keep;
    this.segmentDefs = gen.segments;

    this.groundGfx = scene.add.graphics().setDepth(0);
    this.courtyardGfx = scene.add.graphics().setDepth(1);
    this.drawGround(scene);

    const baseHp = TUNING.wallHpByAge.dark;
    for (const def of gen.segments) {
      const seg = new WallSegment(scene, def, baseHp);
      this.segments.set(def.dir, seg);
    }
  }

  private drawGround(scene: Phaser.Scene): void {
    const g = this.groundGfx;
    const { width, height } = scene.scale;
    g.fillStyle(Palette.grassDark, 1);
    g.fillRect(0, 0, width, height);
    g.fillStyle(Palette.grass, 1);
    g.fillRect(0, 48, width, height - 148);
    g.fillStyle(Palette.grassLight, 0.3);
    for (let i = 0; i < 60; i++) {
      g.fillCircle(
        Phaser.Math.Between(10, width - 10),
        Phaser.Math.Between(60, height - 120),
        Phaser.Math.Between(4, 12),
      );
    }

    const c = this.layout.courtyard;
    this.courtyardGfx.fillStyle(0x3a4a38, 1);
    this.courtyardGfx.fillRect(c.x, c.y, c.w, c.h);
    this.courtyardGfx.lineStyle(1, Palette.ochreDark, 0.4);
    this.courtyardGfx.strokeRect(c.x, c.y, c.w, c.h);
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
      if (seg.breached) continue;
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
      if (seg.breached) continue;
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
      if (seg.breached) continue;
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
    if (seg && !seg.breached) {
      if (seg.takeDamage(amount, now)) breached.push(dir);
      seg.redraw(this.stoneFaced);
    }
    if (splashAdj) {
      const splash = amount * TUNING.elephantSplashAdjacent;
      for (const adj of WALL_ADJACENT[dir]) {
        const a = this.segments.get(adj);
        if (a && !a.breached) {
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
    for (const s of this.segments.values()) if (s.breached) return true;
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

  /** Weakest non-breached wall in hemisphere of spawn edge */
  weakestInHemisphere(edge: 'N' | 'E' | 'S' | 'W'): WallSegment {
    const candidates = WALL_DIRS.filter((d) => {
      const seg = this.segments.get(d)!;
      if (seg.breached) return false;
      // Map edge to walls
      if (edge === 'N') return d === 'N' || d === 'NE' || d === 'NW';
      if (edge === 'S') return d === 'S' || d === 'SE' || d === 'SW';
      if (edge === 'E') return d === 'E' || d === 'NE' || d === 'SE';
      return d === 'W' || d === 'NW' || d === 'SW';
    });
    let list = candidates.map((d) => this.segments.get(d)!);
    if (list.length === 0) {
      list = [...this.segments.values()].filter((s) => !s.breached);
    }
    if (list.length === 0) {
      // all breached — return any
      return this.segments.get('N')!;
    }
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
    // not on wall segments
    for (const seg of this.segments.values()) {
      if (pointInRect(x, y, expandRect(seg.def.rect, TUNING.placement.wallClearance))) return false;
    }
    const kd = Phaser.Math.Distance.Between(x, y, keepPos.x, keepPos.y);
    if (kd < TUNING.placement.keepClearance) return false;
    for (const t of towers) {
      if (Phaser.Math.Distance.Between(x, y, t.x, t.y) < TUNING.placement.towerRadius * 2) return false;
    }
    return true;
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
