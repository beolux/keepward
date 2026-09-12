import { TILE_PX, TUNING } from './tuning';

export type TowerId = 'watchtower' | 'mangonel' | 'spearPost' | 'longbow' | 'keep';
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
  /** Extra damage multiplier vs cavalry (knight) */
  vsCavalryMult?: number;
}

const W = TUNING.towers.watchtower;
const M = TUNING.towers.mangonel;
const S = TUNING.towers.spearPost;
const L = TUNING.towers.longbow;
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
    description: '12 dmg · 1.0/s',
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
  spearPost: {
    id: 'spearPost',
    name: 'Spear Post',
    costWood: S.costWood,
    costGold: S.costGold,
    range: S.rangeTiles * TILE_PX,
    fireIntervalMs: 1000 / S.fireRatePerSec,
    damage: S.damage,
    splash: 0,
    projectileSpeed: S.projectileSpeed,
    color: 0x5a4830,
    accent: 0xa08050,
    unlockAge: 'feudal',
    buildable: true,
    description: '5 dmg · 0.8/s · +100% vs cav',
    vsCavalryMult: S.vsCavalryMult,
  },
  longbow: {
    id: 'longbow',
    name: 'Longbow Tower',
    costWood: L.costWood,
    costGold: L.costGold,
    range: L.rangeTiles * TILE_PX,
    fireIntervalMs: 1000 / L.fireRatePerSec,
    damage: L.damage,
    splash: 0,
    projectileSpeed: L.projectileSpeed,
    color: 0x3d5c3a,
    accent: 0xc4a35a,
    unlockAge: 'feudal',
    buildable: true,
    description: '16 dmg · 0.7/s · range 4.2',
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

export const BUILDABLE_TOWERS: TowerId[] = ['watchtower', 'mangonel', 'spearPost', 'longbow'];

export const UPGRADE_TRACKS: UpgradeTrack[] = ['rof', 'range', 'damage'];

export const TRACK_LABELS: Record<UpgradeTrack, string> = {
  rof: 'Rate of Fire',
  range: 'Range',
  damage: 'Damage',
};
