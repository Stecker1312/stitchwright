# SOP-004 – Veröffentlichen

- Status: Gültig
- Stand: 2026-11-18

## Vorbedingung

`STATUS.md` sagt ausdrücklich „vorzeigbar“. Der Editor-MVP besteht die
Abnahme:

- Chart zeichnen, speichern, neu laden
- SVG exportieren und drucken
- Zöpfe, Farben, Rückreihen-Umschalter und Runden
- Tastatur und Touch
- Deutsch und Englisch
- Tests grün

## Checkliste vor dem Umschalten

- [ ] `npm test` und `npm run check` grün
- [ ] README mit aktuellen Screenshots und ehrlichem Status
- [ ] LICENSE geprüft (GPL-3.0)
- [ ] keine persönlichen Daten, keine privaten Charts, keine Secrets
- [ ] `git log` auf unerwünschte Inhalte geprüft
- [ ] Issue-Vorlagen und Contribution-Hinweise vorhanden
- [ ] Version in `package.json` und `STATUS.md` gesetzt
- [ ] Datenschutzhinweis: keine Telemetrie, keine Netzwerkaufrufe
- [ ] Barrierefreiheit-Basics geprüft: Tastatur, Fokus, Kontrast

## Veröffentlichen

1. Repository von privat auf öffentlich stellen.
2. GitHub Pages auf den Branch `main`, Ordner `/` zeigen lassen.
3. Prüfen: App lädt über HTTPS, Service Worker installiert, offline neu laden.
4. Tag `v<version>` setzen und Release-Notes schreiben.
5. In der Textilwerkstatt und im Projektindex verlinken.

## Nach der Veröffentlichung

- Issues beobachten, aber keine Daten von Nutzern anfordern.
- Übersetzungen und Symbol-Packs als Pull Requests annehmen.
- Formatänderungen nur mit Schema-Version und Migration.
- Keine Cloud-Funktion ohne neue ADR.
