/**
 * Canvas interaction layer.
 *
 * Mouse, touch and pen all arrive as Pointer Events, so there is one code
 * path for all three. Painting is a transaction: one undo entry per stroke,
 * not one per cell.
 */

import {
  addGroup,
  addGuide,
  eraseCell,
  getCell,
  getColor,
  groupAt,
  guidesOverlapping,
  paintCell,
  removeGuide,
  setColor,
  toggleMarker,
  visibleRows
} from "../core/chart.js";
import { findGuideAt } from "../core/guides.js";
import { isGroupSymbol, symbolSpan } from "../core/symbols.js";
import { drawChart } from "../core/render-canvas.js";
import {
  cellAt,
  cellRect,
  fitView,
  headerAt,
  headerIndexAt,
  panBy,
  viewportFrame,
  zoomAt
} from "../core/viewport.js";

/** Grid cells on the straight line between two cell coordinates. */
function lineCells(from, to) {
  const cells = [];
  let x0 = from.col;
  let y0 = from.row;
  const x1 = to.col;
  const y1 = to.row;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  for (;;) {
    cells.push({ row: y0, col: x0 });
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * error;
    if (e2 >= dy) {
      error += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      error += dx;
      y0 += sy;
    }
  }
  return cells;
}

export class CanvasView {
  constructor({ canvas, wrap, store, theme, onError, onCursor, onResize }) {
    this.canvas = canvas;
    this.wrap = wrap;
    this.store = store;
    this.theme = theme;
    this.onError = onError || (() => {});
    this.onCursor = onCursor || (() => {});
    this.onResize = onResize || (() => {});
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.pointers = new Map();
    this.gesture = null;
    this.guidePreview = null;
    this.frame = null;
    this.dpr = 1;
    this.width = 1;
    this.height = 1;
    this.mounted = false;
  }

  mount() {
    if (this.mounted) return;
    this.mounted = true;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.wrap);

    this.canvas.addEventListener("pointerdown", (event) => this.pointerDown(event));
    this.canvas.addEventListener("pointermove", (event) => this.pointerMove(event));
    this.canvas.addEventListener("pointerup", (event) => this.pointerUp(event));
    this.canvas.addEventListener("pointercancel", (event) => this.pointerCancel(event));
    this.canvas.addEventListener("lostpointercapture", (event) => this.pointerCancel(event));
    this.canvas.addEventListener("pointerleave", () => {
      this.store.setHover(null);
      this.canvas.style.cursor = "";
    });
    this.canvas.addEventListener("contextmenu", (event) => event.preventDefault());
    this.canvas.addEventListener("wheel", (event) => this.wheel(event), { passive: false });

    this.store.subscribe((type) => {
      if (["paint", "chart", "view", "selection", "header", "hover", "cursor", "tool", "symbol", "color"].includes(type)) {
        this.render();
      }
    });

