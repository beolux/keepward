# Keepward tuning

**Source of truth:** `src/data/tuning.ts`

Downstream files (`ages.ts`, `towers.ts`, `enemies.ts`, `waves.ts`, `FortSystem`) read from tuning.

## Nick override (early1)
Soft early waves 1–6 (exact counts); knights from w6; first elite w10; w7–11 −25% counts. Enemy HP / tower dmg / walls / place-freeze / w12+ untouched (dmg2 towers still in).

## Fort
- 8 wall segments: N/NE/E/SE/S/SW/W/NW
- Layouts: square / wide / tall (`src/data/fort.ts`) — courtyard ~2× interior placeable area
- Free place anywhere inside courtyard (not walls/exterior/keep/towers)
- Placement: towerRadius 13 · keepClearance 28

## Wall HP by age (per segment) — walls3 (~+20% over walls2)
| Age | HP |
|-----|-----|
| Dark | 190 |
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
50 waves. Knights w6 · Rams w12 · elite every 5 from w10 · Elephant boss w50.

## Enemy HP / speed (not on combat DPS sheet)
See `TUNING.enemies` in `tuning.ts`. Wall DPS + bounties are sheet-pinned.

## Build phase (UX)
- Before wave 1 and between waves: build window (place / upgrade / repair / rebuild)
- Timer: 13s waves 1–20, 10s from wave 21+
- Thumb **Start Wave** skips timer
- Incoming-side tell: glow + chevron + dust on next spawn edge
