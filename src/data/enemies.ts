import { TUNING } from './tuning';

export type EnemyId = 'militia' | 'archer' | 'spearman' | 'knight' | 'ram' | 'elephant';

export interface EnemyDef {
  id: EnemyId;
  name: string;
  hp: number;
  speed: number;
  rewardWood: number;
  rewardGold: number;
  armor: number;
  wallDps: number;
  color: number;
  accent: number;
  radius: number;
  elite?: boolean;
}

const E = TUNING.enemies;
const D = TUNING.wallDps;

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  militia: {
    id: 'militia',
    name: 'Militia',
    hp: E.militia.hp,
    speed: E.militia.speed,
    rewardWood: E.militia.bountyWood,
    rewardGold: E.militia.bountyGold,
    armor: E.militia.armor,
    wallDps: D.militia,
    color: 0x6b4423,
    accent: 0xc4a574,
    radius: E.militia.radius,
  },
  archer: {
    id: 'archer',
    name: 'Archer',
    hp: E.archer.hp,
    speed: E.archer.speed,
    rewardWood: E.archer.bountyWood,
    rewardGold: E.archer.bountyGold,
    armor: E.archer.armor,
    wallDps: D.archer,
    color: 0x3f6b4f,
    accent: 0xb8862d,
    radius: E.archer.radius,
  },
  spearman: {
    id: 'spearman',
    name: 'Spearman',
    hp: E.spearman.hp,
    speed: E.spearman.speed,
    rewardWood: E.spearman.bountyWood,
    rewardGold: E.spearman.bountyGold,
    armor: E.spearman.armor,
    wallDps: D.spearman,
    color: 0x8b6914,
    accent: 0xa08050,
    radius: E.spearman.radius,
  },
  knight: {
    id: 'knight',
    name: 'Knight',
    hp: E.knight.hp,
    speed: E.knight.speed,
    rewardWood: E.knight.bountyWood,
    rewardGold: E.knight.bountyGold,
    armor: E.knight.armor,
    wallDps: D.knight,
    color: 0x6b7280,
    accent: 0xd4a84b,
    radius: E.knight.radius,
  },
  ram: {
    id: 'ram',
    name: 'Battering Ram',
    hp: E.ram.hp,
    speed: E.ram.speed,
    rewardWood: E.ram.bountyWood,
    rewardGold: E.ram.bountyGold,
    armor: E.ram.armor,
    wallDps: D.ram,
    color: 0x5a3a1a,
    accent: 0xb8862d,
    radius: E.ram.radius,
  },
  elephant: {
    id: 'elephant',
    name: 'War Elephant',
    hp: E.elephant.hp,
    speed: E.elephant.speed,
    rewardWood: E.elephant.bountyWood,
    rewardGold: E.elephant.bountyGold,
    armor: E.elephant.armor,
    wallDps: D.elephant,
    color: 0x6b5a4a,
    accent: 0xb8862d,
    radius: E.elephant.radius,
  },
};

/** Elite tint: +40% HP, +25% wall DPS, +50% bounty */
export function eliteStats(base: EnemyDef): Pick<EnemyDef, 'hp' | 'wallDps' | 'rewardWood' | 'rewardGold'> {
  return {
    hp: Math.round(base.hp * 1.4),
    wallDps: base.wallDps * 1.25,
    rewardWood: Math.round(base.rewardWood * 1.5),
    rewardGold: Math.round(base.rewardGold * 1.5),
  };
}

/** Knight (and similar) count as cavalry for Spear Post bonus */
export function isCavalry(id: EnemyId): boolean {
  return id === 'knight';
}
