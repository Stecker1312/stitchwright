/**
 * Validation for the `strickschrift/1` format.
 *
 * The same rules run in the browser and in the CLI. Diagnostics are data, not
 * exceptions: callers can show all problems at once and point at the exact
 * path in the JSON document.
 */

import { getSymbol, isGroupSymbol, symbolSpan, SYMBOLS } from "./symbols.js";
import { MAX_SIZE, MIN_SIZE, SCHEMA } from "./chart.js";

const HEX = /^#[0-9a-f]{6}$/i;
const PAPERS = new Set(["A4", "A3", "Letter", "auto"]);
const KNOWN_TOP_LEVEL = new Set([
  "schema", "id", "title", "width", "height", "rows", "colors", "groups",
  "palette", "options", "meta"
]);

function error(code, path, message) {
  return { severity: "error", code, path, message };
}

function warning(code, path, message) {
  return { severity: "warning", code, path, message };
}

function isInteger(value) {
  return Number.isInteger(value);
}

function checkSize(value, name, diagnostics) {
  if (!isInteger(value) || value < MIN_SIZE || value > MAX_SIZE) {
    diagnostics.push(error("E_SIZE", name, `${name} must be a whole number between ${MIN_SIZE} and ${MAX_SIZE}`));
    return false;
  }
  return true;
}

/**
 * Validate a normalized chart. Returns an array of diagnostics.
 * `strict` turns unknown top-level keys into errors.
 */
