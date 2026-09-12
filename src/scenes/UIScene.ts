import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../data/map';
import { Palette } from '../data/palette';
import { TOWERS, type TowerId } from '../data/towers';
import type { GameScene, GameHudState } from './GameScene';

export class UIScene extends Phaser.Scene {
  private gameScene!: GameScene;
  private woodText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private ageText!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;
  private overlay?: Phaser.GameObjects.Container;
  private trayBtns: { id: TowerId; bg: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text; cost: Phaser.GameObjects.Text }[] = [];
  private ageBtn!: Phaser.GameObjects.Rectangle;
  private ageBtnLabel!: Phaser.GameObjects.Text;
  private pauseBtn!: Phaser.GameObjects.Rectangle;
  private pauseLabel!: Phaser.GameObjects.Text;

  constructor() {
    super('UI');
  }

  init(data: { game: GameScene }): void {
    this.gameScene = data.game;
  }

  create(): void {
    const topY = 18;
    // Top HUD bar
    this.add.rectangle(GAME_W / 2, topY + 8, GAME_W, 44, Palette.hudBg, 0.85).setDepth(100);

    this.woodText = this.add
      .text(10, topY, 'Wood 100', { fontSize: '14px', color: '#C4A35A', fontFamily: 'system-ui' })
      .setDepth(101);
    this.goldText = this.add
      .text(95, topY, 'Gold 80', { fontSize: '14px', color: '#D4A84B', fontFamily: 'system-ui' })
      .setDepth(101);
    this.livesText = this.add
      .text(185, topY, 'Lives 20', { fontSize: '14px', color: '#E08080', fontFamily: 'system-ui' })
      .setDepth(101);
    this.waveText = this.add
      .text(268, topY, 'W 1/10', { fontSize: '14px', color: '#F0EBE0', fontFamily: 'system-ui' })
      .setDepth(101);

    this.ageText = this.add
      .text(GAME_W / 2, topY + 22, 'Dark Age', {
        fontSize: '11px',
        color: '#A0A090',
        fontFamily: 'system-ui',
      })
      .setOrigin(0.5, 0)
      .setDepth(101);

    // Pause button (top-right, ≥44px)
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

    // Bottom tray
    const trayY = GAME_H - 70;
    this.add.rectangle(GAME_W / 2, trayY + 20, GAME_W, 100, Palette.hudBg, 0.92).setDepth(100);

    this.buildTowerButton('watchtower', 70, trayY);
    this.buildTowerButton('mangonel', 175, trayY);

    // Age Up button
    this.ageBtn = this.add
      .rectangle(300, trayY, 100, 52, Palette.feudal)
      .setStrokeStyle(2, Palette.ochreDark)
      .setInteractive({ useHandCursor: true })
      .setDepth(102);
    this.ageBtnLabel = this.add
      .text(300, trayY, 'AGE UP\n120Wood 100🪙', {
        fontSize: '11px',
        color: '#1A2A22',
        fontFamily: 'system-ui',
        align: 'center',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(103);
    this.ageBtn.on('pointerup', () => this.gameScene.tryAgeUp());

    // Toast
    this.toastText = this.add
      .text(GAME_W / 2, GAME_H * 0.4, '', {
        fontSize: '18px',
        color: '#F0EBE0',
        fontFamily: 'Georgia, serif',
        backgroundColor: '#1A2A22cc',
        padding: { x: 14, y: 8 },
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
      .rectangle(x, y, 88, 52, Palette.hudPanel)
      .setStrokeStyle(2, Palette.stone)
      .setInteractive({ useHandCursor: true })
      .setDepth(102);
    const label = this.add
      .text(x, y - 8, def.name.split(' ')[0], {
        fontSize: '12px',
        color: '#F0EBE0',
        fontFamily: 'system-ui',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(103);
    const cost = this.add
      .text(x, y + 10, `${def.costWood}W ${def.costGold}G`, {
        fontSize: '10px',
        color: '#C4A35A',
        fontFamily: 'system-ui',
      })
      .setOrigin(0.5)
      .setDepth(103);

    bg.on('pointerup', () => this.gameScene.selectTower(id));
    this.trayBtns.push({ id, bg, label, cost });
  }

  private showToast = (msg: string): void => {
    this.toastText.setText(msg);
    this.toastText.setAlpha(1);
    this.tweens.killTweensOf(this.toastText);
    this.tweens.add({
      targets: this.toastText,
      alpha: 0,
      delay: 1600,
      duration: 500,
    });
  };

  private refresh = (state: GameHudState): void => {
    this.woodText.setText(`Wood ${state.wood}`);
    this.goldText.setText(`Gold ${state.gold}`);
    this.livesText.setText(`Lives ${state.lives}`);
    this.waveText.setText(`W ${state.wave}/${state.maxWaves}`);
    this.ageText.setText(state.ageName);

    for (const btn of this.trayBtns) {
      const def = TOWERS[btn.id];
      const unlocked = state.unlocked.includes(btn.id);
      const selected = state.selectedTower === btn.id;
      const canAfford = state.wood >= def.costWood && state.gold >= def.costGold;
      btn.bg.setFillStyle(selected ? Palette.ochreDark : Palette.hudPanel);
      btn.bg.setStrokeStyle(2, selected ? Palette.ochre : unlocked ? Palette.stone : Palette.slate);
      btn.bg.setAlpha(unlocked ? 1 : 0.4);
      btn.label.setAlpha(unlocked ? 1 : 0.4);
      btn.cost.setColor(canAfford && unlocked ? '#C4A35A' : '#8B3A3A');
      btn.bg.disableInteractive();
      if (unlocked && state.status === 'playing' && !state.paused) {
        btn.bg.setInteractive({ useHandCursor: true });
      }
    }

    if (state.canAgeUp) {
      this.ageBtn.setVisible(true);
      this.ageBtnLabel.setVisible(true);
      this.ageBtnLabel.setText(`AGE UP\n${state.ageCostWood}W ${state.ageCostGold}G`);
      const can = state.wood >= state.ageCostWood && state.gold >= state.ageCostGold;
      this.ageBtn.setFillStyle(can ? Palette.feudal : Palette.slate);
      this.ageBtn.setAlpha(can ? 1 : 0.5);
    } else {
      this.ageBtn.setVisible(false);
      this.ageBtnLabel.setVisible(false);
    }

    this.pauseLabel.setText(state.paused ? '▶' : '❚❚');

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
