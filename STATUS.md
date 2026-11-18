# Status

- Stand: 2026-11-18
- Phase: Editor-MVP
- Sichtbarkeit: privates GitHub-Repository, **nicht veröffentlicht**
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

## Erledigt

- Projektordner, Git-Repository, GPL-3.0
- Projektregeln, README, Status, Journal, Roadmap
- ADRs D001–D008, SOPs 001–005
- Symbolsprache Klar mit 20 Symbolen und Zopf-Generator
- Chart-Modell, Validierung, JSON-Schema
- SVG-Export und Node-CLI (`validate`, `render`, `new`, `legend`)
- Canvas-Editor: Raster, Pan/Zoom, Stifte, Radierer, Auswahl, Gruppen,
  Farben, Undo/Redo, Rückreihen-Umschalter, Rapport, Legende
- Speichern/Laden in IndexedDB, JSON-Export, SVG/PNG, Druck
- Leer-Hinweis schließbar und persistent; immer sichtbare Schnell-Buttons
  für `+ Reihe` und `+ Spalte` auf der Zeichenfläche
- Reihen- und Spaltennummern anklickbar; Papierkorb löscht die ausgewählte
  Reihe oder Spalte nach Bestätigung
- Eigene beschriftete Gruppen bleiben in einer lokalen Bibliothek und
  erscheinen unter „Eigene“ in der Symbolleiste; Dialog-Platzhalter ist „Name“
- Zopfrichtung korrigiert: „vorne“ zeigt den zuerst gestrickten (rechten)
  Strang oben, „hinten“ den linken
- Horizontale und vertikale Scrollbalken auf der Zeichenfläche, sichtbar
  sobald das Chart größer als der Ausschnitt ist; Panels und Dialoge haben
  sichtbare native Scrollbalken
- Deutsch/Englisch, hell/dunkel/System/hoher Kontrast, metrisch/imperial
- PWA mit Service Worker, offline getestet
- 57 Node-Tests grün; Browserprüfung mit Chromium/Playwright
- Beispiel-Charts unter `samples/`

## In Arbeit / offen

- Feinschliff der Zopf-Glyphen (Über-/Unterführung deutlicher)
- Mobile/Touch-Prüfung auf echten Geräten
- Eigene Symbol-Packs und Symbol-Editor
- Weitere Sprachen: Infrastruktur steht, Übersetzungen folgen
- Import aus der Textilwerkstatt (YAML → JSON)
- Screenshots und Contribution-Hinweise für die Veröffentlichung
- V-Probe als reale Abnahme zeichnen

## Nächster Schritt

1. V-Probe im Editor zeichnen und als SVG drucken.
2. Letzte UX-Fehler aus dem Test mit Daniel einarbeiten.
3. Version 0.1.0 einfrieren, Screenshots erstellen.
4. Erst dann Repository öffentlich schalten (SOP-004).

## Tests

`npm test`: 57 Tests grün (Modell, Validierung, Symbole, SVG, i18n,
Einheiten, Viewport, CLI, Performance).
`npm run check`: Syntax- und JSON-Prüfung plus Tests grün.
Browser: Zeichnen, Farben, Zöpfe, Rückreihen, Undo, Export, PWA offline
manuell mit Playwright geprüft.
