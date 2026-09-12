import Phaser from 'phaser';
import { Palette } from '../data/palette';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(Palette.bg);
    this.scene.start('Menu');
  }
}
