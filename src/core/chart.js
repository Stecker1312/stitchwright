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

import { getSymbol, hasSymbol, isGroupSymbol, symbolSpan } from "./symbols.js";

export const SCHEMA = "strickschrift/1";
export const MIN_SIZE = 1;
export const MAX_SIZE = 1000;

/**
 * Guide lines are cosmetic reading aids between stitches. They store their own
 * colour so they stay independent of the yarn palette and the legend.
 */
export const DEFAULT_GUIDE_COLOR = "#1a1a1a";
const GUIDE_COLOR = /^#[0-9a-f]{6}$/i;

/** True when a value is a colour the guide renderer can draw. */
export function isGuideColor(value) {
  return typeof value === "string" && GUIDE_COLOR.test(value);
}

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
  // "flat" means back-and-forth knitting; "round" means every row is a
  // right-side round. The field is additive: files without it are flat.
  construction: "flat",
  rowsMode: "all",
  showRowNumbers: true,
  showStitchNumbers: true,
  showStitchCounts: false,
  showLegend: true,
  repeat: null,
  cellMm: 6,
  paper: "A4",
  subtitle: "",
  markers: []
};

function emptyMatrix(width, height) {
  return Array.from({ length: height }, () => Array(width).fill(null));
}

function clone(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

/** True when a value can be used as a chart dimension. */
function validSize(value) {
  return Number.isInteger(value) && value >= MIN_SIZE && value <= MAX_SIZE;
}

/** Create a new, empty chart. */
export function createChart({ width = 24, height = 24, title = "", construction = "flat" } = {}) {
  if (!validSize(width) || !validSize(height)) {
    throw new Error(`width and height must be whole numbers between ${MIN_SIZE} and ${MAX_SIZE}`);
  }
  if (typeof title !== "string" || title.length > 120) {
    throw new Error("title must be a string of at most 120 characters");
  }
  if (construction !== "flat" && construction !== "round") {
    throw new Error('construction must be "flat" or "round"');
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
    guides: [],
    palette: clone(DEFAULT_PALETTE),
    options: { ...DEFAULT_OPTIONS, construction, markers: [] },
    meta: {
      author: "",
      source: "",
      license: "",
      notes: "",
      created: new Date().toISOString(),
      modified: new Date().toISOString()
    }
  };
}

/**
 * Bring imported data into the canonical shape without judging its meaning.
 *
 * Structural problems throw instead of being silently repaired. Unknown
 * top-level fields are preserved so `--strict` and later format versions can
 * still see them. Validation remains a separate step.
 */
export function normalizeChart(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Chart must be a JSON object");
  }
  if (raw.schema !== SCHEMA) {
    throw new Error(`Expected schema "${SCHEMA}"`);
  }
  const width = raw.width;
  const height = raw.height;
  if (!validSize(width) || !validSize(height)) {
    throw new Error(`Chart needs integer width and height between ${MIN_SIZE} and ${MAX_SIZE}`);
  }
  if (!Array.isArray(raw.rows) || raw.rows.length !== height) {
    throw new Error("Chart needs a rows array with one entry per row");
  }
  if (raw.title !== undefined && (typeof raw.title !== "string" || raw.title.length > 120)) {
    throw new Error("title must be a string of at most 120 characters");
  }
  if (raw.id !== undefined && (typeof raw.id !== "string" || raw.id.length === 0)) {
    throw new Error("id must be a non-empty string");
  }

  const rows = raw.rows.map((row) => {
    if (!Array.isArray(row) || row.length !== width) {
      throw new Error("Every row must be an array with one entry per stitch");
    }
    return row.map((cell) => {
      if (cell === null) return null;
      if (typeof cell !== "string") throw new Error("Cells must be symbol ids or null");
      if (cell === "k" || cell === "") return null;
      getSymbol(cell);
      if (isGroupSymbol(cell)) throw new Error(`Symbol ${cell} must be placed as a group`);
      return cell;
    });
  });

  let colors = raw.colors === undefined ? emptyMatrix(width, height) : raw.colors;
  if (!Array.isArray(colors) || colors.length !== height) {
    throw new Error("colors must be a matrix with one row per chart row");
  }
  colors = colors.map((row) => {
    if (!Array.isArray(row) || row.length !== width) {
      throw new Error("Every colour row must have one entry per stitch");
    }
    return row.map((color) => {
      if (color !== null && typeof color !== "string") {
        throw new Error("Colours must be palette ids or null");
      }
      return color;
    });
  });

  const groups = raw.groups === undefined ? [] : raw.groups;
  if (!Array.isArray(groups) || groups.some((group) => !group || typeof group !== "object" || Array.isArray(group))) {
    throw new Error("groups must be an array of objects");
  }

  const guides = raw.guides === undefined ? [] : raw.guides;
  if (!Array.isArray(guides) || guides.some((guide) => !guide || typeof guide !== "object" || Array.isArray(guide))) {
    throw new Error("guides must be an array of objects");
  }

  const palette = raw.palette === undefined ? clone(DEFAULT_PALETTE) : raw.palette;
  if (!Array.isArray(palette) || palette.some((entry) => !entry || typeof entry !== "object" || Array.isArray(entry))) {
    throw new Error("palette must be an array of objects");
  }

  if (raw.options !== undefined && (!raw.options || typeof raw.options !== "object" || Array.isArray(raw.options))) {
    throw new Error("options must be an object");
  }
  if (raw.meta !== undefined && (!raw.meta || typeof raw.meta !== "object" || Array.isArray(raw.meta))) {
    throw new Error("meta must be an object");
  }

  const options = {
    ...DEFAULT_OPTIONS,
    ...(raw.options || {}),
    markers: Array.isArray(raw.options?.markers) ? raw.options.markers.slice() : []
  };
  const meta = {
    author: "",
    source: "",
    license: "",
    notes: "",
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    ...(raw.meta || {})
  };

  const {
    schema: _schema,
    id: _id,
    title: _title,
    width: _width,
    height: _height,
    rows: _rows,
    colors: _colors,
    groups: _groups,
    guides: _guides,
    palette: _palette,
    options: _options,
    meta: _meta,
    ...rest
  } = raw;

  return {
    ...rest,
    schema: SCHEMA,
    id: typeof raw.id === "string" && raw.id ? raw.id : "chart",
    title: typeof raw.title === "string" ? raw.title : "",
    width,
    height,
    rows,
    colors,
    groups: groups.map((group) => ({ ...group })),
    guides: guides.map((guide) => ({ ...guide })),
    palette: palette.map((entry) => ({ ...entry })),
    options,
    meta
  };
}

