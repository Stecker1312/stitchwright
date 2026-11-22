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

/**
 * The editor keeps a permanent background frame around the drawing area.
 * Even at maximum zoom the pattern is cut at this frame, so there is always
 * visible canvas background and a place for the number margins.
 */
export const VIEWPORT_MARGIN_X = 44;
export const VIEWPORT_MARGIN_Y = 28;
/**
 * Extra room beyond the pattern at each end of the scrollbar. At high zoom
 * this keeps the first or last stitch fully visible with background around it.
 */
export const VIEWPORT_PAN_OVERSCROLL = 40;

/** Interactive width of the row-number strips beside the paper. */
const ROW_NUMBER_HIT_WIDTH = 44;
/** Interactive height of the column-number strips above and below the paper. */
const COLUMN_NUMBER_HIT_HEIGHT = 28;
/** Space between the paper edge and the first digit. */
const ROW_NUMBER_GAP = 7;
/** Distance from the paper edge to the centre of a column number. */
const COLUMN_NUMBER_GAP = 12;
/**
 * The vertical scrollbar overlays the right side of the frame. Pinned row
 * numbers leave room for it so the digits never sit underneath the thumb.
 */
const SCROLLBAR_SPACE = 18;

/**
 * Scrollbar range for one axis.
 *
 * The thumb moves over the paper plus a little overscroll at both ends. That
 * lets the user push the pattern inward far enough to see its first or last
 * stitch completely, with background between the stitch and the frame.
 */
export function scrollbarMetrics(chartSize, contentSize, contentStart, offset) {
  const max = chartSize > contentSize
    ? chartSize - contentSize + VIEWPORT_PAN_OVERSCROLL * 2
    : 0;
  const start = contentStart + VIEWPORT_PAN_OVERSCROLL;
  const scroll = Math.min(max, Math.max(0, start - offset));
  return { max, start, scroll, visible: max > 0 };
}

/**
 * Inner drawing area and the surrounding frame. Tiny canvases shrink the
 * frame instead of leaving no room at all for the chart.
 */
export function viewportFrame(viewportWidth, viewportHeight) {
  const width = Number.isFinite(viewportWidth) && viewportWidth > 0 ? viewportWidth : 0;
  const height = Number.isFinite(viewportHeight) && viewportHeight > 0 ? viewportHeight : 0;
  const x = width > 0 ? Math.min(VIEWPORT_MARGIN_X, Math.floor(width / 4)) : VIEWPORT_MARGIN_X;
  const y = height > 0 ? Math.min(VIEWPORT_MARGIN_Y, Math.floor(height / 4)) : VIEWPORT_MARGIN_Y;
  return {
    x,
    y,
    left: x,
    right: width - x,
    top: y,
    bottom: height - y
  };
}

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

/**
 * Convert a canvas point to a cell. Returns null outside the chart or in the
 * permanent frame around the drawing area.
 */
