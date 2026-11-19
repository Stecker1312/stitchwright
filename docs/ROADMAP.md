# Roadmap

Keine Datumsversprechen. Die Reihenfolge ist wichtig, die Dauer nicht.

## M0 – Grundlage (erledigt)

- Projekt, Git, Lizenz, Regeln
- ADRs und SOPs
- Symbol- und Formatentscheidung

## M1 – Kern und Editor-MVP (erledigt)

- Chart-Modell, Validierung, JSON-Schema
- Symbolpack Klar/Clear als Glyphen
- SVG-Export und Node-CLI
- Canvas-Editor: Raster, Pan/Zoom, Malen, Radieren, Auswahl
- Gruppen für Zöpfe und Mehrfachsymbole
- Undo/Redo, Farben, Reihenmodus, Rapport, Legende
- Speichern/Laden, Autosave, SVG/PNG, Druck
- Tastatur, Maus, Touch, Stift
- Deutsch/Englisch, hell/dunkel/system, metrisch/imperial

**Abnahme:** Der Editor ist benutzbar; eine reale
Strickabnahme bleibt offen.

## M2 – Vorzeigbar (Alpha veröffentlicht)

- PWA offline, Installation
- Symbolsuche, Legende, eigene Gruppen mit Legendentext
- Maschenmarker und Bereichs-Kopieren
- Fehler- und Leerzustände, Onboarding
- Tests für Kern und Browser
- README, Screenshots, Contribution-Hinweise
- Veröffentlichung als **0.1.0-alpha.1**

Offen aus M2: Theme-Editor, Favoriten, letzte Touch-Prüfungen auf echten
Geräten.

## M3 – Ausbau

- Stabilität und Fehler aus der Alpha
- Eigene Symbol-Packs, SVG-Import mit Sanitisierung
- Theme-Editor
- Übersetzungen für 20 europäische Sprachen, Status und Review
- Erweiterte Drucklayouts
- Farbmuster: Fair Isle, Intarsien, Palette
- Bildvorlage zum Nachzeichnen
- Import aus der Textilwerkstatt (YAML → JSON)
- Optionale Module nur nach neuer ADR: Anleitung, Rechnen, Row-Counter

## Nicht geplant

Cloud, Konten, Kollaboration, Telemetrie, native Apps. Wenn sich das ändert,
entscheidet eine ADR neu.
