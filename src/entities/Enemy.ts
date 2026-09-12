import Phaser from 'phaser';
import { ENEMIES, type EnemyId } from '../data/enemies';
import { Palette } from '../data/palette';

let nextEnemyId = 1;

export class EnemyUnit extends Phaser.GameObjects.Container {
  uid = 0;
  alive = false;
  hp = 0;
  maxHp = 0;
  speed = 0;
  armor = 0;
  enemyId: EnemyId = 'militia';
  pathIndex = 0;
  progress = 0; // 0..1 along current segment
  rewardWood = 0;
  rewardGold = 0;
  radius = 10;
  private bodyGfx: Phaser.GameObjects.Graphics;
  private hpBarBg: Phaser.GameObjects.Rectangle;
  private hpBar: Phaser.GameObjects.Rectangle;
  private waypoints: { x: number; y: number }[] = [];

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    this.bodyGfx = scene.add.graphics();
    this.hpBarBg = scene.add.rectangle(0, -18, 22, 4, 0x000000, 0.5);
    this.hpBar = scene.add.rectangle(-11, -18, 22, 4, Palette.blood).setOrigin(0, 0.5);
    this.add([this.bodyGfx, this.hpBarBg, this.hpBar]);
    this.setVisible(false);
    this.setActive(false);
    scene.add.existing(this);
  }

  spawn(id: EnemyId, waypoints: { x: number; y: number }[]): void {
    const def = ENEMIES[id];
    this.uid = nextEnemyId++;
    this.enemyId = id;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.speed = def.speed;
    this.armor = def.armor;
    this.rewardWood = def.rewardWood;
    this.rewardGold = def.rewardGold;
    this.radius = def.radius;
    this.waypoints = waypoints;
    this.pathIndex = 0;
    this.progress = 0;
    this.alive = true;
    const start = waypoints[0];
    this.setPosition(start.x, start.y);
    this.drawBody(def.color, def.accent, def.radius);
    this.hpBar.setVisible(true);
    this.hpBarBg.setVisible(true);
    this.updateHpBar();
    this.setVisible(true);
    this.setActive(true);
    this.setDepth(30);
  }

  private drawBody(color: number, accent: number, r: number): void {
    const g = this.bodyGfx;
    g.clear();
    // capsule body
    g.fillStyle(color, 1);
    g.fillRoundedRect(-r * 0.7, -r, r * 1.4, r * 2, r * 0.7);
    // head accent
    g.fillStyle(accent, 1);
    g.fillCircle(0, -r * 0.55, r * 0.45);
    // shield / weapon hint for knight
    if (this.enemyId === 'knight') {
      g.fillStyle(Palette.slate, 1);
      g.fillTriangle(r * 0.5, -r * 0.2, r * 1.1, 0, r * 0.5, r * 0.4);
    }
  }

  /** Move along path. Returns true if leaked (reached end). */
  updateMove(dt: number): boolean {
    if (!this.alive) return false;
    let remaining = this.speed * dt;
    while (remaining > 0 && this.pathIndex < this.waypoints.length - 1) {
      const a = this.waypoints[this.pathIndex];
      const b = this.waypoints[this.pathIndex + 1];
      const segLen = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const distLeft = (1 - this.progress) * segLen;
      if (remaining >= distLeft) {
        remaining -= distLeft;
        this.pathIndex++;
        this.progress = 0;
        this.setPosition(b.x, b.y);
      } else {
        this.progress += remaining / segLen;
        remaining = 0;
        this.x = a.x + (b.x - a.x) * this.progress;
        this.y = a.y + (b.y - a.y) * this.progress;
      }
    }
    if (this.pathIndex >= this.waypoints.length - 1) {
      this.kill(false);
      return true;
    }
    return false;
  }

  takeDamage(raw: number): boolean {
    if (!this.alive) return false;
    const dmg = Math.max(1, raw - this.armor);
    this.hp -= dmg;
    this.updateHpBar();
    // flash
    this.setAlpha(0.5);
    this.scene.time.delayedCall(60, () => {
      if (this.alive) this.setAlpha(1);
    });
    if (this.hp <= 0) {
      this.kill(true);
      return true;
    }
    return false;
  }

  private updateHpBar(): void {
    const pct = Math.max(0, this.hp / this.maxHp);
    this.hpBar.width = 22 * pct;
    this.hpBar.setVisible(pct < 1);
    this.hpBarBg.setVisible(pct < 1);
  }

  kill(_rewarded: boolean): void {
    this.alive = false;
    this.setVisible(false);
    this.setActive(false);
    this.setAlpha(1);
  }
}
