/**
 * Keepward art bible — Ideas Guy notes land here.
 * Flat gouache / storybook. No PBR, no AoE, original IP.\n * art2: distinct tower nouns + per-tower shots + tight shadows.
 * Swap atlas PNGs; keep gameplay IDs + pivots stable.
 */

export const ArtHex = {
  dirt: '#C4A574',
  grass: '#8B9A5B',
  forest: '#3F6B4F',
  ochreWood: '#B8862D',
  slate: '#6B7280',
  chalk: '#E8DCC8',
  nightRoof: '#3D4F5F',
  blood: '#8B3A3A',
  // supporting mixes
  logBark: '#8B6914',
  logBarkDark: '#6B4423',
  thatch: '#C4A35A',
  thatchDark: '#8B6914',
  mortar: '#E8DCC8',
  stoneBlock: '#7A8490',
  stoneBlockDark: '#5A6470',
  keepBody: '#6B7280',
  banner: '#8B3A3A',
  shadow: '#1A2218',
  sunRim: '#E8DCC8',
  militiaTunic: '#6B4423',
  archerHood: '#3F6B4F',
  spearShield: '#A08050',
  knightSteel: '#6B7280',
  knightGold: '#D4A84B',
  ramWood: '#5A3A1A',
  elephantHide: '#6B5A4A',
  elephantCloth: '#B8862D',
} as const;

/** Phaser-ready 0xRRGGBB from art bible */
export const ArtPalette = {
  dirt: 0xc4a574,
  grass: 0x8b9a5b,
  forest: 0x3f6b4f,
  ochreWood: 0xb8862d,
  slate: 0x6b7280,
  chalk: 0xe8dcc8,
  nightRoof: 0x3d4f5f,
  blood: 0x8b3a3a,
  logBark: 0x8b6914,
  logBarkDark: 0x6b4423,
  thatch: 0xc4a35a,
  thatchDark: 0x8b6914,
  mortar: 0xe8dcc8,
  stoneBlock: 0x7a8490,
  stoneBlockDark: 0x5a6470,
  keepBody: 0x6b7280,
  banner: 0x8b3a3a,
  shadow: 0x1a2218,
  sunRim: 0xe8dcc8,
  militiaTunic: 0x6b4423,
  archerHood: 0x3f6b4f,
  spearShield: 0xa08050,
  knightSteel: 0x6b7280,
  knightGold: 0xd4a84b,
  ramWood: 0x5a3a1a,
  elephantHide: 0x6b5a4a,
  elephantCloth: 0xb8862d,
} as const;

/** UI age gem: grey → bronze → silver → gold */
export const AGE_GEM: Record<'dark' | 'feudal' | 'castle' | 'imperial', number> = {
  dark: 0x6b7280,
  feudal: 0xb87333,
  castle: 0xc0c8d0,
  imperial: 0xd4a84b,
};

export const ATLAS_KEY = 'keepward';
export const ATLAS_URL_PNG = 'assets/keepward-atlas.png';
export const ATLAS_URL_JSON = 'assets/keepward-atlas.json';

export type AtlasFrameId =
  | 'terrain_dirt'
  | 'terrain_grass'
  | 'terrain_stone'
  | 'wall_wood'
  | 'wall_stone'
  | 'keep'
  | 'keep_aged'
  | 'keep_r1'
  | 'keep_r2'
  | 'keep_r3'
  | 'tower_watchtower'
  | 'tower_watchtower_aged'
  | 'tower_watchtower_r1'
  | 'tower_watchtower_r2'
  | 'tower_watchtower_r3'
  | 'tower_longbow'
  | 'tower_longbow_aged'
  | 'tower_longbow_r1'
  | 'tower_longbow_r2'
  | 'tower_longbow_r3'
  | 'tower_spearPost'
  | 'tower_spearPost_aged'
  | 'tower_spearPost_r1'
  | 'tower_spearPost_r2'
  | 'tower_spearPost_r3'
  | 'tower_mangonel'
  | 'tower_mangonel_aged'
  | 'tower_mangonel_r1'
  | 'tower_mangonel_r2'
  | 'tower_mangonel_r3'
  | 'unit_militia'
  | 'unit_archer'
  | 'unit_spearman'
  | 'unit_knight'
  | 'unit_ram'
  | 'unit_elephant';

