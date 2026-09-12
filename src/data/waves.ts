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

/** −25% body counts for mid-early stretch (ceil). */
function softCount(n: number): number {
  return Math.max(1, Math.ceil(n * 0.75));
}

function buildWaves(): WaveDef[] {
  const waves: WaveDef[] = [];
  for (let w = 1; w <= TUNING.waveCount; w++) {
    const edge = EDGES[(w - 1) % 4];
    // First elite pack at wave 10 (skip w5); every 5 thereafter; never w50
    const eliteWave = w % 5 === 0 && w >= 10 && w !== 50;
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

    // CoS early1: exact soft open (waves 1–6). Knights from w6; no elite at w5.
    if (w === 1) {
      spawns.push({ enemy: 'militia', count: 4, intervalMs: 900 });
    } else if (w === 2) {
      spawns.push({ enemy: 'militia', count: 6, intervalMs: 850 });
    } else if (w === 3) {
      spawns.push({ enemy: 'militia', count: 8, intervalMs: 800 });
      spawns.push({
        enemy: 'archer',
        count: 2,
        intervalMs: 900,
        delayMs: 1000,
      });
    } else if (w === 4) {
      spawns.push({ enemy: 'militia', count: 8, intervalMs: 750 });
      spawns.push({
        enemy: 'spearman',
        count: 3,
        intervalMs: 800,
        delayMs: 1000,
      });
    } else if (w === 5) {
      // No knights. No elite pack.
      spawns.push({ enemy: 'militia', count: 8, intervalMs: 700 });
      spawns.push({
        enemy: 'archer',
        count: 2,
        intervalMs: 800,
        delayMs: 800,
      });
      spawns.push({
        enemy: 'spearman',
        count: 3,
        intervalMs: 800,
        delayMs: 1200,
      });
    } else if (w === 6) {
      spawns.push({ enemy: 'militia', count: 9, intervalMs: 650 });
      spawns.push({
        enemy: 'archer',
        count: 3,
        intervalMs: 750,
        delayMs: 600,
      });
      spawns.push({
        enemy: 'spearman',
        count: 3,
        intervalMs: 750,
        delayMs: 900,
      });
      spawns.push({
        enemy: 'knight',
        count: 1,
        intervalMs: 900,
        delayMs: 1800,
      });
    } else if (w < 12) {
      // Waves 7–11: prior mix, −25% counts (ceil). Knights continue; rams still w12+.
      const interval = Math.max(280, 700 - w * 8);
      const militiaCount = softCount(Math.min(6 + Math.floor(w * 0.8), 22));
      spawns.push({ enemy: 'militia', count: militiaCount, intervalMs: interval });
      spawns.push({
        enemy: 'spearman',
        count: softCount(3 + Math.floor(w / 2)),
        intervalMs: 650,
        delayMs: 400,
      });
      spawns.push({
        enemy: 'archer',
        count: softCount(3 + Math.floor(w / 3)),
        intervalMs: 600,
        delayMs: 600,
      });
      spawns.push({
        enemy: 'knight',
        count: softCount(1 + Math.floor((w - 4) / 2)),
        intervalMs: 900,
        delayMs: 1000,
        elite: eliteWave,
      });
    } else {
      // Rams from wave 12 — late curve unchanged
      const interval = Math.max(280, 700 - w * 8);
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

    // Elite pack every 5 waves from w10 (skipped at w5)
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
