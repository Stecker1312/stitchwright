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
    diagnostics.push(error("E_SIZE", name, `${name} muss eine ganze Zahl zwischen ${MIN_SIZE} und ${MAX_SIZE} sein`));
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
    return [error("E_OBJECT", "$", "Chart muss ein JSON-Objekt sein")];
  }

  for (const key of Object.keys(chart)) {
    if (!KNOWN_TOP_LEVEL.has(key)) {
      diagnostics.push((strict ? error : warning)("W_UNKNOWN_KEY", key, `Unbekanntes Feld: ${key}`));
    }
  }

  if (chart.schema !== SCHEMA) {
    diagnostics.push(error("E_SCHEMA", "schema", `Erwartet wird "${SCHEMA}"`));
  }

  const widthOk = checkSize(chart.width, "width", diagnostics);
  const heightOk = checkSize(chart.height, "height", diagnostics);
  const width = widthOk ? chart.width : 0;
  const height = heightOk ? chart.height : 0;

  if (typeof chart.title !== "string") {
    diagnostics.push(error("E_TITLE", "title", "title muss ein String sein"));
  }
  if (typeof chart.id !== "string" || !chart.id) {
    diagnostics.push(error("E_ID", "id", "id muss ein nicht-leerer String sein"));
  }

  // Rows
  if (!Array.isArray(chart.rows)) {
    diagnostics.push(error("E_ROWS", "rows", "rows muss ein Array sein"));
  } else {
    if (heightOk && chart.rows.length !== height) {
      diagnostics.push(error("E_ROWS_LENGTH", "rows", `rows hat ${chart.rows.length} Zeilen, erwartet ${height}`));
    }
    chart.rows.forEach((row, rowIndex) => {
      if (!Array.isArray(row)) {
        diagnostics.push(error("E_ROW", `rows[${rowIndex}]`, "Zeile muss ein Array sein"));
        return;
      }
      if (widthOk && row.length !== width) {
        diagnostics.push(error("E_ROW_LENGTH", `rows[${rowIndex}]`, `Zeile hat ${row.length} Zellen, erwartet ${width}`));
      }
      row.forEach((cell, colIndex) => {
        if (cell === null) return;
        if (typeof cell !== "string" || !SYMBOLS[cell]) {
          diagnostics.push(error("E_CELL_SYMBOL", `rows[${rowIndex}][${colIndex}]`, `Unbekanntes Symbol: ${String(cell)}`));
          return;
        }
        if (isGroupSymbol(cell)) {
          diagnostics.push(error("E_CELL_GROUP", `rows[${rowIndex}][${colIndex}]`, `Symbol ${cell} muss als Gruppe angelegt werden`));
        }
      });
    });
  }

  // Palette before colours, because colours reference palette ids.
  const paletteIds = new Set();
  if (!Array.isArray(chart.palette) || chart.palette.length === 0) {
    diagnostics.push(error("E_PALETTE", "palette", "palette muss mindestens einen Eintrag haben"));
  } else {
    chart.palette.forEach((entry, index) => {
      const path = `palette[${index}]`;
      if (!entry || typeof entry !== "object") {
        diagnostics.push(error("E_PALETTE_ENTRY", path, "Paletteneintrag muss ein Objekt sein"));
        return;
      }
      if (typeof entry.id !== "string" || !entry.id) {
        diagnostics.push(error("E_PALETTE_ID", `${path}.id`, "Paletten-ID fehlt"));
      } else if (paletteIds.has(entry.id)) {
        diagnostics.push(error("E_PALETTE_DUPLICATE", `${path}.id`, `Doppelte Paletten-ID: ${entry.id}`));
      } else {
        paletteIds.add(entry.id);
      }
      if (typeof entry.name !== "string") {
        diagnostics.push(error("E_PALETTE_NAME", `${path}.name`, "Palettenname muss ein String sein"));
      }
      if (typeof entry.hex !== "string" || !HEX.test(entry.hex)) {
        diagnostics.push(error("E_PALETTE_HEX", `${path}.hex`, "Farbe muss die Form #rrggbb haben"));
      }
    });
  }

  // Colours
  if (!Array.isArray(chart.colors)) {
    diagnostics.push(error("E_COLORS", "colors", "colors muss ein Array sein"));
  } else {
    if (heightOk && chart.colors.length !== height) {
      diagnostics.push(error("E_COLORS_LENGTH", "colors", `colors hat ${chart.colors.length} Zeilen, erwartet ${height}`));
    }
    chart.colors.forEach((row, rowIndex) => {
      if (!Array.isArray(row)) {
        diagnostics.push(error("E_COLOR_ROW", `colors[${rowIndex}]`, "Farbzeile muss ein Array sein"));
        return;
      }
      if (widthOk && row.length !== width) {
        diagnostics.push(error("E_COLOR_ROW_LENGTH", `colors[${rowIndex}]`, `Farbzeile hat ${row.length} Zellen, erwartet ${width}`));
      }
      row.forEach((color, colIndex) => {
        if (color === null) return;
        if (!paletteIds.has(color)) {
          diagnostics.push(error("E_COLOR_ID", `colors[${rowIndex}][${colIndex}]`, `Unbekannte Farbe: ${String(color)}`));
        }
      });
    });
  }

  // Groups
  const occupied = new Set();
  if (!Array.isArray(chart.groups)) {
    diagnostics.push(error("E_GROUPS", "groups", "groups muss ein Array sein"));
  } else {
    const groupIds = new Set();
    chart.groups.forEach((group, index) => {
      const path = `groups[${index}]`;
      if (!group || typeof group !== "object") {
        diagnostics.push(error("E_GROUP", path, "Gruppe muss ein Objekt sein"));
        return;
      }
      if (typeof group.id !== "string" || !group.id) {
        diagnostics.push(error("E_GROUP_ID", `${path}.id`, "Gruppen-ID fehlt"));
      } else if (groupIds.has(group.id)) {
        diagnostics.push(error("E_GROUP_DUPLICATE", `${path}.id`, `Doppelte Gruppen-ID: ${group.id}`));
      } else {
        groupIds.add(group.id);
      }

      if (typeof group.symbol !== "string" || !SYMBOLS[group.symbol]) {
        diagnostics.push(error("E_GROUP_SYMBOL", `${path}.symbol`, `Unbekanntes Symbol: ${String(group.symbol)}`));
        return;
      }
      if (!isGroupSymbol(group.symbol)) {
        diagnostics.push(error("E_GROUP_SYMBOL", `${path}.symbol`, `${group.symbol} ist kein Gruppensymbol`));
        return;
      }

      if (!isInteger(group.row) || group.row < 1 || (heightOk && group.row > height)) {
        diagnostics.push(error("E_GROUP_ROW", `${path}.row`, "Gruppenreihe liegt außerhalb des Rasters"));
        return;
      }
      if (!isInteger(group.col) || group.col < 1 || (widthOk && group.col > width)) {
        diagnostics.push(error("E_GROUP_COL", `${path}.col`, "Gruppenspalte liegt außerhalb des Rasters"));
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
        diagnostics.push(error("E_GROUP_SPAN", `${path}.span`, "Spannweite muss positiv sein"));
        return;
      }
      if (widthOk && group.col + span - 1 > width) {
        diagnostics.push(error("E_GROUP_BOUNDS", path, "Gruppe ragt über den rechten Rand"));
      }

      if (group.symbol === "cable") {
        if (!isInteger(group.left) || group.left < 1) {
          diagnostics.push(error("E_CABLE_LEFT", `${path}.left`, "Zopf-linke Seite muss positiv sein"));
        }
        if (!isInteger(group.right) || group.right < 1) {
          diagnostics.push(error("E_CABLE_RIGHT", `${path}.right`, "Zopf-rechte Seite muss positiv sein"));
        }
        if (group.direction !== "front" && group.direction !== "back") {
          diagnostics.push(error("E_CABLE_DIRECTION", `${path}.direction`, "Zopfrichtung muss front oder back sein"));
        }
      }
      if (group.symbol === "custom") {
        if (typeof group.label !== "string") {
          diagnostics.push(error("E_CUSTOM_LABEL", `${path}.label`, "Eigene Gruppe braucht ein Label"));
        }
        if (!isInteger(group.span) || group.span < 1) {
          diagnostics.push(error("E_CUSTOM_SPAN", `${path}.span`, "Eigene Gruppe braucht eine positive Spannweite"));
        }
      }

      // Cells under a group must be empty. The group is the symbol.
      for (let offset = 0; offset < span; offset += 1) {
        const col = group.col + offset;
        if (col > width) break;
        const key = `${group.row}:${col}`;
        if (occupied.has(key)) {
          diagnostics.push(error("E_GROUP_OVERLAP", path, `Gruppe überlappt eine andere Gruppe bei ${group.row}:${col}`));
        }
        occupied.add(key);
        if (Array.isArray(chart.rows?.[group.row - 1]) && chart.rows[group.row - 1][col - 1] !== null) {
          diagnostics.push(error("E_GROUP_CELL", path, `Zelle ${group.row}:${col} unter der Gruppe ist nicht leer`));
        }
      }
    });
  }

  // Options
  const options = chart.options;
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    diagnostics.push(error("E_OPTIONS", "options", "options muss ein Objekt sein"));
  } else {
    if (options.rowsMode !== "all" && options.rowsMode !== "rs") {
      diagnostics.push(error("E_ROWS_MODE", "options.rowsMode", "rowsMode muss all oder rs sein"));
    }
    for (const key of ["showRowNumbers", "showStitchNumbers", "showLegend"]) {
      if (typeof options[key] !== "boolean") {
        diagnostics.push(error("E_OPTION_BOOL", `options.${key}`, `${key} muss boolean sein`));
      }
    }
    if (options.repeat !== null) {
      if (!options.repeat || typeof options.repeat !== "object") {
        diagnostics.push(error("E_REPEAT", "options.repeat", "repeat muss null oder ein Objekt sein"));
      } else {
        const { start, end } = options.repeat;
        if (!isInteger(start) || !isInteger(end) || start < 1 || end > width || start > end) {
          diagnostics.push(error("E_REPEAT_RANGE", "options.repeat", "Rapport liegt außerhalb des Rasters"));
        }
      }
    }
    if (typeof options.cellMm !== "number" || options.cellMm < 2 || options.cellMm > 20) {
      diagnostics.push(error("E_CELL_MM", "options.cellMm", "cellMm muss zwischen 2 und 20 liegen"));
    }
    if (!PAPERS.has(options.paper)) {
      diagnostics.push(error("E_PAPER", "options.paper", "Unbekanntes Papierformat"));
    }
    if (typeof options.subtitle !== "string") {
      diagnostics.push(error("E_SUBTITLE", "options.subtitle", "subtitle muss ein String sein"));
    }
  }

  // Helpful warnings, not correctness problems.
  const hasContent = (chart.rows || []).some((row) => row?.some((cell) => cell !== null))
    || (chart.groups || []).length > 0
    || (chart.colors || []).some((row) => row?.some((color) => color !== null));
  if (!hasContent) {
    diagnostics.push(warning("W_EMPTY", "$", "Das Chart ist noch leer"));
  }

  if (options?.rowsMode === "rs" && Array.isArray(chart.rows)) {
    const evenHasContent = chart.rows.some((row, index) => {
      if (index % 2 === 0) return false; // row 2, 4, ... are odd array indices
      return row?.some((cell) => cell !== null)
        || chart.colors?.[index]?.some((color) => color !== null);
    });
    if (evenHasContent) {
      diagnostics.push(warning("W_HIDDEN_WS", "options.rowsMode", "Rückreihen enthalten Muster, sind aber ausgeblendet"));
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
