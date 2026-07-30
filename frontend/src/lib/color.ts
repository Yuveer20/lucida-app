// Dark-theme dataviz palette (validated categorical + sequential hues, dark-mode steps).
export const COLOR_UNDERSTOOD = "#3987e5"; // categorical slot 1 (blue)
export const COLOR_STRUGGLING = "#e66767"; // categorical slot 6 (red)
export const COLOR_SECONDARY_TEXT = "#c3c2b7";
export const COLOR_MUTED_TEXT = "#898781";
export const COLOR_GRIDLINE = "#2c2c2a";

// Sequential blue ramp, low anchored near the dark surface (recedes), high vivid (pops).
const SEQUENTIAL_LOW = { r: 0x18, g: 0x4f, b: 0x95 };
const SEQUENTIAL_HIGH = { r: 0xcd, g: 0xe2, b: 0xfb };

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

/** Maps a comprehension rate in [0,1] to a step on the sequential blue ramp. */
export function heatColor(rate: number): string {
  const t = Math.max(0, Math.min(1, rate));
  const r = lerp(SEQUENTIAL_LOW.r, SEQUENTIAL_HIGH.r, t);
  const g = lerp(SEQUENTIAL_LOW.g, SEQUENTIAL_HIGH.g, t);
  const b = lerp(SEQUENTIAL_LOW.b, SEQUENTIAL_HIGH.b, t);
  return `rgb(${r}, ${g}, ${b})`;
}
