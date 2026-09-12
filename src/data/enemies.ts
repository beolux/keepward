export type EnemyId = 'militia' | 'knight';

export interface EnemyDef {
  id: EnemyId;
  name: string;
  hp: number;
  speed: number; // px/sec along path
  rewardWood: number;
  rewardGold: number;
  armor: number; // flat damage reduction
  color: number;
  accent: number;
  radius: number;
}

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  militia: {
    id: 'militia',
    name: 'Militia',
    hp: 35,
    speed: 78,
    rewardWood: 2,
    rewardGold: 3,
    armor: 0,
    color: 0x6b4423,
    accent: 0xc4a35a,
    radius: 10,
  },
  knight: {
    id: 'knight',
    name: 'Knight',
    hp: 110,
    speed: 42,
    rewardWood: 4,
    rewardGold: 8,
    armor: 6,
    color: 0x4a5568,
    accent: 0xd4a84b,
    radius: 13,
  },
};
