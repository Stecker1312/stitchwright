# SOP-005 – Agenten-Workflow

- Status: Gültig
- Stand: 2026-11-18

## Zweck

Agenten sollen Charts prüfen, erzeugen und rendern können, ohne einen
Browser zu bedienen. Die CLI nutzt denselben Kern wie die App.

## Befehle

```bash
node cli/stitchwright.js validate chart.strickschrift.json
node cli/stitchwright.js render chart.strickschrift.json chart.svg
node cli/stitchwright.js new --width 40 --height 24 --out chart.strickschrift.json
node cli/stitchwright.js legend chart.strickschrift.json
```

## Ausgabe

- `validate`: Exit 0 = gültig, Exit 1 = Fehler. Mit `--json` ein Objekt
  `{ ok, diagnostics: [...] }`.
- `render`: schreibt SVG, Exit 0 bei Erfolg.
- `new`: erzeugt ein leeres, gültiges Chart.
- `legend`: gibt die verwendeten Symbole als Text oder JSON aus.

## Regeln

- Nie eine Datei überschreiben, ohne `--force`.
- Keine persönlichen Daten in Beispieldateien.
- Vor dem Rendern validieren.
- Bei Formatfehlern die Diagnose mit Pfad und Code ausgeben, nicht raten.
- Keine Netzwerkaufrufe.

## Beispiel

```bash
node cli/stitchwright.js validate samples/v-probe.strickschrift.json --json
node cli/stitchwright.js render samples/v-probe.strickschrift.json /tmp/v-probe.svg
```
