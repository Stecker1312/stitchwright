# Examples

Synthetic charts, no personal project data.

| File | Contents |
|---|---|
| `empty.strickschrift.json` | empty 24 × 16 chart, for testing import and the CLI |
| `klar-demo.strickschrift.json` | 32 × 20 with cables, decreases, colours and a repeat |
| `klar-demo.svg` | rendered version of the demo chart |

## Render again

```bash
node cli/stitchwright.js render samples/klar-demo.strickschrift.json \
  samples/klar-demo.svg --force
```

The SVG file is an example of the output format, not the source. The JSON file
is always the source.