    this.resize();
  }

  resize() {
    const rect = this.wrap.getBoundingClientRect();
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    if (!this.hasFitted) {
      this.hasFitted = true;
      this.store.setView(fitView(this.store.chart, this.width, this.height));
    }
    this.render();
    this.onResize();
  }

  setTheme(theme) {
    this.theme = theme;
    this.render();
  }

  render() {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = null;
      drawChart(this.ctx, this.store.chart, this.store.view, {
        width: this.width,
        height: this.height,
        dpr: this.dpr,
        theme: this.theme,
        selection: this.store.selection,
        hover: this.store.hover,
        cursor: this.store.cursor,
        selectedGroupId: this.store.selectedGroupId,
        headerSelection: this.store.headerSelection,
        guidePreview: this.guidePreview
      });
    });
  }

  fit() {
    this.store.setView(fitView(this.store.chart, this.width, this.height));
  }

  zoomBy(factor) {
    const view = zoomAt(this.store.view, this.width / 2, this.height / 2, factor);
    this.store.setView(view);
  }

  resetZoom() {
    this.store.setView(fitView(this.store.chart, this.width, this.height));
  }

  localPoint(event) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  pointerDown(event) {
    if (event.button === 2) {
      // Right click is a quick eraser, even when the pencil is active.
      const point = this.localPoint(event);
      event.preventDefault();
      if (this.store.tool === "guide") {
        const target = this.guideTargetAt(point);
        if (target) {
          const guide = findGuideAt(this.store.chart, target.boundary, target.row);
          if (guide) this.removeGuideById(guide.id);
        }
        return;
      }
      const cell = cellAt(this.store.chart, this.store.view, point.x, point.y, this.width, this.height);
      if (!cell) return;
      this.store.setCursor(cell);
      if (this.store.tool === "marker") {
        this.toggleMarkerAt(cell.col);
        return;
      }
      this.canvas.setPointerCapture(event.pointerId);
      this.pointers.set(event.pointerId, point);
      this.startGesture("erase", cell);
      this.eraseAt(cell.row, cell.col);
      return;
    }
    if (event.button !== 0 && event.button !== 1) return;

    const point = this.localPoint(event);
    this.pointers.set(event.pointerId, point);
    this.canvas.setPointerCapture(event.pointerId);

    if (this.pointers.size === 2) {
      this.cancelGesture();
      this.startPinch();
      return;
    }
    if (this.pointers.size > 2) return;

    const header = headerAt(this.store.chart, this.store.view, point.x, point.y, this.width, this.height);
    if (header) {
      const previous = this.store.headerSelection;
      const anchor = event.shiftKey && previous?.kind === header.kind
        ? previous.from
        : header.index;
      this.store.setHeaderSelection({ kind: header.kind, from: anchor, to: header.index });
      this.gesture = { type: "header", kind: header.kind, anchor };
      this.canvas.style.cursor = "pointer";
      return;
    }

    const cell = cellAt(this.store.chart, this.store.view, point.x, point.y);
    if (this.store.headerSelection) this.store.setHeaderSelection(null);
    if (this.store.tool === "pan" || event.button === 1) {
      this.gesture = {
        type: "pan",
        startX: point.x,
        startY: point.y,
        offsetX: this.store.view.offsetX,
        offsetY: this.store.view.offsetY
      };
      return;
    }
    if (this.store.tool === "guide") {
      const target = this.guideTargetAt(point);
      if (!target) return;
      const existing = findGuideAt(this.store.chart, target.boundary, target.row);
      this.gesture = {
        type: "guide",
        boundary: target.boundary,
        anchorRow: target.row,
        currentRow: target.row,
        startY: point.y,
        removeId: existing?.id || null
      };
      this.store.setCursor({ row: target.row, col: target.boundary });
      this.canvas.style.cursor = "col-resize";
      return;
    }
    if (!cell) return;
    this.store.setCursor(cell);

    if (this.store.tool === "marker") {
      this.toggleMarkerAt(cell.col);
      return;
    }

    if (this.store.tool === "select") {
      // Start with a rectangle. A click without dragging still selects the
      // group under the pointer on release, so a rectangle can begin on a
      // cable or another multi-cell symbol.
      this.gesture = { type: "select", anchor: cell, moved: false };
      this.store.setSelection({ row1: cell.row, col1: cell.col, row2: cell.row, col2: cell.col });
      return;
    }

    if (this.store.tool === "eraser") {
      this.startGesture("erase", cell);
      this.eraseAt(cell.row, cell.col);
      return;
    }

    this.startGesture("paint", cell);
    this.paintAt(cell.row, cell.col);
  }

  startGesture(type, cell) {
    this.store.begin(type === "paint" ? "Draw" : "Erase");
    this.gesture = { type, last: { ...cell }, placed: false };
  }

  commitGesture() {
    if (this.gesture && (this.gesture.type === "paint" || this.gesture.type === "erase")) {
      this.store.commit();
    }
    this.gesture = null;
  }

  cancelGesture() {
    if (this.gesture?.type === "paint" || this.gesture?.type === "erase") {
      this.store.cancel();
    }
    if (this.gesture?.type === "guide") {
      this.guidePreview = null;
      this.render();
    }
    this.gesture = null;
  }

  /**
   * Snap a pointer to the nearest stitch boundary and its row. A guide line
   * only exists between two columns, never on the outer border.
   */
  guideTargetAt(point) {
    const chart = this.store.chart;
    const view = this.store.view;
    const frame = viewportFrame(this.width, this.height);
    if (point.x < frame.left || point.x >= frame.right
      || point.y < frame.top || point.y >= frame.bottom) {
      return null;
    }
    const rows = visibleRows(chart);
    const chartW = chart.width * view.scale;
    const chartH = rows.length * view.scale;
    if (point.x < view.offsetX || point.x > view.offsetX + chartW
      || point.y < view.offsetY || point.y > view.offsetY + chartH) {
      return null;
    }
    const boundary = Math.round((point.x - view.offsetX) / view.scale);
    if (boundary < 1 || boundary >= chart.width) return null;
    const row = headerIndexAt(chart, view, "row", point.x, point.y);
    return row === null ? null : { boundary, row };
  }

  removeGuideById(id) {
    try {
      this.store.edit("Remove guide line", (chart) => removeGuide(chart, id));
    } catch (error) {
      this.onError(error);
    }
  }

  /** Commit the current guide gesture: remove, add a span, or add full height. */
  finishGuideGesture() {
    const gesture = this.gesture;
    this.gesture = null;
    this.guidePreview = null;
    if (!gesture) return;
    const color = this.store.guideColor;
    try {
      if (gesture.currentRow !== gesture.anchorRow) {
        const fromRow = Math.min(gesture.anchorRow, gesture.currentRow);
        const toRow = Math.max(gesture.anchorRow, gesture.currentRow);
        this.store.edit("Guide line", (chart) => {
          for (const guide of guidesOverlapping(chart, gesture.boundary, fromRow, toRow)) {
            removeGuide(chart, guide.id);
          }
          addGuide(chart, { boundary: gesture.boundary, fromRow, toRow, color });
        });
      } else if (gesture.removeId) {
        this.removeGuideById(gesture.removeId);
      } else {
        this.store.edit("Guide line", (chart) => {
          for (const guide of chart.guides.filter((item) => item.boundary === gesture.boundary)) {
            removeGuide(chart, guide.id);
          }
          addGuide(chart, { boundary: gesture.boundary, fromRow: 1, toRow: chart.height, color });
        });
      }
    } catch (error) {
      this.onError(error);
    }
    this.canvas.style.cursor = "col-resize";
  }

  pointerMove(event) {
    const point = this.localPoint(event);
    if (this.pointers.has(event.pointerId)) this.pointers.set(event.pointerId, point);

    if (this.gesture?.type === "pinch") {
      this.updatePinch();
      return;
    }

    if (this.gesture?.type === "pan") {
      const dx = point.x - this.gesture.startX;
      const dy = point.y - this.gesture.startY;
      this.store.setView({
        ...this.store.view,
        offsetX: this.gesture.offsetX + dx,
        offsetY: this.gesture.offsetY + dy
      });
      return;
    }

    if (this.gesture?.type === "header") {
      const index = headerIndexAt(this.store.chart, this.store.view, this.gesture.kind, point.x, point.y);
      if (index !== null) {
        this.store.setHeaderSelection({
          kind: this.gesture.kind,
          from: this.gesture.anchor,
          to: index
        });
      }
      return;
    }

    if (this.gesture?.type === "guide") {
      const dragged = Math.abs(point.y - this.gesture.startY) >= this.store.view.scale * 0.35;
      const row = dragged
        ? headerIndexAt(this.store.chart, this.store.view, "row", point.x, point.y)
        : this.gesture.anchorRow;
      if (row !== null) {
        this.gesture.currentRow = row;
        this.guidePreview = row === this.gesture.anchorRow
          ? null
          : {
            boundary: this.gesture.boundary,
            fromRow: Math.min(this.gesture.anchorRow, row),
            toRow: Math.max(this.gesture.anchorRow, row),
            color: this.store.guideColor
          };
        this.render();
      }
      this.store.setHover(null);
      this.canvas.style.cursor = "col-resize";
      return;
    }

    const header = headerAt(this.store.chart, this.store.view, point.x, point.y, this.width, this.height);
    if (!this.gesture) {
      this.canvas.style.cursor = header
        ? "pointer"
        : (this.store.tool === "guide" ? "col-resize" : "");
    }

    const cell = cellAt(this.store.chart, this.store.view, point.x, point.y);
    if (!cell) {
      this.store.setHover(null);
      return;
    }

    if (this.gesture?.type === "paint") {
      if (this.gesture.last.row !== cell.row || this.gesture.last.col !== cell.col) {
        this.paintLine(this.gesture.last, cell);
        this.gesture.last = { ...cell };
      }
      return;
    }
    if (this.gesture?.type === "erase") {
      if (this.gesture.last.row !== cell.row || this.gesture.last.col !== cell.col) {
        this.eraseLine(this.gesture.last, cell);
        this.gesture.last = { ...cell };
      }
      return;
    }
    if (this.gesture?.type === "select") {
      if (cell.row !== this.gesture.anchor.row || cell.col !== this.gesture.anchor.col) {
        this.gesture.moved = true;
      }
      this.store.setSelection({
        row1: this.gesture.anchor.row,
        col1: this.gesture.anchor.col,
        row2: cell.row,
        col2: cell.col
      });
      return;
    }

    this.store.setHover(cell);
    this.onCursor(cell);
  }

  pointerUp(event) {
    this.pointers.delete(event.pointerId);
    if (this.gesture?.type === "pinch") {
      if (this.pointers.size < 2) this.gesture = null;
      return;
    }
    if (this.gesture?.type === "paint" || this.gesture?.type === "erase") {
      this.commitGesture();
    } else if (this.gesture?.type === "guide") {
      const point = this.localPoint(event);
      if (Math.abs(point.y - this.gesture.startY) >= this.store.view.scale * 0.35) {
        const row = headerIndexAt(this.store.chart, this.store.view, "row", point.x, point.y);
        if (row !== null) this.gesture.currentRow = row;
      }
      this.finishGuideGesture();
    } else if (this.gesture?.type === "select") {
      if (!this.gesture.moved) {
        const group = groupAt(this.store.chart, this.gesture.anchor.row, this.gesture.anchor.col);
        if (group) this.store.selectGroup(group.id);
      }
      this.gesture = null;
    } else if (this.gesture?.type === "header" || this.gesture?.type === "pan") {
      this.gesture = null;
    }
  }

  pointerCancel(event) {
    this.pointers.delete(event.pointerId);
    this.cancelGesture();
  }

  startPinch() {
    const [a, b] = [...this.pointers.values()];
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    this.gesture = {
      type: "pinch",
      startDistance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
      startMid: mid,
      startScale: this.store.view.scale,
      startOffsetX: this.store.view.offsetX,
      startOffsetY: this.store.view.offsetY
    };
  }

  updatePinch() {
    if (this.pointers.size < 2) return;
    const [a, b] = [...this.pointers.values()];
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const distance = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
    const factor = distance / this.gesture.startDistance;
    let view = zoomAt({
      scale: this.gesture.startScale,
      offsetX: this.gesture.startOffsetX,
      offsetY: this.gesture.startOffsetY
    }, this.gesture.startMid.x, this.gesture.startMid.y, factor);
    view = panBy(view, mid.x - this.gesture.startMid.x, mid.y - this.gesture.startMid.y);
    this.store.setView(view);
  }

  wheel(event) {
    event.preventDefault();
    const point = this.localPoint(event);
    if (event.ctrlKey || event.metaKey) {
      const factor = Math.exp(-event.deltaY * 0.0015);
      this.store.setView(zoomAt(this.store.view, point.x, point.y, factor));
      return;
    }
    const dx = event.shiftKey ? -event.deltaY : -event.deltaX;
    const dy = event.shiftKey ? 0 : -event.deltaY;
    this.store.setView(panBy(this.store.view, dx, dy));
  }

  paintAt(row, col) {
    const chart = this.store.chart;
    const symbol = this.store.symbol;
    if (!symbol) return;

    if (symbol.id !== "k" && isGroupSymbol(symbol.id)) {
      if (this.gesture?.placed) return;
      const span = symbolSpan(symbol.id, symbol);
      const startCol = Math.max(1, Math.min(col, chart.width - span + 1));
      try {
        const input = { row, col: startCol, symbol: symbol.id };
        if (symbol.id === "cable") {
          input.left = symbol.left;
          input.right = symbol.right;
          input.direction = symbol.direction;
        } else if (symbol.id === "custom") {
          input.span = span;
          input.label = symbol.label;
          input.legend = symbol.legend;
        }
        const group = addGroup(chart, input);
        // A cable or a multi-stitch decrease should sit on the current colour
        // just like a single stitch does.
        for (let offset = 0; offset < span; offset += 1) {
          setColor(chart, row, startCol + offset, this.store.color);
        }
        if (this.gesture) this.gesture.placed = true;
        this.store.selectGroup(group.id);
        this.store.touch();
      } catch (error) {
        this.onError(error);
      }
      return;
    }

    const value = symbol.id === "k" ? null : symbol.id;
    const group = groupAt(chart, row, col);
    if (!group && getCell(chart, row, col) === value && getColor(chart, row, col) === this.store.color) {
      return;
    }
    if (paintCell(chart, row, col, value, this.store.color)) this.store.touch();
  }

  /** Paint every cell between two pointer samples, so fast strokes stay solid. */
  paintLine(from, to) {
    const cells = lineCells(from, to);
    for (const cell of cells) this.paintAt(cell.row, cell.col);
  }

  /** Erase every cell between two pointer samples. */
  eraseLine(from, to) {
    const cells = lineCells(from, to);
    for (const cell of cells) this.eraseAt(cell.row, cell.col);
  }

  eraseAt(row, col) {
    if (eraseCell(this.store.chart, row, col)) this.store.touch();
  }

  toggleMarkerAt(col) {
    if (col < 1 || col >= this.store.chart.width) return;
    this.store.edit("Stitch markers", (chart) => {
      toggleMarker(chart, col);
    });
  }

  /** Paint or erase at the keyboard cursor. */
  paintCursor() {
    if (this.store.tool === "guide") return;
    if (this.store.tool === "marker") {
      this.toggleMarkerAt(this.store.cursor.col);
      return;
    }
    if (this.store.tool === "eraser") {
      this.store.begin("Erase");
      this.eraseAt(this.store.cursor.row, this.store.cursor.col);
      this.store.commit();
    } else {
      this.store.begin("Draw");
      this.paintAt(this.store.cursor.row, this.store.cursor.col);
      this.store.commit();
    }
  }

  moveCursor(deltaRow, deltaCol) {
    const chart = this.store.chart;
    const rows = visibleRows(chart);
    const currentIndex = Math.max(0, rows.indexOf(this.store.cursor.row));
    const nextIndex = Math.max(0, Math.min(rows.length - 1, currentIndex + deltaRow));
    const row = rows[nextIndex];
    const col = Math.max(1, Math.min(chart.width, this.store.cursor.col + deltaCol));
    this.store.setCursor({ row, col });
    this.ensureVisible(row, col);
  }

  ensureVisible(row, col) {
    const rect = cellRect(this.store.chart, this.store.view, row, col);
    if (!rect) return;
    let dx = 0;
    let dy = 0;
    const frame = viewportFrame(this.width, this.height);
    const marginX = Math.min(this.store.view.scale * 2, (frame.right - frame.left) / 3);
    const marginY = Math.min(this.store.view.scale * 2, (frame.bottom - frame.top) / 3);
    if (rect.x < frame.left + marginX) dx = frame.left + marginX - rect.x;
    if (rect.x + rect.size > frame.right - marginX) dx = frame.right - marginX - (rect.x + rect.size);
    if (rect.y < frame.top + marginY) dy = frame.top + marginY - rect.y;
    if (rect.y + rect.size > frame.bottom - marginY) dy = frame.bottom - marginY - (rect.y + rect.size);
    if (dx || dy) this.store.setView(panBy(this.store.view, dx, dy));
  }
}
