# D001 – Zweck: Strickschrift-Editor, kein Anleitungsgenerator

- Datum: 2026-11-18
- Status: Gültig
- Betrifft: Stitchwright

> Ergänzt durch D013: Charts können zusätzlich als Runden ausgezeichnet werden.
> Der Kern bleibt ein Editor; Runden sind eine Chart-Eigenschaft, keine
> Anleitungsfunktion.

## Zusammenhang

Daniel will Strickschriften nicht mehr auf Kästchenpapier zeichnen. Ein
früherer Versuch, komplette Strickanleitungen von einem Agenten schreiben zu
lassen, war fachlich unbrauchbar; das Diagramm war brauchbar. Der Bedarf ist
eindeutig das Diagramm, nicht der Fließtext.

## Entscheidung

Stitchwright ist ein Editor für Strickdiagramme. Der Kern kann:

- ein Raster zeichnen,
- Symbole und Mehrfachsymbole setzen,
- Farben verwalten,
- Hin- und Rückreihen darstellen,
- Rapport und Legende erzeugen,
- als JSON speichern und als SVG/PNG exportieren.

Der Kern erzeugt **keine** Strickanleitung, rechnet keine Größen und zählt
keine Reihen.

## Folgen

- Einfacher, kleiner, schneller und leichter zu prüfen.
- Die Symbolsprache und das Dateiformat sind das Produkt.
- Anleitung, Pattern-Rechnen und Row-Counter können später als optionale
  Module entstehen, ohne den Editor umzubauen (siehe D007).

## Alternativen

- Vollständiger Anleitungsgenerator: fachlich riskant, textlastig, nicht
  Daniels Bedarf.
- Reiner SVG-Editor ohne Strick-Semantik: zu wenig; Zöpfe, Rapport und
  Rückreihen brauchen Bedeutung.
