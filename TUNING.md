# Keepward tuning (Ideas Guy sheet)

**Source of truth:** `src/data/tuning.ts`

Drop Ideas Guy numbers there. Downstream files (`ages.ts`, `towers.ts`, `enemies.ts`, `waves.ts`, `FortSystem`) read from tuning.

## Fort
- 8 wall segments: N/NE/E/SE/S/SW/W/NW
- Layouts: square / wide / tall (`src/data/fort.ts`)
- Free place anywhere inside courtyard (not walls/exterior/keep/towers)

## Wall HP by age (per segment)
| Age | HP |
|-----|-----|
| Dark | 80 |
| Feudal | 140 |
| Castle | 260 |
| Imperial | 400 |

Age-up: undamaged → new baseline; damaged → +Δ of tier jump.

## Wall DPS
Militia 2 · Archer 1 · Spearman 3 · Knight 5 · Ram 18 · Elephant 12 (+40% adjacent splash)

## Wall upgrades
- Feudal Hardened Timbers: 120W+40G (+60 HP all)
- Castle Stone Facing: 180W+120G (260 or +120 if hardened)
- Imperial 400 from age-up only

## Repair
- Dark/Feudal: 25W+10G per 40 HP
- Castle/Imperial: 40W+20G per 40 HP
- Lock 0.5s after hit

## Towers
- Watchtower: 6 dmg, 1.0/s, range 2.5 tiles
- Mangonel: 14 splash r=0.8, 0.35/s, range 3.0 (Feudal)
- Kill gates: 8 / 20 / 40 cumulative
- Tracks: RoF +12/12/16% · Range +10%×3 · Dmg +15/15/20%

## Ages / economy
- Start 100W+60G
- Passive 4W/s + 2G/s (+25%/age)
- Feudal 150W+80G · Castle 320W+220G · Imperial 500W+400G
- Channel 4s
- Keep HP 1000 · auto 3 dmg @ 0.5/s

## Waves
50 waves. Knights w5 · Rams w12 · elite every 5 · Elephant boss w50.

## Enemy HP / speed (not on sheet — local until Ideas Guy overrides)
See `TUNING.enemies` in `tuning.ts`. Bounties and wall DPS are sheet-exact.

## Build phase (UX — not Ideas Guy combat sheet)
- Before wave 1 and between waves: build window (place / upgrade / repair)
- Timer: 13s waves 1–20, 10s from wave 21+
- Thumb **Start Wave** skips timer
- Incoming-side tell: glow + chevron + dust on next spawn edge
