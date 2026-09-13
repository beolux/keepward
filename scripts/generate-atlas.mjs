/**
 * Keepward atlas generator — flat gouache / storybook stamps.
 * Soft gradients, top-left rim light, short shadows. No PBR / AoE.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'public', 'assets');

const HEX = {
  dirt: '#C4A574',
  grass: '#8B9A5B',
  forest: '#3F6B4F',
  ochreWood: '#B8862D',
  slate: '#6B7280',
  chalk: '#E8DCC8',
  nightRoof: '#3D4F5F',
  blood: '#8B3A3A',
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
  transparent: '#00000000',
};

function parseHex(h) {
  const s = h.replace('#', '');
  if (s.length === 8) {
    return {
      r: parseInt(s.slice(0, 2), 16),
      g: parseInt(s.slice(2, 4), 16),
      b: parseInt(s.slice(4, 6), 16),
      a: parseInt(s.slice(6, 8), 16),
    };
  }
  return {
    r: parseInt(s.slice(0, 2), 16),
    g: parseInt(s.slice(2, 4), 16),
    b: parseInt(s.slice(4, 6), 16),
    a: 255,
  };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function mix(c1, c2, t) {
  return {
    r: Math.round(lerp(c1.r, c2.r, t)),
    g: Math.round(lerp(c1.g, c2.g, t)),
    b: Math.round(lerp(c1.b, c2.b, t)),
    a: Math.round(lerp(c1.a, c2.a, t)),
  };
}

function lighten(c, amt) {
  return mix(c, { r: 255, g: 255, b: 255, a: c.a }, amt);
}

function darken(c, amt) {
  return mix(c, { r: 20, g: 24, b: 20, a: c.a }, amt);
}

class Canvas {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = Buffer.alloc(w * h * 4);
  }

  idx(x, y) {
    return (y * this.w + x) * 4;
  }

  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return { r: 0, g: 0, b: 0, a: 0 };
    const i = this.idx(x | 0, y | 0);
    return { r: this.data[i], g: this.data[i + 1], b: this.data[i + 2], a: this.data[i + 3] };
  }

  blend(x, y, c, alpha = 1) {
    x = x | 0;
    y = y | 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = this.idx(x, y);
    const srcA = (c.a / 255) * alpha;
    if (srcA <= 0) return;
    const dr = this.data[i];
    const dg = this.data[i + 1];
    const db = this.data[i + 2];
    const da = this.data[i + 3] / 255;
    const outA = srcA + da * (1 - srcA);
    if (outA <= 0) return;
    this.data[i] = Math.round((c.r * srcA + dr * da * (1 - srcA)) / outA);
    this.data[i + 1] = Math.round((c.g * srcA + dg * da * (1 - srcA)) / outA);
    this.data[i + 2] = Math.round((c.b * srcA + db * da * (1 - srcA)) / outA);
    this.data[i + 3] = Math.round(outA * 255);
  }

  /** Soft circular gouache stamp */
  stamp(cx, cy, r, color, soft = 0.55, alpha = 1) {
    const c = typeof color === 'string' ? parseHex(color) : color;
    const R = Math.ceil(r + 1);
    for (let dy = -R; dy <= R; dy++) {
      for (let dx = -R; dx <= R; dx++) {
        const d = Math.hypot(dx, dy);
        if (d > r) continue;
        const edge = d / r;
        const fall = edge < soft ? 1 : 1 - (edge - soft) / (1 - soft);
        const a = Math.max(0, fall) ** 1.35;
        // top-left rim light bias
        const rim = Math.max(0, 1 - Math.hypot(dx + r * 0.35, dy + r * 0.35) / (r * 1.2));
        const col = mix(c, lighten(c, 0.35), rim * 0.45);
        this.blend(cx + dx, cy + dy, col, a * alpha);
      }
    }
  }

  /** Soft ellipse stamp */
  ellipse(cx, cy, rx, ry, color, soft = 0.55, alpha = 1) {
    const c = typeof color === 'string' ? parseHex(color) : color;
    const Rx = Math.ceil(rx + 1);
    const Ry = Math.ceil(ry + 1);
    for (let dy = -Ry; dy <= Ry; dy++) {
      for (let dx = -Rx; dx <= Rx; dx++) {
        const nx = dx / rx;
        const ny = dy / ry;
        const d = Math.hypot(nx, ny);
        if (d > 1) continue;
        const fall = d < soft ? 1 : 1 - (d - soft) / (1 - soft);
        const a = Math.max(0, fall) ** 1.3;
        const rim = Math.max(0, 1 - Math.hypot(nx + 0.35, ny + 0.35) / 1.3);
        const col = mix(c, lighten(c, 0.3), rim * 0.4);
        this.blend(cx + dx, cy + dy, col, a * alpha);
      }
    }
  }

  rect(x0, y0, w, h, color, alpha = 1, round = 0) {
    const c = typeof color === 'string' ? parseHex(color) : color;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let ok = true;
        if (round > 0) {
          const lx = x < round ? round - x : x > w - 1 - round ? x - (w - 1 - round) : 0;
          const ly = y < round ? round - y : y > h - 1 - round ? y - (h - 1 - round) : 0;
          if (lx > 0 && ly > 0 && Math.hypot(lx, ly) > round) ok = false;
        }
        if (!ok) continue;
        // soft top-left gradient wash
        const shade = 0.12 * ((x + y) / (w + h)) - 0.08 * ((w - x + y) / (w + h));
        const col = shade > 0 ? darken(c, shade) : lighten(c, -shade);
        this.blend(x0 + x, y0 + y, col, alpha);
      }
    }
  }

  /** Short drop shadow under feet — call with cy at feet, overlaps 2–4px */
  shadow(cx, cy, rx, ry, alpha = 0.35) {
    // No rim-lighten — keep dark so it reads on dirt/grass
    const c = parseHex(HEX.shadow);
    const Rx = Math.ceil(rx + 1);
    const Ry = Math.ceil(ry + 1);
    for (let dy = -Ry; dy <= Ry; dy++) {
      for (let dx = -Rx; dx <= Rx; dx++) {
        const nx = dx / rx;
        const ny = dy / ry;
        const d = Math.hypot(nx, ny);
        if (d > 1) continue;
        const soft = 0.25;
        const fall = d < soft ? 1 : 1 - (d - soft) / (1 - soft);
        const a = Math.max(0, fall) ** 1.15;
        this.blend(cx + dx, cy + dy, c, a * alpha);
      }
    }
  }

  /** 1px pop outline in nightRoof / #3D4F5F */
  outlineRect(x0, y0, w, h, round = 0, alpha = 0.95) {
    this.rect(x0 - 1, y0 - 1, w + 2, h + 2, HEX.nightRoof, alpha, Math.max(0, round + 1));
  }

  chalkRim(x, y, r = 2.5, alpha = 0.35) {
    this.stamp(x, y, r, HEX.sunRim, 0.55, alpha);
  }

  clear() {
    this.data.fill(0);
  }

  blitTo(dest, dx, dy) {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const c = this.get(x, y);
        if (c.a === 0) continue;
        dest.blend(dx + x, dy + y, c, 1);
      }
    }
  }
}

