/**
 * The "Clear" symbol pack (German: "Klar").
 *
 * A symbol is described once and drawn by two renderers:
 *   - Canvas for the editor viewport (fast, only visible cells).
 *   - SVG for export and for the Node CLI (crisp, printable).
 *
 * Glyph coordinates are measured in cells, not pixels:
 *   x runs from 0 to `span`, y runs from 0 to 1.
 * That makes a two-stitch decrease span two cells without scaling tricks.
 *
 * Primitives are intentionally simple. They are data, not code, so a future
 * symbol-pack editor can read and write the same structure.
 */

/** Visual constants. Keep them in one place so the pack stays coherent. */
const STROKE = 0.09;
const ARROW_HEAD = 0.16;
const ARROW_SPREAD = Math.PI / 6;

/** A straight line primitive. */
function line(x1, y1, x2, y2, extra = {}) {
  return { type: "line", x1, y1, x2, y2, width: STROKE, stroke: true, ...extra };
}

/** A path primitive. `d` uses the same cell coordinate system. */
function path(d, extra = {}) {
  return { type: "path", d, stroke: true, fill: false, width: STROKE, ...extra };
}

/** A circle primitive. Set `fill: true` for a solid dot. */
function circle(cx, cy, r, extra = {}) {
  return {
    type: "circle",
    cx,
    cy,
    r,
    stroke: !extra.fill,
    fill: Boolean(extra.fill),
    width: STROKE,
    ...extra
  };
}

/** A text primitive, used only for custom labelled groups. */
function text(x, y, value, size = 0.38, extra = {}) {
  return {
    type: "text",
    x,
    y,
    value,
    size,
    anchor: "middle",
    weight: 600,
    ...extra
  };
}

/** Two short lines forming an arrow head at (x, y), pointing along `angle`. */
function arrowHead(x, y, angle, size = ARROW_HEAD) {
  return [
    line(
      x,
      y,
      x - size * Math.cos(angle - ARROW_SPREAD),
      y - size * Math.sin(angle - ARROW_SPREAD)
    ),
    line(
      x,
      y,
      x - size * Math.cos(angle + ARROW_SPREAD),
      y - size * Math.sin(angle + ARROW_SPREAD)
    )
  ];
}

/** A line with an arrow head at the end. Used for increases and decreases. */
function arrow(x1, y1, x2, y2, width = STROKE) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  return [line(x1, y1, x2, y2, { width }), ...arrowHead(x2, y2, angle)];
}

/**
 * A cable is an open crossing of two bands.
 *
 * Symmetric cables keep the full X from study C: the front band is continuous,
 * the back band is broken at the crossing by a paper-coloured halo.
 *
 * Asymmetric cables show the bundle behind as a short leg only. The front band
 * still runs across the whole group; the back leg rises from the outer bottom
 * corner on its side and joins the front band. That matches the hand sketch for
 * 1/2 and 2/1 cables and keeps the glyph readable at small sizes. The stitch
 * counts live in the legend, not in extra lines.
 */
export function cableGlyph({ left, right, direction = "front" }) {
  if (!Number.isInteger(left) || !Number.isInteger(right) || left < 1 || right < 1) {
    throw new Error("cable: left and right must be positive integers");
  }
  if (direction !== "front" && direction !== "back") {
    throw new Error("cable: direction must be front or back");
  }

  const span = left + right;
  const x1 = 0.18;
  const x2 = span - 0.18;
  const yTop = 0.2;
  const yBottom = 0.8;
  const rising = path(`M${x1} ${yBottom} L${x2} ${yTop}`, { width: 0.065 });
  const falling = path(`M${x1} ${yTop} L${x2} ${yBottom}`, { width: 0.065 });
  const front = direction === "front" ? falling : rising;

  if (left !== right) {
    // The right bundle lies behind when the direction is "back"; for "front"
    // the left bundle is behind. Its visible tail has a short fixed length,
    // so even a wide bundle reads as a leg behind the front band.
    const tail = 0.8;
    const behindOnRight = direction === "back";
    const outerX = behindOnRight ? x2 : x1;
    const branchX = behindOnRight ? span - tail : tail;
    const t = (branchX - x1) / (x2 - x1);
    const branchY = direction === "back"
      ? yBottom + (yTop - yBottom) * t
      : yTop + (yBottom - yTop) * t;
    const back = path(`M${outerX} ${yBottom} L${branchX} ${branchY}`, { width: 0.065 });
    return [back, front];
  }

  const back = direction === "front" ? rising : falling;
  return [
    back,
    { ...front, width: 0.32, halo: true },
    front
  ];
}

