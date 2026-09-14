import Phaser from 'phaser';
import { Palette } from '../data/palette';
import { TOWERS, type TowerId, type UpgradeTrack } from '../data/towers';
import { WAVES } from '../data/waves';
import { AGES, AGE_ORDER, ageIndex, passiveMult, type AgeId } from '../data/ages';
import { AGE_GEM } from '../data/artBible';
import { TUNING, TILE_PX } from '../data/tuning';
import {
  ATTACK_DEFS,
  DEFENSE_DEFS,
  SIEGE_DEFS,
  blankKeepResearch,
  keepMaxHpFor,
  ownsResearch,
  researchAvailable,
  type KeepResearchId,
  type KeepResearchState,
  type KeepTab,
} from '../data/keepResearch';
import { SPAWN_EDGES, edgeSpawnPoints, type LayoutId } from '../data/fort';
import { makeQuickFort, type SurveyedFort } from '../data/survey';
import { TowerUnit, PlacementGhost } from '../entities/Tower';
import { EnemyUnit } from '../entities/Enemy';
import { Projectile } from '../entities/Projectile';
import { Pool } from '../utils/pool';
import { FortSystem } from '../systems/FortSystem';
import { FxSystem } from '../systems/FxSystem';
import { audio } from '../systems/AudioSystem';
import { isCavalry, type EnemyId } from '../data/enemies';
import type { WallDir } from '../data/fort';
import { GAME_H, HUD_TOP, HUD_BOTTOM } from '../data/map';
import { applyLockedView, pointerToWorld } from '../utils/view';

