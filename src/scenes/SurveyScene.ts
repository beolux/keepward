import Phaser from 'phaser';
import { Palette } from '../data/palette';
import { GAME_W, GAME_H, HUD_TOP, HUD_BOTTOM } from '../data/map';
import { applyLockedView, pointerToWorld } from '../utils/view';
import { FRAME_ORIGIN } from '../data/artBible';
import { hasFrame } from '../art/atlas';
import { audio } from '../systems/AudioSystem';
import {
  SURVEY,
  SurveyDraft,
  makeQuickFort,
  suggestedRing,
  ringWorldRect,
  snapKeepTile,
  snapWallEdge,
  strokeEdgeChain,
  tileCenter,
  type SurveyTool,
  type SurveyedFort,
} from '../data/survey';

type BarId = SurveyTool | 'undo' | 'reset' | 'confirm';

export class SurveyScene extends Phaser.Scene {
  private draft = new SurveyDraft();
  private tool: SurveyTool = 'keep';
  private painting = false;
  private lastEdge: { axis: 'H' | 'V'; c: number; r: number } | null = null;

  private ground!: Phaser.GameObjects.Graphics;
  private gridGfx!: Phaser.GameObjects.Graphics;
  private ringGfx!: Phaser.GameObjects.Graphics;
  private wallGfx!: Phaser.GameObjects.Graphics;
  private ghostGfx!: Phaser.GameObjects.Graphics;
  private keepImg?: Phaser.GameObjects.Image;
  private keepGfx?: Phaser.GameObjects.Graphics;
  private statusText!: Phaser.GameObjects.Text;
  private tipText!: Phaser.GameObjects.Text;
  private bar: {
    id: BarId;
    bg: Phaser.GameObjects.Rectangle;
    label: Phaser.GameObjects.Text;
  }[] = [];

  constructor() {
    super('Survey');
  }

  init(data?: { quick?: boolean }): void {
    if (data?.quick) {
      const layout = makeQuickFort();
      this.scene.start('Game', { survey: layout });
    }
  }

