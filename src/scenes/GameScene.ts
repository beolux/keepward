import Phaser from 'phaser';
import { GAME_W, GAME_H, PATH, PADS, KEEP_POS, type PadDef } from '../data/map';
import { Palette } from '../data/palette';
import { TOWERS, type TowerId } from '../data/towers';
import { WAVES, STARTING } from '../data/waves';
import { AGES, AGE_ORDER, type AgeId } from '../data/ages';
import { TowerUnit } from '../entities/Tower';
import { EnemyUnit } from '../entities/Enemy';
import { Projectile } from '../entities/Projectile';
import { Pool } from '../utils/pool';

export type GameHudState = {
  wood: number;
  gold: number;
  lives: number;
  wave: number;
  maxWaves: number;
  age: AgeId;
  ageName: string;
  canAgeUp: boolean;
  ageCostWood: number;
  ageCostGold: number;
  selectedTower: TowerId | null;
  paused: boolean;
  status: 'playing' | 'won' | 'lost';
  unlocked: string[];
};

export class GameScene extends Phaser.Scene {
  wood = STARTING.wood;
  gold = STARTING.gold;
  lives = STARTING.lives;
  waveIndex = 0;
  age: AgeId = 'dark';
  selectedTower: TowerId | null = 'watchtower';
  paused = false;
  status: 'playing' | 'won' | 'lost' = 'playing';

  private pads = new Map<number, { def: PadDef; occupied: boolean; gfx: Phaser.GameObjects.Graphics }>();
  private towers: TowerUnit[] = [];
  private enemies: EnemyUnit[] = [];
  private enemyPool!: Pool<EnemyUnit>;
  private projPool!: Pool<Projectile>;
  private activeProjs: Projectile[] = [];

  private spawning = false;
  private spawnQueue: { enemy: string; at: number }[] = [];
  private waveAlive = 0;
  private betweenWaves = true;
  private waveDelay = 0;

  constructor() {
    super('Game');
  }

  create(): void {
    this.wood = STARTING.wood;
    this.gold = STARTING.gold;
    this.lives = STARTING.lives;
    this.waveIndex = 0;
    this.age = 'dark';
    this.selectedTower = 'watchtower';
    this.paused = false;
    this.status = 'playing';
    this.towers = [];
    this.enemies = [];
    this.activeProjs = [];
    this.spawning = false;
    this.spawnQueue = [];
    this.waveAlive = 0;
    this.betweenWaves = true;
    this.waveDelay = 1500;

    this.cameras.main.setBackgroundColor(Palette.grassDark);
    this.drawMap();
    this.setupPads();

    // Pre-placed Keep
    const keep = new TowerUnit(this, KEEP_POS.x, KEEP_POS.y, 'keep', -1);
    this.towers.push(keep);

    this.enemyPool = new Pool(
      () => new EnemyUnit(this),
      (e) => e.kill(false),
      24,
    );
    this.projPool = new Pool(
      () => new Projectile(this),
      (p) => p.deactivate(),
      40,
    );

    // UI scene
    if (this.scene.isActive('UI') || this.scene.isSleeping('UI')) {
      this.scene.stop('UI');
    }
    this.scene.launch('UI', { game: this });

    // Pause when document hidden
    this.game.events.on('hidden', this.onHidden, this);
    this.game.events.on('visible', this.onVisible, this);
    this.events.once('shutdown', () => {
      this.game.events.off('hidden', this.onHidden, this);
      this.game.events.off('visible', this.onVisible, this);
    });

    this.emitHud();
  }

  private onHidden = (): void => {
    if (this.status === 'playing') this.setPaused(true);
  };
  private onVisible = (): void => {
    // stay paused — user unpauses manually
  };

  private drawMap(): void {
    const g = this.add.graphics();
    // grass base
    g.fillStyle(Palette.grassDark, 1);
    g.fillRect(0, 0, GAME_W, GAME_H);
    g.fillStyle(Palette.grass, 1);
    g.fillRect(0, 40, GAME_W, GAME_H - 140);

    // grass texture dots
    g.fillStyle(Palette.grassLight, 0.35);
    for (let i = 0; i < 80; i++) {
      g.fillCircle(
        Phaser.Math.Between(10, GAME_W - 10),
        Phaser.Math.Between(50, GAME_H - 120),
        Phaser.Math.Between(3, 10),
      );
    }

    // path
    g.lineStyle(36, Palette.pathEdge, 1);
    g.beginPath();
    g.moveTo(PATH[0].x, PATH[0].y);
    for (let i = 1; i < PATH.length; i++) g.lineTo(PATH[i].x, PATH[i].y);
    g.strokePath();

    g.lineStyle(28, Palette.path, 1);
    g.beginPath();
    g.moveTo(PATH[0].x, PATH[0].y);
    for (let i = 1; i < PATH.length; i++) g.lineTo(PATH[i].x, PATH[i].y);
    g.strokePath();

    // path center dashes
    g.lineStyle(2, Palette.dirt, 0.4);
    g.beginPath();
    g.moveTo(PATH[0].x, PATH[0].y);
    for (let i = 1; i < PATH.length; i++) g.lineTo(PATH[i].x, PATH[i].y);
    g.strokePath();

    // spawn banner
    g.fillStyle(Palette.blood, 0.7);
    g.fillTriangle(195, 8, 175, 28, 215, 28);
    this.add
      .text(195, 42, 'SPAWN', {
        fontSize: '10px',
        color: '#F0EBE0',
        fontFamily: 'system-ui',
      })
      .setOrigin(0.5)
      .setDepth(5);
  }

