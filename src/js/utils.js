// ══════════════════════════════════════════════════
// SHARED UTILITIES & GEOMETRY ENGINE
// ══════════════════════════════════════════════════

export const STEP = 40;

// Snapping and Grid Math
export const snap = v => Math.round(v / STEP) * STEP;
export const toGrid = (px, c) => Math.round((px - c) / STEP);
export const gc = (px, py, cx, cy) => [toGrid(px,cx), -toGrid(py,cy)];
export const gf = (x,y) => `(${x}, ${y})`;

// Color helper
export const rgba = (hex, a) => {
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
};

// DOM helper
export const el = id => document.getElementById(id);
export const set = (id, v) => { const e=el(id); if(e) e.textContent=v; };

// Math Utility: Point Rotation
export const rotatePt = (px, py, cxr, cyr, deg) => {
  const rad = deg * Math.PI / 180, dx = px - cxr, dy = py - cyr;
  return [cxr + dx * Math.cos(rad) - dy * Math.sin(rad), cyr + dx * Math.sin(rad) + dy * Math.cos(rad)];
};

// Shape Definitions
const SH = {
  triangle: () => [ [0, -2*STEP], [-2*STEP, 2*STEP], [2*STEP, 2*STEP] ],
  square: () => [ [-2*STEP, -2*STEP], [2*STEP, -2*STEP], [2*STEP, 2*STEP], [-2*STEP, 2*STEP] ],
  pentagon: () => [ [0, -2*STEP], [-2*STEP, 0], [-STEP, 2*STEP], [STEP, 2*STEP], [2*STEP, 0] ]
};
export const getShape = (k) => SH[k]?SH[k]():SH.triangle();
