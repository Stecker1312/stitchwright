/**
 * Colour helpers shared by Canvas and SVG.
 *
 * The app stores palette ids in charts, not raw colours. These helpers resolve
 * an id to a hex value and decide whether a symbol should be black or white.
 * The decision is based on relative luminance, so it also works for colours a
 * user adds later.
 */

/** Parse #rrggbb into {r,g,b} or return null. */
export function parseHex(hex) {
  const match = /^#([0-9a-f]{6})$/i.exec(hex || "");
  if (!match) return null;
  const value = parseInt(match[1], 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
}

/** Relative luminance for sRGB, 0 (black) to 1 (white). */
export function luminance(hex) {
  const rgb = parseHex(hex);
  if (!rgb) return 1;
  const channel = (value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

/** Black or white, whichever is readable on the given background. */
export function contrastColor(hex) {
  return luminance(hex) > 0.46 ? "#111111" : "#ffffff";
}

/** Resolve a palette id to a hex value, falling back to paper white. */
export function colorHex(chart, colorId) {
  if (!colorId) return "#ffffff";
  return chart.palette.find((entry) => entry.id === colorId)?.hex || "#ffffff";
}

/** Background of one cell, used for symbol contrast and cable halos. */
export function backgroundFor(chart, row, col) {
  return colorHex(chart, chart.colors?.[row - 1]?.[col - 1] ?? null);
}

/** Add an alpha channel to a #rrggbb colour. */
export function withAlpha(hex, alpha) {
  const rgb = parseHex(hex);
  if (!rgb) return `rgba(0,0,0,${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}
