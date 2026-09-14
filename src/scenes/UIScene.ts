import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../data/map';
import { applyLockedView } from '../utils/view';
import { Palette } from '../data/palette';
import { AGE_GEM } from '../data/artBible';
import { TOWERS, TRACK_LABELS, type TowerId, type UpgradeTrack } from '../data/towers';
import { TUNING } from '../data/tuning';
import { audio } from '../systems/AudioSystem';
import type { GameScene, GameHudState } from './GameScene';
import type { KeepTab } from '../data/keepResearch';

export class UIScene extends Phaser.Scene {
  private gameScene!: GameScene;
  private woodText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private ageText!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;
  private overlay?: Phaser.GameObjects.Container;
  private teachOverlay?: Phaser.GameObjects.Container;
  private trayBtns: {
    id: TowerId;
    bg: Phaser.GameObjects.Rectangle;
    label: Phaser.GameObjects.Text;
    cost: Phaser.GameObjects.Text;
    pressed: boolean;
  }[] = [];
  private ageBtn!: Phaser.GameObjects.Rectangle;
  private ageBtnLabel!: Phaser.GameObjects.Text;
  private wallBtn!: Phaser.GameObjects.Rectangle;
  private wallBtnLabel!: Phaser.GameObjects.Text;
  private pauseBtn!: Phaser.GameObjects.Rectangle;
  private pauseLabel!: Phaser.GameObjects.Text;
  private muteBtn!: Phaser.GameObjects.Rectangle;
  private muteLabel!: Phaser.GameObjects.Text;
  private panel?: Phaser.GameObjects.Container;
  /** Avoid destroy+rebuild every HUD tick (Safari input death) */
  private sheetKey = '';
  private startWaveArmed = false;
  private trayInteractive = new Map<string, boolean>();
  private channelBar!: Phaser.GameObjects.Graphics;
  private tipText!: Phaser.GameObjects.Text;
  private dockDragId: TowerId | null = null;
  private startWaveBtn!: Phaser.GameObjects.Rectangle;
  private startWaveLabel!: Phaser.GameObjects.Text;
  private buildCountdownText!: Phaser.GameObjects.Text;
  private incomingBanner!: Phaser.GameObjects.Text;

  constructor() {
    super('UI');
  }

  init(data: { game: GameScene }): void {
    this.gameScene = data.game;
  }

