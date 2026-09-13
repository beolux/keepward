import Phaser from 'phaser';
import { TOWERS, type TowerId, type UpgradeTrack } from '../data/towers';
import { Palette } from '../data/palette';
import { TUNING, TILE_PX } from '../data/tuning';
import {
  ATLAS_KEY,
  FRAME_ORIGIN,
  TOWER_FRAME,
  ageUsesStoneLook,
  type AtlasFrameId,
} from '../data/artBible';
import type { AgeId } from '../data/ages';
import { hasFrame, makeAtlasSprite } from '../art/atlas';
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
  investedWood = 0;
  investedGold = 0;
  placedAt = 0;

  private bodyGfx: Phaser.GameObjects.Graphics;
  private bodySprite: Phaser.GameObjects.Image | null = null;
  private rangeRing: Phaser.GameObjects.Graphics;
  private hitZone: Phaser.GameObjects.Zone;
  private agedLook = false;

  constructor(scene: Phaser.Scene, x: number, y: number, towerId: TowerId) {
    super(scene, x, y);
    this.towerId = towerId;
    const def = TOWERS[towerId];
    this.range = def.range;
    this.fireIntervalMs = def.fireIntervalMs;
    this.damage = def.damage;
    this.splash = def.splash;
    this.investedWood = def.costWood;
    this.investedGold = def.costGold;
    this.placedAt = scene.time.now;

    this.rangeRing = scene.add.graphics();
    this.bodyGfx = scene.add.graphics();
    this.add([this.rangeRing, this.bodyGfx]);
    this.drawBody();
    this.drawRange(false);
    this.setDepth(25);

    this.hitZone = scene.add.zone(0, 0, 48, 48);
    this.add(this.hitZone);

    scene.add.existing(this);
  }

  get def() {
    return TOWERS[this.towerId];
  }

  /** Age-up roof tint: thatch → slate. Does not change colliders/range. */
  setAgeVisual(age: AgeId): void {
    const next = ageUsesStoneLook(age);
    if (next === this.agedLook) return;
    this.agedLook = next;
    this.drawBody();
  }

  private currentFrame(): AtlasFrameId {
    const pair = TOWER_FRAME[this.towerId];
    return this.agedLook ? pair.aged : pair.base;
  }

  private drawBody(): void {
    const g = this.bodyGfx;
    g.clear();

    const frame = this.currentFrame();
    if (hasFrame(this.scene, frame)) {
      if (!this.bodySprite) {
        this.bodySprite = makeAtlasSprite(this.scene, frame);
        if (this.bodySprite) this.addAt(this.bodySprite, 1);
      }
      if (this.bodySprite) {
        const o = FRAME_ORIGIN[frame];
        this.bodySprite.setTexture(ATLAS_KEY, frame);
        this.bodySprite.setOrigin(o.x, o.y);
        this.bodySprite.setVisible(true);
        return;
      }
    }
    if (this.bodySprite) this.bodySprite.setVisible(false);
    this.drawBodyProcedural(g);
  }

  private drawBodyProcedural(g: Phaser.GameObjects.Graphics): void {
    const id = this.towerId;
    const def = this.def;
    const roof = this.agedLook ? Palette.nightRoof : def.accent;

    if (id === 'keep') {
      g.fillStyle(0x000000, 0.28);
      g.fillEllipse(0, 16, 48, 10);
      g.fillStyle(this.agedLook ? Palette.slate : def.color, 1);
      g.fillRoundedRect(-22, -18, 44, 40, 4);
      g.fillStyle(roof, 1);
      for (let i = -18; i <= 14; i += 10) g.fillRect(i, -28, 8, 12);
      g.fillStyle(Palette.dirtDark, 1);
      g.fillRect(-6, 2, 12, 20);
      g.fillStyle(this.agedLook ? Palette.gold : Palette.blood, 1);
      g.fillRect(16, -22, 10, 7);
      return;
    }
    if (id === 'watchtower') {
      g.fillStyle(0x000000, 0.28);
      g.fillEllipse(0, 16, 28, 8);
      g.fillStyle(def.color, 1);
      g.fillRect(-10, -8, 20, 28);
      g.fillStyle(roof, 1);
      g.fillTriangle(0, -28, -14, -6, 14, -6);
      g.fillStyle(Palette.slate, 1);
      g.fillCircle(0, 2, 4);
      return;
    }
    if (id === 'spearPost') {
      g.fillStyle(0x000000, 0.28);
      g.fillEllipse(0, 12, 30, 8);
      g.fillStyle(def.color, 1);
      g.fillRoundedRect(-12, 0, 24, 16, 2);
      g.fillStyle(roof, 1);
      g.fillTriangle(-8, 2, -4, -22, 0, 2);
      g.fillTriangle(-2, 2, 2, -26, 6, 2);
      g.fillTriangle(4, 2, 8, -20, 12, 2);
      g.fillStyle(Palette.dirtDark, 1);
      g.fillRect(-14, 14, 28, 4);
      return;
    }
    if (id === 'longbow') {
      g.fillStyle(0x000000, 0.28);
      g.fillEllipse(0, 16, 26, 8);
      g.fillStyle(def.color, 1);
      g.fillRect(-8, -6, 16, 26);
      g.fillStyle(roof, 1);
      g.fillRoundedRect(-12, -18, 24, 14, 3);
      g.fillStyle(Palette.nightRoof, 1);
      g.fillRect(-6, -14, 3, 8);
      g.fillRect(4, -14, 3, 8);
      return;
    }
    g.fillStyle(0x000000, 0.28);
    g.fillEllipse(0, 14, 32, 8);
    g.fillStyle(def.color, 1);
    g.fillRoundedRect(-14, -4, 28, 22, 3);
    g.fillStyle(roof, 1);
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
    for (let i = 0; i < this.ranks.range; i++) rangeBonus += th.range[i] / 100;
    for (let i = 0; i < this.ranks.damage; i++) dmgBonus += th.damage[i];

    this.damage = def.damage * (1 + dmgBonus);
    this.range = def.range * (1 + rangeBonus);
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
    const cost = this.upgradeCost(track);
    this.ranks[track]++;
    if (cost) {
      this.investedWood += cost.wood;
      this.investedGold += cost.gold;
    }
    this.recomputeStats();
    return true;
  }

  refund(full: boolean): { wood: number; gold: number } {
    if (full) return { wood: this.investedWood, gold: this.investedGold };
    return {
      wood: Math.floor(this.investedWood * 0.5),
      gold: Math.floor(this.investedGold * 0.5),
    };
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

  enableTap(fn: () => void): void {
    this.hitZone.setInteractive({ useHandCursor: true });
    this.hitZone.off('pointerup');
    this.hitZone.on('pointerup', fn);
  }

  setTapHandler(fn: () => void): void {
    this.enableTap(fn);
  }

  destroyTower(): void {
    this.destroy(true);
  }
}

