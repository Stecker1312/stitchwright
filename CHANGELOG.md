# Changelog

## 0.6.3-alpha.1 – 22 November 2026

A permanent background frame around the drawing area.

### Fixed

- At high zoom the pattern used to run edge to edge and the pinned numbers
  sat on top of stitches. The editor now keeps a fixed background frame around
  the drawing area, so there is always visible canvas background on all four
  sides, at every zoom level. The frame also holds the row and column numbers.
- Pointer painting, guide placement, hover and the keyboard cursor stay inside
  the drawing area; clicks in the frame do not modify cells.
- `fitView` keeps the paper clear of the frame.

### Checks

- 153 Node tests green.
- Browser check: example chart at fit, 286 % zoom and in dark mode; visible
  frame on all sides, clickable row and column numbers in the frame, painting
  and panning unchanged.

## 0.6.2-alpha.1 – 22 November 2026

Readable margins while zoomed, plus coloured reading guides.

### New

- Row numbers now appear on both sides of the chart. When a paper edge leaves
  the viewport, its numbers stick to the screen edge; when the edge is visible,
  they sit beside the paper. Both number strips can be clicked to select a row.
- Stitch numbers now appear above and below the chart. They follow the paper
  edge and stick to the top or bottom of the viewport when zoomed, so columns
  stay identifiable deep inside a large chart. The SVG export and CLI print
  them above and below as well.
- Coloured guide lines between stitches. Click a stitch boundary for a
  full-height line, or drag along it to limit the line to chosen rows. Each
  line keeps its own colour, can be removed with a click or right-click, and
  is saved in the open JSON format. Guide lines are cosmetic reading aids:
  they are not knitted and do not appear in the legend.
- The guide-line tool has a colour picker, a line count and a clear button;
  the chosen colour is remembered between sessions.
- The canvas, SVG export, print, PNG export, validation and CLI all use the
  same guide-line data. Row and column edits and mirroring keep lines aligned.

### Checks

- 152 Node tests green.
- Browser check: row and stitch numbers at fit, 286 % zoom and in dark mode;
  both margins pin to the viewport, and clicks on the right row numbers and
  the top column numbers select the correct row or column.
- Browser check: full-height and partial guide lines in two colours, click and
  right-click removal, clear, undo, autosave and reload, and the guide
  controls in the tool panel.

## 0.6.1-alpha.1 – 22 November 2026

Cable legend clarification.

### Fixed

- Cable legends now use standard front/back counts and name the stitches on
  the cable needle, for example **Cable 2/1 · 1 held back** (two in front, one
  held behind). This also fixes front-direction asymmetric legends, which
  previously showed the counts the wrong way round.
- The asymmetric cable sample and both sample SVGs are regenerated with the
  new legend text.

### Checks

- 135 Node tests green.
- Browser check: the 2/1-back cable legend reads "Cable 2/1 · 1 held back".

## 0.6.0-alpha.1 – 22 November 2026

Range selection, optional stitch counts and corrected asymmetric cables.

### New

- Drag or Shift-click row and column numbers to select a range. The trash
  button deletes the whole range.
- Start a rectangle on any cell, including a cable. A click still selects the
  group; a drag selects the area. Ctrl+C / Ctrl+V copy and paste the rectangle,
  including colours and groups.
- Optional stitch counts: a small number marks the first stitch of each run of
  equal stitches. Off by default; available in the chart panel and in SVG and
  print.
- The turn, bind off and cast on glyphs are hidden from the palette. Old charts
  still load, render and export them.

### Fixed

- Asymmetric cables now draw the bundle behind as a short leg that joins the
  continuous front band, matching the 1/2-back hand sketch. Symmetric cables
  keep the full X. The stitch counts stay in the legend.

### Samples

- `samples/asymmetric-cables.strickschrift.json` (with rendered SVG) compares
  1/2, 2/1 and 3/2 cables with symmetric controls.

### Checks

- 134 Node tests green.
- Browser check: row drag and Shift-click, range delete, rectangle selection
  starting on a group, Ctrl+C / Ctrl+V, stitch counts and SVG output.
- Browser check: a 2/1-back cable placed from the custom cable dialog shows the
  continuous front band and the short rear leg at 70 % and 146 % zoom.

## 0.5.1-alpha.1 – 21 November 2026

### Added

- Custom cables are kept in a local library under **Custom cables** / **Eigene
  Zöpfe**. A width combination is entered once and can be placed again with one
  click, including after a reload.
- The cable dialog starts from the active or last used cable instead of always
  resetting to 2/2.
- A newly created palette entry is scrolled into view, so it does not disappear
  at the bottom of the long symbol list.

### Checks

- 114 Node tests green.
- Browser check: create 3/2 back, switch to another group, reuse the saved
  cable, reload, dialog prefill.
- Offline load with the new module in the service-worker cache.

## 0.5.0-alpha.1 – 20 November 2026

Fourth public alpha. The constructive symbol study C is now the standard.

### New

- The **Clear** pack uses thin converging lines, open cable crossings and no
  arrowheads. The three anchors (empty knit, purl dot, yarn-over circle) stay.
- Existing symbol IDs and chart files keep working; only the rendering changes.
- New symbols: `ptbl` (twisted purl), `slipw` (slip with yarn in front),
  `p2tog` and `ssp` (purl decreases).
- Bead, short row, bind off and cast on are redrawn in the same constructive
  style so no previous feature is lost.
