# Stitchwright

**Strickschriften zeichnen, lokal und frei.** Ein Editor für Strickdiagramme,
der im Browser läuft, offline funktioniert und niemandem etwas nach Hause
schickt.

> **Frühe Vorabversion 0.2.0-alpha.1 (2026-11-18).**
> Noch nicht für Produktivdaten. Fehler, unfertige Ecken und Änderungen am
> Dateiformat sind möglich. Bitte wichtige Charts zusätzlich als JSON-Datei
> sichern.
>
> **Live-Demo:** <https://stecker1312.github.io/stitchwright/>  
> **Ausführliche Projektseite:** <https://stecker1312.github.io/stitchwright/about.html>

## Was ist Stitchwright?

Stitchwright ersetzt das Kästchenpapier: Du setzt Symbole in ein Raster,
zeichnest Zöpfe über mehrere Maschen, markierst Rapporte und exportierst das
Ergebnis als sauberes SVG. Die App ist kein Anleitungsgenerator – das Diagramm
ist das Produkt.

Das Projekt ist bewusst lokal-first: keine Cloud, keine Konten, keine
Telemetrie. Charts liegen im Browser oder in Dateien, die du selbst speicherst.
Dasselbe offene JSON-Format kann von Menschen im Editor und von Agenten über
eine kleine CLI benutzt werden.

## Was es kann

- Raster beliebiger Größe, auch für große Muster
- Symbolsprache **Klar**: re, li, Umschlag, Abnahmen, Zunahmen, Zöpfe,
  Bobbel, verkürzte Reihen, Farbflächen
- Mehrfachsymbole als eine Gruppe: ein Zopf über sechs Maschen ist ein
  Symbol, nicht sechs Kästchen
- Eigene beschriftete Gruppen bleiben in einer lokalen Bibliothek; sie können
  einen eigenen Legendentext bekommen
- Maschenmarker als Zeichenhilfe: einzeln oder alle N Maschen
- Bereiche auswählen, kopieren und einfügen, inklusive Farben und Gruppen
- Hin- und Rückreihen oder nur Hinreihen mit Nummerierung 1, 3, 5 …
- Rapport markieren, Legende automatisch erzeugen
- Farben pro Masche, auch für Fair Isle und Intarsien
- Export als SVG, PNG und JSON, Druck über den Browser
- Horizontale und vertikale Scrollbalken für große Charts
- Hell/Dunkel/System, metrisch/imperial, Deutsch/Englisch
- Tastatur, Maus, Touch und Stift
- Offline als PWA installierbar

## Was es bewusst nicht ist

Keine Strickanleitung, kein Pattern-Rechner, kein Row-Counter, keine Cloud,
keine Konten, keine Kollaboration. Anleitung, Rechnen und Row-Counter könnten
später als getrennte optionale Module entstehen; Cloud, Konten und
Kollaboration bleiben ausgeschlossen. Der Kern bleibt schlank.

## Schnellstart

Voraussetzung: Node.js 20 oder neuer. Keine Installation, keine
Laufzeitabhängigkeiten.

```bash
git clone https://github.com/Stecker1312/stitchwright.git
cd stitchwright
npm start
```

Dann <http://localhost:8080> öffnen. Ohne lokalen Server lässt sich die
Live-Demo benutzen.

```bash
npm test      # 64 Node-Tests
npm run check # Tests und Syntaxprüfung
```

## Für Agenten

Das Chart-Format ist versioniertes JSON. Die CLI prüft und rendert ohne
Browser und ohne Netzwerk:

```bash
node cli/stitchwright.js validate chart.strickschrift.json
node cli/stitchwright.js render chart.strickschrift.json chart.svg
node cli/stitchwright.js new --width 40 --height 24 --out chart.strickschrift.json
node cli/stitchwright.js legend chart.strickschrift.json
```

Details: [`docs/format.md`](docs/format.md), Schema:
[`schema/strickschrift.schema.json`](schema/strickschrift.schema.json).

## Status und Grenzen

- **Alpha:** benutzbar, aber nicht fertig. Fehler sind wahrscheinlich.
- **Dateiformat:** `strickschrift/1`; Änderungen können eine Migration brauchen.
- **Sprachen:** Deutsch und Englisch sind gepflegt; weitere Sprachen sind
  vorbereitet, aber noch nicht fachlich geprüft.
- **Geräte:** Im Browser getestet; Touch und Stift sind implementiert, aber
  noch nicht auf allen Tablets und Browsern erprobt.
- **Eigene Symbol-Packs und Theme-Editor:** geplant, noch nicht gebaut.
- **Kein Support-Versprechen:** offenes Einzelprojekt, kein kommerzieller Dienst.

Mehr dazu auf der [Projektseite](https://stecker1312.github.io/stitchwright/about.html).

## Mitmachen

Fehler und Wünsche bitte als Issue im Repository melden. Hilfreich sind
Browser, Betriebssystem, Schritte zum Nachstellen und – wenn möglich – die
Chart-Datei. Bitte keine persönlichen Daten oder vertraulichen Projekte
anhängen. Hinweise zu Übersetzungen, Symbolen und Code stehen in
[`CONTRIBUTING.md`](CONTRIBUTING.md).

## Technik

- Statische Web-App, keine Laufzeitabhängigkeiten
- Vanilla JavaScript ES Modules, Canvas für den Editor, SVG für den Export
- Service Worker und Web-App-Manifest für Offline-Betrieb
- IndexedDB und localStorage für lokale Daten
- Tests mit `node:test`; Browserprüfung mit Playwright
- JSON-Schema unter `schema/strickschrift.schema.json`

## Dokumentation

- [Ausführliche Projektseite](https://stecker1312.github.io/stitchwright/about.html)
- [Symbolsprache Klar](docs/symbols.md)
- [Chart-Format](docs/format.md)
- [Entscheidungen (ADRs)](docs/adr/)
- [Arbeitsabläufe (SOPs)](docs/sop/)
- [Status](STATUS.md)
- [Arbeitsjournal](docs/JOURNAL.md)

## Datenschutz

Stitchwright sendet keine Daten. Es gibt keine Analyse, keine Werbung, keine
externen Schriften oder Ressourcen. Alles bleibt auf dem Gerät oder in Dateien,
die du selbst speicherst.

## Transparenz

Der Code wurde von einem KI-Agenten (DeepSeek V4.1 Flash) im Auftrag von
Daniel geschrieben und von ihm fachlich geprüft. Die Entscheidungen und
Grenzen stehen in den ADRs. Fehler sind möglich; Issues und Korrekturen sind
willkommen.

## Lizenz

GPL-3.0. Siehe [`LICENSE`](LICENSE).