/** A labelled rectangle for techniques that have no dedicated glyph. */
function customGlyph({ label = "", span = 1 }) {
  const safeLabel = String(label || "").slice(0, 24);
  const size = Math.min(0.42, (span * 0.72) / Math.max(1, safeLabel.length) * 0.62);
  return [
    {
      type: "rect",
      x: 0.07,
      y: 0.12,
      w: span - 0.14,
      h: 0.76,
      rx: 0.08,
      width: 0.045,
      stroke: true
    },
    text(span / 2, 0.58, safeLabel, size)
  ];
}

/** The individual symbols. Order is the palette order. */
const DEFINITIONS = Object.assign(Object.create(null), {
  p: {
    id: "p",
    category: "basic",
    span: 1,
    name: { de: "links", en: "purl" },
    description: { de: "Linke Masche auf der Außenseite.", en: "Purl on the right side." },
    legend: { de: "li", en: "p" },
    glyph: [circle(0.5, 0.5, 0.09, { fill: true })]
  },
  yo: {
    id: "yo",
    category: "basic",
    span: 1,
    name: { de: "Umschlag", en: "yarn over" },
    description: { de: "Ein Umschlag ergibt ein Loch im Gestrick.", en: "A yarn over creates an eyelet." },
    legend: { de: "Umschlag", en: "yo" },
    glyph: [circle(0.5, 0.5, 0.22)]
  },
  m1l: {
    id: "m1l",
    category: "increase",
    span: 1,
    name: { de: "M1L", en: "make one left" },
    description: { de: "Links geneigte Zunahme aus dem Querfaden.", en: "Left-leaning increase from the bar." },
    legend: { de: "links geneigt", en: "left-leaning" },
    glyph: arrow(0.56, 0.84, 0.32, 0.2)
  },
  m1r: {
    id: "m1r",
    category: "increase",
    span: 1,
    name: { de: "M1R", en: "make one right" },
    description: { de: "Rechts geneigte Zunahme aus dem Querfaden.", en: "Right-leaning increase from the bar." },
    legend: { de: "rechts geneigt", en: "right-leaning" },
    glyph: arrow(0.44, 0.84, 0.68, 0.2)
  },
  kfb: {
    id: "kfb",
    category: "increase",
    span: 1,
    name: { de: "kfb", en: "knit front and back" },
    description: { de: "Aus einer Masche werden zwei.", en: "One stitch becomes two." },
    legend: { de: "vorn und hinten", en: "front and back" },
    glyph: [
      path("M0.5 0.86 L0.5 0.52"),
      path("M0.5 0.52 L0.27 0.2"),
      path("M0.5 0.52 L0.73 0.2")
    ]
  },
  tbl: {
    id: "tbl",
    category: "basic",
    span: 1,
    name: { de: "verschränkt", en: "twisted" },
    description: { de: "Masche verschränkt abstricken.", en: "Work the stitch through the back loop." },
    legend: { de: "verschränkt", en: "twisted" },
    glyph: [path("M0.28 0.2 L0.56 0.82"), path("M0.72 0.2 L0.44 0.82")]
  },
  slip: {
    id: "slip",
    category: "basic",
    span: 1,
    name: { de: "abheben", en: "slip" },
    description: { de: "Masche ungestrickt auf die rechte Nadel heben.", en: "Move a stitch without working it." },
    legend: { de: "abheben", en: "slip" },
    glyph: [
      path("M0.4 0.78 C0.2 0.6 0.25 0.25 0.5 0.25 C0.75 0.25 0.78 0.6 0.58 0.72"),
      ...arrow(0.58, 0.72, 0.82, 0.6)
    ]
  },
  bobble: {
    id: "bobble",
    category: "texture",
    span: 1,
    name: { de: "Bobbel", en: "bobble" },
    description: { de: "Eine kleine Wollkugel als Noppe.", en: "A small knitted bobble." },
    legend: { de: "Noppe", en: "bobble" },
    glyph: [
      circle(0.5, 0.5, 0.2),
      path("M0.5 0.5 C0.38 0.4 0.4 0.6 0.5 0.62 C0.62 0.64 0.62 0.36 0.5 0.36")
    ]
  },
  bead: {
    id: "bead",
    category: "texture",
    span: 1,
    name: { de: "Perle", en: "bead" },
    description: { de: "Eine Perle wird mit eingestrickt.", en: "A bead is knitted in." },
    legend: { de: "Perle", en: "bead" },
    glyph: [
      path("M0.5 0.24 L0.76 0.5 L0.5 0.76 L0.24 0.5 Z"),
      circle(0.5, 0.5, 0.05, { fill: true })
    ]
  },
  nostitch: {
    id: "nostitch",
    category: "utility",
    span: 1,
    name: { de: "keine Masche", en: "no stitch" },
    description: { de: "Hier existiert keine Masche; das Feld bleibt leer.", en: "No stitch exists here." },
    legend: { de: "keine Masche", en: "no stitch" },
    glyph: [
      line(0.3, 0.3, 0.7, 0.7, { width: 0.055 }),
      line(0.7, 0.3, 0.3, 0.7, { width: 0.055 })
    ]
  },
  shortrow: {
    id: "shortrow",
    hidden: true,
    category: "utility",
    span: 1,
    name: { de: "Wende", en: "short row turn" },
    description: { de: "Die Arbeit wenden; eine verkürzte Reihe beginnt.", en: "Turn the work for a short row." },
    legend: { de: "wenden", en: "turn" },
    glyph: [
      path("M0.25 0.76 L0.25 0.32 Q0.5 0.1 0.75 0.32 L0.75 0.62"),
      ...arrowHead(0.75, 0.62, Math.PI / 2)
    ]
  },
  bindoff: {
    id: "bindoff",
    hidden: true,
    category: "utility",
    span: 1,
    name: { de: "abketten", en: "bind off" },
    description: { de: "Maschen abketten; die Kante ist fertig.", en: "Bind off; the edge is finished." },
    legend: { de: "abketten", en: "bind off" },
    glyph: [line(0.12, 0.12, 0.88, 0.12, { width: 0.18 })]
  },
  caston: {
    id: "caston",
    hidden: true,
    category: "utility",
    span: 1,
    name: { de: "anschlagen", en: "cast on" },
    description: { de: "Maschen anschlagen; hier beginnt das Gestrick.", en: "Cast on; the knitting starts here." },
    legend: { de: "anschlagen", en: "cast on" },
    glyph: [line(0.12, 0.88, 0.88, 0.88, { width: 0.18 })]
  },
  k2tog: {
    id: "k2tog",
    category: "decrease",
    span: 2,
    name: { de: "k2tog", en: "knit two together" },
    description: { de: "Zwei Maschen rechts zusammenstricken; die Masche neigt nach rechts.", en: "Knit two together; the stitch leans right." },
    legend: { de: "rechts geneigt", en: "right-leaning" },
    glyph: arrow(0.15, 0.82, 1.85, 0.18)
  },
  ssk: {
    id: "ssk",
    category: "decrease",
    span: 2,
    name: { de: "ssk", en: "slip, slip, knit" },
    description: { de: "Zwei Maschen links geneigt zusammenstricken.", en: "Two stitches lean left." },
    legend: { de: "links geneigt", en: "left-leaning" },
    glyph: arrow(1.85, 0.82, 0.15, 0.18)
  },
  k3tog: {
    id: "k3tog",
    category: "decrease",
    span: 3,
    name: { de: "k3tog", en: "knit three together" },
    description: { de: "Drei Maschen rechts zusammenstricken; die Masche neigt nach rechts.", en: "Knit three together; the stitch leans right." },
    legend: { de: "rechts geneigt", en: "right-leaning" },
    glyph: [
      ...arrow(1.5, 0.85, 2.65, 0.18),
      line(0.35, 0.85, 2.65, 0.18),
      line(2.65, 0.85, 2.65, 0.18)
    ]
  },
  sk2p: {
    id: "sk2p",
    category: "decrease",
    span: 3,
    name: { de: "sk2p", en: "slip, knit two together, pass" },
    description: { de: "Drei Maschen links geneigt zusammenstricken.", en: "Three stitches lean left." },
    legend: { de: "links geneigt", en: "left-leaning" },
    glyph: [
      ...arrow(1.5, 0.85, 0.35, 0.18),
      line(2.65, 0.85, 0.35, 0.18),
      line(0.35, 0.85, 0.35, 0.18)
    ]
  },
  cdd: {
    id: "cdd",
    category: "decrease",
    span: 3,
    name: { de: "mittige Abnahme", en: "centred double decrease" },
    description: { de: "Drei Maschen zu einer mittigen Masche zusammenstricken.", en: "Three stitches become one centred stitch." },
    legend: { de: "mittig", en: "centred" },
    glyph: [
      line(0.35, 0.85, 1.5, 0.18),
      line(2.65, 0.85, 1.5, 0.18),
      ...arrow(1.5, 0.85, 1.5, 0.18)
    ]
  },
  cable: {
    id: "cable",
    category: "cable",
    span: null,
    group: true,
    name: { de: "Zopf", en: "cable" },
    description: { de: "Zwei Stränge kreuzen sich; die Zahl der Einzelstränge zählt die Maschen.", en: "Two bundles cross; the number of strands counts the stitches." },
    legend: { de: "Zopf", en: "cable" },
    render: cableGlyph
  },
  custom: {
    id: "custom",
    category: "utility",
    span: null,
    group: true,
    name: { de: "eigene Gruppe", en: "custom group" },
    description: { de: "Beschriftete Gruppe für Sonderfälle.", en: "Labelled group for special cases." },
    legend: { de: "eigene Gruppe", en: "custom group" },
    render: customGlyph
  }
});

