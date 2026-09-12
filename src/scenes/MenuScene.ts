import Phaser from 'phaser';
import { Palette } from '../data/palette';
import { GAME_W, GAME_H } from '../data/map';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(Palette.bg);

    // decorative grass bands
    const g = this.add.graphics();
    g.fillStyle(Palette.grassDark, 1);
    g.fillRect(0, 0, width, height);
    g.fillStyle(Palette.grass, 0.4);
    for (let i = 0; i < 40; i++) {
      g.fillCircle(Phaser.Math.Between(0, width), Phaser.Math.Between(0, height), Phaser.Math.Between(8, 24));
    }

    // keep silhouette
    const keep = this.add.graphics();
    keep.fillStyle(Palette.slate, 1);
    keep.fillRoundedRect(width / 2 - 40, height * 0.28, 80, 70, 4);
    keep.fillStyle(Palette.ochre, 1);
    for (let i = -32; i <= 28; i += 16) {
      keep.fillRect(width / 2 + i, height * 0.28 - 18, 12, 20);
    }
    keep.fillStyle(Palette.dirtDark, 1);
    keep.fillRect(width / 2 - 10, height * 0.28 + 35, 20, 35);

    this.add
      .text(width / 2, height * 0.18, 'KEEPWARD', {
        fontFamily: 'Georgia, serif',
        fontSize: '42px',
        color: '#C4A35A',
        stroke: '#1A2A22',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.48, 'Hold the keep.\nPlace towers on stone pads.\nAge up. Survive 10 waves.', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        color: '#F0EBE0',
        align: 'center',
        lineSpacing: 6,
      })
      .setOrigin(0.5);

    const btn = this.add
      .rectangle(width / 2, height * 0.68, 220, 56, Palette.ochre)
      .setStrokeStyle(2, Palette.ochreDark)
      .setInteractive({ useHandCursor: true });

    const btnLabel = this.add
      .text(width / 2, height * 0.68, 'DEFEND', {
        fontFamily: 'Georgia, serif',
        fontSize: '24px',
        color: '#1A2A22',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const start = () => {
      this.scene.start('Game');
    };
    btn.on('pointerup', start);
    btnLabel.setInteractive({ useHandCursor: true }).on('pointerup', start);

    this.add
      .text(width / 2, height * 0.88, 'Portrait · Snap pads · PWA ready', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#A0A090',
      })
      .setOrigin(0.5);

    // ensure logical size reference unused warning silenced
    void GAME_W;
    void GAME_H;
  }
}
