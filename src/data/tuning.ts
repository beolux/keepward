/**
 * Keepward fort-siege balance — `TUNING.md` documents Nick walls3 feel buff.
 * Wall HP (~+20% over walls2) + wall DPS pin + rebuild + Spear Post / Longbow locked.
 * bounty1 (CoS): 2× kill wood/gold. Passive, wave bonus, research costs unchanged.
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

  /** Keep — base shot; Attack tree overrides via keepResearch */
  keep: {
    hp: 1000,
    autoDamage: 3,
    autoFireRateSec: 0.5,
    autoIntervalMs: 2000,
    autoRangeTiles: 2.0,
    /** Aura ring (War Drums / Sharpened / Pavise) — show only when Keep selected */
    auraRangeTiles: 3.5,
    bodyRadius: 28,
  },

  /**
   * Keep research hall — Ideas Guy keep1 EXACT costs (easy to swap).
   * Age gates availability; research spends to unlock. Age does NOT gift siege towers.
   * Keep upgrades cost more than a tower kill-rank.
   */
  keepResearch: {
    attack: {
      /** A1 Keep Bolts: shot 6 / 0.6 RoF */
      a1: { wood: 220, gold: 180, damage: 6, fireRatePerSec: 0.6 },
      /** A2 Barrage: Keep RoF +40% */
      a2: { wood: 300, gold: 260, keepRofBonus: 0.4 },
      /** A3 War Drums: +12% RoF aura (needs A1) */
      a3: { wood: 380, gold: 320, auraRof: 0.12 },
      /** A4 Sharpened: +15% dmg aura (needs A1) */
      a4: { wood: 420, gold: 360, auraDmg: 0.15 },
    },
    defense: {
      d1: { wood: 200, gold: 160, hp: 1400 },
      d2: { wood: 320, gold: 280, hp: 1900 },
      /** Mason Guild: repair −30% (Castle) */
      d3: { wood: 360, gold: 300, repairDiscount: 0.3 },
      /** Tower Pavise: +15% tower HP in aura (Castle) */
      d4: { wood: 400, gold: 340, towerHpAura: 0.15 },
    },
    siege: {
      longbow: { wood: 200, gold: 150, age: 'feudal' as const },
      spearPost: { wood: 180, gold: 120, age: 'feudal' as const },
      mangonel: { wood: 280, gold: 220, age: 'castle' as const },
      /** Bombard later — stub */
      bombard: { wood: 0, gold: 0, age: 'imperial' as const, stub: true as const },
    },
  },

  /** Wall HP baseline per segment by age (age-up applies rules in FortSystem). */
  wallHpByAge: {
    dark: 190,
    feudal: 340,
    castle: 620,
    imperial: 960,
  } as Record<string, number>,

  /** Repair: cost per 40 HP chunk; blocked for repairLockMs after taking damage. */
  repair: {
    chunkHp: 40,
    darkFeudal: { wood: 25, gold: 10 },
    castleImperial: { wood: 40, gold: 20 },
    lockMs: 500,
  },

  /** Rebuild a destroyed (BREACH) segment — Nick sheet */
  rebuild: {
    wood: 80,
    gold: 40,
    /** Channel / place time before wall returns */
    placeMs: 2000,
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
      /** Sets stone baseline (= castle HP), or +120 if already hardened */
      stoneBaseline: 620,
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
      damage: 12,
      fireRatePerSec: 1.0,
      rangeTiles: 3.4,
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
    /** Feudal — Spearmen post; +100% vs cavalry (knight) */
    spearPost: {
      damage: 5,
      fireRatePerSec: 0.8,
      rangeTiles: 2.0,
      splashTiles: 0,
      costWood: 50,
      costGold: 28,
      projectileSpeed: 340,
      vsCavalryMult: 2.0,
    },
    /** Feudal — long range single-target */
    longbow: {
      damage: 16,
      fireRatePerSec: 0.7,
      rangeTiles: 4.2,
      splashTiles: 0,
      costWood: 60,
      costGold: 40,
      projectileSpeed: 420,
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

  /** Enemy wall DPS — Ideas Guy pin (Nick walls2) */
  wallDps: {
    militia: 2,
    archer: 1,
    spearman: 3,
    knight: 4,
    ram: 10,
    elephant: 7,
  } as Record<string, number>,
  elephantSplashAdjacent: 0.25, // 25% splash to adjacent wall segments

  /** Enemy combat stats (HP/speed not on sheet — tuned to sheet tower DPS; bounty IS sheet) */
  enemies: {
    militia: {
      hp: 28,
      speed: 70,
      armor: 0,
      bountyWood: 4,
      bountyGold: 2,
      radius: 10,
    },
    archer: {
      hp: 22,
      speed: 78,
      armor: 0,
      bountyWood: 4,
      bountyGold: 4,
      radius: 9,
    },
    spearman: {
      hp: 40,
      speed: 62,
      armor: 2,
      bountyWood: 6,
      bountyGold: 4,
      radius: 11,
    },
    knight: {
      hp: 95,
      speed: 48,
      armor: 5,
      bountyWood: 8,
      bountyGold: 8,
      radius: 13,
    },
    ram: {
      hp: 220,
      speed: 32,
      armor: 8,
      bountyWood: 20,
      bountyGold: 16,
      radius: 16,
    },
    elephant: {
      hp: 1200,
      speed: 28,
      armor: 12,
      bountyWood: 80,
      bountyGold: 80,
      radius: 22,
    },
  },

  /** Placement — tighter so ~2× courtyard fits more towers */
  placement: {
    towerRadius: 13,
    keepClearance: 28,
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