/** Ghost preview while placing — green valid / red invalid + live range */
export class PlacementGhost {
  gfx: Phaser.GameObjects.Graphics;
  rangeGfx: Phaser.GameObjects.Graphics;
  sprite: Phaser.GameObjects.Image | null = null;
  towerId: TowerId = 'watchtower';
  active = false;
  valid = false;
  x = 0;
  y = 0;
  private scene: Phaser.Scene;
  private agedLook = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.rangeGfx = scene.add.graphics().setDepth(90);
    this.gfx = scene.add.graphics().setDepth(91);
  }

  setTower(id: TowerId): void {
    this.towerId = id;
  }

  setAgeVisual(age: AgeId): void {
    this.agedLook = ageUsesStoneLook(age);
  }

  show(x: number, y: number, valid: boolean): void {
    this.active = true;
    this.valid = valid;
    this.x = x;
    this.y = y;
    const def = TOWERS[this.towerId];
    const color = valid ? Palette.rangeOk : Palette.rangeBad;
    this.rangeGfx.clear();
    this.rangeGfx.lineStyle(2.5, color, 0.65);
    this.rangeGfx.strokeCircle(x, y, def.range);
    this.rangeGfx.fillStyle(color, 0.12);
    this.rangeGfx.fillCircle(x, y, def.range);

    const pair = TOWER_FRAME[this.towerId];
    const frame = this.agedLook ? pair.aged : pair.base;
    if (hasFrame(this.scene, frame)) {
      this.gfx.clear();
      if (!this.sprite) {
        this.sprite = makeAtlasSprite(this.scene, frame);
        if (this.sprite) this.sprite.setDepth(91);
      }
      if (this.sprite) {
        const o = FRAME_ORIGIN[frame];
        this.sprite.setTexture(ATLAS_KEY, frame);
        this.sprite.setOrigin(o.x, o.y);
        this.sprite.setPosition(x, y);
        this.sprite.setAlpha(valid ? 0.92 : 0.45);
        this.sprite.setTint(valid ? 0xffffff : 0xaa6666);
        this.sprite.setVisible(true);
      }
      this.gfx.lineStyle(2, color, 0.9);
      this.gfx.strokeCircle(x, y, 16);
      return;
    }

    if (this.sprite) this.sprite.setVisible(false);
    this.gfx.clear();
    this.gfx.fillStyle(def.color, valid ? 0.9 : 0.45);
    if (this.towerId === 'watchtower') {
      this.gfx.fillRect(x - 10, y - 8, 20, 28);
      this.gfx.fillStyle(def.accent, valid ? 0.95 : 0.4);
      this.gfx.fillTriangle(x, y - 28, x - 14, y - 6, x + 14, y - 6);
    } else if (this.towerId === 'spearPost') {
      this.gfx.fillRoundedRect(x - 12, y, 24, 16, 2);
      this.gfx.fillStyle(def.accent, valid ? 0.95 : 0.4);
      this.gfx.fillTriangle(x - 2, y + 2, x + 2, y - 26, x + 6, y + 2);
    } else if (this.towerId === 'longbow') {
      this.gfx.fillRect(x - 8, y - 6, 16, 26);
      this.gfx.fillStyle(def.accent, valid ? 0.95 : 0.4);
      this.gfx.fillRoundedRect(x - 12, y - 18, 24, 14, 3);
    } else {
      this.gfx.fillRoundedRect(x - 14, y - 4, 28, 22, 3);
      this.gfx.fillStyle(def.accent, valid ? 0.95 : 0.4);
      this.gfx.fillCircle(x, y - 8, 10);
    }
    this.gfx.lineStyle(2, color, 0.9);
    this.gfx.strokeCircle(x, y, 16);
  }

  hide(): void {
    this.active = false;
    this.gfx.clear();
    this.rangeGfx.clear();
    if (this.sprite) this.sprite.setVisible(false);
  }

  destroy(): void {
    this.gfx.destroy();
    this.rangeGfx.destroy();
    this.sprite?.destroy();
  }
}

void TILE_PX;