function paintTerrainDirt(size = 32) {
  const c = new Canvas(size, size);
  c.rect(0, 0, size, size, HEX.dirt, 1);
  for (let i = 0; i < 18; i++) {
    const x = 2 + ((i * 7) % (size - 4));
    const y = 2 + ((i * 11) % (size - 4));
    c.stamp(x, y, 2 + (i % 3), darken(parseHex(HEX.dirt), 0.15 + (i % 4) * 0.05), 0.4, 0.4);
  }
  for (let i = 0; i < 8; i++) {
    c.stamp(4 + i * 3, 6 + (i % 3) * 5, 1.5, HEX.grass, 0.5, 0.25);
  }
  return c;
}

function paintTerrainGrass(size = 32) {
  const c = new Canvas(size, size);
  c.rect(0, 0, size, size, HEX.grass, 1);
  for (let i = 0; i < 12; i++) {
    c.stamp(3 + (i * 5) % 26, 4 + (i * 9) % 24, 3, lighten(parseHex(HEX.grass), 0.12), 0.5, 0.35);
  }
  for (let i = 0; i < 10; i++) {
    c.stamp(2 + (i * 7) % 28, 8 + (i * 5) % 20, 2, HEX.forest, 0.45, 0.2);
  }
  return c;
}

function paintTerrainStone(size = 32) {
  const c = new Canvas(size, size);
  c.rect(0, 0, size, size, HEX.mortar, 1);
  const bw = 9;
  const bh = 7;
  for (let row = 0; row < 5; row++) {
    const ox = (row % 2) * 4;
    for (let col = -1; col < 5; col++) {
      const x = ox + col * (bw + 1);
      const y = row * (bh + 1);
      c.rect(x, y, bw, bh, row % 2 ? HEX.stoneBlock : HEX.stoneBlockDark, 0.95, 1);
      c.stamp(x + 2, y + 2, 2, HEX.sunRim, 0.6, 0.15);
    }
  }
  return c;
}

