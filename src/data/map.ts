/** Fixed portrait map — winding dirt path + stone build pads */
export const GAME_W = 390;
export const GAME_H = 780;

export interface PadDef {
  id: number;
  x: number;
  y: number;
}

/** Path waypoints (top spawn → bottom leak near keep) */
export const PATH: { x: number; y: number }[] = [
  { x: 195, y: -20 },
  { x: 195, y: 60 },
  { x: 70, y: 110 },
  { x: 70, y: 200 },
  { x: 300, y: 250 },
  { x: 300, y: 340 },
  { x: 90, y: 400 },
  { x: 90, y: 490 },
  { x: 280, y: 540 },
  { x: 280, y: 620 },
  { x: 195, y: 680 },
  { x: 195, y: 720 },
];

/** Build pads snapped along the path bends */
export const PADS: PadDef[] = [
  { id: 0, x: 130, y: 85 },
  { id: 1, x: 130, y: 155 },
  { id: 2, x: 20, y: 250 },
  { id: 3, x: 220, y: 220 },
  { id: 4, x: 350, y: 295 },
  { id: 5, x: 220, y: 370 },
  { id: 6, x: 30, y: 445 },
  { id: 7, x: 170, y: 470 },
  { id: 8, x: 350, y: 560 },
  { id: 9, x: 200, y: 580 },
];

/** Pre-placed Keep position (not a buildable pad) */
export const KEEP_POS = { x: 195, y: 700 };
