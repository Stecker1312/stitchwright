/**
 * Validation for the `strickschrift/1` format.
 *
 * The same rules run in the browser and in the CLI. Diagnostics are data, not
 * exceptions: callers can show all problems at once and point at the exact
 * path in the JSON document.
 *
 * `raw: true` accepts the optional fields of the file format before
 * normalization. The normal call expects a normalized chart.
 */

import { hasSymbol, isGroupSymbol, symbolSpan } from "./symbols.js";
import { MAX_SIZE, MIN_SIZE, SCHEMA } from "./chart.js";

const HEX = /^#[0-9a-f]{6}$/i;
const PAPERS = new Set(["A4", "A3", "Letter", "auto"]);
const KNOWN_TOP_LEVEL = new Set([
  "schema", "id", "title", "width", "height", "rows", "colors", "groups",
  "palette", "options", "meta"
]);
const MAX_GROUPS = 10000;
const MAX_PALETTE = 256;
const MAX_DIAGNOSTICS = 500;

function isInteger(value) {
  return Number.isInteger(value);
}

function checkSize(value, name, add) {
  if (!isInteger(value) || value < MIN_SIZE || value > MAX_SIZE) {
    add("error", "E_SIZE", name, `${name} must be a whole number between ${MIN_SIZE} and ${MAX_SIZE}`);
    return false;
  }
  return true;
}

/**
 * Validate a chart. Returns an array of diagnostics.
 * `strict` turns unknown top-level keys into errors.
 * `raw` allows optional fields that normalization would fill in.
 */
