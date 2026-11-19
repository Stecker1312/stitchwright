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
- Keine Übertragung von Chartdaten. Service-Worker-Updates und ein
  Cache-Miss können nach dem ersten Laden Assets nachladen; die App bleibt
  dabei offline nutzbar.
- Charts liegen in IndexedDB, Einstellungen in localStorage, Dateien werden
  nur auf ausdrücklichen Befehl exportiert oder importiert.
- Autosave ersetzt die Cloud. Ein lokaler Versionsverlauf ist geplant, aber
  noch nicht implementiert.
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