/** Deep copy, used for undo snapshots. */
export function cloneChart(chart) {
  return clone(chart);
}

/** Update the content timestamp after a real content change. */
export function touchChartMeta(chart) {
  if (chart.meta && typeof chart.meta === "object") {
    const previous = Date.parse(chart.meta.modified) || 0;
    chart.meta.modified = new Date(Math.max(Date.now(), previous + 1)).toISOString();
  }
}

/** A fresh id for a new group. */
export function nextGroupId(chart) {
  let index = 1;
  const used = new Set(chart.groups.map((group) => group.id));
  while (used.has(`g${index}`)) index += 1;
  return `g${index}`;
}

/** A fresh id for a new guide line. */
export function nextGuideId(chart) {
  let index = 1;
  const used = new Set((chart.guides || []).map((guide) => guide.id));
  while (used.has(`l${index}`)) index += 1;
  return `l${index}`;
}

/** Read a cell. Row and column are 1-based. */
export function getCell(chart, row, col) {
  return chart.rows[row - 1]?.[col - 1] ?? null;
}

/** Read a colour id. Row and column are 1-based. */
export function getColor(chart, row, col) {
  return chart.colors[row - 1]?.[col - 1] ?? null;
}

/** Convert an internal picture column to the knitter-facing stitch number. */
export function columnToStitch(chart, col) {
  return chart.width - col + 1;
}

