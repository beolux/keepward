import Phaser from 'phaser';
import { TOWERS, type TowerId, type UpgradeTrack } from '../data/towers';
import { Palette } from '../data/palette';
import { TUNING, TILE_PX } from '../data/tuning';
import type { EnemyUnit } from './Enemy';

export class TowerUnit extends Phaser.GameObjects.Container {
  towerId: TowerId;
  kills = 0;
  ranks: Record<UpgradeTrack, number> = { rof: 0, range: 0, damage: 0 };
  range: number;
  fireIntervalMs: number;
  damage: number;
  splash: number;
  cooldown = 0;
  selected = false;

  private bodyGfx: Phaser.GameObjects.Graphics;
  private rangeRing: Phaser.GameObjects.Graphics;
  private hitZone: Phaser.GameObjects.Zone;

  constructor(scene: Phaser.Scene, x: number, y: number, towerId: TowerId) {
    super(scene, x, y);
    this.towerId = towerId;
    const def = TOWERS[towerId];
    this.range = def.range;
    this.fireIntervalMs = def.fireIntervalMs;
    this.damage = def.damage;
    this.splash = def.splash;

    this.rangeRing = scene.add.graphics();
    this.bodyGfx = scene.add.graphics();
    this.add([this.rangeRing, this.bodyGfx]);
    this.drawBody();
    this.drawRange(false);
    this.setDepth(25);

    this.hitZone = scene.add
      .zone(0, 0, 40, 40)
      .setInteractive({ useHandCursor: true });
    this.add(this.hitZone);

    scene.add.existing(this);
  }

  get def() {
    return TOWERS[this.towerId];
  }

  private drawBody(): void {
    const g = this.bodyGfx;
    g.clear();
    const id = this.towerId;
    const def = this.def;

    if (id === 'keep') {
      g.fillStyle(def.color, 1);
      g.fillRoundedRect(-22, -18, 44, 40, 4);
      g.fillStyle(def.accent, 1);
      for (let i = -18; i <= 14; i += 10) g.fillRect(i, -28, 8, 12);
      g.fillStyle(Palette.dirtDark, 1);
      g.fillRect(-6, 2, 12, 20);
      return;
    }
    if (id === 'watchtower') {
      g.fillStyle(def.color, 1);
      g.fillRect(-10, -8, 20, 28);
      g.fillStyle(def.accent, 1);
      g.fillTriangle(0, -28, -14, -6, 14, -6);
      g.fillStyle(Palette.slate, 1);
      g.fillCircle(0, 2, 4);
      return;
    }
    g.fillStyle(def.color, 1);
    g.fillRoundedRect(-14, -4, 28, 22, 3);
    g.fillStyle(def.accent, 1);
    g.fillCircle(0, -8, 10);
    g.lineStyle(3, Palette.ochreDark, 1);
    g.strokeCircle(0, -8, 10);
    g.fillStyle(Palette.dirtDark, 1);
    g.fillRect(-2, -18, 4, 12);
  }

  drawRange(show: boolean, ok = true): void {
    this.rangeRing.clear();
    if (!show && !this.selected) return;
    const color = ok ? Palette.rangeOk : Palette.rangeBad;
    this.rangeRing.lineStyle(2, color, 0.55);
    this.rangeRing.strokeCircle(0, 0, this.range);
    this.rangeRing.fillStyle(color, 0.08);
    this.rangeRing.fillCircle(0, 0, this.range);
  }

  showRange(show: boolean): void {
    this.selected = show;
    this.drawRange(show, true);
  }

  recomputeStats(): void {
    const def = this.def;
    let rofBonus = 0;
    let rangeBonus = 0;
    let dmgBonus = 0;
    const th = TUNING.towerUpgradeRanks;
    for (let i = 0; i < this.ranks.rof; i++) rofBonus += th.rof[i];
    for (let i = 0; i < this.ranks.range; i++) rangeBonus += th.range[i] / 100; // +10% each
    for (let i = 0; i < this.ranks.damage; i++) dmgBonus += th.damage[i];

    this.damage = def.damage * (1 + dmgBonus);
    this.range = def.range * (1 + rangeBonus);
    // higher RoF % → shorter interval
    this.fireIntervalMs = def.fireIntervalMs / (1 + rofBonus);
    this.splash = def.splash;
    if (this.selected) this.drawRange(true, true);
  }

