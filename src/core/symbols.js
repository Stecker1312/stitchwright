/**
 * The "Klar" symbol pack.
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
 * A cable is two bundles of parallel strands crossing each other.
 *
 * The number of strands per bundle is the number of stitches per side. The
 * bundle in front is drawn twice: first a background-coloured "halo", then
 * the black strands. That is what makes the strand behind look interrupted,
 * just like a real cable crossing.
 */
export function cableGlyph({ left, right, direction = "front" }) {
  if (!Number.isInteger(left) || !Number.isInteger(right) || left < 1 || right < 1) {
    throw new Error("cable: left and right must be positive integers");
  }
  if (direction !== "front" && direction !== "back") {
    throw new Error("cable: direction must be front or back");
  }

  const span = left + right;
  const gap = 0.12;
  const strandWidth = 0.055;

  function bundle(count, fromX, toX, fromY, toY) {
    const strands = [];
    for (let i = 0; i < count; i += 1) {
      // Centre the bundle vertically and spread the strands evenly. The start
      // and end heights are swapped between the two bundles, so the strands
      // actually cross instead of running parallel.
      const offset = (i - (count - 1) / 2) * gap;
      const y1 = fromY + offset;
      const y2 = toY + offset;
      const c1x = fromX + (toX - fromX) * 0.34;
      const c2x = fromX + (toX - fromX) * 0.66;
      const c1y = y1 + (y2 - y1) * 0.34;
      const c2y = y1 + (y2 - y1) * 0.66;
      const d = `M${fromX} ${y1} C${c1x} ${c1y} ${c2x} ${c2y} ${toX} ${y2}`;
      strands.push(path(d, { width: strandWidth }));
    }
    return strands;
  }

  const leftBundle = bundle(left, 0.12, span - 0.12, 0.8, 0.2);
  const rightBundle = bundle(right, span - 0.12, 0.12, 0.8, 0.2);
  const front = direction === "front" ? rightBundle : leftBundle;
  const back = direction === "front" ? leftBundle : rightBundle;

  const primitives = [...back];
  // Halo first, then the front strands. The renderer resolves `halo` to the
  // cell background colour, so the crossing stays readable on coloured cells.
  for (const strand of front) {
    primitives.push({ ...strand, width: strand.width + 0.085, halo: true });
  }
  primitives.push(...front);
  return primitives;
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
const DEFINITIONS = {
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
    category: "utility",
    span: 1,
    name: { de: "abketten", en: "bind off" },
    description: { de: "Maschen abketten; die Kante ist fertig.", en: "Bind off; the edge is finished." },
    legend: { de: "abketten", en: "bind off" },
    glyph: [line(0.12, 0.12, 0.88, 0.12, { width: 0.18 })]
  },
  caston: {
    id: "caston",
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
};

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
  const symbol = SYMBOLS[id];
  if (!symbol) throw new Error(`Unknown symbol: ${id}`);
  return symbol;
}

/** True when the symbol can only be placed as a multi-cell group. */
export function isGroupSymbol(id) {
  const symbol = SYMBOLS[id];
  return Boolean(symbol && (symbol.group || symbol.span > 1));
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
 * Legend text for a group. Cables include the split and direction, because
 * the drawing alone cannot tell whether the designer meant 2/2 or 3/1.
 */
export function groupLegend(group, lang = "en") {
  if (group.symbol === "cable") {
    const side = lang === "de" ? "nach" : "to";
    const where = group.direction === "front"
      ? (lang === "de" ? "vorne" : "front")
      : (lang === "de" ? "hinten" : "back");
    return lang === "de"
      ? `Zopf ${group.left}/${group.right} ${side} ${where}`
      : `Cable ${group.left}/${group.right} ${side} ${where}`;
  }
  if (group.symbol === "custom") {
    const label = group.label || (lang === "de" ? "eigene Gruppe" : "custom group");
    return group.legend ? `${label}: ${group.legend}` : label;
  }
  return symbolLegend(group.symbol, lang);
}
