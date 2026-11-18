/**
 * The chart model.
 *
 * A chart is plain JSON data. The model functions here mutate that data in
 * place; the UI wraps them in undo transactions. Keeping the data plain means
 * Import, export, autosave and the Node CLI all use exactly the same shape.
 *
 * Coordinate rules:
 *   - rows[0] is knitting row 1, the bottom row.
 *   - cells[0] is the leftmost cell in the picture.
 *   - Stitch numbers are displayed right-to-left, as knitters read RS rows.
 *   - Groups use 1-based row and column numbers, where column 1 is leftmost.
 */

import { getSymbol, isGroupSymbol, symbolSpan } from "./symbols.js";

export const SCHEMA = "strickschrift/1";
export const MIN_SIZE = 1;
export const MAX_SIZE = 1000;

export const DEFAULT_PALETTE = [
  { id: "A", name: "A", hex: "#ffffff" },
  { id: "B", name: "B", hex: "#1a1a1a" },
  { id: "C", name: "C", hex: "#b3261e" },
  { id: "D", name: "D", hex: "#1f5fa8" },
  { id: "E", name: "E", hex: "#2e7d32" },
  { id: "F", name: "F", hex: "#e0a800" },
  { id: "G", name: "G", hex: "#7a7a7a" },
  { id: "H", name: "H", hex: "#e8e8e8" }
];

export const DEFAULT_OPTIONS = {
  rowsMode: "all",
  showRowNumbers: true,
  showStitchNumbers: true,
  showLegend: true,
  repeat: null,
  cellMm: 6,
  paper: "A4",
  subtitle: ""
};

function emptyMatrix(width, height) {
  return Array.from({ length: height }, () => Array(width).fill(null));
}

function clone(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

/** Create a new, empty chart. */
export function createChart({ width = 24, height = 24, title = "" } = {}) {
  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    throw new Error("width and height must be integers");
  }
  return {
    schema: SCHEMA,
    id: "chart",
    title,
    width,
    height,
    rows: emptyMatrix(width, height),
    colors: emptyMatrix(width, height),
    groups: [],
    palette: clone(DEFAULT_PALETTE),
    options: { ...DEFAULT_OPTIONS },
    meta: {
      author: "",
      source: "",
      license: "GPL-3.0",
      notes: "",
      created: new Date().toISOString(),
      modified: new Date().toISOString()
    }
  };
}

/**
 * Bring imported data into the canonical shape without judging its meaning.
 * Validation is a separate step; this function only fills obvious gaps so the
 * editor can show a broken file instead of crashing.
 */
export function normalizeChart(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Chart must be a JSON object");
  }

  const width = Number(raw.width);
  const height = Number(raw.height);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < MIN_SIZE || height < MIN_SIZE) {
    throw new Error("Chart needs integer width and height");
  }

  const rows = Array.isArray(raw.rows) ? raw.rows : emptyMatrix(width, height);
  const colors = Array.isArray(raw.colors) ? raw.colors : emptyMatrix(width, height);

  return {
    schema: raw.schema || SCHEMA,
    id: typeof raw.id === "string" && raw.id ? raw.id : "chart",
    title: typeof raw.title === "string" ? raw.title : "",
    width,
    height,
    // "k" is accepted as a convenience alias for the empty knit cell.
    rows: rows.map((row) => (Array.isArray(row) ? row.map((cell) => (cell === "k" || cell === "" ? null : cell)) : [])),
    colors: colors.map((row) => (Array.isArray(row) ? row.slice() : [])),
    groups: Array.isArray(raw.groups) ? raw.groups.map((group) => ({ ...group })) : [],
    palette: Array.isArray(raw.palette) && raw.palette.length
      ? raw.palette.map((entry) => ({ ...entry }))
      : clone(DEFAULT_PALETTE),
    options: { ...DEFAULT_OPTIONS, ...(raw.options || {}) },
    meta: {
      author: "",
      source: "",
      license: "GPL-3.0",
      notes: "",
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      ...(raw.meta || {})
    }
  };
}