/**
 * Constructive default glyphs (study C, 2026-11-20).
 *
 * Thin converging lines, open crossings and no decorative fills except the
 * purl dot, the bobble and the "no stitch" paper. The old Clear glyphs stay in
 * the history, but these overrides are the standard the app draws.
 */
const C_GLYPHS = {
  p: [circle(0.5, 0.5, 0.075, { fill: true })],
  yo: [circle(0.5, 0.5, 0.215, { width: 0.055 })],
  k2tog: [path("M.22 .79 L.72 .23 M.72 .79 V.23", { width: 0.052 })],
  ssk: [path("M.78 .79 L.28 .23 M.28 .79 V.23", { width: 0.052 })],
  cdd: [path("M.2 .79 L.5 .23 L.8 .79 M.5 .23 V.79", { width: 0.052 })],
  m1l: [path("M.68 .8 L.48 .47 V.21 M.48 .47 L.22 .21 M.48 .47 V.8", { width: 0.052 })],
  m1r: [path("M.32 .8 L.52 .47 V.21 M.52 .47 L.78 .21 M.52 .47 V.8", { width: 0.052 })],
  kfb: [path("M.5 .8 V.48 M.23 .21 V.32 L.5 .48 L.77 .32 V.21", { width: 0.052 })],
  tbl: [path("M.28 .21 L.72 .79 M.72 .21 L.28 .79", { width: 0.052 })],
  ptbl: [
    path("M.28 .21 L.72 .79 M.72 .21 L.28 .79", { width: 0.052 }),
    circle(0.79, 0.76, 0.058, { fill: true })
  ],
  slip: [path("M.33 .23 V.7 H.67 V.23", { width: 0.052 })],
  slipw: [
    path("M.33 .23 V.7 H.67 V.23", { width: 0.052 }),
    line(0.22, 0.81, 0.78, 0.81, { width: 0.055 })
  ],
  p2tog: [
    path("M.22 .79 L.72 .23 M.72 .79 V.23", { width: 0.052 }),
    circle(0.23, 0.31, 0.058, { fill: true })
  ],
  ssp: [
    path("M.78 .79 L.28 .23 M.28 .79 V.23", { width: 0.052 }),
    circle(0.77, 0.31, 0.058, { fill: true })
  ],
  k3tog: [path("M.2 .79 L.77 .21 M.49 .79 L.77 .21 M.77 .79 V.21", { width: 0.052 })],
  sk2p: [path("M.8 .79 L.23 .21 M.51 .79 L.23 .21 M.23 .79 V.21", { width: 0.052 })],
  bobble: [{
    type: "path",
    d: "M.5 .2 L.8 .5 L.5 .8 L.2 .5 Z",
    fill: true,
    stroke: false,
    width: 0.055
  }],
  bead: [
    path("M.5 .2 L.8 .5 L.5 .8 L.2 .5 Z", { width: 0.052 }),
    circle(0.5, 0.5, 0.05, { fill: true })
  ],
  nostitch: [{
    type: "rect",
    x: 0,
    y: 0,
    w: 1,
    h: 1,
    rx: 0,
    fill: "#d9ddda",
    stroke: false,
    width: 0
  }],
  shortrow: [path("M.28 .8 V.32 Q.5 .1 .72 .32 V.62", { width: 0.052 })],
  bindoff: [line(0.2, 0.3, 0.8, 0.3, { width: 0.12 })],
  caston: [line(0.2, 0.7, 0.8, 0.7, { width: 0.12 })]
};

