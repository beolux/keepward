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

const _scratch = new Phaser.Math.Vector2();

/**
 * Map a pointer into logical world space (GAME_W × GAME_H).
 *
 * full1 sized the canvas buffer at VIEW_DPR and zoomed the camera to match.
 * Phaser `pointer.x/y` are buffer / game-size pixels (0…GAME_W*DPR), not world.
 * Interactive hit-tests already invert the camera; dock-drag / ghost must too.
 */
export function pointerToWorld(
  scene: Phaser.Scene,
  pointer: Phaser.Input.Pointer,
): { x: number; y: number } {
  const cam = scene.cameras.main;
  const p = cam.getWorldPoint(pointer.x, pointer.y, _scratch);
  return { x: p.x, y: p.y };
}
