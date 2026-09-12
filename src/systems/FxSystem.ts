import Phaser from 'phaser';
import { Palette } from '../data/palette';

const PARTICLE_CAP = 48;

/**
 * Lightweight VFX: kill squash, gold-to-tower, flash, dust, shake.
 * Hard particle cap to keep mobile smooth.
 */
export class FxSystem {
  private scene: Phaser.Scene;
  private live = 0;
  private flashRect?: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  private canSpawn(n = 1): boolean {
    return this.live + n <= PARTICLE_CAP;
  }

  private track(obj: Phaser.GameObjects.GameObject, ttlMs: number): void {
    this.live++;
    this.scene.time.delayedCall(ttlMs, () => {
      this.live = Math.max(0, this.live - 1);
      if (obj.active) obj.destroy();
    });
  }

  /** Brief white/red screen flash (hit / breach) */
  flash(color = 0xffffff, alpha = 0.25, ms = 80): void {
    const { width, height } = this.scene.scale;
    if (!this.flashRect) {
      this.flashRect = this.scene.add
        .rectangle(width / 2, height / 2, width, height, color, alpha)
        .setDepth(500)
        .setScrollFactor(0);
    } else {
      this.flashRect.setFillStyle(color, alpha).setVisible(true).setAlpha(alpha);
    }
    this.scene.tweens.killTweensOf(this.flashRect);
    this.scene.tweens.add({
      targets: this.flashRect,
      alpha: 0,
      duration: ms,
      onComplete: () => this.flashRect?.setVisible(false),
    });
  }

  shortShake(intensity = 0.006, duration = 120): void {
    this.scene.cameras.main.shake(duration, intensity);
  }

  /** Death squash then callback when gone */
  deathSquash(
    target: Phaser.GameObjects.Container,
    onDone: () => void,
  ): void {
    this.scene.tweens.killTweensOf(target);
    target.setAlpha(1);
    this.scene.tweens.add({
      targets: target,
      scaleX: 1.35,
      scaleY: 0.35,
      alpha: 0.2,
      duration: 140,
      ease: 'Quad.easeIn',
      onComplete: () => {
        target.setScale(1);
        target.setAlpha(1);
        onDone();
      },
    });
  }

  /** Gold / wood pips fly toward killing tower (Bloons-style) */
  goldToTower(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    gold: number,
    wood: number,
  ): void {
    const n = Math.min(6, Math.max(2, Math.ceil((gold + wood) / 4)));
    if (!this.canSpawn(n)) return;
    for (let i = 0; i < n; i++) {
      const isGold = i % 2 === 0 || wood <= 0;
      const c = this.scene.add
        .circle(
          fromX + Phaser.Math.Between(-8, 8),
          fromY + Phaser.Math.Between(-8, 8),
          isGold ? 4 : 3.5,
          isGold ? Palette.gold : Palette.wood,
          0.95,
        )
        .setDepth(80);
      this.live++;
      this.scene.tweens.add({
        targets: c,
        x: toX + Phaser.Math.Between(-6, 6),
        y: toY + Phaser.Math.Between(-10, 0),
        alpha: 0.15,
        scale: 0.4,
        duration: 380 + i * 40,
        delay: i * 25,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          this.live = Math.max(0, this.live - 1);
          c.destroy();
        },
      });
    }
  }

  hitFlash(target: Phaser.GameObjects.Container): void {
    this.scene.tweens.killTweensOf(target);
    target.setAlpha(0.45);
    this.scene.tweens.add({
      targets: target,
      alpha: 1,
      duration: 70,
    });
  }

  /** Breach dust puffs + squash cue at wall */
  breachDust(x: number, y: number): void {
    const n = 8;
    if (!this.canSpawn(n)) return;
    for (let i = 0; i < n; i++) {
      const ang = (Math.PI * 2 * i) / n + Math.random() * 0.4;
      const dist = 18 + Math.random() * 28;
      const p = this.scene.add
        .circle(x, y, 3 + Math.random() * 4, Palette.breach, 0.85)
        .setDepth(40);
      this.live++;
      this.scene.tweens.add({
        targets: p,
        x: x + Math.cos(ang) * dist,
        y: y + Math.sin(ang) * dist - 10,
        alpha: 0,
        scale: 0.3,
        duration: 320 + Math.random() * 120,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.live = Math.max(0, this.live - 1);
          p.destroy();
        },
      });
    }
  }

  wallSquash(gfx: Phaser.GameObjects.Graphics): void {
    this.scene.tweens.add({
      targets: gfx,
      scaleY: 0.7,
      scaleX: 1.15,
      duration: 90,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  placePop(x: number, y: number): void {
    if (!this.canSpawn(1)) return;
    const r = this.scene.add.circle(x, y, 6, Palette.rangeOk, 0.5).setDepth(50);
    this.track(r, 280);
    this.scene.tweens.add({
      targets: r,
      radius: 28,
      alpha: 0,
      duration: 260,
    });
  }

  destroy(): void {
    this.flashRect?.destroy();
    this.live = 0;
  }
}
