import { TILE_PX, TUNING } from './tuning';

export type TowerId = 'watchtower' | 'mangonel' | 'keep';
export type UpgradeTrack = 'rof' | 'range' | 'damage';

export interface TowerDef {
  id: TowerId;
  name: string;
  costWood: number;
  costGold: number;
  range: number;
  fireIntervalMs: number;
  damage: number;
  splash: number;
  projectileSpeed: number;
  color: number;
  accent: number;
  unlockAge: 'dark' | 'feudal';
  buildable: boolean;
  description: string;
}

const W = TUNING.towers.watchtower;
const M = TUNING.towers.mangonel;
const K = TUNING.keep;

export const TOWERS: Record<TowerId, TowerDef> = {
  watchtower: {
    id: 'watchtower',
    name: 'Watchtower',
    costWood: W.costWood,
    costGold: W.costGold,
    range: W.rangeTiles * TILE_PX,
    fireIntervalMs: 1000 / W.fireRatePerSec,
    damage: W.damage,
    splash: 0,
    projectileSpeed: W.projectileSpeed,
    color: 0x6b5a3e,
    accent: 0xc4a35a,
    unlockAge: 'dark',
    buildable: true,
    description: '6 dmg · 1.0/s',
  },
  mangonel: {
    id: 'mangonel',
    name: 'Mangonel Nest',
    costWood: M.costWood,
    costGold: M.costGold,
    range: M.rangeTiles * TILE_PX,
    fireIntervalMs: 1000 / M.fireRatePerSec,
    damage: M.damage,
    splash: M.splashTiles * TILE_PX,
    projectileSpeed: M.projectileSpeed,
    color: 0x5a4a3a,
    accent: 0xb87333,
    unlockAge: 'feudal',
    buildable: true,
    description: '14 splash · 0.35/s',
  },
  keep: {
    id: 'keep',
    name: 'Keep',
    costWood: 0,
    costGold: 0,
    range: K.autoRangeTiles * TILE_PX,
    fireIntervalMs: K.autoIntervalMs,
    damage: K.autoDamage,
    splash: 0,
    projectileSpeed: 320,
    color: 0x4a5568,
    accent: 0xc4a35a,
    unlockAge: 'dark',
    buildable: false,
    description: 'Your stronghold',
  },
};

export const UPGRADE_TRACKS: UpgradeTrack[] = ['rof', 'range', 'damage'];

export const TRACK_LABELS: Record<UpgradeTrack, string> = {
  rof: 'Rate of Fire',
  range: 'Range',
  damage: 'Damage',
};
