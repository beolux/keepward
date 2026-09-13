import Phaser from 'phaser';
import { ArtPalette } from '../data/artBible';
import type { TowerId } from '../data/towers';

export type ProjectileKind = TowerId;

/**
 * Per-tower readable shots (phone scale).
 * WT short chalk arrow · LB longer fletched · Spear stub · Mangonel lob boulder · Keep bolt
 */
export class Projectile extends Phaser.GameObjects.Container {
  activeShot = false;
  vx = 0;
  vy = 0;
  damage = 0;
  splash = 0;
  targetId = 0;
  life = 0;
  kind: ProjectileKind = 'watchtower';
  /** Mangonel: dust cue for splashFx */
  wantsDust = false;

  private gfx: Phaser.GameObjects.Graphics;
  private startX = 0;
  private startY = 0;
  private endX = 0;
  private endY = 0;
  private duration = 0;
  private elapsed = 0;
  private arcHeight = 0;
  private trailPhase = 0;
  private useArc = false;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    this.gfx = scene.add.graphics();
    this.add(this.gfx);
    this.setVisible(false);
    this.setActive(false);
    scene.add.existing(this);
  }

  fire(
    x: number,
    y: number,
    tx: number,
    ty: number,
    speed: number,
    damage: number,
    splash: number,
    targetId: number,
    kind: ProjectileKind,
  ): void {
    this.kind = kind;
    this.damage = damage;
    this.splash = splash;
    this.targetId = targetId;
    this.wantsDust = kind === 'mangonel';
    this.trailPhase = 0;
    this.elapsed = 0;

    const dx = tx - x;
    const dy = ty - y;
    const dist = Math.hypot(dx, dy) || 1;

    this.useArc = kind === 'mangonel';
    if (this.useArc) {
      this.startX = x;
      this.startY = y;
      this.endX = tx;
      this.endY = ty;
      // slow lob — duration from existing speed, visual arc only
      this.duration = Math.max(0.35, dist / Math.max(120, speed * 0.85));
      this.arcHeight = Phaser.Math.Clamp(28 + dist * 0.08, 24, 56);
      this.vx = 0;
      this.vy = 0;
      this.life = this.duration + 0.15;
      this.setPosition(x, y);
    } else {
      this.vx = (dx / dist) * speed;
      this.vy = (dy / dist) * speed;
      this.life = 2.5;
      this.setPosition(x, y);
      this.setRotation(Math.atan2(dy, dx));
    }

    this.activeShot = true;
    this.setVisible(true);
    this.setActive(true);
    this.setDepth(40);
    this.redraw(1);
  }

  update(dt: number): boolean {
    if (!this.activeShot) return false;
    this.trailPhase += dt;
    this.life -= dt;

    if (this.useArc) {
      this.elapsed += dt;
      const t = Math.min(1, this.elapsed / this.duration);
      const px = Phaser.Math.Linear(this.startX, this.endX, t);
      const py = Phaser.Math.Linear(this.startY, this.endY, t);
      const loft = this.arcHeight * 4 * t * (1 - t);
      this.setPosition(px, py - loft);
      // face along tangent
      const t2 = Math.min(1, t + 0.02);
      const nx = Phaser.Math.Linear(this.startX, this.endX, t2);
      const ny = Phaser.Math.Linear(this.startY, this.endY, t2) - this.arcHeight * 4 * t2 * (1 - t2);
      this.setRotation(Math.atan2(ny - this.y, nx - this.x));
      this.redraw(1 - t * 0.25);
      if (t >= 1 || this.life <= 0) {
        this.deactivate();
        return false;
      }
      return true;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.redraw(1);
    if (this.life <= 0) {
      this.deactivate();
      return false;
    }
    return true;
  }

  private redraw(alphaMul: number): void {
    const g = this.gfx;
    g.clear();
    const a = alphaMul;
    const k = this.kind;

    if (k === 'mangonel') {
      // slate boulder + ochre speck, dotted lob trail
      const dots = 5;
      for (let i = 1; i <= dots; i++) {
        const back = i * 5;
        const ox = -Math.cos(this.rotation) * back;
        const oy = -Math.sin(this.rotation) * back;
        if (i % 2 === 0) {
          g.fillStyle(ArtPalette.slate, 0.22 * a);
          g.fillCircle(ox, oy, 2.2);
        }
      }
      g.fillStyle(ArtPalette.slate, 0.95 * a);
      g.fillCircle(0, 0, 6);
      g.fillStyle(ArtPalette.stoneBlockDark, 0.7 * a);
      g.fillCircle(1.5, 1.5, 3.5);
      g.fillStyle(ArtPalette.ochreWood, 0.9 * a);
      g.fillCircle(-2, -2, 1.8);
      g.lineStyle(1, ArtPalette.nightRoof, 0.7 * a);
      g.strokeCircle(0, 0, 6);
      return;
    }

    if (k === 'spearPost') {
      // thrown spear stub + point — no yellow orb
      g.fillStyle(ArtPalette.ochreWood, 0.35 * a);
      g.fillRect(-10, -1.2, 6, 2.4);
      g.fillStyle(ArtPalette.ochreWood, 0.95 * a);
      g.fillRect(-6, -1.4, 12, 2.8);
      g.fillStyle(ArtPalette.slate, 1 * a);
      g.fillTriangle(8, 0, 2, -2.4, 2, 2.4);
      g.lineStyle(1, ArtPalette.nightRoof, 0.65 * a);
      g.strokeRect(-6, -1.4, 12, 2.8);
      return;
    }

    if (k === 'longbow') {
      // longer thinner arrow, dirt shaft + green fletch, thicker trail
      g.lineStyle(2.2, ArtPalette.forest, 0.35 * a);
      g.lineBetween(-14, 0, -4, 0);
      g.fillStyle(ArtPalette.dirt, 0.95 * a);
      g.fillRect(-10, -1.1, 16, 2.2);
      g.fillStyle(ArtPalette.forest, 0.95 * a);
      g.fillTriangle(-10, 0, -14, -2.8, -14, 2.8);
      g.fillStyle(ArtPalette.slate, 1 * a);
      g.fillTriangle(8, 0, 3, -1.8, 3, 1.8);
      return;
    }

    if (k === 'keep') {
      // small bolt
      g.fillStyle(ArtPalette.mortar, 0.9 * a);
      g.fillRect(-5, -0.9, 9, 1.8);
      g.fillStyle(ArtPalette.slate, 1 * a);
      g.fillTriangle(5, 0, 1.5, -1.6, 1.5, 1.6);
      g.lineStyle(1, ArtPalette.nightRoof, 0.45 * a);
      g.lineBetween(-6, 0, -2, 0);
      return;
    }

    // watchtower — short thin chalk arrow, slate tip, hairline trail
    g.lineStyle(1, ArtPalette.chalk, 0.28 * a);
    g.lineBetween(-11, 0, -3, 0);
    g.fillStyle(ArtPalette.chalk, 0.95 * a);
    g.fillRect(-7, -0.85, 11, 1.7);
    g.fillStyle(ArtPalette.slate, 1 * a);
    g.fillTriangle(5.5, 0, 1.5, -1.5, 1.5, 1.5);
  }

  deactivate(): void {
    this.activeShot = false;
    this.wantsDust = false;
    this.gfx.clear();
    this.setVisible(false);
    this.setActive(false);
    this.setRotation(0);
  }
}
