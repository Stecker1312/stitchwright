/**
 * Save coordinator.
 *
 * The UI may ask to save while an older save is still running, or while the
 * user keeps editing. This module owns that lifecycle:
 *
 * - a save writes one immutable snapshot;
 * - only that snapshot's document and revision may become clean;
 * - a request during a save is queued, not dropped;
 * - autosave timers are bound to one document.
 */

import { cloneChart } from "../core/chart.js";

export class SaveCoordinator {
  constructor({
    getStore,
    saveChart,
    isAutosaveEnabled = () => true,
    onSaved = () => {},
    onError = () => {},
    onQueued = () => {},
    delay = 700
  }) {
    this.getStore = getStore;
    this.saveChart = saveChart;
    this.isAutosaveEnabled = isAutosaveEnabled;
    this.onSaved = onSaved;
    this.onError = onError;
    this.onQueued = onQueued;
    this.delay = delay;
    this.inFlight = null;
    this.again = false;
    this.timer = null;
    this.targetId = null;
  }

  get busy() {
    return Boolean(this.inFlight);
  }

  /** Wait for the current save, if any. */
  async wait() {
    if (!this.inFlight) return true;
    return this.inFlight;
  }

  /**
   * Save the current snapshot. Returns true only when the exact revision
   * written by this call is still the active revision afterwards.
   */
  async save({ silent = false } = {}) {
    const store = this.getStore();
    if (!store) return false;
    if (this.inFlight) {
      this.again = true;
      return this.inFlight;
    }

    const documentId = store.chart.id;
    const revision = store.revision;
    const snapshot = cloneChart(store.chart);

    this.inFlight = (async () => {
      try {
        await this.saveChart(snapshot);
        const current = store.markSaved(revision, documentId);
        if (current) {
          this.onSaved({ documentId, revision, silent });
        } else if (store.chart.id === documentId && store.dirty) {
          this.onQueued({ documentId, revision });
        }
        return current;
      } catch (error) {
        this.onError(error, silent);
        return false;
      } finally {
        this.inFlight = null;
        if (this.again) {
          this.again = false;
          queueMicrotask(() => this.save({ silent: true }));
        }
      }
    })();

    return this.inFlight;
  }

  /** Schedule an autosave for the current document. */
  schedule() {
    if (!this.isAutosaveEnabled()) return;
    const store = this.getStore();
    if (!store) return;
    this.cancel();
    this.targetId = store.chart.id;
    this.timer = setTimeout(() => {
      const current = this.getStore();
      if (current && current.chart.id === this.targetId) this.save({ silent: true });
    }, this.delay);
  }

  /** Cancel a pending autosave. A running save is not interrupted. */
  cancel() {
    clearTimeout(this.timer);
    this.timer = null;
    this.targetId = null;
  }
}
