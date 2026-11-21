# Chart format `strickschrift/1`

Updated 19 November 2026. The format is open JSON. It is the source; SVG and
PNG are exports. The JSON Schema for editors and agents is at
[`schema/strickschrift.schema.json`](../schema/strickschrift.schema.json).

## Raw and canonical data

The file format has two layers:

- **Raw**: the JSON that a person or agent writes. Only `schema`, `width`,
  `height` and `rows` are required. `colors`, `groups`, `palette`, `options`
  and `meta` are optional.
- **Canonical**: the in-memory chart after normalization. All matrices and
  option fields exist, IDs are checked and unknown top-level fields are
  preserved for later validation.

Always validate the raw object before normalization. Normalization must not
turn a broken array into a valid empty one, and `--strict` must still see
unknown fields.

## Example

```json
{
  "schema": "strickschrift/1",
  "id": "example-chart",
  "title": "Example chart",
  "width": 12,
  "height": 8,
  "rows": [
    [null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null]
  ],
  "colors": [
    [null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null]
  ],
  "groups": [],
  "palette": [
    { "id": "A", "name": "A", "hex": "#ffffff" },
    { "id": "B", "name": "B", "hex": "#1a1a1a" }
  ],
  "options": {
    "rowsMode": "all",
    "showRowNumbers": true,
    "showStitchNumbers": true,
    "showStitchCounts": false,
    "showLegend": true,
    "repeat": null,
    "markers": [],
    "cellMm": 6,
    "paper": "A4",
    "subtitle": ""
  },
  "meta": {
    "author": "",
    "source": "",
    "license": "",
    "notes": "",
    "created": "2026-11-19T00:00:00.000Z",
    "modified": "2026-11-19T00:00:00.000Z"
  }
}
```

## Order

`rows[0]` is **row 1**, the lowest knitted row. The last item in the array is
the top row. This matches the knitting direction and the usual reading
direction from bottom to top.

Inside a row, `rows[row][0]` is the **left stitch in the picture**. The array
order therefore follows the picture from left to right. Stitch numbers run
from right to left for knitting reasons: stitch 1 is the right edge stitch.
That is the usual reading direction for right-side rows and makes drawing
with the mouse simple.

## Cells

- `null` = plain knit on the right side. Nothing is drawn as a symbol.
- String = symbol ID from `src/core/symbols.js`, for example `"p"`, `"yo"`,
  `"bobble"`.
- A symbol with `span > 1` **must not** be used as a cell value. It is a group.

## Colours

`colors` is a second matrix of the same size. Values are `null` or an ID from
`palette`. The matrix may be missing; then everything is `null`.

```json
"palette": [
  { "id": "A", "name": "Natural", "hex": "#f5f0e6" },
  { "id": "B", "name": "Red", "hex": "#b3261e" }
]
```

The palette is part of the chart. Colours are always referenced by ID, never
by index. That keeps a file readable even if the palette is reordered.

## Groups

A group is a symbol that takes several stitches in one row.

```json
"groups": [
  {
    "id": "g1",
    "row": 3,
    "col": 5,
    "symbol": "cable",
    "left": 2,
    "right": 2,
    "direction": "front"
  },
  {
    "id": "g2",
    "row": 7,
    "col": 9,
    "symbol": "k2tog"
  },
  {
    "id": "g3",
    "row": 9,
    "col": 2,
    "symbol": "custom",
    "span": 3,
    "label": "TL",
    "legend": "two stitches on a cable needle held in front"
  }
]
```

- `row` and `col` are 1-based.
- `col` is the left stitch of the group in the picture.
- `symbol` is the symbol ID.
- `cable`: `left`, `right`, `direction` (`front` or `back`). Span =
  `left + right`.
- `custom`: `span` and `label` are required; `legend` is optional and appears
  as the explanation in the legend.
- All other groups have a fixed span from the symbol definition.
- Groups sit in exactly one row. Multi-row symbols are reserved for a later
  schema version.
- The cells under a group must be `null`. Colours may be set.

## Options

| Field | Type | Meaning |
|---|---|---|
| `rowsMode` | `"all"` or `"rs"` | all rows or right-side rows only (1, 3, 5 …) |
| `showRowNumbers` | boolean | row numbers at the edge |
| `showStitchNumbers` | boolean | stitch numbers at the bottom |
| `showStitchCounts` | boolean | small run-length numbers inside the first cell of a run |
| `showLegend` | boolean | legend in the export |
| `repeat` | `null` or `{start,end}` | repeat, 1-based, inclusive |
| `markers` | array of numbers | stitch markers after stitch N, a drawing guide only |
| `cellMm` | number 2…20 | cell size for printing |
| `paper` | `"A4"`, `"A3"`, `"Letter"`, `"auto"` | paper hint |
| `subtitle` | string | short line under the title |

`markers` are drawing guides only: `[10, 20]` draws dashed lines after
stitches 10 and 20. They are not knitted and do not appear in the legend.

## Meta

All fields are optional. `created` and `modified` are ISO 8601 strings.
`license` is the user's content licence and is empty unless set. The app
licence (GPL-3.0) is separate. `notes` is a short note, not knitting
instructions.

## Validation

The CLI and the app use the same rules:

- `schema` must be `strickschrift/1`.
- `width` and `height` are whole numbers from 1 to 1000.
- `rows` has `height` rows with `width` cells each.
- Symbol IDs must be known.
- Symbols with `span > 1` must not appear as a cell value.
- Groups are inside the grid, do not overlap and match their span.
- Cells under groups are `null`.
- Palette IDs are unique; hex values use the form `#rrggbb`.
- `repeat.start <= repeat.end` and both are inside the grid.
- `rowsMode` is `"all"` or `"rs"`.

Diagnostics have a code, a path and an English message. The CLI prints them as
machine-readable JSON with `--json`.

## Versioning

`strickschrift/1` is the first version. A new version only appears when the
meaning of existing fields changes. In that case the app provides a migration
and the CLI prints a warning. Unknown fields are ignored so newer files do not
become unreadable at once. The JSON Schema helps editors and agents; the
validator in `src/core/validate.js` is authoritative.

## Performance

- `null` is the most common value and is not rendered.
- The Canvas editor draws only the visible area.
- The SVG export groups equal symbols in `<defs>` and uses `<use>`.
- For very large colour areas, equal colours in a row are merged.
