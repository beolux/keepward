/**
 * Ideas Guy balance sheet — drop-in numbers for Keepward fort siege.
 * Do not invent alternate values; change here when Ideas Guy updates.
 */

export const TILE_PX = 40;

export const TUNING = {
  /** Starting resources */
  start: {
    wood: 100,
    gold: 60,
  },

  /** Passive income (per second). Multiplier = 1 + 0.25 * ageIndex (Dark=0). */
  passive: {
    woodPerSec: 4,
    goldPerSec: 2,
    perAgeBonus: 0.25,
  },

  /** Keep */
  keep: {
    hp: 1000,
    autoDamage: 3,
    autoFireRateSec: 0.5, // 0.5/s → interval 2000ms? Sheet: "3 dmg 0.5/s" = 3 dmg twice per second → interval 2000ms if 0.5 shots/s, OR 0.5s interval.
    // Interpreting "3 dmg 0.5/s" as 3 damage at 0.5 shots per second (every 2s).
    // If meant 3 dmg every 0.5s, that would be written "3 dmg / 0.5s". Using 0.5 shots/sec.
    autoIntervalMs: 2000,
    autoRangeTiles: 2.0,
    bodyRadius: 28,
  },

  /** Wall HP baseline per segment by age (age-up applies rules in FortSystem). */
  wallHpByAge: {
    dark: 80,
    feudal: 140,
    castle: 260,
    imperial: 400,
  } as Record<string, number>,

  /** Repair: cost per 40 HP chunk; blocked for repairLockMs after taking damage. */
  repair: {
    chunkHp: 40,
    darkFeudal: { wood: 25, gold: 10 },
    castleImperial: { wood: 40, gold: 20 },
    lockMs: 500,
  },

  /** Global wall upgrades (2 purchaseable steps; Imperial baseline from age-up only). */
  wallUpgrades: {
    hardenedTimbers: {
      id: 'hardenedTimbers' as const,
      name: 'Hardened Timbers',
      age: 'feudal' as const,
      costWood: 120,
      costGold: 40,
      bonusHp: 60,
    },
    stoneFacing: {
      id: 'stoneFacing' as const,
      name: 'Stone Facing',
      age: 'castle' as const,
      costWood: 180,
      costGold: 120,
      /** Sets stone baseline 260, or +120 if already hardened */
      stoneBaseline: 260,
      hardenedBonus: 120,
    },
  },

  /** Tower kill-gated upgrades: cumulative kill thresholds for ranks 1/2/3 */
  towerUpgradeKills: [8, 20, 40] as const,
  towerUpgradeRanks: {
    rof: [0.12, 0.12, 0.16] as const, // +% fire rate (faster)
    range: [10, 10, 10] as const, // +tiles * 0.1? Sheet: "Range +10×3" — +10% range per rank ×3
    damage: [0.15, 0.15, 0.2] as const, // +%
  },
  /** Cost per rank purchase (modest scale) — Ideas Guy did not price tower ranks; keep cheap relative to age */
  towerUpgradeCost: {
    wood: [15, 25, 40],
    gold: [10, 18, 30],
  },

  /** Base towers (range in tiles) */
  towers: {
    watchtower: {
      damage: 6,
      fireRatePerSec: 1.0,
      rangeTiles: 2.5,
      splashTiles: 0,
      costWood: 40,
      costGold: 20,
      projectileSpeed: 380,
    },
    mangonel: {
      damage: 14,
      fireRatePerSec: 0.35,
      rangeTiles: 3.0,
      splashTiles: 0.8,
      costWood: 80,
      costGold: 55,
      projectileSpeed: 260,
    },
  },

  /** Ages */
  ages: {
    dark: { costWood: 0, costGold: 0 },
    feudal: { costWood: 150, costGold: 80 },
    castle: { costWood: 320, costGold: 220 },
    imperial: { costWood: 500, costGold: 400 },
  },
  ageChannelMs: 4000,

  /** Enemy wall DPS */
  wallDps: {
    militia: 2,
    archer: 1,
    spearman: 3,
    knight: 5,
    ram: 18,
    elephant: 12,
  } as Record<string, number>,
  elephantSplashAdjacent: 0.4, // 40% splash to adjacent wall segments

  /** Enemy combat stats (HP/speed not on sheet — tuned to sheet tower DPS; bounty IS sheet) */
  enemies: {
    militia: {
      hp: 28,
      speed: 70,
      armor: 0,
      bountyWood: 2,
      bountyGold: 1,
      radius: 10,
    },
    archer: {
      hp: 22,
      speed: 78,
      armor: 0,
      bountyWood: 2,
      bountyGold: 2,
      radius: 9,
    },
    spearman: {
      hp: 40,
      speed: 62,
      armor: 2,
      bountyWood: 3,
      bountyGold: 2,
      radius: 11,
    },
    knight: {
      hp: 95,
      speed: 48,
      armor: 5,
      bountyWood: 4,
      bountyGold: 4,
      radius: 13,
    },
    ram: {
      hp: 220,
      speed: 32,
      armor: 8,
      bountyWood: 10,
      bountyGold: 8,
      radius: 16,
    },
    elephant: {
      hp: 1200,
      speed: 28,
      armor: 12,
      bountyWood: 40,
      bountyGold: 40,
      radius: 22,
    },
  },

  /** Placement */
  placement: {
    towerRadius: 18,
    keepClearance: 36,
    wallClearance: 8,
  },

  waveCount: 50,

  /**
   * Build phase between waves (Nick): place/upgrade/repair window.
   * Not on Ideas Guy combat sheet — UX timing only.
   */
  buildPhase: {
    /** Seconds before waves 1–20 */
    earlySec: 13,
    /** Seconds after wave 20 (shorter late-game) */
    lateSec: 10,
    /** Upcoming wave number (1-based) at which late timer applies */
    lateFromWave: 21,
  },
} as const;

export type WallUpgradeId = 'hardenedTimbers' | 'stoneFacing';
