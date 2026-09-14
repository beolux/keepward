# Keepward tuning

**Source of truth:** `src/data/tuning.ts`

**night1 juice:** combat numbers unchanged. Ceremony only — kill pop / bounty float / pitch-step SFX, CoC HP bars on hit, pip pulse, age fanfare, wave-clear beat + brief slow-mo, 2s undo chip, A2HS once after first clear/age, victory recap. Survey/dock-drag/place-freeze/bounties/research untouched.

Downstream files (`ages.ts`, `towers.ts`, `enemies.ts`, `waves.ts`, `FortSystem`) read from tuning.

## Nick / CoS override (early2)
Softer than early1. Exact comps w1–8; knights from **w8** (not w6); first elite still w10; rams still w12. W9–11 keep −25% mix but knights max 1 until w11. Spawn-time HP ×0.65 on w1–5 and ×0.85 on w6–8 (in `spawnEnemy`, not ENEMIES base). Interval floor 500ms through w8. Tower dmg / walls / place-freeze / w12+ untouched.

## CoS bounty1 — 2× kill wood/gold
Research costs made saving hard. **2× all kill wood and gold** so research + repairs fund from kills. Passive trickle, wave-clear `bonusGold`, research costs, wave comps, place-freeze, combat damage **unchanged**.

| Enemy | Wood | Gold |
|-------|------|------|
| Militia | 4 | 2 |
| Archer | 4 | 4 |
| Spearman | 6 | 4 |
| Knight | 8 | 8 |
| Ram | 20 | 16 |
| Elephant | 80 | 80 |

## Fort
- **survey1b:** player-surveyed palisade (or Quick fort rect + 1-tile south gate)
- Min 6 / max 12 wall pieces = straights + gate only (auto-corners free); exactly 1 gate after ≥5 straight tiles
- Fat snap 1.0 tile; stroke-draw paints adjacent edge chain
- Survey is FREE. Dark palisade HP **160** on confirm. Repair after w1 still paid.
- Free place anywhere inside courtyard (not walls/exterior/keep/towers)
- Placement: towerRadius 13 · keepClearance 28

## Wall HP by age (per segment) — survey1 Dark 160; later ages walls3
| Age | HP |
|-----|-----|
| Dark | 160 |
| Feudal | 340 |
| Castle | 620 |
| Imperial | 960 |

Age-up: undamaged → new baseline; damaged → +Δ of tier jump.

## Wall DPS (Ideas Guy pin)
Militia 2 · Archer 1 · Spearman 3 · Knight 4 · Ram 10 · Elephant 7 (+25% adjacent splash)

## Wall upgrades
- Feudal Hardened Timbers: 120W+40G (+60 HP all)
- Castle Stone Facing: 180W+120G (620 or +120 if hardened)
- Imperial 960 from age-up only

## Repair / rebuild
- Damaged: Dark/Feudal 25W+10G · Castle/Imperial 40W+20G per 40 HP
- Lock 0.5s after hit
- **Rebuild BREACH:** 80W+40G → full HP at current age · 2s place time
- Tap wall to repair · Tap BREACH to rebuild (build phase gold outline)

## Towers
- Watchtower (Dark): 12 dmg, 1.0/s, range 3.4
- Mangonel (Feudal): 14 splash r=0.8, 0.35/s, range 3.0
- **Spear Post (Feudal):** 5 dmg, 0.8/s, range 2.0, +100% vs cavalry (knight)
- **Longbow Tower (Feudal):** 16 dmg, 0.7/s, range 4.2
- Kill gates: 8 / 20 / 40 cumulative
- Tracks: RoF +12/12/16% · Range +10%×3 · Dmg +15/15/20%

## Ages / economy
- Start 100W+60G
- Passive 4W/s + 2G/s (+25%/age)
- Feudal 150W+80G · Castle 320W+220G · Imperial 500W+400G
- Channel 4s
- Keep HP 1000 · auto 3 dmg @ 0.5/s

## Waves
50 waves. Knights w8 · Rams w12 · elite every 5 from w10 · Elephant boss w50.

### early2 open (exact)
| Wave | Comp | Notes |
|------|------|-------|
| 1 | 3 militia @ 1100ms | HP ×0.65 |
| 2 | 4 militia @ 1000ms | HP ×0.65 |
| 3 | 5 militia | HP ×0.65 |
| 4 | 6 militia + 1 archer (delay 1.2s) | HP ×0.65 |
| 5 | 6 militia + 2 spears (no archers) | HP ×0.65 |
| 6 | 7 militia + 2 archers (no knight) | HP ×0.85 |
| 7 | 7 militia + 2 spears + 1 archer | HP ×0.85 |
| 8 | 8 militia + 2 spears + 2 archers + 1 knight | HP ×0.85; first knight |
| 9–11 | −25% mix; knights max 1 | elite pack @ w10 |
| 12+ | unchanged late curve | rams from 12 |

## Enemy HP / speed (not on combat DPS sheet)
See `TUNING.enemies` in `tuning.ts`. Wall DPS sheet-pinned; bounties are CoS bounty1 (2× sheet).

## Build phase (UX)
- Before wave 1 and between waves: build window (place / upgrade / repair / rebuild)
- Timer: 13s waves 1–20, 10s from wave 21+
- Thumb **Start Wave** skips timer
- Incoming-side tell: glow + chevron + dust on next spawn edge


## Keep research (keep1)
Keep is the research hall. Tap Keep → Age · Attack · Defense · Siege.
Age gates availability; research spends to unlock. **Age does NOT gift** Longbow / Spear / Mangonel.

### Age-up (unchanged)
Feudal 150W+80G · Castle 320W+220G · Imperial 500W+400G · 4s channel

### Siege (one-time)
| Unlock | Age | Cost |
|--------|-----|------|
| Longbow | Feudal | 200W+150G |
| Spear | Feudal | 180W+120G |
| Mangonel | Castle | 280W+220G |
| Watchtower | Dark | free |
| Bombard | later | stub |

### Attack
| Id | Effect | Cost |
|----|--------|------|
| A1 Keep Bolts | shot 6 / 0.6 RoF | 220W+180G |
| A2 Barrage | Keep RoF +40% | 300W+260G |
| A3 War Drums | +12% RoF aura (needs A1) | 380W+320G |
| A4 Sharpened | +15% dmg aura (needs A1) | 420W+360G |
Aura 3.5 tiles — ring only when Keep selected; buffs towers inside.

### Defense
| Id | Effect | Cost |
|----|--------|------|
| D1 | Keep HP → 1400 | 200W+160G |
| D2 | → 1900 (needs D1) | 320W+280G |
| D3 Mason Guild | repair −30% (Castle) | 360W+300G |
| D4 Tower Pavise | +15% tower HP in aura (Castle) | 400W+340G |

### Pips / ranks
- Gold pip = affordable upgrade now; silver check = maxed. Clears on tap.
- Kill-rank looks (trim/crenelation) + Keep research rank art. Same colliders.
