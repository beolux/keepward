import Phaser from 'phaser';
import { Palette } from '../data/palette';
import { GAME_W, GAME_H } from '../data/map';
import { makeQuickFort } from '../data/survey';
import { audio } from '../systems/AudioSystem';
import { FRAME_ORIGIN } from '../data/artBible';
import { hasFrame } from '../art/atlas';
import { applyLockedView } from '../utils/view';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    applyLockedView(this);
    const width = GAME_W;
    const height = GAME_H;
    this.cameras.main.setBackgroundColor(Palette.bg);

    const g = this.add.graphics();
    g.fillStyle(Palette.grassDark, 1);
    g.fillRect(0, 0, width, height);
    g.fillStyle(Palette.grass, 0.4);
    for (let i = 0; i < 40; i++) {
      g.fillCircle(Phaser.Math.Between(0, width), Phaser.Math.Between(0, height), Phaser.Math.Between(8, 24));
    }

    if (hasFrame(this, 'keep')) {
      const o = FRAME_ORIGIN.keep;
      this.add
        .image(width / 2, height * 0.28, 'keepward', 'keep')
        .setOrigin(o.x, o.y)
        .setScale(1.35);
    } else {
      const keep = this.add.graphics();
      keep.fillStyle(Palette.slate, 1);
      keep.fillRoundedRect(width / 2 - 40, height * 0.22, 80, 70, 4);
      keep.fillStyle(Palette.ochre, 1);
      for (let i = -32; i <= 28; i += 16) {
        keep.fillRect(width / 2 + i, height * 0.22 - 18, 12, 20);
      }
      keep.fillStyle(Palette.dirtDark, 1);
      keep.fillRect(width / 2 - 10, height * 0.22 + 35, 20, 35);
    }

    this.add
      .text(width / 2, height * 0.12, 'KEEPWARD', {
        fontFamily: 'Georgia, serif',
        fontSize: '42px',
        color: '#B8862D',
        stroke: '#1A2A22',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.add
      .text(
        width / 2,
        height * 0.42,
        'Survey your palisade. Confirm. Hold the Keep.\nWalls fall. Breach. 50 waves · Age up · Upgrade by kills.',
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '14px',
          color: '#F0EBE0',
          align: 'center',
          lineSpacing: 5,
        },
      )
      .setOrigin(0.5);

    this.makeStartBtn(width / 2, height * 0.58, 'SURVEY FORT', true, () => {
      audio.unlock();
      this.scene.start('Survey');
    });
    this.makeStartBtn(width / 2, height * 0.58 + 62, 'Quick fort', false, () => {
      audio.unlock();
      this.scene.start('Game', { survey: makeQuickFort() });
    });

    this.add
      .text(width / 2, height * 0.92, 'Portrait · Drag-to-place · PWA', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#A0A090',
      })
      .setOrigin(0.5);

    // Unlock audio on any menu interaction
    this.input.once('pointerdown', () => audio.unlock());
  }

  private makeStartBtn(
    x: number,
    y: number,
    text: string,
    primary: boolean,
    fn: () => void,
  ): void {
    const btn = this.add
      .rectangle(x, y, 250, 52, primary ? Palette.ochre : Palette.hudPanel)
      .setStrokeStyle(2, primary ? Palette.ochreDark : Palette.stone)
      .setInteractive({ useHandCursor: true });
    const label = this.add
      .text(x, y, text, {
        fontFamily: 'Georgia, serif',
        fontSize: primary ? '18px' : '16px',
        color: primary ? '#1A2A22' : '#F0EBE0',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    btn.on('pointerup', fn);
    label.setInteractive({ useHandCursor: true }).on('pointerup', fn);
  }
}