for (const [id, glyph] of Object.entries(C_GLYPHS)) {
  if (DEFINITIONS[id]) DEFINITIONS[id].glyph = glyph;
}

Object.assign(DEFINITIONS, {
  ptbl: {
    id: "ptbl",
    category: "basic",
    span: 1,
    name: { de: "links verschränkt", en: "purl twisted" },
    description: { de: "Linke Masche verschränkt abstricken.", en: "Purl through the back loop." },
    legend: { de: "li verschränkt", en: "purl twisted" },
    glyph: C_GLYPHS.ptbl
  },
  slipw: {
    id: "slipw",
    category: "basic",
    span: 1,
    name: { de: "abheben, Faden vorne", en: "slip, yarn in front" },
    description: { de: "Masche abheben, den Faden vor die Arbeit legen.", en: "Slip a stitch with the yarn in front." },
    legend: { de: "abheben, Faden vorne", en: "slip, yarn in front" },
    glyph: C_GLYPHS.slipw
  },
  p2tog: {
    id: "p2tog",
    category: "decrease",
    span: 2,
    name: { de: "p2tog", en: "purl two together" },
    description: { de: "Zwei Maschen links zusammenstricken.", en: "Purl two stitches together." },
    legend: { de: "links zusammen", en: "purl decrease" },
    glyph: C_GLYPHS.p2tog
  },
  ssp: {
    id: "ssp",
    category: "decrease",
    span: 2,
    name: { de: "ssp", en: "slip, slip, purl" },
    description: { de: "Zwei Maschen links geneigt zusammenstricken.", en: "Slip two stitches and purl them together." },
    legend: { de: "links geneigt", en: "left-leaning purl decrease" },
    glyph: C_GLYPHS.ssp
  }
});

