/**
 * Run-length labels for the chart.
 *
 * A run is a sequence of adjacent stitches with the same symbol and the same
 * colour. Runs are read in knitting order (right to left) and labelled at
 * their first stitch, which is the rightmost cell of the run. Groups break a
 * run: a cable or a decrease is one object, not a number of equal stitches.
 *
 * The function is deliberately pure and independent of the renderer so the
 * canvas, the SVG export and the tests all use the same definition.
 */

import { groupSpan, visibleRows } from "./chart.js";

/**
 * @returns {Array<{row:number,col:number,count:number}>} labels for runs
 * longer than one stitch, in chart coordinates (row 1 bottom, col 1 left).
 */
export function stitchCountRuns(chart, { rows = visibleRows(chart) } = {}) {
  const groupsByRow = new Map();
  for (const group of chart.groups) {
    const span = groupSpan(chart, group);
    let list = groupsByRow.get(group.row);
    if (!list) {
      list = [];
      groupsByRow.set(group.row, list);
    }
    list.push({ start: group.col, end: group.col + span - 1, id: group.id });
  }

  const labels = [];
  for (const row of rows) {
    // A completely empty row has no symbol to count after. Leaving it out
    // keeps the option quiet on rest rows and on an empty chart.
    const hasContent = chart.rows[row - 1].some((cell, index) => (
      cell !== null || chart.colors[row - 1][index] !== null
    )) || (groupsByRow.get(row)?.length || 0) > 0;
    if (!hasContent) continue;
    const groupCells = new Map();
    for (const group of groupsByRow.get(row) || []) {
      for (let col = group.start; col <= group.end; col += 1) {
        groupCells.set(col, group.id);
      }
    }

    let key = null;
    let group = false;
    let symbol = null;
    let start = 0;
    let length = 0;

    const flush = () => {
      if (length > 1 && !group && symbol !== "nostitch") {
        labels.push({ row, col: start, count: length });
      }
    };

    for (let col = chart.width; col >= 1; col -= 1) {
      const groupId = groupCells.get(col);
      const cell = groupId ? null : chart.rows[row - 1][col - 1];
      const color = groupId ? null : chart.colors[row - 1][col - 1];
      const nextKey = groupId
        ? `g:${groupId}`
        : `s:${cell ?? ""}|c:${color ?? ""}`;
      if (nextKey !== key) {
        flush();
        key = nextKey;
        group = Boolean(groupId);
        symbol = cell;
        start = col;
        length = 1;
      } else {
        length += 1;
      }
    }
    flush();
  }
  return labels;
}
