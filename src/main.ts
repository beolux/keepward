import Phaser from 'phaser';
import { GAME_W, GAME_H } from './data/map';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { registerSW } from 'virtual:pwa-register';

// art2 — distinct towers + projectiles + shadow fix; force SW bump
registerSW({
  immediate: true,
  onNeedRefresh() {
    // Auto-reload when a new service worker claims the page
    location.reload();
  },
  onOfflineReady() {
    /* ok */
  },
});

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#1A2A22',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    activePointers: 2,
  },
  scene: [BootScene, MenuScene, GameScene, UIScene],
  // Locked camera — no zoom controls
  banner: false,
  fps: {
    target: 60,
    forceSetTimeOut: false,
  },
};

// Prevent multi-touch zoom gestures on Safari
document.addEventListener(
  'gesturestart',
  (e) => {
    e.preventDefault();
  },
  { passive: false },
);
document.addEventListener(
  'touchmove',
  (e) => {
    if (e.touches.length > 1) e.preventDefault();
  },
  { passive: false },
);

new Phaser.Game(config);