/** Convert a knitter-facing stitch number to an internal picture column. */
export function stitchToColumn(chart, stitch) {
  return chart.width - stitch + 1;
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
  if (groupAt(chart, row, col)) throw new Error("Cell is covered by a group");
  if (symbol === null || symbol === undefined || symbol === "k") {
    chart.rows[row - 1][col - 1] = null;
    touchChartMeta(chart);
    return;
  }
  if (isGroupSymbol(symbol)) {
    throw new Error(`Symbol ${symbol} must be placed as a group`);
  }
  getSymbol(symbol);
  chart.rows[row - 1][col - 1] = symbol;
  touchChartMeta(chart);
}

/** Set one colour, or clear it with null. */
export function setColor(chart, row, col, colorId) {
  if (!inBounds(chart, row, col)) throw new Error("Cell is outside the chart");
  if (colorId !== null && !chart.palette.some((entry) => entry.id === colorId)) {
    throw new Error(`Unknown colour: ${colorId}`);
  }
  chart.colors[row - 1][col - 1] = colorId;
  touchChartMeta(chart);
}

/**
 * Toggle a stitch marker after a column. Markers are chart guides only; they
 * are not knitted and do not appear in the legend. Boundary 3 means "after
 * stitch 3", between columns 3 and 4.
 */
export function toggleMarker(chart, boundary) {
  if (!Number.isInteger(boundary) || boundary < 1 || boundary >= chart.width) return false;
  const markers = Array.isArray(chart.options.markers) ? chart.options.markers : [];
  const index = markers.indexOf(boundary);
  if (index === -1) markers.push(boundary);
  else markers.splice(index, 1);
  markers.sort((a, b) => a - b);
  chart.options.markers = markers;
  touchChartMeta(chart);
  return true;
}

/** Replace all markers with a regular grid: after every N stitches. */
export function setMarkerEvery(chart, every) {
  if (!Number.isInteger(every) || every < 1) throw new Error("Marker interval must be positive");
  const markers = [];
  for (let boundary = every; boundary < chart.width; boundary += every) markers.push(boundary);
  chart.options.markers = markers;
  touchChartMeta(chart);
  return markers;
}

export function clearMarkers(chart) {
  chart.options.markers = [];
  touchChartMeta(chart);
}

/**
 * Add a cosmetic guide line on a stitch boundary. `boundary` is the number of
 * picture columns to the left of the line (1 … width-1), so boundary 3 sits
 * between picture columns 3 and 4. Rows are inclusive and 1-based.
 */
export function addGuide(chart, input) {
  const boundary = Number(input.boundary);
  const fromRow = Number(input.fromRow);
  const toRow = Number(input.toRow);
  if (!Number.isInteger(boundary) || boundary < 1 || boundary >= chart.width) {
    throw new Error("Guide line boundary must be between two stitches inside the chart");
  }
  if (!Number.isInteger(fromRow) || !Number.isInteger(toRow)
    || fromRow < 1 || toRow > chart.height || fromRow > toRow) {
    throw new Error("Guide line rows must be inside the chart");
  }
  const color = input.color === undefined || input.color === null
    ? DEFAULT_GUIDE_COLOR
    : String(input.color).toLowerCase();
  if (!isGuideColor(color)) {
    throw new Error(`Unknown guide line colour: ${String(input.color)}`);
  }
  const id = input.id === undefined || input.id === null ? nextGuideId(chart) : String(input.id);
  if (!id) throw new Error("Guide line id must not be empty");
  if ((chart.guides || []).some((guide) => guide.id === id)) {
    throw new Error(`Duplicate guide line id: ${id}`);
  }
  const guide = { id, color, boundary, fromRow, toRow };
  if (!Array.isArray(chart.guides)) chart.guides = [];
  chart.guides.push(guide);
  chart.guides.sort((a, b) => (a.boundary - b.boundary) || (a.fromRow - b.fromRow) || (a.toRow - b.toRow));
  touchChartMeta(chart);
  return guide;
}

/** Remove one guide line by id. Returns true when something was removed. */
export function removeGuide(chart, id) {
  const index = (chart.guides || []).findIndex((guide) => guide.id === id);
  if (index === -1) return false;
  chart.guides.splice(index, 1);
  touchChartMeta(chart);
  return true;
}

