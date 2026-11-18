/**
 * Canvas interaction layer.
 *
 * Mouse, touch and pen all arrive as Pointer Events, so there is one code
 * path for all three. Painting is a transaction: one undo entry per stroke,
 * not one per cell.
 */

import {
  addGroup,
  eraseCell,
  getCell,
  getColor,
  groupAt,
  paintCell,
  setColor
} from "../core/chart.js";
import { isGroupSymbol, symbolSpan } from "../core/symbols.js";
import { drawChart } from "../core/render-canvas.js";
import {
  cellAt,
  cellRect,
  fitView,
  headerAt,
  panBy,
  zoomAt
} from "../core/viewport.js";

export class CanvasView {
  constructor({ canvas, wrap, store, theme, onError, onCursor }) {
    this.canvas = canvas;
    this.wrap = wrap;
    this.store = store;
    this.theme = theme;
    this.onError = onError || (() => {});
    this.onCursor = onCursor || (() => {});
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.pointers = new Map();
    this.gesture = null;
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
    this.canvas.addEventListener("pointercancel", (event) => this.pointerUp(event));
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
        headerSelection: this.store.headerSelection
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
      const cell = cellAt(this.store.chart, this.store.view, point.x, point.y);
      if (!cell) return;
      this.store.setCursor(cell);
      event.preventDefault();
      this.canvas.setPointerCapture(event.pointerId);
      this.pointers.set(event.pointerId, point);
      this.startGesture("erase", cell);
      this.eraseAt(cell.row, cell.col);
      return;
    }
    if (event.button !== 0) return;

    const point = this.localPoint(event);
    this.pointers.set(event.pointerId, point);
    this.canvas.setPointerCapture(event.pointerId);

    if (this.pointers.size === 2) {
      this.commitGesture();
      this.startPinch();
      return;
    }
    if (this.pointers.size > 2) return;

    const header = headerAt(this.store.chart, this.store.view, point.x, point.y);
    if (header) {
      this.canvas.style.cursor = "pointer";
      this.store.setHeaderSelection(header);
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
    if (!cell) return;
    this.store.setCursor(cell);

    if (this.store.tool === "select") {
      const group = groupAt(this.store.chart, cell.row, cell.col);
      if (group) {
        this.store.selectGroup(group.id);
        return;
      }
      this.gesture = { type: "select", anchor: cell };
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
    this.store.begin(type === "paint" ? "Zeichnen" : "Radieren");
    this.gesture = { type, last: { ...cell }, placed: false };
  }

  commitGesture() {
    if (this.gesture && (this.gesture.type === "paint" || this.gesture.type === "erase")) {
      this.store.commit();
    }
    this.gesture = null;
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

    const header = headerAt(this.store.chart, this.store.view, point.x, point.y);
    if (!this.gesture) {
      this.canvas.style.cursor = header ? "pointer" : "";
    }

    const cell = cellAt(this.store.chart, this.store.view, point.x, point.y);
    if (!cell) {
      this.store.setHover(null);
      return;
    }

    if (this.gesture?.type === "paint") {
      if (this.gesture.last.row !== cell.row || this.gesture.last.col !== cell.col) {
        this.gesture.last = { ...cell };
        this.paintAt(cell.row, cell.col);
      }
      return;
    }
    if (this.gesture?.type === "erase") {
      if (this.gesture.last.row !== cell.row || this.gesture.last.col !== cell.col) {
        this.gesture.last = { ...cell };
        this.eraseAt(cell.row, cell.col);
      }
      return;
    }
    if (this.gesture?.type === "select") {
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
    } else if (this.gesture?.type === "select") {
      this.gesture = null;
    } else if (this.gesture?.type === "pan") {
      this.gesture = null;
    }
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
        const group = addGroup(chart, {
          row,
          col: startCol,
          symbol: symbol.id,
          ...symbol
        });
        // A cable or a multi-stitch decrease should sit on the current colour
        // just like a single stitch does.
        for (let offset = 0; offset < span; offset += 1) {
          setColor(chart, row, startCol + offset, this.store.color);
        }
        this.gesture.placed = true;
        this.store.selectGroup(group.id);
        this.store.touch();
      } catch (error) {
        this.onError(error);
      }
      return;
    }

    const value = symbol.id === "k" ? null : symbol.id;
    if (getCell(chart, row, col) === value && getColor(chart, row, col) === this.store.color) {
      return;
    }
    if (paintCell(chart, row, col, value, this.store.color)) this.store.touch();
  }

  eraseAt(row, col) {
    if (eraseCell(this.store.chart, row, col)) this.store.touch();
  }

  /** Paint or erase at the keyboard cursor. */
  paintCursor() {
    if (this.store.tool === "eraser") {
      this.store.begin("Radieren");
      this.eraseAt(this.store.cursor.row, this.store.cursor.col);
      this.store.commit();
    } else {
      this.store.begin("Zeichnen");
      this.paintAt(this.store.cursor.row, this.store.cursor.col);
      this.store.commit();
    }
  }

  moveCursor(deltaRow, deltaCol) {
    const chart = this.store.chart;
    const row = Math.max(1, Math.min(chart.height, this.store.cursor.row + deltaRow));
    const col = Math.max(1, Math.min(chart.width, this.store.cursor.col + deltaCol));
    this.store.setCursor({ row, col });
    this.ensureVisible(row, col);
  }

  ensureVisible(row, col) {
    const rect = cellRect(this.store.chart, this.store.view, row, col);
    if (!rect) return;
    let dx = 0;
    let dy = 0;
    const margin = this.store.view.scale * 2;
    if (rect.x < margin) dx = margin - rect.x;
    if (rect.x + rect.size > this.width - margin) dx = this.width - margin - (rect.x + rect.size);
    if (rect.y < margin) dy = margin - rect.y;
    if (rect.y + rect.size > this.height - margin) dy = this.height - margin - (rect.y + rect.size);
    if (dx || dy) this.store.setView(panBy(this.store.view, dx, dy));
  }
}
