# Chart-Format `strickschrift/1`

Stand: 2026-11-18. Das Format ist offenes JSON. Es ist die Quelle; SVG und
PNG sind Exporte. Das JSON-Schema für Editoren und Agenten liegt unter
[`schema/strickschrift.schema.json`](../schema/strickschrift.schema.json).

## Beispiel

```json
{
  "schema": "strickschrift/1",
  "id": "v-probe",
  "title": "V-Probe",
  "width": 12,
  "height": 8,
  "rows": [
    [null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null]
  ],
  "colors": [
    [null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null]
  ],
  "groups": [],
  "palette": [
    { "id": "A", "name": "A", "hex": "#ffffff" },
    { "id": "B", "name": "B", "hex": "#1a1a1a" }
  ],
  "options": {
    "rowsMode": "all",
    "showRowNumbers": true,
    "showStitchNumbers": true,
    "showLegend": true,
    "repeat": null,
    "markers": [],
    "cellMm": 6,
    "paper": "A4",
    "subtitle": ""
  },
  "meta": {
    "author": "",
    "source": "",
    "license": "GPL-3.0",
    "notes": "",
    "created": "2026-11-18T00:00:00.000Z",
    "modified": "2026-11-18T00:00:00.000Z"
  }
}
```

## Reihenfolge

`rows[0]` ist **Reihe 1**, die unterste gestrickte Reihe. Die letzte Zeile im
Array ist die oberste Reihe. Das entspricht der Strickrichtung und der
Leserichtung von unten nach oben.

Innerhalb einer Reihe ist `rows[row][0]` die **linke Masche im Bild**. Die
Array-Reihenfolge folgt also der Bildansicht von links nach rechts. Die
Maschennummern laufen aus Strickgründen von rechts nach links: Masche 1 ist
die rechte Randmasche. Das ist die übliche Leserichtung von Hinreihen und
macht das Zeichnen mit der Maus einfach.

## Zellen

- `null` = glatt rechts auf der Außenseite. Wird nicht als Symbol gezeichnet.
- String = Symbol-ID aus `src/core/symbols.js`, z. B. `"p"`, `"yo"`, `"bobble"`.
- Ein Symbol mit `span > 1` darf **nicht** als Zellwert stehen. Es ist eine
  Gruppe.

## Farben

`colors` ist eine zweite Matrix gleicher Größe. Werte sind `null` oder eine
ID aus `palette`. Die Matrix darf fehlen; dann ist alles `null`.

```json
"palette": [
  { "id": "A", "name": "Natur", "hex": "#f5f0e6" },
  { "id": "B", "name": "Rot", "hex": "#b3261e" }
]
```

Die Palette ist Teil des Charts. Farben werden nie über den Index, sondern
über die ID referenziert. So bleibt eine Datei lesbar, auch wenn die Palette
umsortiert wird.

## Gruppen

Eine Gruppe ist ein Symbol, das mehrere Maschen in einer Reihe verbraucht.

```json
"groups": [
  {
    "id": "g1",
    "row": 3,
    "col": 5,
    "symbol": "cable",
    "left": 2,
    "right": 2,
    "direction": "front"
  },
  {
    "id": "g2",
    "row": 7,
    "col": 9,
    "symbol": "k2tog"
  },
  {
    "id": "g3",
    "row": 9,
    "col": 2,
    "symbol": "custom",
    "span": 3,
    "label": "TL",
    "legend": "zwei Maschen auf Hilfsnadel vor die Arbeit"
  }
]
```

- `row` und `col` sind 1-basiert.
- `col` ist die linke Masche der Gruppe im Bild.
- `symbol` ist die Symbol-ID.
- `cable`: `left`, `right`, `direction` (`front` oder `back`). Spannweite =
  `left + right`.
- `custom`: `span` und `label` sind Pflicht; `legend` ist optional und
  erscheint als Erklärung in der Legende.
- Alle anderen Gruppen haben eine feste Spannweite aus der Symboldefinition.
- Gruppen liegen in genau einer Reihe. Mehrzeilige Symbole sind für eine
  spätere Schemaversion vorgesehen.
- Die Zellen unter einer Gruppe müssen `null` sein. Farben dürfen gesetzt
  sein.

## Optionen

| Feld | Typ | Bedeutung |
|---|---|---|
| `rowsMode` | `"all"` oder `"rs"` | alle Reihen oder nur Hinreihen (1, 3, 5 …) |
| `showRowNumbers` | boolean | Reihennummern am Rand |
| `showStitchNumbers` | boolean | Maschennummern unten |
| `showLegend` | boolean | Legende im Export |
| `repeat` | `null` oder `{start,end}` | Rapport, 1-basiert, inklusiv |
| `markers` | Array von Zahlen | Maschenmarker nach Masche N, nur Zeichenhilfe |
| `cellMm` | Zahl 2…20 | Zellgröße für den Druck |
| `paper` | `"A4"`, `"A3"`, `"Letter"`, `"auto"` | Papierhinweis |
| `subtitle` | String | kurze Zeile unter dem Titel |

`markers` sind reine Zeichenhilfen: `[10, 20]` zeichnet gestrichelte Linien
nach Masche 10 und 20. Sie werden nicht gestrickt und erscheinen nicht in der
Legende.

## Meta

Alle Felder optional. `created` und `modified` sind ISO-8601-Strings.
`license` ist standardmäßig `"GPL-3.0"`. `notes` ist ein kurzer Hinweis, keine
Strickanleitung.

## Validierung

Die CLI und die App nutzen dieselben Regeln:

- `schema` muss `strickschrift/1` sein.
- `width` und `height` sind ganze Zahlen von 1 bis 1000.
- `rows` hat `height` Zeilen mit je `width` Zellen.
- Symbol-IDs müssen bekannt sein.
- Symbole mit `span > 1` dürfen nicht als Zellwert vorkommen.
- Gruppen liegen im Raster, überlappen nicht und passen zu ihrer Spannweite.
- Zellen unter Gruppen sind `null`.
- Paletten-IDs sind eindeutig; Hex-Werte haben die Form `#rrggbb`.
- `repeat.start <= repeat.end` und beide innerhalb des Rasters.
- `rowsMode` ist `"all"` oder `"rs"`.

Diagnosen haben einen Code, einen Pfad und eine deutsche Meldung. Die CLI
gibt sie mit `--json` maschinenlesbar aus.

## Versionierung

`strickschrift/1` ist die erste Version. Eine neue Version gibt es nur, wenn
sich die Bedeutung bestehender Felder ändert. Dann liefert die App eine
Migration und die CLI einen Hinweis. Unbekannte Felder werden ignoriert,
damit neuere Dateien nicht sofort unlesbar sind. Das JSON-Schema dient
Editoren und Agenten als Orientierung; verbindlich ist der Validator in
`src/core/validate.js`.

## Performance

- `null` ist der häufigste Wert und wird nicht gerendert.
- Der Canvas-Editor zeichnet nur den sichtbaren Ausschnitt.
- Der SVG-Export gruppiert gleiche Symbole in `<defs>` und nutzt `<use>`.
- Für sehr große Farbflächen werden gleiche Farben pro Zeile zusammengefasst.