/** Remove all guide lines. Returns true when the chart changed. */
export function clearGuides(chart) {
  if (!Array.isArray(chart.guides) || chart.guides.length === 0) return false;
  chart.guides = [];
  touchChartMeta(chart);
  return true;
}

/** Guide lines on one boundary that overlap a row range. */
export function guidesOverlapping(chart, boundary, fromRow, toRow) {
  return (chart.guides || []).filter((guide) => (
    guide.boundary === boundary && guide.fromRow <= toRow && guide.toRow >= fromRow
  ));
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

  const id = input.id === undefined || input.id === null
    ? nextGroupId(chart)
    : String(input.id);
  if (!id) throw new Error("Group id must not be empty");
  if (chart.groups.some((group) => group.id === id)) {
    throw new Error(`Duplicate group id: ${id}`);
  }

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
    id,
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
    group.legend = String(input.legend || "").slice(0, 160);
  }
  chart.groups.push(group);
  chart.groups.sort((a, b) => (a.row - b.row) || (a.col - b.col));
  touchChartMeta(chart);
  return group;
}

/** Remove a group by id. Returns true when something was removed. */
export function removeGroup(chart, id) {
  const index = chart.groups.findIndex((group) => group.id === id);
  if (index === -1) return false;
  chart.groups.splice(index, 1);
  touchChartMeta(chart);
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

  const value = symbol === "k" ? null : symbol;
  if (value !== null) {
    if (isGroupSymbol(value)) throw new Error(`Symbol ${value} must be placed as a group`);
    getSymbol(value);
  }
  if (colorId !== null && !chart.palette.some((entry) => entry.id === colorId)) {
    throw new Error(`Unknown colour: ${colorId}`);
  }

  const previousCell = getCell(chart, row, col);
  const previousColor = getColor(chart, row, col);
  const group = groupAt(chart, row, col);
  const groupIndex = group ? chart.groups.indexOf(group) : -1;

  try {
    if (group) removeGroup(chart, group.id);
    setCell(chart, row, col, value);
    setColor(chart, row, col, colorId);
  } catch (error) {
    chart.rows[row - 1][col - 1] = previousCell;
    chart.colors[row - 1][col - 1] = previousColor;
    if (group && groupIndex >= 0) {
      chart.groups.splice(groupIndex, 0, group);
      chart.groups.sort((a, b) => (a.row - b.row) || (a.col - b.col));
    }
    throw error;
  }

  const nextCell = getCell(chart, row, col);
  return Boolean(group) || previousCell !== nextCell || previousColor !== colorId;
}

/** Clear a cell and any group covering it. Returns true when changed. */
export function eraseCell(chart, row, col) {
  if (!inBounds(chart, row, col)) return false;
  const previousCell = getCell(chart, row, col);
  const previousColor = getColor(chart, row, col);
  const hadGroup = removeGroupAt(chart, row, col);
  chart.rows[row - 1][col - 1] = null;
  chart.colors[row - 1][col - 1] = null;
  touchChartMeta(chart);
  return hadGroup || previousCell !== null || previousColor !== null;
}

/** Clamp repeat bounds to the current chart width, or remove them. */
export function clampRepeat(chart) {
  const repeat = chart.options?.repeat;
  if (!repeat) {
    if (chart.options) chart.options.repeat = null;
    return null;
  }
  const start = Number(repeat.start);
  const end = Number(repeat.end);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || start > end || start > chart.width) {
    chart.options.repeat = null;
    return null;
  }
  chart.options.repeat = { start, end: Math.min(end, chart.width) };
  return chart.options.repeat;
}

/** Move repeat bounds when a column is inserted at a 0-based position. */
function repeatAfterInsert(repeat, index) {
  if (!repeat) return null;
  const inserted = index + 1;
  if (inserted <= repeat.start) return { start: repeat.start + 1, end: repeat.end + 1 };
  if (inserted <= repeat.end) return { start: repeat.start, end: repeat.end + 1 };
  return { start: repeat.start, end: repeat.end };
}

