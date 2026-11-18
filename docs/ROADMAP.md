# Roadmap

Keine Datumsversprechen. Die Reihenfolge ist wichtig, die Dauer nicht.

## M0 – Grundlage (erledigt)

- Projekt, Git, Lizenz, Regeln
- ADRs und SOPs
- Symbol- und Formatentscheidung

## M1 – Kern und Editor-MVP

- Chart-Modell, Validierung, JSON-Schema
- Symbolpack Klar als Glyphen
- SVG-Export und Node-CLI
- Canvas-Editor: Raster, Pan/Zoom, Malen, Radieren, Auswahl
- Gruppen für Zöpfe und Mehrfachsymbole
- Undo/Redo, Farben, Reihenmodus, Rapport, Legende
- Speichern/Laden, Autosave, SVG/PNG, Druck
- Tastatur, Maus, Touch, Stift
- Deutsch/Englisch, hell/dunkel/system, metrisch/imperial

**Abnahme:** Die Gugel-V-Probe lässt sich zeichnen, speichern, neu laden und
als sauberes SVG drucken.

## M2 – Vorzeigbar

- PWA offline, Installation
- Themes und Dichte einstellbar
- Symbolsuche und Favoriten
- Legenden-Editor
- Fehler- und Leerzustände, Onboarding
- Tests für Kern und Browser
- README mit Screenshots, Contribution-Hinweise
- Veröffentlichung als v0.1

## M3 – Ausbau

- Eigene Symbol-Packs, SVG-Import mit Sanitisierung
- Übersetzungen für 20 europäische Sprachen, Status und Review
- Erweiterte Drucklayouts
- Farbmuster: Fair Isle, Intarsien, Palette
- Bildvorlage zum Nachzeichnen
- Import aus der Textilwerkstatt (YAML → JSON)
- Optionale Module nur nach neuer ADR: Anleitung, Rechnen, Row-Counter

## Nicht geplant

Cloud, Konten, Kollaboration, Telemetrie, native Apps. Wenn sich das ändert,
entscheidet eine ADR neu.