Object.assign(DEFINITIONS.tbl, {
  name: { de: "rechts verschränkt", en: "twisted knit" },
  legend: { de: "re verschränkt", en: "twisted knit" }
});
Object.assign(DEFINITIONS.slip, {
  name: { de: "abheben, Faden hinten", en: "slip, yarn in back" },
  legend: { de: "abheben, Faden hinten", en: "slip, yarn in back" }
});
Object.assign(DEFINITIONS.bobble, {
  name: { de: "Noppe", en: "bobble" }
});

/** Public, read-only view of the pack. */
export const SYMBOLS = Object.freeze(DEFINITIONS);

/** Categories in palette order. */
export const CATEGORIES = [
  { id: "basic", name: { de: "Grundzeichen", en: "Basic" } },
  { id: "increase", name: { de: "Zunahmen", en: "Increases" } },
  { id: "decrease", name: { de: "Abnahmen", en: "Decreases" } },
  { id: "cable", name: { de: "Zöpfe", en: "Cables" } },
  { id: "texture", name: { de: "Textur", en: "Texture" } },
  { id: "utility", name: { de: "Hilfszeichen", en: "Utility" } }
];

/** Cable presets shown directly in the palette. */
export const CABLE_PRESETS = [
  { id: "cable-1-1-front", left: 1, right: 1, direction: "front", label: { de: "1/1 vorne", en: "1/1 front" } },
  { id: "cable-1-1-back", left: 1, right: 1, direction: "back", label: { de: "1/1 hinten", en: "1/1 back" } },
  { id: "cable-2-2-front", left: 2, right: 2, direction: "front", label: { de: "2/2 vorne", en: "2/2 front" } },
  { id: "cable-2-2-back", left: 2, right: 2, direction: "back", label: { de: "2/2 hinten", en: "2/2 back" } },
  { id: "cable-3-3-front", left: 3, right: 3, direction: "front", label: { de: "3/3 vorne", en: "3/3 front" } },
  { id: "cable-3-3-back", left: 3, right: 3, direction: "back", label: { de: "3/3 hinten", en: "3/3 back" } },
  { id: "cable-4-4-front", left: 4, right: 4, direction: "front", label: { de: "4/4 vorne", en: "4/4 front" } },
  { id: "cable-4-4-back", left: 4, right: 4, direction: "back", label: { de: "4/4 hinten", en: "4/4 back" } }
];