function paintWallWood(size = 32) {
  const c = new Canvas(size, size);
  // vertical palisade logs
  for (let i = 0; i < 6; i++) {
    const x = 2 + i * 5;
    const bark = i % 2 ? HEX.logBark : HEX.logBarkDark;
    c.rect(x, 0, 4, size, bark, 1, 1);
    c.stamp(x + 1, 4, 1.5, HEX.sunRim, 0.5, 0.25);
    // pointed tip suggestion at top
    c.stamp(x + 2, 2, 2, lighten(parseHex(bark), 0.1), 0.4, 0.8);
  }
  return c;
}

function paintWallStone(size = 32) {
  const c = new Canvas(size, size);
  c.rect(0, 0, size, size, HEX.mortar, 1);
  const rows = [
    [0, 0, 10, 9],
    [11, 0, 10, 9],
    [22, 0, 10, 9],
    [0, 10, 14, 10],
    [15, 10, 17, 10],
    [0, 21, 10, 11],
    [11, 21, 10, 11],
    [22, 21, 10, 11],
  ];
  for (const [x, y, w, h] of rows) {
    c.rect(x, y, w, h, HEX.slate, 1, 1);
    c.stamp(x + 2, y + 2, 2.5, HEX.sunRim, 0.55, 0.2);
    c.rect(x, y + h - 2, w, 2, HEX.stoneBlockDark, 0.5);
  }
  return c;
}

function paintKeep(w, h, aged) {
  const c = new Canvas(w, h);
  const cx = w / 2;
  // Body ends ~y76 — feet/shadow must meet it (no float pad gap)
  const feetY = 78;
  c.ellipse(cx, feetY - 4, 24, 5, HEX.mortar, 0.4, 0.55);
  const body = aged ? HEX.slate : HEX.keepBody;
  const bodyH = 50;
  c.outlineRect(cx - 22, 26, 44, bodyH, 3);
  c.rect(cx - 22, 26, 44, bodyH, body, 1, 3);
  c.chalkRim(cx - 12, 34, 9, 0.22);
  for (let i = -18; i <= 14; i += 10) {
    c.outlineRect(cx + i, 14, 8, 14, 1);
    c.rect(cx + i, 14, 8, 14, aged ? HEX.nightRoof : body, 1, 1);
  }
  c.rect(cx - 6, feetY - 26, 12, 24, HEX.logBarkDark, 1, 2);
  c.stamp(cx, feetY - 16, 2, HEX.ochreWood, 0.5, 0.5);
  c.rect(cx + 14, 22, 2, 18, HEX.logBark, 1);
  c.rect(cx + 16, 22, 10, 8, aged ? HEX.knightGold : HEX.banner, 1, 1);
  c.rect(cx - 14, 40, 6, 8, HEX.nightRoof, 0.9, 1);
  c.rect(cx + 8, 40, 6, 8, HEX.nightRoof, 0.9, 1);
  if (aged) c.rect(cx - 20, 26, 40, 3, HEX.knightGold, 0.7);

  c.shadow(cx, feetY - 2, 24, 5.5, 0.55);
  return c;
}

