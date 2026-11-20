/**
 * SVG export.
 *
 * The SVG is the printable artefact. It is generated from the same model and
 * the same glyph primitives as the canvas editor, so what you see is what you
 * print. It uses no external fonts, images or styles: a single file is enough.
 */

import { getCell, getColor, groupSpan, visibleRows } from "./chart.js";
import { backgroundFor, contrastColor, groupBackground, groupContrast } from "./color.js";
import { legendEntries } from "./legend.js";
import { glyphFor } from "./symbols.js";
import { formatLength } from "./units.js";

const CELL = 24;
const MARGIN_LEFT = 44;
const MARGIN_RIGHT = 20;
const MARGIN_TOP = 56;
const MARGIN_BOTTOM = 38;
const LEGEND_ROW = 28;
const LEGEND_ICON = 34;

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function paintValue(value, color) {
  if (value === true) return color;
  if (value === false || value === undefined || value === null) return "none";
  return value;
}

/** Turn one glyph primitive into SVG. Coordinates are in cell units. */
function primitiveSvg(primitive, { color, background }) {
  const stroke = primitive.halo
    ? background
    : (primitive.stroke === false ? "none" : paintValue(primitive.stroke, color));
  const fill = primitive.halo ? "none" : paintValue(primitive.fill, color);
  const width = primitive.width ?? 0.09;
  const common = `stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" fill="${fill}"`;

  if (primitive.type === "line") {
    return `<line x1="${primitive.x1}" y1="${primitive.y1}" x2="${primitive.x2}" y2="${primitive.y2}" ${common}/>`;
  }
  if (primitive.type === "path") {
    return `<path d="${primitive.d}" ${common}/>`;
  }
  if (primitive.type === "circle") {
    return `<circle cx="${primitive.cx}" cy="${primitive.cy}" r="${primitive.r}" ${common}/>`;
  }
  if (primitive.type === "rect") {
    return `<rect x="${primitive.x}" y="${primitive.y}" width="${primitive.w}" height="${primitive.h}" rx="${primitive.rx || 0}" ${common}/>`;
  }
  if (primitive.type === "text") {
    return `<text x="${primitive.x}" y="${primitive.y}" font-family="system-ui, sans-serif" font-size="${primitive.size}" font-weight="${primitive.weight || 600}" text-anchor="${primitive.anchor || "middle"}" fill="${color}">${escapeXml(primitive.value)}</text>`;
  }
  return "";
}

/** A symbol definition that can be reused with <use>. */
function symbolDefinition(id) {
  const glyph = glyphFor(id);
  const body = glyph.map((primitive) => primitiveSvg(primitive, {
    color: "currentColor",
    background: "#ffffff"
  })).join("");
  return `<g id="sym-${id}">${body}</g>`;
}

/**
 * Render one glyph as a small standalone SVG, used by the palette and legend
 * previews. It uses the same primitives as the chart, so the preview cannot
 * drift away from the result.
 */
export function glyphToSvg(primitives, {
  span = 1,
  width = 36,
  height = 36,
  color = "#111111",
  background = "#ffffff"
} = {}) {
  const body = glyphMarkup(primitives, { color, background });
  // Multi-cell glyphs (cables) are wide and flat in the chart. In a small
  // square preview they would collapse into a line, so stretch them to fill
  // the icon. Single-cell symbols keep their aspect ratio.
  const aspect = span > 1 ? ' preserveAspectRatio="none"' : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${span} 1" width="${width}" height="${height}"${aspect} aria-hidden="true" focusable="false">${body}</svg>`;
}

function glyphMarkup(primitives, { color, background }) {
  return primitives.map((primitive) => primitiveSvg(primitive, { color, background })).join("");
}

function text(value, x, y, { size = 12, weight = 400, anchor = "start", fill = "#111111" } = {}) {
  return `<text x="${x}" y="${y}" font-family="system-ui, sans-serif" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" fill="${fill}">${escapeXml(value)}</text>`;
}

/** Conservative text width for layout without a browser text measurer. */
function approxTextWidth(value, size) {
  return String(value).length * size * 0.58;
}

