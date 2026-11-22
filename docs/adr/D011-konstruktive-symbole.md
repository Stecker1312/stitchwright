# D011 – Konstruktive Symbole als Standard

- Datum: 2026-11-20
- Status: Gültig
- Betrifft: Stitchwright

## Zusammenhang

Die bisherigen Symbole waren weich und rund. Daniel hat am 20. November 2026
drei neue Symbolstudien prüfen lassen und sich für Variante **C – Konstruktiv**
entschieden. Sie ist bei kleinen Größen und im Druck klarer, ohne die drei
gelernten Anker zu verändern. Die Studie deckt die meisten, aber nicht alle
bisherigen Symbole ab.

## Entscheidung

- Die konstruktive Studie C wird das Standard-Aussehen des Packs **Clear**.
  Der Packname und das Dateiformat bleiben unverändert.
- Bestehende Symbol-IDs bleiben gültig; alte Charts werden mit den neuen
  Glyphen gerendert. Eine Datenmigration ist nicht nötig.
- Die vorhandenen, in der Studie fehlenden Symbole werden im gleichen Stil
  ergänzt: Perle, Wende, Abketten und Anschlagen.
- Die Studie ergänzt eine Linksmaschen-Variante (`ptbl`), zwei
  Abhebevarianten (Faden hinten/vorne) und zwei Linksabnahmen (`p2tog`, `ssp`).
  Sie werden als eigene Symbole aufgenommen, nicht als UI-Sonderfälle.
- Zöpfe werden als offene, dünne Kreuzungsbänder gezeichnet. Bei gleich breiten
  Feldern ist das vordere Band durchgehend und das hintere an der Kreuzung
  unterbrochen. Bei ungleich breiten Feldern bleibt nur das vordere Band über
  die ganze Gruppe durchgehend; das hintere erscheint als kurzer Schenkel auf
  seiner Seite. Die Maschenzahl steht in der Legende, nicht als zusätzliche
  Strichanzahl.
- Keine Pfeilspitzen bei Abnahmen. Richtung entsteht durch Neigung, Gabelung
  oder die Lage des Purpunkts.
- Die konkreten Pfade und die zusätzlichen Symbole liegen in
  `src/core/symbols.js`; die verbindliche Beschreibung in `docs/symbols.md`.

## Folgen

- Alle bestehenden Charts bleiben lesbar und gültig.
- Die Palette enthält mehr Links- und Abhebevarianten; die Suche und Legende
  müssen die neuen IDs mitführen.
- Die alte Studien-Variante A/B wird nicht eingebaut. Ein späterer eigener
  Symbol-Pack kann sie als Alternative anbieten.
- Die Symbolabnahme bleibt fachlich offen: echte Strickprobe und Druckbild
  werden weiterhin separat geprüft.

## Alternativen

- **A – Druckklassisch:** ruhiger, aber weniger klar bei kleinen Größen.
- **B – Weich gerundet:** freundlicher, aber für ein technisches Diagramm zu
  weich und bei 22 px unruhiger.
- **Alte Symbole behalten:** hätte keine Migration erfordert, aber Daniel hat
  sich ausdrücklich für C entschieden.

## Nachtrag 2026-11-22 – asymmetrische Zöpfe

Daniel hat einen 1/2-Zopf „hinter die Arbeit“ skizziert: drei Maschen, ein
durchgehendes vorderes Band von links unten nach rechts oben und ein kurzer
hinterer Schenkel nur in der rechten Zelle. Der bisherige Glyph zeichnete zwei
volle Kreuzungslinien und traf die Asymmetrie nicht.

Entscheidung:

- Bei `left !== right` läuft das vordere Band weiter über die ganze Gruppe.
- Das hintere Bündel wird nur als kurzer Schenkel von der äußeren unteren Ecke
  zur Vorderbandlinie gezeichnet. Die Seite folgt der Richtung: `back` =
  rechter Schenkel (rechtes Bündel hinten), `front` = linker Schenkel (linkes
  Bündel hinten).
- Die Maschenzahlen bleiben in der Legende; der Schenkel ist kein Ersatz für
  eine Strichzählung. Die Legende nennt die Zahlen in Standardreihenfolge
  vorne/hinten und zusätzlich die Maschen auf der Hilfsnadel. `left: 2,
  right: 1, direction: "back"` ergibt „Cable 2/1 · 1 held back“ (zwei vorne,
  eine hinten). Bei `direction: "front"` liegen die Zahlen andersherum, weil
  dann das rechte Bündel vorne liegt.
- Symmetrische Zöpfe behalten das volle X aus Studie C.
- Regressionstests decken 1/2 und 2/1 in beiden Richtungen ab.
