# The Clear symbol set

Updated 19 November 2026. This file is the authoritative description of the
standard pack. The implementation is in `src/core/symbols.js`.

## Principles

1. **Three anchors stay:** an empty box = knit, a dot = purl, a circle = yarn
   over. They are already learned and are not reinvented.
2. **One stroke width, one dot size.** Drawing uses cell coordinates (0…1 per
   stitch) with round caps.
3. **Area = stitch count.** A symbol across six stitches spans six boxes. It
   is drawn once, not six times.
4. **Direction is shape, not colour.** Slants have an arrowhead; cables have a
   visible top and bottom. Black and white must be enough.
5. **Cables are ropes.** The front rope is continuous; the back rope is broken
   at the crossing. The number of strands on each side is the number of
   stitches.
6. **Text only as an exception.** Labelled groups (for example `TL`) are
   allowed, but not the normal case.
7. **The legend is required.** Every chart builds a legend from the symbols it
   uses.

## Coordinates

- A symbol is defined in a grid of `0…span` in the x direction and `0…1` in
  the y direction.
- Stroke width: `0.09` cells, round caps.
- Arrowheads: length `0.16`, angle about 30°.
- Text: `0.38` cells high, centred, bold.
- Canvas and SVG export use the same paths. Canvas scales with the cell size;
  SVG writes the paths into the viewBox.

## Basic stitches

| ID | Span | Symbol | Meaning | Legend (en) |
|---|---|---|---|---|
| `p` | 1 | dot | purl on the right side | purl |
| `yo` | 1 | open circle | yarn over | yarn over |
| `m1l` | 1 | arrow up and left | increase leaning left | M1L, left-leaning increase |
| `m1r` | 1 | arrow up and right | increase leaning right | M1R, right-leaning increase |
| `kfb` | 1 | forked V | two stitches from one | kfb, knit front and back |
| `tbl` | 1 | V with crossed legs | twisted stitch | k1tbl, twisted |
| `slip` | 1 | loop with arrow | slip a stitch | slip a stitch |
| `bobble` | 1 | ball of yarn | bobble | bobble |
| `bead` | 1 | diamond with dot | bead | bead |
| `nostitch` | 1 | grey cell with × | no stitch | no stitch |
| `shortrow` | 1 | U-turn arrow | turn | short row, turn |
| `bindoff` | 1 | thick bar at the top | bind off | bind off |
| `caston` | 1 | thick bar at the bottom | cast on | cast on |

`null` means stocking stitch on the right side and is not drawn as a symbol.

## Decreases

| ID | Span | Symbol | Meaning |
|---|---|---|---|
| `k2tog` | 2 | diagonal up and right, arrow | knit two together |
| `ssk` | 2 | diagonal up and left, arrow | slip, slip, knit (left-leaning decrease) |
| `k3tog` | 3 | three lines to one point on the right | knit three together |
| `sk2p` | 3 | three lines to one point on the left | slip one, knit two together, pass |
| `cdd` | 3 | two lines symmetrical to the centre | centred double decrease |

The diagonal follows the lean of the resulting stitch. The arrowhead sits at
the target. That keeps the direction readable when small and in greyscale.

## Cables

A cable is a group with `symbol: "cable"` and parameters:

```json
{ "symbol": "cable", "left": 2, "right": 2, "direction": "front" }
```

- `left` and `right` are the stitch counts of the two bundles in the picture.
  In a right-side row, the first-knitted stitch is on the **right**.
- `direction: "front"` means the first-knitted stitches (on the right in the
  picture) lie in front, so the **right bundle is continuous** (C4F).
- `direction: "back"` means the first-knitted stitches lie behind, so the
  **left bundle is continuous** (C4B).
- The span is `left + right`.
- Each bundle is drawn as `left` or `right` parallel lines. The front bundle
  gets a background outline so the back bundle is visibly interrupted.
- The strands run as soft curves and cross in the middle.

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