  create(): void {
    applyLockedView(this);
    // Safe-area friendly top band — pause/wave/gold stay top
    const topY = 22;
    this.add.rectangle(GAME_W / 2, topY + 6, GAME_W, 52, Palette.hudBg, 0.9).setDepth(100);

    this.woodText = this.add
      .text(10, topY, 'W 100', { fontSize: '14px', color: '#C4A35A', fontFamily: 'system-ui', fontStyle: 'bold' })
      .setDepth(101);
    this.goldText = this.add
      .text(78, topY, 'G 60', { fontSize: '14px', color: '#D4A84B', fontFamily: 'system-ui', fontStyle: 'bold' })
      .setDepth(101);
    this.waveText = this.add
      .text(150, topY, 'Wave 1/50', { fontSize: '13px', color: '#F0EBE0', fontFamily: 'system-ui' })
      .setDepth(101);

    this.ageText = this.add
      .text(GAME_W / 2, topY + 22, 'Dark Age', {
        fontSize: '10px',
        color: '#A0A090',
        fontFamily: 'system-ui',
      })
      .setOrigin(0.5, 0)
      .setDepth(101);

    this.channelBar = this.add.graphics().setDepth(102);

    // Mute — ≥44pt
    this.muteBtn = this.add
      .rectangle(GAME_W - 78, topY + 8, 44, 44, Palette.hudPanel, 0.95)
      .setStrokeStyle(1, Palette.stone)
      .setInteractive({ useHandCursor: true })
      .setDepth(102);
    this.muteLabel = this.add
      .text(GAME_W - 78, topY + 8, '🔊', {
        fontSize: '16px',
        color: '#F0EBE0',
        fontFamily: 'system-ui',
      })
      .setOrigin(0.5)
      .setDepth(103);
    this.muteBtn.on('pointerup', () => this.gameScene.toggleMute());

    this.pauseBtn = this.add
      .rectangle(GAME_W - 28, topY + 8, 44, 44, Palette.hudPanel, 0.95)
      .setStrokeStyle(1, Palette.stone)
      .setInteractive({ useHandCursor: true })
      .setDepth(102);
    this.pauseLabel = this.add
      .text(GAME_W - 28, topY + 8, '❚❚', {
        fontSize: '14px',
        color: '#F0EBE0',
        fontFamily: 'system-ui',
      })
      .setOrigin(0.5)
      .setDepth(103);
    this.pauseBtn.on('pointerup', () => this.gameScene.togglePause());

    // Bottom dock tray — 2-row compact tower buttons + age/wall
    const trayY = GAME_H - 78;
    this.add.rectangle(GAME_W / 2, trayY + 22, GAME_W, 128, Palette.hudBg, 0.95).setDepth(100);

    // Row 1: Dark + Feudal staples
    this.buildTowerButton('watchtower', 48, trayY - 22, 72);
    this.buildTowerButton('mangonel', 122, trayY - 22, 72);
    // Row 2: Feudal unlocks
    this.buildTowerButton('spearPost', 48, trayY + 26, 72);
    this.buildTowerButton('longbow', 122, trayY + 26, 72);

    this.ageBtn = this.add
      .rectangle(245, trayY - 6, 88, 44, Palette.feudal)
      .setStrokeStyle(2, Palette.ochreDark)
      .setInteractive({ useHandCursor: true })
      .setDepth(102);
    this.ageBtnLabel = this.add
      .text(245, trayY - 6, 'AGE UP', {
        fontSize: '11px',
        color: '#1A2A22',
        fontFamily: 'system-ui',
        align: 'center',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(103);
    this.ageBtn.on('pointerup', () => {
      audio.unlock();
      this.gameScene.tryAgeUp();
    });

    this.wallBtn = this.add
      .rectangle(335, trayY - 6, 88, 44, Palette.slate)
      .setStrokeStyle(2, Palette.stone)
      .setInteractive({ useHandCursor: true })
      .setDepth(102);
    this.wallBtnLabel = this.add
      .text(335, trayY - 6, 'WALL\nUPG', {
        fontSize: '10px',
        color: '#F0EBE0',
        fontFamily: 'system-ui',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(103);
    this.wallBtn.on('pointerup', () => {
      audio.unlock();
      const s = this.gameScene.getHudState();
      if (s.wallUpgradeAvailable) this.gameScene.tryWallUpgrade(s.wallUpgradeAvailable);
    });

    this.tipText = this.add
      .text(GAME_W / 2, trayY + 52, 'Hold dock · drag to place · lift to commit', {
        fontSize: '9px',
        color: '#A0A090',
        fontFamily: 'system-ui',
      })
      .setOrigin(0.5)
      .setDepth(101);

    // Build phase: big thumb Start Wave (~56pt) + countdown + incoming banner
    this.buildCountdownText = this.add
      .text(GAME_W / 2, 72, '', {
        fontSize: '18px',
        color: '#F0EBE0',
        fontFamily: 'system-ui',
        fontStyle: 'bold',
        backgroundColor: '#1A2A22cc',
        padding: { x: 10, y: 4 },
      })
      .setOrigin(0.5, 0)
      .setDepth(120)
      .setVisible(false);

    this.incomingBanner = this.add
      .text(GAME_W / 2, 102, '', {
        fontSize: '16px',
        color: '#F0EBE0',
        fontFamily: 'system-ui',
        fontStyle: 'bold',
        backgroundColor: '#8B3A3Acc',
        padding: { x: 12, y: 5 },
      })
      .setOrigin(0.5, 0)
      .setDepth(120)
      .setVisible(false);

    const startY = GAME_H - 188;
    this.startWaveBtn = this.add
      .rectangle(GAME_W / 2, startY, 220, 56, Palette.ochre)
      .setStrokeStyle(3, Palette.gold)
      .setInteractive({ useHandCursor: true })
      .setDepth(130)
      .setVisible(false);
    this.startWaveLabel = this.add
      .text(GAME_W / 2, startY, 'START WAVE', {
        fontSize: '20px',
        color: '#1A2A22',
        fontFamily: 'system-ui',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(131)
      .setVisible(false);
    this.startWaveBtn.on('pointerdown', () => {
      this.startWaveArmed = true;
      this.startWaveBtn.setScale(0.96);
    });
    this.startWaveBtn.on('pointerout', () => {
      this.startWaveArmed = false;
      this.startWaveBtn.setScale(1);
    });
    this.startWaveBtn.on('pointerup', () => {
      this.startWaveBtn.setScale(1);
      // Ignore release-over after dock-drag (iOS lifts onto Start Wave)
      if (!this.startWaveArmed) return;
      this.startWaveArmed = false;
      audio.unlock();
      this.gameScene.startWaveNow();
    });

    this.toastText = this.add
      .text(GAME_W / 2, GAME_H * 0.36, '', {
        fontSize: '15px',
        color: '#F0EBE0',
        fontFamily: 'Georgia, serif',
        backgroundColor: '#1A2A22cc',
        padding: { x: 12, y: 6 },
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(200)
      .setAlpha(0);

    // Global pointer for dock-drag continuation into game world
    this.input.on('pointermove', this.onGlobalMove, this);
    this.input.on('pointerup', this.onGlobalUp, this);
    // iOS Safari often sends pointercancel / lost pointer instead of up
    this.input.on('pointerupoutside', this.onGlobalUp, this);
    this.input.on('gameout', this.onGlobalCancel, this);

    this.game.events.on('keepward-hud', this.refresh, this);
    this.game.events.on('keepward-toast', this.showToast, this);
    this.events.once('shutdown', () => {
      this.game.events.off('keepward-hud', this.refresh, this);
      this.game.events.off('keepward-toast', this.showToast, this);
      this.input.off('pointermove', this.onGlobalMove, this);
      this.input.off('pointerup', this.onGlobalUp, this);
      this.input.off('pointerupoutside', this.onGlobalUp, this);
      this.input.off('gameout', this.onGlobalCancel, this);
    });

    this.refresh(this.gameScene.getHudState());
  }

  private buildTowerButton(id: TowerId, x: number, y: number, w = 84): void {
    const def = TOWERS[id];
    const bg = this.add
      .rectangle(x, y - 6, w, 44, Palette.hudPanel)
      .setStrokeStyle(2, Palette.stone)
      .setInteractive({ useHandCursor: true })
      .setDepth(102);
    const short =
      id === 'spearPost' ? 'Spear' : id === 'longbow' ? 'Longbow' : def.name.split(' ')[0];
    const label = this.add
      .text(x, y - 14, short, {
        fontSize: '11px',
        color: '#F0EBE0',
        fontFamily: 'system-ui',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(103);
    const cost = this.add
      .text(x, y + 6, `${def.costWood}W ${def.costGold}G`, {
        fontSize: '9px',
        color: '#C4A35A',
        fontFamily: 'system-ui',
      })
      .setOrigin(0.5)
      .setDepth(103);

    const entry = { id, bg, label, cost, pressed: false };
    this.trayBtns.push(entry);

    bg.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      audio.unlock();
      const state = this.gameScene.getHudState();
      if (!state.unlocked.includes(id) || state.paused || state.status !== 'playing') return;
      entry.pressed = true;
      bg.setScale(0.92);
      bg.setFillStyle(Palette.ochreDark);
      this.dockDragId = id;
      this.gameScene.selectBuildTower(id);
      // Start ghost immediately — drag from dock
      this.gameScene.beginDockPlace(id, ptr.x, ptr.y);
    });
  }

  private onGlobalMove = (ptr: Phaser.Input.Pointer): void => {
    if (!this.dockDragId) return;
    this.gameScene.updateDockPlace(ptr.x, ptr.y);
  };

  private clearDockPress(id: string): void {
    for (const btn of this.trayBtns) {
      if (btn.id === id) {
        btn.pressed = false;
        btn.bg.setScale(1);
      }
    }
  }

  private onGlobalUp = (ptr: Phaser.Input.Pointer): void => {
    if (!this.dockDragId) return;
    const id = this.dockDragId;
    this.dockDragId = null;
    // Same lift must NOT arm Start Wave (finger often ends over the button)
    this.startWaveArmed = false;
    this.startWaveBtn.setScale(1);
    this.clearDockPress(id);
    this.gameScene.endDockPlace(ptr.x, ptr.y);
  };

  /** touchcancel / finger left canvas — must release drag or input stays dead */
  private onGlobalCancel = (): void => {
    this.startWaveArmed = false;
    this.startWaveBtn.setScale(1);
    if (!this.dockDragId) {
      this.gameScene.cancelDockDrag();
      return;
    }
    const id = this.dockDragId;
    this.dockDragId = null;
    this.clearDockPress(id);
    this.gameScene.cancelDockDrag();
  };

  private showToast = (msg: string): void => {
    this.toastText.setText(msg);
    this.toastText.setAlpha(1);
    this.tweens.killTweensOf(this.toastText);
    this.tweens.add({
      targets: this.toastText,
      alpha: 0,
      delay: 1400,
      duration: 400,
    });
  };

  private refresh = (state: GameHudState): void => {
    this.woodText.setText(`W ${state.wood}`);
    this.goldText.setText(`G ${state.gold}`);
    this.waveText.setText(`Wave ${state.wave}/${state.maxWaves}`);
    this.ageText.setText(`${state.ageName} · ${state.layoutName}`);

    this.muteLabel.setText(state.muted ? '🔇' : '🔊');

    this.channelBar.clear();
    if (state.aging) {
      this.channelBar.fillStyle(0x000000, 0.5);
      this.channelBar.fillRect(60, 46, 200, 5);
      this.channelBar.fillStyle(Palette.imperial, 1);
      this.channelBar.fillRect(60, 46, 200 * state.ageChannelPct, 5);
    }

    for (const btn of this.trayBtns) {
      const def = TOWERS[btn.id];
      const unlocked = state.unlocked.includes(btn.id);
      const selected = state.selectedTower === btn.id;
      const canAfford = state.wood >= def.costWood && state.gold >= def.costGold;
      if (!btn.pressed) {
        btn.bg.setFillStyle(selected ? Palette.ochreDark : Palette.hudPanel);
        btn.bg.setScale(1);
      }
      btn.bg.setStrokeStyle(2, selected || btn.pressed ? Palette.ochre : unlocked ? Palette.stone : Palette.slate);
      btn.bg.setAlpha(unlocked ? 1 : 0.35);
      btn.label.setAlpha(unlocked ? 1 : 0.35);
      btn.cost.setColor(canAfford && unlocked ? '#C4A35A' : '#8B3A3A');
      const wantInteractive = unlocked && state.status === 'playing' && !state.paused;
      if (this.trayInteractive.get(btn.id) !== wantInteractive) {
        this.trayInteractive.set(btn.id, wantInteractive);
        if (wantInteractive) btn.bg.setInteractive({ useHandCursor: true });
        else btn.bg.disableInteractive();
      }
    }

    // Age Up lives on Keep research sheet — hide standalone dock button
    this.ageBtn.setVisible(false);
    this.ageBtnLabel.setVisible(false);
    this.ageBtn.disableInteractive();

    if (state.wallUpgradeAvailable) {
      this.wallBtn.setVisible(true);
      this.wallBtnLabel.setVisible(true);
      const u =
        state.wallUpgradeAvailable === 'hardenedTimbers'
          ? TUNING.wallUpgrades.hardenedTimbers
          : TUNING.wallUpgrades.stoneFacing;
      this.wallBtnLabel.setText(`${u.name.split(' ')[0]}\n${u.costWood}W ${u.costGold}G`);
      const can = state.wood >= u.costWood && state.gold >= u.costGold;
      this.wallBtn.setFillStyle(can ? Palette.wood : Palette.slate);
      this.wallBtn.setAlpha(can ? 1 : 0.5);
    } else {
      this.wallBtn.setVisible(false);
      this.wallBtnLabel.setVisible(false);
    }

    this.pauseLabel.setText(state.paused ? '▶' : '❚❚');

    const inBuild = state.buildPhase && !state.paused;
    this.startWaveBtn.setVisible(inBuild && !state.selectedPlaced && !state.selectedKeep);
    this.startWaveLabel.setVisible(inBuild && !state.selectedPlaced && !state.selectedKeep);
    this.buildCountdownText.setVisible(inBuild);
    this.incomingBanner.setVisible(inBuild && !!state.nextEdge);
    if (inBuild) {
      this.buildCountdownText.setText(`Build ${state.buildCountdownSec}s`);
      if (state.nextEdge) {
        const side =
          state.nextEdge === 'N'
            ? 'NORTH'
            : state.nextEdge === 'S'
              ? 'SOUTH'
              : state.nextEdge === 'E'
                ? 'EAST'
                : 'WEST';
        this.incomingBanner.setText(`⚔ Incoming ${side}`);
      }
      this.tipText.setText('Tap wall to repair · Tap BREACH to rebuild');
      this.tipText.setVisible(!state.selectedPlaced && !state.selectedKeep);
    } else {
      this.tipText.setText('Tap Keep to age / research · Hold dock to place');
      this.tipText.setVisible(!state.selectedPlaced && !state.selectedKeep);
    }

    this.updateBottomSheet(state);
    this.updateTeach(state);

    if (state.paused && state.status === 'playing') {
      if (!this.overlay) this.showOverlay('PAUSED', 'Tap Resume to continue', true);
    } else if (state.status === 'won') {
      if (!this.overlay) this.showOverlay('VICTORY', 'The keep stands strong!', false);
    } else if (state.status === 'lost') {
      if (!this.overlay) this.showOverlay('DEFEAT', 'The keep has fallen…', false);
    } else if (this.overlay) {
      this.clearOverlay();
    }
  };

  /** Thumb HUD: tower upgrades OR Keep research hall */
  private updateBottomSheet(state: GameHudState): void {
    if (state.selectedKeep) {
      this.updateKeepSheet(state);
      return;
    }
    if (!state.selectedPlaced) {
      if (this.panel) {
        const dead = this.panel;
        this.panel = undefined;
        this.sheetKey = '';
        this.time.delayedCall(0, () => {
          if (dead.active) dead.destroy(true);
        });
      }
      return;
    }

    const sp = state.selectedPlaced;
    const key = [
      'tower',
      sp.id,
      sp.kills,
      sp.ranks.rof,
      sp.ranks.range,
      sp.ranks.damage,
      sp.can.rof ? 1 : 0,
      sp.can.range ? 1 : 0,
      sp.can.damage ? 1 : 0,
      sp.canUndo ? 1 : 0,
      sp.sellWood,
      sp.sellGold,
      sp.costs.rof?.wood ?? -1,
      sp.costs.range?.wood ?? -1,
      sp.costs.damage?.wood ?? -1,
      state.wood,
      state.gold,
    ].join('|');
    if (this.panel && key === this.sheetKey) return;
    this.sheetKey = key;
    if (this.panel) {
      this.panel.destroy(true);
      this.panel = undefined;
    }

    const c = this.add.container(GAME_W / 2, GAME_H - 188).setDepth(150);
    const bg = this.add
      .rectangle(0, 0, 370, 100, Palette.hudPanel, 0.97)
      .setStrokeStyle(2, Palette.ochre);
    const title = this.add
      .text(-175, -38, `${TOWERS[sp.id].name} · ${sp.kills} kills`, {
        fontSize: '13px',
        color: '#C4A35A',
        fontFamily: 'system-ui',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    const tracks: UpgradeTrack[] = ['rof', 'range', 'damage'];
    const btns: Phaser.GameObjects.GameObject[] = [bg, title];
    tracks.forEach((track, i) => {
      const x = -115 + i * 78;
      const rank = sp.ranks[track];
      const cost = sp.costs[track];
      const can = sp.can[track] && !!cost && state.wood >= cost.wood && state.gold >= cost.gold;
      const unlocked = sp.can[track];
      const btn = this.add
        .rectangle(x, 8, 72, 44, can ? Palette.ochreDark : Palette.slate)
        .setStrokeStyle(1, can ? Palette.ochre : Palette.stone)
        .setInteractive({ useHandCursor: true });
      const short = TRACK_LABELS[track].split(' ')[0];
      const label = this.add
        .text(
          x,
          8,
          `${short}\n${rank}/3 ${cost ? `${cost.wood}W` : 'MAX'}`,
          {
            fontSize: '10px',
            color: '#F0EBE0',
            fontFamily: 'system-ui',
            align: 'center',
          },
        )
        .setOrigin(0.5);
      btn.on('pointerup', () => this.gameScene.tryUpgradeTrack(track));
      if (!unlocked && rank < 3) btn.setAlpha(0.55);
      btns.push(btn, label);
    });

    const sellX = 148;
    const sellBtn = this.add
      .rectangle(sellX, 8, 64, 44, sp.canUndo ? Palette.feudal : Palette.blood)
      .setStrokeStyle(1, Palette.ochre)
      .setInteractive({ useHandCursor: true });
    const sellLabel = this.add
      .text(
        sellX,
        8,
        `${sp.canUndo ? 'Undo' : 'Sell'}\n${sp.sellWood}W${sp.sellGold}G`,
        {
          fontSize: '10px',
          color: '#F0EBE0',
          fontFamily: 'system-ui',
          align: 'center',
          fontStyle: 'bold',
        },
      )
      .setOrigin(0.5);
    sellBtn.on('pointerup', () => this.gameScene.sellOrUndoSelected());
    btns.push(sellBtn, sellLabel);

    const close = this.add
      .text(170, -38, '✕', { fontSize: '16px', color: '#A0A090', fontFamily: 'system-ui' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    close.setPadding(8, 8, 8, 8);
    close.on('pointerup', () => this.gameScene.clearPlacedSelection());
    btns.push(close);

    c.add(btns);
    this.panel = c;
  }

  private updateKeepSheet(state: GameHudState): void {
    const sk = state.selectedKeep!;
    const key = [
      'keep',
      sk.tab,
      sk.keepHp,
      sk.keepMaxHp,
      sk.aging ? 1 : 0,
      Math.floor(sk.ageChannelPct * 20),
      sk.canAgeUp ? 1 : 0,
      sk.ageCostWood,
      sk.ageCostGold,
      state.wood,
      state.gold,
      ...sk.attack.map((a) => `${a.id}:${a.owned?1:0}:${a.available?1:0}:${a.affordable?1:0}`),
      ...sk.defense.map((a) => `${a.id}:${a.owned?1:0}:${a.available?1:0}:${a.affordable?1:0}`),
      ...sk.siege.map((a) => `${a.id}:${a.owned?1:0}:${a.available?1:0}:${a.affordable?1:0}`),
    ].join('|');
    if (this.panel && key === this.sheetKey) return;
    this.sheetKey = key;
    if (this.panel) {
      this.panel.destroy(true);
      this.panel = undefined;
    }

    const c = this.add.container(GAME_W / 2, GAME_H - 210).setDepth(150);
    const bg = this.add
      .rectangle(0, 0, 380, 148, Palette.hudPanel, 0.98)
      .setStrokeStyle(2, Palette.ochre);
    const title = this.add
      .text(-180, -60, `Keep · ${sk.keepHp}/${sk.keepMaxHp} HP`, {
        fontSize: '13px',
        color: '#C4A35A',
        fontFamily: 'system-ui',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);
    const kids: Phaser.GameObjects.GameObject[] = [bg, title];

    const tabs: { id: KeepTab; label: string }[] = [
      { id: 'age', label: 'Age' },
      { id: 'attack', label: 'Atk' },
      { id: 'defense', label: 'Def' },
      { id: 'siege', label: 'Siege' },
    ];
    tabs.forEach((tab, i) => {
      const x = -130 + i * 70;
      const on = sk.tab === tab.id;
      const btn = this.add
        .rectangle(x, -34, 64, 24, on ? Palette.ochreDark : Palette.slate)
        .setStrokeStyle(1, on ? Palette.gold : Palette.stone)
        .setInteractive({ useHandCursor: true });
      const lab = this.add
        .text(x, -34, tab.label, {
          fontSize: '11px',
          color: on ? '#F0EBE0' : '#A0A090',
          fontFamily: 'system-ui',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      btn.on('pointerup', () => this.gameScene.setKeepSheetTab(tab.id));
      kids.push(btn, lab);
    });

    if (sk.tab === 'age') {
      if (sk.aging) {
        const lab = this.add
          .text(0, 20, `Channeling… ${Math.floor(sk.ageChannelPct * 100)}%`, {
            fontSize: '14px',
            color: '#D4A84B',
            fontFamily: 'system-ui',
            fontStyle: 'bold',
          })
          .setOrigin(0.5);
        kids.push(lab);
      } else if (sk.canAgeUp && sk.nextAgeName) {
        const can = state.wood >= sk.ageCostWood && state.gold >= sk.ageCostGold;
        const btn = this.add
          .rectangle(0, 18, 200, 48, AGE_GEM[state.age])
          .setStrokeStyle(2, can ? Palette.gold : Palette.stone)
          .setAlpha(can ? 1 : 0.55)
          .setInteractive({ useHandCursor: true });
        const gemDark = state.age === 'dark' || state.age === 'feudal';
        const lab = this.add
          .text(0, 18, `AGE UP → ${sk.nextAgeName}\n${sk.ageCostWood}W ${sk.ageCostGold}G`, {
            fontSize: '12px',
            color: gemDark ? '#F0EBE0' : '#1A2A22',
            fontFamily: 'system-ui',
            align: 'center',
            fontStyle: 'bold',
          })
          .setOrigin(0.5);
        btn.on('pointerup', () => this.gameScene.tryAgeUp());
        kids.push(btn, lab);
      } else {
        const lab = this.add
          .text(0, 18, 'Imperial Age — max', {
            fontSize: '13px',
            color: '#A0A090',
            fontFamily: 'system-ui',
          })
          .setOrigin(0.5);
        kids.push(lab);
      }
    } else {
      const rows =
        sk.tab === 'attack' ? sk.attack : sk.tab === 'defense' ? sk.defense : sk.siege;
      rows.forEach((item, i) => {
        const x = -135 + (i % 4) * 90;
        const y = 8 + Math.floor(i / 4) * 52;
        const stub = !!item.stub;
        const owned = item.owned;
        const can = !stub && item.affordable;
        const locked = !stub && !owned && !item.available;
        let fill: number = Palette.slate;
        if (owned) fill = Palette.forest;
        else if (can) fill = Palette.ochreDark;
        else if (stub || locked) fill = 0x3a4038;
        const btn = this.add
          .rectangle(x, y, 84, 44, fill)
          .setStrokeStyle(1, can ? Palette.gold : owned ? Palette.ochre : Palette.stone)
          .setAlpha(stub || locked ? 0.45 : 1);
        if (!stub && !owned) btn.setInteractive({ useHandCursor: true });
        const costLine = stub
          ? 'Soon'
          : owned
            ? 'OWNED'
            : locked
              ? 'Locked'
              : `${item.wood}W ${item.gold}G`;
        const lab = this.add
          .text(x, y, `${item.short}\n${costLine}`, {
            fontSize: '9px',
            color: '#F0EBE0',
            fontFamily: 'system-ui',
            align: 'center',
          })
          .setOrigin(0.5);
        if (!stub && !owned) {
          btn.on('pointerup', () => this.gameScene.tryKeepResearch(item.id));
        }
        kids.push(btn, lab);
      });
    }

    const close = this.add
      .text(172, -60, '✕', { fontSize: '16px', color: '#A0A090', fontFamily: 'system-ui' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    close.setPadding(8, 8, 8, 8);
    close.on('pointerup', () => this.gameScene.clearPlacedSelection());
    kids.push(close);

    c.add(kids);
    this.panel = c;
  }

  private updateTeach(state: GameHudState): void {
    if (!state.teach) {
      if (this.teachOverlay) {
        const dead = this.teachOverlay;
        this.teachOverlay = undefined;
        this.time.delayedCall(0, () => {
          if (dead.active) dead.destroy(true);
        });
      }
      return;
    }
    if (this.teachOverlay) return;

    const c = this.add.container(GAME_W / 2, GAME_H * 0.42).setDepth(250);
    const bg = this.add
      .rectangle(0, 0, 300, 72, Palette.hudPanel, 0.92)
      .setStrokeStyle(2, Palette.ochre)
      .setInteractive({ useHandCursor: true });
    // ≤8 words teach-through-play
    const msg = this.add
      .text(0, -8, state.teach, {
        fontSize: '16px',
        color: '#F0EBE0',
        fontFamily: 'system-ui',
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5);
    const skip = this.add
      .text(0, 22, 'Tap to skip', {
        fontSize: '11px',
        color: '#A0A090',
        fontFamily: 'system-ui',
      })
      .setOrigin(0.5);
    const dismiss = () => this.gameScene.skipTeach();
    bg.on('pointerup', dismiss);
    msg.setInteractive({ useHandCursor: true }).on('pointerup', dismiss);
    skip.setInteractive({ useHandCursor: true }).on('pointerup', dismiss);
    c.add([bg, msg, skip]);
    this.teachOverlay = c;
  }

  private showOverlay(title: string, sub: string, isPause: boolean): void {
    this.clearOverlay();
    const c = this.add.container(GAME_W / 2, GAME_H / 2).setDepth(300);
    const bg = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.55);
    const panel = this.add.rectangle(0, 0, 280, 200, Palette.hudPanel).setStrokeStyle(2, Palette.ochre);
    const t = this.add
      .text(0, -50, title, { fontSize: '28px', color: '#C4A35A', fontFamily: 'Georgia, serif' })
      .setOrigin(0.5);
    const s = this.add
      .text(0, -10, sub, { fontSize: '14px', color: '#F0EBE0', fontFamily: 'system-ui' })
      .setOrigin(0.5);

    const resumeBtn = this.add
      .rectangle(0, 50, 160, 48, Palette.ochre)
      .setInteractive({ useHandCursor: true });
    const resumeLabel = this.add
      .text(0, 50, isPause ? 'RESUME' : 'AGAIN', {
        fontSize: '18px',
        color: '#1A2A22',
        fontFamily: 'Georgia, serif',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    resumeBtn.on('pointerup', () => {
      if (isPause) this.gameScene.setPaused(false);
      else this.gameScene.restart();
    });

    const menuBtn = this.add
      .text(0, 95, 'Menu', { fontSize: '14px', color: '#A0A090', fontFamily: 'system-ui' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    menuBtn.on('pointerup', () => this.gameScene.goMenu());

    c.add([bg, panel, t, s, resumeBtn, resumeLabel, menuBtn]);
    this.overlay = c;
  }

  private clearOverlay(): void {
    if (this.overlay) {
      this.overlay.destroy(true);
      this.overlay = undefined;
    }
  }
}
