import test from "node:test";
import assert from "node:assert/strict";
import { SaveCoordinator } from "../src/ui/save-coordinator.js";

function fakeStore(id = "A") {
  return {
    chart: { id, title: "A" },
    revision: 0,
    dirty: true,
    saved: [],
    markSaved(revision, documentId) {
      if (documentId !== this.chart.id) return false;
      if (revision !== this.revision) return false;
      this.dirty = false;
      this.saved.push({ revision, documentId });
      return true;
    }
  };
}

test("save confirms only the written revision", async () => {
  const store = fakeStore();
  let release;
  const calls = [];
  const queued = [];
  const saved = [];
  const coordinator = new SaveCoordinator({
    getStore: () => store,
    saveChart: (chart) => {
      calls.push(chart);
      return new Promise((resolve) => { release = resolve; });
    },
    onSaved: (info) => saved.push(info),
    onQueued: (info) => queued.push(info)
  });

  const pending = coordinator.save();
  store.revision = 1;
  store.chart.title = "edited while saving";
  release();
  assert.equal(await pending, false);
  assert.equal(calls.length, 1);
  assert.equal(saved.length, 0);
  assert.equal(queued.length, 1);
  assert.equal(store.dirty, true);
});

test("a save request during a save is queued, not dropped", async () => {
  const store = fakeStore();
  const releases = [];
  let calls = 0;
  const coordinator = new SaveCoordinator({
    getStore: () => store,
    saveChart: () => {
      calls += 1;
      return new Promise((resolve) => releases.push(resolve));
    }
  });

  const first = coordinator.save();
  const second = coordinator.save();
  assert.equal(calls, 1);
  releases[0]();
  assert.equal(await first, true);
  assert.equal(await second, true);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(calls, 2);
  releases[1]?.();
});

test("a save cannot mark a different document clean", async () => {
  const store = fakeStore("A");
  let release;
  const saved = [];
  const coordinator = new SaveCoordinator({
    getStore: () => store,
    saveChart: () => new Promise((resolve) => { release = resolve; }),
    onSaved: (info) => saved.push(info)
  });

  const pending = coordinator.save();
  store.chart = { id: "B", title: "B" };
  release();
  assert.equal(await pending, false);
  assert.equal(store.dirty, true);
  assert.equal(saved.length, 0);
});
