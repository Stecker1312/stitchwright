/**
 * A small built-in example. It exercises the features that are easy to get
 * wrong: cables, multi-cell decreases, colours, repeat markers and a legend.
 * It is deliberately synthetic; no personal project data is shipped.
 */

import { addGroup, createChart, groupSpan, setCell, setColor } from "./core/chart.js";

export function createDemoChart() {
  const chart = createChart({ width: 32, height: 20, title: "Clear – example" });
  chart.id = "klar-beispiel";
  chart.options.subtitle = "Cables, yarn over, decrease, colours";
  chart.options.repeat = { start: 3, end: 10 };

  // Place groups first. The cells under a group must stay empty.
  for (const row of [3, 9, 15]) {
    addGroup(chart, { row, col: 4, symbol: "cable", left: 2, right: 2, direction: "front" });
    addGroup(chart, { row, col: 27, symbol: "cable", left: 2, right: 2, direction: "back" });
  }
  for (const row of [5, 13]) {
    addGroup(chart, { row, col: 14, symbol: "cable", left: 3, right: 3, direction: "front" });
  }
  addGroup(chart, { row: 10, col: 8, symbol: "k2tog" });
  addGroup(chart, { row: 10, col: 10, symbol: "ssk" });
  addGroup(chart, { row: 15, col: 20, symbol: "k3tog" });
  addGroup(chart, { row: 16, col: 20, symbol: "cdd" });
  addGroup(chart, { row: 7, col: 9, symbol: "k2tog" });
  addGroup(chart, { row: 8, col: 8, symbol: "ssk" });

  // A quiet purl ground on every second row makes the symbols easy to see.
  const covered = (row, col) => chart.groups.some((group) => (
    group.row === row
    && col >= group.col
    && col < group.col + groupSpan(chart, group)
  ));
  for (let row = 2; row <= 20; row += 2) {
    for (let col = 1; col <= 32; col += 1) {
      if (!covered(row, col)) setCell(chart, row, col, "p");
    }
  }

  // A simple lace / shaping study.
  const motifs = [
    [7, 8, "yo"],
    [8, 11, "yo"],
    [11, 20, "m1l"], [11, 21, "m1r"],
    [12, 20, "yo"], [12, 21, "yo"],
    [17, 8, "bobble"], [17, 9, "bead"],
    [18, 8, "tbl"], [18, 9, "tbl"]
  ];
  for (const [row, col, symbol] of motifs) setCell(chart, row, col, symbol);

  // Colour bands at the bottom and top.
  for (let col = 1; col <= 32; col += 1) {
    setColor(chart, 1, col, "D");
    setColor(chart, 2, col, "D");
    setColor(chart, 19, col, "C");
    setColor(chart, 20, col, "C");
  }

  // A few background cells in contrasting colours, to show readable symbols.
  for (let col = 4; col <= 7; col += 1) setColor(chart, 6, col, "F");
  for (let col = 27; col <= 30; col += 1) setColor(chart, 6, col, "H");

  return chart;
}
