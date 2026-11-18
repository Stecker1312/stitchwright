# Stitchwright

**Strickschriften zeichnen, lokal und frei.** Ein moderner Editor für
Strickdiagramme, der im Browser läuft, offline funktioniert und niemandem
etwas nach Hause schickt.

> Status: Alpha, noch nicht veröffentlicht. Das Repository ist vorerst privat.
> Erst wenn der Editor benutzbar ist, wird es öffentlich.

## Warum

Strickschriften entstehen oft noch auf Kästchenpapier oder in kommerzieller
Software. Stitchwright ist die offene Alternative: kostenlos, lokal,
plattformunabhängig und mit einem offenen Dateiformat. Keine Cloud, keine
Konten, keine Telemetrie.

## Was es kann

- Raster beliebiger Größe, auch für große Muster
- Symbolsprache **Klar**: re, li, Umschlag, Abnahmen, Zunahmen, Zöpfe,
  Bobbel, verkürzte Reihen, Farbflächen
- Mehrfachsymbole als eine Gruppe: ein Zopf über sechs Maschen ist ein
  Symbol, nicht sechs Kästchen
- Hin- und Rückreihen oder nur Hinreihen mit Nummerierung 1, 3, 5 …
- Rapport markieren, Legende automatisch erzeugen
- Farben pro Masche, auch für Fair Isle und Intarsien
- Export als SVG und PNG, Druck über den Browser
- Hell/Dunkel/System, metrisch/imperial, Deutsch/Englisch
- Tastatur, Maus, Touch und Stift
- Offline als PWA installierbar

## Was es bewusst nicht ist

Keine Strickanleitung, kein Pattern-Rechner, kein Row-Counter, keine Cloud,
keine Konten, keine Kollaboration. Diese Dinge können später als optionale
Module dazukommen; der Kern bleibt schlank.

## Start

Voraussetzung: Node.js 20 oder neuer. Keine Installation, keine
Abhängigkeiten.

```bash
git clone https://github.com/Stecker1312/stitchwright.git
cd stitchwright
npm start
```

Dann <http://localhost:8080> öffnen.

```bash
npm test      # Node-Tests
npm run check # Tests und Syntaxprüfung
```

## Für Agenten

Das Chart-Format ist versioniertes JSON. Die CLI prüft und rendert ohne
Browser:

```bash
node cli/stitchwright.js validate chart.strickschrift.json
node cli/stitchwright.js render chart.strickschrift.json chart.svg
node cli/stitchwright.js new --width 40 --height 24 --out chart.strickschrift.json
```

Details: [`docs/format.md`](docs/format.md).

## Technik

- Statische Web-App, keine Laufzeitabhängigkeiten
- Vanilla JavaScript ES Modules, Canvas für den Editor, SVG für den Export
- Service Worker und Web-App-Manifest für Offline-Betrieb
- IndexedDB und localStorage für lokale Daten
- Tests mit `node:test`; Browserprüfung mit Playwright
- JSON-Schema unter `schema/strickschrift.schema.json`

## Dokumentation

- [Symbolsprache Klar](docs/symbols.md)
- [Chart-Format](docs/format.md)
- [Entscheidungen (ADRs)](docs/adr/)
- [Arbeitsabläufe (SOPs)](docs/sop/)
- [Status](STATUS.md)
- [Arbeitsjournal](docs/JOURNAL.md)

## Datenschutz

Stitchwright sendet keine Daten. Es gibt keine Analyse, keine Werbung, keine
externen Ressourcen. Alles bleibt auf dem Gerät oder in Dateien, die du selbst
speicherst.

## Transparenz

Der Code wurde von einem KI-Agenten (DeepSeek V4.1 Flash) im Auftrag von
Daniel geschrieben und von ihm fachlich geprüft. Die Entscheidungen und
Grenzen stehen in den ADRs. Fehler sind möglich; Issues und Korrekturen sind
willkommen.

## Lizenz

GPL-3.0. Siehe [`LICENSE`](LICENSE).
