# D012 – Hilfslinien zwischen Maschen

- Datum: 2026-11-22
- Status: Gültig
- Betrifft: Stitchwright

## Zusammenhang

Daniel liest symmetrische und geteilte Muster leichter, wenn eine farbige
Linie zwischen zwei Maschen verläuft, zum Beispiel in der Mitte des Charts.
Die vorhandenen Maschenmarker sind dafür zu starr: Sie sind immer gestrichelt,
immer violett und immer über die ganze Höhe. Eine Linie soll außerdem je nach
Muster unterschiedlich lang und farbig sein können. Sie ist eine Lesehilfe und
keine Strickanweisung.

## Entscheidung

Hilfslinien sind ein optionales, oberstes Feld `guides` im Chart. Jede Linie
liegt auf einer Maschengrenze und hat ihre eigene Farbe und ihren eigenen
Zeilenbereich:

```json
{
  "id": "l1",
  "color": "#1a1a1a",
  "boundary": 12,
  "fromRow": 1,
  "toRow": 10
}
```

- `boundary` zählt Bildspalten von links. `1` liegt zwischen Spalte 1 und 2,
  `width - 1` zwischen den letzten beiden Spalten. Linien auf dem äußeren
  Rand werden nicht gespeichert, weil der Chartrahmen diese Grenze schon
  zeigt.
- `fromRow` und `toRow` sind inklusiv, 1-basiert und von unten nach oben
  geordnet. Eine Linie über die ganze Höhe nutzt `1` und `height`.
- `color` ist ein eigener `#rrggbb`-Wert, keine Paletten-ID. Dadurch bleibt
  eine Hilfslinie unabhängig von Garnfarben und erscheint nicht in der
  Legende.
- Im Editor setzt ein Klick auf eine Maschengrenze eine Linie über die ganze
  Höhe. Ziehen legt die Linienlänge über die gewählten Reihen fest. Ein Klick
  auf eine bestehende Linie entfernt sie; Rechtsklick tut dasselbe.
- Die Linien werden im Canvas und im SVG-Export oberhalb der Maschen gezeichnet,
  damit Zopf- und Symbolstriche sie nicht verdecken. Sie sind keine
  Strickbedeutung und werden nicht kopiert, wenn ein Zellbereich kopiert wird.

Das Feld ist additiv und optional. Dateien ohne `guides` bleiben gültig;
ältere Leser ignorieren das Feld. Die Schemaversion bleibt
`strickschrift/1`, weil sich die Bedeutung vorhandener Felder nicht ändert.

## Folgen

- Ein Chart kann mehrere farbige Lesehilfen tragen, ohne die Palette oder die
  Legende zu verändern.
- Einfügen, Löschen und Spiegeln von Reihen und Spalten verschieben oder
  kürzen die Linien mit dem Raster. Beim Verkleinern verschwinden Linien, die
  außerhalb des neuen Charts liegen.
- Die CLI validiert und rendert Hilfslinien ohne Sonderweg, weil sie dasselbe
  Modell und denselben SVG-Renderer nutzt.
- Weitere Formen wie waagerechte oder diagonale Linien brauchen eine neue
  Entscheidung und ein erweitertes Modell.

## Alternativen

- **Maschenmarker wiederverwenden:** spart ein Feld, kann aber weder Farbe
  noch Teilhöhe und bleibt semantisch an „nach Masche N“ gebunden.
- **Paletten-IDs statt Hex-Werten:** verbindet Lesehilfen unnötig mit
  Garnfarben und bricht beim Löschen einer Farbe.
- **Freie SVG-Überlagerung:** wäre im Editor nicht sauber speicherbar,
  validierbar oder für Agenten lesbar.
