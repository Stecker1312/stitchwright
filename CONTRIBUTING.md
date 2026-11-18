# Mitmachen

Stitchwright ist ein offenes Projekt unter GPL-3.0. Beiträge sind willkommen,
solange sie die Grundsätze respektieren: lokal, datensparsam, ohne Cloud,
ohne Konten, ohne Telemetrie.

## Fehler melden

Bitte ein Issue mit folgenden Angaben öffnen:

- Browser und Betriebssystem
- Schritte zum Nachstellen
- erwartetes und tatsächliches Verhalten
- wenn möglich: die Chart-Datei (JSON), aber **keine persönlichen Daten**
  und keine vertraulichen Projekte

## Code

- Vanilla JavaScript, ES Modules, keine Laufzeitabhängigkeiten.
- `npm test` und `npm run check` müssen grün sein.
- Kleine, nachvollziehbare Änderungen. Neue dauerhafte Entscheidungen
  brauchen eine ADR unter `docs/adr/`.
- Keine neuen Abhängigkeiten ohne vorherige Entscheidung.
- Keine Netzwerkaufrufe, keine externen Schriften, keine Analyse.
- Symbole und Lokalisierung sind Daten, kein Sonderfall im Code.

## Übersetzungen

- Locale-Dateien liegen in `src/locales/`.
- Fehlende Schlüssel fallen auf Englisch zurück.
- Neue Sprachen mit Status `machine` oder `partial` markieren, bis ein
  Muttersprachler die Strickbegriffe geprüft hat.
- Abkürzungen im Diagramm bleiben englisch (`k`, `p`, `yo`, `k2tog`, `ssk`);
  die Erklärung wird übersetzt.

## Symbol-Packs und Beispiele

- Neue Symbole gehören in `src/core/symbols.js` und `docs/symbols.md`.
- Beispiele unter `samples/` müssen synthetisch sein oder ausdrücklich
  freigegeben. Keine persönlichen Charts.
- Tests für neue Symbole und Golden Charts ergänzen.

## Transparenz

Der Code wird von einem KI-Agenten geschrieben und von Menschen geprüft.
Beiträge werden nach denselben Regeln behandelt: Lesbarkeit, Tests,
Nachvollziehbarkeit und Datenschutz vor Tempo.