/** Watchtower — open timber posts + cone thatch (not a solid block) */
function paintWatchtower(w, h, aged) {
  const c = new Canvas(w, h);
  const cx = w / 2;
  const feetY = 60;
  const timber = aged ? HEX.stoneBlock : HEX.logBark;
  const timberDark = aged ? HEX.stoneBlockDark : HEX.logBarkDark;
  // open timber: 3 posts with gaps
  const posts = [-9, 0, 9];
  for (const ox of posts) {
    c.outlineRect(cx + ox - 3, 30, 6, feetY - 30, 1);
    c.rect(cx + ox - 3, 30, 6, feetY - 30, ox === 0 ? timberDark : timber, 1, 1);
    c.chalkRim(cx + ox - 1, 34, 2.2, 0.28);
  }
  // cross braces
  c.rect(cx - 11, 38, 22, 2, timberDark, 0.9);
  c.rect(cx - 11, 50, 22, 2, timberDark, 0.9);
  // platform
  c.outlineRect(cx - 14, 26, 28, 6, 1);
  c.rect(cx - 14, 26, 28, 6, aged ? HEX.slate : HEX.ochreWood, 1, 1);
  c.chalkRim(cx - 6, 28, 3, 0.25);
  // cone thatch / slate
  const roof = aged ? HEX.nightRoof : HEX.thatch;
  const roofDark = aged ? HEX.slate : HEX.thatchDark;
  for (let i = 0; i < 14; i++) {
    const t = i / 13;
    const half = lerp(2, 15, t);
    const y = 8 + i * 1.35;
    c.rect(cx - half - 1, y, half * 2 + 2, 2, HEX.nightRoof, 0.85);
    c.rect(cx - half, y, half * 2, 2, mix(parseHex(roof), parseHex(roofDark), t * 0.45), 1);
  }
  c.chalkRim(cx - 4, 14, 4.5, 0.28);
  // lookout slit
  c.ellipse(cx, 42, 2.5, 4, HEX.nightRoof, 0.35, 0.95);

  c.shadow(cx, feetY - 2, 14, 4.5, 0.55);
  return c;
}

/** Longbow — tall slit shaft + crenelated crown (not cone twin) */
function paintLongbow(w, h, aged) {
  const c = new Canvas(w, h);
  const cx = w / 2;
  const feetY = 62;
  const shaft = aged ? HEX.slate : HEX.forest;
  const shaftDark = aged ? HEX.stoneBlockDark : darken(parseHex(HEX.forest), 0.2);
  // tall slender shaft
  c.outlineRect(cx - 7, 18, 14, feetY - 18, 2);
  c.rect(cx - 7, 18, 14, feetY - 18, shaft, 1, 2);
  c.chalkRim(cx - 3, 24, 4, 0.22);
  // arrow slits
  c.rect(cx - 2, 28, 4, 10, HEX.nightRoof, 1);
  c.rect(cx - 2, 44, 4, 8, HEX.nightRoof, 1);
  // loft band
  c.outlineRect(cx - 12, 14, 24, 10, 1);
  c.rect(cx - 12, 14, 24, 10, aged ? HEX.stoneBlock : HEX.ochreWood, 1, 2);
  // crenelated crown (NOT cone)
  const crown = aged ? HEX.nightRoof : HEX.thatchDark;
  for (let i = -10; i <= 6; i += 8) {
    c.outlineRect(cx + i, 6, 6, 10, 1);
    c.rect(cx + i, 6, 6, 10, crown, 1, 1);
  }
  c.chalkRim(cx - 6, 10, 3, 0.3);
  // bow hint on side
  c.ellipse(cx + 9, 36, 2, 7, HEX.ochreWood, 0.4, 0.85);

  c.shadow(cx, feetY - 2, 12, 4, 0.55);
  return c;
}

