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

/** Interval floor 500ms through wave 8. */
function earlyInterval(ms: number): number {
  return Math.max(500, ms);
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

    // CoS early2: exact soft open. Knights from w8; no elite at w5; rams still w12+.
    if (w === 1) {
      spawns.push({ enemy: 'militia', count: 3, intervalMs: earlyInterval(1100) });
    } else if (w === 2) {
      spawns.push({ enemy: 'militia', count: 4, intervalMs: earlyInterval(1000) });
    } else if (w === 3) {
      spawns.push({ enemy: 'militia', count: 5, intervalMs: earlyInterval(950) });
    } else if (w === 4) {
      spawns.push({ enemy: 'militia', count: 6, intervalMs: earlyInterval(900) });
      spawns.push({
        enemy: 'archer',
        count: 1,
        intervalMs: earlyInterval(900),
        delayMs: 1200,
      });
    } else if (w === 5) {
      // No archers. No knights. No elite pack.
      spawns.push({ enemy: 'militia', count: 6, intervalMs: earlyInterval(850) });
      spawns.push({
        enemy: 'spearman',
        count: 2,
        intervalMs: earlyInterval(800),
        delayMs: 1000,
      });
    } else if (w === 6) {
      // No knight (knights start w8).
      spawns.push({ enemy: 'militia', count: 7, intervalMs: earlyInterval(800) });
      spawns.push({
        enemy: 'archer',
        count: 2,
        intervalMs: earlyInterval(750),
        delayMs: 800,
      });
    } else if (w === 7) {
      spawns.push({ enemy: 'militia', count: 7, intervalMs: earlyInterval(750) });
      spawns.push({
        enemy: 'spearman',
        count: 2,
        intervalMs: earlyInterval(700),
        delayMs: 600,
      });
      spawns.push({
        enemy: 'archer',
        count: 1,
        intervalMs: earlyInterval(700),
        delayMs: 1000,
      });
    } else if (w === 8) {
      spawns.push({ enemy: 'militia', count: 8, intervalMs: earlyInterval(700) });
      spawns.push({
        enemy: 'spearman',
        count: 2,
        intervalMs: earlyInterval(650),
        delayMs: 500,
      });
      spawns.push({
        enemy: 'archer',
        count: 2,
        intervalMs: earlyInterval(650),
        delayMs: 800,
      });
      spawns.push({
        enemy: 'knight',
        count: 1,
        intervalMs: earlyInterval(900),
        delayMs: 1800,
      });
    } else if (w < 12) {
      // Waves 9–11: −25% mix; knights max 1 until w11. Rams still w12+.
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
      const knightSoft = softCount(1 + Math.floor((w - 4) / 2));
      spawns.push({
        enemy: 'knight',
        count: Math.min(1, knightSoft), // max 1 until w11
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
