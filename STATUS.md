# Status

- Stand: 2026-11-22
- Version: **0.6.7-alpha.1**
- Phase: Öffentliche Vorabversion (Alpha)
- Sichtbarkeit: öffentlich, GitHub Pages:
  <https://stecker1312.github.io/stitchwright/>
- Repository: <https://github.com/Stecker1312/stitchwright>
- Lizenz: GPL-3.0

## Entschieden

- Name **Stitchwright**, Standard-Symbolpack **Klar** (englisch **Clear**)
- Statische Web-App/PWA, kein Backend, keine Cloud, keine Konten, keine
  Telemetrie, keine Kollaboration
- Vanilla JavaScript, Canvas-Editor, SVG-Export, keine Laufzeitabhängigkeiten
- Deutsch und Englisch gepflegt; weitere Sprachen von Anfang an vorbereitet
- Farben sind Teil des Datenmodells und der Oberfläche
- Editor zuerst; Anleitung, Rechnen, Row-Counter, Cloud und Kollaboration sind
  spätere optionale Module oder ausdrücklich ausgeschlossen
- Agenten schreiben den Code; Daniel prüft fachlich. Transparenz im README.
- Veröffentlichung als frühe Alpha; kein Support-Versprechen.
- Englisch (britisch, einfach) ist Standard- und Präsentationssprache;
  Deutsch bleibt vollständig wählbar (D010).

## Erledigt

- 0.6.7-alpha.1 veröffentlicht (2026-11-22): Reihennummern an der Startseite,
  Abnahmen in voller Maschenbreite
- 0.6.6-alpha.1 veröffentlicht (2026-11-22): Wende wieder in der Palette
- 0.6.5-alpha.1 veröffentlicht (2026-11-22): Runden als Chart-Eigenschaft,
  CI-Check ohne Lockfile-Abhängigkeit
- Projektordner, Git-Repository, GPL-3.0
- Projektregeln, README, Status, Journal, Roadmap, Changelog
- ADRs D001–D010, SOPs 001–005
- Symbolsprache Klar (englisch Clear) mit 20 Symbolen und Zopf-Generator
- Chart-Modell, Validierung, JSON-Schema
- SVG-Export und Node-CLI (`validate`, `render`, `new`, `legend`)
- Canvas-Editor: Raster, Pan/Zoom, Stifte, Radierer, Auswahl, Gruppen,
  Farben, Undo/Redo, Rückreihen-Umschalter, Runden, Rapport, Legende
- Speichern/Laden in IndexedDB, JSON-Export, SVG/PNG, Druck
- Leer-Hinweis schließbar und persistent; Schnell-Buttons für Reihen/Spalten
- Reihen- und Spaltennummern anklickbar; Papierkorb löscht die ausgewählte
  Reihe oder Spalte nach Bestätigung
- Reihennummern stehen an der Startseite: Hinreihen rechts, Rückreihen links;
  in Runden und bei „Nur Hinreihen“ rechts. Beim Hineinzoomen bleiben sie am
  Viewport-Rand sichtbar; die Nummernspalten sind auf beiden Seiten anklickbar
- Spaltennummern stehen oben und unten. Auch sie heften sich beim Zoomen an
  den Viewport-Rand und sind oben und unten anklickbar
- Fester Hintergrundrahmen um die Zeichenfläche: Auch bei maximalem Zoom
  bleiben an allen vier Seiten Rand und Hintergrund sichtbar; die
  Nummernspalten liegen in diesem Rahmen, nicht auf den Maschen
- Scrollbalken erlauben an beiden Enden 40 px Überweg; die erste und letzte
  Masche lassen sich vollständig mit Hintergrund vor den Rahmen schieben
- Maschenmarker als gestrichelte Zeichenhilfe, einzeln oder alle N Maschen;
  nicht Teil der Strickanleitung
- Bereiche auswählen, kopieren und einfügen, inklusive Farben und Gruppen
- Eigene beschriftete Gruppen bleiben in einer lokalen Bibliothek und
  erscheinen unter „Eigene“; optionaler Legendentext
- Eigene Zöpfe bleiben in einer lokalen Bibliothek („Eigene Zöpfe“) und sind
  nach einem Werkzeugwechsel mit einem Klick wieder verfügbar; der Dialog
  startet mit dem zuletzt verwendeten Zopf
- Reihen- und Spaltenbereiche lassen sich über die Nummern ziehen oder per
  Shift-Klick markieren und gemeinsam löschen
