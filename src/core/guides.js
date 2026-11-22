/**
 * Geometry and hit-testing for cosmetic guide lines.
 *
 * Guide lines live between stitches, so their x position is a grid boundary.
 * The renderers work in cell units and convert to pixels or millimetres
 * themselves. Keeping the geometry here means the canvas editor, the SVG
 * export and the tests all agree on the same line.
 */

/** Line width in cell units; scales with the chart, never with the UI. */
export const GUIDE_WIDTH_CELLS = 0.075;

/**
 * Turn a guide into a line in cell coordinates.
 *
 * `x` is the boundary from the left, `y1` the bottom edge (larger number) and
 * `y2` the top edge (smaller number). The result is null when the row range is
 * hidden in right-side-only mode.
 */
export function guideLine(guide, rows) {
  let first = -1;
  let last = -1;
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (row < guide.fromRow || row > guide.toRow) continue;
    if (first === -1) first = index;
    last = index;
  }
  if (first === -1) return null;
  return {
    x: guide.boundary,
    y1: rows.length - first,
    y2: rows.length - (last + 1)
  };
}

/**
 * The last matching guide on a boundary that covers a row. Used for
 * click-to-remove and for right-click deletion in the editor.
 */
export function findGuideAt(chart, boundary, row) {
  const guides = chart.guides || [];
  for (let index = guides.length - 1; index >= 0; index -= 1) {
    const guide = guides[index];
    if (guide.boundary === boundary && row >= guide.fromRow && row <= guide.toRow) {
      return guide;
    }
  }
  return null;
}