/** Move repeat bounds when a 1-based column is deleted. */
function repeatAfterDelete(repeat, deleted) {
  if (!repeat) return null;
  if (deleted < repeat.start) return { start: repeat.start - 1, end: repeat.end - 1 };
  if (deleted <= repeat.end) return { start: repeat.start, end: repeat.end - 1 };
  return { start: repeat.start, end: repeat.end };
}

/** Resize from the bottom-left corner. New space appears right and above. */
export function resizeChart(chart, width, height) {
  if (!validSize(width) || !validSize(height)) {
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
  // Guide lines are cosmetic: a line outside the new grid is dropped, a line
  // that reaches past the new top is shortened instead.
  chart.guides = (chart.guides || [])
    .filter((guide) => guide.boundary >= 1 && guide.boundary < width && guide.fromRow <= height)
    .map((guide) => (guide.toRow > height ? { ...guide, toRow: height } : guide));
  chart.options.markers = (chart.options.markers || []).filter((marker) => marker < width);
  clampRepeat(chart);
  touchChartMeta(chart);
  return { removedGroups };
}

/** Insert an empty row above or below a 1-based row. */
export function insertRow(chart, row, side = "above") {
  if (chart.height >= MAX_SIZE) throw new Error("Maximum chart height reached");
  if (!inBounds(chart, row, 1)) throw new Error("Row is outside the chart");
  const index = side === "below" ? row - 1 : row;
  chart.rows.splice(index, 0, Array(chart.width).fill(null));
  chart.colors.splice(index, 0, Array(chart.width).fill(null));
  chart.height += 1;
  for (const group of chart.groups) {
    if (group.row > index) group.row += 1;
  }
  for (const guide of chart.guides || []) {
    if (index < guide.fromRow) {
      guide.fromRow += 1;
      guide.toRow += 1;
    } else if (index < guide.toRow) {
      guide.toRow += 1;
    }
  }
  touchChartMeta(chart);
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
  chart.guides = (chart.guides || []).filter((guide) => {
    if (row < guide.fromRow) {
      guide.fromRow -= 1;
      guide.toRow -= 1;
      return true;
    }
    if (row > guide.toRow) return true;
    if (guide.fromRow === guide.toRow) return false;
    guide.toRow -= 1;
    return true;
  });
  touchChartMeta(chart);
  return removed;
}

/** Insert an empty column left or right of a 1-based column. */
export function insertColumn(chart, col, side = "left") {
  if (chart.width >= MAX_SIZE) throw new Error("Maximum chart width reached");
  if (!inBounds(chart, 1, col)) throw new Error("Column is outside the chart");
  const index = side === "right" ? col : col - 1;
  for (const row of chart.rows) row.splice(index, 0, null);
  for (const row of chart.colors) row.splice(index, 0, null);
  chart.width += 1;
  for (const guide of chart.guides || []) {
    if (guide.boundary > index) guide.boundary += 1;
  }
  chart.guides = (chart.guides || []).filter((guide) => guide.boundary >= 1 && guide.boundary < chart.width);
  chart.options.markers = (chart.options.markers || [])
    .map((marker) => (marker >= index ? marker + 1 : marker))
    .filter((marker) => marker < chart.width);
  chart.options.repeat = repeatAfterInsert(chart.options.repeat, index);
  clampRepeat(chart);

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
  touchChartMeta(chart);
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
  for (const guide of chart.guides || []) {
    if (guide.boundary > index) guide.boundary -= 1;
  }
  chart.guides = (chart.guides || []).filter((guide) => guide.boundary >= 1 && guide.boundary < chart.width);
  chart.options.markers = (chart.options.markers || [])
    .map((marker) => {
      if (marker <= index) return marker;
      if (marker === index + 1) return null;
      return marker - 1;
    })
    .filter((marker) => marker !== null && marker < chart.width);
  chart.options.repeat = repeatAfterDelete(chart.options.repeat, col);
  clampRepeat(chart);

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
  touchChartMeta(chart);
  return removed;
}

/** Swap a symbol for its mirror image. */
export function mirrorSymbol(id) {
  const pairs = {
    k2tog: "ssk",
    ssk: "k2tog",
    p2tog: "ssp",
    ssp: "p2tog",
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
      // left/right describe the bundles in the picture, so they swap too.
      next.left = group.right;
      next.right = group.left;
    } else if (next.symbol !== "custom") {
      // A mirrored decrease or increase leans the other way.
      next.symbol = mirrorSymbol(next.symbol);
    }
    return next;
  });
  chart.options.markers = (chart.options.markers || [])
    .map((marker) => chart.width - marker)
    .sort((a, b) => a - b);
  chart.guides = (chart.guides || [])
    .map((guide) => ({ ...guide, boundary: chart.width - guide.boundary }))
    .filter((guide) => guide.boundary >= 1 && guide.boundary < chart.width);
  const repeat = chart.options.repeat;
  if (repeat) {
    chart.options.repeat = {
      start: chart.width - repeat.end + 1,
      end: chart.width - repeat.start + 1
    };
    clampRepeat(chart);
  }
  touchChartMeta(chart);
}

