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
- Zöpfe werden als zwei offene, dünne Kreuzungsbänder gezeichnet. Das vordere
  Band ist durchgehend, das hintere wird an der Kreuzung unterbrochen. Die
  Maschenzahl steht in der Legende, nicht als zusätzliche Strichanzahl.
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
