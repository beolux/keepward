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
  /** True while rebuild channel is running */
  rebuilding = false;
  /** 0–1 channel progress while rebuilding (night3) */
  rebuildProgress = 0;
  gfx: Phaser.GameObjects.Graphics;
  hpText: Phaser.GameObjects.Text;
  hitZone: Phaser.GameObjects.Zone;
  /** Soft glow under wall when incoming on this side */
  incomingGlow: Phaser.GameObjects.Graphics;
  private pipGfx: Phaser.GameObjects.Graphics;
  private hpBarGfx: Phaser.GameObjects.Graphics;
  private pipMode: 'none' | 'gold' | 'silver' = 'none';
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
    this.pipGfx = scene.add.graphics().setDepth(18);
    this.hpBarGfx = scene.add.graphics().setDepth(19).setAlpha(0);
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
    // Pad ~12px, min 56pt hit targets for thumb repair/rebuild
    const pad = 12;
    const hw = Math.max(r.w + pad * 2, 56);
    const hh = Math.max(r.h + pad * 2, 56);
    this.hitZone = scene.add
      .zone(r.x + r.w / 2, r.y + r.h / 2, hw, hh)
      .setInteractive({ useHandCursor: true })
      .setDepth(17);

    if (def.kind === 'gap') {
      this.breached = true;
      this.hp = 0;
      this.gfx.setVisible(false);
      this.incomingGlow.setVisible(false);
      this.hpText.setVisible(false);
      this.hitZone.disableInteractive();
      this.hitZone.setActive(false).setVisible(false);
      return;
    }
    this.redraw();
  }

  /** Axis-aligned padded bounds of the wall hit target (world space) */
  hitBounds(): { x: number; y: number; w: number; h: number } {
    const r = this.def.rect;
    const pad = 12;
    const w = Math.max(r.w + pad * 2, 56);
    const h = Math.max(r.h + pad * 2, 56);
    return { x: r.x + r.w / 2 - w / 2, y: r.y + r.h / 2 - h / 2, w, h };
  }

  containsPoint(x: number, y: number): boolean {
    const b = this.hitBounds();
    return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  }

  redraw(stone = false): void {
    this.stone = stone;
    const g = this.gfx;
    g.clear();
    const r = this.def.rect;
    if (this.rebuilding) {
      // Rising wall under rubble → hammer channel
      const rise = Math.max(0.15, this.rebuildProgress);
      g.fillStyle(Palette.breach, 0.45);
      g.fillRect(r.x, r.y, r.w, r.h);
      g.fillStyle(Palette.wood, 0.85);
      g.fillRect(r.x, r.y + r.h * (1 - rise), r.w, r.h * rise);
      g.lineStyle(3, Palette.gold, 0.95);
      g.strokeRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2);
      this.drawRubble(g, r, 0.45 * (1 - rise));
      this.hpText.setText('BUILD…');
      this.hpText.setColor('#D4A84B');
      this.hpText.setAlpha(1);
      this.hpBarGfx.clear();
      this.drawIncomingGlow();
      return;
    }
    if (this.breached) {
      g.fillStyle(Palette.breach, 0.55);
      g.fillRect(r.x, r.y, r.w, r.h);
      this.drawRubble(g, r, 1);
      g.lineStyle(1, Palette.dirtDark, 0.6);
      g.strokeRect(r.x, r.y, r.w, r.h);
      if (this.buildHint) {
        g.lineStyle(3, Palette.gold, 0.95);
        g.strokeRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2);
      }
      this.hpText.setText('BREACH');
      this.hpText.setColor('#E08080');
      this.hpText.setAlpha(1);
      this.hpBarGfx.clear();
      this.drawIncomingGlow();
      return;
    }
    const pct = this.hp / this.maxHp;
    // Short soft shadow under wall
    g.fillStyle(0x000000, 0.22);
    g.fillRect(r.x + 2, r.y + r.h - 1, r.w, 4);

    if (stone) {
      this.paintStoneWall(g, r, pct);
    } else if (this.def.kind === 'gate') {
      this.paintGate(g, r, pct);
    } else {
      this.paintPalisade(g, r, pct);
    }

    if (pct < 0.7) {
      g.lineStyle(1, Palette.breach, 0.7);
      g.lineBetween(r.x + 2, r.y + 2, r.x + r.w - 2, r.y + r.h - 2);
    }
    if (this.buildHint && pct < 0.999) {
      g.lineStyle(3, Palette.gold, 0.95);
      g.strokeRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2);
    }
    this.hpText.setText(`${Math.ceil(this.hp)}`);
    this.hpText.setColor(pct < 0.35 ? '#E08080' : '#F0EBE0');
    this.drawHpBar();
    this.drawIncomingGlow();
  }


  /** CoC rubble piles on breached / mid-rebuild segments */
  private drawRubble(
    g: Phaser.GameObjects.Graphics,
    r: { x: number; y: number; w: number; h: number },
    amt: number,
  ): void {
    if (amt <= 0.02) return;
    const n = Math.max(3, Math.floor(5 * amt));
    for (let i = 0; i < n; i++) {
      const seed = (i * 17 + Math.floor(r.x) + Math.floor(r.y) * 3) % 97;
      const px = r.x + 2 + ((seed * 13) % Math.max(4, r.w - 8));
      const py = r.y + 2 + ((seed * 7) % Math.max(3, r.h - 6));
      const pw = 4 + (seed % 5);
      const ph = 3 + (seed % 4);
      g.fillStyle(seed % 2 === 0 ? Palette.dirtDark : Palette.ochreDark, 0.75 * amt);
      g.fillRect(px, py, pw, ph);
      g.fillStyle(Palette.breach, 0.5 * amt);
      g.fillRect(px + 1, py + 1, Math.max(1, pw - 2), Math.max(1, ph - 2));
    }
  }

  /** Dark/Feudal: vertical palisade logs — clearly wood */
  private paintPalisade(
    g: Phaser.GameObjects.Graphics,
    r: { x: number; y: number; w: number; h: number },
    pct: number,
  ): void {
    const horizontal = r.w >= r.h;
    const bark = pct > 0.5 ? Palette.wood : Palette.dirtDark;
    const bark2 = pct > 0.5 ? Palette.ochreDark : Palette.breach;
    g.fillStyle(bark2, 1);
    g.fillRect(r.x, r.y, r.w, r.h);
    // Vertical log grain regardless of segment orientation (palisade look)
    const logW = 5;
    for (let x = r.x; x < r.x + r.w; x += logW) {
      const w = Math.min(logW - 1, r.x + r.w - x);
      g.fillStyle(Math.floor((x - r.x) / logW) % 2 === 0 ? bark : bark2, 1);
      g.fillRect(x, r.y, w, r.h);
      g.fillStyle(Palette.chalk, 0.18);
      g.fillRect(x, r.y, Math.max(1, w * 0.35), r.h);
      if (horizontal) {
        g.fillStyle(bark, 1);
        g.fillTriangle(x, r.y, x + w / 2, r.y - 3, x + w, r.y);
      }
    }
    g.lineStyle(1, Palette.ochreDark, 0.85);
    g.strokeRect(r.x, r.y, r.w, r.h);
  }

  /** Dark palisade with a barred door — still a wall until breached */
  private paintGate(
    g: Phaser.GameObjects.Graphics,
    r: { x: number; y: number; w: number; h: number },
    pct: number,
  ): void {
    this.paintPalisade(g, r, pct);
    const horizontal = r.w >= r.h;
    const door = horizontal
      ? { x: r.x + r.w * 0.32, y: r.y - 1, w: r.w * 0.36, h: r.h + 2 }
      : { x: r.x - 1, y: r.y + r.h * 0.32, w: r.w + 2, h: r.h * 0.36 };
    g.fillStyle(Palette.dirtDark, 0.92);
    g.fillRect(door.x, door.y, door.w, door.h);
    g.fillStyle(Palette.ochreDark, 0.85);
    if (horizontal) {
      g.fillRect(door.x + 2, door.y + r.h * 0.25, door.w - 4, 2);
      g.fillRect(door.x + door.w / 2 - 1, door.y, 2, door.h);
    } else {
      g.fillRect(door.x + r.w * 0.25, door.y + 2, 2, door.h - 4);
      g.fillRect(door.x, door.y + door.h / 2 - 1, door.w, 2);
    }
    g.lineStyle(1, Palette.gold, 0.55);
    g.strokeRect(door.x, door.y, door.w, door.h);
  }

  /** Castle/Imperial: slate blocks + mortar */
  private paintStoneWall(
    g: Phaser.GameObjects.Graphics,
    r: { x: number; y: number; w: number; h: number },
    pct: number,
  ): void {
    g.fillStyle(Palette.mortar, 1);
    g.fillRect(r.x, r.y, r.w, r.h);
    const bw = 10;
    const bh = 8;
    let row = 0;
    for (let y = r.y; y < r.y + r.h; y += bh + 1, row++) {
      const ox = (row % 2) * Math.floor(bw / 2);
      for (let x = r.x - ox; x < r.x + r.w; x += bw + 1) {
        const px = Math.max(x, r.x);
        const py = y;
        const pw = Math.min(bw, r.x + r.w - px);
        const ph = Math.min(bh, r.y + r.h - py);
        if (pw <= 1 || ph <= 1) continue;
        const base = pct > 0.5 ? Palette.slate : Palette.stone;
        g.fillStyle(base, 1);
        g.fillRect(px, py, pw, ph);
        g.fillStyle(Palette.chalk, 0.14);
        g.fillRect(px, py, Math.max(1, pw * 0.3), Math.max(1, ph * 0.35));
      }
    }
    g.lineStyle(1, Palette.stoneLight, 0.9);
    g.strokeRect(r.x, r.y, r.w, r.h);
  }

  /** CoC-style HP bar — shown via showHpBrief on hit */
  private drawHpBar(): void {
    const g = this.hpBarGfx;
    g.clear();
    if (this.breached || this.rebuilding) return;
    const r = this.def.rect;
    const pct = Math.max(0, this.hp / this.maxHp);
    const w = Math.max(32, Math.min(r.w, 52));
    const x = r.x + r.w / 2 - w / 2;
    const y = r.y - 8;
    const color = pct > 0.55 ? 0x5aaa4a : pct > 0.28 ? Palette.gold : Palette.blood;
    g.fillStyle(0x000000, 0.7);
    g.fillRect(x, y, w, 5);
    g.fillStyle(color, 1);
    g.fillRect(x, y, w * pct, 5);
    g.lineStyle(1, Palette.chalk, 0.35);
    g.strokeRect(x, y, w, 5);
  }

  private drawIncomingGlow(): void {
    const g = this.incomingGlow;
    g.clear();
    if (!this.incoming || this.breached || this.rebuilding) {
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
    if (on && !this.breached && !this.rebuilding) {
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

  /** Keep HP visible + gold outline on damaged / breached walls during build */
  setBuildRepairHint(on: boolean): void {
    this.buildHint = on;
    this.redraw(this.stone);
    if (on && (this.breached || (!this.breached && this.hp < this.maxHp))) {
      this.hpText.setAlpha(1);
      if (!this.breached) this.hpBarGfx.setAlpha(1);
      this.hpHideEvent?.remove(false);
      this.hpHideEvent = undefined;
    } else if (!this.breached && !on && !this.rebuilding) {
      this.hpText.setAlpha(0);
      this.hpBarGfx.setAlpha(0);
    }
  }

  /** Show HP briefly after damage (or repair) */
  showHpBrief(ms = 900): void {
    if (this.breached || this.rebuilding) {
      this.hpText.setAlpha(1);
      this.hpBarGfx.setAlpha(0);
      return;
    }
    this.drawHpBar();
    this.hpText.setAlpha(1);
    this.hpBarGfx.setAlpha(1);
    this.hpHideEvent?.remove(false);
    // Stay visible while build hint is on
    if (this.buildHint && this.hp < this.maxHp) return;
    this.hpHideEvent = this.scene.time.delayedCall(ms, () => {
      if (!this.breached && !this.rebuilding && !(this.buildHint && this.hp < this.maxHp)) {
        this.hpText.setAlpha(0);
        this.hpBarGfx.setAlpha(0);
      }
    });
  }

  takeDamage(amount: number, now: number): boolean {
    if (this.breached || this.rebuilding) return false;
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
    return (
      !this.breached &&
      !this.rebuilding &&
      now - this.lastHitAt >= TUNING.repair.lockMs &&
      this.hp < this.maxHp
    );
  }

  /** @param repairDiscount 0–1 fraction off (Mason Guild = 0.3) */
  repairChunk(
    age: AgeId,
    repairDiscount = 0,
  ): { wood: number; gold: number; healed: number } | null {
    if (this.breached || this.rebuilding) return null;
    const chunk = Math.min(TUNING.repair.chunkHp, this.maxHp - this.hp);
    if (chunk <= 0) return null;
    const cost =
      age === 'castle' || age === 'imperial'
        ? TUNING.repair.castleImperial
        : TUNING.repair.darkFeudal;
    const mult = Math.max(0, 1 - repairDiscount);
    const wood = Math.max(1, Math.floor(cost.wood * mult));
    const gold = Math.max(1, Math.floor(cost.gold * mult));
    this.hp = Math.min(this.maxHp, this.hp + chunk);
    this.redraw(this.stone);
    this.showHpBrief(1200);
    return { wood, gold, healed: chunk };
  }

  /** Gold pip = wall upgrade affordable; silver = both wall upgs done */
  setUpgradePip(mode: 'none' | 'gold' | 'silver'): void {
    if (this.def.kind === 'gap') return;
    if (this.pipMode === mode) return;
    this.pipMode = mode;
    const g = this.pipGfx;
    g.clear();
    if (mode === 'none') return;
    const x = this.def.breachPoint.x;
    const y = this.def.breachPoint.y - 14;
    if (mode === 'gold') {
      g.fillStyle(Palette.gold, 0.9);
      g.fillCircle(x, y, 3.5);
      g.fillStyle(Palette.ochre, 0.65);
      g.fillCircle(x - 1, y - 1, 1.5);
    } else {
      g.fillStyle(Palette.stoneLight, 0.85);
      g.fillCircle(x, y, 3.5);
      g.lineStyle(1.2, Palette.slate, 1);
      g.beginPath();
      g.moveTo(x - 2, y);
      g.lineTo(x - 0.3, y + 1.6);
      g.lineTo(x + 2.4, y - 2);
      g.strokePath();
    }
  }

  /** Begin rebuild channel (caller pays cost). Completes via finishRebuild. */
  beginRebuild(): void {
    if (!this.breached || this.rebuilding) return;
    this.rebuilding = true;
    this.rebuildProgress = 0;
    this.redraw(this.stone);
  }

  setRebuildProgress(t: number): void {
    this.rebuildProgress = Math.max(0, Math.min(1, t));
    if (this.rebuilding) this.redraw(this.stone);
  }

  /** Restore full HP at current age baseline after rebuild channel */
  finishRebuild(maxHp: number, stone: boolean): void {
    this.rebuilding = false;
    this.rebuildProgress = 0;
    this.breached = false;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.lastHitAt = 0;
    this.redraw(stone);
    this.showHpBrief(1400);
  }

  destroy(): void {
    this.hpHideEvent?.remove(false);
    this.scene.tweens.killTweensOf(this.incomingGlow);
    this.incomingGlow.destroy();
    this.pipGfx.destroy();
    this.hpBarGfx.destroy();
    this.gfx.destroy();
    this.hpText.destroy();
    this.hitZone.destroy();
  }
}
