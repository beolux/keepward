import type { EnemyId } from './enemies';
import { TUNING } from './tuning';

export interface WaveSpawn {
  enemy: EnemyId;
  count: number;
  intervalMs: number;
  delayMs?: number;
  elite?: boolean;
}

export interface WaveDef {
  wave: number;
  spawns: WaveSpawn[];
  bonusGold: number;
  /** Rotating spawn edge for this wave */
  edge: 'N' | 'E' | 'S' | 'W';
}

const EDGES: Array<'N' | 'E' | 'S' | 'W'> = ['N', 'E', 'S', 'W'];

function buildWaves(): WaveDef[] {
  const waves: WaveDef[] = [];
  for (let w = 1; w <= TUNING.waveCount; w++) {
    const edge = EDGES[(w - 1) % 4];
    const eliteWave = w % 5 === 0 && w !== 50;
    const spawns: WaveSpawn[] = [];
    const bonusGold = 10 + Math.floor(w * 1.5);

    if (w === 50) {
      // Elephant boss + escort
      spawns.push({ enemy: 'elephant', count: 1, intervalMs: 0, delayMs: 500 });
      spawns.push({ enemy: 'knight', count: 6, intervalMs: 700, delayMs: 2000 });
      spawns.push({ enemy: 'ram', count: 2, intervalMs: 1500, delayMs: 4000 });
      waves.push({ wave: w, spawns, bonusGold: 200, edge });
      continue;
    }

    // Early curve
    const militiaCount = Math.min(6 + Math.floor(w * 0.8), 22);
    const interval = Math.max(280, 700 - w * 8);

    if (w <= 4) {
      spawns.push({ enemy: 'militia', count: militiaCount, intervalMs: interval });
      if (w >= 2) {
        spawns.push({
          enemy: 'archer',
          count: 2 + w,
          intervalMs: interval + 100,
          delayMs: 800,
        });
      }
      if (w >= 3) {
        spawns.push({
          enemy: 'spearman',
          count: w,
          intervalMs: 800,
          delayMs: 1200,
        });
      }
    } else if (w < 12) {
      // Knights from wave 5
      spawns.push({ enemy: 'militia', count: militiaCount, intervalMs: interval });
      spawns.push({
        enemy: 'spearman',
        count: 3 + Math.floor(w / 2),
        intervalMs: 650,
        delayMs: 400,
      });
      spawns.push({
        enemy: 'archer',
        count: 3 + Math.floor(w / 3),
        intervalMs: 600,
        delayMs: 600,
      });
      spawns.push({
        enemy: 'knight',
        count: 1 + Math.floor((w - 4) / 2),
        intervalMs: 900,
        delayMs: 1000,
        elite: eliteWave,
      });
    } else {
      // Rams from wave 12
      spawns.push({
        enemy: 'militia',
        count: Math.min(10 + Math.floor(w / 3), 18),
        intervalMs: interval,
      });
      spawns.push({
        enemy: 'spearman',
        count: 4 + Math.floor(w / 4),
        intervalMs: 550,
        delayMs: 300,
      });
      spawns.push({
        enemy: 'archer',
        count: 4 + Math.floor(w / 5),
        intervalMs: 500,
        delayMs: 500,
      });
      spawns.push({
        enemy: 'knight',
        count: 2 + Math.floor((w - 5) / 3),
        intervalMs: 750,
        delayMs: 700,
        elite: eliteWave && w % 10 !== 0,
      });
      const ramCount = 1 + Math.floor((w - 12) / 6);
      spawns.push({
        enemy: 'ram',
        count: Math.min(ramCount, 4),
        intervalMs: 1400,
        delayMs: 1200,
        elite: eliteWave && w % 10 === 0,
      });
    }

    // Elite pack every 5 waves
    if (eliteWave) {
      spawns.push({
        enemy: w >= 12 ? 'knight' : 'spearman',
        count: 3,
        intervalMs: 500,
        delayMs: 2000,
        elite: true,
      });
    }

    waves.push({ wave: w, spawns, bonusGold, edge });
  }
  return waves;
}

export const WAVES: WaveDef[] = buildWaves();
