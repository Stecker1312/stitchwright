# SOP-001 – Entwickeln, testen, lokal starten

- Status: Gültig
- Stand: 2026-11-18

## Voraussetzungen

- Node.js 20 oder neuer (getestet mit Node 26).
- Ein moderner Browser.
- Keine Installation von Paketen. Das Projekt hat keine Laufzeit- oder
  Entwicklungsabhängigkeiten.

## Lokal starten

```bash
npm start
# http://localhost:8080
```

Der Server ist `scripts/serve.js` und nutzt nur `node:http`, `node:fs` und
`node:path`. Er liefert statische Dateien aus dem Projektordner.

## Tests

```bash
npm test        # node:test, Kern und CLI
npm run check   # Tests plus Syntaxprüfung aller JS-Dateien
```

## Browser prüfen

1. `npm start`
2. Im Browser öffnen.
3. Prüfen: Zeichnen, Undo, Speichern, Neuladen, SVG-Export, Theme-Wechsel,
   Sprache, Tastatur.
4. Bei größeren Änderungen Playwright verwenden: Seite laden, Elemente
   anklicken, Screenshot, Konsole auf Fehler prüfen.

## Code-Regeln

- ES Modules, keine Bundler.
- Kleine Module mit einer klaren Aufgabe.
- Kommentare erklären Absicht und Randfälle, nicht offensichtliche Syntax.
- Keine `innerHTML`-Zuweisung mit Nutzertexten. `textContent` verwenden.
- Keine Netzwerkaufrufe, keine externen URLs.
- Neue Symbole gehören in `src/core/symbols.js` und `docs/symbols.md`.
- Neue UI-Texte gehören in `src/locales/de.json` und `en.json`.

## Commit und Push

```bash
git add -A
git commit -m "Kurz: was und warum"
git push origin main
```

Kein Force-Push. Keine Veröffentlichung ohne SOP-004.
