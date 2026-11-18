/**
 * Canvas renderer for the editor.
 *
 * Only the visible part of the chart is drawn. That is the main reason the
 * editor stays fast on large patterns: a 1000 × 1000 chart still costs only
 * the cells that are actually on screen.
 *
 * Glyph geometry comes from symbols.js and is identical to the SVG exporter.
 * The canvas is for speed; the SVG is for print.
 */

import { getCell, getColor, groupSpan, visibleRows } from "./chart.js";
import { backgroundFor, contrastColor, withAlpha } from "./color.js";
import { glyphFor } from "./symbols.js";
import { cellRect, visibleColumns } from "./viewport.js";

export const LIGHT_THEME = {
  background: "#eef0f3",
  paper: "#ffffff",
  grid: "#c9ccd1",
  border: "#2b2f36",
  text: "#111318",
  muted: "#5f6672",
  accent: "#2563eb",
  selection: "rgba(37, 99, 235, 0.18)",
  repeat: "#c0392b",
  marker: "#7c3aed"
};

export const DARK_THEME = {
  background: "#17191d",
  paper: "#ffffff",
  grid: "#c9ccd1",
  border: "#111318",
  text: "#111318",
  muted: "#aab1bc",
  accent: "#60a5fa",
  selection: "rgba(96, 165, 250, 0.24)",
  repeat: "#c0392b",
  marker: "#c4b5fd"
};

const pathCache = new Map();

function pathFor(d) {
  let path = pathCache.get(d);
  if (!path) {
    path = new Path2D(d);
    pathCache.set(d, path);
  }
  return path;
}

function paintValue(value, color) {
  if (value === true) return color;
  if (value === false || value === undefined || value === null) return "none";
  return value;
}

/** Draw one glyph in cell coordinates at (x, y), scaled by `scale`. */
function drawGlyph(ctx, primitives, x, y, scale, color, background) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const primitive of primitives) {
    const stroke = primitive.halo
      ? background
      : (primitive.stroke === false ? "none" : paintValue(primitive.stroke, color));
    const fill = primitive.halo ? "none" : paintValue(primitive.fill, color);
    const width = primitive.width ?? 0.09;

    if (primitive.type === "line") {
      ctx.beginPath();
      ctx.moveTo(primitive.x1, primitive.y1);
      ctx.lineTo(primitive.x2, primitive.y2);
      ctx.lineWidth = width;
      ctx.strokeStyle = stroke;
      ctx.stroke();
    } else if (primitive.type === "path") {
      const path = pathFor(primitive.d);
      if (fill !== "none") {
        ctx.fillStyle = fill;
        ctx.fill(path);
      }
      if (stroke !== "none") {
        ctx.lineWidth = width;
        ctx.strokeStyle = stroke;
        ctx.stroke(path);
      }
    } else if (primitive.type === "circle") {
      ctx.beginPath();
      ctx.arc(primitive.cx, primitive.cy, primitive.r, 0, Math.PI * 2);
      if (fill !== "none") {
        ctx.fillStyle = fill;
        ctx.fill();
      }
      if (stroke !== "none") {
        ctx.lineWidth = width;
        ctx.strokeStyle = stroke;
        ctx.stroke();
      }
    } else if (primitive.type === "rect") {
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(primitive.x, primitive.y, primitive.w, primitive.h, primitive.rx || 0);
      } else {
        ctx.rect(primitive.x, primitive.y, primitive.w, primitive.h);
      }
      if (fill !== "none") {
        ctx.fillStyle = fill;
        ctx.fill();
      }
      if (stroke !== "none") {
        ctx.lineWidth = width;
        ctx.strokeStyle = stroke;
        ctx.stroke();
      }
    } else if (primitive.type === "text") {
      ctx.font = `${primitive.weight || 600} ${primitive.size}px system-ui, sans-serif`;
      ctx.textAlign = primitive.anchor === "middle" ? "center" : primitive.anchor;
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = color;
      ctx.fillText(primitive.value, primitive.x, primitive.y);
    }
  }
  ctx.restore();
}

function rowY(chart, view, row, visible) {
  const index = visible.indexOf(row);
  if (index === -1) return null;
  return view.offsetY + (visible.length - 1 - index) * view.scale;
}

function drawSelection(ctx, chart, view, selection, theme, visible) {
  if (!selection) return;
  const top = Math.min(selection.row1, selection.row2);
  const bottom = Math.max(selection.row1, selection.row2);
  const left = Math.min(selection.col1, selection.col2);
  const right = Math.max(selection.col1, selection.col2);
  const first = cellRect(chart, view, top, left);
  const last = cellRect(chart, view, bottom, right);
  if (!first || !last) return;
  const x = first.x;
  const y = last.y;
  const w = (right - left + 1) * view.scale;
  const h = (bottom - top + 1) * view.scale;
  ctx.fillStyle = theme.selection;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5);
}

