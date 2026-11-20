# The Clear symbol set

Updated 20 November 2026. This file is the authoritative description of the
standard pack. The implementation is in `src/core/symbols.js`.

The visual language is the **constructive** study: thin converging lines,
open crossings and no arrowheads. It replaces the earlier rounded glyphs but
keeps the same three anchors and the same chart format.

## Principles

1. **Three anchors stay:** an empty box = knit, a dot = purl, a circle = yarn
   over. They are already learned and are not reinvented.
2. **One stroke width, one dot size.** Drawing uses cell coordinates (0…1 per
   stitch) with round caps and a 0.052 cell stroke.
3. **Area = stitch count.** A symbol across six stitches spans six boxes. It
   is drawn once, not six times.
4. **Direction is shape, not colour.** Slants and branches carry the direction;
   there are no arrowheads. Black and white must be enough.
5. **Cables are open crossings.** Two thin bands cross; the front band is
   continuous, the back band is broken at the crossing. The legend names the
   stitch counts and the direction.
6. **Text only as an exception.** Labelled groups (for example `TL`) are
   allowed, but not the normal case.
7. **The legend is required.** Every chart builds a legend from the symbols it
   uses.

## Coordinates

- A symbol is defined in a grid of `0…span` in the x direction and `0…1` in
  the y direction.
- Stroke width: `0.052` cells, round caps.
- Purl dot: radius `0.075`; yarn over: radius `0.215`.
- Text: `0.38` cells high, centred, bold.
- Canvas and SVG export use the same paths. Canvas scales with the cell size;
  SVG writes the paths into the viewBox.

## Basic stitches

| ID | Span | Symbol | Meaning | Legend (en) |
|---|---|---|---|---|
| `p` | 1 | dot | purl on the right side | purl |
| `yo` | 1 | open circle | yarn over | yarn over |
| `m1l` | 1 | branch to the left | increase leaning left | M1L, left-leaning increase |
| `m1r` | 1 | branch to the right | increase leaning right | M1R, right-leaning increase |
| `kfb` | 1 | forked stem | two stitches from one | kfb, knit front and back |
| `tbl` | 1 | X | twisted knit stitch | k1tbl, twisted knit |
| `ptbl` | 1 | X with dot | twisted purl stitch | p1tbl, twisted purl |
| `slip` | 1 | U with open top | slip, yarn in back | slip, yarn in back |
| `slipw` | 1 | U with a base line | slip, yarn in front | slip, yarn in front |
| `bobble` | 1 | filled diamond | bobble | bobble |
| `bead` | 1 | open diamond with dot | bead | bead |
| `nostitch` | 1 | grey cell | no stitch | no stitch |
| `shortrow` | 1 | open U-turn | turn | short row, turn |
| `bindoff` | 1 | thick bar at the top | bind off | bind off |
| `caston` | 1 | thick bar at the bottom | cast on | cast on |

`null` means stocking stitch on the right side and is not drawn as a symbol.

## Decreases

| ID | Span | Symbol | Meaning |
|---|---|---|---|
| `k2tog` | 2 | diagonal up and right, short upright | knit two together |
| `ssk` | 2 | diagonal up and left, short upright | slip, slip, knit (left-leaning decrease) |
| `k3tog` | 3 | three lines to one point on the right | knit three together |
| `sk2p` | 3 | three lines to one point on the left | slip one, knit two together, pass |
| `cdd` | 3 | triangle with a centre line | centred double decrease |
| `p2tog` | 2 | diagonal with a purl dot | purl two together |
| `ssp` | 2 | mirrored diagonal with a purl dot | slip, slip, purl |

The slope follows the lean of the resulting stitch. The purl dot tells knit
and purl decreases apart without adding an arrowhead.

## Cables

A cable is a group with `symbol: "cable"` and parameters:

```json
{ "symbol": "cable", "left": 2, "right": 2, "direction": "front" }
```

- `left` and `right` are the stitch counts of the two bundles in the picture.
  In a right-side row, the first-knitted stitch is on the **right**.
- `direction: "front"` means the first-knitted stitches (on the right in the
  picture) lie in front, so the **front band is continuous** (C4F).
- `direction: "back"` means the first-knitted stitches lie behind, so the
  **other band is continuous** (C4B).
- The span is `left + right`.
- The glyph uses two crossing bands and a paper-coloured halo around the front
  band. It does not draw one line per stitch; the legend carries the exact
  counts.
- The bands run as straight open crossings, not closed ropes.

This covers 1/1, 2/2, 3/3 and 4/4 without new glyphs. The legend gives the
exact direction.

## Labelled groups

For special cases there is `symbol: "custom"` with `label`, `span` and an
optional `legend`. The symbol is a thin frame with text. It is explicitly the
exception, not the standard. The legend uses `legend`, otherwise the label
text.

## Colours

Colour is its own layer. Each cell may carry a palette ID.

- The palette is part of the chart:
  `{ "id": "A", "name": "Natural", "hex": "#ffffff" }`.
- `null` means no colour (paper colour).
- Symbols are drawn black or white, depending on the brightness of the
  background. Colour is never the only way to tell things apart.
- The legend shows colour swatches with names, not only hex values.

## Custom packs

A symbol pack is a data structure with `id`, `name` and `symbols`. The app
will load more packs later. A pack may override the IDs of the Clear pack, but
this must be recorded in the chart so old files stay reproducible.

The first version has only Clear built in. The structure is ready for a
“Classic” pack and custom packs without changes to the editor.
