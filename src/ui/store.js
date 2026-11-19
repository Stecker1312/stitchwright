/**
 * Editor state and undo history.
 *
 * The chart itself is plain JSON and is mutated in place for speed. A
 * transaction stores a deep copy before the change. For large charts the
 * history budget is reduced automatically, so the browser does not run out of
 * memory after a long drawing session.
 */

import { cloneChart } from "../core/chart.js";

const HISTORY_BUDGET_BYTES = 40 * 1024 * 1024;
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
    this.dirty = false;
    this.savedAt = null;
    this.undoStack = [];
    this.redoStack = [];
    this.pending = null;
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(type, detail = {}) {
    this.listeners.forEach((listener) => listener(type, detail));
  }

  /** Start a multi-step gesture. The undo snapshot is taken immediately. */
  begin(label) {
    this.pending = { label, before: cloneChart(this.chart) };
    this.pendingChanged = false;
  }

  /** Mark that the current gesture changed something. */
  touch() {
    if (this.pending) this.pendingChanged = true;
    this.dirty = true;
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

  /** A single, atomic edit. The callback mutates `this.chart`. */
  edit(label, callback) {
    const before = cloneChart(this.chart);
    try {
      const result = callback(this.chart);
      if (result === false) {
        this.chart = before;
        return false;
      }
      this.pushUndo({ label, before });
      this.redoStack = [];
      this.dirty = true;
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
    const size = JSON.stringify(entry.before).length;
    const limit = Math.max(5, Math.min(MAX_HISTORY, Math.floor(HISTORY_BUDGET_BYTES / Math.max(1, size))));
    this.undoStack.push(entry);
    while (this.undoStack.length > limit) this.undoStack.shift();
  }

  undo() {
    if (this.pending) this.commit();
    const entry = this.undoStack.pop();
    if (!entry) return false;
    this.redoStack.push({ label: entry.label, before: cloneChart(this.chart) });
    this.chart = entry.before;
    this.dirty = true;
    this.selectedGroupId = null;
    this.selection = null;
    this.headerSelection = null;
    this.emit("chart");
    this.emit("history");
    return true;
  }

  redo() {
    const entry = this.redoStack.pop();
    if (!entry) return false;
    this.pushUndo({ label: entry.label, before: cloneChart(this.chart) });
    this.chart = entry.before;
    this.dirty = true;
    this.selectedGroupId = null;
    this.selection = null;
    this.headerSelection = null;
    this.emit("chart");
    this.emit("history");
    return true;
  }

  replace(chart, { history = false, label = "Replace chart" } = {}) {
    if (history) {
      this.pushUndo({ label, before: cloneChart(this.chart) });
      this.redoStack = [];
    }
    this.chart = chart;
    this.selection = null;
    this.selectedGroupId = null;
    this.headerSelection = null;
    this.dirty = false;
    this.savedAt = null;
    this.emit("chart");
    this.emit("history");
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
    this.color = color;
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

  markSaved() {
    this.dirty = false;
    this.savedAt = new Date();
    this.emit("saved");
  }
}
