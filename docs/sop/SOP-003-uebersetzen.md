# SOP-003 – Übersetzen

- Status: Gültig
- Stand: 2026-11-18

## Grundsatz

Übersetzen ist Datenpflege. Keine Sprache wird im Code verdrahtet. Fehlende
Schlüssel fallen auf Englisch zurück.

## Neue Sprache

1. `src/locales/en.json` nach `src/locales/<code>.json` kopieren.
2. `_meta` anpassen:
   ```json
   { "_meta": { "language": "fr", "status": "machine", "reviewers": [] } }
   ```
3. Alle Werte übersetzen. Schlüssel nicht ändern.
4. Fachbegriffe mit dem Glossar unten abstimmen.
5. `npm test` ausführen; der i18n-Test prüft fehlende und überzählige
   Schlüssel.
6. In der App Sprache wählen und alle Panels durchklicken.
7. Status erst auf `reviewed` setzen, wenn ein Muttersprachler die
   Strickbegriffe geprüft hat.

## Glossar (Mindestumfang)

Diese Begriffe brauchen besondere Sorgfalt:

- knit / purl
- yarn over
- knit two together / slip, slip, knit
- make one
- cable, hold in front / hold in back
- slip stitch
- wrong side / right side
- cast on / bind off
- repeat, edge stitch, no stitch

## Regeln

- Kurz und konkret. Keine wörtliche Übersetzung, wenn der Fachbegriff anders
  heißt.
- Abkürzungen in Diagrammen bleiben englisch (k, p, yo, k2tog, ssk), weil sie
  Datensprache sind. Die Erklärung ist lokalisiert.
- Keine maschinelle Übersetzung als `reviewed` markieren.
- Symbolnamen und Legenden gehören in das Symbol-Pack, nicht in die UI-Locale.

## Status

| Status | Bedeutung |
|---|---|
| `reviewed` | von einem Muttersprachler fachlich geprüft |
| `machine` | maschinell oder vom Agenten erstellt, ungeprüft |
| `partial` | unvollständig, fällt teilweise auf Englisch zurück |
