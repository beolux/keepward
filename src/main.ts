import Phaser from 'phaser';
import { GAME_W, GAME_H, VIEW_DPR } from './data/map';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { SurveyScene } from './scenes/SurveyScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { registerSW } from 'virtual:pwa-register';

// night1 — juice/ceremony; survey1b baseline; dock-drag world coords; force SW bump
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
  // Buffer at device pixels (cap 3); zoom keeps CSS at logical size for ENVELOP
  width: Math.round(GAME_W * VIEW_DPR),
  height: Math.round(GAME_H * VIEW_DPR),
  backgroundColor: '#1A2A22',
  scale: {
    mode: Phaser.Scale.ENVELOP,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    autoRound: true,
    zoom: 1 / VIEW_DPR,
  },
  render: {
    antialias: true,
    roundPixels: true,
  },
  input: {
    activePointers: 2,
  },
  scene: [BootScene, MenuScene, SurveyScene, GameScene, UIScene],
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