export function cellAt(chart, view, x, y, viewportWidth, viewportHeight) {
  if (Number.isFinite(viewportWidth) && Number.isFinite(viewportHeight)
    && viewportWidth > 0 && viewportHeight > 0) {
    const frame = viewportFrame(viewportWidth, viewportHeight);
    if (x < frame.left || x >= frame.right || y < frame.top || y >= frame.bottom) return null;
  }
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

/** Fit the whole chart into the drawing area, with a little breathing room. */
export function fitView(chart, viewportWidth, viewportHeight, { padding = VIEWPORT_MARGIN_X + 12 } = {}) {
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
 * Layout for the two row-number columns.
 *
 * Numbers normally sit just outside the paper. When an edge is zoomed past the
 * permanent drawing frame, its numbers move into the frame instead. That keeps
 * the row reference visible while working deep inside a large chart, and the
 * frame always shows background rather than pattern.
 *
 * Returns null when row numbers are disabled or the chart is completely
 * outside the drawing area.
 */
export function rowNumberLayout(chart, view, viewportWidth) {
  if (chart.options?.showRowNumbers === false) return null;
  const rows = visibleRows(chart);
  if (!rows.length) return null;
  const width = Number.isFinite(viewportWidth) && viewportWidth > 0
    ? viewportWidth
    : view.offsetX + chart.width * view.scale + VIEWPORT_MARGIN_X;
  const marginX = Math.min(VIEWPORT_MARGIN_X, Math.floor(width / 4));
  const frameLeft = marginX;
  const frameRight = width - marginX;
  const chartLeft = view.offsetX;
  const chartRight = chartLeft + chart.width * view.scale;
  if (chartRight <= frameLeft || chartLeft >= frameRight) return null;

  // Rough width of the widest label at 10 px system-ui. The canvas renderer
  // and the hit test both use this estimate, so they cannot drift apart.
  const digits = String(Math.max(1, chart.height)).length;
  const textWidth = Math.ceil(digits * 6.2);

  const leftAttached = chartLeft - ROW_NUMBER_GAP;
  const leftPinned = leftAttached - textWidth < frameLeft + 4;
  const leftX = leftPinned ? frameLeft - ROW_NUMBER_GAP : leftAttached;
  const leftArea = leftPinned
    ? { from: 0, to: frameLeft }
    : {
      from: Math.max(frameLeft, chartLeft - ROW_NUMBER_HIT_WIDTH),
      to: Math.min(frameRight, chartLeft)
    };

  const rightAttached = chartRight + ROW_NUMBER_GAP;
  const rightPinned = rightAttached + textWidth > frameRight - 4;
  const rightX = rightPinned ? width - textWidth - SCROLLBAR_SPACE : rightAttached;
  const rightArea = rightPinned
    ? { from: frameRight, to: width }
    : {
      from: Math.max(frameLeft, chartRight),
      to: Math.min(frameRight, chartRight + ROW_NUMBER_HIT_WIDTH)
    };

  return {
    left: { x: leftX, align: "right", ...leftArea },
    right: { x: rightX, align: "left", ...rightArea }
  };
}

/**
 * Layout for the two stitch-number rows above and below the paper.
 *
 * Like the row numbers, each column-number strip follows its paper edge while
 * that edge is inside the drawing area, and moves into the permanent frame
 * when the chart is zoomed past it. The numbers themselves are centred over
 * their stitches, so the columns still line up with the grid.
 *
 * Returns null when stitch numbers are disabled or the chart is completely
 * outside the drawing area.
 */
export function columnNumberLayout(chart, view, viewportWidth, viewportHeight) {
  if (chart.options?.showStitchNumbers === false) return null;
  const rows = visibleRows(chart);
  if (!rows.length) return null;
  const width = Number.isFinite(viewportWidth) && viewportWidth > 0
    ? viewportWidth
    : view.offsetX + chart.width * view.scale;
  const height = Number.isFinite(viewportHeight) && viewportHeight > 0
    ? viewportHeight
    : view.offsetY + rows.length * view.scale + VIEWPORT_MARGIN_Y;
  const frame = viewportFrame(width, height);
  const chartW = chart.width * view.scale;
  const chartH = rows.length * view.scale;
  const chartTop = view.offsetY;
  const chartBottom = chartTop + chartH;
  if (chartBottom <= frame.top || chartTop >= frame.bottom) return null;

  const fromX = Math.max(frame.left, view.offsetX);
  const toX = Math.min(frame.right, view.offsetX + chartW);
  if (toX <= fromX) return null;

  const topAttached = chartTop - COLUMN_NUMBER_GAP;
  const topPinned = topAttached - 5 < frame.top;
  const topY = topPinned ? Math.max(8, frame.top - 14) : topAttached;
  const topArea = topPinned
    ? { from: 0, to: frame.top }
    : { from: Math.max(frame.top, chartTop - COLUMN_NUMBER_HIT_HEIGHT), to: Math.min(frame.bottom, chartTop) };

  const bottomAttached = chartBottom + COLUMN_NUMBER_GAP;
  const bottomPinned = bottomAttached + 5 > frame.bottom;
  const bottomY = bottomPinned ? Math.max(8, Math.min(height - 8, frame.bottom + 6)) : bottomAttached;
  const bottomArea = bottomPinned
    ? { from: frame.bottom, to: height }
    : { from: Math.max(frame.top, chartBottom), to: Math.min(frame.bottom, chartBottom + COLUMN_NUMBER_HIT_HEIGHT) };

  return {
    fromX,
    toX,
    top: { y: topY, ...topArea },
    bottom: { y: bottomY, ...bottomArea }
  };
}

/**
 * Hit-test the row and column number margins.
 *
 * The canvas draws row numbers on both sides of the chart (pinned to the
 * viewport edge when zoomed in) and stitch numbers above and below it.
 * Clicking those numbers selects the whole row or column, which is the
 * natural way to choose what a delete button should remove.
 */
export function headerAt(chart, view, x, y, viewportWidth, viewportHeight) {
  const rows = visibleRows(chart);
  const chartH = rows.length * view.scale;
  const chartBottom = view.offsetY + chartH;

  const numbers = rowNumberLayout(chart, view, viewportWidth);
  if (numbers && y >= view.offsetY && y < chartBottom) {
    for (const area of [numbers.left, numbers.right]) {
      if (x < area.from || x >= area.to) continue;
      const fromTop = Math.floor((y - view.offsetY) / view.scale);
      const index = rows.length - 1 - fromTop;
      if (index >= 0 && index < rows.length) {
        return { kind: "row", index: rows[index] };
      }
    }
  }

  const columns = columnNumberLayout(chart, view, viewportWidth, viewportHeight);
  if (columns && x >= columns.fromX && x < columns.toX) {
    for (const area of [columns.top, columns.bottom]) {
      if (y < area.from || y >= area.to) continue;
      const col = Math.floor((x - view.offsetX) / view.scale) + 1;
      if (col >= 1 && col <= chart.width) {
        return { kind: "column", index: col };
      }
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
