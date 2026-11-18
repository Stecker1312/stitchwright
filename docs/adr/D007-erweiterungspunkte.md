# D007 – Erweiterungspunkte, aber kein Ballast

- Datum: 2026-11-18
- Status: Gültig
- Betrifft: Stitchwright

## Zusammenhang

Daniel möchte die Tür für spätere Funktionen offen halten: Anleitung,
Pattern-Rechnen, Row-Counter, vielleicht Synchronisation. Gleichzeitig soll
die erste Version klein, schnell und prüfbar bleiben.

## Entscheidung

Der Kern bleibt ein reiner Chart-Editor. Erweiterungen docken an klaren
Schnittstellen an:

- **Dokumentmodell** (`src/core/chart.js`) ist die einzige Quelle für ein
  Chart. Jedes Modul liest und schreibt dieses Modell.
- **Symbol-Packs** sind Daten, kein Code. Neue Symbole brauchen keine
  Änderung am Editor.
- **Renderer** sind getrennt: Canvas für die Ansicht, SVG für Export und CLI.
- **Locale-Dateien** sind Daten.
- **Persistenz** ist eine Schicht; ein späterer Sync müsste sie ersetzen,
  nicht den Editor.
- **CLI** ist ein zweiter Host desselben Kerns.

Nicht gebaut werden ohne neue ADR: Anleitungsgenerator, Pattern-Rechner,
Row-Counter, Cloud, Konten, Kollaboration, native Apps.

## Folgen

- Die erste Version bleibt fokussiert.
- Spätere Module können ohne Umbau des Editors entstehen.
- Jedes neue Modul braucht eine eigene Entscheidung, Tests und Dokumentation.

## Alternativen

- Alles sofort bauen: Scope-Explosion, hohes Risiko, nichts wird fertig.
- Alles ausschließen: unnötig eng; die Schnittstellen kosten kaum mehr.