  killsNeededForNext(track: UpgradeTrack): number | null {
    const rank = this.ranks[track];
    if (rank >= 3) return null;
    return TUNING.towerUpgradeKills[rank];
  }

  canUnlockRank(track: UpgradeTrack): boolean {
    const need = this.killsNeededForNext(track);
    return need !== null && this.kills >= need;
  }

  upgradeCost(track: UpgradeTrack): { wood: number; gold: number } | null {
    const rank = this.ranks[track];
    if (rank >= 3) return null;
    return {
      wood: TUNING.towerUpgradeCost.wood[rank],
      gold: TUNING.towerUpgradeCost.gold[rank],
    };
  }

  applyUpgrade(track: UpgradeTrack): boolean {
    if (!this.canUnlockRank(track)) return false;
    this.ranks[track]++;
    this.recomputeStats();
    return true;
  }

  onKill(): void {
    this.kills++;
  }

  tryAcquire(enemies: EnemyUnit[], dtMs: number): EnemyUnit | null {
    this.cooldown -= dtMs;
    if (this.cooldown > 0) return null;
    let best: EnemyUnit | null = null;
    let bestDist = Infinity;
    for (const e of enemies) {
      if (!e.alive) continue;
      const d = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
      if (d <= this.range && d < bestDist) {
        bestDist = d;
        best = e;
      }
    }
    if (best) this.cooldown = this.fireIntervalMs;
    return best;
  }

  setTapHandler(fn: () => void): void {
    this.hitZone.off('pointerup');
    this.hitZone.on('pointerup', fn);
  }
}

/** Ghost preview while placing */
export class PlacementGhost {
  gfx: Phaser.GameObjects.Graphics;
  rangeGfx: Phaser.GameObjects.Graphics;
  towerId: TowerId = 'watchtower';
  active = false;
  valid = false;
  x = 0;
  y = 0;

  constructor(scene: Phaser.Scene) {
    this.rangeGfx = scene.add.graphics().setDepth(90);
    this.gfx = scene.add.graphics().setDepth(91);
  }

  setTower(id: TowerId): void {
    this.towerId = id;
  }

  show(x: number, y: number, valid: boolean): void {
    this.active = true;
    this.valid = valid;
    this.x = x;
    this.y = y;
    const def = TOWERS[this.towerId];
    const color = valid ? Palette.rangeOk : Palette.rangeBad;
    this.rangeGfx.clear();
    this.rangeGfx.lineStyle(2, color, 0.6);
    this.rangeGfx.strokeCircle(x, y, def.range);
    this.rangeGfx.fillStyle(color, 0.1);
    this.rangeGfx.fillCircle(x, y, def.range);

    this.gfx.clear();
    this.gfx.fillStyle(def.color, valid ? 0.85 : 0.4);
    if (this.towerId === 'watchtower') {
      this.gfx.fillRect(x - 10, y - 8, 20, 28);
      this.gfx.fillStyle(def.accent, valid ? 0.9 : 0.4);
      this.gfx.fillTriangle(x, y - 28, x - 14, y - 6, x + 14, y - 6);
    } else {
      this.gfx.fillRoundedRect(x - 14, y - 4, 28, 22, 3);
      this.gfx.fillStyle(def.accent, valid ? 0.9 : 0.4);
      this.gfx.fillCircle(x, y - 8, 10);
    }
  }

  hide(): void {
    this.active = false;
    this.gfx.clear();
    this.rangeGfx.clear();
  }

  destroy(): void {
    this.gfx.destroy();
    this.rangeGfx.destroy();
  }
}

// silence unused if TILE only for docs
void TILE_PX;