- Rechteckauswahl funktioniert auch, wenn sie auf einer Gruppe beginnt; ein
  Klick auf die Gruppe wählt weiterhin die Gruppe. Kopieren/Einfügen per
  Ctrl+C/Ctrl+V nimmt Farben und Gruppen mit
- Optionale Maschenzahlen markieren den Anfang jeder Folge gleicher Maschen;
  im Panel schaltbar, im SVG-Export und Druck enthalten
- Wende ist als Hilfszeichen wieder in der Palette: verkürzte Reihen an
  Fersen, Halsausschnitten und formgestrickten Teilen lassen sich damit
  markieren. Abketten und Anschlagen bleiben ausgeblendet; alte Charts mit
  allen drei IDs laden und rendern weiterhin
- Zopfrichtung: „vorne“ = zuerst gestrickter (rechter) Strang oben,
  „hinten“ = linker Strang oben
- Horizontale und vertikale Scrollbalken für die Zeichenfläche; sichtbare
  Scrollbalken in Panels, Dialogen, Tabellen und der oberen Bedienleiste
- Deutsch/Englisch, hell/dunkel/System/hoher Kontrast, metrisch/imperial
- Englisch (britisch) als Standardsprache in Oberfläche, Startseite,
  Validierungsmeldungen, CLI, Manifest und README; Beispiel-Charts englisch
- PWA mit Service Worker, offline getestet
- 167 Node-Tests grün; Browserprüfung mit Chromium/Playwright
- Englische Projektseite `about.html` mit Browser-first-Schnellstart, Preisvergleich, Clear-Symbolpack und Planned-Liste
- Englischer Screenshot, Version 0.6.7 (aktueller Editor)
- Audit-Pakete A, B und C umgesetzt: Dokument-/Speichersicherheit, valide
  UI-Kommandos, Rohvalidierung, sichere Symbol-Lookups und CLI-Vertrag;
  zentrale Teile von D, E und F folgen mit den verbleibenden P2-Punkten
- Einsteiger-How-to auf Englisch und Deutsch (`how-to.html`,
  `how-to.de.html`), verlinkt in App-Hilfe, README und Projektseite
- Symbolstudie C (konstruktiv) als Standard umgesetzt: bestehende IDs bleiben,
  Perle/Wende/Abketten/Anschlagen im gleichen Stil ergänzt, zusätzlich
  `ptbl`, `slipw`, `p2tog` und `ssp` (D011)
- Beispiel-Charts unter `samples/`, Screenshot und Symbol-Doku auf C umgestellt
- Asymmetrische Zöpfe zeichnen das hintere Bündel als kurzen Schenkel, der ins
  durchgehende Vorderband mündet; symmetrische Zöpfe behalten das volle X
  (D011-Nachtrag)
- Zopf-Legenden nennen die Zahlen vorne/hinten und die Maschen auf der
  Hilfsnadel („Cable 2/1 · 1 held back“); asymmetrische Front-Legenden waren
  vorher vertauscht
- Beispiel `samples/asymmetric-cables.strickschrift.json` mit gerendertem SVG
  vergleicht 1/2, 2/1 und 3/2 mit symmetrischen Kontrollen
- Farbige Hilfslinien zwischen Maschen (D012): Klick setzt eine Linie über die
  ganze Höhe, Ziehen begrenzt sie auf Reihen; eigene Farbe pro Linie,
  Klick/Rechtsklick entfernt, Canvas/SVG/CLI teilen dasselbe Modell
- Charts sind flach oder in Runden (D013): `options.construction` ist
  additiv, Rundcharts zeigen alle Runden und nummerieren 1 … n, der
  Rückreihen-Umschalter bleibt flach; CLI `new --round`

## In Arbeit / offen

- Umfassender [Code-Audit vom 2026-11-19](docs/audits/2026-11-19-code-audit.md):
  38 priorisierte Befunde. Alle P1-Pfade, die zentralen P2-Themen
  (Save-Koordination, Sprachregistry, Mehrfarben-Kontrast, Persistenzzustände,
  Browser-SOP, Golden-Sample-Tests) und die Performance-Messung sind
  abgedeckt. Offen bleiben der weitere App-Shell-Zuschnitt, eine echte
  Browser-Matrix mit vielen gespeicherten Charts, Patch-History bei Bedarf
  sowie Touch-, Druck- und Strickabnahme. Die Featureliste ist keine
  Zuverlässigkeitsabnahme.
