# D004 – Offenes JSON-Format, versioniert

- Datum: 2026-11-18
- Status: Gültig
- Betrifft: Stitchwright

## Zusammenhang

Menschen brauchen eine Datei, die sie speichern, teilen und wieder öffnen
können. Agenten brauchen ein Format, das sie lesen, schreiben und prüfen
können. Ein proprietäres Binärformat oder ein SVG mit versteckten Daten wäre
für beides schlecht.

## Entscheidung

Das native Format ist versioniertes JSON mit der Endung
`.strickschrift.json`.

- `schema: "strickschrift/1"` steht in jeder Datei.
- Reihen sind von unten nach oben gespeichert; Reihe 1 ist die erste
  gestrickte Reihe.
- Zellen enthalten `null` für glatt rechts oder eine Symbol-ID.
- Farben liegen in einer parallelen Matrix mit Paletten-IDs.
- Mehrfachsymbole (Zöpfe, Abnahmen über mehrere Maschen) stehen in `groups`
  mit Zeile, Spalte, Spannweite und Parametern.
- Optionen (Chart-Art, Rückreihen, Nummerierung, Rapport, Legende) sind
  explizit.
- Das Format ist selbstbeschreibend und ohne Code lesbar.

Ein JSON-Schema liegt unter `schema/strickschrift.schema.json`. Die CLI
validiert gegen dieselben Regeln wie die App. Änderungen am Format brauchen
eine neue Schemaversion und eine Migration. Additive, optionale Felder, die
die Bedeutung bestehender Felder nicht verändern (zum Beispiel `guides`,
D012), bleiben in derselben Schemaversion; nur breaking changes brauchen eine
neue Version und Migration.

## Folgen

- Dateien sind diffbar, versionierbar und für Agenten zugänglich.
- Große Charts werden durch `null`-Zellen und optionale Kompression
  beherrschbar; die erste Version bleibt bewusst einfach.
- SVG ist Export, nicht Quelle. Wer ein SVG bearbeitet, verliert die
  Strick-Semantik.

## Alternativen

- SVG als Quelle: hübsch, aber schlecht validierbar und ohne Bedeutung.
- Binärformat: klein, aber undurchsichtig und schwer zu prüfen.
- YAML: lesbarer, aber zusätzliche Abhängigkeit und fehleranfälliger für
  große Datenmengen.
