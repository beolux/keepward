import type { EnemyId } from './enemies';

export interface WaveSpawn {
  enemy: EnemyId;
  count: number;
  intervalMs: number;
  delayMs?: number;
}

export interface WaveDef {
  wave: number;
  spawns: WaveSpawn[];
  bonusGold: number;
}

export const WAVES: WaveDef[] = [
  {
    wave: 1,
    bonusGold: 15,
    spawns: [{ enemy: 'militia', count: 6, intervalMs: 700 }],
  },
  {
    wave: 2,
    bonusGold: 18,
    spawns: [{ enemy: 'militia', count: 10, intervalMs: 600 }],
  },
  {
    wave: 3,
    bonusGold: 22,
    spawns: [
      { enemy: 'militia', count: 8, intervalMs: 550 },
      { enemy: 'knight', count: 2, intervalMs: 1200, delayMs: 2000 },
    ],
  },
  {
    wave: 4,
    bonusGold: 25,
    spawns: [
      { enemy: 'militia', count: 12, intervalMs: 480 },
      { enemy: 'knight', count: 3, intervalMs: 1000, delayMs: 1500 },
    ],
  },
  {
    wave: 5,
    bonusGold: 30,
    spawns: [
      { enemy: 'knight', count: 4, intervalMs: 900 },
      { enemy: 'militia', count: 10, intervalMs: 400, delayMs: 800 },
    ],
  },
  {
    wave: 6,
    bonusGold: 35,
    spawns: [
      { enemy: 'militia', count: 14, intervalMs: 380 },
      { enemy: 'knight', count: 5, intervalMs: 850, delayMs: 1000 },
    ],
  },
  {
    wave: 7,
    bonusGold: 40,
    spawns: [
      { enemy: 'knight', count: 6, intervalMs: 750 },
      { enemy: 'militia', count: 12, intervalMs: 350, delayMs: 500 },
    ],
  },
  {
    wave: 8,
    bonusGold: 45,
    spawns: [
      { enemy: 'militia', count: 16, intervalMs: 320 },
      { enemy: 'knight', count: 7, intervalMs: 700, delayMs: 600 },
    ],
  },
  {
    wave: 9,
    bonusGold: 50,
    spawns: [
      { enemy: 'knight', count: 8, intervalMs: 650 },
      { enemy: 'militia', count: 18, intervalMs: 280, delayMs: 400 },
    ],
  },
  {
    wave: 10,
    bonusGold: 80,
    spawns: [
      { enemy: 'militia', count: 20, intervalMs: 260 },
      { enemy: 'knight', count: 10, intervalMs: 550, delayMs: 300 },
    ],
  },
];

export const STARTING = {
  wood: 100,
  gold: 80,
  lives: 20,
};