/** Deep copy, used for undo snapshots. */
export function cloneChart(chart) {
  return clone(chart);
}

/** A fresh id for a new group. */
export function nextGroupId(chart) {
  let index = 1;
  const used = new Set(chart.groups.map((group) => group.id));
  while (used.has(`g${index}`)) index += 1;
  return `g${index}`;
}

/** Read a cell. Row and column are 1-based. */
export function getCell(chart, row, col) {
  return chart.rows[row - 1]?.[col - 1] ?? null;
}

/** Read a colour id. Row and column are 1-based. */
export function getColor(chart, row, col) {
  return chart.colors[row - 1]?.[col - 1] ?? null;
}

/** Validate coordinates and return false instead of throwing. */
export function inBounds(chart, row, col) {
  return Number.isInteger(row) && Number.isInteger(col)
    && row >= 1 && row <= chart.height
    && col >= 1 && col <= chart.width;
}

/**
 * Set one cell. Multi-cell symbols must be placed as groups; that keeps the
 * grid honest and prevents half a cable from existing in a single cell.
 */
export function setCell(chart, row, col, symbol) {
  if (!inBounds(chart, row, col)) throw new Error("Cell is outside the chart");
  if (symbol === null || symbol === undefined || symbol === "k") {
    chart.rows[row - 1][col - 1] = null;
    return;
  }
  if (isGroupSymbol(symbol)) {
    throw new Error(`Symbol ${symbol} must be placed as a group`);
  }
  getSymbol(symbol);
  chart.rows[row - 1][col - 1] = symbol;
}

/** Set one colour, or clear it with null. */
export function setColor(chart, row, col, colorId) {
  if (!inBounds(chart, row, col)) throw new Error("Cell is outside the chart");
  if (colorId !== null && !chart.palette.some((entry) => entry.id === colorId)) {
    throw new Error(`Unknown colour: ${colorId}`);
  }
  chart.colors[row - 1][col - 1] = colorId;
}

/** Find the group that covers a cell, if any. */
export function groupAt(chart, row, col) {
  return chart.groups.find((group) => {
    const span = groupSpan(chart, group);
    return group.row === row && col >= group.col && col < group.col + span;
  }) || null;
}

/** Number of cells a group consumes. */
export function groupSpan(chart, group) {
  return symbolSpan(group.symbol, group);
}

/**
 * Add a group. The cells underneath must be empty; colours may remain.
 * Returns the new group.
 */
export function addGroup(chart, input) {
  const symbol = getSymbol(input.symbol);
  if (!symbol.group && !(symbol.span > 1)) {
    throw new Error(`Symbol ${input.symbol} is not a group symbol`);
  }

  const span = symbolSpan(input.symbol, input);
  const row = Number(input.row);
  const col = Number(input.col);
  if (!inBounds(chart, row, col)) throw new Error("Group starts outside the chart");
  if (col + span - 1 > chart.width) throw new Error("Group does not fit in the chart");
  if (span < 1) throw new Error("Group span must be positive");

  // Check overlap with existing groups first, then empty cells.
  for (const existing of chart.groups) {
    const existingSpan = groupSpan(chart, existing);
    if (existing.row === row
      && col < existing.col + existingSpan
      && existing.col < col + span) {
      throw new Error("Group overlaps an existing group");
    }
  }
  for (let offset = 0; offset < span; offset += 1) {
    if (getCell(chart, row, col + offset) !== null) {
      throw new Error("Group would cover a cell that already has a symbol");
    }
  }

  const group = {
    id: input.id || nextGroupId(chart),
    row,
    col,
    symbol: input.symbol
  };
  if (input.symbol === "cable") {
    group.left = Number(input.left);
    group.right = Number(input.right);
    group.direction = input.direction === "back" ? "back" : "front";
  } else if (input.symbol === "custom") {
    group.span = span;
    group.label = String(input.label || "").slice(0, 24);
  }
  chart.groups.push(group);
  chart.groups.sort((a, b) => (a.row - b.row) || (a.col - b.col));
  return group;
}

