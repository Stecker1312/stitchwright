/**
 * Reusable custom cables.
 *
 * A cable is defined by the two stitch counts and the direction. The presets
 * cover the common 1/1 to 4/4 combinations; this library keeps the extra
 * combinations a person actually uses so they can be placed again with one
 * click instead of reopening the dialog.
 *
 * The library lives outside the chart, like the custom-group library. Charts
 * remain self-contained because every placed cable carries its own parameters;
 * the library only makes the next placement convenient.
 */

import { CABLE_PRESETS } from "../core/symbols.js";

/** Keep the palette usable and the stored list bounded. */
export const MAX_CUSTOM_CABLES = 24;

/** Accept only a complete cable with sane bounds. */
export function normalizeCustomCable(value) {
  if (!value || typeof value !== "object") return null;
  const left = Number(value.left);
  const right = Number(value.right);
  if (!Number.isInteger(left) || !Number.isInteger(right)) return null;
  if (left < 1 || right < 1 || left > 12 || right > 12) return null;
  if (value.direction !== "front" && value.direction !== "back") return null;
  return { left, right, direction: value.direction };
}

/** A preset already has its own one-click button. */
export function isPresetCable(cable) {
  return CABLE_PRESETS.some((preset) => (
    preset.left === cable.left
    && preset.right === cable.right
    && preset.direction === cable.direction
  ));
}

export function cableKey(cable) {
  return `${cable.left}/${cable.right}/${cable.direction}`;
}

/**
 * Merge saved and newly used cables without duplicates. Presets are dropped
 * because they are always available; the newest entries survive when the
 * library is full.
 */
export function mergeCustomCables(existing, additions, { limit = MAX_CUSTOM_CABLES } = {}) {
  const merged = new Map();
  for (const value of [...existing, ...additions]) {
    const cable = normalizeCustomCable(value);
    if (!cable || isPresetCable(cable)) continue;
    if (!merged.has(cableKey(cable))) merged.set(cableKey(cable), cable);
  }
  const cables = [...merged.values()];
  return limit > 0 ? cables.slice(-limit) : [];
}

/** Cables used in a chart become reusable when that chart is opened. */
export function customCablesFromChart(chart) {
  if (!chart || !Array.isArray(chart.groups)) return [];
  return chart.groups
    .filter((group) => group.symbol === "cable")
    .map((group) => normalizeCustomCable(group))
    .filter((cable) => cable && !isPresetCable(cable));
}