/** Draw the whole editor viewport. */
export function drawChart(ctx, chart, view, {
  width,
  height,
  dpr = 1,
  theme = LIGHT_THEME,
  selection = null,
  hover = null,
  cursor = null,
  selectedGroupId = null,
  headerSelection = null,
  showNumbers = true
} = {}) {
  const scale = view.scale;
  const rows = visibleRows(chart);
  const rowCount = rows.length;
  const chartW = chart.width * scale;
  const chartH = rowCount * scale;
  const palette = new Map(chart.palette.map((entry) => [entry.id, entry.hex]));

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, width, height);

  // The paper stays white in dark mode: a chart is a print artefact.
  ctx.fillStyle = theme.paper;
  ctx.fillRect(view.offsetX, view.offsetY, chartW, chartH);

  ctx.save();
  ctx.beginPath();
  ctx.rect(view.offsetX, view.offsetY, chartW, chartH);
  ctx.clip();

  const { start, end } = visibleColumns(chart, view, width);
  // At tiny zoom levels the whole chart is visible. Drawing every symbol
  // would cost more than it helps, so the overview shows colour blocks,
  // the grid and the border only. Detail returns as soon as the user zooms in.
  const showGrid = scale >= 2;
  const showDetail = scale >= 4;
  // Visible row indices, counted from the bottom row (index 0).
  // Add one row of slack on each side so partially visible rows are drawn.
  const firstVisibleRow = Math.max(0, Math.floor(rowCount - (height - view.offsetY) / scale) - 1);
  const lastVisibleRow = Math.min(rowCount - 1, Math.ceil(rowCount + view.offsetY / scale));

  // Colour fills, run-length encoded per row.
  for (let visibleIndex = lastVisibleRow; visibleIndex >= firstVisibleRow; visibleIndex -= 1) {
    const row = rows[visibleIndex];
    const y = view.offsetY + (rowCount - 1 - visibleIndex) * scale;
    let col = start + 1;
    while (col <= end + 1) {
      const colorId = getColor(chart, row, col);
      let runEnd = col;
      while (runEnd + 1 <= end + 1 && getColor(chart, row, runEnd + 1) === colorId) runEnd += 1;
      if (colorId) {
        ctx.fillStyle = palette.get(colorId) || "#ffffff";
        ctx.fillRect(view.offsetX + (col - 1) * scale, y, (runEnd - col + 1) * scale, scale);
      }
      col = runEnd + 1;
    }
    for (let col = start + 1; col <= end + 1; col += 1) {
      if (getCell(chart, row, col) === "nostitch") {
        ctx.fillStyle = "#e6e6e6";
        ctx.fillRect(view.offsetX + (col - 1) * scale, y, scale, scale);
      }
    }
  }

  // Grid lines. Only the visible range is drawn, even for huge charts.
  if (showGrid) {
    ctx.beginPath();
    for (let col = start; col <= end + 1; col += 1) {
      const x = Math.round(view.offsetX + col * scale) + 0.5;
      ctx.moveTo(x, view.offsetY);
      ctx.lineTo(x, view.offsetY + chartH);
    }
    for (let k = 0; k <= rowCount; k += 1) {
      const y = Math.round(view.offsetY + k * scale) + 0.5;
      if (y < 0 || y > height) continue;
      ctx.moveTo(view.offsetX, y);
      ctx.lineTo(view.offsetX + chartW, y);
    }
    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Symbols in cells.
  if (showDetail) {
    for (let visibleIndex = lastVisibleRow; visibleIndex >= firstVisibleRow; visibleIndex -= 1) {
      const row = rows[visibleIndex];
      const y = view.offsetY + (rowCount - 1 - visibleIndex) * scale;
      for (let col = start + 1; col <= end + 1; col += 1) {
        const cell = getCell(chart, row, col);
        if (!cell) continue;
        const x = view.offsetX + (col - 1) * scale;
        const background = backgroundFor(chart, row, col);
        drawGlyph(ctx, glyphFor(cell), x, y, scale, contrastColor(background), background);
      }
    }
  }

  // Groups: cables and other multi-stitch symbols.
  if (showDetail) {
    for (const group of chart.groups) {
      const visibleIndex = rows.indexOf(group.row);
      if (visibleIndex === -1) continue;
      const span = groupSpan(chart, group);
      if (group.col + span - 1 < start + 1 || group.col > end + 1) continue;
      const x = view.offsetX + (group.col - 1) * scale;
      const y = view.offsetY + (rowCount - 1 - visibleIndex) * scale;
      const background = backgroundFor(chart, group.row, group.col);
      const color = contrastColor(background);
      drawGlyph(ctx, glyphFor(group.symbol, group), x, y, scale, color, background);

      if (group.id === selectedGroupId) {
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(x + 1, y + 1, span * scale - 2, scale - 2);
        ctx.setLineDash([]);
      }
    }
  }

  // Repeat guide lines.
  const repeat = chart.options?.repeat;
  if (repeat) {
    ctx.strokeStyle = theme.repeat;
    ctx.lineWidth = 2;
    for (const boundary of [repeat.start - 1, repeat.end]) {
      const x = view.offsetX + boundary * scale;
      ctx.beginPath();
      ctx.moveTo(x, view.offsetY);
      ctx.lineTo(x, view.offsetY + chartH);
      ctx.stroke();
    }
  }

  // Stitch markers are chart guides, not knitted instructions.
  const markers = chart.options?.markers || [];
  if (markers.length) {
    ctx.strokeStyle = theme.marker;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    for (const boundary of markers) {
      if (!Number.isInteger(boundary) || boundary < 1 || boundary >= chart.width) continue;
      const x = view.offsetX + boundary * scale;
      if (x < 0 || x > width) continue;
      ctx.beginPath();
      ctx.moveTo(x, view.offsetY);
      ctx.lineTo(x, view.offsetY + chartH);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  // Whole-row or whole-column selection from the number margins.
  if (headerSelection) {
    ctx.fillStyle = withAlpha(theme.accent, 0.16);
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 2;
    if (headerSelection.kind === "row") {
      const visibleIndex = rows.indexOf(headerSelection.index);
      if (visibleIndex !== -1) {
        const y = view.offsetY + (rowCount - 1 - visibleIndex) * scale;
        ctx.fillRect(view.offsetX, y, chartW, scale);
        ctx.strokeRect(view.offsetX + 1, y + 1, chartW - 2, scale - 2);
      }
    } else if (headerSelection.kind === "column") {
      const x = view.offsetX + (headerSelection.index - 1) * scale;
      ctx.fillRect(x, view.offsetY, scale, chartH);
      ctx.strokeRect(x + 1, view.offsetY + 1, scale - 2, chartH - 2);
    }
  }

  ctx.restore();

  // Border.
  ctx.strokeStyle = theme.border;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(view.offsetX + 0.75, view.offsetY + 0.75, chartW - 1.5, chartH - 1.5);

  // Numbers live outside the paper, so they use the UI text colour.
  if (showNumbers && showDetail && chart.options?.showRowNumbers !== false) {
    const step = scale < 14 ? 5 : scale < 22 ? 2 : 1;
    ctx.fillStyle = theme.muted;
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let visibleIndex = Math.max(0, firstVisibleRow); visibleIndex <= lastVisibleRow; visibleIndex += 1) {
      const row = rows[visibleIndex];
      if (row % step !== 0 && row !== 1 && row !== chart.height) continue;
      const y = view.offsetY + (rowCount - 1 - visibleIndex) * scale + scale * 0.5;
      if (y < 0 || y > height) continue;
      ctx.fillText(String(row), view.offsetX - 7, y);
    }
  }

  if (showNumbers && showDetail && chart.options?.showStitchNumbers !== false) {
    const step = scale < 14 ? 5 : scale < 22 ? 2 : 1;
    ctx.fillStyle = theme.muted;
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const y = view.offsetY + chartH + 6;
    if (y < height) {
      for (let col = start + 1; col <= end + 1; col += 1) {
        const stitch = chart.width - col + 1;
        if (stitch % step !== 0 && stitch !== 1 && stitch !== chart.width) continue;
        ctx.fillText(String(stitch), view.offsetX + (col - 0.5) * scale, y);
      }
    }
  }

  // Hover highlight and keyboard cursor.
  if (hover) {
    const rect = cellRect(chart, view, hover.row, hover.col);
    if (rect) {
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 2;
      ctx.strokeRect(rect.x + 1, rect.y + 1, rect.size - 2, rect.size - 2);
    }
  }
  if (cursor) {
    const rect = cellRect(chart, view, cursor.row, cursor.col);
    if (rect) {
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(rect.x + 1, rect.y + 1, rect.size - 2, rect.size - 2);
      ctx.setLineDash([]);
    }
  }

  drawSelection(ctx, chart, view, selection, theme, rows);
}

/** Draw a mini preview of a chart into a small canvas (open dialog, cards). */
export function drawThumbnail(ctx, chart, width, height, theme = LIGHT_THEME) {
  const rows = visibleRows(chart).length;
  const scale = Math.min(width / chart.width, height / Math.max(1, rows));
  const view = {
    scale,
    offsetX: (width - chart.width * scale) / 2,
    offsetY: (height - rows * scale) / 2
  };
  drawChart(ctx, chart, view, {
    width,
    height,
    dpr: typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
    theme,
    showNumbers: false
  });
}