/** Remove a group by id. Returns true when something was removed. */
export function removeGroup(chart, id) {
  const index = chart.groups.findIndex((group) => group.id === id);
  if (index === -1) return false;
  chart.groups.splice(index, 1);
  return true;
}

/** Remove whatever group covers a cell. */
export function removeGroupAt(chart, row, col) {
  const group = groupAt(chart, row, col);
  return group ? removeGroup(chart, group.id) : false;
}

/**
 * Apply one tool click: symbol, colour, or both. If the cell is covered by a
 * group, the group is removed first so the paint is not hidden underneath.
 * Returns true when something actually changed.
 */
export function paintCell(chart, row, col, symbol, colorId) {
  if (!inBounds(chart, row, col)) return false;
  const previousCell = getCell(chart, row, col);
  const previousColor = getColor(chart, row, col);
  const hadGroup = removeGroupAt(chart, row, col);
  setCell(chart, row, col, symbol);
  setColor(chart, row, col, colorId);
  const nextCell = getCell(chart, row, col);
  return hadGroup || previousCell !== nextCell || previousColor !== colorId;
}

/** Clear a cell and any group covering it. Returns true when changed. */
export function eraseCell(chart, row, col) {
  if (!inBounds(chart, row, col)) return false;
  const previousCell = getCell(chart, row, col);
  const previousColor = getColor(chart, row, col);
  const hadGroup = removeGroupAt(chart, row, col);
  chart.rows[row - 1][col - 1] = null;
  chart.colors[row - 1][col - 1] = null;
  return hadGroup || previousCell !== null || previousColor !== null;
}

/** Resize from the bottom-left corner. New space appears right and above. */
export function resizeChart(chart, width, height) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < MIN_SIZE || height < MIN_SIZE) {
    throw new Error("Invalid chart size");
  }

  const nextRows = emptyMatrix(width, height);
  const nextColors = emptyMatrix(width, height);
  for (let row = 0; row < Math.min(height, chart.height); row += 1) {
    for (let col = 0; col < Math.min(width, chart.width); col += 1) {
      nextRows[row][col] = chart.rows[row][col];
      nextColors[row][col] = chart.colors[row][col];
    }
  }

  const removedGroups = [];
  const keptGroups = [];
  for (const group of chart.groups) {
    const span = groupSpan(chart, group);
    if (group.row <= height && group.col + span - 1 <= width) {
      keptGroups.push(group);
    } else {
      removedGroups.push(group.id);
    }
  }

  chart.width = width;
  chart.height = height;
  chart.rows = nextRows;
  chart.colors = nextColors;
  chart.groups = keptGroups;
  return { removedGroups };
}

/** Insert an empty row above or below a 1-based row. */
export function insertRow(chart, row, side = "above") {
  if (!inBounds(chart, row, 1)) throw new Error("Row is outside the chart");
  const index = side === "below" ? row - 1 : row;
  chart.rows.splice(index, 0, Array(chart.width).fill(null));
  chart.colors.splice(index, 0, Array(chart.width).fill(null));
  chart.height += 1;
  for (const group of chart.groups) {
    if (group.row > index) group.row += 1;
  }
  return index + 1;
}

/** Delete a 1-based row. Groups on it are removed. */
export function deleteRow(chart, row) {
  if (chart.height <= 1) throw new Error("The chart needs at least one row");
  if (!inBounds(chart, row, 1)) throw new Error("Row is outside the chart");
  chart.rows.splice(row - 1, 1);
  chart.colors.splice(row - 1, 1);
  chart.height -= 1;
  const removed = [];
  chart.groups = chart.groups.filter((group) => {
    if (group.row === row) {
      removed.push(group.id);
      return false;
    }
    if (group.row > row) group.row -= 1;
    return true;
  });
  return removed;
}