/** Spear Post — low wide stake ring ≤55% WT height */
function paintSpearPost(w, h, aged) {
  const c = new Canvas(w, h);
  const cx = w / 2;
  // WT visual ~52px; spears ≤ ~28px tall → tips around y=34 if feet at 60
  const feetY = 60;
  const base = aged ? HEX.slate : HEX.logBark;
  const baseDark = aged ? HEX.stoneBlockDark : HEX.logBarkDark;
  // wide stake ring base
  c.ellipse(cx, feetY - 3, 18, 5, baseDark, 0.35, 0.9);
  c.outlineRect(cx - 16, feetY - 10, 32, 8, 2);
  c.rect(cx - 16, feetY - 10, 32, 8, base, 1, 2);
  c.chalkRim(cx - 6, feetY - 8, 4, 0.22);
  // short stakes (low silhouette)
  const spears = [
    [-12, 38],
    [-4, 34],
    [4, 36],
    [12, 40],
  ];
  for (const [ox, tipY] of spears) {
    c.outlineRect(cx + ox - 1, tipY, 3, feetY - 10 - tipY, 0);
    c.rect(cx + ox - 1, tipY, 3, feetY - 10 - tipY, HEX.ochreWood, 1);
    c.stamp(cx + ox + 0.5, tipY, 2.5, aged ? HEX.slate : HEX.chalk, 0.4, 1);
  }
  // center post
  c.outlineRect(cx - 2, 36, 4, feetY - 14 - 36, 1);
  c.rect(cx - 2, 36, 4, feetY - 14 - 36, baseDark, 1);

  c.shadow(cx, feetY - 2, 18, 5, 0.55);
  return c;
}

/** Mangonel — arm + counterweight (redraw, not recolor of WT) */
function paintMangonel(w, h, aged) {
  const c = new Canvas(w, h);
  const cx = w / 2;
  const feetY = 60;
  const nest = aged ? HEX.slate : HEX.logBark;
  const nestDark = aged ? HEX.stoneBlockDark : HEX.logBarkDark;
  const arm = aged ? HEX.stoneBlock : HEX.ochreWood;
  // nest / chassis
  c.outlineRect(cx - 16, 38, 32, 16, 3);
  c.rect(cx - 16, 38, 32, 16, nest, 1, 3);
  c.chalkRim(cx - 6, 42, 6, 0.18);
  // wheels at feet
  c.ellipse(cx - 12, feetY - 2, 5, 5, nestDark, 0.35, 1);
  c.ellipse(cx + 12, feetY - 2, 5, 5, nestDark, 0.35, 1);
  c.ellipse(cx - 12, feetY - 2, 2, 2, HEX.ochreWood, 0.4, 0.7);
  c.ellipse(cx + 12, feetY - 2, 2, 2, HEX.ochreWood, 0.4, 0.7);
  // pivot
  c.outlineRect(cx - 5, 32, 10, 10, 2);
  c.rect(cx - 5, 32, 10, 10, nestDark, 1, 2);
  // throwing arm (up-right) with bucket
  for (let i = 0; i < 16; i++) {
    c.rect(cx - 1 + i * 0.85, 30 - i * 1.05, 4, 4, arm, 1);
  }
  // bucket
  c.ellipse(cx + 14, 12, 7, 5, aged ? HEX.nightRoof : HEX.thatchDark, 0.4, 1);
  c.outlineRect(cx + 8, 12, 12, 7, 2);
  c.rect(cx + 8, 12, 12, 7, nestDark, 1, 2);
  c.chalkRim(cx + 11, 11, 2.5, 0.3);
  // counterweight (short end, left-down) — distinct noun
  c.outlineRect(cx - 18, 34, 12, 10, 2);
  c.rect(cx - 18, 34, 12, 10, aged ? HEX.slate : HEX.logBarkDark, 1, 2);
  c.stamp(cx - 12, 38, 3, HEX.sunRim, 0.5, 0.2);
  // strut from pivot to counterweight
  c.rect(cx - 14, 36, 10, 3, arm, 1);

  c.shadow(cx, feetY - 2, 18, 5.5, 0.55);
  return c;
}

function paintUnitMilitia(w, h) {
  const c = new Canvas(w, h);
  const cx = w / 2;
  c.shadow(cx, h - 3, 10, 3, 0.35);
  // tunic body
  c.ellipse(cx, 30, 9, 12, HEX.militiaTunic, 0.45, 1);
  c.rect(cx - 8, 24, 16, 18, HEX.militiaTunic, 1, 4);
  // head
  c.ellipse(cx, 16, 6, 6, HEX.chalk, 0.4, 1);
  // simple blade
  c.rect(cx + 8, 22, 2, 14, HEX.slate, 1);
  c.stamp(cx - 3, 26, 4, HEX.sunRim, 0.5, 0.15);
  return c;
}

