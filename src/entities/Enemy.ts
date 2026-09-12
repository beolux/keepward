import Phaser from 'phaser';
import { ENEMIES, eliteStats, type EnemyId } from '../data/enemies';
import { Palette } from '../data/palette';
import type { WallDir } from '../data/fort';
import { TUNING } from '../data/tuning';

let nextEnemyId = 1;

export type EnemyState = 'approach' | 'attack_wall' | 'enter' | 'hunt_keep' | 'attack_keep';

export class EnemyUnit extends Phaser.GameObjects.Container {
  uid = 0;
  alive = false;
  dying = false;
  hp = 0;
  maxHp = 0;
  speed = 0;
  armor = 0;
  wallDps = 0;
  enemyId: EnemyId = 'militia';
  rewardWood = 0;
  rewardGold = 0;
  radius = 10;
  elite = false;
  state: EnemyState = 'approach';
  targetWall: WallDir | null = null;
  private attackPoint = { x: 0, y: 0 };
  private breachPoint = { x: 0, y: 0 };
  private keepPos = { x: 0, y: 0 };
  private wallAttackAcc = 0;
  private keepAttackAcc = 0;
  private bodyGfx: Phaser.GameObjects.Graphics;
  private hpBarBg: Phaser.GameObjects.Rectangle;
  private hpBar: Phaser.GameObjects.Rectangle;

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

  spawn(
    id: EnemyId,
    spawn: { x: number; y: number },
    wallDir: WallDir,
    attackPoint: { x: number; y: number },
    breachPoint: { x: number; y: number },
    keepPos: { x: number; y: number },
    elite = false,
  ): void {
    const def = ENEMIES[id];
    this.uid = nextEnemyId++;
    this.enemyId = id;
    this.elite = elite;
    const stats = elite ? eliteStats(def) : def;
    this.hp = 'hp' in stats && elite ? stats.hp : def.hp;
    this.maxHp = this.hp;
    if (elite) {
      this.hp = stats.hp;
      this.maxHp = stats.hp;
      this.wallDps = stats.wallDps;
      this.rewardWood = stats.rewardWood;
      this.rewardGold = stats.rewardGold;
    } else {
      this.wallDps = def.wallDps;
      this.rewardWood = def.rewardWood;
      this.rewardGold = def.rewardGold;
    }
    this.speed = def.speed;
    this.armor = def.armor;
    this.radius = def.radius;
    this.targetWall = wallDir;
    this.attackPoint = { ...attackPoint };
    this.breachPoint = { ...breachPoint };
    this.keepPos = { ...keepPos };
    this.state = 'approach';
    this.wallAttackAcc = 0;
    this.keepAttackAcc = 0;
    this.alive = true;
    this.dying = false;
    this.setScale(1);
    this.setPosition(spawn.x, spawn.y);
    this.drawBody(def.color, def.accent, def.radius);
    this.updateHpBar();
    this.setVisible(true);
    this.setActive(true);
    this.setAlpha(1);
    this.setDepth(30);
  }

  setBreach(breachPoint: { x: number; y: number }, wallDir: WallDir): void {
    this.breachPoint = { ...breachPoint };
    this.targetWall = wallDir;
  }

  private drawBody(color: number, accent: number, r: number): void {
    const g = this.bodyGfx;
    g.clear();
    const c = this.elite ? Palette.imperial : color;
    g.fillStyle(c, 1);
    if (this.enemyId === 'ram') {
      g.fillRoundedRect(-r, -r * 0.6, r * 2, r * 1.2, 4);
      g.fillStyle(accent, 1);
      g.fillTriangle(r * 0.2, 0, r * 1.4, -r * 0.3, r * 1.4, r * 0.3);
    } else if (this.enemyId === 'elephant') {
      g.fillEllipse(0, 0, r * 2.2, r * 1.6);
      g.fillStyle(accent, 1);
      g.fillCircle(-r * 0.6, -r * 0.3, r * 0.45);
      g.fillRect(r * 0.3, -r * 0.1, r * 0.9, r * 0.35);
    } else if (this.enemyId === 'archer') {
      g.fillRoundedRect(-r * 0.6, -r, r * 1.2, r * 2, r * 0.6);
      g.fillStyle(accent, 1);
      g.fillCircle(0, -r * 0.5, r * 0.4);
      g.lineStyle(2, Palette.ochreDark, 1);
      g.lineBetween(r * 0.5, -r * 0.2, r * 1.1, r * 0.5);
    } else if (this.enemyId === 'spearman') {
      g.fillRoundedRect(-r * 0.65, -r, r * 1.3, r * 2, r * 0.65);
      g.fillStyle(accent, 1);
      g.fillCircle(0, -r * 0.55, r * 0.4);
      g.lineStyle(2, Palette.stoneLight, 1);
      g.lineBetween(0, r * 0.2, 0, -r * 1.6);
    } else {
      g.fillRoundedRect(-r * 0.7, -r, r * 1.4, r * 2, r * 0.7);
      g.fillStyle(accent, 1);
      g.fillCircle(0, -r * 0.55, r * 0.45);
      if (this.enemyId === 'knight') {
        g.fillStyle(Palette.slate, 1);
        g.fillTriangle(r * 0.5, -r * 0.2, r * 1.1, 0, r * 0.5, r * 0.4);
      }
    }
  }

