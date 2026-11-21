/**
 * Viewport maths for the canvas editor.
 *
 * Keeping this separate makes zooming, panning and hit-testing testable
 * without a browser. The canvas renderer uses the same functions, so the cell
 * under the pointer is always the cell that was painted.
 */

import { visibleRows } from "./chart.js";

export const MIN_SCALE = 0.5;
export const MAX_SCALE = 80;

export function createView({ scale = 28, offsetX = 40, offsetY = 40 } = {}) {
  return { scale, offsetX, offsetY };
}

export function clampScale(scale) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/** Pixel size of the chart at the current scale. */
export function chartPixelSize(chart, view) {
  const count = visibleRows(chart).length;
  return { width: chart.width * view.scale, height: count * view.scale };
}

/** Position of a cell in CSS pixels, or null when the row is hidden. */
export function cellRect(chart, view, row, col) {
  if (row < 1 || row > chart.height || col < 1 || col > chart.width) return null;
  const rows = visibleRows(chart);
  const index = rows.indexOf(row);
  if (index === -1) return null;
  return {
    x: view.offsetX + (col - 1) * view.scale,
    y: view.offsetY + (rows.length - 1 - index) * view.scale,
    size: view.scale
  };
}

/** Convert a canvas point to a cell. Returns null outside the chart. */
export function cellAt(chart, view, x, y) {
  const rows = visibleRows(chart);
  const localX = x - view.offsetX;
  const localY = y - view.offsetY;
  if (localX < 0 || localY < 0) return null;
  const col = Math.floor(localX / view.scale) + 1;
  if (col < 1 || col > chart.width) return null;
  const fromTop = Math.floor(localY / view.scale);
  if (fromTop < 0 || fromTop >= rows.length) return null;
  const row = rows[rows.length - 1 - fromTop];
  return { row, col };
}

/** Fit the whole chart into a canvas, with a little breathing room. */
export function fitView(chart, viewportWidth, viewportHeight, { padding = 36 } = {}) {
  const rows = visibleRows(chart);
  const availableWidth = Math.max(1, viewportWidth - padding * 2);
  const availableHeight = Math.max(1, viewportHeight - padding * 2);
  const scale = clampScale(Math.min(
    availableWidth / chart.width,
    availableHeight / Math.max(1, rows.length)
  ));
  return {
    scale,
    offsetX: (viewportWidth - chart.width * scale) / 2,
    offsetY: (viewportHeight - rows.length * scale) / 2
  };
}

/** Zoom around a point, so the cell under the pointer stays put. */
export function zoomAt(view, x, y, factor) {
  const nextScale = clampScale(view.scale * factor);
  const ratio = nextScale / view.scale;
  return {
    scale: nextScale,
    offsetX: x - (x - view.offsetX) * ratio,
    offsetY: y - (y - view.offsetY) * ratio
  };
}

/** Move the view by a pixel delta. */
export function panBy(view, dx, dy) {
  return { ...view, offsetX: view.offsetX + dx, offsetY: view.offsetY + dy };
}

/** Centre the chart without changing the zoom. */
export function centerView(chart, view, viewportWidth, viewportHeight) {
  const rows = visibleRows(chart);
  return {
    ...view,
    offsetX: (viewportWidth - chart.width * view.scale) / 2,
    offsetY: (viewportHeight - rows.length * view.scale) / 2
  };
}

/**
 * Visible column range for a viewport. The renderer uses it to avoid looping
 * over thousands of columns when only a few are on screen.
 */
export function visibleColumns(chart, view, viewportWidth) {
  const start = Math.max(0, Math.floor((0 - view.offsetX) / view.scale));
  const end = Math.min(chart.width - 1, Math.ceil((viewportWidth - view.offsetX) / view.scale));
  return { start, end };
}

/** True when a row is visible in the viewport. */
export function rowVisible(chart, view, row, viewportHeight) {
  const rect = cellRect(chart, view, row, 1);
  if (!rect) return false;
  return rect.y + rect.size > 0 && rect.y < viewportHeight;
}

/**
 * Hit-test the row and column number margins.
 *
 * The canvas draws row numbers to the left of the chart and stitch numbers
 * below it. Clicking those numbers selects the whole row or column, which is
 * the natural way to choose what a delete button should remove.
 */
export function headerAt(chart, view, x, y) {
  const rows = visibleRows(chart);
  const chartW = chart.width * view.scale;
  const chartH = rows.length * view.scale;
  const chartBottom = view.offsetY + chartH;

  if (chart.options?.showRowNumbers !== false
    && x <= view.offsetX && x >= view.offsetX - 34
    && y >= view.offsetY && y < chartBottom) {
    const fromTop = Math.floor((y - view.offsetY) / view.scale);
    const index = rows.length - 1 - fromTop;
    if (index >= 0 && index < rows.length) {
      return { kind: "row", index: rows[index] };
    }
  }

  if (chart.options?.showStitchNumbers !== false
    && y >= chartBottom && y <= chartBottom + 28
    && x >= view.offsetX && x < view.offsetX + chartW) {
    const col = Math.floor((x - view.offsetX) / view.scale) + 1;
    if (col >= 1 && col <= chart.width) {
      return { kind: "column", index: col };
    }
  }

  return null;
}

/**
 * Resolve a row or column for a header drag. Unlike headerAt, this clamps to
 * the chart edges and ignores the other axis, so dragging beyond the margin
 * still extends the selection instead of stopping.
 */
export function headerIndexAt(chart, view, kind, x, y) {
  const rows = visibleRows(chart);
  if (kind === "row") {
    const chartH = rows.length * view.scale;
    if (!rows.length || chartH <= 0) return null;
    const fromTop = Math.floor((y - view.offsetY) / view.scale);
    const visibleIndex = Math.max(0, Math.min(rows.length - 1, fromTop));
    return rows[rows.length - 1 - visibleIndex];
  }
  if (kind === "column") {
    if (chart.width < 1 || view.scale <= 0) return null;
    const col = Math.floor((x - view.offsetX) / view.scale) + 1;
    return Math.max(1, Math.min(chart.width, col));
  }
  return null;
}
