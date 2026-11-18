# Beispiele

Synthetische Charts, keine persönlichen Projektdaten.

| Datei | Inhalt |
|---|---|
| `empty.strickschrift.json` | leeres 24 × 16 Chart, zum Testen von Import und CLI |
| `klar-demo.strickschrift.json` | 32 × 20 mit Zöpfen, Abnahmen, Farben, Rapport |
| `klar-demo.svg` | gerenderte Fassung des Demo-Charts |

## Neu rendern

```bash
node cli/stitchwright.js render samples/klar-demo.strickschrift.json \
  samples/klar-demo.svg --force
```

Die SVG-Datei ist ein Beispiel für das Ausgabeformat, nicht die Quelle.
Quelle ist immer die JSON-Datei.
