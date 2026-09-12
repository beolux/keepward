import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../data/map';
import { Palette } from '../data/palette';
import { TOWERS, TRACK_LABELS, type TowerId, type UpgradeTrack } from '../data/towers';
import { TUNING } from '../data/tuning';
import type { GameScene, GameHudState } from './GameScene';

export class UIScene extends Phaser.Scene {
  private gameScene!: GameScene;
  private woodText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private keepText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private ageText!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;
  private overlay?: Phaser.GameObjects.Container;
  private trayBtns: {
    id: TowerId;
    bg: Phaser.GameObjects.Rectangle;
    label: Phaser.GameObjects.Text;
    cost: Phaser.GameObjects.Text;
  }[] = [];
  private ageBtn!: Phaser.GameObjects.Rectangle;
  private ageBtnLabel!: Phaser.GameObjects.Text;
  private wallBtn!: Phaser.GameObjects.Rectangle;
  private wallBtnLabel!: Phaser.GameObjects.Text;
  private pauseBtn!: Phaser.GameObjects.Rectangle;
  private pauseLabel!: Phaser.GameObjects.Text;
  private panel?: Phaser.GameObjects.Container;
  private channelBar!: Phaser.GameObjects.Graphics;

  constructor() {
    super('UI');
  }

  init(data: { game: GameScene }): void {
    this.gameScene = data.game;
  }

