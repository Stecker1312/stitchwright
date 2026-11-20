# Status

- Stand: 2026-11-20
- Version: **0.4.0-alpha.1**
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

- Projektordner, Git-Repository, GPL-3.0
- Projektregeln, README, Status, Journal, Roadmap, Changelog
- ADRs D001–D010, SOPs 001–005
- Symbolsprache Klar (englisch Clear) mit 20 Symbolen und Zopf-Generator
- Chart-Modell, Validierung, JSON-Schema
- SVG-Export und Node-CLI (`validate`, `render`, `new`, `legend`)
- Canvas-Editor: Raster, Pan/Zoom, Stifte, Radierer, Auswahl, Gruppen,
  Farben, Undo/Redo, Rückreihen-Umschalter, Rapport, Legende
- Speichern/Laden in IndexedDB, JSON-Export, SVG/PNG, Druck
- Leer-Hinweis schließbar und persistent; Schnell-Buttons für Reihen/Spalten
- Reihen- und Spaltennummern anklickbar; Papierkorb löscht die ausgewählte
  Reihe oder Spalte nach Bestätigung
- Maschenmarker als gestrichelte Zeichenhilfe, einzeln oder alle N Maschen;
  nicht Teil der Strickanleitung
- Bereiche auswählen, kopieren und einfügen, inklusive Farben und Gruppen
- Eigene beschriftete Gruppen bleiben in einer lokalen Bibliothek und
  erscheinen unter „Eigene“; optionaler Legendentext
- Zopfrichtung: „vorne“ = zuerst gestrickter (rechter) Strang oben,
  „hinten“ = linker Strang oben
- Horizontale und vertikale Scrollbalken für die Zeichenfläche; sichtbare
  Scrollbalken in Panels, Dialogen, Tabellen und der oberen Bedienleiste
- Deutsch/Englisch, hell/dunkel/System/hoher Kontrast, metrisch/imperial
- Englisch (britisch) als Standardsprache in Oberfläche, Startseite,
  Validierungsmeldungen, CLI, Manifest und README; Beispiel-Charts englisch
- PWA mit Service Worker, offline getestet
- 108 Node-Tests grün; Browserprüfung mit Chromium/Playwright
- Englische Projektseite `about.html` mit Browser-first-Schnellstart, Preisvergleich, Clear-Symbolpack und Planned-Liste
- Englischer Screenshot, Version 0.4.0-alpha.1
- Audit-Pakete A, B und C umgesetzt: Dokument-/Speichersicherheit, valide
  UI-Kommandos, Rohvalidierung, sichere Symbol-Lookups und CLI-Vertrag;
  zentrale Teile von D, E und F folgen mit den verbleibenden P2-Punkten
- Beispiel-Charts unter `samples/`

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
- Touch/Stift auf echten Geräten prüfen
- Eigene Symbol-Packs und Symbol-Editor
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

`npm test`: 108 Tests grün (Modell, Validierung, Symbole, SVG, i18n,
Einheiten, Viewport, CLI, Performance).
`npm run check`: Syntax- und JSON-Prüfung plus Tests grün.
Browser: Zeichnen, Farben, Zöpfe, Rückreihen, Undo, Export, Scrollbalken,
eigene Gruppen mit Legendentext, PWA offline manuell mit Playwright geprüft.

Audit-Ergänzung: `node docs/audits/2026-11-19-probes.mjs` reproduziert
Fehler am Ausgangscommit `d3b1ff8`; kein Sollverhalten und kein Ersatz für
Regressionstests. Zusätzliche Chromium-Proben bestätigten doppelte Gruppen-IDs,
falschen Speicherstatus, Tastaturprobleme und abgeschnittene Exportlegenden.