- Cables still support 1/1 to 4/4 and custom widths; the front band is
  continuous and the back band breaks at the crossing.
- The example chart, screenshot and symbol documentation use the new style.
- 108 Node tests; browser check for the new palette and example chart.

## 0.4.0-alpha.1 – 20 November 2026

Stabilisation release based on the 2026-11-19 code audit. Still an alpha.

### Fixed

- Document switches clear undo/redo and transient state; opening or creating a
  chart with unsaved changes asks before discarding them.
- Autosave and manual saves confirm only the exact revision they wrote. Edits
  that happen during a save stay dirty and are saved again.
- UI group placement always uses unique instance ids; duplicate ids are
  rejected by the model.
- Keyboard group placement is atomic, dirty and undoable; the marker tool also
  works from the keyboard.
- Import validates the raw object before normalisation. Broken structures no
  longer become plausible empty charts, and unknown fields are preserved.
- The validator never throws on malformed rows, options or inherited symbol
  names such as `constructor`.
- Dimensions are checked before allocation; import size and collection limits
  are capped.
- Repeat bounds follow insert, delete, resize and mirror operations.
  Asymmetric cables swap their strands when mirrored.
- Right-side mode keeps the cursor on visible rows, selects only visible rows
  and warns about hidden groups.
- Custom-group legend keys include span and note; library notes survive a
  reload and can be cleared deliberately.
- Clipboard fragments carry their palette; conflicting colour ids are remapped
  on paste. Invalid fragments leave the document unchanged.
- Painting over a group with the knit brush removes it; failed coloured paints
  roll back completely.
- Global Enter/Space no longer steal native buttons; drawing commands require
  the chart canvas.
- Pointer strokes interpolate between samples; pinch cancels the first touch;
  middle-button pan works; pointer cancellation rolls back.
- SVG legends wrap long text and widen the viewBox; row numbers follow visible
  rows in right-side mode.
- Contrast chooses the better of black and white; `nostitch` uses its grey
  paper colour.
- Print is independent of the download format; the legend override and paper
  size are honoured.
- The service worker installs required assets atomically, keeps the old cache
  on failure, and deletes only its own caches.
- Storage errors are visible; a previous complete snapshot can be restored from
  the open dialog; a save in another tab is reported.
- CLI flags have explicit bool/value schemas, errors can be JSON, new charts get
  unique ids and `new` never writes an invalid document.
- The development server rejects malformed URLs and dotfiles, and checks real
  paths.
- Regression tests and a CI workflow cover the repaired paths.
- A beginner how-to is available in English and German and is linked from the
  app's Help dialog, README and project page.

### Changed

- An empty chart now exports a knit explanation in the legend.
- The chart content licence is empty by default; the GPL-3.0 app licence is
  shown separately.
- 108 Node tests; browser checks for keyboard, right-side mode, unsaved
  switches, mobile drawers and offline reload.

## 0.3.0-alpha.1 – 19 November 2026

- **English first:** British English is now the default and presentation
  language for the app, the manifest, the README and the command-line output.
  German stays available as a full translation in the settings.
- All built-in page text, validation messages and example charts are in
  English. The language switch also updates toolbars, sidebars and the canvas
  label.
- New English project page with a browser-first quick start, a plain-language
  status and roadmap, and a refreshed English screenshot.
- The standard symbol set is called **Clear** in English; German keeps
  **Klar**.
- 66 Node tests; browser check for the language switch and persistence.

## 0.2.0-alpha.1 – 18 November 2026

Second public alpha. Not ready for production.

### New

- **Stitch markers:** dashed vertical guide lines after chosen stitches. Place
  or remove single markers with the marker tool, or use “Marker every N”.
  Markers are drawing guides, not knitting instructions.
- **Copy and paste areas:** select tool, drag, copy, click the target cell,
  paste. Colours and groups are copied too.
- Visible copy and paste buttons in the toolbar.

### Fixed / improved

- The tool picker also matched the canvas instead of only the tool buttons.
- 64 Node tests; browser check for markers and copying areas.

## 0.1.0-alpha.1 – 18 November 2026

First public alpha. Not ready for production.

### Included

- Knitting chart editor as a static web app/PWA
- The “Klar” symbol set with basic stitches, increases, decreases, cables,
  texture and utility symbols
- Parametric cables from 1/1 to 4/4, to the front and to the back
- Colour fills per stitch, colour palette and colour legend
- Right-side and wrong-side rows, or right-side rows only
- Repeat, row and stitch numbers, legend
- Custom labelled groups with an optional legend note, stored locally
- Undo/redo, copy, mirror, insert and delete rows or columns
- SVG, PNG and JSON export; printing through the browser
- Horizontal and vertical scrollbars for large charts
- English/German, light/dark/system/high contrast, metric/imperial
- Keyboard, mouse, touch and stylus input
- Offline use through a service worker
- Node CLI: `validate`, `render`, `new`, `legend`
- 60 Node tests; browser check with Playwright

### Known limits

- Early alpha: bugs and format changes are possible.
- Only English and German are maintained.
- Custom symbol packs and a theme editor are still missing.
- Touch and stylus have not been tried on every device.
- No cloud, no accounts, no collaboration, no telemetry.

### File format

`strickschrift/1`. Groups cover a single row; custom groups have `label`,
`span` and optionally `legend`.
