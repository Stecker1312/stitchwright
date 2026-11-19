# Contributing

Stitchwright is an open project under GPL-3.0. Contributions are welcome as
long as they respect the principles: local, data-sparing, no cloud, no
accounts, no telemetry.

## Reporting bugs

Please open an issue with:

- your browser and operating system
- the steps to reproduce the problem
- what you expected and what actually happened
- if possible, the chart file (JSON), but **no personal data** and no
  confidential projects

## Code

- Vanilla JavaScript, ES modules, no runtime dependencies.
- `npm test` and `npm run check` must pass.
- Small, understandable changes. New long-term decisions need an ADR under
  `docs/adr/`.
- No new dependencies without a decision first.
- No network calls, no external fonts, no analytics.
- Symbols and localisation are data, not special cases in the code.

## Translations

- Locale files live in `src/locales/`.
- Missing keys fall back to English.
- Mark new languages as `machine` or `partial` until a native speaker has
  checked the knitting terms.
- Chart abbreviations stay in English (`k`, `p`, `yo`, `k2tog`, `ssk`); the
  explanation is translated.

## Symbol packs and examples

- New symbols belong in `src/core/symbols.js` and `docs/symbols.md`.
- Examples under `samples/` must be synthetic or explicitly approved. No
  personal charts.
- Add tests for new symbols and golden charts.

## Transparency

The code is written by an AI agent and reviewed by people. Contributions are
treated by the same rules: readability, tests, traceability and privacy before
speed.
