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

test("decrease glyphs span the stitches they consume", () => {
  for (const id of ["k2tog", "ssk", "p2tog", "ssp", "k3tog", "sk2p", "cdd"]) {
    const span = symbolSpan(id);
    const glyph = glyphFor(id);
    const xs = [];
    for (const primitive of glyph) {
      if (primitive.type === "path") {
        for (const match of primitive.d.matchAll(/(-?\d*\.?\d+) (-?\d*\.?\d+)/g)) {
          xs.push(Number(match[1]));
        }
      } else if (primitive.type === "circle") {
        xs.push(primitive.cx - primitive.r, primitive.cx + primitive.r);
      }
    }
    assert.ok(xs.length > 0, `${id} has coordinates`);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    assert.ok(minX >= -0.05, `${id} starts at ${minX}`);
    assert.ok(maxX >= span - 0.2, `${id} reaches ${maxX}, span ${span}`);
    assert.ok(maxX <= span + 0.05, `${id} ends at ${maxX}, span ${span}`);
  }
});

test("constructive symmetric cable has two lines and one halo", () => {
  const glyph = cableGlyph({ left: 2, right: 2, direction: "front" });
  const strands = glyph.filter((item) => item.type === "path" && !item.halo);
  const halos = glyph.filter((item) => item.halo);
  assert.equal(strands.length, 2);
  assert.equal(halos.length, 1);
});

test("asymmetric cable keeps the front band continuous and draws one short back leg", () => {
  const glyph = cableGlyph({ left: 1, right: 2, direction: "back" });
  assert.equal(glyph.length, 2);
  assert.equal(glyph.some((item) => item.halo), false);
  const [back, front] = glyph;
  assert.equal(front.d, "M0.18 0.8 L2.82 0.2");
  assert.match(back.d, /^M2\.82 0\.8 L2\.2 0\.34/);
});

test("asymmetric cable mirrors with the direction", () => {
  const back = cableGlyph({ left: 2, right: 1, direction: "back" });
  const front = cableGlyph({ left: 2, right: 1, direction: "front" });
  assert.equal(back[1].d, "M0.18 0.8 L2.82 0.2");
  assert.equal(front[1].d, "M0.18 0.2 L2.82 0.8");
  assert.match(back[0].d, /^M2\.82 0\.8 L2\.2 0\.34/);
  assert.match(front[0].d, /^M0\.18 0\.8 L0\.8 0\.34/);
});

test("asymmetric cable counts do not add extra lines", () => {
  for (const [left, right] of [[1, 2], [2, 1], [1, 3], [3, 1], [2, 3], [3, 2]]) {
    const glyph = cableGlyph({ left, right, direction: "back" });
    assert.equal(glyph.filter((item) => item.type === "path").length, 2, `${left}/${right}`);
  }
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

test("the turn is in the palette; edge-only glyphs stay hidden", () => {
  assert.notEqual(SYMBOLS.shortrow.hidden, true);
  assert.ok(glyphFor("shortrow").length > 0);
  for (const id of ["bindoff", "caston"]) {
    assert.equal(SYMBOLS[id].hidden, true, `${id} is hidden`);
    assert.ok(glyphFor(id).length > 0, `${id} still renders for old charts`);
  }
  assert.notEqual(SYMBOLS.nostitch.hidden, true);
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
  assert.equal(groupLegend(group, "de"), "Zopf 2/2: 2 Maschen vorne");
  assert.equal(groupLegend(group, "en"), "Cable 2/2: 2 held front");
});

test("asymmetric cable legends use front/back counts and name the held side", () => {
  const back = { symbol: "cable", left: 2, right: 1, direction: "back" };
  assert.equal(groupLegend(back, "en"), "Cable 2/1: 1 held back");
  assert.equal(groupLegend(back, "de"), "Zopf 2/1: 1 Masche hinten");

  const front = { symbol: "cable", left: 2, right: 1, direction: "front" };
  assert.equal(groupLegend(front, "en"), "Cable 1/2: 1 held front");
  assert.equal(groupLegend(front, "de"), "Zopf 1/2: 1 Masche vorne");

  const twoFront = { symbol: "cable", left: 1, right: 2, direction: "front" };
  assert.equal(groupLegend(twoFront, "en"), "Cable 2/1: 2 held front");
});

test("custom group legends include the user's explanation", () => {
  const group = { symbol: "custom", label: "TL", legend: "zwei Maschen vor die Arbeit" };
  assert.match(groupLegend(group, "de"), /^TL: zwei Maschen/);
  assert.match(groupLegend(group, "en"), /^TL: zwei Maschen/);
});
