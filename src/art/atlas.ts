import Phaser from 'phaser';
import {
  ATLAS_KEY,
  ATLAS_URL_JSON,
  ATLAS_URL_PNG,
  FRAME_ORIGIN,
  type AtlasFrameId,
} from '../data/artBible';

let atlasReady = false;

export function isAtlasReady(): boolean {
  return atlasReady;
}

export function preloadAtlas(scene: Phaser.Scene): void {
  scene.load.atlas(ATLAS_KEY, ATLAS_URL_PNG, ATLAS_URL_JSON);
}

/** Call from Boot create after preload — marks atlas usable if frames present. */
export function ensureAtlas(scene: Phaser.Scene): void {
  atlasReady =
    scene.textures.exists(ATLAS_KEY) && scene.textures.get(ATLAS_KEY).has('tower_watchtower');
}

export function hasFrame(scene: Phaser.Scene, id: AtlasFrameId): boolean {
  return atlasReady && scene.textures.exists(ATLAS_KEY) && scene.textures.get(ATLAS_KEY).has(id);
}

/** Image at local (0,0) for Containers — origin from art bible pivots. */
export function makeAtlasSprite(
  scene: Phaser.Scene,
  id: AtlasFrameId,
): Phaser.GameObjects.Image | null {
  if (!hasFrame(scene, id)) return null;
  const origin = FRAME_ORIGIN[id];
  return scene.add.image(0, 0, ATLAS_KEY, id).setOrigin(origin.x, origin.y);
}

export function makeAtlasImageAt(
  scene: Phaser.Scene,
  x: number,
  y: number,
  id: AtlasFrameId,
): Phaser.GameObjects.Image | null {
  if (!hasFrame(scene, id)) return null;
  const origin = FRAME_ORIGIN[id];
  return scene.add.image(x, y, ATLAS_KEY, id).setOrigin(origin.x, origin.y);
}
