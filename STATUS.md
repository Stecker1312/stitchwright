# Status

- Stand: 2026-11-18
- Version: **0.2.0-alpha.1**
- Phase: Öffentliche Vorabversion (Alpha)
- Sichtbarkeit: öffentlich, GitHub Pages:
  <https://stecker1312.github.io/stitchwright/>
- Repository: <https://github.com/Stecker1312/stitchwright>
- Lizenz: GPL-3.0

## Entschieden

- Name **Stitchwright**, Standard-Symbolpack **Klar**
- Statische Web-App/PWA, kein Backend, keine Cloud, keine Konten, keine
  Telemetrie, keine Kollaboration
- Vanilla JavaScript, Canvas-Editor, SVG-Export, keine Laufzeitabhängigkeiten
- Deutsch und Englisch gepflegt; weitere Sprachen von Anfang an vorbereitet
- Farben sind Teil des Datenmodells und der Oberfläche
- Editor zuerst; Anleitung, Rechnen, Row-Counter, Cloud und Kollaboration sind
  spätere optionale Module oder ausdrücklich ausgeschlossen
- Agenten schreiben den Code; Daniel prüft fachlich. Transparenz im README.
- Veröffentlichung als frühe Alpha; kein Support-Versprechen.

## Erledigt

- Projektordner, Git-Repository, GPL-3.0
- Projektregeln, README, Status, Journal, Roadmap, Changelog
- ADRs D001–D009, SOPs 001–005
- Symbolsprache Klar mit 20 Symbolen und Zopf-Generator
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
- PWA mit Service Worker, offline getestet
- 64 Node-Tests grün; Browserprüfung mit Chromium/Playwright
- Beispiel-Charts unter `samples/`, Projektseite `about.html`

## In Arbeit / offen

- Stabilität und Fehler aus der ersten öffentlichen Alpha
- Touch/Stift auf echten Geräten prüfen
- Eigene Symbol-Packs und Symbol-Editor
- Weitere Sprachen: Infrastruktur steht, Übersetzungen folgen
- Import/Export mit weiteren offenen Formaten
- Screenshots und Contribution-Hinweise sind vorhanden; Issue-Vorlagen folgen
- V-Probe als reale Abnahme zeichnen

## Nächster Schritt

1. Öffentliche Alpha beobachten und Issues triagieren.
2. Fehler beheben, Tests erweitern.
3. Übersetzungen und Symbol-Packs als Beiträge ermöglichen.
4. Keine Cloud-Funktion ohne neue ADR.

## Tests

`npm test`: 64 Tests grün (Modell, Validierung, Symbole, SVG, i18n,
Einheiten, Viewport, CLI, Performance).
`npm run check`: Syntax- und JSON-Prüfung plus Tests grün.
Browser: Zeichnen, Farben, Zöpfe, Rückreihen, Undo, Export, Scrollbalken,
eigene Gruppen mit Legendentext, PWA offline manuell mit Playwright geprüft.