  tick(
    dt: number,
    wallBreached: (dir: WallDir) => boolean,
    closestBreach: () => { dir: WallDir; point: { x: number; y: number } } | null,
  ): { wallDamage?: { dir: WallDir; dps: number; splashAdj: boolean }; keepDamage?: number } {
    if (!this.alive || this.dying) return {};
    const result: {
      wallDamage?: { dir: WallDir; dps: number; splashAdj: boolean };
      keepDamage?: number;
    } = {};

    if (
      (this.state === 'approach' || this.state === 'attack_wall') &&
      this.targetWall &&
      wallBreached(this.targetWall)
    ) {
      this.state = 'enter';
    }

    if (this.state === 'approach') {
      if (this.moveToward(this.attackPoint.x, this.attackPoint.y, dt, 8)) {
        this.state = 'attack_wall';
      }
    } else if (this.state === 'attack_wall') {
      if (this.targetWall && wallBreached(this.targetWall)) {
        this.state = 'enter';
      } else if (this.targetWall) {
        this.wallAttackAcc += dt;
        if (this.wallAttackAcc >= 0.25) {
          const ticks = this.wallAttackAcc;
          this.wallAttackAcc = 0;
          result.wallDamage = {
            dir: this.targetWall,
            dps: this.wallDps * ticks,
            splashAdj: this.enemyId === 'elephant',
          };
        }
      }
    } else if (this.state === 'enter') {
      const br = closestBreach();
      if (br) {
        this.breachPoint = { ...br.point };
        this.targetWall = br.dir;
      }
      if (this.moveToward(this.breachPoint.x, this.breachPoint.y, dt, 10)) {
        this.state = 'hunt_keep';
      }
    } else if (this.state === 'hunt_keep') {
      if (this.moveToward(this.keepPos.x, this.keepPos.y, dt, 22)) {
        this.state = 'attack_keep';
      }
    } else if (this.state === 'attack_keep') {
      this.keepAttackAcc += dt;
      if (this.keepAttackAcc >= 0.5) {
        const ticks = this.keepAttackAcc;
        this.keepAttackAcc = 0;
        result.keepDamage = this.wallDps * 1.5 * ticks;
      }
    }

    return result;
  }

  private moveToward(tx: number, ty: number, dt: number, arrive: number): boolean {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= arrive) {
      this.setPosition(tx, ty);
      return true;
    }
    const step = this.speed * dt;
    if (step >= dist) {
      this.setPosition(tx, ty);
      return true;
    }
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
    return false;
  }

  /** Returns true if this hit killed the unit (leaves visible for death squash). */
  takeDamage(raw: number): boolean {
    if (!this.alive || this.dying) return false;
    const dmg = Math.max(1, raw - this.armor);
    this.hp -= dmg;
    this.updateHpBar();
    if (this.hp <= 0) {
      this.alive = false;
      this.dying = true;
      this.hpBar.setVisible(false);
      this.hpBarBg.setVisible(false);
      return true;
    }
    return false;
  }

  private updateHpBar(): void {
    const pct = Math.max(0, this.hp / this.maxHp);
    this.hpBar.width = 22 * pct;
    this.hpBar.setVisible(pct < 1 && this.alive);
    this.hpBarBg.setVisible(pct < 1 && this.alive);
  }

  kill(_rewarded: boolean): void {
    this.alive = false;
    this.dying = false;
    this.setVisible(false);
    this.setActive(false);
    this.setAlpha(1);
    this.setScale(1);
  }
}

void TUNING;
