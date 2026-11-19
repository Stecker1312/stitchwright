/**
 * Editor state and undo history.
 *
 * The chart itself is plain JSON and is mutated in place for speed. A
 * transaction stores a deep copy before the change. Undo history is scoped to
 * one document and cleared when the document changes. The save coordinator
 * can only confirm the exact revision it wrote.
 */

import { cloneChart, touchChartMeta, visibleRows } from "../core/chart.js";

const HISTORY_BUDGET_BYTES = 32 * 1024 * 1024;
const MAX_HISTORY = 80;

export class Store {
  constructor(chart, { settings = {} } = {}) {
    this.chart = chart;
    this.settings = settings;
    this.tool = "pencil";
    this.symbol = { id: "k" };
    this.color = null;
    this.selection = null;
    this.selectedGroupId = null;
    this.headerSelection = null;
    this.cursor = { row: 1, col: 1 };
    this.hover = null;
    this.view = { scale: 28, offsetX: 40, offsetY: 40 };
    this.revision = 0;
    this.savedRevision = -1;
    this.dirty = false;
    this.savedAt = null;
    this.undoStack = [];
    this.redoStack = [];
    this.pending = null;
    this.pendingChanged = false;
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(type, detail = {}) {
    this.listeners.forEach((listener) => listener(type, detail));
  }

  /** Mark a real content change and keep the timestamp honest. */
  markContentChanged() {
    this.revision += 1;
    this.dirty = true;
    touchChartMeta(this.chart);
  }

  /** Start a multi-step gesture. The undo snapshot is taken immediately. */
  begin(label) {
    if (this.pending) throw new Error("A gesture is already open");
    this.pending = {
      label,
      before: cloneChart(this.chart),
      documentId: this.chart.id,
      revision: this.revision
    };
    this.pendingChanged = false;
  }

  /** Mark that the current gesture changed something. */
  touch() {
    if (this.pending) this.pendingChanged = true;
    this.markContentChanged();
    this.emit("paint");
  }

  /** Finish a gesture and push one undo entry if anything changed. */
  commit() {
    if (!this.pending) return;
    if (this.pendingChanged) {
      this.pushUndo(this.pending);
      this.redoStack = [];
      this.emit("history");
    }
    this.pending = null;
    this.pendingChanged = false;
  }

  /** Abandon the current gesture and restore the snapshot. */
  cancel() {
    if (!this.pending) return false;
    this.chart = this.pending.before;
    this.pending = null;
    this.pendingChanged = false;
    this.markContentChanged();
    this.emit("chart");
    this.emit("history");
    return true;
  }

  /** A single, atomic edit. The callback mutates `this.chart`. */
  edit(label, callback) {
    const before = cloneChart(this.chart);
    const documentId = this.chart.id;
    try {
      const result = callback(this.chart);
      if (result === false) {
        this.chart = before;
        return false;
      }
      this.pushUndo({ label, before, documentId, revision: this.revision });
      this.redoStack = [];
      this.markContentChanged();
      this.emit("chart");
      this.emit("history");
      return result;
    } catch (error) {
      // A failed edit must not leave a half-applied chart behind.
      this.chart = before;
      this.emit("chart");
      throw error;
    }
  }

  pushUndo(entry) {
    const documentId = entry.documentId || this.chart.id;
    if (documentId !== this.chart.id) return;
    const prepared = {
      ...entry,
      documentId,
      size: entry.size ?? JSON.stringify(entry.before).length
    };
    this.undoStack.push(prepared);
    let total = this.undoStack.reduce((sum, item) => sum + (item.size || 0), 0);
    while (this.undoStack.length > 1
      && (this.undoStack.length > MAX_HISTORY || total > HISTORY_BUDGET_BYTES)) {
      const removed = this.undoStack.shift();
      total -= removed.size || 0;
    }
  }

  undo() {
    if (this.pending) this.commit();
    const entry = this.undoStack.pop();
    if (!entry) return false;
    if (entry.documentId && entry.documentId !== this.chart.id) {
      this.undoStack = [];
      return false;
    }
    this.redoStack.push({
      label: entry.label,
      before: cloneChart(this.chart),
      documentId: this.chart.id,
      revision: this.revision
    });
    this.chart = entry.before;
    this.markContentChanged();
    this.resetTransientSelection();
    this.emit("chart");
    this.emit("history");
    return true;
  }

  redo() {
    if (this.pending) this.commit();
    const entry = this.redoStack.pop();
    if (!entry) return false;
    if (entry.documentId && entry.documentId !== this.chart.id) {
      this.redoStack = [];
      return false;
    }
    this.pushUndo({
      label: entry.label,
      before: cloneChart(this.chart),
      documentId: this.chart.id,
      revision: this.revision
    });
    this.chart = entry.before;
    this.markContentChanged();
    this.resetTransientSelection();
    this.emit("chart");
    this.emit("history");
    return true;
  }

  resetTransientSelection() {
    this.selectedGroupId = null;
    this.selection = null;
    this.headerSelection = null;
    this.hover = null;
  }

  /**
   * Switch to another document. This is a hard state boundary: history,
   * selection, cursor and brush must not leak from the previous document.
   */
  replace(chart) {
    this.pending = null;
    this.pendingChanged = false;
    this.undoStack = [];
    this.redoStack = [];
    this.chart = chart;
    this.revision = 0;
    this.savedRevision = -1;
    this.dirty = false;
    this.savedAt = null;
    this.resetTransientSelection();
    const rows = visibleRows(chart);
    const row = rows.includes(this.cursor?.row) ? this.cursor.row : rows[0] || 1;
    const col = Math.max(1, Math.min(chart.width, this.cursor?.col || 1));
    this.cursor = { row, col };
    this.color = chart.palette.some((entry) => entry.id === this.color) ? this.color : null;
    this.emit("chart");
    this.emit("history");
    this.emit("saved");
  }

  /** Change the title as part of the current gesture. */
  setTitle(value) {
    if (this.chart.title === value) return;
    this.chart.title = value;
    this.touch();
  }

  setTool(tool) {
    if (this.tool === tool) return;
    this.tool = tool;
    this.emit("tool");
  }

  setSymbol(symbol) {
    this.symbol = symbol;
    this.emit("symbol");
  }

  setColor(color) {
    const next = color !== null && this.chart.palette.some((entry) => entry.id === color)
      ? color
      : null;
    if (this.color === next) return;
    this.color = next;
    this.emit("color");
  }

  setSelection(selection) {
    this.selection = selection;
    this.selectedGroupId = null;
    this.headerSelection = null;
    this.emit("selection");
  }

  selectGroup(groupId) {
    this.selectedGroupId = groupId;
    this.selection = null;
    this.headerSelection = null;
    this.emit("selection");
  }

  setHeaderSelection(headerSelection) {
    this.headerSelection = headerSelection;
    this.selection = null;
    this.selectedGroupId = null;
    this.emit("header");
  }

  setHover(hover) {
    const same = (this.hover?.row === hover?.row && this.hover?.col === hover?.col);
    if (same) return;
    this.hover = hover;
    this.emit("hover");
  }

  setCursor(cursor) {
    this.cursor = cursor;
    this.emit("cursor");
  }

  setView(view) {
    this.view = view;
    this.emit("view");
  }

  /**
   * Confirm that a specific revision was persisted. A save that finished
   * after newer edits must not clear the dirty state.
   */
  markSaved(revision = this.revision, documentId = this.chart.id) {
    if (documentId !== this.chart.id) return false;
    if (revision !== this.revision) return false;
    this.dirty = false;
    this.savedRevision = revision;
    this.savedAt = new Date();
    this.emit("saved");
    return true;
  }
}
