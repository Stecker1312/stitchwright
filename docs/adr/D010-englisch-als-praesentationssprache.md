# D010 – Englisch (britisch) als Präsentationssprache

- Datum: 2026-11-19
- Status: Gültig
- Betrifft: Stitchwright

## Zusammenhang

Stitchwright ist öffentlich und soll Menschen außerhalb des deutschsprachigen
Raums erreichen. Die App war technisch zweisprachig, präsentierte sich aber mit
Deutsch als Standard: `lang="de"`, deutsche Starttexte und deutsche
Fehlermeldungen. Wer die Seite zum ersten Mal öffnet, sah zuerst Deutsch.

## Entscheidung

- Englisch ist die Standard- und Präsentationssprache der App und des
  Repository-Auftritts. Die Variante ist **britisches Englisch** in einfacher,
  klarer Sprache (`en-GB`).
- Deutsch bleibt eine vollständig gepflegte Übersetzung und ist im
  Einstellungsdialog wählbar.
- Neue Texte werden zuerst auf Englisch geschrieben und danach übersetzt.
- Die HTML-Seiten tragen `lang="en-GB"`. Die interne Locale-Kennung bleibt
  `en`, damit Dateinamen und gespeicherte Einstellungen stabil bleiben.
- Auch CLI-Ausgaben, Validierungsmeldungen, Beispiel-Charts, Manifest und
  README sind englisch.
- Datensparsamkeit bleibt unberührt: keine Übersetzungsdienste zur Laufzeit,
  keine externen Fonts, keine Netzwerkaufrufe.

## Folgen

- Bestehende Installationen mit gespeicherter Sprache `de` bleiben deutsch,
  bis der Mensch umstellt. Neue Installationen starten englisch.
- Die Projektseite `about.html` und weitere öffentliche Dokumente werden
  ebenfalls auf Englisch umgestellt; die Wissensbasis und ADRs bleiben intern
  deutsch.
- Übersetzungen bleiben Datenpflege nach D005. Weitere Sprachen ändern die
  Architektur nicht.

## Alternativen

- Deutsch als Standard lassen: verfehlt das Ziel, ein internationales
  Publikum zu erreichen.
- Sprachwahl automatisch aus `navigator.language`: bequem, aber die
  Präsentation wäre für Besucher ohne deutsche Browsersprache trotzdem
  englisch und die Standardsprache nicht eindeutig testbar.
