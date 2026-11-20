# Performance snapshot after the audit fixes

- Date: 2026-11-20
- Node: v26.13.1
- Tool: `node docs/audits/2026-11-20-benchmark.mjs`
- Scope: six single-cell edits through `Store.edit`, legend scan, SVG export,
  retained history. No browser frame times, no heap profile and no physical
  print. This is a reproducible baseline, not a universal guarantee.

| Case | Six edits | Legend | SVG export | SVG size | Snapshots | History |
|---|---:|---:|---:|---:|---:|---:|
| 40×24 | 1 ms | 0 ms | 15 ms | 11 KB | 6 | 62 KB |
| 200×200 | 13 ms | 3 ms | 6 ms | 18 KB | 6 | 2.4 MB |
| 1000×1000 empty | 292 ms | 37 ms | 45 ms | 87 KB | 3 | 30 MB |
| 1000×1000, 5,000 groups/20,000 colours | 327 ms | 73 ms | 123 ms | 5.3 MB | 3 | 31 MB |

The history budget is now 32 MiB of JSON characters, not a minimum of five
snapshots. Full-chart snapshots at 1000×1000 still cost about 300 ms for six
edits; a patch/command history is the next meaningful optimization if real
workflows need more. The legend no longer scans every group per row and the
canvas indexes groups by row. The table view stops after 5,000 entries and
states that explicitly.

Open performance work: browser frame times, 50 recent charts, paste of large
fragments, and a real 1000×1000 workflow on low-end hardware. These need a
running browser and must not be inferred from this Node snapshot.
