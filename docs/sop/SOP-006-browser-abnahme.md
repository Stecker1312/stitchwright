# SOP-006 – Browserabnahme

- Status: Gültig
- Stand: 2026-11-20

## Zweck

Die Node-Tests decken Kern, Store, Import, CLI und Regressionen ab. Diese
Abnahme prüft die Pfade, die nur im Browser existieren: Fokus, native
Steuerelemente, Pointer, Dialoge, Drawer, PWA und Offline-Verhalten.

## Vorbereitung

```bash
npm start
# http://localhost:8080/?nosw
```

`?nosw` umgeht den Service Worker während der normalen Abnahme. Für den
Offline-Test zusätzlich einmal ohne Query laden und warten, bis
`caches.keys()` den aktuellen Stitchwright-Cache zeigt.

## Ablauf

1. **Sprache:** Erststart ist englisch; Einstellungen → Deutsch → Reload.
   UI bleibt deutsch, `<html lang="de">` bleibt nach dem Reload gesetzt.
2. **Tastatur:** `Tab` bis „New“, `Enter` öffnet den Dialog und verändert
   keine Zelle. Symbol wählen, Fokus landet auf der Zeichenfläche,
   `Enter` setzt genau eine Gruppe, `Ctrl+Z` entfernt sie.
3. **Gruppen:** Zwei gleiche Zöpfe setzen, beide in IndexedDB/Cache prüfen:
   unterschiedliche IDs, keine Validatorfehler.
4. **Offene Änderungen:** Autosave aus, Titel ändern, Neu anlegen →
   Speichern/Verwerfen/Abbrechen. Abbrechen erhält Titel und Chart.
   Autosave an, Titel ändern, sofort Neu → alter Stand ist gespeichert.
5. **Rückreihen:** RS-Modus, Pfeiltasten bleiben auf ungeraden Reihen.
   Auswahl über mehrere Reihen füllen: gerade Reihen bleiben unverändert.
6. **Pointer:** schnelle Mausbewegung über zehn Zellen hinterlässt eine
   zusammenhängende Linie. Mittlere Maustaste verschiebt. Zweiter Finger
   bricht den ersten Strich ab und zoomt.
7. **Dialoge/Drawer:** `aria-labelledby` vorhanden; auf 390 px sind
   geschlossene Seitenleisten `inert`, offene nehmen den Fokus auf;
   `Escape` schließt und gibt den Fokus zurück.
8. **Export:** JSON + Druck druckt ein Diagramm, Legenden-Checkbox
   überschreibt die Chart-Option, A4/A3/Letter werden als `@page` gesetzt.
   Sehr große PNGs melden die 8000-px-Kappung.
9. **Offline:** Nach vollständiger Installation Netzwerk abschalten und neu
   laden. App, Symbole und lokale Charts bleiben verfügbar. Ein fremder
   Cache auf derselben Origin bleibt erhalten.
10. **Fehler:** DevTools-Konsole während des Ablaufs ohne unbehandelte
    Fehler prüfen.

## Ergebnis

Datum, Browser/Version, Gerät und Abweichungen im Journal festhalten. Ein
grüner Node-Lauf ersetzt diese Abnahme nicht; echte Touch-, Druck- und
Strickabnahmen bleiben separat.
