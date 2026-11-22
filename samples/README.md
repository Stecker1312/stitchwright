# Examples

Synthetic charts, no personal project data.

| File | Contents |
|---|---|
| `empty.strickschrift.json` | empty 24 × 16 chart, for testing import and the CLI |
| `klar-demo.strickschrift.json` | 32 × 20 with cables, decreases, colours and a repeat |
| `klar-demo.svg` | rendered version of the demo chart |
| `asymmetric-cables.strickschrift.json` | 12 × 4 with 1/2, 2/1 and 3/2 cables plus symmetric controls |
| `asymmetric-cables.svg` | rendered version of the cable comparison |

## Render again

```bash
node cli/stitchwright.js render samples/klar-demo.strickschrift.json \
  samples/klar-demo.svg --force
```

The SVG file is an example of the output format, not the source. The JSON file
is always the source.
