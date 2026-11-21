# Stitchwright

**Knit charts, local and free.** An editor for knitting diagrams that runs in
the browser, works offline and sends nothing anywhere.

> **Early alpha 0.5.0-alpha.1 (20 November 2026).**
> Not ready for important work. Bugs, rough edges and changes to the file
> format are likely. Please keep an extra JSON copy of charts you care about.
>
> **Live demo:** <https://stecker1312.github.io/stitchwright/>
>
> **Project page:** <https://stecker1312.github.io/stitchwright/about.html>
>
> **New here?** Read the [five-minute how-to](how-to.html).

## What is Stitchwright?

Stitchwright replaces graph paper. You place symbols on a grid, draw cables
across several stitches, mark repeats and export the result as a clean SVG.
The app is not an instruction generator: the diagram is the product.

The project is deliberately local-first: no cloud, no accounts, no telemetry.
Charts live in the browser or in files you save yourself. People can use the
same open JSON format in the editor, and agents can use it through a small
command-line tool.

## What it does

- Grids of any size, including large patterns
- The constructive **Clear** symbol set: knit, purl, yarn over, decreases,
  increases, cables, bobbles, short rows and colour fills
- Multi-stitch symbols as one group: a six-stitch cable is one symbol, not six
  boxes
- Your own cables and labelled groups stay in a local library, so they can be
  placed again with one click; groups can carry their own legend note
- Stitch markers as a drawing guide: one at a time or every N stitches
- Select, copy and paste areas, including colours and groups
- Right-side and wrong-side rows, or right-side rows only numbered 1, 3, 5 …
- Mark a repeat and build the legend automatically
- Colour for each stitch, including Fair Isle and intarsia
- Export as SVG, PNG and JSON; print from the browser
- Horizontal and vertical scrollbars for large charts
- Light/dark/system, metric/imperial, English/German
- Keyboard, mouse, touch and stylus
- Installable offline as a PWA

## What it is not

No written instructions, no pattern calculator, no row counter, no cloud, no
accounts, no collaboration. Instructions, calculations and a row counter could
later appear as separate optional modules; cloud, accounts and collaboration
stay out. The core stays small.

## Quick start

Requirement: Node.js 20 or newer. No install step, no runtime dependencies.

```bash
git clone https://github.com/Stecker1312/stitchwright.git
cd stitchwright
npm start
```

Then open <http://localhost:8080>. If you do not want to run a local server,
use the live demo.

```bash
npm test      # 114 Node tests
npm run check # tests and syntax checks
```

## For agents

The chart format is versioned JSON. The command-line tool validates and
renders without a browser and without a network:

```bash
node cli/stitchwright.js validate chart.strickschrift.json
node cli/stitchwright.js render chart.strickschrift.json chart.svg
node cli/stitchwright.js new --width 40 --height 24 --out chart.strickschrift.json
node cli/stitchwright.js legend chart.strickschrift.json
```

Details: [`docs/format.md`](docs/format.md). Schema:
[`schema/strickschrift.schema.json`](schema/strickschrift.schema.json).

## Status and limits

- **Alpha:** usable, but not finished. Bugs are likely.
- **File format:** `strickschrift/1`; changes may need a migration.
- **Languages:** English and German are maintained; more languages are
  prepared but not yet checked by native speakers.
- **Devices:** tested in the browser; touch and stylus are implemented but not
  yet tried on every tablet and browser.
- **Custom symbol packs and theme editor:** planned, not built.
- **No support promise:** an open one-person project, not a commercial service.

More on the [project page](https://stecker1312.github.io/stitchwright/about.html).

## Contributing

Please report bugs and wishes as an issue in the repository. It helps to
include your browser, operating system, the steps to reproduce and, if
possible, the chart file. Please do not attach personal data or confidential
projects. Notes on translations, symbols and code are in
[`CONTRIBUTING.md`](CONTRIBUTING.md).

## How it works

- Static web app, no runtime dependencies
- Vanilla JavaScript ES modules, Canvas for editing, SVG for export
- Service worker and web app manifest for offline use
- IndexedDB and localStorage for local data
- Tests with `node:test`; browser checks with Playwright
- JSON Schema at `schema/strickschrift.schema.json`

## Documentation

- [Project page](https://stecker1312.github.io/stitchwright/about.html)
- [How to draw your first chart](how-to.html)
- [The Clear symbol set](docs/symbols.md)
- [Chart format](docs/format.md)
- [Decisions (ADRs)](docs/adr/)
- [Workflows (SOPs)](docs/sop/)
- [Status](STATUS.md)
- [Work journal](docs/JOURNAL.md)

## Privacy

Stitchwright sends no data. There is no analytics, no advertising and no
external fonts or resources. Everything stays on your device or in files you
save yourself.

## Transparency

The code was written by an AI agent (DeepSeek V4.1 Flash) on behalf of Daniel
and reviewed by him. The decisions and limits are in the ADRs. Mistakes are
possible; issues and corrections are welcome.

## Licence

GPL-3.0. See [`LICENSE`](LICENSE).