function paintUnitArcher(w, h) {
  const c = new Canvas(w, h);
  const cx = w / 2;
  c.shadow(cx, h - 3, 9, 3, 0.35);
  c.rect(cx - 7, 22, 14, 18, HEX.archerHood, 1, 4);
  // hood
  c.ellipse(cx, 14, 7, 7, HEX.forest, 0.4, 1);
  c.ellipse(cx, 16, 5, 5, HEX.chalk, 0.4, 1);
  // bow
  for (let i = 0; i < 10; i++) {
    const a = -0.8 + i * 0.16;
    c.stamp(cx + 10 + Math.cos(a) * 6, 26 + Math.sin(a) * 10, 1.6, HEX.ochreWood, 0.4, 0.95);
  }
  return c;
}

function paintUnitSpearman(w, h) {
  const c = new Canvas(w, h);
  const cx = w / 2;
  c.shadow(cx, h - 3, 10, 3, 0.35);
  c.rect(cx - 7, 22, 14, 18, HEX.logBark, 1, 4);
  c.ellipse(cx, 15, 6, 6, HEX.chalk, 0.4, 1);
  // round shield
  c.ellipse(cx - 10, 28, 7, 7, HEX.spearShield, 0.4, 1);
  c.ellipse(cx - 10, 28, 3, 3, HEX.ochreWood, 0.4, 1);
  // spear
  c.rect(cx + 2, 4, 2, 36, HEX.chalk, 1);
  c.stamp(cx + 3, 4, 3, HEX.slate, 0.4, 1);
  return c;
}

function paintUnitKnight(w, h) {
  const c = new Canvas(w, h);
  const cx = w / 2;
  c.shadow(cx, h - 3, 14, 4, 0.55);
  // horse body
  c.ellipse(cx, 32, 14, 9, HEX.knightSteel, 0.4, 1);
  c.ellipse(cx + 10, 26, 6, 5, HEX.slate, 0.4, 1);
  // legs
  c.rect(cx - 10, 36, 3, 8, HEX.nightRoof, 1);
  c.rect(cx + 6, 36, 3, 8, HEX.nightRoof, 1);
  // rider
  c.rect(cx - 4, 18, 10, 12, HEX.knightSteel, 1, 2);
  c.ellipse(cx + 1, 14, 5, 5, HEX.chalk, 0.4, 1);
  // kite shield
  c.rect(cx - 12, 20, 7, 12, HEX.knightGold, 1, 2);
  c.stamp(cx - 2, 20, 3, HEX.sunRim, 0.5, 0.2);
  return c;
}

function paintUnitRam(w, h) {
  const c = new Canvas(w, h);
  const cx = w / 2;
  c.shadow(cx, h - 3, 16, 4, 0.55);
  // wheeled shed
  c.rect(cx - 16, 18, 28, 18, HEX.ramWood, 1, 3);
  c.stamp(cx - 6, 22, 8, HEX.sunRim, 0.5, 0.12);
  // roof
  c.rect(cx - 18, 14, 32, 6, HEX.logBarkDark, 1, 1);
  // wheels
  c.ellipse(cx - 10, 38, 5, 5, HEX.logBarkDark, 0.35, 1);
  c.ellipse(cx + 8, 38, 5, 5, HEX.logBarkDark, 0.35, 1);
  // ram head
  c.ellipse(cx + 16, 28, 8, 5, HEX.ochreWood, 0.4, 1);
  c.stamp(cx + 20, 28, 3, HEX.chalk, 0.4, 0.8);
  return c;
}

