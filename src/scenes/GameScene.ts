import Phaser from 'phaser';
import { Palette } from '../data/palette';
import { TOWERS, type TowerId, type UpgradeTrack } from '../data/towers';
import { WAVES } from '../data/waves';
import { AGES, AGE_ORDER, ageIndex, passiveMult, type AgeId } from '../data/ages';
import { TUNING } from '../data/tuning';
import { LAYOUT_ORDER, SPAWN_EDGES, edgeSpawnPoints, type LayoutId } from '../data/fort';
import { TowerUnit, PlacementGhost } from '../entities/Tower';
import { EnemyUnit } from '../entities/Enemy';
import { Projectile } from '../entities/Projectile';
import { Pool } from '../utils/pool';
import { FortSystem } from '../systems/FortSystem';
import { FxSystem } from '../systems/FxSystem';
import { audio } from '../systems/AudioSystem';
import type { EnemyId } from '../data/enemies';
import type { WallDir } from '../data/fort';
import { HUD_TOP, HUD_BOTTOM } from '../data/map';

const UNDO_MS = 6000;
const TEACH_KEY = 'keepward-taught-v1';

export type GameHudState = {
  wood: number;
  gold: number;
  keepHp: number;
  keepMaxHp: number;
  wave: number;
  maxWaves: number;
  age: AgeId;
  ageName: string;
  canAgeUp: boolean;
  ageCostWood: number;
  ageCostGold: number;
  aging: boolean;
  ageChannelPct: number;
  selectedTower: TowerId | null;
  placing: boolean;
  paused: boolean;
  status: 'playing' | 'won' | 'lost';
  unlocked: string[];
  layoutName: string;
  hardened: boolean;
  stoneFaced: boolean;
  selectedPlaced: {
    id: TowerId;
    kills: number;
    ranks: Record<UpgradeTrack, number>;
    can: Record<UpgradeTrack, boolean>;
    costs: Record<UpgradeTrack, { wood: number; gold: number } | null>;
    canUndo: boolean;
    sellWood: number;
    sellGold: number;
  } | null;
  wallUpgradeAvailable: 'hardenedTimbers' | 'stoneFacing' | null;
  muted: boolean;
  teach: string | null;
  /** True while player can place/repair before next wave */
  buildPhase: boolean;
  /** Seconds left in build countdown (ceil) */
  buildCountdownSec: number;
  /** Next wave spawn edge — shown during build */
  nextEdge: 'N' | 'E' | 'S' | 'W' | null;
};

export class GameScene extends Phaser.Scene {
  wood = TUNING.start.wood;
  gold = TUNING.start.gold;
  keepHp: number = TUNING.keep.hp;
  waveIndex = 0;
  age: AgeId = 'dark';
  selectedTower: TowerId | null = 'watchtower';
  paused = false;
  status: 'playing' | 'won' | 'lost' = 'playing';
  layoutId: LayoutId = 'square';

  private fort!: FortSystem;
  private fx!: FxSystem;
  private towers: TowerUnit[] = [];
  private keepTower!: TowerUnit;
  private enemies: EnemyUnit[] = [];
  private enemyPool!: Pool<EnemyUnit>;
  private projPool!: Pool<Projectile>;
  private activeProjs: Projectile[] = [];
  private ghost!: PlacementGhost;
  private placing = false;
  private selectedPlaced: TowerUnit | null = null;
  private lastPlaced: TowerUnit | null = null;

  private spawning = false;
  private spawnQueue: { enemy: EnemyId; at: number; elite?: boolean; edge: 'N' | 'E' | 'S' | 'W' }[] = [];
  private waveAlive = 0;
  private betweenWaves = true;
  private waveDelay = 0;
  private spawnEdgeIndex = 0;

  private aging = false;
  private ageChannel = 0;
  private ageTarget: AgeId | null = null;

  private keepHpBar!: Phaser.GameObjects.Graphics;
  private keepHpLabel!: Phaser.GameObjects.Text;
  private keepHpVisibleUntil = 0;
  private pointerDown = false;
  private dockDragging = false;
  /** Ignore tower taps right after place (same touch / iOS synthetic click) */
  private placeTapIgnoreUntil = 0;
  private teachMsg: string | null = null;
  private taught = false;

  /** Incoming-side tell overlays (chevron + dust) */
  private incomingChevron?: Phaser.GameObjects.Container;
  private incomingDust?: Phaser.GameObjects.Graphics;
  private dustTick = 0;
  private dustMarks = 0;

  constructor() {
    super('Game');
  }

  init(data?: { layout?: LayoutId }): void {
    if (data?.layout) this.layoutId = data.layout;
    else this.layoutId = LAYOUT_ORDER[Math.floor(Math.random() * LAYOUT_ORDER.length)];
  }

