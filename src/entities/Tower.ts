import Phaser from 'phaser';
import { TOWERS, type TowerId, type TowerDef } from '../data/towers';
import { Palette } from '../data/palette';
import type { EnemyUnit } from './Enemy';

export class TowerUnit extends Phaser.GameObjects.Container {
  towerId: TowerId;
  def: TowerDef;
  padId: number;
  range: number;
  fireRate: number;
  damage: number;
  splash: number;
  cooldown = 0;
  private bodyGfx: Phaser.GameObjects.Graphics;
  private rangeRing: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number, towerId: TowerId, padId: number) {
    super(scene, x, y);
    this.towerId = towerId;
    this.def = TOWERS[towerId];
    this.padId = padId;
    this.range = this.def.range;
    this.fireRate = this.def.fireRate;
    this.damage = this.def.damage;
    this.splash = this.def.splash;

    this.bodyGfx = scene.add.graphics();
    this.rangeRing = scene.add.circle(0, 0, this.range, Palette.ochre, 0.08);
    this.rangeRing.setStrokeStyle(1, Palette.ochre, 0.35);
    this.rangeRing.setVisible(false);
    this.add([this.rangeRing, this.bodyGfx]);
    this.draw();
    this.setDepth(25);
    scene.add.existing(this);
  }

  private draw(): void {
    const g = this.bodyGfx;
    g.clear();
    const id = this.towerId;

    if (id === 'keep') {
      // large stone keep silhouette
      g.fillStyle(this.def.color, 1);
      g.fillRoundedRect(-22, -18, 44, 40, 4);
      g.fillStyle(this.def.accent, 1);
      // battlements
      for (let i = -18; i <= 14; i += 10) {
        g.fillRect(i, -28, 8, 12);
      }
      g.fillStyle(Palette.dirtDark, 1);
      g.fillRect(-6, 2, 12, 20);
      return;
    }

    if (id === 'watchtower') {
      g.fillStyle(this.def.color, 1);
      g.fillRect(-10, -8, 20, 28);
      g.fillStyle(this.def.accent, 1);
      g.fillTriangle(0, -28, -14, -6, 14, -6);
      g.fillStyle(Palette.slate, 1);
      g.fillCircle(0, 2, 4);
      return;
    }

    // mangonel nest — squat with bowl
    g.fillStyle(this.def.color, 1);
    g.fillRoundedRect(-14, -4, 28, 22, 3);
    g.fillStyle(this.def.accent, 1);
    g.fillCircle(0, -8, 10);
    g.lineStyle(3, Palette.ochreDark, 1);
    g.strokeCircle(0, -8, 10);
    g.fillStyle(Palette.dirtDark, 1);
    g.fillRect(-2, -18, 4, 12);
  }

  showRange(show: boolean): void {
    this.rangeRing.setVisible(show);
  }

  applyAgeBuff(damageMult: number, fireRateMult: number): void {
    this.damage = this.def.damage * damageMult;
    this.fireRate = this.def.fireRate * fireRateMult;
  }

  /** Returns target if ready to fire */
  tryAcquire(enemies: EnemyUnit[], dtMs: number): EnemyUnit | null {
    this.cooldown -= dtMs;
    if (this.cooldown > 0) return null;
    let best: EnemyUnit | null = null;
    let bestDist = Infinity;
    for (const e of enemies) {
      if (!e.alive) continue;
      const d = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
      if (d <= this.range && d < bestDist) {
        bestDist = d;
        best = e;
      }
    }
    if (best) {
      this.cooldown = this.fireRate;
    }
    return best;
  }
}
