# D003 – Symbolsprache „Klar“

- Datum: 2026-11-18
- Status: Gültig
- Betrifft: Stitchwright

## Zusammenhang

Es gibt keinen verbindlichen internationalen Standard für Strickzeichen.
CYC, JIS und Verlagszeichen sind ähnlich, aber widersprüchlich. Viele
bestehende Zeichen sind klein, detailreich und ohne Legende nicht lesbar.
Daniel möchte eine eigene, intuitive, einfache Symbolik; vorhandene Zeichen
sollen als Kompatibilitäts-Pack möglich bleiben.

## Entscheidung

Das Standard-Pack heißt **Klar**; auf Englisch heißt es **Clear**. Die Symbol-IDs bleiben gleich. Es folgt diesen Regeln:

1. Drei gelernte Anker bleiben: leeres Kästchen = re, Punkt = li,
   Kreis = Umschlag.
2. Eine Strichstärke, eine Punktgröße, ein 1×1-Raster pro Masche.
3. Die Fläche ist die Maschenzahl. Ein Zopf über 6 M spannt 6 Kästchen.
4. Richtung ist Form, nicht Farbe. Neigungen und Kreuzungen haben eine
   sichtbare Asymmetrie und eine kleine Pfeilspitze.
5. Zöpfe sind zwei Seile. Das vordere Seil ist durchgezogen, das hintere
   unterbrochen. Die Anzahl der Einzelstränge je Seite zählt die Maschen.
6. Parameter werden als Marken dargestellt, Text nur bei echten Sonderfällen.
7. Monochrom zuerst; Farbe ist eine optionale Ebene, nie das einzige Signal.
8. Jedes Chart erzeugt automatisch eine Legende.

Die vollständige Liste und die Zeichenregeln stehen in `docs/symbols.md`.
Glyphen werden als SVG-Pfade in einem 0…1-Raster definiert und von Canvas
und SVG-Export gemeinsam genutzt.

## Folgen

- Einheitliches, ruhiges Bild, das auch in Schwarzweiß und klein funktioniert.
- Eigene Zeichen müssen getestet und mit Daniel abgestimmt werden.
- Ein „Klassisch“-Pack und eigene Packs bleiben möglich; die App darf nicht
  auf Klar fest verdrahtet sein.

## Alternativen

- CYC/JIS übernehmen: vertraut, aber inkonsistent und lizenzrechtlich
  unklarer, außerdem kein eigenes Profil.
- Freie Textlabels: einfach, aber langsam zu lesen und nicht intuitiv.
