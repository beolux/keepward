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
  private scene: Phaser.Scene;
  private hpHideEvent?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, def: WallSegmentDef, hp: number) {
    this.scene = scene;
    this.dir = def.dir;
    this.def = def;
    this.hp = hp;
    this.maxHp = hp;

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
    this.hpText.setText(`${Math.ceil(this.hp)}`);
    this.hpText.setColor(pct < 0.35 ? '#E08080' : '#F0EBE0');
  }

  /** Show HP briefly after damage (or repair) */
  showHpBrief(ms = 900): void {
    if (this.breached) {
      this.hpText.setAlpha(1);
      return;
    }
    this.hpText.setAlpha(1);
    this.hpHideEvent?.remove(false);
    this.hpHideEvent = this.scene.time.delayedCall(ms, () => {
      if (!this.breached) this.hpText.setAlpha(0);
    });
  }

  takeDamage(amount: number, now: number): boolean {
    if (this.breached) return false;
    this.hp -= amount;
    this.lastHitAt = now;
    if (this.hp <= 0) {
      this.hp = 0;
      this.breached = true;
      this.redraw();
      this.hpText.setAlpha(1);
      return true;
    }
    this.redraw();
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
    this.redraw();
    this.showHpBrief(1200);
    return { wood: cost.wood, gold: cost.gold, healed: chunk };
  }

  destroy(): void {
    this.hpHideEvent?.remove(false);
    this.gfx.destroy();
    this.hpText.destroy();
    this.hitZone.destroy();
  }
}