  create(): void {
    this.wood = TUNING.start.wood;
    this.gold = TUNING.start.gold;
    this.keepHp = TUNING.keep.hp;
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
    this.waveDelay = this.buildDurationMsForUpcoming();
    this.placing = false;
    this.selectedPlaced = null;
    this.lastPlaced = null;
    this.aging = false;
    this.ageChannel = 0;
    this.ageTarget = null;
    this.spawnEdgeIndex = 0;
    this.pointerDown = false;
    this.dockDragging = false;
    this.keepHpVisibleUntil = 0;

    try {
      this.taught = localStorage.getItem(TEACH_KEY) === '1';
    } catch {
      this.taught = false;
    }
    this.teachMsg = this.taught ? null : 'Drag tower into courtyard';

    this.cameras.main.setBackgroundColor(Palette.grassDark);
    this.fort = new FortSystem(this, this.layoutId);
    this.fx = new FxSystem(this);

    this.keepTower = new TowerUnit(this, this.fort.keepPos.x, this.fort.keepPos.y, 'keep');
    this.towers.push(this.keepTower);

    this.keepHpBar = this.add.graphics().setDepth(26).setAlpha(0);
    this.keepHpLabel = this.add
      .text(this.fort.keepPos.x, this.fort.keepPos.y + 36, '', {
        fontSize: '11px',
        color: '#F0EBE0',
        fontFamily: 'system-ui',
        backgroundColor: '#1A2A22aa',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(27)
      .setAlpha(0);
    this.drawKeepHp();

    this.enemyPool = new Pool(
      () => new EnemyUnit(this),
      (e) => e.kill(false),
      40,
    );
    this.projPool = new Pool(
      () => new Projectile(this),
      (p) => p.deactivate(),
      60,
    );

    this.ghost = new PlacementGhost(this);

    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.input.on('pointerupoutside', this.onPointerUp, this);
    this.input.on('gameout', this.onPointerCancel, this);

    for (const seg of this.fort.segments.values()) {
      seg.hitZone.on('pointerup', () => this.onWallTap(seg.dir));
    }

    if (this.scene.isActive('UI') || this.scene.isSleeping('UI')) {
      this.scene.stop('UI');
    }
    this.scene.launch('UI', { game: this });

    this.game.events.on('hidden', this.onHidden, this);
    this.events.once('shutdown', () => {
      this.game.events.off('hidden', this.onHidden, this);
      this.input.off('pointerdown', this.onPointerDown, this);
      this.input.off('pointermove', this.onPointerMove, this);
      this.input.off('pointerup', this.onPointerUp, this);
      this.input.off('pointerupoutside', this.onPointerUp, this);
      this.input.off('gameout', this.onPointerCancel, this);
      this.hideIncomingTell();
      this.ghost.destroy();
      this.fx.destroy();
      this.fort.destroy();
    });

    this.emitHud();
    this.game.events.emit('keepward-toast', `${this.fort.layout.name} — defend the courtyard`);
    this.beginBuildPhaseVisuals();
  }

  private onHidden = (): void => {
    if (this.status === 'playing') this.setPaused(true);
  };

  skipTeach(): void {
    this.teachMsg = null;
    this.taught = true;
    try {
      localStorage.setItem(TEACH_KEY, '1');
    } catch {
      /* ignore */
    }
    this.emitHud();
  }

  private completeTeach(): void {
    if (!this.teachMsg) return;
    this.teachMsg = null;
    this.taught = true;
    try {
      localStorage.setItem(TEACH_KEY, '1');
    } catch {
      /* ignore */
    }
    // HUD emit deferred to caller (tryPlace) so teach overlay isn't
    // destroyed synchronously inside the placing pointerup.
  }

  private drawKeepHp(): void {
    const g = this.keepHpBar;
    g.clear();
    const x = this.fort.keepPos.x;
    const y = this.fort.keepPos.y - 40;
    const w = 56;
    const pct = Math.max(0, this.keepHp / TUNING.keep.hp);
    g.fillStyle(0x000000, 0.5);
    g.fillRect(x - w / 2, y, w, 6);
    g.fillStyle(pct > 0.35 ? Palette.ochre : Palette.blood, 1);
    g.fillRect(x - w / 2, y, w * pct, 6);
    this.keepHpLabel.setText(`Keep ${Math.ceil(this.keepHp)}`);
  }

  private showKeepHp(ms = 1200): void {
    this.keepHpVisibleUntil = this.time.now + ms;
    this.keepHpBar.setAlpha(1);
    this.keepHpLabel.setAlpha(1);
  }

  private inPlayfield(x: number, y: number): boolean {
    return y > HUD_TOP + 8 && y < this.scale.height - HUD_BOTTOM;
  }

  /** Start drag-place from dock button (Clash Royale style) */
  beginDockPlace(id: TowerId, x: number, y: number): void {
    audio.unlock();
    if (this.paused || this.status !== 'playing') return;
    const def = TOWERS[id];
    if (!def.buildable) return;
    if (def.unlockAge === 'feudal' && ageIndex(this.age) < ageIndex('feudal')) return;
    this.clearPlacedSelection();
    this.selectedTower = id;
    this.placing = true;
    this.dockDragging = true;
    this.pointerDown = true;
    this.ghost.setTower(id);
    this.updateGhost(x, y);
    this.emitHud();
  }

  updateDockPlace(x: number, y: number): void {
    if (!this.placing || !this.dockDragging) return;
    this.updateGhost(x, y);
  }

  endDockPlace(x: number, y: number): void {
    if (!this.placing || !this.dockDragging) return;
    this.dockDragging = false;
    this.pointerDown = false;
    if (this.paused || this.status !== 'playing') {
      this.cancelPlace();
      return;
    }
    // Drag-off cancel: release in dock/top chrome
    if (!this.inPlayfield(x, y)) {
      this.cancelPlace();
      audio.play('deny');
      return;
    }
    const ok = this.tryPlace(x, y);
    this.ghost.hide();
    this.placing = false;
    if (!ok) audio.play('deny');
    this.emitHud();
  }

  private cancelPlace(): void {
    this.ghost.hide();
    this.placing = false;
    this.dockDragging = false;
    this.pointerDown = false;
    this.emitHud();
  }

  /** UIScene calls this on touchcancel / gameout so drag never sticks */
  cancelDockDrag(): void {
    if (!this.placing && !this.dockDragging && !this.pointerDown) return;
    this.cancelPlace();
  }

  private onPointerCancel = (): void => {
    if (this.dockDragging || this.placing || this.pointerDown) this.cancelPlace();
  };

  private onPointerDown = (pointer: Phaser.Input.Pointer): void => {
    audio.unlock();
    if (this.paused || this.status !== 'playing') return;
    if (this.dockDragging) return;
    if (!this.inPlayfield(pointer.x, pointer.y)) return;

    this.pointerDown = true;
    if (this.selectedTower && TOWERS[this.selectedTower].buildable) {
      this.placing = true;
      this.clearPlacedSelection();
      this.ghost.setTower(this.selectedTower);
      this.updateGhost(pointer.x, pointer.y);
    }
  };

  private onPointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (this.dockDragging) return;
    if (!this.placing || !this.pointerDown) return;
    this.updateGhost(pointer.x, pointer.y);
  };

  private onPointerUp = (pointer: Phaser.Input.Pointer): void => {
    if (this.dockDragging) return;
    if (!this.placing) {
      this.pointerDown = false;
      return;
    }
    this.pointerDown = false;
    if (this.paused || this.status !== 'playing') {
      this.cancelPlace();
      return;
    }
    // Lift to commit; drag-off / HUD cancel
    if (!this.inPlayfield(pointer.x, pointer.y)) {
      this.cancelPlace();
      audio.play('deny');
      return;
    }
    const ok = this.tryPlace(pointer.x, pointer.y);
    this.ghost.hide();
    this.placing = false;
    if (!ok) audio.play('deny');
    this.emitHud();
  };

  private updateGhost(x: number, y: number): void {
    const valid = this.inPlayfield(x, y) && this.isValidPlacement(x, y) && this.canAffordSelected();
    this.ghost.show(x, y, valid);
  }

  private canAffordSelected(): boolean {
    if (!this.selectedTower) return false;
    const def = TOWERS[this.selectedTower];
    return this.wood >= def.costWood && this.gold >= def.costGold;
  }

  private isValidPlacement(x: number, y: number): boolean {
    const others = this.towers.filter((t) => t.towerId !== 'keep').map((t) => ({ x: t.x, y: t.y }));
    return this.fort.canPlace(x, y, this.fort.keepPos, others);
  }

  private tryPlace(x: number, y: number): boolean {
    if (!this.selectedTower) return false;
    const def = TOWERS[this.selectedTower];
    if (!def.buildable) return false;
    if (def.unlockAge === 'feudal' && ageIndex(this.age) < ageIndex('feudal')) return false;
    if (this.wood < def.costWood || this.gold < def.costGold) {
      this.game.events.emit('keepward-toast', 'Not enough resources');
      return false;
    }
    if (!this.isValidPlacement(x, y)) {
      this.game.events.emit('keepward-toast', 'Place inside the courtyard');
      return false;
    }
    this.wood -= def.costWood;
    this.gold -= def.costGold;
    const tower = new TowerUnit(this, x, y, this.selectedTower);
    // Do not attach tap handler until after this gesture ends — iOS often
    // delivers the same touchend / a synthetic click onto the new hitZone.
    this.placeTapIgnoreUntil = this.time.now + 400;
    this.time.delayedCall(350, () => {
      if (!tower.active) return;
      tower.setTapHandler(() => this.selectPlacedTower(tower));
    });
    tower.showRange(true);
    this.time.delayedCall(500, () => {
      if (this.selectedPlaced !== tower) tower.showRange(false);
    });
    this.towers.push(tower);
    this.lastPlaced = tower;
    this.fx.placePop(x, y);
    audio.play('place');
    this.completeTeach();
    this.emitHud();
    return true;
  }

  selectPlacedTower(tower: TowerUnit): void {
    if (tower.towerId === 'keep') return;
    if (this.placing || this.dockDragging) return;
    if (this.time.now < this.placeTapIgnoreUntil) return;
    audio.unlock();
    for (const t of this.towers) t.showRange(false);
    this.selectedPlaced = tower;
    tower.showRange(true);
    this.selectedTower = null;
    this.emitHud();
  }

  clearPlacedSelection(): void {
    if (this.selectedPlaced) {
      this.selectedPlaced.showRange(false);
      this.selectedPlaced = null;
    }
    this.emitHud();
  }

  selectBuildTower(id: TowerId | null): void {
    this.clearPlacedSelection();
    this.selectedTower = id;
    this.emitHud();
  }

  tryUpgradeTrack(track: UpgradeTrack): void {
    if (!this.selectedPlaced || this.paused || this.status !== 'playing') return;
    const t = this.selectedPlaced;
    if (!t.canUnlockRank(track)) {
      this.game.events.emit('keepward-toast', `Need ${t.killsNeededForNext(track)} kills`);
      audio.play('deny');
      return;
    }
    const cost = t.upgradeCost(track);
    if (!cost) return;
    if (this.wood < cost.wood || this.gold < cost.gold) {
      this.game.events.emit('keepward-toast', 'Not enough resources');
      audio.play('deny');
      return;
    }
    this.wood -= cost.wood;
    this.gold -= cost.gold;
    t.applyUpgrade(track);
    audio.play('upgrade');
    this.game.events.emit('keepward-toast', `${TRACK_SHORT[track]} upgraded`);
    this.emitHud();
  }

  /** Sell selected tower (50%) or Undo last place (full refund within window) */
  sellOrUndoSelected(): void {
    if (!this.selectedPlaced || this.paused || this.status !== 'playing') return;
    const t = this.selectedPlaced;
    const canUndo =
      this.lastPlaced === t && this.time.now - t.placedAt <= UNDO_MS && t.kills === 0;
    const refund = t.refund(canUndo);
    this.wood += refund.wood;
    this.gold += refund.gold;
    const idx = this.towers.indexOf(t);
    if (idx >= 0) this.towers.splice(idx, 1);
    if (this.lastPlaced === t) this.lastPlaced = null;
    this.selectedPlaced = null;
    t.destroyTower();
    audio.play(canUndo ? 'sell' : 'sell');
    this.game.events.emit(
      'keepward-toast',
      canUndo ? `Undo +${refund.wood}W ${refund.gold}G` : `Sold +${refund.wood}W ${refund.gold}G`,
    );
    this.emitHud();
  }

  tryWallUpgrade(id: 'hardenedTimbers' | 'stoneFacing'): void {
    if (this.paused || this.status !== 'playing') return;
    if (id === 'hardenedTimbers') {
      if (ageIndex(this.age) < ageIndex('feudal')) return;
      if (this.fort.hardened) return;
      const u = TUNING.wallUpgrades.hardenedTimbers;
      if (this.wood < u.costWood || this.gold < u.costGold) return;
      this.wood -= u.costWood;
      this.gold -= u.costGold;
      this.fort.applyHardenedTimbers();
      audio.play('upgrade');
      this.game.events.emit('keepward-toast', 'Hardened Timbers!');
    } else {
      if (ageIndex(this.age) < ageIndex('castle')) return;
      if (this.fort.stoneFaced) return;
      const u = TUNING.wallUpgrades.stoneFacing;
      if (this.wood < u.costWood || this.gold < u.costGold) return;
      this.wood -= u.costWood;
      this.gold -= u.costGold;
      this.fort.applyStoneFacing();
      audio.play('upgrade');
      this.game.events.emit('keepward-toast', 'Stone Facing!');
    }
    this.emitHud();
  }

  private onWallTap(dir: WallDir): void {
    if (this.paused || this.status !== 'playing') return;
    if (this.placing) return;
    const seg = this.fort.segments.get(dir);
    if (!seg || seg.breached) return;
    const now = this.time.now;
    if (!seg.canRepair(now)) {
      if (now - seg.lastHitAt < TUNING.repair.lockMs) {
        this.game.events.emit('keepward-toast', 'Wall under fire');
      }
      return;
    }
    const result = seg.repairChunk(this.age);
    if (!result) return;
    if (this.wood < result.wood || this.gold < result.gold) {
      seg.hp -= result.healed;
      seg.redraw(this.fort.stoneFaced);
      this.game.events.emit('keepward-toast', 'Not enough to repair');
      audio.play('deny');
      return;
    }
    this.wood -= result.wood;
    this.gold -= result.gold;
    const left = Math.ceil(seg.maxHp - seg.hp);
    this.game.events.emit(
      'keepward-toast',
      left > 0
        ? `Repaired +${result.healed} HP (${left} left)`
        : `Wall fully repaired (+${result.healed})`,
    );
    audio.play('place');
    this.emitHud();
  }

  tryAgeUp(): void {
    if (this.paused || this.status !== 'playing' || this.aging) return;
    const idx = AGE_ORDER.indexOf(this.age);
    if (idx >= AGE_ORDER.length - 1) return;
    const next = AGE_ORDER[idx + 1];
    const def = AGES[next];
    if (this.wood < def.costWood || this.gold < def.costGold) return;
    this.wood -= def.costWood;
    this.gold -= def.costGold;
    this.aging = true;
    this.ageChannel = 0;
    this.ageTarget = next;
    this.game.events.emit('keepward-toast', `Channeling ${def.name}…`);
    this.emitHud();
  }

  private completeAgeUp(): void {
    if (!this.ageTarget) return;
    const prev = this.age;
    const next = this.ageTarget;
    this.age = next;
    this.aging = false;
    this.ageTarget = null;
    this.fort.onAgeUp(prev, next);
    audio.play('age');
    this.game.events.emit('keepward-toast', `Advanced to ${AGES[next].name}!`);
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

  toggleMute(): void {
    audio.unlock();
    audio.toggleMute();
    this.emitHud();
  }

  restart(): void {
    this.scene.stop('UI');
    this.scene.start('Game', { layout: this.layoutId });
  }

  goMenu(): void {
    this.scene.stop('UI');
    this.scene.start('Menu');
  }

  getHudState(): GameHudState {
    const nextIdx = AGE_ORDER.indexOf(this.age) + 1;
    const canAge = nextIdx < AGE_ORDER.length && !this.aging;
    const nextAge = canAge ? AGES[AGE_ORDER[nextIdx]] : null;

    let wallUpgradeAvailable: 'hardenedTimbers' | 'stoneFacing' | null = null;
    if (ageIndex(this.age) >= ageIndex('feudal') && !this.fort.hardened) {
      wallUpgradeAvailable = 'hardenedTimbers';
    } else if (ageIndex(this.age) >= ageIndex('castle') && !this.fort.stoneFaced) {
      wallUpgradeAvailable = 'stoneFacing';
    }

    let selectedPlaced: GameHudState['selectedPlaced'] = null;
    if (this.selectedPlaced) {
      const t = this.selectedPlaced;
      const canUndo =
        this.lastPlaced === t && this.time.now - t.placedAt <= UNDO_MS && t.kills === 0;
      const refund = t.refund(canUndo);
      selectedPlaced = {
        id: t.towerId,
        kills: t.kills,
        ranks: { ...t.ranks },
        can: {
          rof: t.canUnlockRank('rof'),
          range: t.canUnlockRank('range'),
          damage: t.canUnlockRank('damage'),
        },
        costs: {
          rof: t.upgradeCost('rof'),
          range: t.upgradeCost('range'),
          damage: t.upgradeCost('damage'),
        },
        canUndo,
        sellWood: refund.wood,
        sellGold: refund.gold,
      };
    }

    const nextEdge = this.betweenWaves && this.waveIndex < WAVES.length ? this.peekNextEdge() : null;
    return {
      wood: Math.floor(this.wood),
      gold: Math.floor(this.gold),
      keepHp: Math.ceil(this.keepHp),
      keepMaxHp: TUNING.keep.hp,
      wave: Math.min(this.waveIndex + 1, WAVES.length),
      maxWaves: WAVES.length,
      age: this.age,
      ageName: AGES[this.age].name,
      canAgeUp: canAge,
      ageCostWood: nextAge?.costWood ?? 0,
      ageCostGold: nextAge?.costGold ?? 0,
      aging: this.aging,
      ageChannelPct: this.aging ? this.ageChannel / TUNING.ageChannelMs : 0,
      selectedTower: this.selectedTower,
      placing: this.placing,
      paused: this.paused,
      status: this.status,
      unlocked: AGES[this.age].unlocks,
      layoutName: this.fort.layout.name,
      hardened: this.fort.hardened,
      stoneFaced: this.fort.stoneFaced,
      selectedPlaced,
      wallUpgradeAvailable,
      muted: audio.muted,
      teach: this.teachMsg,
      buildPhase: this.betweenWaves && this.status === 'playing' && this.waveIndex < WAVES.length,
      buildCountdownSec:
        this.betweenWaves && this.waveIndex < WAVES.length
          ? Math.max(0, Math.ceil(this.waveDelay / 1000))
          : 0,
      nextEdge,
    };
  }

  emitHud(): void {
    this.game.events.emit('keepward-hud', this.getHudState());
  }

  update(_time: number, delta: number): void {
    // Fade keep HP when timer expires
    if (this.keepHpBar.alpha > 0 && this.time.now > this.keepHpVisibleUntil && this.keepHp > 0) {
      this.keepHpBar.setAlpha(Math.max(0, this.keepHpBar.alpha - delta / 400));
      this.keepHpLabel.setAlpha(this.keepHpBar.alpha);
    }

    if (this.paused || this.status !== 'playing') return;
    const dt = delta / 1000;
    const dtMs = delta;

    const pm = passiveMult(this.age);
    this.wood += TUNING.passive.woodPerSec * pm * dt;
    this.gold += TUNING.passive.goldPerSec * pm * dt;

    if (this.aging) {
      this.ageChannel += dtMs;
      this.emitHud();
      if (this.ageChannel >= TUNING.ageChannelMs) {
        this.completeAgeUp();
      }
    }

    if (this.betweenWaves) {
      this.waveDelay -= dtMs;
      this.tickIncomingDust(dt);
      if (this.waveDelay <= 0) {
        if (this.waveIndex >= WAVES.length) {
          this.clearBuildPhaseVisuals();
          this.status = 'won';
          this.emitHud();
          audio.play('victory');
          this.game.events.emit('keepward-toast', 'Victory! The keep stands.');
          return;
        }
        this.startWave(WAVES[this.waveIndex]);
      }
    }

    if (this.spawning && this.spawnQueue.length) {
      const now = this.time.now;
      while (this.spawnQueue.length && this.spawnQueue[0].at <= now) {
        const job = this.spawnQueue.shift()!;
        this.spawnEnemy(job.enemy, job.edge, job.elite);
      }
      if (this.spawnQueue.length === 0) this.spawning = false;
    }

    const now = this.time.now;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const ev = e.tick(
        dt,
        (dir) => this.fort.isBreached(dir),
        () => this.fort.closestBreach({ x: e.x, y: e.y }),
      );
      if (ev.wallDamage) {
        const breached = this.fort.damageWall(
          ev.wallDamage.dir,
          ev.wallDamage.dps,
          now,
          ev.wallDamage.splashAdj,
        );
        if (breached.length) {
          for (const d of breached) {
            const seg = this.fort.segments.get(d);
            if (seg) {
              this.fx.breachDust(seg.def.breachPoint.x, seg.def.breachPoint.y);
              this.fx.wallSquash(seg.gfx);
            }
          }
          this.fx.shortShake(0.008, 140);
          this.fx.flash(Palette.blood, 0.18, 100);
          audio.play('breach');
          this.game.events.emit('keepward-toast', `Breach at ${breached.join(', ')}!`);
        }
      }
      if (ev.keepDamage) {
        this.keepHp -= ev.keepDamage;
        this.drawKeepHp();
        this.showKeepHp();
        if (this.keepHp <= 0) {
          this.keepHp = 0;
          this.status = 'lost';
          this.emitHud();
          audio.play('defeat');
          this.fx.flash(Palette.blood, 0.35, 200);
          this.game.events.emit('keepward-toast', 'The keep has fallen…');
          return;
        }
      }
    }

    for (const tower of this.towers) {
      const target = tower.tryAcquire(this.enemies, dtMs);
      if (target) {
        const p = this.projPool.acquire();
        const tint =
          tower.towerId === 'mangonel'
            ? Palette.feudal
            : tower.towerId === 'keep'
              ? Palette.stoneLight
              : Palette.ochre;
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

    for (let i = this.activeProjs.length - 1; i >= 0; i--) {
      const p = this.activeProjs[i];
      if (!p.update(dt)) {
        this.activeProjs.splice(i, 1);
        this.projPool.release(p);
        continue;
      }
      let hit = false;
      let killer: TowerUnit | null = null;
      for (const e of this.enemies) {
        if (!e.alive) continue;
        const d = Phaser.Math.Distance.Between(p.x, p.y, e.x, e.y);
        if (d < e.radius + 6) {
          hit = true;
          killer = this.nearestTower(p.x, p.y);
          if (p.splash > 0) {
            for (const e2 of this.enemies) {
              if (!e2.alive) continue;
              if (Phaser.Math.Distance.Between(p.x, p.y, e2.x, e2.y) <= p.splash) {
                this.damageEnemy(e2, p.damage, killer);
              }
            }
            this.splashFx(p.x, p.y, p.splash);
          } else {
            this.damageEnemy(e, p.damage, killer);
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

    if (!this.betweenWaves && !this.spawning && this.waveAlive <= 0) {
      const w = WAVES[this.waveIndex];
      this.gold += w.bonusGold;
      this.waveIndex++;
      this.betweenWaves = true;
      this.waveDelay = this.buildDurationMsForUpcoming();
      this.emitHud();
      if (this.waveIndex < WAVES.length) {
        this.game.events.emit(
          'keepward-toast',
          `Wave ${this.waveIndex} cleared! +${w.bonusGold}g — rebuild`,
        );
        this.beginBuildPhaseVisuals();
      } else {
        // Final wave cleared — brief pause then victory via betweenWaves timer
        this.clearBuildPhaseVisuals();
      }
    }

    // Whole-second countdown — 250ms is enough; 100ms + sheet rebuild killed iOS
    const hudInterval = 250;
    if (Math.floor(_time / hudInterval) !== Math.floor((_time - delta) / hudInterval)) {
      this.emitHud();
    }
  }

  private nearestTower(x: number, y: number): TowerUnit | null {
    let best: TowerUnit | null = null;
    let bestD = Infinity;
    for (const t of this.towers) {
      if (t.towerId === 'keep') continue;
      const d = Phaser.Math.Distance.Between(x, y, t.x, t.y);
      if (d < bestD) {
        bestD = d;
        best = t;
      }
    }
    if (!best || bestD > 200) {
      const kd = Phaser.Math.Distance.Between(x, y, this.keepTower.x, this.keepTower.y);
      if (kd < bestD) return this.keepTower;
    }
    return best;
  }

  private damageEnemy(e: EnemyUnit, dmg: number, killer: TowerUnit | null): void {
    if (!e.alive) return;
    this.fx.hitFlash(e);
    const killed = e.takeDamage(dmg);
    if (killed) {
      const gx = e.x;
      const gy = e.y;
      const rw = e.rewardWood;
      const rg = e.rewardGold;
      this.wood += rw;
      this.gold += rg;
      this.waveAlive = Math.max(0, this.waveAlive - 1);
      if (killer && killer.towerId !== 'keep') killer.onKill();
      const toX = killer ? killer.x : this.keepTower.x;
      const toY = killer ? killer.y : this.keepTower.y;
      this.fx.goldToTower(gx, gy, toX, toY, rg, rw);
      this.fx.flash(Palette.gold, 0.08, 50);
      audio.play('kill');
      this.fx.deathSquash(e, () => {
        e.kill(true);
      });
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

  /** Thumb Start Wave — skip remaining build timer */
  startWaveNow(): void {
    if (!this.betweenWaves || this.paused || this.status !== 'playing') return;
    if (this.waveIndex >= WAVES.length) return;
    this.waveDelay = 0;
  }

  private buildDurationMsForUpcoming(): number {
    if (this.waveIndex >= WAVES.length) return 1200;
    const upcoming = this.waveIndex + 1; // 1-based wave number
    const sec =
      upcoming >= TUNING.buildPhase.lateFromWave
        ? TUNING.buildPhase.lateSec
        : TUNING.buildPhase.earlySec;
    return sec * 1000;
  }

  private peekNextEdge(): 'N' | 'E' | 'S' | 'W' {
    if (this.waveIndex < WAVES.length) return WAVES[this.waveIndex].edge;
    return SPAWN_EDGES[this.spawnEdgeIndex % 4];
  }

  private beginBuildPhaseVisuals(): void {
    if (this.waveIndex >= WAVES.length) {
      this.clearBuildPhaseVisuals();
      return;
    }
    const edge = this.peekNextEdge();
    this.fort.setIncomingEdge(edge);
    this.fort.setBuildRepairHints(true);
    this.showIncomingTell(edge);
    this.emitHud();
  }

  private clearBuildPhaseVisuals(): void {
    this.fort.setIncomingEdge(null);
    this.fort.setBuildRepairHints(false);
    this.hideIncomingTell();
  }

  private showIncomingTell(edge: 'N' | 'E' | 'S' | 'W'): void {
    this.hideIncomingTell();
    const c = this.fort.layout.courtyard;
    const t = this.fort.layout.wallThickness;
    let x = c.x + c.w / 2;
    let y = c.y + c.h / 2;
    let rot = 0;
    const out = 36;
    if (edge === 'N') {
      x = c.x + c.w / 2;
      y = c.y - t - out;
      rot = Math.PI; // point down toward fort
    } else if (edge === 'S') {
      x = c.x + c.w / 2;
      y = c.y + c.h + t + out;
      rot = 0; // point up
    } else if (edge === 'E') {
      x = c.x + c.w + t + out;
      y = c.y + c.h / 2;
      rot = -Math.PI / 2; // point left
    } else {
      x = c.x - t - out;
      y = c.y + c.h / 2;
      rot = Math.PI / 2; // point right
    }

    const cont = this.add.container(x, y).setDepth(28);
    // Large chevron readable at arm's length
    const chev = this.add.graphics();
    chev.fillStyle(Palette.gold, 0.95);
    chev.fillTriangle(-22, -10, 22, -10, 0, 22);
    chev.lineStyle(3, Palette.blood, 1);
    chev.strokeTriangle(-22, -10, 22, -10, 0, 22);
    chev.setRotation(rot);
    const label = this.add
      .text(0, edge === 'N' ? -28 : edge === 'S' ? 28 : 0, `INCOMING ${edge}`, {
        fontSize: '14px',
        color: '#F0EBE0',
        fontFamily: 'system-ui',
        fontStyle: 'bold',
        backgroundColor: '#8B3A3Acc',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5);
    if (edge === 'E') label.setPosition(-8, -30);
    if (edge === 'W') label.setPosition(8, -30);
    cont.add([chev, label]);
    this.tweens.add({
      targets: cont,
      scaleX: 1.12,
      scaleY: 1.12,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.incomingChevron = cont;
    this.incomingDust = this.add.graphics().setDepth(12).setAlpha(0.7);
    this.dustTick = 0;
    this.dustMarks = 0;
  }

  private hideIncomingTell(): void {
    if (this.incomingChevron) {
      this.tweens.killTweensOf(this.incomingChevron);
      this.incomingChevron.destroy(true);
      this.incomingChevron = undefined;
    }
    if (this.incomingDust) {
      this.incomingDust.destroy();
      this.incomingDust = undefined;
    }
  }

  /** Marching-dust preview outside the threatened wall */
  private tickIncomingDust(dt: number): void {
    if (!this.incomingDust || !this.betweenWaves) return;
    this.dustTick += dt;
    if (this.dustTick < 0.14) return;
    this.dustTick = 0;
    const edge = this.peekNextEdge();
    const spawn = edgeSpawnPoints(edge);
    const g = this.incomingDust;
    if (this.dustMarks >= 24) {
      g.clear();
      this.dustMarks = 0;
    }
    const ox = spawn.x + (Math.random() - 0.5) * 48;
    const oy = spawn.y + (Math.random() - 0.5) * 48;
    g.fillStyle(Palette.dirt, 0.4 + Math.random() * 0.25);
    g.fillCircle(ox, oy, 3 + Math.random() * 5);
    this.dustMarks++;
  }

  private startWave(wave: (typeof WAVES)[0]): void {
    this.clearBuildPhaseVisuals();
    this.betweenWaves = false;
    this.spawning = true;
    this.spawnQueue = [];
    const now = this.time.now;
    const edge = wave.edge ?? SPAWN_EDGES[this.spawnEdgeIndex % 4];
    this.spawnEdgeIndex++;
    for (const s of wave.spawns) {
      const base = now + (s.delayMs ?? 0);
      for (let i = 0; i < s.count; i++) {
        this.spawnQueue.push({
          enemy: s.enemy,
          at: base + i * s.intervalMs,
          elite: s.elite,
          edge,
        });
        this.waveAlive++;
      }
    }
    this.spawnQueue.sort((a, b) => a.at - b.at);
    this.emitHud();
    audio.play('wave');
    this.game.events.emit('keepward-toast', `Wave ${wave.wave} — ${edge} edge`);
  }

  private spawnEnemy(id: EnemyId, edge: 'N' | 'E' | 'S' | 'W', elite?: boolean): void {
    const wall = this.fort.weakestInHemisphere(edge);
    const spawn = edgeSpawnPoints(edge);
    const e = this.enemyPool.acquire();
    e.spawn(
      id,
      spawn,
      wall.dir,
      wall.def.attackPoint,
      wall.def.breachPoint,
      this.fort.keepPos,
      !!elite,
    );
    if (wall.breached) {
      const br = this.fort.closestBreach(spawn);
      if (br) {
        e.setBreach(br.point, br.dir);
        e.state = 'enter';
      } else {
        e.state = 'hunt_keep';
      }
    }
    if (!this.enemies.includes(e)) this.enemies.push(e);
  }
}

const TRACK_SHORT: Record<UpgradeTrack, string> = {
  rof: 'RoF',
  range: 'Range',
  damage: 'Damage',
};