/** Wrap a label into lines that fit the available character budget. */
function wrapText(value, maxChars) {
  const words = String(value).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

/**
 * Render a chart as a standalone SVG.
 *
 * @param {object} chart normalized chart
 * @param {object} [options]
 * @param {string} [options.lang] legend language
 * @param {string} [options.unit] "metric" or "imperial"
 * @param {boolean} [options.includeLegend] override chart option
 * @param {number} [options.cellPx] internal drawing unit; physical size comes from cellMm
 */
export function renderSvg(chart, {
  lang = "en",
  unit = "metric",
  includeLegend = null,
  cellPx = CELL
} = {}) {
  const rows = visibleRows(chart);
  const rowCount = rows.length;
  const chartX = MARGIN_LEFT;
  const chartY = MARGIN_TOP;
  const chartW = chart.width * cellPx;
  const chartH = rowCount * cellPx;
  const legendWanted = includeLegend === null
    ? chart.options?.showLegend !== false
    : Boolean(includeLegend);
  const legend = legendWanted ? legendEntries(chart, lang) : [];

  // Precompute the legend layout so the SVG width and height are correct.
  const maxEntryWidth = Math.max(
    0,
    ...legend.map((entry) => approxTextWidth(
      entry.kind === "color"
        ? `${entry.name}  ${entry.color.hex}`
        : `${entry.name} · ${entry.text}`,
      10
    ))
  );
  const columnWidth = Math.max(260, Math.min(520, maxEntryWidth + 62));
  const legendColumns = Math.max(1, Math.min(4, Math.floor(Math.max(chartW, columnWidth) / columnWidth)));
  const maxChars = Math.max(18, Math.floor((columnWidth - 50) / (10 * 0.58)));
  const legendLayout = legend.map((entry) => ({
    entry,
    lines: wrapText(
      entry.kind === "color"
        ? `${entry.name} · ${entry.color.hex}`
        : `${entry.name} · ${entry.text}`,
      maxChars
    )
  }));
  const maxLines = Math.max(1, ...legendLayout.map((item) => item.lines.length));
  const legendRows = legend.length ? Math.ceil(legend.length / legendColumns) : 0;
  const legendRowHeight = Math.max(LEGEND_ROW, 16 + maxLines * 12);
  const legendTop = chartY + chartH + MARGIN_BOTTOM + 18;
  const legendHeight = legend.length ? 22 + legendRows * legendRowHeight + 14 : 0;
  const titleWidth = Math.max(
    approxTextWidth(chart.title || "", 19),
    approxTextWidth(chart.options?.subtitle || "", 11)
  );
  const legendWidth = legend.length ? legendColumns * columnWidth : 0;
  const svgW = Math.max(
    chartW + MARGIN_LEFT + MARGIN_RIGHT,
    legendWidth + MARGIN_LEFT + MARGIN_RIGHT,
    titleWidth + MARGIN_LEFT + MARGIN_RIGHT
  );
  const svgH = legendTop + legendHeight + 10;

  const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${(svgW * (chart.options.cellMm / cellPx)).toFixed(2)}mm" height="${(svgH * (chart.options.cellMm / cellPx)).toFixed(2)}mm" viewBox="0 0 ${svgW} ${svgH}" role="img" aria-label="${escapeXml(chart.title || "Strickschrift")}">`);
  parts.push(`<title>${escapeXml(chart.title || "Strickschrift")}</title>`);
  parts.push(`<rect width="${svgW}" height="${svgH}" fill="#ffffff"/>`);

  // Title and subtitle
  parts.push(text(chart.title || "", chartX, 28, { size: 19, weight: 700 }));
  if (chart.options?.subtitle) {
    parts.push(text(chart.options.subtitle, chartX, 45, { size: 11, fill: "#666666" }));
  }

  // One definition per single-cell symbol used anywhere. The legend can
  // include symbols on hidden wrong-side rows, so scan the whole chart.
  const usedCells = new Set();
  for (let row = 1; row <= chart.height; row += 1) {
    for (let col = 1; col <= chart.width; col += 1) {
      const cell = getCell(chart, row, col);
      if (cell) usedCells.add(cell);
    }
  }
  if (usedCells.size) {
    parts.push("<defs>");
    for (const id of [...usedCells].sort()) parts.push(symbolDefinition(id));
    parts.push("</defs>");
  }

  // Colour fills, run-length encoded per row to keep large charts small.
  for (let visibleIndex = 0; visibleIndex < rowCount; visibleIndex += 1) {
    const row = rows[visibleIndex];
    const y = chartY + (rowCount - 1 - visibleIndex) * cellPx;
    let col = 1;
    while (col <= chart.width) {
      const colorId = getColor(chart, row, col);
      let end = col;
      while (end + 1 <= chart.width && getColor(chart, row, end + 1) === colorId) end += 1;
      if (colorId) {
        const hex = chart.palette.find((entry) => entry.id === colorId)?.hex || "#ffffff";
        const x = chartX + (col - 1) * cellPx;
        const width = (end - col + 1) * cellPx;
        parts.push(`<rect x="${x}" y="${y}" width="${width}" height="${cellPx}" fill="${hex}"/>`);
      }
      col = end + 1;
    }
    // "No stitch" is grey regardless of the colour layer: it is absence, not yarn.
    for (let c = 1; c <= chart.width; c += 1) {
      if (getCell(chart, row, c) === "nostitch") {
        parts.push(`<rect x="${chartX + (c - 1) * cellPx}" y="${y}" width="${cellPx}" height="${cellPx}" fill="#e6e6e6"/>`);
      }
    }
  }

  // Grid lines as one path. One element keeps huge charts responsive.
  const grid = [];
  for (let c = 0; c <= chart.width; c += 1) {
    const x = chartX + c * cellPx;
    grid.push(`M${x} ${chartY}V${chartY + chartH}`);
  }
  for (let r = 0; r <= rowCount; r += 1) {
    const y = chartY + r * cellPx;
    grid.push(`M${chartX} ${y}H${chartX + chartW}`);
  }
  parts.push(`<path d="${grid.join("")}" fill="none" stroke="#b8b8b8" stroke-width="0.7"/>`);
  parts.push(`<rect x="${chartX}" y="${chartY}" width="${chartW}" height="${chartH}" fill="none" stroke="#333333" stroke-width="1.3"/>`);

  // Repeat guide lines.
  const repeat = chart.options?.repeat;
  if (repeat) {
    const xs = [repeat.start - 1, repeat.end];
    for (const index of xs) {
      const x = chartX + index * cellPx;
      parts.push(`<line x1="${x}" y1="${chartY}" x2="${x}" y2="${chartY + chartH}" stroke="#c0392b" stroke-width="2"/>`);
    }
  }

  // Stitch markers: dashed guides, not part of the knitting key.
  for (const boundary of chart.options?.markers || []) {
    if (!Number.isInteger(boundary) || boundary < 1 || boundary >= chart.width) continue;
    const x = chartX + boundary * cellPx;
    parts.push(`<line x1="${x}" y1="${chartY}" x2="${x}" y2="${chartY + chartH}" stroke="#7c3aed" stroke-width="1.5" stroke-dasharray="4 4"/>`);
  }

  // Symbols in cells.
  for (let visibleIndex = 0; visibleIndex < rowCount; visibleIndex += 1) {
    const row = rows[visibleIndex];
    const y = chartY + (rowCount - 1 - visibleIndex) * cellPx;
    for (let col = 1; col <= chart.width; col += 1) {
      const cell = getCell(chart, row, col);
      if (!cell) continue;
      const x = chartX + (col - 1) * cellPx;
      const color = contrastColor(backgroundFor(chart, row, col));
      parts.push(`<use href="#sym-${cell}" transform="translate(${x} ${y}) scale(${cellPx})" color="${color}"/>`);
    }
  }

  // Groups are drawn directly because their halo needs the local background.
  chart.groups.forEach((group, index) => {
    const visibleIndex = rows.indexOf(group.row);
    if (visibleIndex === -1) return;
    const span = groupSpan(chart, group);
    const x = chartX + (group.col - 1) * cellPx;
    const y = chartY + (rowCount - 1 - visibleIndex) * cellPx;
    const background = groupBackground(chart, group);
    const color = groupContrast(chart, group);
    const glyph = glyphFor(group.symbol, group);
    const clipId = `group-clip-${index}`;
    parts.push(`<clipPath id="${clipId}"><rect x="${x}" y="${y}" width="${span * cellPx}" height="${cellPx}"/></clipPath>`);
    parts.push(`<g clip-path="url(#${clipId})"><g transform="translate(${x} ${y}) scale(${cellPx})" color="${color}">${glyphMarkup(glyph, { color, background })}</g></g>`);
  });

  // Row numbers. On long charts, print every few rows to avoid a wall of text.
  if (chart.options?.showRowNumbers !== false) {
    const rowStep = chart.height > 120 ? 5 : chart.height > 60 ? 2 : 1;
    for (let visibleIndex = 0; visibleIndex < rowCount; visibleIndex += 1) {
      if (visibleIndex % rowStep !== 0 && visibleIndex !== 0 && visibleIndex !== rowCount - 1) continue;
      const row = rows[visibleIndex];
      const y = chartY + (rowCount - 1 - visibleIndex) * cellPx + cellPx * 0.7;
      parts.push(text(String(row), chartX - 8, y, { size: 10, anchor: "end", fill: "#555555" }));
    }
  }

  // Stitch numbers are read right-to-left. That is the knitting direction.
  if (chart.options?.showStitchNumbers !== false) {
    const stitchStep = chart.width > 120 ? 5 : chart.width > 60 ? 2 : 1;
    for (let col = 1; col <= chart.width; col += 1) {
      const stitch = chart.width - col + 1;
      if (stitch % stitchStep !== 0 && stitch !== 1 && stitch !== chart.width) continue;
      const x = chartX + (col - 1) * cellPx + cellPx / 2;
      parts.push(text(String(stitch), x, chartY + chartH + 18, { size: 10, anchor: "middle", fill: "#555555" }));
    }
  }

  // Legend.
  if (legend.length) {
    const columns = legendColumns;
    parts.push(text(lang === "de" ? "Legende" : "Legend", chartX, legendTop - 4, { size: 12, weight: 700 }));
    legendLayout.forEach(({ entry, lines }, index) => {
      const column = index % columns;
      const line = Math.floor(index / columns);
      const x = chartX + column * columnWidth;
      const y = legendTop + 16 + line * legendRowHeight;
      if (entry.kind === "color") {
        parts.push(`<rect x="${x}" y="${y - 13}" width="18" height="18" rx="3" fill="${entry.color.hex}" stroke="#777777" stroke-width="0.7"/>`);
      } else if (entry.kind === "blank") {
        parts.push(`<rect x="${x + 1}" y="${y - 17}" width="18" height="18" fill="#ffffff" stroke="#777777" stroke-width="0.8"/>`);
      } else if (entry.kind === "cell") {
        parts.push(`<use href="#sym-${entry.symbol}" transform="translate(${x + 1} ${y - 17}) scale(18)" color="#111111"/>`);
      } else {
        // A group glyph spans `span` cells. Shrink it so it fits the icon
        // width, but never make it taller than a single cell icon.
        const iconScale = Math.min(1, LEGEND_ICON / (entry.span * 18));
        parts.push(`<g transform="translate(${x + 1} ${y - 17}) scale(${18 * iconScale})" color="#111111">${glyphMarkup(entry.glyph, { color: "#111111", background: "#ffffff" })}</g>`);
      }
      lines.forEach((lineText, lineIndex) => {
        parts.push(text(lineText, x + 42, y + 1 + lineIndex * 12, { size: 10 }));
      });
    });
  }

  // Footer: cell size, software licence and the chart's own content licence.
  const contentLicence = chart.meta?.license
    ? `content licence: ${chart.meta.license}`
    : "content licence not set";
  const footer = `${formatLength(chart.options.cellMm, unit, lang)} / ${lang === "de" ? "Raster" : "grid"} · Stitchwright · GPL-3.0 · ${contentLicence}`;
  parts.push(text(footer, chartX, svgH - 8, { size: 9, fill: "#888888" }));

  parts.push("</svg>");
  return parts.join("\n");
}