/** Mirror the whole chart bottom-to-top. */
export function mirrorVertical(chart) {
  chart.rows = chart.rows.slice().reverse();
  chart.colors = chart.colors.slice().reverse();
  chart.groups = chart.groups.map((group) => ({ ...group, row: chart.height - group.row + 1 }));
  chart.guides = (chart.guides || []).map((guide) => ({
    ...guide,
    fromRow: chart.height - guide.toRow + 1,
    toRow: chart.height - guide.fromRow + 1
  }));
  touchChartMeta(chart);
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
  const usedColors = new Set();
  for (let row = top; row <= bottom; row += 1) {
    rows.push(chart.rows[row - 1].slice(left - 1, right));
    const colorRow = chart.colors[row - 1].slice(left - 1, right);
    for (const color of colorRow) if (color) usedColors.add(color);
    colors.push(colorRow);
  }
  const groups = chart.groups
    .filter((group) => {
      const span = groupSpan(chart, group);
      return group.row >= top && group.row <= bottom
        && group.col >= left && group.col + span - 1 <= right;
    })
    .map((group) => ({ ...group, row: group.row - top + 1, col: group.col - left + 1 }));
  return {
    width: right - left + 1,
    height: bottom - top + 1,
    rows,
    colors,
    groups,
    palette: chart.palette.filter((entry) => usedColors.has(entry.id)).map((entry) => ({ ...entry }))
  };
}

/** Allocate a palette id that is not used in the chart. */
function freePaletteId(palette) {
  const used = new Set(palette.map((entry) => entry.id));
  for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
    if (!used.has(letter)) return letter;
  }
  let index = 1;
  while (used.has(`C${index}`)) index += 1;
  return `C${index}`;
}

/**
 * Paste a fragment with its top-left corner at (row, col). Returns the new
 * groups that were created. Existing symbols are overwritten, but the
 * fragment is applied to a working copy first so a bad fragment leaves the
 * original document untouched.
 */
