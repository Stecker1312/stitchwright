# Changelog

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
