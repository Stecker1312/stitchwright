# SOP-002 – Chart und Symbol anlegen

- Status: Gültig
- Stand: 2026-11-18

## Neues Chart

```bash
node cli/stitchwright.js new --width 40 --height 24 --title "V-Probe" \
  --out samples/v-probe.strickschrift.json
node cli/stitchwright.js validate samples/v-probe.strickschrift.json
```

Im Editor: „Neu“, Breite und Höhe eingeben, zeichnen, speichern.

## Neues Symbol

1. In `docs/symbols.md` klären, ob das Zeichen wirklich neu ist.
2. In `src/core/symbols.js` einen Eintrag anlegen:
   - `id`, `category`, `name` (de/en), `description` (de/en)
   - `span` (1 für Einzelzelle, sonst Maschenzahl)
   - `glyph`: Pfade, Kreise, Linien oder Text im Zellraster
   - `legend`: kurze Erklärung für die automatische Legende
3. Glyph in 0…1 (bzw. 0…span) Koordinaten zeichnen. Strichstärke 0,09
   Zellen, runde Enden, keine Füllfarben außer Schwarz/Weiß.
4. In `tests/symbols.test.js` prüfen: ID eindeutig, Glyph vorhanden,
   Spannweite plausibel.
5. Im Editor prüfen: bei kleinster und größter Zoomstufe lesbar, in
   Schwarzweiß unterscheidbar.
6. `docs/symbols.md` aktualisieren.

## Golden Charts

Beispiele liegen in `samples/`. Sie werden von Tests geladen und gerendert.
Ein neues Golden Chart braucht:

- gültiges JSON,
- eine kurze Beschreibung in `samples/README.md`,
- einen Test, der es validiert und als SVG rendert,
- keine persönlichen Daten.

## Gruppen

Mehrfachsymbole (Zopf, Abnahme über mehrere Maschen) sind Gruppen, keine
Zellwerte. Beim Anlegen prüfen:

- Spannweite passt zur Symboldefinition,
- Gruppe liegt vollständig im Raster,
- keine Überlappung mit anderen Gruppen,
- Zellen unter der Gruppe bleiben leer.