const UNDO_MS = 2000;
const TEACH_KEY = 'keepward-taught-v1';
const TEACH_W2_KEY = 'keepward-taught-w2';
const TEACH_W3_KEY = 'keepward-taught-w3';
const A2HS_KEY = 'keepward-a2hs-v1';
const KILL_COMBO_MS = 480;
type TeachId = 'w1' | 'w2' | 'w3';

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
  /** Keep research hall sheet */
  selectedKeep: {
    tab: KeepTab;
    keepHp: number;
    keepMaxHp: number;
    research: KeepResearchState;
    attack: { id: KeepResearchId; name: string; short: string; desc: string; wood: number; gold: number; owned: boolean; available: boolean; affordable: boolean; stub?: boolean }[];
    defense: { id: KeepResearchId; name: string; short: string; desc: string; wood: number; gold: number; owned: boolean; available: boolean; affordable: boolean; stub?: boolean }[];
    siege: { id: KeepResearchId; name: string; short: string; desc: string; wood: number; gold: number; owned: boolean; available: boolean; affordable: boolean; stub?: boolean }[];
    canAgeUp: boolean;
    ageCostWood: number;
    ageCostGold: number;
    aging: boolean;
    ageChannelPct: number;
    nextAgeName: string | null;
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
  /** Remaining ms on last-place undo chip (0 = hidden) */
  undoMsLeft: number;
  /** End-of-run recap */
  recap: { wavesCleared: number; kills: number; ageName: string } | null;
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
  layoutId: LayoutId = 'survey';
  survey!: SurveyedFort;

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
  private totalKills = 0;
  private killCombo = 0;
  private lastKillAt = 0;
  private slowMoScale = 1;
  private slowMoUntilReal = 0;
  private a2hsOffered = false;

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
  private keepMaxHp: number = TUNING.keep.hp;
  private keepResearch: KeepResearchState = blankKeepResearch();
  private keepSheetTab: KeepTab = 'home';
  private pointerDown = false;
  private dockDragging = false;
  /** Ignore tower taps right after place (same touch / iOS synthetic click) */
  private placeTapIgnoreUntil = 0;
  /** Suppress GameScene pointerup while a dock-drag gesture owns the finger */
  private ignoreGamePointerUpUntil = 0;
  private teachMsg: string | null = null;
  private teachId: TeachId | null = null;
  private taught = false;
  private taughtW2 = false;
  private taughtW3 = false;

  /** Incoming-side tell overlays (chevron + dust) */
  private incomingChevron?: Phaser.GameObjects.Container;
  private incomingDust?: Phaser.GameObjects.Graphics;
  private dustTick = 0;
  private dustMarks = 0;

  constructor() {
    super('Game');
  }

  init(data?: { layout?: LayoutId; survey?: SurveyedFort }): void {
    if (data?.survey) {
      this.survey = data.survey;
      this.layoutId = 'survey';
    } else if (data?.layout && data.layout !== 'survey') {
      this.layoutId = data.layout;
      this.survey = makeQuickFort();
    } else {
      this.survey = makeQuickFort();
      this.layoutId = 'survey';
    }
  }

  create(): void {
    this.wood = TUNING.start.wood;
    this.gold = TUNING.start.gold;
    this.keepHp = TUNING.keep.hp;
    this.keepMaxHp = TUNING.keep.hp;
    this.keepResearch = blankKeepResearch();
    this.keepSheetTab = 'home';
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
    this.totalKills = 0;
    this.killCombo = 0;
    this.lastKillAt = 0;
    this.slowMoScale = 1;
    this.slowMoUntilReal = 0;
    this.a2hsOffered = false;
    this.tweens.timeScale = 1;
    this.aging = false;
    this.ageChannel = 0;
    this.ageTarget = null;
    this.spawnEdgeIndex = 0;
    this.pointerDown = false;
    this.dockDragging = false;
    this.placeTapIgnoreUntil = 0;
    this.ignoreGamePointerUpUntil = 0;
    this.keepHpVisibleUntil = 0;

    try {
      this.taught = localStorage.getItem(TEACH_KEY) === '1';
      this.taughtW2 = localStorage.getItem(TEACH_W2_KEY) === '1';
      this.taughtW3 = localStorage.getItem(TEACH_W3_KEY) === '1';
    } catch {
      this.taught = false;
      this.taughtW2 = false;
      this.taughtW3 = false;
    }
    this.teachId = null;
    this.teachMsg = null;
    if (!this.taught) {
      this.teachId = 'w1';
      this.teachMsg = 'Drag tower into courtyard';
    }

    applyLockedView(this);
    this.cameras.main.setBackgroundColor(Palette.grassDark);
    this.fort = new FortSystem(this, this.survey);
    this.fx = new FxSystem(this);

    this.keepTower = new TowerUnit(this, this.fort.keepPos.x, this.fort.keepPos.y, 'keep');
    this.keepTower.setAgeVisual(this.age);
    this.keepTower.setKeepResearch(this.keepResearch);
    this.towers.push(this.keepTower);
    this.time.delayedCall(100, () => {
      if (!this.keepTower?.active) return;
      this.keepTower.enableTap(() => this.selectPlacedTower(this.keepTower));
    });

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
    this.ghost.setAgeVisual(this.age);

    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.input.on('pointerupoutside', this.onPointerUp, this);
    this.input.on('gameout', this.onPointerCancel, this);

    for (const seg of this.fort.segments.values()) {
      if (seg.def.kind === 'gap') continue;
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
    this.persistTeach(this.teachId);
    this.teachMsg = null;
    this.teachId = null;
    this.emitHud();
  }

  private completeTeach(): void {
    if (!this.teachMsg) return;
    // Wave-1 place completes the drag teach; w2/w3 are skip-only
    if (this.teachId === 'w1') this.persistTeach('w1');
    this.teachMsg = null;
    this.teachId = null;
    // HUD emit deferred to caller (tryPlace) so teach overlay isn't
    // destroyed synchronously inside the placing pointerup.
  }

  private persistTeach(id: TeachId | null): void {
    if (!id) return;
    try {
      if (id === 'w1') {
        this.taught = true;
        localStorage.setItem(TEACH_KEY, '1');
      } else if (id === 'w2') {
        this.taughtW2 = true;
        localStorage.setItem(TEACH_W2_KEY, '1');
      } else if (id === 'w3') {
        this.taughtW3 = true;
        localStorage.setItem(TEACH_W3_KEY, '1');
      }
    } catch {
      /* ignore */
    }
  }

  /** PvZ-style one-liners before waves 2–3 — once each, skippable */
  private maybeOfferWaveTeach(): void {
    if (this.teachMsg) return;
    const upcoming = this.waveIndex + 1;
    if (upcoming === 2 && !this.taughtW2) {
      this.teachId = 'w2';
      this.teachMsg = 'Tap damaged walls to repair them';
    } else if (upcoming === 3 && !this.taughtW3) {
      this.teachId = 'w3';
      this.teachMsg = 'Tap the Keep to age and research';
    }
  }

  private emitResourceGain(wood: number, gold: number): void {
    const w = Math.floor(wood);
    const g = Math.floor(gold);
    if (w <= 0 && g <= 0) return;
    this.game.events.emit('keepward-gain', { wood: Math.max(0, w), gold: Math.max(0, g) });
  }

  private drawKeepHp(): void {
    const g = this.keepHpBar;
    g.clear();
    const x = this.fort.keepPos.x;
    const y = this.fort.keepPos.y - 40;
    const w = 56;
    const pct = Math.max(0, this.keepHp / this.keepMaxHp);
    g.fillStyle(0x000000, 0.5);
    g.fillRect(x - w / 2, y, w, 6);
    g.fillStyle(pct > 0.55 ? 0x5aaa4a : pct > 0.28 ? Palette.gold : Palette.blood, 1);
    g.fillRect(x - w / 2, y, w * pct, 6);
    this.keepHpLabel.setText(`Keep ${Math.ceil(this.keepHp)}`);
  }

  private showKeepHp(ms = 1200): void {
    this.keepHpVisibleUntil = this.time.now + ms;
    this.keepHpBar.setAlpha(1);
    this.keepHpLabel.setAlpha(1);
  }

  private inPlayfield(x: number, y: number): boolean {
    return y > HUD_TOP + 8 && y < GAME_H - HUD_BOTTOM;
  }

  /** Pointer → logical playfield (undo DPR buffer + camera zoom). */
  private worldXY(pointer: Phaser.Input.Pointer): { x: number; y: number } {
    return pointerToWorld(this, pointer);
  }

  /** Start drag-place from dock button (Clash Royale style) */
  beginDockPlace(id: TowerId, pointer: Phaser.Input.Pointer): void {
    audio.unlock();
    if (this.paused || this.status !== 'playing') return;
    const def = TOWERS[id];
    if (!def.buildable) return;
    if (!this.isTowerUnlocked(id)) return;
    this.clearPlacedSelection();
    this.selectedTower = id;
    this.placing = true;
    this.dockDragging = true;
    this.pointerDown = true;
    // Block GameScene global pointerup for the whole dock gesture (+ release race)
    this.ignoreGamePointerUpUntil = this.time.now + 60_000;
    this.ghost.setTower(id);
    const { x, y } = this.worldXY(pointer);
    this.updateGhost(x, y);
    this.emitHud();
  }

  updateDockPlace(pointer: Phaser.Input.Pointer): void {
    if (!this.placing || !this.dockDragging) return;
    const { x, y } = this.worldXY(pointer);
    this.updateGhost(x, y);
  }

  endDockPlace(pointer: Phaser.Input.Pointer): void {
    if (!this.placing || !this.dockDragging) return;
    const { x, y } = this.worldXY(pointer);
    // Force-release BEFORE any place side-effects (iOS input wedge)
    this.dockDragging = false;
    this.pointerDown = false;
    this.placing = false;
    this.ghost.hide();
    this.ignoreGamePointerUpUntil = this.time.now + 150;
    this.forceReleasePointers();
    if (this.paused || this.status !== 'playing') {
      this.emitHud();
      return;
    }
    // Drag-off cancel: release in dock/top chrome
    if (!this.inPlayfield(x, y)) {
      this.time.delayedCall(0, () => {
        audio.play('deny');
        this.emitHud();
      });
      return;
    }
    const ok = this.tryPlace(x, y);
    if (!ok) {
      this.time.delayedCall(0, () => {
        audio.play('deny');
        this.emitHud();
      });
    }
  }

  private cancelPlace(): void {
    this.ghost.hide();
    this.placing = false;
    this.dockDragging = false;
    this.pointerDown = false;
    this.ignoreGamePointerUpUntil = this.time.now + 100;
    this.forceReleasePointers();
    this.emitHud();
  }

  /** Safe Phaser 3 pointer reset — clears stuck active touch after mid-up Zone spawn */
  private forceReleasePointers(): void {
    try {
      const mgr = this.input?.manager;
      if (!mgr?.pointers) return;
      for (const p of mgr.pointers) {
        if (p && typeof p.reset === 'function') p.reset();
      }
    } catch {
      /* ignore — defensive only */
    }
  }

  /** UIScene calls this on touchcancel / gameout so drag never sticks */
  cancelDockDrag(): void {
    if (!this.placing && !this.dockDragging && !this.pointerDown) return;
    this.cancelPlace();
  }

  private onPointerCancel = (): void => {
    if (this.dockDragging || this.placing || this.pointerDown) this.cancelPlace();
  };

  private pointerOverWall(x: number, y: number): boolean {
    for (const seg of this.fort.segments.values()) {
      if (seg.containsPoint(x, y)) return true;
    }
    return false;
  }

  private onPointerDown = (pointer: Phaser.Input.Pointer): void => {
    audio.unlock();
    if (this.paused || this.status !== 'playing') return;
    if (this.dockDragging) return;
    const { x, y } = this.worldXY(pointer);
    if (!this.inPlayfield(x, y)) return;

    // Never start place from bare playfield tap — dock-drag owns placing.
    // (selectedTower defaults to watchtower and was stealing wall repair taps.)
    this.pointerDown = true;
    if (this.pointerOverWall(x, y)) {
      // Let wall hitZone handle repair/rebuild on pointerup
      return;
    }
  };

  private onPointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (this.dockDragging) return;
    if (!this.placing || !this.pointerDown) return;
    const { x, y } = this.worldXY(pointer);
    this.updateGhost(x, y);
  };

  private onPointerUp = (pointer: Phaser.Input.Pointer): void => {
    // Dock gesture owns this finger — UIScene.endDockPlace handles place
    if (this.dockDragging || this.time.now < this.ignoreGamePointerUpUntil) {
      this.pointerDown = false;
      return;
    }
    if (!this.placing) {
      this.pointerDown = false;
      return;
    }
    const { x, y } = this.worldXY(pointer);
    // Force-release BEFORE place side-effects
    this.pointerDown = false;
    this.placing = false;
    this.ghost.hide();
    this.forceReleasePointers();
    if (this.paused || this.status !== 'playing') {
      this.emitHud();
      return;
    }
    // Lift to commit; drag-off / HUD cancel
    if (!this.inPlayfield(x, y)) {
      this.time.delayedCall(0, () => {
        audio.play('deny');
        this.emitHud();
      });
      return;
    }
    const ok = this.tryPlace(x, y);
    if (!ok) {
      this.time.delayedCall(0, () => {
        audio.play('deny');
        this.emitHud();
      });
    }
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
    if (!this.isTowerUnlocked(this.selectedTower)) return false;
    if (this.wood < def.costWood || this.gold < def.costGold) {
      this.game.events.emit('keepward-toast', 'Not enough resources');
      return false;
    }
    if (!this.isValidPlacement(x, y)) {
      this.game.events.emit('keepward-toast', 'Place inside the courtyard');
      return false;
    }
    // Flags already cleared by caller; belt-and-suspenders before Zone exists
    this.placing = false;
    this.dockDragging = false;
    this.pointerDown = false;
    this.forceReleasePointers();

    this.wood -= def.costWood;
    this.gold -= def.costGold;
    const tower = new TowerUnit(this, x, y, this.selectedTower);
    tower.setAgeVisual(this.age);
    // Never selectPlacedTower from the place path — that armed interactives
    // under the active finger and wedged iOS Safari.
    this.placeTapIgnoreUntil = this.time.now + 450;
    // enableTap ONLY after place gesture fully ends (≥400ms)
    this.time.delayedCall(420, () => {
      if (!tower.active) return;
      tower.enableTap(() => this.selectPlacedTower(tower));
    });
    tower.showRange(true);
    this.time.delayedCall(500, () => {
      if (this.selectedPlaced !== tower) tower.showRange(false);
    });
    this.towers.push(tower);
    this.lastPlaced = tower;
    this.refreshAuraBuffs();
    this.completeTeach();
    // Defer HUD / audio / FX / toast OFF the pointerup stack
    const px = x;
    const py = y;
    this.time.delayedCall(0, () => {
      this.fx.placePop(px, py);
      audio.play('place');
      this.emitHud();
      this.game.events.emit('keepward-toast', 'placed ok');
    });
    return true;
  }

  selectPlacedTower(tower: TowerUnit): void {
    if (this.placing || this.dockDragging) return;
    if (this.time.now < this.placeTapIgnoreUntil) return;
    audio.unlock();
    for (const t of this.towers) t.showRange(false);
    this.selectedPlaced = tower;
    if (tower.towerId === 'keep') {
      const auraR = TUNING.keep.auraRangeTiles * TILE_PX;
      tower.showRange(true, auraR);
      this.keepSheetTab = 'home';
    } else {
      tower.showRange(true);
    }
    this.selectedTower = null;
    this.emitHud();
  }

  setKeepSheetTab(tab: KeepTab): void {
    this.keepSheetTab = tab;
    this.emitHud();
  }

  isTowerUnlocked(id: TowerId): boolean {
    if (id === 'watchtower' || id === 'keep') return true;
    if (id === 'longbow') return this.keepResearch.longbow;
    if (id === 'spearPost') return this.keepResearch.spearPost;
    if (id === 'mangonel') return this.keepResearch.mangonel;
    return false;
  }

  getUnlockedTowers(): string[] {
    const u = ['watchtower'];
    if (this.keepResearch.longbow) u.push('longbow');
    if (this.keepResearch.spearPost) u.push('spearPost');
    if (this.keepResearch.mangonel) u.push('mangonel');
    return u;
  }

  refreshAuraBuffs(): void {
    const auraR = TUNING.keep.auraRangeTiles * TILE_PX;
    const rof = this.keepResearch.a3 ? TUNING.keepResearch.attack.a3.auraRof : 0;
    const dmg = this.keepResearch.a4 ? TUNING.keepResearch.attack.a4.auraDmg : 0;
    const hp = this.keepResearch.d4 ? TUNING.keepResearch.defense.d4.towerHpAura : 0;
    for (const t of this.towers) {
      if (t.towerId === 'keep') {
        t.auraRofBonus = 0;
        t.auraDmgBonus = 0;
        t.auraHpBonus = 0;
        t.setKeepResearch(this.keepResearch);
        continue;
      }
      const d = Phaser.Math.Distance.Between(t.x, t.y, this.keepTower.x, this.keepTower.y);
      const inAura = d <= auraR;
      t.auraRofBonus = inAura ? rof : 0;
      t.auraDmgBonus = inAura ? dmg : 0;
      t.auraHpBonus = inAura ? hp : 0;
      t.recomputeStats();
    }
  }

  tryKeepResearch(id: KeepResearchId): void {
    if (this.paused || this.status !== 'playing') return;
    const def =
      ATTACK_DEFS.find((d) => d.id === id) ||
      DEFENSE_DEFS.find((d) => d.id === id) ||
      SIEGE_DEFS.find((d) => d.id === id);
    if (!def || def.stub) return;
    if (!researchAvailable(def, this.keepResearch, this.age)) {
      this.game.events.emit('keepward-toast', 'Locked');
      audio.play('deny');
      return;
    }
    if (this.wood < def.costWood || this.gold < def.costGold) {
      this.game.events.emit('keepward-toast', 'Not enough resources');
      audio.play('deny');
      return;
    }
    this.wood -= def.costWood;
    this.gold -= def.costGold;
    (this.keepResearch as Record<KeepResearchId, boolean>)[id] = true;

    // Defense HP bumps
    if (id === 'd1' || id === 'd2') {
      const prev = this.keepMaxHp;
      this.keepMaxHp = keepMaxHpFor(this.keepResearch);
      this.keepHp += this.keepMaxHp - prev;
      this.drawKeepHp();
      this.showKeepHp();
    }

    this.refreshAuraBuffs();
    audio.play('upgrade');
    this.game.events.emit('keepward-toast', `${def.name} researched`);
    this.emitHud();
  }

  /** Refresh gold/silver pips on towers + walls */
  refreshUpgradePips(): void {
    const w = this.wood;
    const g = this.gold;
    for (const t of this.towers) {
      if (t.towerId === 'keep') {
        // Keep pip: any affordable research OR age-up
        let gold = false;
        let anyLeft = false;
        for (const def of [...ATTACK_DEFS, ...DEFENSE_DEFS, ...SIEGE_DEFS]) {
          if (def.stub) continue;
          if (ownsResearch(this.keepResearch, def.id)) continue;
          anyLeft = true;
          if (researchAvailable(def, this.keepResearch, this.age) && w >= def.costWood && g >= def.costGold) {
            gold = true;
            break;
          }
        }
        const nextIdx = AGE_ORDER.indexOf(this.age) + 1;
        if (nextIdx < AGE_ORDER.length && !this.aging) {
          anyLeft = true;
          const na = AGES[AGE_ORDER[nextIdx]];
          if (w >= na.costWood && g >= na.costGold) gold = true;
        }
        if (t.selected) t.setUpgradePip('none');
        else if (gold) t.setUpgradePip('gold');
        else if (!anyLeft) t.setUpgradePip('silver');
        else t.setUpgradePip('none');
        continue;
      }
      if (t.selected) {
        t.setUpgradePip('none');
      } else if (t.hasAffordableUpgrade(w, g)) {
        t.setUpgradePip('gold');
      } else if (t.isFullyUpgraded()) {
        t.setUpgradePip('silver');
      } else {
        t.setUpgradePip('none');
      }
    }

    // Wall upgrade pips on segments
    let wallGold = false;
    let wallMaxed = this.fort.hardened && this.fort.stoneFaced;
    let wallAvail: 'hardenedTimbers' | 'stoneFacing' | null = null;
    if (ageIndex(this.age) >= ageIndex('feudal') && !this.fort.hardened) {
      wallAvail = 'hardenedTimbers';
    } else if (ageIndex(this.age) >= ageIndex('castle') && !this.fort.stoneFaced) {
      wallAvail = 'stoneFacing';
    }
    if (wallAvail) {
      const u =
        wallAvail === 'hardenedTimbers'
          ? TUNING.wallUpgrades.hardenedTimbers
          : TUNING.wallUpgrades.stoneFacing;
      wallGold = w >= u.costWood && g >= u.costGold;
    }
    for (const seg of this.fort.segments.values()) {
      if (seg.def.kind === 'gap') continue;
      if (wallGold) seg.setUpgradePip('gold');
      else if (wallMaxed) seg.setUpgradePip('silver');
      else seg.setUpgradePip('none');
    }
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
    if (this.selectedPlaced.towerId === 'keep') return;
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
    if (this.selectedPlaced.towerId === 'keep') return;
    const t = this.selectedPlaced;
    const canUndo =
      this.lastPlaced === t && this.time.now - t.placedAt <= UNDO_MS && t.kills === 0;
    if (canUndo) {
      this.undoLastPlaced();
      return;
    }
    const refund = t.refund(false);
    this.wood += refund.wood;
    this.gold += refund.gold;
    this.emitResourceGain(refund.wood, refund.gold);
    const idx = this.towers.indexOf(t);
    if (idx >= 0) this.towers.splice(idx, 1);
    if (this.lastPlaced === t) this.lastPlaced = null;
    this.selectedPlaced = null;
    t.destroyTower();
    audio.play('sell');
    this.game.events.emit('keepward-toast', `Sold +${refund.wood}W ${refund.gold}G`);
    this.emitHud();
  }

  /** 2s undo chip / sheet — full refund, no tower tap required */
  undoLastPlaced(): boolean {
    if (this.paused || this.status !== 'playing') return false;
    const t = this.lastPlaced;
    if (!t || t.towerId === 'keep') return false;
    if (t.kills > 0) return false;
    if (this.time.now - t.placedAt > UNDO_MS) return false;
    const refund = t.refund(true);
    this.wood += refund.wood;
    this.gold += refund.gold;
    this.emitResourceGain(refund.wood, refund.gold);
    const idx = this.towers.indexOf(t);
    if (idx >= 0) this.towers.splice(idx, 1);
    if (this.selectedPlaced === t) this.selectedPlaced = null;
    this.lastPlaced = null;
    t.destroyTower();
    audio.play('sell');
    this.game.events.emit('keepward-toast', `Undo +${refund.wood}W ${refund.gold}G`);
    this.emitHud();
    return true;
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
    // Ignore wall taps that fire on the same lift as a dock-drag place
    if (this.time.now < this.ignoreGamePointerUpUntil) return;
    // Cancel any in-progress place/ghost so repair/rebuild always wins
    if (this.placing || this.dockDragging || this.ghost.active) {
      this.cancelPlace();
    }
    const seg = this.fort.segments.get(dir);
    if (!seg || seg.def.kind === 'gap') {
      this.game.events.emit('keepward-toast', 'Missed the wall');
      return;
    }
    if (seg.rebuilding) {
      this.game.events.emit('keepward-toast', 'Wall rebuilding…');
      return;
    }

    // Rebuild destroyed segment
    if (seg.breached) {
      const cost = TUNING.rebuild;
      if (this.wood < cost.wood || this.gold < cost.gold) {
        this.game.events.emit('keepward-toast', `Need ${cost.wood}W+${cost.gold}G to rebuild`);
        audio.play('deny');
        return;
      }
      this.wood -= cost.wood;
      this.gold -= cost.gold;
      seg.beginRebuild();
      this.game.events.emit('keepward-toast', 'Rebuilding wall…');
      audio.play('place');
      this.emitHud();
      const stone =
        this.fort.stoneFaced || this.age === 'castle' || this.age === 'imperial';
      this.time.delayedCall(TUNING.rebuild.placeMs, () => {
        if (!seg || !this.sys.settings.active) return;
        // Segment may have been destroyed on restart
        if (!this.fort.segments.has(dir)) return;
        const maxHp = this.fort.baselineForAge(this.age);
        seg.finishRebuild(maxHp, stone);
        this.game.events.emit('keepward-toast', 'Rebuilt wall');
        audio.play('upgrade');
        this.emitHud();
      });
      return;
    }

    const now = this.time.now;
    if (seg.hp >= seg.maxHp - 0.01) {
      this.game.events.emit('keepward-toast', 'Wall at full HP');
      return;
    }
    if (!seg.canRepair(now)) {
      if (now - seg.lastHitAt < TUNING.repair.lockMs) {
        this.game.events.emit('keepward-toast', 'Wall under fire');
      } else {
        this.game.events.emit('keepward-toast', 'Cannot repair now');
      }
      return;
    }
    const discount = this.keepResearch.d3 ? TUNING.keepResearch.defense.d3.repairDiscount : 0;
    const result = seg.repairChunk(this.age, discount);
    if (!result) {
      this.game.events.emit('keepward-toast', 'Cannot repair now');
      return;
    }
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
    for (const t of this.towers) t.setAgeVisual(next);
    this.ghost.setAgeVisual(next);
    audio.play('age');
    this.fx.ageFanfare(this.fort.keepPos.x, this.fort.keepPos.y, AGES[next].name, AGE_GEM[next]);
    this.game.events.emit('keepward-toast', `Advanced to ${AGES[next].name}!`);
    this.maybeOfferA2hs();
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
    this.scene.start('Game', { survey: this.survey });
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
    let selectedKeep: GameHudState['selectedKeep'] = null;
    if (this.selectedPlaced && this.selectedPlaced.towerId === 'keep') {
      const mapDefs = (defs: typeof ATTACK_DEFS) =>
        defs.map((d) => {
          const owned = ownsResearch(this.keepResearch, d.id);
          const available = researchAvailable(d, this.keepResearch, this.age);
          return {
            id: d.id,
            name: d.name,
            short: d.short,
            desc: d.desc,
            wood: d.costWood,
            gold: d.costGold,
            owned,
            available,
            affordable: available && this.wood >= d.costWood && this.gold >= d.costGold,
            stub: d.stub,
          };
        });
      const nIdx = AGE_ORDER.indexOf(this.age) + 1;
      const nAge = nIdx < AGE_ORDER.length ? AGES[AGE_ORDER[nIdx]] : null;
      selectedKeep = {
        tab: this.keepSheetTab,
        keepHp: Math.ceil(this.keepHp),
        keepMaxHp: this.keepMaxHp,
        research: { ...this.keepResearch },
        attack: mapDefs(ATTACK_DEFS),
        defense: mapDefs(DEFENSE_DEFS),
        siege: mapDefs(SIEGE_DEFS),
        canAgeUp: !!nAge && !this.aging,
        ageCostWood: nAge?.costWood ?? 0,
        ageCostGold: nAge?.costGold ?? 0,
        aging: this.aging,
        ageChannelPct: this.aging ? this.ageChannel / TUNING.ageChannelMs : 0,
        nextAgeName: nAge?.name ?? null,
      };
    } else if (this.selectedPlaced) {
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
    let undoMsLeft = 0;
    if (
      this.lastPlaced &&
      this.lastPlaced.towerId !== 'keep' &&
      this.lastPlaced.kills === 0
    ) {
      const left = UNDO_MS - (this.time.now - this.lastPlaced.placedAt);
      if (left > 0) undoMsLeft = left;
    }
    const recap =
      this.status === 'won' || this.status === 'lost'
        ? {
            wavesCleared:
              this.status === 'won'
                ? WAVES.length
                : Math.max(1, this.betweenWaves ? this.waveIndex : this.waveIndex + 1),
            kills: this.totalKills,
            ageName: AGES[this.age].name,
          }
        : null;
    return {
      wood: Math.floor(this.wood),
      gold: Math.floor(this.gold),
      keepHp: Math.ceil(this.keepHp),
      keepMaxHp: this.keepMaxHp,
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
      unlocked: this.getUnlockedTowers(),
      layoutName: this.fort.layout.name,
      hardened: this.fort.hardened,
      stoneFaced: this.fort.stoneFaced,
      selectedPlaced,
      selectedKeep,
      wallUpgradeAvailable,
      muted: audio.muted,
      teach: this.teachMsg,
      buildPhase: this.betweenWaves && this.status === 'playing' && this.waveIndex < WAVES.length,
      buildCountdownSec:
        this.betweenWaves && this.waveIndex < WAVES.length
          ? Math.max(0, Math.ceil(this.waveDelay / 1000))
          : 0,
      nextEdge,
      undoMsLeft,
      recap,
    };
  }

  emitHud(): void {
    this.refreshUpgradePips();
    this.game.events.emit('keepward-hud', this.getHudState());
  }

  update(_time: number, delta: number): void {
    if (performance.now() >= this.slowMoUntilReal) {
      this.slowMoScale = 1;
      this.tweens.timeScale = 1;
    }

    // Drag-ghost polish — smooth follow even while paused for place preview
    if (this.ghost?.active) this.ghost.tick(delta / 1000);

    // Fade keep HP when timer expires
    if (this.keepHpBar.alpha > 0 && this.time.now > this.keepHpVisibleUntil && this.keepHp > 0) {
      this.keepHpBar.setAlpha(Math.max(0, this.keepHpBar.alpha - delta / 400));
      this.keepHpLabel.setAlpha(this.keepHpBar.alpha);
    }

    if (this.paused || this.status !== 'playing') return;
    const scale = this.slowMoScale;
    const dt = (delta / 1000) * scale;
    const dtMs = delta * scale;

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
        p.fire(
          tower.x,
          tower.y - 10,
          target.x,
          target.y,
          tower.def.projectileSpeed,
          tower.damage,
          tower.splash,
          target.uid,
          tower.towerId,
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
        if (p.wantsDust) this.mangonelDust(p.x, p.y);
        p.deactivate();
        this.activeProjs.splice(i, 1);
        this.projPool.release(p);
      }
    }

    if (!this.betweenWaves && !this.spawning && this.waveAlive <= 0) {
      const w = WAVES[this.waveIndex];
      this.gold += w.bonusGold;
      this.emitResourceGain(0, w.bonusGold);
      this.waveIndex++;
      this.betweenWaves = true;
      this.waveDelay = this.buildDurationMsForUpcoming();
      this.pulseSlowMo(0.32, this.waveIndex >= WAVES.length ? 550 : 380);
      audio.play('waveClear');
      this.fx.waveClearBurst(this.waveIndex, w.bonusGold);
      this.emitHud();
      if (this.waveIndex < WAVES.length) {
        this.game.events.emit(
          'keepward-toast',
          `Wave ${this.waveIndex} cleared! +${w.bonusGold}g — rebuild`,
        );
        this.beginBuildPhaseVisuals();
        this.time.delayedCall(1400, () => {
          if (!this.sys.settings.active) return;
          this.maybeOfferA2hs();
        });
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
    let finalDmg = dmg;
    if (killer && killer.towerId === 'spearPost' && isCavalry(e.enemyId)) {
      const mult = TOWERS.spearPost.vsCavalryMult ?? 2;
      finalDmg = dmg * mult;
    }
    this.fx.hitFlash(e);
    const killed = e.takeDamage(finalDmg);
    if (killed) {
      const gx = e.x;
      const gy = e.y;
      const rw = e.rewardWood;
      const rg = e.rewardGold;
      this.wood += rw;
      this.gold += rg;
      this.emitResourceGain(rw, rg);
      this.totalKills++;
      this.waveAlive = Math.max(0, this.waveAlive - 1);
      if (killer && killer.towerId !== 'keep') killer.onKill();
      const toX = killer ? killer.x : this.keepTower.x;
      const toY = killer ? killer.y : this.keepTower.y;
      const now = this.time.now;
      if (now - this.lastKillAt < KILL_COMBO_MS) this.killCombo++;
      else this.killCombo = 0;
      this.lastKillAt = now;
      this.fx.killPop(gx, gy);
      this.fx.bountyFloat(gx, gy, rg, rw);
      this.fx.goldToTower(gx, gy, toX, toY, rg, rw);
      if (killer) this.fx.towerNibble(killer);
      this.fx.flash(Palette.gold, 0.1, 55);
      audio.playKill(this.killCombo);
      this.fx.deathSquash(e, () => {
        e.kill(true);
      });
      this.emitHud();
    }
  }

  private mangonelDust(x: number, y: number): void {
    const g = this.add.graphics().setDepth(45);
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2 + Math.random();
      const rad = 4 + Math.random() * 8;
      g.fillStyle(Palette.dirt, 0.45);
      g.fillCircle(x + Math.cos(ang) * rad, y + Math.sin(ang) * rad * 0.55, 2 + Math.random() * 2);
    }
    g.fillStyle(Palette.slate, 0.3);
    g.fillCircle(x, y, 5);
    this.tweens.add({
      targets: g,
      alpha: 0,
      duration: 280,
      onComplete: () => g.destroy(),
    });
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

  /** Brief real-time slow-mo (wave-clear beat). Does not touch Phaser timeScale. */
  private pulseSlowMo(scale: number, realMs: number): void {
    this.slowMoScale = scale;
    this.slowMoUntilReal = performance.now() + realMs;
    this.tweens.timeScale = scale;
  }

  /** Once-ever A2HS hint after first wave clear or age-up. Not naggy. */
  private maybeOfferA2hs(): void {
    if (this.a2hsOffered) return;
    try {
      if (localStorage.getItem(A2HS_KEY) === '1') {
        this.a2hsOffered = true;
        return;
      }
    } catch {
      /* ignore */
    }
    const nav = navigator as Navigator & { standalone?: boolean };
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
    if (standalone) {
      this.a2hsOffered = true;
      try {
        localStorage.setItem(A2HS_KEY, '1');
      } catch {
        /* ignore */
      }
      return;
    }
    this.a2hsOffered = true;
    this.game.events.emit('keepward-a2hs');
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
    this.maybeOfferWaveTeach();
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
    // Auto-dismiss teach when combat begins (still marked once if skipped earlier)
    if (this.teachMsg && this.teachId && this.teachId !== 'w1') {
      this.persistTeach(this.teachId);
      this.teachMsg = null;
      this.teachId = null;
    }
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
    const { wall, attackPoint, breachPoint } = this.fort.pickSpreadTarget(edge);
    // Spawn along the incoming edge, biased toward the assigned segment.
    const spawn = edgeSpawnPoints(edge, attackPoint);
    const e = this.enemyPool.acquire();
    e.spawn(
      id,
      spawn,
      wall.dir,
      attackPoint,
      breachPoint,
      this.fort.keepPos,
      !!elite,
    );
    // early2: spawn-time HP scale by wave (do not mutate ENEMIES / TUNING base)
    const waveNum = this.waveIndex + 1;
    let hpMult = 1;
    if (waveNum <= 5) hpMult = 0.65;
    else if (waveNum <= 8) hpMult = 0.85;
    if (hpMult !== 1) {
      e.hp = Math.max(1, Math.ceil(e.hp * hpMult));
      e.maxHp = e.hp;
    }
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
