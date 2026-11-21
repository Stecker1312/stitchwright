import test from "node:test";
import assert from "node:assert/strict";

import {
  MAX_CUSTOM_CABLES,
  cableKey,
  customCablesFromChart,
  isPresetCable,
  mergeCustomCables,
  normalizeCustomCable
} from "../src/ui/custom-cables.js";

test("a custom cable needs two positive counts and a direction", () => {
  assert.deepEqual(
    normalizeCustomCable({ left: 3, right: 2, direction: "back" }),
    { left: 3, right: 2, direction: "back" }
  );
  assert.deepEqual(
    normalizeCustomCable({ left: "3", right: "2", direction: "front" }),
    { left: 3, right: 2, direction: "front" }
  );
  assert.equal(normalizeCustomCable({ left: 0, right: 2, direction: "front" }), null);
  assert.equal(normalizeCustomCable({ left: 2, right: 13, direction: "front" }), null);
  assert.equal(normalizeCustomCable({ left: 2.5, right: 2, direction: "front" }), null);
  assert.equal(normalizeCustomCable({ left: 2, right: 2, direction: "sideways" }), null);
  assert.equal(normalizeCustomCable(null), null);
});

test("the built-in presets do not need a library entry", () => {
  assert.equal(isPresetCable({ left: 2, right: 2, direction: "front" }), true);
  assert.equal(isPresetCable({ left: 4, right: 4, direction: "back" }), true);
  assert.equal(isPresetCable({ left: 3, right: 2, direction: "front" }), false);
});

test("merging keeps one entry per cable and preserves order", () => {
  const merged = mergeCustomCables(
    [{ left: 3, right: 2, direction: "front" }],
    [
      { left: 3, right: 2, direction: "front" },
      { left: 2, right: 1, direction: "back" }
    ]
  );
  assert.deepEqual(merged, [
    { left: 3, right: 2, direction: "front" },
    { left: 2, right: 1, direction: "back" }
  ]);
  assert.equal(cableKey(merged[0]), "3/2/front");
});

test("presets and invalid cables are not stored", () => {
  const merged = mergeCustomCables([], [
    { left: 2, right: 2, direction: "front" },
    { left: 4, right: 4, direction: "back" },
    { left: 0, right: 2, direction: "front" },
    { left: 3, right: 2, direction: "back" }
  ]);
  assert.deepEqual(merged, [{ left: 3, right: 2, direction: "back" }]);
});

test("the library keeps the newest entries when it is full", () => {
  const cables = Array.from({ length: MAX_CUSTOM_CABLES + 2 }, (_, index) => ({
    left: 1 + (index % 12),
    right: 1 + Math.floor(index / 12),
    direction: "front"
  }));
  const merged = mergeCustomCables([], cables);
  assert.equal(merged.length, MAX_CUSTOM_CABLES);
  assert.deepEqual(merged.at(-1), cables.at(-1));
  assert.equal(mergeCustomCables([], cables, { limit: 2 }).length, 2);
  assert.deepEqual(mergeCustomCables([], cables, { limit: 0 }), []);
});

test("cables placed in an opened chart become reusable", () => {
  const cables = customCablesFromChart({
    groups: [
      { symbol: "cable", left: 3, right: 2, direction: "back" },
      { symbol: "cable", left: 2, right: 2, direction: "front" },
      { symbol: "custom", span: 3, label: "TL" },
      { symbol: "cable", left: 0, right: 2, direction: "front" }
    ]
  });
  assert.deepEqual(cables, [
    { left: 3, right: 2, direction: "back" }
  ]);
  assert.deepEqual(customCablesFromChart(null), []);
});