export function validateChart(chart, { strict = false } = {}) {
  const diagnostics = [];
  if (!chart || typeof chart !== "object" || Array.isArray(chart)) {
    return [error("E_OBJECT", "$", "The chart must be a JSON object")];
  }

  for (const key of Object.keys(chart)) {
    if (!KNOWN_TOP_LEVEL.has(key)) {
      diagnostics.push((strict ? error : warning)("W_UNKNOWN_KEY", key, `Unknown field: ${key}`));
    }
  }

  if (chart.schema !== SCHEMA) {
    diagnostics.push(error("E_SCHEMA", "schema", `Expected "${SCHEMA}"`));
  }

  const widthOk = checkSize(chart.width, "width", diagnostics);
  const heightOk = checkSize(chart.height, "height", diagnostics);
  const width = widthOk ? chart.width : 0;
  const height = heightOk ? chart.height : 0;

  if (typeof chart.title !== "string") {
    diagnostics.push(error("E_TITLE", "title", "title must be a string"));
  }
  if (typeof chart.id !== "string" || !chart.id) {
    diagnostics.push(error("E_ID", "id", "id must be a non-empty string"));
  }

  // Rows
  if (!Array.isArray(chart.rows)) {
    diagnostics.push(error("E_ROWS", "rows", "rows must be an array"));
  } else {
    if (heightOk && chart.rows.length !== height) {
      diagnostics.push(error("E_ROWS_LENGTH", "rows", `rows has ${chart.rows.length} rows, expected ${height}`));
    }
    chart.rows.forEach((row, rowIndex) => {
      if (!Array.isArray(row)) {
        diagnostics.push(error("E_ROW", `rows[${rowIndex}]`, "Row must be an array"));
        return;
      }
      if (widthOk && row.length !== width) {
        diagnostics.push(error("E_ROW_LENGTH", `rows[${rowIndex}]`, `Row has ${row.length} cells, expected ${width}`));
      }
      row.forEach((cell, colIndex) => {
        if (cell === null) return;
        if (typeof cell !== "string" || !SYMBOLS[cell]) {
          diagnostics.push(error("E_CELL_SYMBOL", `rows[${rowIndex}][${colIndex}]`, `Unknown symbol: ${String(cell)}`));
          return;
        }
        if (isGroupSymbol(cell)) {
          diagnostics.push(error("E_CELL_GROUP", `rows[${rowIndex}][${colIndex}]`, `Symbol ${cell} must be placed as a group`));
        }
      });
    });
  }

  // Palette before colours, because colours reference palette ids.
  const paletteIds = new Set();
  if (!Array.isArray(chart.palette) || chart.palette.length === 0) {
    diagnostics.push(error("E_PALETTE", "palette", "palette must have at least one entry"));
  } else {
    chart.palette.forEach((entry, index) => {
      const path = `palette[${index}]`;
      if (!entry || typeof entry !== "object") {
        diagnostics.push(error("E_PALETTE_ENTRY", path, "Palette entry must be an object"));
        return;
      }
      if (typeof entry.id !== "string" || !entry.id) {
        diagnostics.push(error("E_PALETTE_ID", `${path}.id`, "Palette id is missing"));
      } else if (paletteIds.has(entry.id)) {
        diagnostics.push(error("E_PALETTE_DUPLICATE", `${path}.id`, `Duplicate palette id: ${entry.id}`));
      } else {
        paletteIds.add(entry.id);
      }
      if (typeof entry.name !== "string") {
        diagnostics.push(error("E_PALETTE_NAME", `${path}.name`, "Palette name must be a string"));
      }
      if (typeof entry.hex !== "string" || !HEX.test(entry.hex)) {
        diagnostics.push(error("E_PALETTE_HEX", `${path}.hex`, "Colour must use the form #rrggbb"));
      }
    });
  }

  // Colours
  if (!Array.isArray(chart.colors)) {
    diagnostics.push(error("E_COLORS", "colors", "colors must be an array"));
  } else {
    if (heightOk && chart.colors.length !== height) {
      diagnostics.push(error("E_COLORS_LENGTH", "colors", `colors has ${chart.colors.length} rows, expected ${height}`));
    }
    chart.colors.forEach((row, rowIndex) => {
      if (!Array.isArray(row)) {
        diagnostics.push(error("E_COLOR_ROW", `colors[${rowIndex}]`, "Colour row must be an array"));
        return;
      }
      if (widthOk && row.length !== width) {
        diagnostics.push(error("E_COLOR_ROW_LENGTH", `colors[${rowIndex}]`, `Colour row has ${row.length} cells, expected ${width}`));
      }
      row.forEach((color, colIndex) => {
        if (color === null) return;
        if (!paletteIds.has(color)) {
          diagnostics.push(error("E_COLOR_ID", `colors[${rowIndex}][${colIndex}]`, `Unknown colour: ${String(color)}`));
        }
      });
    });
  }

  // Groups
  const occupied = new Set();
  if (!Array.isArray(chart.groups)) {
    diagnostics.push(error("E_GROUPS", "groups", "groups must be an array"));
  } else {
    const groupIds = new Set();
    chart.groups.forEach((group, index) => {
      const path = `groups[${index}]`;
      if (!group || typeof group !== "object") {
        diagnostics.push(error("E_GROUP", path, "Group must be an object"));
        return;
      }
      if (typeof group.id !== "string" || !group.id) {
        diagnostics.push(error("E_GROUP_ID", `${path}.id`, "Group id is missing"));
      } else if (groupIds.has(group.id)) {
        diagnostics.push(error("E_GROUP_DUPLICATE", `${path}.id`, `Duplicate group id: ${group.id}`));
      } else {
        groupIds.add(group.id);
      }

      if (typeof group.symbol !== "string" || !SYMBOLS[group.symbol]) {
        diagnostics.push(error("E_GROUP_SYMBOL", `${path}.symbol`, `Unknown symbol: ${String(group.symbol)}`));
        return;
      }
      if (!isGroupSymbol(group.symbol)) {
        diagnostics.push(error("E_GROUP_SYMBOL", `${path}.symbol`, `${group.symbol} is not a group symbol`));
        return;
      }

      if (!isInteger(group.row) || group.row < 1 || (heightOk && group.row > height)) {
        diagnostics.push(error("E_GROUP_ROW", `${path}.row`, "Group row is outside the chart"));
        return;
      }
      if (!isInteger(group.col) || group.col < 1 || (widthOk && group.col > width)) {
        diagnostics.push(error("E_GROUP_COL", `${path}.col`, "Group column is outside the chart"));
        return;
      }

      let span;
      try {
        span = symbolSpan(group.symbol, group);
      } catch (err) {
        diagnostics.push(error("E_GROUP_SPAN", path, err.message));
        return;
      }
      if (!isInteger(span) || span < 1) {
        diagnostics.push(error("E_GROUP_SPAN", `${path}.span`, "Span must be positive"));
        return;
      }
      if (widthOk && group.col + span - 1 > width) {
        diagnostics.push(error("E_GROUP_BOUNDS", path, "Group extends past the right edge"));
      }

      if (group.symbol === "cable") {
        if (!isInteger(group.left) || group.left < 1) {
          diagnostics.push(error("E_CABLE_LEFT", `${path}.left`, "Cable left side must be positive"));
        }
        if (!isInteger(group.right) || group.right < 1) {
          diagnostics.push(error("E_CABLE_RIGHT", `${path}.right`, "Cable right side must be positive"));
        }
        if (group.direction !== "front" && group.direction !== "back") {
          diagnostics.push(error("E_CABLE_DIRECTION", `${path}.direction`, "Cable direction must be front or back"));
        }
      }
      if (group.symbol === "custom") {
        if (typeof group.label !== "string") {
          diagnostics.push(error("E_CUSTOM_LABEL", `${path}.label`, "Custom group needs a label"));
        }
        if (!isInteger(group.span) || group.span < 1) {
          diagnostics.push(error("E_CUSTOM_SPAN", `${path}.span`, "Custom group needs a positive span"));
        }
        if (group.legend !== undefined && typeof group.legend !== "string") {
          diagnostics.push(error("E_CUSTOM_LEGEND", `${path}.legend`, "Legend note must be a string"));
        }
        if (typeof group.legend === "string" && group.legend.length > 160) {
          diagnostics.push(error("E_CUSTOM_LEGEND_LENGTH", `${path}.legend`, "Legend note is too long (160 characters at most)"));
        }
      }

      // Cells under a group must be empty. The group is the symbol.
      for (let offset = 0; offset < span; offset += 1) {
        const col = group.col + offset;
        if (col > width) break;
        const key = `${group.row}:${col}`;
        if (occupied.has(key)) {
          diagnostics.push(error("E_GROUP_OVERLAP", path, `Group overlaps another group at ${group.row}:${col}`));
        }
        occupied.add(key);
        if (Array.isArray(chart.rows?.[group.row - 1]) && chart.rows[group.row - 1][col - 1] !== null) {
          diagnostics.push(error("E_GROUP_CELL", path, `Cell ${group.row}:${col} under the group is not empty`));
        }
      }
    });
  }

  // Options
  const options = chart.options;
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    diagnostics.push(error("E_OPTIONS", "options", "options must be an object"));
  } else {
    if (options.rowsMode !== "all" && options.rowsMode !== "rs") {
      diagnostics.push(error("E_ROWS_MODE", "options.rowsMode", "rowsMode must be all or rs"));
    }
    for (const key of ["showRowNumbers", "showStitchNumbers", "showLegend"]) {
      if (typeof options[key] !== "boolean") {
        diagnostics.push(error("E_OPTION_BOOL", `options.${key}`, `${key} must be true or false`));
      }
    }
    if (options.repeat !== null) {
      if (!options.repeat || typeof options.repeat !== "object") {
        diagnostics.push(error("E_REPEAT", "options.repeat", "repeat must be null or an object"));
      } else {
        const { start, end } = options.repeat;
        if (!isInteger(start) || !isInteger(end) || start < 1 || end > width || start > end) {
          diagnostics.push(error("E_REPEAT_RANGE", "options.repeat", "Repeat is outside the chart"));
        }
      }
    }
    if (typeof options.cellMm !== "number" || options.cellMm < 2 || options.cellMm > 20) {
      diagnostics.push(error("E_CELL_MM", "options.cellMm", "cellMm must be between 2 and 20"));
    }
    if (!PAPERS.has(options.paper)) {
      diagnostics.push(error("E_PAPER", "options.paper", "Unknown paper size"));
    }
    if (typeof options.subtitle !== "string") {
      diagnostics.push(error("E_SUBTITLE", "options.subtitle", "subtitle must be a string"));
    }
    if (!Array.isArray(options.markers)) {
      diagnostics.push(error("E_MARKERS", "options.markers", "markers must be an array"));
    } else {
      const seenMarkers = new Set();
      options.markers.forEach((marker, index) => {
        if (!isInteger(marker) || marker < 1 || (widthOk && marker >= width)) {
          diagnostics.push(error("E_MARKER", `options.markers[${index}]`, "Marker is outside the chart"));
        } else if (seenMarkers.has(marker)) {
          diagnostics.push(error("E_MARKER_DUPLICATE", `options.markers[${index}]`, "Marker is duplicated"));
        } else {
          seenMarkers.add(marker);
        }
      });
    }
  }

  // Helpful warnings, not correctness problems.
  const hasContent = (chart.rows || []).some((row) => row?.some((cell) => cell !== null))
    || (chart.groups || []).length > 0
    || (chart.colors || []).some((row) => row?.some((color) => color !== null));
  if (!hasContent) {
    diagnostics.push(warning("W_EMPTY", "$", "The chart is still empty"));
  }

  if (options?.rowsMode === "rs" && Array.isArray(chart.rows)) {
    const evenHasContent = chart.rows.some((row, index) => {
      if (index % 2 === 0) return false; // row 2, 4, ... are odd array indices
      return row?.some((cell) => cell !== null)
        || chart.colors?.[index]?.some((color) => color !== null);
    });
    if (evenHasContent) {
      diagnostics.push(warning("W_HIDDEN_WS", "options.rowsMode", "Wrong-side rows contain patterning but are hidden"));
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
