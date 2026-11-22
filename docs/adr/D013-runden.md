# D013 – Runden als Chart-Eigenschaft

- Datum: 2026-11-22
- Status: Gültig
- Betrifft: Stitchwright

## Zusammenhang

Stitchwright war bisher eindeutig auf Flachstricken ausgelegt: Reihe 1 ist die
erste Hinreihe, gerade Reihen sind Rückreihen, und „Nur Hinreihen“ blendet sie
aus. Für Mützen, Socken, Yokes und andere Arbeiten in Runden stimmt diese
Bedeutung nicht. Dort ist jede Runde eine rechte Seite, alle Runden werden von
rechts nach links gelesen und fortlaufend mit 1, 2, 3 … nummeriert.

Eine reine Anzeige-Einstellung würde beim Export und Teilen verloren gehen.
Das JSON bliebe mehrdeutig, und ältere Leser könnten ein Rundchart als flaches
Chart interpretieren.

## Entscheidung

Das Chart bekommt eine optionale Eigenschaft `options.construction`:

```json
"options": {
  "construction": "round",
  "rowsMode": "all"
}
```

- `"flat"` ist der Standard und bedeutet Hin- und Rückreihen. Fehlt das Feld,
  ist das Chart flach; bestehende Dateien ändern ihre Bedeutung nicht.
- `"round"` bedeutet: jede Reihe ist eine Runde auf der rechten Seite. Alle
  Runden sind sichtbar und werden mit 1 … `height` nummeriert. Es gibt keine
  Rückreihen und damit keinen Grund, gerade Runden auszublenden.
- Bei `construction: "round"` ist `rowsMode` zwingend `"all"`. Die Kombination
  `"round"` und `"rs"` ist ein Validierungsfehler (`E_ROUND_ROWS_MODE`), weil
  ältere Leser `construction` ignorieren und sonst jede zweite Runde
  ausblenden würden.
- Die Oberfläche bietet „Strickweise“ mit „Flach (Hin- und Rückreihen)“ und
  „In Runden“ im Dialog für neue Charts und in den Chart-Einstellungen. Im
  Rundmodus verschwindet der Rückreihen-Umschalter; sichtbare Beschriftungen
  sprechen von Runden statt Reihen.
- Die CLI kann mit `new --round` ein Rundchart anlegen.

Das Feld ist additiv und optional. Die Schemaversion bleibt
`strickschrift/1`, weil sich die Bedeutung vorhandener Felder nicht ändert.
Ältere Leser ignorieren `construction`, sehen wegen `rowsMode: "all"` aber
alle Reihen und rendern dasselbe Raster.

## Folgen

- Ein Chart sagt selbst, ob es flach oder in Runden gestrickt wird. Menschen
  und Agenten müssen es nicht aus dem Titel oder aus Begleittext erraten.
- Die Zeichenfläche bleibt ein Rechteck. „In Runden“ ändert die Bedeutung,
  die Beschriftung und die Sichtbarkeit der Reihen, nicht die Geometrie.
- Symbole, Farben, Gruppen, Rapport und Hilfslinien bleiben unverändert. Die
  Symbolsprache ist weiterhin von der rechten Seite aus definiert.
- „Nur Hinreihen“ bleibt eine reine Flachstrick-Lesehilfe. Ein späteres
  „nur jede zweite Runde“ wäre eine eigene Lesehilfe und darf nicht die
  Rückreihen-Logik wiederverwenden.
- Die CLI validiert und rendert Rundcharts ohne Sonderweg, weil Modell und
  SVG-Renderer dieselben Funktionen nutzen.

## Alternativen

- **Dritter Wert in `rowsMode`:** wäre im Modell kürzer, aber ältere Versionen
  würden `rowsMode: "round"` als ungültig ablehnen. Das additive Feld ist
  rückwärtsverträglicher.
- **Nur eine UI-Umschaltung:** würde nicht in der Datei landen und beim
  Export, Teilen oder Öffnen in einer anderen Version verloren gehen.
- **Gar keine Auszeichnung:** Ein flaches und ein rundes Chart mit denselben
  Zellen sehen identisch aus, bedeuten aber etwas anderes. Das Format wäre
  mehrdeutig.
- **Kreisförmige Darstellung:** ist eine andere Visualisierung, kein Bestandteil
  dieser Entscheidung. Der Editor bleibt beim rechteckigen Raster.