  create(): void {
    const topY = 18;
    this.add.rectangle(GAME_W / 2, topY + 8, GAME_W, 44, Palette.hudBg, 0.88).setDepth(100);

    this.woodText = this.add
      .text(8, topY, 'W 100', { fontSize: '13px', color: '#C4A35A', fontFamily: 'system-ui' })
      .setDepth(101);
    this.goldText = this.add
      .text(70, topY, 'G 60', { fontSize: '13px', color: '#D4A84B', fontFamily: 'system-ui' })
      .setDepth(101);
    this.keepText = this.add
      .text(130, topY, 'Keep 1000', { fontSize: '13px', color: '#E08080', fontFamily: 'system-ui' })
      .setDepth(101);
    this.waveText = this.add
      .text(250, topY, 'W 1/50', { fontSize: '13px', color: '#F0EBE0', fontFamily: 'system-ui' })
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

    this.pauseBtn = this.add
      .rectangle(GAME_W - 28, topY + 10, 44, 44, Palette.hudPanel, 0.9)
      .setStrokeStyle(1, Palette.stone)
      .setInteractive({ useHandCursor: true })
      .setDepth(102);
    this.pauseLabel = this.add
      .text(GAME_W - 28, topY + 10, '❚❚', {
        fontSize: '14px',
        color: '#F0EBE0',
        fontFamily: 'system-ui',
      })
      .setOrigin(0.5)
      .setDepth(103);
    this.pauseBtn.on('pointerup', () => this.gameScene.togglePause());

    const trayY = GAME_H - 70;
    this.add.rectangle(GAME_W / 2, trayY + 20, GAME_W, 100, Palette.hudBg, 0.94).setDepth(100);

    this.buildTowerButton('watchtower', 55, trayY);
    this.buildTowerButton('mangonel', 145, trayY);

    this.ageBtn = this.add
      .rectangle(245, trayY - 8, 88, 40, Palette.feudal)
      .setStrokeStyle(2, Palette.ochreDark)
      .setInteractive({ useHandCursor: true })
      .setDepth(102);
    this.ageBtnLabel = this.add
      .text(245, trayY - 8, 'AGE UP', {
        fontSize: '11px',
        color: '#1A2A22',
        fontFamily: 'system-ui',
        align: 'center',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(103);
    this.ageBtn.on('pointerup', () => this.gameScene.tryAgeUp());

    this.wallBtn = this.add
      .rectangle(335, trayY - 8, 88, 40, Palette.slate)
      .setStrokeStyle(2, Palette.stone)
      .setInteractive({ useHandCursor: true })
      .setDepth(102);
    this.wallBtnLabel = this.add
      .text(335, trayY - 8, 'WALL\nUPG', {
        fontSize: '10px',
        color: '#F0EBE0',
        fontFamily: 'system-ui',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(103);
    this.wallBtn.on('pointerup', () => {
      const s = this.gameScene.getHudState();
      if (s.wallUpgradeAvailable) this.gameScene.tryWallUpgrade(s.wallUpgradeAvailable);
    });

    this.add
      .text(GAME_W / 2, trayY + 28, 'Drag/tap inside courtyard to place · Tap tower for upgrades · Tap wall to repair', {
        fontSize: '9px',
        color: '#A0A090',
        fontFamily: 'system-ui',
      })
      .setOrigin(0.5)
      .setDepth(101);

    this.toastText = this.add
      .text(GAME_W / 2, GAME_H * 0.38, '', {
        fontSize: '16px',
        color: '#F0EBE0',
        fontFamily: 'Georgia, serif',
        backgroundColor: '#1A2A22cc',
        padding: { x: 12, y: 6 },
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(200)
      .setAlpha(0);

    this.game.events.on('keepward-hud', this.refresh, this);
    this.game.events.on('keepward-toast', this.showToast, this);
    this.events.once('shutdown', () => {
      this.game.events.off('keepward-hud', this.refresh, this);
      this.game.events.off('keepward-toast', this.showToast, this);
    });

    this.refresh(this.gameScene.getHudState());
  }

  private buildTowerButton(id: TowerId, x: number, y: number): void {
    const def = TOWERS[id];
    const bg = this.add
      .rectangle(x, y - 8, 80, 44, Palette.hudPanel)
      .setStrokeStyle(2, Palette.stone)
      .setInteractive({ useHandCursor: true })
      .setDepth(102);
    const label = this.add
      .text(x, y - 16, def.name.split(' ')[0], {
        fontSize: '11px',
        color: '#F0EBE0',
        fontFamily: 'system-ui',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(103);
    const cost = this.add
      .text(x, y + 2, `${def.costWood}W ${def.costGold}G`, {
        fontSize: '10px',
        color: '#C4A35A',
        fontFamily: 'system-ui',
      })
      .setOrigin(0.5)
      .setDepth(103);

    bg.on('pointerup', () => this.gameScene.selectBuildTower(id));
    this.trayBtns.push({ id, bg, label, cost });
  }

  private showToast = (msg: string): void => {
    this.toastText.setText(msg);
    this.toastText.setAlpha(1);
    this.tweens.killTweensOf(this.toastText);
    this.tweens.add({
      targets: this.toastText,
      alpha: 0,
      delay: 1500,
      duration: 450,
    });
  };

  private refresh = (state: GameHudState): void => {
    this.woodText.setText(`W ${state.wood}`);
    this.goldText.setText(`G ${state.gold}`);
    this.keepText.setText(`Keep ${state.keepHp}`);
    this.waveText.setText(`W ${state.wave}/${state.maxWaves}`);
    this.ageText.setText(`${state.ageName} · ${state.layoutName}`);

    this.channelBar.clear();
    if (state.aging) {
      this.channelBar.fillStyle(0x000000, 0.5);
      this.channelBar.fillRect(60, 42, 270, 5);
      this.channelBar.fillStyle(Palette.imperial, 1);
      this.channelBar.fillRect(60, 42, 270 * state.ageChannelPct, 5);
    }

    for (const btn of this.trayBtns) {
      const def = TOWERS[btn.id];
      const unlocked = state.unlocked.includes(btn.id);
      const selected = state.selectedTower === btn.id;
      const canAfford = state.wood >= def.costWood && state.gold >= def.costGold;
      btn.bg.setFillStyle(selected ? Palette.ochreDark : Palette.hudPanel);
      btn.bg.setStrokeStyle(2, selected ? Palette.ochre : unlocked ? Palette.stone : Palette.slate);
      btn.bg.setAlpha(unlocked ? 1 : 0.35);
      btn.label.setAlpha(unlocked ? 1 : 0.35);
      btn.cost.setColor(canAfford && unlocked ? '#C4A35A' : '#8B3A3A');
      btn.bg.disableInteractive();
      if (unlocked && state.status === 'playing' && !state.paused) {
        btn.bg.setInteractive({ useHandCursor: true });
      }
    }

    if (state.canAgeUp || state.aging) {
      this.ageBtn.setVisible(true);
      this.ageBtnLabel.setVisible(true);
      if (state.aging) {
        this.ageBtnLabel.setText(`AGING\n${Math.floor(state.ageChannelPct * 100)}%`);
        this.ageBtn.setFillStyle(Palette.imperial);
      } else {
        this.ageBtnLabel.setText(`AGE UP\n${state.ageCostWood}W ${state.ageCostGold}G`);
        const can = state.wood >= state.ageCostWood && state.gold >= state.ageCostGold;
        this.ageBtn.setFillStyle(can ? Palette.feudal : Palette.slate);
        this.ageBtn.setAlpha(can ? 1 : 0.5);
      }
    } else {
      this.ageBtn.setVisible(false);
      this.ageBtnLabel.setVisible(false);
    }

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

    this.updateUpgradePanel(state);

    if (state.paused && state.status === 'playing') {
      if (!this.overlay) this.showOverlay('PAUSED', 'Tap Resume to continue', true);
    } else if (state.status === 'won') {
      if (!this.overlay) this.showOverlay('VICTORY', 'The keep stands strong!', false);
    } else if (state.status === 'lost') {
      if (!this.overlay) this.showOverlay('DEFEAT', 'The keep has fallen…', false);
    } else {
      this.clearOverlay();
    }
  };

  private updateUpgradePanel(state: GameHudState): void {
    if (this.panel) {
      this.panel.destroy(true);
      this.panel = undefined;
    }
    if (!state.selectedPlaced) return;

    const sp = state.selectedPlaced;
    const c = this.add.container(GAME_W / 2, GAME_H - 175).setDepth(150);
    const bg = this.add.rectangle(0, 0, 360, 86, Palette.hudPanel, 0.95).setStrokeStyle(1, Palette.ochre);
    const title = this.add
      .text(-170, -34, `${TOWERS[sp.id].name} · ${sp.kills} kills`, {
        fontSize: '12px',
        color: '#C4A35A',
        fontFamily: 'system-ui',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    const tracks: UpgradeTrack[] = ['rof', 'range', 'damage'];
    const btns: Phaser.GameObjects.GameObject[] = [bg, title];
    tracks.forEach((track, i) => {
      const x = -120 + i * 120;
      const rank = sp.ranks[track];
      const cost = sp.costs[track];
      const can = sp.can[track];
      const btn = this.add
        .rectangle(x, 12, 100, 40, can ? Palette.ochreDark : Palette.slate)
        .setStrokeStyle(1, can ? Palette.ochre : Palette.stone)
        .setInteractive({ useHandCursor: true });
      const label = this.add
        .text(x, 12, `${TRACK_LABELS[track]}\nR${rank}/3 ${cost ? `${cost.wood}W${cost.gold}G` : 'MAX'}`, {
          fontSize: '10px',
          color: '#F0EBE0',
          fontFamily: 'system-ui',
          align: 'center',
        })
        .setOrigin(0.5);
      btn.on('pointerup', () => this.gameScene.tryUpgradeTrack(track));
      btns.push(btn, label);
    });

    const close = this.add
      .text(165, -34, '✕', { fontSize: '14px', color: '#A0A090', fontFamily: 'system-ui' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    close.on('pointerup', () => this.gameScene.clearPlacedSelection());
    btns.push(close);

    c.add(btns);
    this.panel = c;
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
