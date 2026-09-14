import Phaser from 'phaser';
import { Palette } from '../data/palette';
import { ensureAtlas, preloadAtlas } from '../art/atlas';
import { applyLockedView } from '../utils/view';

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
    applyLockedView(this);
    this.cameras.main.setBackgroundColor(Palette.bg);
    ensureAtlas(this);
    this.scene.start('Menu');
  }
}