- Stabilität und Fehler aus der ersten öffentlichen Alpha
- Hilfslinien sind vorerst senkrecht auf Maschengrenzen; waagerechte oder
  treppenförmige Linien nur bei konkretem Bedarf
- Touch/Stift auf echten Geräten prüfen
- Eigene Symbol-Packs und Symbol-Editor
- Eigene Bibliothekseinträge lassen sich noch nicht löschen; die Zopf-Liste ist
  auf 24 Einträge begrenzt, die Gruppenliste wächst unbegrenzt
- Bereichsauswahl, Maschenzahlen und Kopieren/Einfügen auf echten Touch-Geräten
  prüfen
- Weitere Sprachen: Infrastruktur steht, Übersetzungen folgen
- Import/Export mit weiteren offenen Formaten
- Screenshots, Contribution-Hinweise und Issue-Vorlagen sind vorhanden
- Eine reale Abnahme mit einem eigenen Projekt zeichnen

## Nächster Schritt

1. Audit-Rest abschließen: App-Shell weiter entflechten, echte Browser-Matrix
   mit vielen gespeicherten Charts, Patch-History nur bei nachgewiesenem Bedarf.
2. Touch/Stift, Druck und eine reale Strickabnahme auf echten Geräten prüfen.
3. Übersetzungen und Symbol-Packs als Beiträge ermöglichen.
4. Keine Cloud-Funktion ohne neue ADR.

## Tests

`npm test`: 167 Tests grün (Modell, Validierung, Symbole, SVG, i18n,
Einheiten, Viewport, Hilfslinien, Runden, CLI, Performance).
`npm run check`: Syntax- und JSON-Prüfung plus Tests grün.
Browser: Zeichnen, Farben, Zöpfe, Rückreihen, Undo, Export, Scrollbalken,
eigene Gruppen mit Legendentext, PWA offline manuell mit Playwright geprüft.
Zusätzlich: 2/1-Zopf hinten aus dem Dialog platziert und bei 70 % und 146 %
Zoom geprüft; Vorderband durchgehend, hinterer Schenkel rechts. Die
Properties-Legende zeigt „Cable 2/1 · 1 held back“.
Reihennummern: im Round-test-Chart wechseln sie mit der Reihe (1 rechts,
2 links …); in Runden und bei „Nur Hinreihen“ stehen alle rechts. Beim Zoomen
bleiben sie am Viewport-Rand sichtbar; beide Nummernspalten wählen dieselbe
Reihe.
Abnahmen: ssk deckt im Chart zwei Zellen und schließt direkt an die
„keine Masche“-Zellen an; k3tog und cdd decken drei Zellen.
Spaltennummern: bei 105 % und 286 % Zoom oben und unten sichtbar; im
Zoom oben und unten angeheftet, Klick auf die obere Nummer wählt Spalte 24,
Klick auf die untere Spalte 21.
Rahmen: bei 286 % Zoom auf allen vier Seiten sichtbar; Klick in den rechten
Rahmen wählt Reihe 12 und malt keine Zelle. Hell und dunkel geprüft.
Scrollbalken: bei 286 % Zoom zeigt Home die linke Musterkante und die
äußerste Masche vollständig mit Rand, End die rechte Kante und Masche 1;
40 px Überweg an beiden Seiten.
Runden: neues 12 × 6-Chart in Runden, alle Runden sichtbar, Status/Tabelle/
Einstellungen sagen „Runde“, der Rückreihen-Umschalter ist ausgeblendet,
Wechsel zurück auf flach funktioniert; Englisch und Deutsch, hell und dunkel.
Autosave und Neuladen behalten `construction: "round"` und `rowsMode: "all"`.
Hilfslinien: Linie über die ganze Höhe, Teil-Linie über Ziehen, zwei Farben,
Klick- und Rechtsklick-Löschen, Alle-löschen, Rückgängig sowie Autosave und
Neuladen mit 42 × 26-Chart geprüft.

Audit-Ergänzung: `node docs/audits/2026-11-19-probes.mjs` reproduziert
Fehler am Ausgangscommit `d3b1ff8`; kein Sollverhalten und kein Ersatz für
Regressionstests. Zusätzliche Chromium-Proben bestätigten doppelte Gruppen-IDs,
falschen Speicherstatus, Tastaturprobleme und abgeschnittene Exportlegenden.
