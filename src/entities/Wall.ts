import Phaser from 'phaser';
import { Palette } from '../data/palette';
import type { WallDir, WallSegmentDef } from '../data/fort';
import { TUNING } from '../data/tuning';
import type { AgeId } from '../data/ages';

export class WallSegment {
  dir: WallDir;
  def: WallSegmentDef;
  hp: number;
  maxHp: number;
  breached = false;
  lastHitAt = 0;
  gfx: Phaser.GameObjects.Graphics;
  hpText: Phaser.GameObjects.Text;
  hitZone: Phaser.GameObjects.Zone;
  /** Soft glow under wall when incoming on this side */
  incomingGlow: Phaser.GameObjects.Graphics;
  private scene: Phaser.Scene;
  private hpHideEvent?: Phaser.Time.TimerEvent;
  private buildHint = false;
  private incoming = false;
  private stone = false;

  constructor(scene: Phaser.Scene, def: WallSegmentDef, hp: number) {
    this.scene = scene;
    this.dir = def.dir;
    this.def = def;
    this.hp = hp;
    this.maxHp = hp;

    this.incomingGlow = scene.add.graphics().setDepth(14).setAlpha(0);
    this.gfx = scene.add.graphics().setDepth(15);
    this.hpText = scene.add
      .text(def.breachPoint.x, def.breachPoint.y, '', {
        fontSize: '10px',
        color: '#F0EBE0',
        fontFamily: 'system-ui',
        backgroundColor: '#1A2A22aa',
        padding: { x: 3, y: 1 },
      })
      .setOrigin(0.5)
      .setDepth(16)
      .setAlpha(0);

    const r = def.rect;
    // ≥44pt hit targets for thumb repair
    this.hitZone = scene.add
      .zone(r.x + r.w / 2, r.y + r.h / 2, Math.max(r.w, 44), Math.max(r.h, 44))
      .setInteractive({ useHandCursor: true })
      .setDepth(17);

    this.redraw();
  }

  redraw(stone = false): void {
    this.stone = stone;
    const g = this.gfx;
    g.clear();
    const r = this.def.rect;
    if (this.breached) {
      g.fillStyle(Palette.breach, 0.85);
      g.fillRect(r.x, r.y, r.w, r.h);
      g.lineStyle(1, Palette.dirtDark, 0.6);
      g.strokeRect(r.x, r.y, r.w, r.h);
      this.hpText.setText('BREACH');
      this.hpText.setColor('#E08080');
      this.hpText.setAlpha(1);
      this.drawIncomingGlow();
      return;
    }
    const pct = this.hp / this.maxHp;
    const base = stone ? Palette.stone : Palette.wood;
    const dmg = stone ? Palette.slate : Palette.dirtDark;
    g.fillStyle(pct > 0.5 ? base : dmg, 1);
    g.fillRect(r.x, r.y, r.w, r.h);
    g.lineStyle(1, stone ? Palette.stoneLight : Palette.ochreDark, 1);
    g.strokeRect(r.x, r.y, r.w, r.h);
    if (pct < 0.7) {
      g.lineStyle(1, Palette.breach, 0.7);
      g.lineBetween(r.x + 2, r.y + 2, r.x + r.w - 2, r.y + r.h - 2);
    }
    // Build-phase repair affordance: bright outline on damaged segments
    if (this.buildHint && pct < 0.999) {
      g.lineStyle(3, Palette.gold, 0.95);
      g.strokeRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2);
    }
    this.hpText.setText(`${Math.ceil(this.hp)}`);
    this.hpText.setColor(pct < 0.35 ? '#E08080' : '#F0EBE0');
    this.drawIncomingGlow();
  }

  private drawIncomingGlow(): void {
    const g = this.incomingGlow;
    g.clear();
    if (!this.incoming || this.breached) {
      g.setAlpha(0);
      return;
    }
    const r = this.def.rect;
    const pad = 6;
    g.fillStyle(Palette.blood, 0.35);
    g.fillRect(r.x - pad, r.y - pad, r.w + pad * 2, r.h + pad * 2);
    g.lineStyle(3, Palette.gold, 0.9);
    g.strokeRect(r.x - pad, r.y - pad, r.w + pad * 2, r.h + pad * 2);
    g.setAlpha(1);
  }

  setIncoming(on: boolean): void {
    this.incoming = on;
    this.drawIncomingGlow();
    this.scene.tweens.killTweensOf(this.incomingGlow);
    if (on) {
      this.incomingGlow.setAlpha(0.55);
      this.scene.tweens.add({
        targets: this.incomingGlow,
        alpha: 1,
        duration: 550,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else {
      this.incomingGlow.setAlpha(0);
    }
  }

  /** Keep HP visible + gold outline on damaged walls during build */
  setBuildRepairHint(on: boolean): void {
    this.buildHint = on;
    this.redraw(this.stone);
    if (on && !this.breached && this.hp < this.maxHp) {
      this.hpText.setAlpha(1);
      this.hpHideEvent?.remove(false);
      this.hpHideEvent = undefined;
    } else if (!this.breached && !on) {
      this.hpText.setAlpha(0);
    }
  }

  /** Show HP briefly after damage (or repair) */
  showHpBrief(ms = 900): void {
    if (this.breached) {
      this.hpText.setAlpha(1);
      return;
    }
    this.hpText.setAlpha(1);
    this.hpHideEvent?.remove(false);
    // Stay visible while build hint is on
    if (this.buildHint && this.hp < this.maxHp) return;
    this.hpHideEvent = this.scene.time.delayedCall(ms, () => {
      if (!this.breached && !(this.buildHint && this.hp < this.maxHp)) {
        this.hpText.setAlpha(0);
      }
    });
  }

  takeDamage(amount: number, now: number): boolean {
    if (this.breached) return false;
    this.hp -= amount;
    this.lastHitAt = now;
    if (this.hp <= 0) {
      this.hp = 0;
      this.breached = true;
      this.redraw(this.stone);
      this.hpText.setAlpha(1);
      return true;
    }
    this.redraw(this.stone);
    this.showHpBrief();
    return false;
  }

  canRepair(now: number): boolean {
    return !this.breached && now - this.lastHitAt >= TUNING.repair.lockMs && this.hp < this.maxHp;
  }

  repairChunk(age: AgeId): { wood: number; gold: number; healed: number } | null {
    const chunk = Math.min(TUNING.repair.chunkHp, this.maxHp - this.hp);
    if (chunk <= 0) return null;
    const cost =
      age === 'castle' || age === 'imperial'
        ? TUNING.repair.castleImperial
        : TUNING.repair.darkFeudal;
    this.hp = Math.min(this.maxHp, this.hp + chunk);
    this.redraw(this.stone);
    this.showHpBrief(1200);
    return { wood: cost.wood, gold: cost.gold, healed: chunk };
  }

  destroy(): void {
    this.hpHideEvent?.remove(false);
    this.scene.tweens.killTweensOf(this.incomingGlow);
    this.incomingGlow.destroy();
    this.gfx.destroy();
    this.hpText.destroy();
    this.hitZone.destroy();
  }
}