export function validateChart(chart, { strict = false, raw = false } = {}) {
  const diagnostics = [];
  const add = (severity, code, path, message) => {
    if (diagnostics.length < MAX_DIAGNOSTICS) {
      diagnostics.push({ severity, code, path, message });
    } else if (diagnostics.length === MAX_DIAGNOSTICS) {
      diagnostics.push({
        severity: "warning",
        code: "W_DIAGNOSTICS_LIMIT",
        path: "$",
        message: "Further diagnostics were omitted."
      });
    }
  };
  const error = (code, path, message) => add("error", code, path, message);
  const warning = (code, path, message) => add("warning", code, path, message);

  if (!chart || typeof chart !== "object" || Array.isArray(chart)) {
    error("E_OBJECT", "$", "The chart must be a JSON object");
    return diagnostics;
  }

  for (const key of Object.keys(chart)) {
    if (!KNOWN_TOP_LEVEL.has(key)) {
      add(strict ? "error" : "warning", "W_UNKNOWN_KEY", key, `Unknown field: ${key}`);
    }
  }

  if (chart.schema !== SCHEMA) {
    error("E_SCHEMA", "schema", `Expected "${SCHEMA}"`);
  }

  const widthOk = checkSize(chart.width, "width", add);
  const heightOk = checkSize(chart.height, "height", add);
  const width = widthOk ? chart.width : 0;
  const height = heightOk ? chart.height : 0;

  if (chart.title !== undefined && typeof chart.title !== "string") {
    error("E_TITLE", "title", "title must be a string");
  } else if (typeof chart.title === "string" && chart.title.length > 120) {
    error("E_TITLE", "title", "title must be at most 120 characters");
  } else if (!raw && typeof chart.title !== "string") {
    error("E_TITLE", "title", "title must be a string");
  }
  if (chart.id !== undefined && (typeof chart.id !== "string" || !chart.id)) {
    error("E_ID", "id", "id must be a non-empty string");
  } else if (!raw && (typeof chart.id !== "string" || !chart.id)) {
    error("E_ID", "id", "id must be a non-empty string");
  }

  // Rows
  if (!Array.isArray(chart.rows)) {
    error("E_ROWS", "rows", "rows must be an array");
  } else if (chart.rows.length > MAX_SIZE) {
    error("E_ROWS_LENGTH", "rows", `rows has more than ${MAX_SIZE} entries`);
  } else {
    if (heightOk && chart.rows.length !== height) {
      error("E_ROWS_LENGTH", "rows", `rows has ${chart.rows.length} rows, expected ${height}`);
    }
    chart.rows.forEach((row, rowIndex) => {
      if (!Array.isArray(row)) {
        error("E_ROW", `rows[${rowIndex}]`, "Row must be an array");
        return;
      }
      if (row.length > MAX_SIZE) {
        error("E_ROW_LENGTH", `rows[${rowIndex}]`, `Row has more than ${MAX_SIZE} cells`);
        return;
      }
      if (widthOk && row.length !== width) {
        error("E_ROW_LENGTH", `rows[${rowIndex}]`, `Row has ${row.length} cells, expected ${width}`);
      }
      const cells = Math.min(row.length, width || row.length);
      for (let col = 0; col < cells; col += 1) {
        const cell = row[col];
        if (cell === null) continue;
        if (typeof cell !== "string" || !hasSymbol(cell)) {
          error("E_CELL_SYMBOL", `rows[${rowIndex}][${col}]`, `Unknown symbol: ${String(cell)}`);
          continue;
        }
        if (isGroupSymbol(cell)) {
          error("E_CELL_GROUP", `rows[${rowIndex}][${col}]`, `Symbol ${cell} must be placed as a group`);
        }
      }
    });
  }

  // Colours are optional in raw files and required after normalization.
  const colors = chart.colors;
  if (colors === undefined && raw) {
    // Normalization fills an empty matrix.
  } else if (!Array.isArray(colors)) {
    error("E_COLORS", "colors", "colors must be an array");
  } else if (colors.length > MAX_SIZE) {
    error("E_COLORS_LENGTH", "colors", `colors has more than ${MAX_SIZE} entries`);
  } else {
    if (heightOk && colors.length !== height) {
      error("E_COLORS_LENGTH", "colors", `colors has ${colors.length} rows, expected ${height}`);
    }
    colors.forEach((row, rowIndex) => {
      if (!Array.isArray(row)) {
        error("E_COLOR_ROW", `colors[${rowIndex}]`, "Colour row must be an array");
        return;
      }
      if (row.length > MAX_SIZE) {
        error("E_COLOR_ROW_LENGTH", `colors[${rowIndex}]`, `Colour row has more than ${MAX_SIZE} cells`);
        return;
      }
      if (widthOk && row.length !== width) {
        error("E_COLOR_ROW_LENGTH", `colors[${rowIndex}]`, `Colour row has ${row.length} cells, expected ${width}`);
      }
      const cells = Math.min(row.length, width || row.length);
      for (let col = 0; col < cells; col += 1) {
        const color = row[col];
        if (color !== null && typeof color !== "string") {
          error("E_COLOR_ID", `colors[${rowIndex}][${col}]`, `Unknown colour: ${String(color)}`);
        }
      }
    });
  }

  // Palette
  const palette = chart.palette;
  const paletteIds = new Set();
  if (palette === undefined && raw) {
    // Normalization fills the default palette.
  } else if (!Array.isArray(palette) || palette.length === 0) {
    error("E_PALETTE", "palette", "palette must have at least one entry");
  } else if (palette.length > MAX_PALETTE) {
    error("E_PALETTE", "palette", `palette has more than ${MAX_PALETTE} entries`);
  } else {
    palette.forEach((entry, index) => {
      const path = `palette[${index}]`;
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        error("E_PALETTE_ENTRY", path, "Palette entry must be an object");
        return;
      }
      if (typeof entry.id !== "string" || !entry.id) {
        error("E_PALETTE_ID", `${path}.id`, "Palette id is missing");
      } else if (paletteIds.has(entry.id)) {
        error("E_PALETTE_DUPLICATE", `${path}.id`, `Duplicate palette id: ${entry.id}`);
      } else {
        paletteIds.add(entry.id);
      }
      if (typeof entry.name !== "string") {
        error("E_PALETTE_NAME", `${path}.name`, "Palette name must be a string");
      }
      if (typeof entry.hex !== "string" || !HEX.test(entry.hex)) {
        error("E_PALETTE_HEX", `${path}.hex`, "Colour must use the form #rrggbb");
      }
    });
  }

  // Unknown colour ids can only be judged once the palette is known.
  if (Array.isArray(colors) && Array.isArray(palette)) {
    colors.forEach((row, rowIndex) => {
      if (!Array.isArray(row)) return;
      row.forEach((color, colIndex) => {
        if (color !== null && typeof color === "string" && !paletteIds.has(color)) {
          error("E_COLOR_ID", `colors[${rowIndex}][${colIndex}]`, `Unknown colour: ${color}`);
        }
      });
    });
  }

  // Groups
  const occupied = new Set();
  const groups = chart.groups;
  if (groups === undefined && raw) {
    // Normalization fills an empty list.
  } else if (!Array.isArray(groups)) {
    error("E_GROUPS", "groups", "groups must be an array");
  } else if (groups.length > MAX_GROUPS) {
    error("E_GROUPS", "groups", `groups has more than ${MAX_GROUPS} entries`);
  } else {
    const groupIds = new Set();
    groups.forEach((group, index) => {
      const path = `groups[${index}]`;
      if (!group || typeof group !== "object" || Array.isArray(group)) {
        error("E_GROUP", path, "Group must be an object");
        return;
      }
      if (typeof group.id !== "string" || !group.id) {
        error("E_GROUP_ID", `${path}.id`, "Group id is missing");
      } else if (groupIds.has(group.id)) {
        error("E_GROUP_DUPLICATE", `${path}.id`, `Duplicate group id: ${group.id}`);
      } else {
        groupIds.add(group.id);
      }

      if (typeof group.symbol !== "string" || !hasSymbol(group.symbol)) {
        error("E_GROUP_SYMBOL", `${path}.symbol`, `Unknown symbol: ${String(group.symbol)}`);
        return;
      }
      if (!isGroupSymbol(group.symbol)) {
        error("E_GROUP_SYMBOL", `${path}.symbol`, `${group.symbol} is not a group symbol`);
        return;
      }

      if (!isInteger(group.row) || group.row < 1 || (heightOk && group.row > height)) {
        error("E_GROUP_ROW", `${path}.row`, "Group row is outside the chart");
        return;
      }
      if (!isInteger(group.col) || group.col < 1 || (widthOk && group.col > width)) {
        error("E_GROUP_COL", `${path}.col`, "Group column is outside the chart");
        return;
      }

      let span;
      try {
        span = symbolSpan(group.symbol, group);
      } catch (err) {
        error("E_GROUP_SPAN", path, err.message);
        return;
      }
      if (!isInteger(span) || span < 1) {
        error("E_GROUP_SPAN", `${path}.span`, "Span must be positive");
        return;
      }
      if (widthOk && group.col + span - 1 > width) {
        error("E_GROUP_BOUNDS", path, "Group extends past the right edge");
      }

      if (group.symbol === "cable") {
        if (!isInteger(group.left) || group.left < 1) {
          error("E_CABLE_LEFT", `${path}.left`, "Cable left side must be positive");
        }
        if (!isInteger(group.right) || group.right < 1) {
          error("E_CABLE_RIGHT", `${path}.right`, "Cable right side must be positive");
        }
        if (group.direction !== "front" && group.direction !== "back") {
          error("E_CABLE_DIRECTION", `${path}.direction`, "Cable direction must be front or back");
        }
      }
      if (group.symbol === "custom") {
        if (typeof group.label !== "string" || !group.label) {
          error("E_CUSTOM_LABEL", `${path}.label`, "Custom group needs a label");
        }
        if (!isInteger(group.span) || group.span < 1) {
          error("E_CUSTOM_SPAN", `${path}.span`, "Custom group needs a positive span");
        }
        if (group.legend !== undefined && typeof group.legend !== "string") {
          error("E_CUSTOM_LEGEND", `${path}.legend`, "Legend note must be a string");
        }
        if (typeof group.legend === "string" && group.legend.length > 160) {
          error("E_CUSTOM_LEGEND_LENGTH", `${path}.legend`, "Legend note is too long (160 characters at most)");
        }
      }

      for (let offset = 0; offset < span; offset += 1) {
        const col = group.col + offset;
        if (col > width) break;
        const key = `${group.row}:${col}`;
        if (occupied.has(key)) {
          error("E_GROUP_OVERLAP", path, `Group overlaps another group at ${group.row}:${col}`);
        }
        occupied.add(key);
        if (Array.isArray(chart.rows?.[group.row - 1]) && chart.rows[group.row - 1][col - 1] !== null) {
          error("E_GROUP_CELL", path, `Cell ${group.row}:${col} under the group is not empty`);
        }
      }
    });
  }

  // Options
  const options = chart.options;
  if (options === undefined && raw) {
    // Normalization fills the defaults.
  } else if (!options || typeof options !== "object" || Array.isArray(options)) {
    error("E_OPTIONS", "options", "options must be an object");
  } else {
    const given = (key) => !raw || Object.hasOwn(options, key);
    if (given("rowsMode") && options.rowsMode !== "all" && options.rowsMode !== "rs") {
      error("E_ROWS_MODE", "options.rowsMode", "rowsMode must be all or rs");
    }
    for (const key of ["showRowNumbers", "showStitchNumbers", "showLegend"]) {
      if (given(key) && typeof options[key] !== "boolean") {
        error("E_OPTION_BOOL", `options.${key}`, `${key} must be true or false`);
      }
    }
    if (given("repeat") && options.repeat !== null) {
      if (!options.repeat || typeof options.repeat !== "object" || Array.isArray(options.repeat)) {
        error("E_REPEAT", "options.repeat", "repeat must be null or an object");
      } else {
        const { start, end } = options.repeat;
        if (!isInteger(start) || !isInteger(end) || start < 1 || end > width || start > end) {
          error("E_REPEAT_RANGE", "options.repeat", "Repeat is outside the chart");
        }
      }
    }
    if (given("cellMm") && (typeof options.cellMm !== "number" || !Number.isFinite(options.cellMm) || options.cellMm < 2 || options.cellMm > 20)) {
      error("E_CELL_MM", "options.cellMm", "cellMm must be between 2 and 20");
    }
    if (given("paper") && !PAPERS.has(options.paper)) {
      error("E_PAPER", "options.paper", "Unknown paper size");
    }
    if (given("subtitle") && typeof options.subtitle !== "string") {
      error("E_SUBTITLE", "options.subtitle", "subtitle must be a string");
    } else if (given("subtitle") && options.subtitle.length > 120) {
      error("E_SUBTITLE", "options.subtitle", "subtitle must be at most 120 characters");
    }
    if (given("markers") && !Array.isArray(options.markers)) {
      error("E_MARKERS", "options.markers", "markers must be an array");
    } else if (Array.isArray(options.markers)) {
      const seenMarkers = new Set();
      options.markers.forEach((marker, index) => {
        if (!isInteger(marker) || marker < 1 || (widthOk && marker >= width)) {
          error("E_MARKER", `options.markers[${index}]`, "Marker is outside the chart");
        } else if (seenMarkers.has(marker)) {
          error("E_MARKER_DUPLICATE", `options.markers[${index}]`, "Marker is duplicated");
        } else {
          seenMarkers.add(marker);
        }
      });
    }
  }

  if (chart.meta !== undefined && (typeof chart.meta !== "object" || Array.isArray(chart.meta))) {
    error("E_META", "meta", "meta must be an object");
  }

  // Helpful warnings, not correctness problems.
  const hasContent = (Array.isArray(chart.rows) ? chart.rows : []).some((row) => (
    Array.isArray(row) && row.some((cell) => cell !== null)
  ))
    || (Array.isArray(groups) && groups.length > 0)
    || (Array.isArray(colors) && colors.some((row) => row?.some?.((color) => color !== null)));
  if (!hasContent) {
    warning("W_EMPTY", "$", "The chart is still empty");
  }

  if (options?.rowsMode === "rs" && Array.isArray(chart.rows)) {
    const evenHasContent = chart.rows.some((row, index) => {
      if (index % 2 === 0) return false; // row 2, 4, ... are odd array indices
      return row?.some?.((cell) => cell !== null)
        || chart.colors?.[index]?.some?.((color) => color !== null);
    });
    const evenHasGroup = Array.isArray(groups) && groups.some((group) => (
      isInteger(group?.row) && group.row >= 1 && group.row <= height && group.row % 2 === 0
    ));
    if (evenHasContent || evenHasGroup) {
      warning("W_HIDDEN_WS", "options.rowsMode", "Wrong-side rows contain patterning but are hidden");
    }
  }

  return diagnostics;
}

/** True when at least one diagnostic is an error. */
export function hasErrors(diagnostics) {
  return diagnostics.some((item) => item.severity === "error");
}

/** Throw a readable error for callers that cannot continue. */
export function assertValid(chart, options = {}) {
  const diagnostics = validateChart(chart, options);
  if (hasErrors(diagnostics)) {
    const text = diagnostics
      .filter((item) => item.severity === "error")
      .map((item) => `${item.path}: ${item.message}`)
      .join("\n");
    const err = new Error(text);
    err.diagnostics = diagnostics;
    throw err;
  }
  return diagnostics;
}
