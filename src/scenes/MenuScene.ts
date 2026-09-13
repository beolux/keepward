import Phaser from 'phaser';
import { Palette } from '../data/palette';
import { GAME_W, GAME_H } from '../data/map';
import { LAYOUT_ORDER, FORT_LAYOUTS, type LayoutId } from '../data/fort';
import { audio } from '../systems/AudioSystem';
import { FRAME_ORIGIN } from '../data/artBible';
import { hasFrame } from '../art/atlas';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    const { width, height } = this.scale;
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
        'Fort siege. Free-place towers in the courtyard.\nWalls fall. Breach. Hold the Keep.\n50 waves · Age up · Upgrade by kills.',
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '14px',
          color: '#F0EBE0',
          align: 'center',
          lineSpacing: 5,
        },
      )
      .setOrigin(0.5);

    LAYOUT_ORDER.forEach((id, i) => {
      const y = height * 0.58 + i * 56;
      this.makeLayoutBtn(id, width / 2, y);
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

    void GAME_W;
    void GAME_H;
  }

  private makeLayoutBtn(id: LayoutId, x: number, y: number): void {
    const layout = FORT_LAYOUTS[id];
    const btn = this.add
      .rectangle(x, y, 250, 48, Palette.ochre)
      .setStrokeStyle(2, Palette.ochreDark)
      .setInteractive({ useHandCursor: true });
    const label = this.add
      .text(x, y, id === 'square' ? `DEFEND · ${layout.name}` : layout.name, {
        fontFamily: 'Georgia, serif',
        fontSize: id === 'square' ? '18px' : '16px',
        color: '#1A2A22',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const start = () => {
      audio.unlock();
      this.scene.start('Game', { layout: id });
    };
    btn.on('pointerup', start);
    label.setInteractive({ useHandCursor: true }).on('pointerup', start);

    if (id !== 'square') {
      btn.setFillStyle(Palette.hudPanel);
      label.setColor('#F0EBE0');
      btn.setStrokeStyle(2, Palette.stone);
    }
  }
}
