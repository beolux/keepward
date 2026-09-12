export type AgeId = 'dark' | 'feudal';

export interface AgeDef {
  id: AgeId;
  name: string;
  costWood: number;
  costGold: number;
  damageMult: number;
  fireRateMult: number; // <1 = faster
  unlocks: string[];
}

export const AGES: Record<AgeId, AgeDef> = {
  dark: {
    id: 'dark',
    name: 'Dark Age',
    costWood: 0,
    costGold: 0,
    damageMult: 1,
    fireRateMult: 1,
    unlocks: ['watchtower'],
  },
  feudal: {
    id: 'feudal',
    name: 'Feudal Age',
    costWood: 120,
    costGold: 100,
    damageMult: 1.2,
    fireRateMult: 0.9,
    unlocks: ['watchtower', 'mangonel'],
  },
};

export const AGE_ORDER: AgeId[] = ['dark', 'feudal'];
