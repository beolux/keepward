import Phaser from 'phaser';
import { Palette } from '../data/palette';
import { ensureAtlas, preloadAtlas } from '../art/atlas';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    this.load.on('loaderror', () => {
      // Atlas optional — entities keep Graphics fallback
    });
    preloadAtlas(this);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(Palette.bg);
    ensureAtlas(this);
    this.scene.start('Menu');
  }
}