  private setupPads(): void {
    for (const pad of PADS) {
      const gfx = this.add.graphics().setDepth(10);
      this.drawPad(gfx, pad.x, pad.y, false);
      const hit = this.add
        .circle(pad.x, pad.y, 28, 0xffffff, 0.001)
        .setInteractive({ useHandCursor: true })
        .setDepth(11);
      hit.on('pointerup', () => this.onPadTap(pad.id));
      this.pads.set(pad.id, { def: pad, occupied: false, gfx });
    }
  }

  private drawPad(gfx: Phaser.GameObjects.Graphics, x: number, y: number, occupied: boolean): void {
    gfx.clear();
    gfx.fillStyle(occupied ? Palette.slate : Palette.stone, 1);
    gfx.fillCircle(x, y, 22);
    gfx.lineStyle(2, occupied ? Palette.ochreDark : Palette.stoneLight, 1);
    gfx.strokeCircle(x, y, 22);
    if (!occupied) {
      gfx.lineStyle(1.5, Palette.ochre, 0.6);
      gfx.strokeCircle(x, y, 14);
    }
  }

  onPadTap(padId: number): void {
    if (this.paused || this.status !== 'playing') return;
    const pad = this.pads.get(padId);
    if (!pad || pad.occupied) return;
    if (!this.selectedTower) return;

    const def = TOWERS[this.selectedTower];
    if (!def.buildable) return;
    if (def.unlockAge === 'feudal' && this.age !== 'feudal') return;
    if (this.wood < def.costWood || this.gold < def.costGold) return;

    this.wood -= def.costWood;
    this.gold -= def.costGold;
    pad.occupied = true;
    this.drawPad(pad.gfx, pad.def.x, pad.def.y, true);

    const tower = new TowerUnit(this, pad.def.x, pad.def.y, this.selectedTower, padId);
    const ageDef = AGES[this.age];
    tower.applyAgeBuff(ageDef.damageMult, ageDef.fireRateMult);
    this.towers.push(tower);

    // brief range flash
    tower.showRange(true);
    this.time.delayedCall(600, () => tower.showRange(false));

    this.emitHud();
  }

  selectTower(id: TowerId | null): void {
    this.selectedTower = id;
    this.emitHud();
  }

  tryAgeUp(): void {
    if (this.paused || this.status !== 'playing') return;
    const idx = AGE_ORDER.indexOf(this.age);
    if (idx >= AGE_ORDER.length - 1) return;
    const next = AGE_ORDER[idx + 1];
    const def = AGES[next];
    if (this.wood < def.costWood || this.gold < def.costGold) return;
    this.wood -= def.costWood;
    this.gold -= def.costGold;
    this.age = next;
    for (const t of this.towers) {
      t.applyAgeBuff(def.damageMult, def.fireRateMult);
    }
    // toast via UI
    this.game.events.emit('keepward-toast', `Advanced to ${def.name}!`);
    this.emitHud();
  }

  setPaused(p: boolean): void {
    this.paused = p;
    this.emitHud();
  }

  togglePause(): void {
    if (this.status !== 'playing') return;
    this.setPaused(!this.paused);
  }

  restart(): void {
    this.scene.stop('UI');
    this.scene.start('Game');
  }

  goMenu(): void {
    this.scene.stop('UI');
    this.scene.start('Menu');
  }

  getHudState(): GameHudState {
    const nextIdx = AGE_ORDER.indexOf(this.age) + 1;
    const canAge = nextIdx < AGE_ORDER.length;
    const nextAge = canAge ? AGES[AGE_ORDER[nextIdx]] : null;
    return {
      wood: this.wood,
      gold: this.gold,
      lives: this.lives,
      wave: Math.min(this.waveIndex + 1, WAVES.length),
      maxWaves: WAVES.length,
      age: this.age,
      ageName: AGES[this.age].name,
      canAgeUp: canAge,
      ageCostWood: nextAge?.costWood ?? 0,
      ageCostGold: nextAge?.costGold ?? 0,
      selectedTower: this.selectedTower,
      paused: this.paused,
      status: this.status,
      unlocked: AGES[this.age].unlocks,
    };
  }

  emitHud(): void {
    this.game.events.emit('keepward-hud', this.getHudState());
  }

