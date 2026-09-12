import { TUNING } from './tuning';

export type AgeId = 'dark' | 'feudal' | 'castle' | 'imperial';

export interface AgeDef {
  id: AgeId;
  name: string;
  costWood: number;
  costGold: number;
  unlocks: string[];
}

export const AGES: Record<AgeId, AgeDef> = {
  dark: {
    id: 'dark',
    name: 'Dark Age',
    costWood: TUNING.ages.dark.costWood,
    costGold: TUNING.ages.dark.costGold,
    unlocks: ['watchtower'],
  },
  feudal: {
    id: 'feudal',
    name: 'Feudal Age',
    costWood: TUNING.ages.feudal.costWood,
    costGold: TUNING.ages.feudal.costGold,
    unlocks: ['watchtower', 'mangonel', 'spearPost', 'longbow'],
  },
  castle: {
    id: 'castle',
    name: 'Castle Age',
    costWood: TUNING.ages.castle.costWood,
    costGold: TUNING.ages.castle.costGold,
    unlocks: ['watchtower', 'mangonel', 'spearPost', 'longbow'],
  },
  imperial: {
    id: 'imperial',
    name: 'Imperial Age',
    costWood: TUNING.ages.imperial.costWood,
    costGold: TUNING.ages.imperial.costGold,
    unlocks: ['watchtower', 'mangonel', 'spearPost', 'longbow'],
  },
};

export const AGE_ORDER: AgeId[] = ['dark', 'feudal', 'castle', 'imperial'];

export function ageIndex(age: AgeId): number {
  return AGE_ORDER.indexOf(age);
}

export function passiveMult(age: AgeId): number {
  return 1 + TUNING.passive.perAgeBonus * ageIndex(age);
}
