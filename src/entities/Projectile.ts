import Phaser from 'phaser';
import { Palette } from '../data/palette';

export class Projectile extends Phaser.GameObjects.Container {
  activeShot = false;
  vx = 0;
  vy = 0;
  damage = 0;
  splash = 0;
  targetId = 0;
  life = 0;
  private bodyGfx: Phaser.GameObjects.Arc;
  private trail: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    this.bodyGfx = scene.add.circle(0, 0, 4, Palette.ochre);
    this.trail = scene.add.circle(0, 0, 6, Palette.ochreDark, 0.35);
    this.add([this.trail, this.bodyGfx]);
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
    tint: number,
  ): void {
    this.setPosition(x, y);
    const dx = tx - x;
    const dy = ty - y;
    const len = Math.hypot(dx, dy) || 1;
    this.vx = (dx / len) * speed;
    this.vy = (dy / len) * speed;
    this.damage = damage;
    this.splash = splash;
    this.targetId = targetId;
    this.life = 2.5;
    this.bodyGfx.setFillStyle(tint);
    this.activeShot = true;
    this.setVisible(true);
    this.setActive(true);
    this.setDepth(40);
  }

  update(dt: number): boolean {
    if (!this.activeShot) return false;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0) {
      this.deactivate();
      return false;
    }
    return true;
  }

  deactivate(): void {
    this.activeShot = false;
    this.setVisible(false);
    this.setActive(false);
  }
}
