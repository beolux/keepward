export type TowerId = 'watchtower' | 'mangonel' | 'keep';

export interface TowerDef {
  id: TowerId;
  name: string;
  costWood: number;
  costGold: number;
  range: number;
  fireRate: number; // ms between shots
  damage: number;
  splash: number; // radius, 0 = none
  projectileSpeed: number;
  color: number;
  accent: number;
  unlockAge: 'dark' | 'feudal';
  buildable: boolean;
  description: string;
}

export const TOWERS: Record<TowerId, TowerDef> = {
  watchtower: {
    id: 'watchtower',
    name: 'Watchtower',
    costWood: 40,
    costGold: 20,
    range: 110,
    fireRate: 550,
    damage: 12,
    splash: 0,
    projectileSpeed: 380,
    color: 0x6b5a3e,
    accent: 0xc4a35a,
    unlockAge: 'dark',
    buildable: true,
    description: 'Cheap & fast',
  },
  mangonel: {
    id: 'mangonel',
    name: 'Mangonel Nest',
    costWood: 80,
    costGold: 60,
    range: 130,
    fireRate: 1400,
    damage: 28,
    splash: 48,
    projectileSpeed: 260,
    color: 0x5a4a3a,
    accent: 0xb87333,
    unlockAge: 'feudal',
    buildable: true,
    description: 'Slow splash',
  },
  keep: {
    id: 'keep',
    name: 'Keep',
    costWood: 0,
    costGold: 0,
    range: 100,
    fireRate: 900,
    damage: 22,
    splash: 0,
    projectileSpeed: 320,
    color: 0x4a5568,
    accent: 0xc4a35a,
    unlockAge: 'dark',
    buildable: false,
    description: 'Your stronghold',
  },
};