function paintUnitElephant(w, h) {
  const c = new Canvas(w, h);
  const cx = w / 2;
  c.shadow(cx, h - 3, 16, 4, 0.55);
  // body
  c.ellipse(cx, 28, 16, 12, HEX.elephantHide, 0.4, 1);
  // head
  c.ellipse(cx - 12, 22, 8, 7, HEX.elephantHide, 0.4, 1);
  // cloth
  c.rect(cx - 6, 18, 16, 10, HEX.elephantCloth, 0.9, 2);
  // tusks
  c.stamp(cx - 18, 28, 2, HEX.chalk, 0.4, 1);
  c.rect(cx - 20, 26, 8, 2, HEX.chalk, 1);
  c.rect(cx - 19, 30, 7, 2, HEX.chalk, 1);
  // trunk
  c.rect(cx - 18, 28, 3, 12, HEX.elephantHide, 1, 1);
  // legs
  c.rect(cx - 8, 36, 4, 8, darken(parseHex(HEX.elephantHide), 0.15), 1);
  c.rect(cx + 6, 36, 4, 8, darken(parseHex(HEX.elephantHide), 0.15), 1);
  c.stamp(cx, 20, 5, HEX.sunRim, 0.5, 0.15);
  return c;
}


/** Rank trim overlay — readable at arm length; same footprint */
function paintRankOverlay(base, rank) {
  if (rank <= 0) return base;
  const c = new Canvas(base.w, base.h);
  base.blitTo(c, 0, 0);
  const cx = base.w / 2;
  if (rank >= 1) {
    c.rect(cx + 12, 18, 3, 12, HEX.logBark, 1);
    c.rect(cx + 15, 18, 8, 6, rank >= 3 ? HEX.knightGold : HEX.ochreWood, 1, 1);
  }
  if (rank >= 2) {
    c.rect(cx - 14, 48, 28, 3, HEX.knightGold, 0.85, 1);
  }
  if (rank >= 3) {
    for (let i = -12; i <= 8; i += 10) {
      c.outlineRect(cx + i, 6, 7, 9, 1);
      c.rect(cx + i, 6, 7, 9, HEX.knightGold, 1, 1);
    }
    c.stamp(cx - 6, 20, 4, HEX.sunRim, 0.5, 0.35);
  }
  return c;
}

// Layout
const ATLAS_W = 512;
const ATLAS_H = 640;
const frames = {};
const atlas = new Canvas(ATLAS_W, ATLAS_H);

function place(name, canvas, x, y, origin) {
  canvas.blitTo(atlas, x, y);
  frames[name] = {
    frame: { x, y, w: canvas.w, h: canvas.h },
    rotated: false,
    trimmed: false,
    spriteSourceSize: { x: 0, y: 0, w: canvas.w, h: canvas.h },
    sourceSize: { w: canvas.w, h: canvas.h },
    pivot: origin,
  };
}

// Terrain + walls
place('terrain_dirt', paintTerrainDirt(32), 0, 0, { x: 0.5, y: 0.5 });
place('terrain_grass', paintTerrainGrass(32), 34, 0, { x: 0.5, y: 0.5 });
place('terrain_stone', paintTerrainStone(32), 68, 0, { x: 0.5, y: 0.5 });
place('wall_wood', paintWallWood(32), 102, 0, { x: 0.5, y: 0.5 });
place('wall_stone', paintWallStone(32), 136, 0, { x: 0.5, y: 0.5 });

// Keep
place('keep', paintKeep(80, 96), 0, 40, { x: 0.5, y: 0.72 });
place('keep_aged', paintKeep(80, 96), 84, 40, { x: 0.5, y: 0.72 });

// Towers 64x72
const TW = 64;
const TH = 72;
place('tower_watchtower', paintWatchtower(TW, TH), 0, 150, { x: 0.5, y: 0.78 });
place('tower_watchtower_aged', paintWatchtower(TW, TH, true), 68, 150, { x: 0.5, y: 0.78 });
place('tower_longbow', paintLongbow(TW, TH), 136, 150, { x: 0.5, y: 0.78 });
place('tower_longbow_aged', paintLongbow(TW, TH, true), 204, 150, { x: 0.5, y: 0.78 });
place('tower_spearPost', paintSpearPost(TW, TH), 272, 150, { x: 0.5, y: 0.82 });
place('tower_spearPost_aged', paintSpearPost(TW, TH, true), 340, 150, { x: 0.5, y: 0.82 });
place('tower_mangonel', paintMangonel(TW, TH), 0, 230, { x: 0.5, y: 0.78 });
place('tower_mangonel_aged', paintMangonel(TW, TH, true), 68, 230, { x: 0.5, y: 0.78 });