/** Insert an empty column left or right of a 1-based column. */
export function insertColumn(chart, col, side = "left") {
  if (!inBounds(chart, 1, col)) throw new Error("Column is outside the chart");
  const index = side === "right" ? col : col - 1;
  for (const row of chart.rows) row.splice(index, 0, null);
  for (const row of chart.colors) row.splice(index, 0, null);
  chart.width += 1;

  const removed = [];
  chart.groups = chart.groups.filter((group) => {
    const span = groupSpan(chart, group);
    const inside = index > group.col - 1 && index < group.col - 1 + span;
    if (inside) {
      removed.push(group.id);
      return false;
    }
    if (group.col - 1 >= index) group.col += 1;
    return true;
  });
  return removed;
}

/** Delete a 1-based column. Groups covering it are removed. */
export function deleteColumn(chart, col) {
  if (chart.width <= 1) throw new Error("The chart needs at least one column");
  if (!inBounds(chart, 1, col)) throw new Error("Column is outside the chart");
  const index = col - 1;
  for (const row of chart.rows) row.splice(index, 1);
  for (const row of chart.colors) row.splice(index, 1);
  chart.width -= 1;

  const removed = [];
  chart.groups = chart.groups.filter((group) => {
    const span = groupSpan(chart, group);
    const covers = group.col - 1 <= index && index < group.col - 1 + span;
    if (covers) {
      removed.push(group.id);
      return false;
    }
    if (group.col - 1 > index) group.col -= 1;
    return true;
  });
  return removed;
}

/** Swap a symbol for its mirror image. */
export function mirrorSymbol(id) {
  const pairs = {
    k2tog: "ssk",
    ssk: "k2tog",
    k3tog: "sk2p",
    sk2p: "k3tog",
    m1l: "m1r",
    m1r: "m1l"
  };
  return pairs[id] || id;
}

/** Mirror the whole chart left-to-right, including stitch directions. */
export function mirrorHorizontal(chart) {
  chart.rows = chart.rows.map((row) => row.slice().reverse().map((cell) => (cell ? mirrorSymbol(cell) : null)));
  chart.colors = chart.colors.map((row) => row.slice().reverse());
  chart.groups = chart.groups.map((group) => {
    const span = groupSpan(chart, group);
    const next = { ...group, col: chart.width - (group.col - 1) - span + 1 };
    if (next.symbol === "cable") {
      next.direction = next.direction === "front" ? "back" : "front";
    } else if (next.symbol !== "custom") {
      // A mirrored decrease or increase leans the other way.
      next.symbol = mirrorSymbol(next.symbol);
    }
    return next;
  });
}

/** Mirror the whole chart bottom-to-top. */
export function mirrorVertical(chart) {
  chart.rows = chart.rows.slice().reverse();
  chart.colors = chart.colors.slice().reverse();
  chart.groups = chart.groups.map((group) => ({ ...group, row: chart.height - group.row + 1 }));
}

/**
 * Copy a rectangular selection into a plain fragment. Groups that lie fully
 * inside the selection are copied with adjusted coordinates.
 */
export function copySelection(chart, row1, col1, row2, col2) {
  const top = Math.min(row1, row2);
  const bottom = Math.max(row1, row2);
  const left = Math.min(col1, col2);
  const right = Math.max(col1, col2);
  const rows = [];
  const colors = [];
  for (let row = top; row <= bottom; row += 1) {
    rows.push(chart.rows[row - 1].slice(left - 1, right));
    colors.push(chart.colors[row - 1].slice(left - 1, right));
  }
  const groups = chart.groups
    .filter((group) => {
      const span = groupSpan(chart, group);
      return group.row >= top && group.row <= bottom
        && group.col >= left && group.col + span - 1 <= right;
    })
    .map((group) => ({ ...group, row: group.row - top + 1, col: group.col - left + 1 }));
  return { width: right - left + 1, height: bottom - top + 1, rows, colors, groups };
}

/**
 * Paste a fragment with its top-left corner at (row, col). Returns the new
 * groups that were created. Existing symbols are overwritten.
 */