export function pasteFragment(chart, fragment, row, col) {
  if (!fragment || !Array.isArray(fragment.rows) || !Array.isArray(fragment.colors)) {
    throw new Error("Invalid fragment");
  }
  const width = Number(fragment.width);
  const height = Number(fragment.height);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error("Invalid fragment size");
  }
  if (fragment.rows.length !== height || fragment.colors.length !== height) {
    throw new Error("Fragment rows do not match its height");
  }
  if (row < 1 || col < 1 || row + height - 1 > chart.height || col + width - 1 > chart.width) {
    throw new Error("Fragment does not fit at this position");
  }

  const working = cloneChart(chart);
  const fragmentPalette = Array.isArray(fragment.palette) ? fragment.palette : [];
  const usedColors = new Set();
  for (const colorRow of fragment.colors) {
    if (!Array.isArray(colorRow) || colorRow.length !== width) throw new Error("Fragment colour row has the wrong width");
    for (const color of colorRow) if (color) usedColors.add(color);
  }
  const colorMap = new Map();
  for (const id of usedColors) {
    const source = fragmentPalette.find((entry) => entry.id === id);
    const existing = working.palette.find((entry) => entry.id === id);
    if (!source) {
      if (!existing) throw new Error(`Fragment references unknown colour: ${id}`);
      colorMap.set(id, id);
      continue;
    }
    if (existing && String(existing.hex).toLowerCase() === String(source.hex).toLowerCase()) {
      colorMap.set(id, existing.id);
      continue;
    }
    if (!existing) {
      working.palette.push({ ...source });
      colorMap.set(id, id);
      continue;
    }
    const nextId = freePaletteId(working.palette);
    working.palette.push({ id: nextId, name: source.name || nextId, hex: source.hex });
    colorMap.set(id, nextId);
  }

  // The fragment carries its own meaning. Remove groups that it would overlap.
  working.groups = working.groups.filter((group) => {
    const span = groupSpan(working, group);
    return !(group.row >= row && group.row < row + height
      && group.col < col + width && group.col + span - 1 >= col);
  });
  for (let r = 0; r < height; r += 1) {
    if (!Array.isArray(fragment.rows[r]) || fragment.rows[r].length !== width) {
      throw new Error("Fragment row has the wrong width");
    }
    for (let c = 0; c < width; c += 1) {
      const cell = fragment.rows[r][c];
      if (cell !== null && (typeof cell !== "string" || !hasSymbol(cell) || isGroupSymbol(cell))) {
        throw new Error(`Fragment contains an unknown symbol: ${String(cell)}`);
      }
      working.rows[row - 1 + r][col - 1 + c] = cell;
      const color = fragment.colors[r][c];
      working.colors[row - 1 + r][col - 1 + c] = color ? colorMap.get(color) : null;
    }
  }

  const created = [];
  for (const group of fragment.groups || []) {
    created.push(addGroup(working, {
      ...group,
      row: row + group.row - 1,
      col: col + group.col - 1,
      id: undefined
    }));
  }

  Object.assign(chart, working);
  touchChartMeta(chart);
  return created;
}

/** True when every row is a right-side round instead of a flat row. */
export function isInTheRound(chart) {
  return chart?.options?.construction === "round";
}

/**
 * Rows that are visible in the current row mode, bottom to top.
 * "rs" shows only right-side rows (1, 3, 5 …), but all rows stay stored.
 * Round charts always show every round; hiding every second round would
 * silently drop half of the knitting.
 */
export function visibleRows(chart) {
  if (isInTheRound(chart)) {
    return Array.from({ length: chart.height }, (_, index) => index + 1);
  }
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
  const groupsByRow = new Map();
  for (const group of chart.groups) {
    if (!groupsByRow.has(group.row)) groupsByRow.set(group.row, []);
    groupsByRow.get(group.row).push(group);
  }
  for (let row = 1; row <= chart.height; row += 1) {
    const groups = groupsByRow.get(row) || [];
    for (let col = 1; col <= chart.width; col += 1) {
      const color = getColor(chart, row, col);
      if (color) usedColors.add(color);

      const group = groups.find((item) => col >= item.col && col < item.col + groupSpan(chart, item));
      if (group) {
        const key = JSON.stringify([
          "group",
          group.symbol,
          group.left ?? null,
          group.right ?? null,
          group.direction ?? null,
          group.span ?? null,
          group.label ?? null,
          group.legend ?? null
        ]);
        add(key, { kind: "group", group });
        continue;
      }
      const cell = getCell(chart, row, col);
      if (cell) add(`cell:${cell}`, { kind: "cell", symbol: cell });
    }
  }
  // A chart made only of knit stitches still needs an explanation of what an
  // empty cell means on paper. Add it only when no symbol/group entry exists.
  if (!entries.some((entry) => entry.kind === "cell" || entry.kind === "group")) {
    entries.unshift({ kind: "blank" });
  }
  for (const color of chart.palette) {
    if (usedColors.has(color.id)) add(`color:${color.id}`, { kind: "color", color });
  }
  return entries;
}
