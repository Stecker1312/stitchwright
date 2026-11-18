# Symbolsprache „Klar“

Stand: 2026-11-18. Diese Datei ist die verbindliche Beschreibung des
Standard-Packs. Die Implementierung liegt in `src/core/symbols.js`.
## Prinzipien

1. **Drei Anker bleiben:** leeres Kästchen = re, Punkt = li, Kreis =
   Umschlag. Sie sind gelernt und werden nicht neu erfunden.
2. **Eine Strichstärke, eine Punktgröße.** Gezeichnet wird in Zellkoordinaten
   (0…1 pro Masche), mit runden Enden.
3. **Fläche = Maschenzahl.** Ein Symbol über sechs Maschen spannt sechs
   Kästchen. Es wird einmal gezeichnet, nicht sechsmal.
4. **Richtung ist Form, nicht Farbe.** Neigungen haben eine Pfeilspitze,
   Zöpfe ein sichtbares Oben/Unten. Schwarzweiß muss reichen.
5. **Zöpfe sind Seile.** Das vordere Seil ist durchgezogen, das hintere wird
   an der Kreuzung unterbrochen. Die Zahl der Einzelstränge je Seite ist die
   Zahl der Maschen.
6. **Text nur als Ausnahme.** Beschriftete Gruppen (z. B. `TL`) sind erlaubt,
   aber nicht der Normalfall.
7. **Legende ist Pflicht.** Jedes Chart erzeugt automatisch eine Legende aus
   den verwendeten Zeichen.

## Koordinaten

- Ein Symbol wird in einem Raster von `0…span` in x-Richtung und `0…1` in
  y-Richtung definiert.
- Strichstärke: `0.09` Zellen, runde Enden.
- Pfeilspitzen: Länge `0.16`, Winkel etwa 30°.
- Text: `0.38` Zellen hoch, mittig, fett.
- Canvas und SVG-Export nutzen dieselben Pfade. Canvas skaliert mit der
  Zellgröße; SVG schreibt die Pfade in den ViewBox.

## Grundzeichen

| ID | Span | Zeichen | Bedeutung | Legende (de) |
|---|---|---|---|---|
| `p` | 1 | Punkt | li auf der Außenseite | linke Masche |
| `yo` | 1 | offener Kreis | Umschlag | Umschlag |
| `m1l` | 1 | Pfeil nach links oben | Zunahme, links geneigt | M1L, links geneigte Zunahme |
| `m1r` | 1 | Pfeil nach rechts oben | Zunahme, rechts geneigt | M1R, rechts geneigte Zunahme |
| `kfb` | 1 | gegabeltes V | aus einer Masche zwei | kfb, vorn und hinten stricken |
| `tbl` | 1 | V mit gekreuzten Beinen | verschränkte Masche | k1tbl, verschränkt |
| `slip` | 1 | Schleife mit Pfeil | Masche abheben | Masche abheben |
| `bobble` | 1 | Wollknäuel | Bobbel | Bobbel |
| `bead` | 1 | Raute mit Punkt | Perle | Perle |
| `nostitch` | 1 | graues Feld mit × | keine Masche | keine Masche |
| `shortrow` | 1 | U-Turn-Pfeil | Wende | verkürzte Reihe, wenden |
| `bindoff` | 1 | dicker Balken oben | abketten | abketten |
| `caston` | 1 | dicker Balken unten | anschlagen | anschlagen |

`null` bedeutet glatt rechts und wird nicht als Symbol gezeichnet.

## Abnahmen

| ID | Span | Zeichen | Bedeutung |
|---|---|---|---|
| `k2tog` | 2 | Diagonale nach rechts oben, Pfeil | zwei Maschen rechts zusammen |
| `ssk` | 2 | Diagonale nach links oben, Pfeil | zwei Maschen links geneigt zusammen |
| `k3tog` | 3 | drei Linien auf einen Punkt rechts | drei Maschen rechts zusammen |
| `sk2p` | 3 | drei Linien auf einen Punkt links | drei Maschen links geneigt zusammen |
| `cdd` | 3 | zwei Linien symmetrisch auf die Mitte | mittige doppelte Abnahme |

Die Diagonale folgt der Neigung der entstehenden Masche. Die Pfeilspitze
sitzt am Ziel. So bleibt die Richtung auch klein und in Graustufen lesbar.

## Zöpfe

Ein Zopf ist eine Gruppe mit `symbol: "cable"` und Parametern:

```json
{ "symbol": "cable", "left": 2, "right": 2, "direction": "front" }
```

- `left` und `right` sind die Maschenzahlen der beiden Stränge im Bild.
  Die zuerst gestrickte Masche steht in einer Hinreihe **rechts**.
- `direction: "front"` heißt: die zuerst gestrickten Maschen (im Bild
  rechts) liegen vorne, also ist das **rechte Bündel durchgezogen** (C4F).
- `direction: "back"` heißt: die zuerst gestrickten Maschen liegen hinten,
  also ist das **linke Bündel durchgezogen** (C4B).
- Die Spannweite ist `left + right`.
- Jeder Strang wird als Bündel aus `left` bzw. `right` parallelen Linien
  gezeichnet. Das vordere Bündel bekommt eine Hintergrundkontur, damit das
  hintere sichtbar unterbrochen wird.
- Die Stränge verlaufen als weiche Kurven und kreuzen sich in der Mitte.

Damit sind 1/1, 2/2, 3/3 und 4/4 ohne neue Glyphen darstellbar. Die Legende
nennt die genaue Ausführung.

## Beschriftete Gruppen

Für Sonderfälle gibt es `symbol: "custom"` mit `label` und `span`. Das Zeichen
ist ein dünner Rahmen mit Text. Es ist ausdrücklich die Ausnahme, nicht der
Standard. Die Legende übernimmt den Text.

## Farben

Farbe ist eine eigene Ebene. Jede Zelle kann eine Paletten-ID tragen.

- Die Palette ist Teil des Charts: `{ "id": "A", "name": "Weiß", "hex": "#ffffff" }`.
- `null` bedeutet keine Farbe (Papierfarbe).
- Symbole werden schwarz oder weiß gezeichnet, je nach Helligkeit der
  Hintergrundfarbe. Farbe ist nie das einzige Unterscheidungsmerkmal.
- Die Legende zeigt Farbfelder mit Namen, nicht nur Hex-Werte.

## Eigene Packs

Ein Symbol-Pack ist eine Datenstruktur mit `id`, `name`, `symbols`. Die App
lädt später weitere Packs. Ein Pack darf die IDs des Klar-Packs überschreiben,
muss aber im Chart vermerkt sein, damit alte Dateien reproduzierbar bleiben.

Für die erste Version ist nur Klar eingebaut. Die Struktur ist so angelegt,
dass ein „Klassisch“-Pack und eigene Packs ohne Eingriff in den Editor
dazukommen können.
