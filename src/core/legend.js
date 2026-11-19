/**
 * Legend entries.
 *
 * The legend is generated from what is actually used in the chart. That keeps
 * a pattern self-contained: a knitter never has to guess what a symbol meant
 * in the designer's head.
 */

import { usedLegendKeys, groupSpan } from "./chart.js";
import { glyphFor, symbolLegend, symbolName } from "./symbols.js";

/** Build localised legend entries for the chart. */
export function legendEntries(chart, lang = "en") {
  return usedLegendKeys(chart).map((entry) => {
    if (entry.kind === "blank") {
      const blank = lang === "de"
        ? { name: "re", text: "leere Zelle" }
        : { name: "knit", text: "empty cell" };
      return {
        kind: "blank",
        glyph: [],
        span: 1,
        name: blank.name,
        text: blank.text
      };
    }
    if (entry.kind === "cell") {
      const name = symbolName(entry.symbol, lang);
      const text = symbolLegend(entry.symbol, lang);
      return {
        kind: "cell",
        symbol: entry.symbol,
        glyph: glyphFor(entry.symbol),
        span: 1,
        name,
        text: text === name ? "" : text
      };
    }
    if (entry.kind === "group") {
      const group = entry.group;
      const span = groupSpan(chart, group);
      const cableName = lang === "de"
        ? `Zopf ${group.left}/${group.right}`
        : `Cable ${group.left}/${group.right}`;
      const cableDirection = lang === "de"
        ? (group.direction === "front" ? "nach vorne" : "nach hinten")
        : (group.direction === "front" ? "to front" : "to back");
      return {
        kind: "group",
        symbol: group.symbol,
        group,
        glyph: glyphFor(group.symbol, group),
        span,
        name: group.symbol === "custom"
          ? group.label
          : (group.symbol === "cable" ? cableName : symbolName(group.symbol, lang)),
        text: group.symbol === "cable"
          ? cableDirection
          : (group.symbol === "custom"
            ? (group.legend || (lang === "de" ? "eigene Gruppe" : "custom group"))
            : symbolLegend(group.symbol, lang))
      };
    }
    return {
      kind: "color",
      color: entry.color,
      name: entry.color.name,
      text: entry.color.hex
    };
  });
}
