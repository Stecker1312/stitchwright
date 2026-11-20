import test from "node:test";
import assert from "node:assert/strict";

import {
  CABLE_PRESETS,
  SYMBOLS,
  cableGlyph,
  glyphFor,
  groupLegend,
  isGroupSymbol,
  symbolSpan
} from "../src/core/symbols.js";

test("every symbol has a name, legend and glyph or renderer", () => {
  for (const [id, symbol] of Object.entries(SYMBOLS)) {
    assert.equal(typeof symbol.name.de, "string", `${id} name.de`);
    assert.equal(typeof symbol.name.en, "string", `${id} name.en`);
    assert.equal(typeof symbol.legend.de, "string", `${id} legend.de`);
    const glyph = glyphFor(id, id === "cable" ? { left: 2, right: 2, direction: "front" } : id === "custom" ? { span: 3, label: "TL" } : {});
    assert.ok(glyph.length > 0, `${id} has a glyph`);
  }
});

test("spans are correct", () => {
  assert.equal(symbolSpan("p"), 1);
  assert.equal(symbolSpan("k2tog"), 2);
  assert.equal(symbolSpan("k3tog"), 3);
  assert.equal(symbolSpan("ptbl"), 1);
  assert.equal(symbolSpan("slipw"), 1);
  assert.equal(symbolSpan("p2tog"), 2);
  assert.equal(symbolSpan("ssp"), 2);
  assert.equal(symbolSpan("cable", { left: 3, right: 2 }), 5);
  assert.equal(symbolSpan("custom", { span: 4 }), 4);
  assert.equal(isGroupSymbol("p"), false);
  assert.equal(isGroupSymbol("k2tog"), true);
  assert.equal(isGroupSymbol("cable"), true);
});

test("constructive cable glyph has two lines and one halo", () => {
  const glyph = cableGlyph({ left: 2, right: 2, direction: "front" });
  const strands = glyph.filter((item) => item.type === "path" && !item.halo);
  const halos = glyph.filter((item) => item.halo);
  assert.equal(strands.length, 2);
  assert.equal(halos.length, 1);
});

test("cable direction changes which line is continuous", () => {
  const front = cableGlyph({ left: 2, right: 2, direction: "front" });
  const back = cableGlyph({ left: 2, right: 2, direction: "back" });
  assert.notDeepEqual(front, back);
});

test("cable front keeps the falling line continuous", () => {
  const front = cableGlyph({ left: 2, right: 2, direction: "front" }).filter((item) => !item.halo);
  const back = cableGlyph({ left: 2, right: 2, direction: "back" }).filter((item) => !item.halo);
  assert.match(front[1].d, /^M0\.18 0\.2/);
  assert.match(back[1].d, /^M0\.18 0\.8/);
});

test("cable presets are valid", () => {
  for (const preset of CABLE_PRESETS) {
    assert.ok(preset.left >= 1);
    assert.ok(preset.right >= 1);
    assert.ok(preset.direction === "front" || preset.direction === "back");
    assert.ok(glyphFor("cable", preset).length > 0);
  }
});

test("group legends describe cables in both languages", () => {
  const group = { symbol: "cable", left: 2, right: 2, direction: "front" };
  assert.match(groupLegend(group, "de"), /2\/2/);
  assert.match(groupLegend(group, "de"), /vorne/);
  assert.match(groupLegend(group, "en"), /front/);
});

test("custom group legends include the user's explanation", () => {
  const group = { symbol: "custom", label: "TL", legend: "zwei Maschen vor die Arbeit" };
  assert.match(groupLegend(group, "de"), /^TL: zwei Maschen/);
  assert.match(groupLegend(group, "en"), /^TL: zwei Maschen/);
});
