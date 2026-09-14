import Phaser from 'phaser';
import { GAME_W, GAME_H, VIEW_DPR } from '../data/map';

/**
 * Lock camera to the logical 390×H playfield while the canvas buffer runs at VIEW_DPR.
 * Keeps world units unchanged; no pinch/zoom controls.
 */
export function applyLockedView(scene: Phaser.Scene): void {
  const cam = scene.cameras.main;
  cam.setZoom(VIEW_DPR);
  cam.centerOn(GAME_W / 2, GAME_H / 2);
  cam.setRoundPixels(true);
}
