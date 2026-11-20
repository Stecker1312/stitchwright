# Changelog

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