/** Pivot as origin (0–1). Matches prior Graphics footprints — do not move. */
export const FRAME_ORIGIN: Record<AtlasFrameId, { x: number; y: number }> = {
  terrain_dirt: { x: 0.5, y: 0.5 },
  terrain_grass: { x: 0.5, y: 0.5 },
  terrain_stone: { x: 0.5, y: 0.5 },
  wall_wood: { x: 0.5, y: 0.5 },
  wall_stone: { x: 0.5, y: 0.5 },
  keep: { x: 0.5, y: 0.72 },
  keep_aged: { x: 0.5, y: 0.72 },
  keep_r1: { x: 0.5, y: 0.72 },
  keep_r2: { x: 0.5, y: 0.72 },
  keep_r3: { x: 0.5, y: 0.72 },
  tower_watchtower: { x: 0.5, y: 0.78 },
  tower_watchtower_aged: { x: 0.5, y: 0.78 },
  tower_watchtower_r1: { x: 0.5, y: 0.78 },
  tower_watchtower_r2: { x: 0.5, y: 0.78 },
  tower_watchtower_r3: { x: 0.5, y: 0.78 },
  tower_longbow: { x: 0.5, y: 0.78 },
  tower_longbow_aged: { x: 0.5, y: 0.78 },
  tower_longbow_r1: { x: 0.5, y: 0.78 },
  tower_longbow_r2: { x: 0.5, y: 0.78 },
  tower_longbow_r3: { x: 0.5, y: 0.78 },
  tower_spearPost: { x: 0.5, y: 0.82 },
  tower_spearPost_aged: { x: 0.5, y: 0.82 },
  tower_spearPost_r1: { x: 0.5, y: 0.82 },
  tower_spearPost_r2: { x: 0.5, y: 0.82 },
  tower_spearPost_r3: { x: 0.5, y: 0.82 },
  tower_mangonel: { x: 0.5, y: 0.78 },
  tower_mangonel_aged: { x: 0.5, y: 0.78 },
  tower_mangonel_r1: { x: 0.5, y: 0.78 },
  tower_mangonel_r2: { x: 0.5, y: 0.78 },
  tower_mangonel_r3: { x: 0.5, y: 0.78 },
  unit_militia: { x: 0.5, y: 0.72 },
  unit_archer: { x: 0.5, y: 0.72 },
  unit_spearman: { x: 0.5, y: 0.72 },
  unit_knight: { x: 0.5, y: 0.7 },
  unit_ram: { x: 0.5, y: 0.65 },
  unit_elephant: { x: 0.5, y: 0.65 },
};

export const TOWER_FRAME: Record<
  'watchtower' | 'longbow' | 'spearPost' | 'mangonel' | 'keep',
  { base: AtlasFrameId; aged: AtlasFrameId }
> = {
  watchtower: { base: 'tower_watchtower', aged: 'tower_watchtower_aged' },
  longbow: { base: 'tower_longbow', aged: 'tower_longbow_aged' },
  spearPost: { base: 'tower_spearPost', aged: 'tower_spearPost_aged' },
  mangonel: { base: 'tower_mangonel', aged: 'tower_mangonel_aged' },
  keep: { base: 'keep', aged: 'keep_aged' },
};

export const UNIT_FRAME: Record<
  'militia' | 'archer' | 'spearman' | 'knight' | 'ram' | 'elephant',
  AtlasFrameId
> = {
  militia: 'unit_militia',
  archer: 'unit_archer',
  spearman: 'unit_spearman',
  knight: 'unit_knight',
  ram: 'unit_ram',
  elephant: 'unit_elephant',
};

/** Castle+ ages use slate roofs / stone trim */
export function ageUsesStoneLook(age: 'dark' | 'feudal' | 'castle' | 'imperial'): boolean {
  return age === 'castle' || age === 'imperial';
}

/**
 * Bible notes (drop more here mid-flight):
 * - Courtyard: packed earth + patchy grass; stone only under Keep
 * - Walls: Dark/Feudal = vertical palisade logs; Castle/Imperial = slate blocks + mortar
 * - Keep: square donjon, banner stub, tallest block
 * - Light: one soft top-left sun, short shadows
 * - Ban: chrome, neon, pixel mix, fake AoE civ flags, photoreal grass
 */
export const ART_NOTES = [
  'Flat gouache/storybook — no PBR, no AoE.',
  'Readable at arm’s length on iPhone.',
  'Palisade wood ≠ stone wall — clear material difference.',
  'Each tower distinct face; enemies by color + silhouette.',
  // art2 / Ideas Guy
  '64px nouns: WT open timber+cone; LB tall slit+crenels; Spear low stake ring (≤55% WT); Mangonel arm+counterweight.',
  'Shadows: ellipse α~0.35, overlap feet 2–4px — no float gap.',
  'Bases wood Dark/Feudal → slate Castle/Imperial.',
  'Pop: 1px #3D4F5F outline + warm fill + chalk rim light-side only.',
  'Projectiles: WT chalk arrow; LB longer dirt+green fletch; Spear stub; Mangonel slate boulder lob+dust.',
  // keep1
  'Keep = research hall: Age / Attack / Defense / Siege tabs.',
  'Upgrade pip: gold = affordable now; silver check = maxed. Clears on tap.',
  'Kill-rank looks: trim/crenelation + tint; rank 3 most capable. Same colliders.',
  'Aura ring 3.5 tiles only when Keep selected; buff towers inside.',
] as const;
