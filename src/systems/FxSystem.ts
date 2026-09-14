import Phaser from 'phaser';
import { Palette } from '../data/palette';
import { GAME_W, GAME_H } from '../data/map';

const PARTICLE_CAP = 64;

/**
 * Lightweight VFX: kill squash, gold-to-tower, flash, dust, shake.
 * Hard particle cap to keep mobile smooth.
 * night1: stronger kill pop, bounty float, age fanfare, wave-clear burst.
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

  /** Death squash then callback when gone — night1 stronger pop */
  deathSquash(
    target: Phaser.GameObjects.Container,
    onDone: () => void,
  ): void {
    this.scene.tweens.killTweensOf(target);
    target.setAlpha(1);
    this.scene.tweens.add({
      targets: target,
      scaleX: 1.6,
      scaleY: 0.18,
      alpha: 0.15,
      duration: 170,
      ease: 'Quad.easeIn',
      onComplete: () => {
        target.setScale(1);
        target.setAlpha(1);
        onDone();
      },
    });
  }

  /** Expanding chalk ring at the kill — reads at arm's length */
  killPop(x: number, y: number): void {
    const ring = this.scene.add
      .circle(x, y, 8, Palette.chalk, 0.75)
      .setDepth(70)
      .setScale(0.25);
    this.scene.tweens.add({
      targets: ring,
      scale: 3.1,
      alpha: 0,
      duration: 240,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    });
    if (!this.canSpawn(4)) return;
    for (let i = 0; i < 4; i++) {
      const ang = (Math.PI * 2 * i) / 4 + Math.random() * 0.4;
      const p = this.scene.add
        .circle(x, y, 2.5, Palette.gold, 0.95)
        .setDepth(71);
      this.live++;
      this.scene.tweens.add({
        targets: p,
        x: x + Math.cos(ang) * 22,
        y: y + Math.sin(ang) * 16 - 6,
        alpha: 0,
        scale: 0.3,
        duration: 220,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.live = Math.max(0, this.live - 1);
          p.destroy();
        },
      });
    }
  }

  /** Floating "+4W +2G" over the corpse */
  bountyFloat(x: number, y: number, gold: number, wood: number): void {
    const parts: string[] = [];
    if (wood > 0) parts.push(`+${wood}W`);
    if (gold > 0) parts.push(`+${gold}G`);
    if (!parts.length) return;
    const t = this.scene.add
      .text(x, y - 14, parts.join('  '), {
        fontSize: '14px',
        color: '#D4A84B',
        fontFamily: 'system-ui',
        fontStyle: 'bold',
        stroke: '#1A2A22',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(92);
    this.scene.tweens.add({
      targets: t,
      y: y - 48,
      alpha: 0,
      duration: 780,
      ease: 'Quad.easeOut',
      onComplete: () => t.destroy(),
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
    const n = Math.min(7, Math.max(3, Math.ceil((gold + wood) / 3)));
    if (!this.canSpawn(n)) return;
    for (let i = 0; i < n; i++) {
      const isGold = i % 2 === 0 || wood <= 0;
      const c = this.scene.add
        .circle(
          fromX + Phaser.Math.Between(-8, 8),
          fromY + Phaser.Math.Between(-8, 8),
          isGold ? 5.5 : 4.5,
          isGold ? Palette.gold : Palette.wood,
          0.98,
        )
        .setDepth(80)
        .setStrokeStyle(1, isGold ? Palette.ochreDark : Palette.dirtDark);
      this.live++;
      const delay = i * 22;
      this.scene.tweens.add({
        targets: c,
        x: toX + Phaser.Math.Between(-5, 5),
        y: toY + Phaser.Math.Between(-12, -2),
        alpha: 0.2,
        scale: 0.35,
        duration: 400 + i * 30,
        delay,
        ease: 'Back.easeIn',
        onComplete: () => {
          this.live = Math.max(0, this.live - 1);
          c.destroy();
        },
      });
    }
  }

  /** Tiny bounce on the tower that banked the kill */
  towerNibble(target: Phaser.GameObjects.Container): void {
    const sx = target.scaleX;
    const sy = target.scaleY;
    this.scene.tweens.add({
      targets: target,
      scaleX: sx * 1.12,
      scaleY: sy * 1.12,
      duration: 70,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
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
    // Tween scale/alpha — Phaser circle radius tween is unreliable on mobile
    const r = this.scene.add.circle(x, y, 14, Palette.rangeOk, 0.5).setDepth(50).setScale(0.4);
    this.track(r, 280);
    this.scene.tweens.add({
      targets: r,
      scale: 2,
      alpha: 0,
      duration: 260,
      ease: 'Quad.easeOut',
    });
  }

  /** Age-up fanfare — rings at keep + title card */
  ageFanfare(keepX: number, keepY: number, title: string, gem: number): void {
    this.flash(gem, 0.32, 280);
    this.shortShake(0.01, 200);
    for (let i = 0; i < 3; i++) {
      const ring = this.scene.add
        .circle(keepX, keepY, 10, gem, 0.55)
        .setDepth(75)
        .setScale(0.3);
      this.scene.tweens.add({
        targets: ring,
        scale: 4.2 + i * 0.6,
        alpha: 0,
        duration: 520,
        delay: i * 90,
        ease: 'Quad.easeOut',
        onComplete: () => ring.destroy(),
      });
    }
    const t = this.scene.add
      .text(GAME_W / 2, GAME_H * 0.3, title, {
        fontSize: '28px',
        color: '#D4A84B',
        fontFamily: 'Georgia, serif',
        fontStyle: 'bold',
        stroke: '#1A2A22',
        strokeThickness: 6,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(210)
      .setScale(0.4)
      .setAlpha(0);
    this.scene.tweens.add({
      targets: t,
      scale: 1.08,
      alpha: 1,
      duration: 220,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: t,
          alpha: 0,
          scale: 1.15,
          delay: 700,
          duration: 280,
          onComplete: () => t.destroy(),
        });
      },
    });
  }

  /** Wave-clear beat — banner + gold flash */
  waveClearBurst(waveNum: number, bonusGold: number): void {
    this.flash(Palette.gold, 0.22, 180);
    const line =
      bonusGold > 0 ? `WAVE ${waveNum} CLEAR  +${bonusGold}G` : `WAVE ${waveNum} CLEAR`;
    const t = this.scene.add
      .text(GAME_W / 2, GAME_H * 0.28, line, {
        fontSize: '22px',
        color: '#F0EBE0',
        fontFamily: 'Georgia, serif',
        fontStyle: 'bold',
        stroke: '#1A2A22',
        strokeThickness: 5,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(210)
      .setScale(0.5)
      .setAlpha(0);
    this.scene.tweens.add({
      targets: t,
      scale: 1.05,
      alpha: 1,
      duration: 180,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: t,
          alpha: 0,
          y: t.y - 16,
          delay: 520,
          duration: 260,
          onComplete: () => t.destroy(),
        });
      },
    });
  }

  destroy(): void {
    this.flashRect?.destroy();
    this.live = 0;
  }
}
