/**
 * Keep research hall — Ideas Guy keep1 tree (exact costs).
 * Age gates availability; research spends to unlock. Age does NOT gift siege towers.
 * Swap numbers here / TUNING.keepResearch — artBible notes stay in sync.
 */
import { TUNING } from './tuning';
import type { AgeId } from './ages';
import { ageIndex } from './ages';

export type KeepTab = 'age' | 'attack' | 'defense' | 'siege';

export type AttackId = 'a1' | 'a2' | 'a3' | 'a4';
export type DefenseId = 'd1' | 'd2' | 'd3' | 'd4';
export type SiegeId = 'longbow' | 'spearPost' | 'mangonel' | 'bombard';

export type KeepResearchId = AttackId | DefenseId | SiegeId;

export interface KeepResearchDef {
  id: KeepResearchId;
  tab: 'attack' | 'defense' | 'siege';
  name: string;
  short: string;
  desc: string;
  costWood: number;
  costGold: number;
  /** Minimum age to buy */
  age: AgeId;
  /** Required prior research (same tree) */
  requires?: KeepResearchId[];
  /** Stub — visible but not purchasable */
  stub?: boolean;
}

const KR = TUNING.keepResearch;

export const ATTACK_DEFS: KeepResearchDef[] = [
  {
    id: 'a1',
    tab: 'attack',
    name: 'Keep Bolts',
    short: 'Bolts',
    desc: 'Keep shot 6 · 0.6/s',
    costWood: KR.attack.a1.wood,
    costGold: KR.attack.a1.gold,
    age: 'dark',
  },
  {
    id: 'a2',
    tab: 'attack',
    name: 'Barrage',
    short: 'Barrage',
    desc: 'Keep RoF +40%',
    costWood: KR.attack.a2.wood,
    costGold: KR.attack.a2.gold,
    age: 'dark',
  },
  {
    id: 'a3',
    tab: 'attack',
    name: 'War Drums',
    short: 'Drums',
    desc: '+12% RoF aura',
    costWood: KR.attack.a3.wood,
    costGold: KR.attack.a3.gold,
    age: 'dark',
    requires: ['a1'],
  },
  {
    id: 'a4',
    tab: 'attack',
    name: 'Sharpened',
    short: 'Sharp',
    desc: '+15% dmg aura',
    costWood: KR.attack.a4.wood,
    costGold: KR.attack.a4.gold,
    age: 'dark',
    requires: ['a1'],
  },
];

export const DEFENSE_DEFS: KeepResearchDef[] = [
  {
    id: 'd1',
    tab: 'defense',
    name: 'Keep Stones',
    short: 'HP I',
    desc: 'Keep HP → 1400',
    costWood: KR.defense.d1.wood,
    costGold: KR.defense.d1.gold,
    age: 'dark',
  },
  {
    id: 'd2',
    tab: 'defense',
    name: 'Keep Bastion',
    short: 'HP II',
    desc: 'Keep HP → 1900',
    costWood: KR.defense.d2.wood,
    costGold: KR.defense.d2.gold,
    age: 'dark',
    requires: ['d1'],
  },
  {
    id: 'd3',
    tab: 'defense',
    name: 'Mason Guild',
    short: 'Mason',
    desc: 'Repair −30%',
    costWood: KR.defense.d3.wood,
    costGold: KR.defense.d3.gold,
    age: 'castle',
  },
  {
    id: 'd4',
    tab: 'defense',
    name: 'Tower Pavise',
    short: 'Pavise',
    desc: '+15% tower HP in aura',
    costWood: KR.defense.d4.wood,
    costGold: KR.defense.d4.gold,
    age: 'castle',
  },
];

export const SIEGE_DEFS: KeepResearchDef[] = [
  {
    id: 'longbow',
    tab: 'siege',
    name: 'Longbow Tower',
    short: 'Longbow',
    desc: 'Unlock Longbow',
    costWood: KR.siege.longbow.wood,
    costGold: KR.siege.longbow.gold,
    age: 'feudal',
  },
  {
    id: 'spearPost',
    tab: 'siege',
    name: 'Spear Post',
    short: 'Spear',
    desc: 'Unlock Spear Post',
    costWood: KR.siege.spearPost.wood,
    costGold: KR.siege.spearPost.gold,
    age: 'feudal',
  },
  {
    id: 'mangonel',
    tab: 'siege',
    name: 'Mangonel Nest',
    short: 'Mangonel',
    desc: 'Unlock Mangonel',
    costWood: KR.siege.mangonel.wood,
    costGold: KR.siege.mangonel.gold,
    age: 'castle',
  },
  {
    id: 'bombard',
    tab: 'siege',
    name: 'Bombard',
    short: 'Bombard',
    desc: 'Later age',
    costWood: 0,
    costGold: 0,
    age: 'imperial',
    stub: true,
  },
];

export const ALL_KEEP_RESEARCH: KeepResearchDef[] = [
  ...ATTACK_DEFS,
  ...DEFENSE_DEFS,
  ...SIEGE_DEFS,
];

export function keepResearchById(id: KeepResearchId): KeepResearchDef | undefined {
  return ALL_KEEP_RESEARCH.find((d) => d.id === id);
}

export type KeepResearchState = {
  a1: boolean;
  a2: boolean;
  a3: boolean;
  a4: boolean;
  d1: boolean;
  d2: boolean;
  d3: boolean;
  d4: boolean;
  longbow: boolean;
  spearPost: boolean;
  mangonel: boolean;
  bombard: boolean;
};

export function blankKeepResearch(): KeepResearchState {
  return {
    a1: false,
    a2: false,
    a3: false,
    a4: false,
    d1: false,
    d2: false,
    d3: false,
    d4: false,
    longbow: false,
    spearPost: false,
    mangonel: false,
    bombard: false,
  };
}

export function ownsResearch(state: KeepResearchState, id: KeepResearchId): boolean {
  return !!state[id];
}

export function researchAvailable(
  def: KeepResearchDef,
  state: KeepResearchState,
  age: AgeId,
): boolean {
  if (def.stub) return false;
  if (ownsResearch(state, def.id)) return false;
  if (ageIndex(age) < ageIndex(def.age)) return false;
  if (def.requires) {
    for (const r of def.requires) {
      if (!ownsResearch(state, r)) return false;
    }
  }
  return true;
}

/** Visual rank 0–3 from attack+defense buys (siege excluded). */
export function keepVisualRank(state: KeepResearchState): number {
  let n = 0;
  if (state.a1) n++;
  if (state.a2) n++;
  if (state.a3) n++;
  if (state.a4) n++;
  if (state.d1) n++;
  if (state.d2) n++;
  if (state.d3) n++;
  if (state.d4) n++;
  if (n <= 0) return 0;
  if (n <= 2) return 1;
  if (n <= 4) return 2;
  return 3;
}

export function keepMaxHpFor(state: KeepResearchState): number {
  if (state.d2) return KR.defense.d2.hp;
  if (state.d1) return KR.defense.d1.hp;
  return TUNING.keep.hp;
}
