/**
 * Colour helpers shared by Canvas and SVG.
 *
 * The app stores palette ids in charts, not raw colours. These helpers resolve
 * an id to a hex value and decide whether a symbol should be black or white.
 * The decision is based on relative luminance, so it also works for colours a
 * user adds later.
 */

import { symbolSpan } from "./symbols.js";

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

/** Black or white, whichever has the better WCAG contrast ratio. */
export function contrastColor(hex) {
  const background = luminance(hex);
  const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  const dark = luminance("#111111");
  const light = luminance("#ffffff");
  return ratio(dark, background) >= ratio(light, background) ? "#111111" : "#ffffff";
}

/** Resolve a palette id to a hex value, falling back to paper white. */
export function colorHex(chart, colorId) {
  if (!colorId) return "#ffffff";
  return chart.palette.find((entry) => entry.id === colorId)?.hex || "#ffffff";
}

/** Background of one cell, used for symbol contrast and cable halos. */
export function backgroundFor(chart, row, col) {
  if (chart.rows?.[row - 1]?.[col - 1] === "nostitch") return "#e6e6e6";
  return colorHex(chart, chart.colors?.[row - 1]?.[col - 1] ?? null);
}

/** Background colours under a multi-stitch group. */
export function groupBackgrounds(chart, group) {
  let span = 1;
  try {
    span = symbolSpan(group.symbol, group);
  } catch {
    span = Math.max(1, Number(group.span) || 1);
  }
  const colors = new Set();
  for (let offset = 0; offset < span; offset += 1) {
    const col = group.col + offset;
    const color = chart.colors?.[group.row - 1]?.[col - 1] ?? null;
    colors.add(colorHex(chart, color));
  }
  return [...colors];
}

/** A halo colour that works for a mixed-colour group. */
export function groupBackground(chart, group) {
  const colors = groupBackgrounds(chart, group);
  return colors.length === 1 ? colors[0] : "#ffffff";
}

/** Black or white with the best worst-case contrast across the group. */
export function groupContrast(chart, group) {
  const backgrounds = groupBackgrounds(chart, group);
  if (!backgrounds.length) return "#111111";
  const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  const score = (foreground) => Math.min(...backgrounds.map((background) => (
    ratio(luminance(foreground), luminance(background))
  )));
  const dark = score("#111111");
  const light = score("#ffffff");
  return dark >= light ? "#111111" : "#ffffff";
}

/** Add an alpha channel to a #rrggbb colour. */
export function withAlpha(hex, alpha) {
  const rgb = parseHex(hex);
  if (!rgb) return `rgba(0,0,0,${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}
