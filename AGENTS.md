# Stitchwright – Regeln für die Arbeit in diesem Projekt

## Zweck

Stitchwright ist ein freier, lokaler Strickschrift-Editor. Menschen zeichnen
Diagramme, Agenten lesen und schreiben dasselbe offene JSON-Format. Die App
läuft im Browser, ist als PWA installierbar und funktioniert offline.

Der Editor ist das Produkt. Strickanleitungen, Pattern-Rechnen, Row-Counter,
Cloud und Kollaboration sind bewusst nicht Teil des Kerns. Die Architektur
hält Erweiterungspunkte offen, aber niemand baut sie ohne neue Entscheidung.

## Nicht verhandelbar

- **Datensparsam und datenschutzfreundlich.** Keine Cloud, keine Konten, keine
  Telemetrie, keine externen Fonts, keine CDNs, keine Netzwerkaufrufe nach dem
  Laden. Alle Daten bleiben im Browser oder in Dateien, die der Mensch wählt.
- **Keine Laufzeitabhängigkeiten.** Browser-Standardbibliothek und Node-
  Standardbibliothek. Neue Pakete nur nach einer ADR und nur, wenn es keinen
  vertretbaren Standardweg gibt.
- **Lesbarer Code.** Kleine Module, sprechende Namen, Kommentare, die Absicht
  und Randfälle erklären. Keine cleveren Einzeiler, keine versteckte Magie.
- **Performance ist eine Funktion.** Große Charts müssen flüssig bleiben.
  Der Editor zeichnet nur den sichtbaren Ausschnitt auf Canvas; der Export
  erzeugt SVG. Beide nutzen dieselben Symboldaten.
- **Transparenz.** Der Code wird von einem Agenten geschrieben und von Daniel
  geprüft. Das steht im README und in der Dokumentation. Keine Behauptung,
  ein Mensch habe alles selbst getippt.
- **GPL-3.0.** Der Code bleibt frei. Keine proprietären Bestandteile.
- **Keine privaten Daten im öffentlichen Repo.** Beispiele sind synthetisch
  oder ausdrücklich freigegeben. Keine Fotos, Maße oder Projektdaten aus der
  Textilwerkstatt ohne Zustimmung.

## Arbeitsweise

1. Vor Änderungen `STATUS.md`, `docs/JOURNAL.md` und die betroffenen ADRs lesen.
2. Erst den Test oder die Abnahme formulieren, dann ändern.
3. `npm test` muss grün sein. Browser-Änderungen zusätzlich mit Playwright
   prüfen.
4. Jede dauerhafte Entscheidung bekommt eine ADR. Wiederkehrende Abläufe
   bekommen eine SOP.
5. `STATUS.md` und `docs/JOURNAL.md` am Ende der Sitzung aktualisieren.
6. Kleine, nachvollziehbare Commits. Commit-Nachricht: was und warum.
7. Nie `git push --force`. Veröffentlichung über SOP-004; der aktuelle Stand
   ist eine öffentliche Alpha (0.1.0-alpha.1).

## Befehle

```bash
npm start          # lokaler Server, http://localhost:8080
npm test           # Node-Tests, keine Abhängigkeiten
npm run check      # Tests + Format-/Syntaxprüfung
```

Es gibt keine Installation, keinen Build-Schritt und keine Server-Datenbank.

## Aufbau

| Pfad | Inhalt |
|---|---|
| `src/core/` | Modell, Symbole, Validierung, SVG-Export, Einheiten, i18n |
| `src/ui/` | Canvas-Editor, Werkzeuge, Panels, Persistenz |
| `src/locales/` | UI-Texte, de und en gepflegt |
| `src/core/symbols.js` | Symboldefinitionen des Standard-Packs „Klar“ (englisch „Clear“) |
| `cli/` | Agenten-CLI: prüfen, rendern, neu anlegen |
| `tests/` | Node-Tests für Kern und CLI |
| `docs/adr/` | warum etwas so ist |
| `docs/sop/` | wie etwas getan wird |
| `docs/JOURNAL.md` | chronologisches Arbeitsprotokoll |
| `STATUS.md` | aktueller Stand, offene Punkte, nächster Schritt |

## Definition of Done

- Verhalten durch Test oder dokumentierte Browser-Prüfung belegt.
- Keine neuen Abhängigkeiten ohne ADR.
- Keine Netzwerkaufrufe, keine personenbezogenen Daten.
- `STATUS.md` und `docs/JOURNAL.md` aktualisiert.
- Bei UI: Tastaturbedienung und dunkler Modus nicht kaputt.
- Bei Formatänderungen: Schema, Beispiel, CLI und Migration aktualisiert.