// Rank looks (keep1) — kill-upgrade / keep research visual tiers
place('keep_r1', paintRankOverlay(paintKeep(80, 96), 1), 168, 40, { x: 0.5, y: 0.72 });
place('keep_r2', paintRankOverlay(paintKeep(80, 96), 2), 252, 40, { x: 0.5, y: 0.72 });
place('keep_r3', paintRankOverlay(paintKeep(80, 96, true), 3), 336, 40, { x: 0.5, y: 0.72 });

place('tower_watchtower_r1', paintRankOverlay(paintWatchtower(TW, TH), 1), 136, 230, { x: 0.5, y: 0.78 });
place('tower_watchtower_r2', paintRankOverlay(paintWatchtower(TW, TH), 2), 204, 230, { x: 0.5, y: 0.78 });
place('tower_watchtower_r3', paintRankOverlay(paintWatchtower(TW, TH, true), 3), 272, 230, { x: 0.5, y: 0.78 });
place('tower_longbow_r1', paintRankOverlay(paintLongbow(TW, TH), 1), 340, 230, { x: 0.5, y: 0.78 });
place('tower_longbow_r2', paintRankOverlay(paintLongbow(TW, TH), 2), 408, 230, { x: 0.5, y: 0.78 });
place('tower_longbow_r3', paintRankOverlay(paintLongbow(TW, TH, true), 3), 0, 400, { x: 0.5, y: 0.78 });
place('tower_spearPost_r1', paintRankOverlay(paintSpearPost(TW, TH), 1), 68, 400, { x: 0.5, y: 0.82 });
place('tower_spearPost_r2', paintRankOverlay(paintSpearPost(TW, TH), 2), 136, 400, { x: 0.5, y: 0.82 });
place('tower_spearPost_r3', paintRankOverlay(paintSpearPost(TW, TH, true), 3), 204, 400, { x: 0.5, y: 0.82 });
place('tower_mangonel_r1', paintRankOverlay(paintMangonel(TW, TH), 1), 272, 400, { x: 0.5, y: 0.78 });
place('tower_mangonel_r2', paintRankOverlay(paintMangonel(TW, TH), 2), 340, 400, { x: 0.5, y: 0.78 });
place('tower_mangonel_r3', paintRankOverlay(paintMangonel(TW, TH, true), 3), 408, 400, { x: 0.5, y: 0.78 });


// Units 48x48
const UW = 48;
const UH = 48;
place('unit_militia', paintUnitMilitia(UW, UH), 0, 320, { x: 0.5, y: 0.72 });
place('unit_archer', paintUnitArcher(UW, UH), 52, 320, { x: 0.5, y: 0.72 });
place('unit_spearman', paintUnitSpearman(UW, UH), 104, 320, { x: 0.5, y: 0.72 });
place('unit_knight', paintUnitKnight(UW, UH), 156, 320, { x: 0.5, y: 0.7 });
place('unit_ram', paintUnitRam(UW, UH), 208, 320, { x: 0.5, y: 0.65 });
place('unit_elephant', paintUnitElephant(UW, UH), 260, 320, { x: 0.5, y: 0.65 });

fs.mkdirSync(outDir, { recursive: true });

const png = new PNG({ width: ATLAS_W, height: ATLAS_H });
atlas.data.copy(png.data);
const pngPath = path.join(outDir, 'keepward-atlas.png');


const json = {
  frames,
  meta: {
    app: 'keepward-generate-atlas',
    version: 'keep1',
    image: 'keepward-atlas.png',
    format: 'RGBA8888',
    size: { w: ATLAS_W, h: ATLAS_H },
    scale: '1',
  },
};
const jsonPath = path.join(outDir, 'keepward-atlas.json');
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2));

// Wait for PNG stream
await new Promise((resolve, reject) => {
  const ws = fs.createWriteStream(pngPath);
  png.pack().pipe(ws);
  ws.on('finish', resolve);
  ws.on('error', reject);
});

console.log('Wrote', pngPath);
console.log('Wrote', jsonPath);
console.log('Frames:', Object.keys(frames).length, Object.keys(frames).join(', '));
