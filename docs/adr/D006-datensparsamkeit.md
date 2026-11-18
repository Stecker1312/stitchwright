# D006 – Datensparsamkeit und lokale Persistenz

- Datum: 2026-11-18
- Status: Gültig
- Betrifft: Stitchwright

## Zusammenhang

Strickschriften sind persönliche Entwürfe. Viele vergleichbare Werkzeuge sind
Cloud-Anwendungen mit Konten, Tracking oder Abo. Daniel will ausdrücklich
keine Cloud und keine Kollaboration. Die App soll nach dem Laden keine
Netzwerkverbindung brauchen.

## Entscheidung

- Keine Konten, keine Anmeldung, keine Telemetrie, keine Analyse, keine
  Werbung, keine externen Schriften oder Bibliotheken.
- Keine Netzwerkaufrufe nach dem ersten Laden; der Service Worker hält
  alle Assets im Cache.
- Charts liegen in IndexedDB, Einstellungen in localStorage, Dateien werden
  nur auf ausdrücklichen Befehl exportiert oder importiert.
- Autosave und ein lokaler Versionsverlauf ersetzen die Cloud.
- Importierte Daten werden validiert; Texte werden nie als HTML injiziert.
- Das öffentliche Repository enthält keine persönlichen Charts oder Maße.

## Folgen

- Volle Datenhoheit beim Nutzer.
- Kein Server, keine Betriebskosten, kein Datenleck-Risiko.
- Gerätewechsel nur per Datei; das ist bewusst und dokumentiert.
- Spätere Synchronisation wäre ein separates, opt-in-Modul und bräuchte eine
  neue ADR.

## Alternativen

- Cloud-Sync: bequem, aber widerspricht dem Kernversprechen.
- Konto mit Ende-zu-Ende-Verschlüsselung: technisch möglich, aber deutlich
  mehr Angriffsfläche und Betrieb.