  create(): void {
    if (this.scene.get('Game')?.sys?.isActive()) {
      /* arriving via init quick already left */
    }
    applyLockedView(this);
    this.cameras.main.setBackgroundColor(Palette.grassDark);
    this.draft = new SurveyDraft();
    this.tool = 'keep';
    this.painting = false;
    this.lastEdge = null;

    this.ground = this.add.graphics().setDepth(0);
    this.drawField();
    this.gridGfx = this.add.graphics().setDepth(2);
    this.drawGrid();
    this.ringGfx = this.add.graphics().setDepth(3);
    this.wallGfx = this.add.graphics().setDepth(8);
    this.ghostGfx = this.add.graphics().setDepth(20);

    this.add.rectangle(GAME_W / 2, 22, GAME_W, 44, Palette.hudBg, 0.9).setDepth(100);
    this.add
      .text(GAME_W / 2, 14, 'SURVEY', {
        fontFamily: 'Georgia, serif',
        fontSize: '16px',
        color: '#C4A35A',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0)
      .setDepth(101);
    this.statusText = this.add
      .text(GAME_W / 2, 32, '', {
        fontFamily: 'system-ui',
        fontSize: '11px',
        color: '#F0EBE0',
      })
      .setOrigin(0.5, 0)
      .setDepth(101);

    this.buildBar();
    this.tipText = this.add
      .text(GAME_W / 2, GAME_H - 128, 'Drag Keep onto dirt · walls snap to grid', {
        fontFamily: 'system-ui',
        fontSize: '11px',
        color: '#A0A090',
      })
      .setOrigin(0.5)
      .setDepth(101);

    this.input.on('pointerdown', this.onDown, this);
    this.input.on('pointermove', this.onMove, this);
    this.input.on('pointerup', this.onUp, this);
    this.input.on('pointerupoutside', this.onUp, this);
    this.events.once('shutdown', () => {
      this.input.off('pointerdown', this.onDown, this);
      this.input.off('pointermove', this.onMove, this);
      this.input.off('pointerup', this.onUp, this);
      this.input.off('pointerupoutside', this.onUp, this);
    });

    this.redrawFort();
    this.refreshBar();
    audio.unlock();
  }

  private drawField(): void {
    const g = this.ground;
    g.clear();
    const { width, height } = this.scale;
    g.fillStyle(Palette.grassDark, 1);
    g.fillRect(0, 0, width, height);
    g.fillStyle(Palette.grass, 1);
    g.fillRect(0, HUD_TOP, GAME_W, GAME_H - HUD_TOP - HUD_BOTTOM);
    g.fillStyle(Palette.dirt, 0.55);
    const grid = this.draft.grid;
    g.fillRect(grid.originX, grid.originY, grid.cols * grid.tile, grid.rows * grid.tile);
    g.fillStyle(Palette.grassLight, 0.22);
    for (let i = 0; i < 40; i++) {
      g.fillCircle(
        Phaser.Math.Between(8, GAME_W - 8),
        Phaser.Math.Between(HUD_TOP + 8, GAME_H - HUD_BOTTOM - 8),
        Phaser.Math.Between(4, 12),
      );
    }
  }

  private drawGrid(): void {
    const g = this.gridGfx;
    g.clear();
    const grid = this.draft.grid;
    g.lineStyle(1, Palette.ochreDark, 0.42);
    for (let c = 0; c <= grid.cols; c++) {
      const x = grid.originX + c * grid.tile;
      g.lineBetween(x, grid.originY, x, grid.originY + grid.rows * grid.tile);
    }
    for (let r = 0; r <= grid.rows; r++) {
      const y = grid.originY + r * grid.tile;
      g.lineBetween(grid.originX, y, grid.originX + grid.cols * grid.tile, y);
    }
  }

  private buildBar(): void {
    const ids: { id: BarId; label: string }[] = [
      { id: 'keep', label: 'Keep' },
      { id: 'wall', label: 'Wall' },
      { id: 'gate', label: 'Gate' },
      { id: 'undo', label: 'Undo' },
      { id: 'reset', label: 'Reset' },
      { id: 'confirm', label: 'Confirm' },
    ];
    const trayY = GAME_H - 64;
    this.add.rectangle(GAME_W / 2, trayY + 20, GAME_W, 108, Palette.hudBg, 0.95).setDepth(100);
    const w = 58;
    const gap = 4;
    const total = ids.length * w + (ids.length - 1) * gap;
    const startX = (GAME_W - total) / 2 + w / 2;
    ids.forEach((spec, i) => {
      const x = startX + i * (w + gap);
      const bg = this.add
        .rectangle(x, trayY, w, 48, Palette.hudPanel)
        .setStrokeStyle(2, Palette.stone)
        .setInteractive({ useHandCursor: true })
        .setDepth(102);
      const label = this.add
        .text(x, trayY, spec.label, {
          fontSize: spec.id === 'confirm' ? '10px' : '11px',
          color: '#F0EBE0',
          fontFamily: 'system-ui',
          fontStyle: 'bold',
          align: 'center',
        })
        .setOrigin(0.5)
        .setDepth(103);
      bg.on('pointerup', () => this.onBar(spec.id));
      this.bar.push({ id: spec.id, bg, label });
    });
  }

  private onBar(id: BarId): void {
    audio.unlock();
    if (id === 'undo') {
      if (this.draft.undo()) {
        audio.play('sell');
        this.redrawFort();
      } else audio.play('deny');
      this.refreshBar();
      return;
    }
    if (id === 'reset') {
      this.draft.reset();
      audio.play('deny');
      this.redrawFort();
      this.refreshBar();
      return;
    }
    if (id === 'confirm') {
      this.tryConfirm();
      return;
    }
    if (id === 'gate' && !this.draft.canPlaceGate) {
      audio.play('deny');
      this.tipText.setText('Gate after 5 straights · exactly one');
      return;
    }
    this.tool = id;
    this.refreshBar();
    this.tipText.setText(
      id === 'keep'
        ? 'Drag Keep onto dirt'
        : id === 'wall'
          ? 'Stroke walls on the grid · fat snap · corners free'
          : 'Tap a straight wall to place the gate',
    );
  }

  private tryConfirm(): void {
    const err = this.draft.confirmError();
    if (err) {
      audio.play('deny');
      this.tipText.setText(err);
      return;
    }
    let layout: SurveyedFort;
    try {
      layout = this.draft.toLayout();
    } catch {
      audio.play('deny');
      return;
    }
    audio.play('place');
    this.scene.start('Game', { survey: layout });
  }

  private world(ptr: Phaser.Input.Pointer): { x: number; y: number } {
    return pointerToWorld(this, ptr);
  }

  private inPlay(x: number, y: number): boolean {
    return y > HUD_TOP + 6 && y < GAME_H - HUD_BOTTOM;
  }

  private onDown = (ptr: Phaser.Input.Pointer): void => {
    audio.unlock();
    const { x, y } = this.world(ptr);
    if (!this.inPlay(x, y)) return;
    this.painting = true;
    this.lastEdge = null;
    this.applyAt(x, y, true);
  };

  private onMove = (ptr: Phaser.Input.Pointer): void => {
    const { x, y } = this.world(ptr);
    this.drawGhost(x, y);
    if (!this.painting) return;
    if (!this.inPlay(x, y)) return;
    this.applyAt(x, y, false);
  };

  private onUp = (): void => {
    this.painting = false;
    this.lastEdge = null;
    this.ghostGfx.clear();
    this.refreshBar();
  };

  private applyAt(x: number, y: number, first: boolean): void {
    if (this.tool === 'keep') {
      const snap = snapKeepTile(this.draft.grid, x, y);
      if (!snap) return;
      if (this.draft.placeKeep(snap.c, snap.r)) {
        if (first) audio.play('place');
        this.redrawFort();
      }
      return;
    }
    const edge = snapWallEdge(this.draft.grid, x, y);
    if (!edge) return;

    if (this.tool === 'gate') {
      if (
        this.lastEdge &&
        this.lastEdge.axis === edge.axis &&
        this.lastEdge.c === edge.c &&
        this.lastEdge.r === edge.r
      ) {
        return;
      }
      this.lastEdge = edge;
      const ok = this.draft.placeGate(edge.axis, edge.c, edge.r);
      if (ok) {
        audio.play('place');
        this.redrawFort();
        this.tool = 'wall';
      } else if (first) {
        audio.play('deny');
      }
      return;
    }

    // Wall stroke-draw: chain of adjacent edge tiles under the finger
    const chain = strokeEdgeChain(this.lastEdge, edge);
    if (chain.length === 0) return;
    let placed = 0;
    let denied = false;
    for (const e of chain) {
      if (this.draft.isOccupied(e.axis, e.c, e.r)) {
        this.lastEdge = e;
        continue;
      }
      if (this.draft.pieceCount >= SURVEY.maxPieces && !this.canMerge(e)) {
        denied = true;
        break;
      }
      if (this.draft.placeWall(e.axis, e.c, e.r)) {
        placed++;
        this.lastEdge = e;
      } else {
        denied = true;
        break;
      }
    }
    if (placed > 0) {
      audio.play('place');
      this.redrawFort();
    } else if (denied && first) {
      audio.play('deny');
    }
  }

  private drawGhost(x: number, y: number): void {
    const g = this.ghostGfx;
    g.clear();
    if (!this.inPlay(x, y)) return;
    if (this.tool === 'keep') {
      const snap = snapKeepTile(this.draft.grid, x, y);
      const valid = !!snap;
      const px = snap?.x ?? x;
      const py = snap?.y ?? y;
      g.fillStyle(valid ? Palette.rangeOk : Palette.rangeBad, 0.22);
      g.fillCircle(px, py, 28);
      g.lineStyle(2, valid ? Palette.rangeOk : Palette.rangeBad, 0.9);
      g.strokeRect(px - 20, py - 20, 40, 40);
      g.fillStyle(Palette.slate, valid ? 0.55 : 0.25);
      g.fillRoundedRect(px - 16, py - 22, 32, 36, 3);
      return;
    }
    const edge = snapWallEdge(this.draft.grid, x, y);
    // Always keep a ghost under the finger; snap preview when in range
    g.fillStyle(Palette.rangeOk, 0.12);
    g.fillCircle(x, y, 14);
    if (!edge) {
      g.lineStyle(2, Palette.chalk, 0.55);
      g.strokeCircle(x, y, 10);
      return;
    }
    const grid = this.draft.grid;
    const th = SURVEY.wallThickness;
    const occupied = this.draft.isOccupied(edge.axis, edge.c, edge.r);
    const atMax = this.draft.pieceCount >= SURVEY.maxPieces && !this.canMerge(edge);
    const valid =
      this.tool === 'wall'
        ? !occupied && !atMax
        : this.draft.canPlaceGate && (!occupied || this.isStraightAt(edge));
    // Deny color only on true overlap / max (not snap miss)
    const color = valid ? Palette.rangeOk : Palette.rangeBad;
    g.fillStyle(color, 0.45);
    if (edge.axis === 'H') {
      g.fillRect(grid.originX + edge.c * grid.tile, grid.originY + edge.r * grid.tile - th / 2, grid.tile, th);
    } else {
      g.fillRect(grid.originX + edge.c * grid.tile - th / 2, grid.originY + edge.r * grid.tile, th, grid.tile);
    }
    g.lineStyle(2, color, 0.95);
    if (edge.axis === 'H') {
      g.strokeRect(grid.originX + edge.c * grid.tile, grid.originY + edge.r * grid.tile - th / 2, grid.tile, th);
    } else {
      g.strokeRect(grid.originX + edge.c * grid.tile - th / 2, grid.originY + edge.r * grid.tile, th, grid.tile);
    }
  }

  private canMerge(edge: { axis: 'H' | 'V'; c: number; r: number }): boolean {
    return this.draft.pieces.some((p) => {
      if (p.kind !== 'straight' || p.axis !== edge.axis) return false;
      if (edge.axis === 'H') return p.a === edge.r && (p.b + p.len === edge.c || p.b === edge.c + 1);
      return p.a === edge.c && (p.b + p.len === edge.r || p.b === edge.r + 1);
    });
  }

  private isStraightAt(edge: { axis: 'H' | 'V'; c: number; r: number }): boolean {
    return this.draft.pieces.some((p) => {
      if (p.kind !== 'straight' || p.axis !== edge.axis) return false;
      if (edge.axis === 'H') return p.a === edge.r && edge.c >= p.b && edge.c < p.b + p.len;
      return p.a === edge.c && edge.r >= p.b && edge.r < p.b + p.len;
    });
  }

  private redrawFort(): void {
    const g = this.wallGfx;
    g.clear();
    const th = SURVEY.wallThickness;
    for (const p of this.draft.pieces) {
      const r = this.draft.pieceWorldRect(p);
      if (p.kind === 'gate') {
        g.fillStyle(Palette.wood, 1);
        g.fillRect(r.x, r.y, r.w, r.h);
        g.fillStyle(Palette.dirtDark, 0.9);
        if (r.w >= r.h) g.fillRect(r.x + r.w * 0.32, r.y - 1, r.w * 0.36, r.h + 2);
        else g.fillRect(r.x - 1, r.y + r.h * 0.32, r.w + 2, r.h * 0.36);
        g.lineStyle(1, Palette.gold, 0.7);
        g.strokeRect(r.x, r.y, r.w, r.h);
      } else if (p.kind === 'corner') {
        g.fillStyle(Palette.ochreDark, 1);
        g.fillRect(r.x, r.y, r.w, r.h);
        g.lineStyle(1, Palette.wood, 0.8);
        g.strokeRect(r.x, r.y, r.w, r.h);
      } else {
        // palisade logs
        g.fillStyle(Palette.wood, 1);
        g.fillRect(r.x, r.y, r.w, r.h);
        g.fillStyle(Palette.ochreDark, 0.55);
        const step = 5;
        if (r.w >= r.h) {
          for (let x = r.x; x < r.x + r.w; x += step) g.fillRect(x, r.y, 3, r.h);
        } else {
          for (let y = r.y; y < r.y + r.h; y += step) g.fillRect(r.x, y, r.w, 3);
        }
        g.lineStyle(1, Palette.ochreDark, 0.85);
        g.strokeRect(r.x, r.y, r.w, r.h);
      }
      void th;
    }

    this.drawRing();
    this.drawKeep();
    this.refreshBar();
  }

  private drawRing(): void {
    const g = this.ringGfx;
    g.clear();
    const grid = this.draft.grid;
    const kc = this.draft.keep?.c ?? Math.floor(grid.cols / 2);
    const kr = this.draft.keep?.r ?? Math.floor(grid.rows / 2);
    const ring = suggestedRing(grid, kc, kr);
    const rr = ringWorldRect(grid, ring);
    g.lineStyle(2, Palette.gold, 0.28);
    g.strokeRect(rr.x, rr.y, rr.w, rr.h);
    // dashed inner hint
    g.lineStyle(1, Palette.chalk, 0.18);
    const inset = grid.tile * 0.15;
    g.strokeRect(rr.x + inset, rr.y + inset, rr.w - inset * 2, rr.h - inset * 2);
  }

  private drawKeep(): void {
    const grid = this.draft.grid;
    const pos = this.draft.keep
      ? tileCenter(grid, this.draft.keep.c, this.draft.keep.r)
      : null;
    if (!pos) {
      this.keepImg?.setVisible(false);
      this.keepGfx?.clear();
      return;
    }
    if (hasFrame(this, 'keep')) {
      if (!this.keepImg) {
        const o = FRAME_ORIGIN.keep;
        this.keepImg = this.add.image(pos.x, pos.y, 'keepward', 'keep').setOrigin(o.x, o.y).setDepth(12);
      }
      this.keepImg.setPosition(pos.x, pos.y).setVisible(true);
      this.keepGfx?.clear();
    } else {
      if (!this.keepGfx) this.keepGfx = this.add.graphics().setDepth(12);
      const k = this.keepGfx;
      k.clear();
      k.fillStyle(Palette.mortar, 0.9);
      k.fillEllipse(pos.x, pos.y + 18, 52, 20);
      k.fillStyle(Palette.slate, 1);
      k.fillRoundedRect(pos.x - 18, pos.y - 22, 36, 40, 3);
      k.fillStyle(Palette.ochre, 1);
      k.fillRect(pos.x - 6, pos.y + 4, 12, 14);
    }
  }

  private refreshBar(): void {
    const err = this.draft.confirmError();
    const n = this.draft.pieceCount;
    const gates = this.draft.gateCount;
    this.statusText.setText(
      `Keep ${this.draft.keep ? '✓' : '—'}  ·  Walls ${n}/${SURVEY.maxPieces}  ·  Gate ${gates}/1`,
    );
    for (const b of this.bar) {
      const selected = b.id === this.tool;
      let fill: number = Palette.hudPanel;
      let alpha = 1;
      let stroke: number = Palette.stone;
      if (b.id === 'keep' || b.id === 'wall' || b.id === 'gate') {
        fill = selected ? Palette.ochreDark : Palette.hudPanel;
        stroke = selected ? Palette.ochre : Palette.stone;
        if (b.id === 'gate' && !this.draft.canPlaceGate && this.draft.gateCount === 0) alpha = 0.4;
        if (b.id === 'gate' && this.draft.gateCount === 1) alpha = 0.4;
      } else if (b.id === 'confirm') {
        const ok = !err;
        fill = ok ? Palette.ochre : Palette.slate;
        stroke = ok ? Palette.gold : Palette.stone;
        alpha = ok ? 1 : 0.55;
        b.label.setColor(ok ? '#1A2A22' : '#F0EBE0');
      } else if (b.id === 'undo' || b.id === 'reset') {
        alpha = n || this.draft.keep ? 1 : 0.45;
      }
      b.bg.setFillStyle(fill);
      b.bg.setStrokeStyle(2, stroke);
      b.bg.setAlpha(alpha);
      b.label.setAlpha(alpha);
    }
    if (!err) this.tipText.setText('Confirm locks the fort · then build towers');
  }
}