export function pasteFragment(chart, fragment, row, col) {
  if (!fragment || !Array.isArray(fragment.rows)) throw new Error("Invalid fragment");
  if (row < 1 || col < 1 || row + fragment.height - 1 > chart.height || col + fragment.width - 1 > chart.width) {
    throw new Error("Fragment does not fit at this position");
  }
  for (let r = 0; r < fragment.height; r += 1) {
    for (let c = 0; c < fragment.width; c += 1) {
      chart.rows[row - 1 + r][col - 1 + c] = fragment.rows[r][c];
      chart.colors[row - 1 + r][col - 1 + c] = fragment.colors[r]?.[c] ?? null;
    }
  }
  // Remove groups that overlap the pasted rectangle; they would be ambiguous.
  chart.groups = chart.groups.filter((group) => {
    const span = groupSpan(chart, group);
    return !(group.row >= row && group.row < row + fragment.height
      && group.col < col + fragment.width && group.col + span - 1 >= col);
  });
  const created = [];
  for (const group of fragment.groups || []) {
    created.push(addGroup(chart, { ...group, row: row + group.row - 1, col: col + group.col - 1, id: undefined }));
  }
  return created;
}

/**
 * Rows that are visible in the current row mode, bottom to top.
 * "rs" shows only right-side rows (1, 3, 5 …), but all rows stay stored.
 */
export function visibleRows(chart) {
  if (chart.options?.rowsMode === "rs") {
    const rows = [];
    for (let row = 1; row <= chart.height; row += 2) rows.push(row);
    return rows;
  }
  return Array.from({ length: chart.height }, (_, index) => index + 1);
}

/**
 * Quickly check whether a chart contains anything worth rendering.
 * This is used by the empty-state overlay and must not scan a million cells
 * on every brush stroke, so it exits on the first hit.
 */
export function hasContent(chart) {
  if (chart.groups.length) return true;
  for (let row = 0; row < chart.height; row += 1) {
    for (let col = 0; col < chart.width; col += 1) {
      if (chart.rows[row][col] || chart.colors[row][col]) return true;
    }
  }
  return false;
}

/** Counts and simple facts for the status bar. */
export function chartStats(chart) {
  let symbols = 0;
  let colored = 0;
  for (let row = 0; row < chart.height; row += 1) {
    for (let col = 0; col < chart.width; col += 1) {
      if (chart.rows[row][col]) symbols += 1;
      if (chart.colors[row][col]) colored += 1;
    }
  }
  return {
    width: chart.width,
    height: chart.height,
    symbols,
    colored,
    groups: chart.groups.length
  };
}

/**
 * Unique legend entries in reading order: bottom to top, left to right.
 * The renderer uses this to build a compact, stable legend. Identical cables
 * share one entry; the chart does not repeat the same explanation.
 */
export function usedLegendKeys(chart) {
  const seen = new Set();
  const entries = [];
  const usedColors = new Set();
  const add = (key, value) => {
    if (!seen.has(key)) {
      seen.add(key);
      entries.push(value);
    }
  };
  for (let row = 1; row <= chart.height; row += 1) {
    const groups = chart.groups.filter((group) => group.row === row);
    for (let col = 1; col <= chart.width; col += 1) {
      const color = getColor(chart, row, col);
      if (color) usedColors.add(color);

      const group = groups.find((item) => col >= item.col && col < item.col + groupSpan(chart, item));
      if (group) {
        const key = `group:${group.symbol}:${group.left || ""}:${group.right || ""}:${group.direction || ""}:${group.label || ""}`;
        add(key, { kind: "group", group });
        continue;
      }
      const cell = getCell(chart, row, col);
      if (cell) add(`cell:${cell}`, { kind: "cell", symbol: cell });
    }
  }
  for (const color of chart.palette) {
    if (usedColors.has(color.id)) add(`color:${color.id}`, { kind: "color", color });
  }
  return entries;
}