/** Return a symbol definition or throw a helpful error. */
export function getSymbol(id) {
  if (!hasSymbol(id)) throw new Error(`Unknown symbol: ${id}`);
  return SYMBOLS[id];
}

/** True when a symbol id is an own property of the registry. */
export function hasSymbol(id) {
  return typeof id === "string" && Object.hasOwn(SYMBOLS, id);
}

/** True when the symbol can only be placed as a multi-cell group. */
export function isGroupSymbol(id) {
  if (!hasSymbol(id)) return false;
  const symbol = SYMBOLS[id];
  return Boolean(symbol.group || symbol.span > 1);
}

/** Number of cells a symbol consumes. Cable and custom need parameters. */
export function symbolSpan(id, params = {}) {
  const symbol = getSymbol(id);
  if (id === "cable") {
    const left = Number(params.left);
    const right = Number(params.right);
    if (!Number.isInteger(left) || !Number.isInteger(right) || left < 1 || right < 1) {
      throw new Error("cable span needs positive integer left and right");
    }
    return left + right;
  }
  if (id === "custom") {
    const span = Number(params.span);
    if (!Number.isInteger(span) || span < 1) throw new Error("custom span must be a positive integer");
    return span;
  }
  return symbol.span;
}

/** Glyph primitives for a symbol. */
export function glyphFor(id, params = {}) {
  const symbol = getSymbol(id);
  if (symbol.render) return symbol.render(params);
  return symbol.glyph || [];
}

/** Localised symbol name. Falls back to English, then to the id. */
export function symbolName(id, lang = "en") {
  const symbol = getSymbol(id);
  return symbol.name[lang] || symbol.name.en || id;
}

/** Localised legend text. */
export function symbolLegend(id, lang = "en") {
  const symbol = getSymbol(id);
  return symbol.legend[lang] || symbol.legend.en || id;
}

/**
 * Cable legend in standard front/back notation.
 *
 * The first number is the bundle in front, the second the bundle behind. The
 * text names the bundle on the cable needle: the front bundle for a front
 * cable, the back bundle for a back cable. This avoids reading "2/1 back" as
 * "two stitches held back".
 */
export function cableLegendParts(group, lang = "en") {
  const front = group.direction === "front";
  const frontCount = front ? group.right : group.left;
  const backCount = front ? group.left : group.right;
  const held = front ? frontCount : backCount;
  if (lang === "de") {
    return {
      name: `Zopf ${frontCount}/${backCount}`,
      text: `${held} ${held === 1 ? "Masche" : "Maschen"} ${front ? "vorne" : "hinten"}`
    };
  }
  return {
    name: `Cable ${frontCount}/${backCount}`,
    text: `${held} held ${front ? "front" : "back"}`
  };
}

/**
 * Legend text for a group. Cables include the split and direction, because
 * the drawing alone cannot tell whether the designer meant 2/2 or 3/1.
 */
export function groupLegend(group, lang = "en") {
  if (group.symbol === "cable") {
    const { name, text } = cableLegendParts(group, lang);
    return `${name}: ${text}`;
  }
  if (group.symbol === "custom") {
    const label = group.label || (lang === "de" ? "eigene Gruppe" : "custom group");
    return group.legend ? `${label}: ${group.legend}` : label;
  }
  return symbolLegend(group.symbol, lang);
}
