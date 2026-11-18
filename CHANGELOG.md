# Changelog

## 0.1.0-alpha.1 – 2026-11-18

Erste öffentliche Vorabversion. Keine Produktionsreife.

### Enthalten

- Editor für Strickdiagramme als statische Web-App/PWA
- Symbolsprache „Klar“ mit Grundzeichen, Zu-/Abnahmen, Zöpfen, Textur und
  Hilfszeichen
- Parametrisierte Zöpfe von 1/1 bis 4/4, vorne und hinten
- Farbflächen pro Masche, Farbpalette und Farb-Legende
- Hin- und Rückreihen oder nur Hinreihen
- Rapport, Reihen-/Maschennummern, Legende
- Eigene beschriftete Gruppen mit optionalem Legendentext, lokal gespeichert
- Rückgängig/Wiederholen, Kopieren, Spiegeln, Reihen/Spalten einfügen und löschen
- SVG-, PNG- und JSON-Export, Druck über den Browser
- Horizontale und vertikale Scrollbalken für große Charts
- Deutsch/Englisch, hell/dunkel/System/hoher Kontrast, metrisch/imperial
- Tastatur-, Maus-, Touch- und Stiftbedienung
- Offline-Betrieb über Service Worker
- Node-CLI: `validate`, `render`, `new`, `legend`
- 60 Node-Tests; Browserprüfung mit Playwright

### Bekannte Grenzen

- Frühe Alpha: Fehler und Formatänderungen möglich.
- Nur Deutsch und Englisch sind fachlich gepflegt.
- Eigene Symbol-Packs und Theme-Editor fehlen noch.
- Touch/Stift ist noch nicht auf allen Geräten erprobt.
- Keine Cloud, keine Konten, keine Kollaboration, keine Telemetrie.

### Dateiformat

`strickschrift/1`. Gruppen sind einreihig; eigene Gruppen haben `label`,
`span` und optional `legend`.