  update(_time: number, delta: number): void {
    if (this.paused || this.status !== 'playing') return;
    const dt = delta / 1000;
    const dtMs = delta;

    // wave timing
    if (this.betweenWaves) {
      this.waveDelay -= dtMs;
      if (this.waveDelay <= 0) {
        if (this.waveIndex >= WAVES.length) {
          this.status = 'won';
          this.emitHud();
          this.game.events.emit('keepward-toast', 'Victory! The keep stands.');
          return;
        }
        this.startWave(WAVES[this.waveIndex]);
      }
    }

    // spawn queue
    if (this.spawning && this.spawnQueue.length) {
      const now = this.time.now;
      while (this.spawnQueue.length && this.spawnQueue[0].at <= now) {
        const job = this.spawnQueue.shift()!;
        this.spawnEnemy(job.enemy as 'militia' | 'knight');
      }
      if (this.spawnQueue.length === 0) this.spawning = false;
    }

    // enemies
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const leaked = e.updateMove(dt);
      if (leaked) {
        this.lives -= 1;
        this.waveAlive = Math.max(0, this.waveAlive - 1);
        this.emitHud();
        if (this.lives <= 0) {
          this.status = 'lost';
          this.emitHud();
          this.game.events.emit('keepward-toast', 'The keep has fallen…');
          return;
        }
      }
    }

    // towers fire
    for (const tower of this.towers) {
      const target = tower.tryAcquire(this.enemies, dtMs);
      if (target) {
        const p = this.projPool.acquire();
        const tint = tower.towerId === 'mangonel' ? Palette.feudal : Palette.ochre;
        p.fire(
          tower.x,
          tower.y - 10,
          target.x,
          target.y,
          tower.def.projectileSpeed,
          tower.damage,
          tower.splash,
          target.uid,
          tint,
        );
        this.activeProjs.push(p);
      }
    }

    // projectiles
    for (let i = this.activeProjs.length - 1; i >= 0; i--) {
      const p = this.activeProjs[i];
      if (!p.update(dt)) {
        this.activeProjs.splice(i, 1);
        this.projPool.release(p);
        continue;
      }
      // hit test
      let hit = false;
      for (const e of this.enemies) {
        if (!e.alive) continue;
        const d = Phaser.Math.Distance.Between(p.x, p.y, e.x, e.y);
        if (d < e.radius + 6) {
          hit = true;
          if (p.splash > 0) {
            for (const e2 of this.enemies) {
              if (!e2.alive) continue;
              if (Phaser.Math.Distance.Between(p.x, p.y, e2.x, e2.y) <= p.splash) {
                this.damageEnemy(e2, p.damage);
              }
            }
            this.splashFx(p.x, p.y, p.splash);
          } else {
            this.damageEnemy(e, p.damage);
          }
          break;
        }
      }
      if (hit) {
        p.deactivate();
        this.activeProjs.splice(i, 1);
        this.projPool.release(p);
      }
    }

    // wave clear
    if (!this.betweenWaves && !this.spawning && this.waveAlive <= 0) {
      const w = WAVES[this.waveIndex];
      this.gold += w.bonusGold;
      this.waveIndex++;
      this.betweenWaves = true;
      this.waveDelay = 2500;
      this.emitHud();
      if (this.waveIndex < WAVES.length) {
        this.game.events.emit('keepward-toast', `Wave ${this.waveIndex} cleared! +${w.bonusGold}g`);
      }
    }
  }

  private damageEnemy(e: EnemyUnit, dmg: number): void {
    const killed = e.takeDamage(dmg);
    if (killed) {
      this.wood += e.rewardWood;
      this.gold += e.rewardGold;
      this.waveAlive = Math.max(0, this.waveAlive - 1);
      this.emitHud();
    }
  }

  private splashFx(x: number, y: number, r: number): void {
    const c = this.add.circle(x, y, 8, Palette.feudal, 0.5).setDepth(45);
    this.tweens.add({
      targets: c,
      radius: r,
      alpha: 0,
      duration: 280,
      onComplete: () => c.destroy(),
    });
  }

  private startWave(wave: (typeof WAVES)[0]): void {
    this.betweenWaves = false;
    this.spawning = true;
    this.spawnQueue = [];
    const now = this.time.now;
    for (const s of wave.spawns) {
      const base = now + (s.delayMs ?? 0);
      for (let i = 0; i < s.count; i++) {
        this.spawnQueue.push({ enemy: s.enemy, at: base + i * s.intervalMs });
        this.waveAlive++;
      }
    }
    this.spawnQueue.sort((a, b) => a.at - b.at);
    this.emitHud();
    this.game.events.emit('keepward-toast', `Wave ${wave.wave}`);
  }

  private spawnEnemy(id: 'militia' | 'knight'): void {
    const e = this.enemyPool.acquire();
    e.spawn(id, PATH);
    if (!this.enemies.includes(e)) this.enemies.push(e);
  }
}
