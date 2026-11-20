# Stitchwright – Code-Audit und Arbeitsgrundlage für Agenten

> **Status 2026-11-20:** Die P1-Befunde sind behoben und durch
> Regressionstests abgedeckt; zentrale P2-Punkte ebenfalls. Dieser Bericht
> bleibt der historische Ausgangsbefund. Aktueller Stand und Restpunkte:
> `STATUS.md` und `docs/JOURNAL.md`.

## 0. Metadaten und Verwendung

| Feld | Wert |
|---|---|
| Auditdatum | 2026-11-19 |
| Geprüfte Version | 0.3.0-alpha.1 |
| Ausgangscommit | `d3b1ff81580d5137285479f43f6cd286aa4c7764` |
| Ausgangsworktree | sauber |
| Verfahren | vollständige Durchsicht der Anwendungs-JS-Module, CLI, Validator, Schema, Tests, HTML/CSS, Service Worker, Entwicklungswerkzeuge und Projektdokumentation; gezielte Node- und Chromium-Proben |
| Laufzeit | Node v26.13.1; Chromium über Playwright |
| Bestehende Prüfung | `npm run check`: 31 JS-Dateien, 6 JSON-Dateien, 66/66 Tests bestanden |
| Zusatzbelege | [ausführbare Proben](2026-11-19-probes.mjs) |
| Status aller Befunde | offen zum Zeitpunkt dieses Audits |
| Änderungen dieser Arbeit | Audit und Proben, Status/Journal; keine Fehlerbehebung am Produkt |

**Für den nächsten Agenten:** zuerst Abschnitt 1, dann die Arbeitsreihenfolge
in Abschnitt 5 lesen. Befunde anhand ihrer `SW-xx`-ID referenzieren. Vor einem
Fix den beschriebenen Fehler als Regressionstest oder Browser-Abnahme
festhalten. Die Proben dokumentieren das fehlerhafte Ausgangsverhalten:
dieses Verhalten darf ausdrücklich **nicht** als Sollzustand festgeschrieben
werden.

Zeilennummern beziehen sich auf den Ausgangsstand. Funktionsnamen dienen als
stabilere Suchanker. Während des Audits erschien ein separat bearbeiteter,
unversionierter Ordner `design/`; er ist kein Bestandteil dieses
Ausgangsstands und wurde nicht in die Bewertung einbezogen.

### Prioritäten und Belegstufen

- **P1:** vor der nächsten als belastbarer empfohlenen Alpha beheben;
  Datenverlust, ungültige Dokumente, wesentliche Fehlfunktion.
- **P2:** reguläre Stabilisierung; falsche Darstellung, eingeschränkte
  Bedienung, begrenzte Robustheit oder erhebliche Wartungsprobleme.
- **P3:** nachgelagerte Verbesserung/Klarstellung.
- **R:** mit ausführbarer Probe reproduziert.
- **B:** im Chromium-Browser reproduziert.
- **C:** aus konkretem Kontroll-/Datenfluss nachgewiesen; kein vollständiger
  End-to-End-Repro in diesem Audit.
- **A:** Architektur-/Produktkritik mit begründetem Handlungsbedarf, kein
  behaupteter Laufzeitfehler.

Priorität ist eine Reparaturpriorität, kein CVSS-Sicherheitsrating.
Es wurde keine entfernte Codeausführung oder Datenexfiltration nachgewiesen.

### Grenzen

Ein umfassender Code-Audit ist keine Vollständigkeitsgarantie für alle
Fehler. Nicht durchgeführt: echte Tablet-/Stift-Abnahme, Firefox/WebKit,
Screenreader-Abnahme, physischer Ausdruck, reale Strickprobe,
Produktions-Deployment-/Update-Matrix, vollständiges Fuzzing, Heap-Profiling
und Prüfung der gesamten Git-Historie auf Geheimnisse. Sicherheitskritische
Eingabepfade und Speicherzustände wurden gezielt untersucht. Reale
Benutzerdokumente wurden dafür nicht benötigt.

## 1. Gesamturteil

**Die Produktidee und der schlanke technische Unterbau sind überzeugend.
Die Implementierung ist jedoch deutlich weniger zuverlässig, als die
Feature-Liste und 66 grüne Tests vermuten lassen.**

Die gravierendsten Probleme liegen an den Übergängen:
UI → Modell, Dokumentwechsel → Undo, Speicherauftrag → Speicherstatus,
Import → Normalisierung → Validierung. Das ist kein kosmetisches
Refactoring-Problem. Normale Bedienung kann bereits ungültige Dateien
erzeugen; gültig gemeldete Eingaben können die Oberfläche zum Absturz
bringen; der Speicherindikator kann einen falschen Zustand behaupten.

Das bisherige Testpaket belegt viele einfache Kernfunktionen. Es belegt
**nicht** die Integrität eines längeren Editor-Workflows. Besonders
bezeichnend: Der Kern erzeugt eindeutige Gruppen-IDs, aber die UI umgeht
genau diese Erzeugung. Die Tests treffen nur den Kernpfad.

### Was erhalten bleiben sollte

- Statische App, keine Laufzeitpakete, keine Konten oder Telemetrie:
  gut zum tatsächlichen Bedarf passend.
- Reines JSON-Dokument und gemeinsamer Kern für Browser und CLI.
- Getrennte Canvas-/SVG-Renderer mit gemeinsamen Glyphendaten.
- Explizite Diagnosecodes und Fehlerpfade als gute Grundlage.
- `Store.edit()` hat bereits eine Rollback-Idee für gescheiterte Edits.
- Viele Nutzertexte landen in `textContent`; SVG-Texte werden XML-escaped.
- Die README warnt ehrlich vor der Alpha und empfiehlt zusätzliche
  JSON-Kopien. Diese Zurückhaltung ist durch den Audit bestätigt.

### Was vor weiteren Funktionen passieren sollte

1. Dokument- und Speichersicherheit herstellen.
2. Sicherstellen, dass jede normale UI-Aktion ein gültiges Dokument erhält.
3. Import/CLI wirklich verlässlich und nicht stillschweigend reparierend
   gestalten.
4. Tastatur, Rückreihen und Export gegen echte Nutzerabläufe prüfen.
5. Erst dann neue Symbol-Packs, zusätzliche Formate oder andere Erweiterungen.

Ein Framework-Wechsel, Backend oder großer Architektur-Neubau ist dafür
nicht erforderlich.

## 2. Befundindex

| ID | Prio | Beleg | Kurzbefund |
|---|---|---|---|
| SW-01 | P1 | R | Undo/Redo überschreitet Dokumentgrenzen |
| SW-02 | P1 | B/C | Dokumentwechsel verwirft ungespeicherte Änderungen |
| SW-03 | P1 | B/C | Speicherabschluss bestätigt die falsche Revision |
| SW-04 | P1 | R/B | UI erzeugt doppelte Gruppen-IDs |
| SW-05 | P1 | R | Tastatur-Gruppenplatzierung mutiert ohne Undo/Dirty |
| SW-06 | P1 | R | Normalisierung vernichtet Fehlerbelege und unbekannte Daten |
| SW-07 | P2 | R | Validator wirft bei strukturell ungültigen Eingaben |
| SW-08 | P1 | R | Geerbte Objektschlüssel werden als Symbol-IDs akzeptiert |
| SW-09 | P1 | R/C | Größenlimits greifen erst nach Speicherallokation |
| SW-10 | P1 | R/C | Strukturänderungen beschädigen Rapportdaten |
| SW-11 | P2 | R/C | Asymmetrische Zöpfe werden falsch gespiegelt |
| SW-12 | P1 | R/C | Rückreihenmodus ist keine konsistente Interaktionsebene |
| SW-13 | P2 | R | Legende verschmilzt verschiedene eigene Gruppen |
| SW-14 | P1 | R/C | Gruppenbibliothek verliert Legendentexte beim Laden |
| SW-15 | P1 | R/C | Chartübergreifendes Einfügen verliert Farbsemantik |
| SW-16 | P2 | R | Rechtsmaschen-Werkzeug entfernt bestehende Gruppe nicht |
| SW-17 | P1 | B/C | Globale Tastatursteuerung blockiert native Buttons |
| SW-18 | P2 | C | Zeichen-/Touchgesten haben Lücken und Zustandskonflikte |
| SW-19 | P2 | R/C | Rückreihenausblendung lässt Reihennummern verschwinden |
| SW-20 | P1 | B/C | Exportlegenden werden abgeschnitten oder überlagert |
| SW-21 | P2 | R/C | Kontrastberechnung und dunkle Vorschauen sind fehlerhaft |
| SW-22 | P2 | R/A | Leere Masche und Rückreihenbedeutung unzureichend erklärt |
| SW-23 | P2 | C/A | Druck-/Exportoptionen sind nur teilweise wirksam |
| SW-24 | P1 | R/C | Service Worker aktiviert unvollständige Caches und löscht fremde |
| SW-25 | P2 | R/C | Performancebudget wird durch Vollkopien und Vollscans unterlaufen |
| SW-26 | P1 | A/C | Tests decken die kritischen Produktpfade nicht ab |
| SW-27 | P2 | A/C | App-Shell enthält zu viele gekoppelte Zuständigkeiten |
| SW-28 | P2 | B/C | Sprachmetadaten und Erweiterbarkeit widersprechen den Zusagen |
| SW-29 | P2 | C | CLI ist keine durchgehend verlässliche Agentenschnittstelle |
| SW-30 | P2 | R/C/A | Änderungszeit und Inhaltslizenz werden falsch behandelt |
| SW-31 | P2 | C | Speicherfehler, Wiederherstellung und Mehrtabbetrieb fehlen |
| SW-32 | P2 | C | Lokaler Server behandelt ungültige Pfade nicht robust |
| SW-33 | P2 | C | Modellfunktionen sichern ihre Invarianten uneinheitlich |
| SW-34 | P2 | C | Maschennummern und Bildspalten werden verwechselt |
| SW-35 | P2 | C/A | Zugänglichkeit beschränkt sich weitgehend auf Beschriftungen |
| SW-36 | P3 | B/C | Suche, Dialogtasten und Fokusverhalten haben Alltagsfehler |
| SW-37 | P2 | C/A | Symbolgeometrie überschreitet ihre zugesagte Zellfläche |
| SW-38 | P2 | C/A | Format-, Release- und Architekturzusagen driften auseinander |

## 3. Detailbefunde

### SW-01 – Undo/Redo überschreitet Dokumentgrenzen

**P1 · R**  
**Code:** `src/ui/store.js:129–142`, `Store.replace`; `src/app.js:1211–1223`.

`replace(chart)` lässt bei `history: false` beide Historienstapel bestehen.
`pending`, Cursor, Hover und gewählte Farbe werden ebenfalls nicht sauber
an den neuen Dokumentkontext angepasst.

**Repro:** Chart A bearbeiten, Chart B öffnen/anlegen, Undo. Die Probe
liefert anschließend `store.chart.id === "A"` statt `"B"`. Das ist nicht
nur ein alter Pinselzustand: das komplette Dokument inklusive ID springt
zurück. Nachfolgendes Autosave kann diesen alten Snapshot persistieren.

**Auftrag:** Dokumentwechsel als explizite Zustandsgrenze implementieren.
Historie entweder dokumentbezogen halten oder zurücksetzen; aktive Gesten
abschließen/abbrechen; Cursor und Farbe auf das neue Dokument abstimmen.
Die Bedeutung von `history: true` separat definieren.

**Abnahme:** A → B → Undo/Redo wechselt niemals versehentlich die
Dokumentidentität. Wechsel von groß nach klein hinterlässt keinen Cursor
außerhalb des Rasters und keine ungültige aktive Farb-ID.

### SW-02 – Ungespeicherte Änderungen gehen beim Wechsel verloren

**P1 · B/C**  
**Code:** `src/app.js:1080–1092,1211–1245,1273–1278,1327–1330,1542–1544`.

Neu, Öffnen und Import ersetzen das Dokument ohne Flush oder Abfrage des
Dirty-Zustands. Der Autosave-Timer speichert beim Auslösen das dann aktive
Dokument, nicht das Dokument, für das er ursprünglich geplant wurde.
Bei ausgeschaltetem Autosave gibt es auch keine Verlassensicherung.

**Browser-Repro:** Autosave aus, Titel ändern, neues Chart anlegen.
Das neue Chart erscheint ohne Nachfrage; der alte ungespeicherte Titel
ist nicht gesichert. Bei Autosave an besteht zusätzlich das 700-ms-Fenster.

**Auftrag:** Einen zentralen Dokumentwechselpfad mit Save/Discard/Cancel
schaffen. Bei Autosave vorher zuverlässig flushen. Timer an Dokument und
Revision binden. Browser-Verlassen nur bei tatsächlich ungesichertem
Zustand behandeln; `visibilitychange` ist kein vollständiger Ersatz.

**Abnahme:** Neu/Öffnen/Import vor Ablauf des Debounce verlieren keine
Änderungen. Abbruch erhält das alte Dokument. Speicherfehler unterbrechen
den Wechsel oder werden ausdrücklich zur Entscheidung gestellt.

### SW-03 – „Gespeichert“ bestätigt nicht die gespeicherte Revision

**P1 · B/C**  
**Code:** `src/app.js:1311–1331`; `src/ui/store.js:198–202`;
`src/ui/persistence.js:63–73`.

`saveLocal()` wartet auf IndexedDB und ruft dann bedingungslos
`store.markSaved()` auf. Währenddessen kann der Nutzer weiterarbeiten
oder ein anderes Dokument öffnen. Das globale `saving` verwirft weitere
Speicheranforderungen statt sie garantiert nachzuholen.

**Browser-Nachweis mit kontrolliertem Interleaving:** Direkt nach
`IDBObjectStore.put()` wurde ein Titel-Input ausgelöst. Danach:

```text
UI-Titel:          Edited while saving
persistierter:     Replacement
Speicherindikator: Saved
```

**Auftrag:** Snapshot, Dokument-ID und monotonen Revisionszähler beim
Speicherstart erfassen. Nur diese Revision quittieren. Neuere Änderungen
bleiben dirty; ein wartender Save wird nachgeholt. Den Last-Chart-Zeiger
nicht aus einem inzwischen anderen `store.chart` lesen.

**Abnahme:** Deterministische Tests mit verzögertem Save, parallelem Edit,
Dokumentwechsel und fehlgeschlagenem Commit. Kein falsches „Saved“.

### SW-04 – Mehrere Gruppen desselben Typs bekommen dieselbe ID

**P1 · R/B**  
**Code:** `src/ui/canvas-view.js:344–354`; `src/core/chart.js:259–264`.

`paintAt()` übergibt `{ symbol: symbol.id, ...symbol }`. Das UI-Symbol hat
selbst `id: "cable"` oder `"k2tog"`. `addGroup()` versteht `input.id` jedoch
als Instanz-ID und verwendet deshalb nicht `nextGroupId()`.

**Repro:** Zwei 2/2-Zöpfe auf verschiedenen Reihen zeichnen.
Beide gespeicherten Gruppen besitzen `id: "cable"`. Der Validator meldet
`E_GROUP_DUPLICATE`. Auswahl, Bearbeitung und Entfernen suchen per ID
und können die falsche Instanz treffen.

**Auftrag:** Symbol-ID und Gruppeninstanz-ID getrennt benennen und beim
UI→Modell-Übergang nur erlaubte Parameter übertragen. `addGroup()` muss
zusätzlich doppelte explizite IDs abweisen. Bestehende Alpha-Dateien können
bereits betroffen sein: Reparatur nur mit nachvollziehbarer Diagnose,
nicht als unsichtbares Wegnormalisieren.

**Abnahme:** Mehrere gleiche Zöpfe/Abnahmen/Custom-Gruppen zeichnen,
gezielt die zweite bearbeiten/löschen, exportieren, validieren und öffnen.

### SW-05 – Tastaturplatzierung mutiert ohne funktionierende Transaktion

**P1 · R**  
**Code:** `src/ui/canvas-view.js:339–365,387–397`.

`paintCursor()` startet eine Store-Transaktion, aber keine
Canvas-`gesture`. Bei einer Gruppe wird zuerst das Modell verändert,
dann schlägt `this.gesture.placed = true` fehl. Der Catch meldet lediglich
den Fehler. `store.touch()` wird nicht erreicht.

**Probe:** Eine Gruppe existiert anschließend im Modell, aber
`undoStack.length === 0`, `dirty === false`; Fehler:
`Cannot set properties of null (setting 'placed')`.

**Auftrag:** Eine gemeinsame atomare Platzierungsoperation für Maus und
Tastatur schaffen; Gesture-Metadaten dürfen keine Voraussetzung für
Modellintegrität sein. Fehler nach Teilmutation müssen rollbacken.

**Abnahme:** Enter/Space setzt genau eine Gruppe, markiert dirty,
aktualisiert Ansicht/Legende und lässt sich vollständig rückgängig machen.
Fehlende Farbe/Überlappung/zu geringe Breite hinterlassen keinerlei
Teiländerung. Marker-Werkzeug muss per Tastatur Marker statt Symbole setzen.

### SW-06 – Normalisierung verschluckt Fehler und Daten

**P1 · R**  
**Code:** `src/core/chart.js:85–126`; `cli/stitchwright.js:51–55,71–82`;
`src/app.js:1236–1243`.

Browser und CLI normalisieren vor der Prüfung. Dabei werden fehlendes
Schema, fehlerhafte Typen und fehlende Pflichtdaten teilweise durch
Defaults ersetzt. Unbekannte Top-Level-Felder werden vollständig entfernt.
Damit sieht `--strict` die unbekannten Felder nicht mehr.

**Probe:** `groups: "broken"`, fehlendes `schema` und ein zusätzliches
`futureField` werden zu `groups: []`, `schema: "strickschrift/1"` und
gelöschtem Zusatzfeld. Danach: keine Strict-Errors.

**Auftrag:** Rohstruktur/Version zuerst prüfen. Explizit erlaubte optionale
Felder anschließend normalisieren. Migrationen/Kompatibilitätsaliase
gesondert kennzeichnen. Unbekannte Daten entweder erhalten oder mit
verständlicher Meldung ablehnen. Kein stilles Entfernen von Entwurfsdaten.

**Abnahme:** CLI `--strict` lehnt unbekannte Rohfelder ab. Falsch typisierte
Gruppen/Farben werden nicht zu einem scheinbar gültigen leeren Chart.
Roundtrip-Tests belegen die vereinbarte Behandlung unbekannter Felder.

### SW-07 – Validator kann selbst abstürzen

**P2 · R**  
**Code:** `src/core/validate.js:71–97,293–305`.

Die Hauptprüfung erkennt nicht-arrayförmige `rows`/`colors`, die spätere
Warnungsberechnung ruft darauf trotzdem `.some()` auf. Auch `row?.some`
prüft nicht, ob `some` eine Funktion ist.

**Probe:** `validateChart({...validChart, rows: 42})` wirft
`(chart.rows || []).some is not a function`, statt Diagnosen zu liefern.
Die JSDoc nennt normalisierte Charts; trotzdem enthält die Funktion
explizite Strukturdiagnosen, deren Nutzen dieser Nachlauf zerstört.
Vor allem nach SW-06 muss dieser Pfad zuverlässig sein.

**Auftrag:** Validierung total über JSON-Werte machen: jeden weiteren
Zugriff von geprüfter Struktur abhängig machen. Diagnosemenge für sehr
große ungültige Eingaben begrenzen. `Number.isFinite` für numerische
Programmierschnittstellenwerte berücksichtigen.

**Abnahme:** Null, Skalare, falsche Matrizen, einzelne ungültige Zeilen,
fehlende Optionen und unbekannte Symbole liefern Diagnosen, keine Throws.

### SW-08 – `constructor` ist angeblich ein gültiges Symbol

**P1 · R**  
**Code:** `src/core/symbols.js:157,374,399–408`;
`src/core/validate.js:88,170`.

`SYMBOLS` ist ein normales Objekt. `SYMBOLS[id]` akzeptiert auch geerbte
Properties wie `constructor` und `toString`. `Object.freeze()` entfernt
die Prototypenkette nicht.

**Probe:** Eine Zelle mit `"constructor"` erzeugt keine Validatorfehler.
Die Legendenbildung wirft danach
`Cannot read properties of undefined (reading 'en')`. Eine Datei kann
also die Importprüfung passieren und beim Rendern scheitern.

**Auftrag:** Symbolmitgliedschaft ausschließlich über `Object.hasOwn`,
`Map` oder eine prototypfreie Registry feststellen. Alle Zugriffsstellen
verwenden denselben geprüften Lookup.

**Abnahme:** `constructor`, `toString`, `__proto__`, leere/zufällige IDs
werden von Validator und Modell abgewiesen. Browser-Import bleibt
bedienbar und ersetzt bei Fehlern nicht das aktuelle Dokument.
Dies ist ein Lookup-/Verfügbarkeitsfehler, kein nachgewiesener
Prototype-Pollution-Exploit.

### SW-09 – Größenlimits schützen die Allokation nicht

**P1 · R/C**  
**Code:** `src/core/chart.js:54–65,90–97,321–327`;
`cli/stitchwright.js:104–113`; `src/app.js:1226–1237`.

`createChart()` prüft nur Ganzzahligkeit. `resizeChart()` und
`normalizeChart()` prüfen keine Obergrenze. Fehlen Matrizen beim Import,
werden sie vor der späteren Größenvalidierung angelegt.

**Probe:** `createChart({width: 0,height: 1})` erzeugt ein Chart, das der
eigene Validator anschließend ablehnt. Die CLI schreibt es ohne weitere
Prüfung. Sehr große Maße können enorme Allokationen verursachen; ein
absichtlicher OOM wurde nicht ausgeführt.

**Auftrag:** Einheitliche Dimensionsprüfung vor jeder Allokation.
Zusätzlich Grenzen für Importdateigröße, tatsächlich vorhandene
Matrixlängen, Gruppen-/Palettenzahl und Textmengen definieren. Auf gültige
1000×1000-Dokumente abgestimmt begrenzen, nicht willkürlich klein.

**Abnahme:** 0, negative, gebrochene und >1000-Dimensionen werden früh
abgelehnt; maximal gültige Größe bleibt nutzbar. CLI `new` schreibt nie
eine vom eigenen Validator abgelehnte Datei.

### SW-10 – Rapport folgt Strukturänderungen nicht

**P1 · R/C**  
**Code:** `src/core/chart.js:321–352,389–442,458–475`.

Marker werden angepasst, `options.repeat` aber nicht. Einfügen, Löschen,
Verkleinern und Spiegeln lassen die alten Rapportgrenzen stehen.

**Probe:** Breite 10, Rapport `{start:7,end:10}`, Verkleinern auf 5:
Rapport bleibt unverändert; `E_REPEAT_RANGE`. Spiegeln eines asymmetrischen
Rapports verschiebt die roten Grenzen nicht mit dem Muster.

**Auftrag:** Die Semantik einer Rapportgrenze bei jeder strukturellen
Operation festlegen. Verschieben/Spiegeln korrekt transformieren;
Verkleinerung kontrolliert kürzen oder nach Entscheidung entfernen.
Eine normale Editieroperation darf keine ungültigen Optionen hinterlassen.

**Abnahme:** Tests für Einfügen links/in/rechts vom Rapport, Löschen von
Grenzen/ganzen Rapporten, Resize und doppelte Spiegelung. Nach jedem
Schritt bleibt `validateChart()` fehlerfrei.

### SW-11 – Asymmetrische Zöpfe werden nicht geometrisch gespiegelt

**P2 · R/C**  
**Code:** `src/core/chart.js:458–470`; `src/core/symbols.js:122–125`;
`docs/symbols.md`, Abschnitt Cables.

Die Dokumentation definiert `left/right` als Stranggrößen im Bild.
Horizontalspiegelung ändert Position und `front/back`, vertauscht aber
nicht `left/right`.

**Probe:** 1/3 front wird zu 1/3 back. Nach der definierten Bildsemantik
müsste es 3/1 back werden. Symmetrische 2/2-Tests können das nicht erkennen.

**Auftrag:** Stranggrößen beim Spiegeln tauschen und Glyph/Legende gemeinsam
prüfen. Fachliche Bedeutung bei Rückreihen explizit dokumentieren.

**Abnahme:** 1/3 und 2/5 in beiden Richtungen prüfen. Gespiegelte
Geometrie/Legende stimmen überein; zweimal spiegeln ergibt das Original.
Die fachliche Strickabnahme bleibt zusätzlich notwendig.

### SW-12 – Rückreihenmodus ist nicht konsistent

**P1 · R/C**  
**Code:** `src/core/validate.js:301–308`;
`src/core/render-canvas.js:138–155`;
`src/ui/canvas-view.js:400–405`; `src/app.js:902–940`.

Vier zusammenhängende Lücken:

1. Die Warnung für versteckte Rückreihen prüft Zellen/Farben, keine Gruppen.
   Ein Zopf auf Reihe 2 verschwindet ohne Warnung (Probe: keine Diagnosen).
2. Der Tastaturcursor läuft im RS-Modus auf 2, 4, … weiter. Dort ist er
   unsichtbar, kann aber weiterhin Änderungen auslösen.
3. Auswahlhöhe verwendet absolute Reihendifferenz statt sichtbarer Reihen.
   Auswahl von Reihe 1 bis 3 übermalt geometrisch drei statt zwei Zeilen.
4. Füllen/Löschen einer Auswahl bearbeitet auch die ausgeblendeten geraden
   Reihen zwischen den sichtbaren Endpunkten.

**Auftrag:** Sichtbare Navigation, Auswahlgeometrie und bearbeitete
Reihenmenge als gemeinsame Policy behandeln. Versteckte Daten dürfen nicht
unbemerkt verändert werden. Gewollte Bearbeitung ausgeblendeter Reihen
müsste explizit erkennbar sein.

**Abnahme:** RS-Chart mit eigenen Symbolen, Farben und Gruppen auf geraden
Reihen; Pfeiltasten, Bereichsauswahl, Fill/Clear und Warnung prüfen.
Ausgeblendete Inhalte bleiben bei sichtbarer Auswahl unangetastet.

### SW-13 – Eigene Gruppen mit verschiedener Bedeutung verschmelzen

**P2 · R**  
**Code:** `src/core/chart.js:589–608`, `usedLegendKeys`.

Der Legenden-Schlüssel enthält `label`, aber weder `span` noch `legend`.
Gleich beschriftete Custom-Gruppen mit unterschiedlichen Spannweiten oder
Erklärungen werden zu einer einzigen Legendenposition.

**Probe:** `X`, Breite 2, „first meaning“ und `X`, Breite 3,
„different meaning“ ergeben nur den ersten Eintrag.

**Auftrag:** Semantische Identität explizit abbilden. Einen kollisionsfreien
strukturierten Schlüssel statt unescaped Doppelpunktverkettung verwenden.
Konflikte gleicher Labels sichtbar machen, nicht still auflösen.

**Abnahme:** Gleiche Gruppen deduplizieren; verschiedene Breiten/Notizen
bleiben unterscheidbar. Labels mit `:` oder Unicode erzeugen keine
zufälligen Kollisionen.

### SW-14 – Bibliotheks-Legendentexte verschwinden

**P1 · R/C**  
**Code:** `src/ui/persistence.js:131–145`; `src/app.js:81–88,286–317`.

`saveCustomGroups()` schreibt komplette Gruppen, `loadCustomGroups()`
projiziert sie auf `{label, span}` und verwirft `legend`. Beim Start
speichert die App die so geladene Bibliothek erneut.

**Probe:** Ein gespeichertes `{label:"X",span:2,legend:"keep this"}` wird
ohne `legend` zurückgegeben. Wenn das aktuell geöffnete Chart dieselbe
Gruppe enthält, kann der Merge den Text zufällig wiederherstellen.
Das erklärt, warum ein Reload-Test mit genau diesem Chart den Fehler
übersehen kann.

**Auftrag:** Bibliotheksformat verlustfrei laden/validieren, versionieren
und bei Migrationen erhalten. Auch das bewusste Leeren eines Legendentextes
muss möglich sein: `legend || previous.legend` verhindert das derzeit.

**Abnahme:** Gruppe mit Erklärung speichern, anderes Chart ohne diese
Gruppe öffnen, neu laden, Gruppe erneut platzieren: Erklärung unverändert.
Separater Test für bewusst geleerten Text.

### SW-15 – Clipboard trägt keine Palette

**P1 · R/C**  
**Code:** `src/core/chart.js:488–534`; `src/app.js:58,954–980,1211–1223`.

Fragmente enthalten nur Farb-IDs, keine zugehörigen Paletteneinträge.
Die Zwischenablage bleibt beim Dokumentwechsel bestehen.

**Probe:** Aus A mit zusätzlicher Farbe `Z` kopieren, in frisches B
einfügen: B enthält anschließend `Z`, aber keine Definition;
`E_COLOR_ID`. Noch tückischer: Gibt es dieselbe ID mit einer anderen
Farbe, entsteht keine Diagnose, aber das Muster ändert seine Farbe.

**Auftrag:** Verwendete Farben im Fragment mitspeichern und beim Einfügen
nach Inhalt/ID-Konflikten mappen. Alternativ dokumentübergreifendes
Einfügen zunächst explizit verhindern; bloß auf Standard-IDs zu vertrauen
ist keine Lösung. Aktive Pinsel-Farbe beim Wechsel ebenfalls validieren.

**Abnahme:** Gleiche IDs mit anderen Hexwerten, fehlende IDs und
Custom-Namen prüfen. Ergebnis bleibt semantisch farbtreu und validierbar.

### SW-16 – Rechtsmaschen-Pinsel lässt Gruppen stehen

**P2 · R**  
**Code:** `src/ui/canvas-view.js:369–373`;
`src/core/chart.js:298–306`.

`paintAt()` beendet sich, wenn Zellwert und Farbe schon passen.
Unter Gruppen ist der Zellwert definitionsgemäß `null`; mit
Rechtsmaschen-Pinsel und passender Farbe wird `paintCell()` daher nie
aufgerufen. Dessen vorgesehene Gruppenentfernung findet nicht statt.

**Probe:** `k2tog` setzen, mit `k`/ohne Farbe übermalen:
Gruppe bleibt vorhanden.

**Auftrag:** Gruppenbelegung in die No-op-Prüfung einbeziehen oder die
Änderungserkennung vollständig der gemeinsamen Modelloperation überlassen.

**Abnahme:** Alle Einzelzellwerkzeuge inklusive leerer Rechtsmasche
verhalten sich über Gruppen konsistent; Undo stellt die Gruppe wieder her.

### SW-17 – Globale Tastaturbefehle kapern native Bedienung

**P1 · B/C**  
**Code:** `src/app.js:1551–1609`.

Der Window-Keydown-Handler ignoriert Eingabefelder, aber keine Buttons oder
Links. Enter/Space werden überall außerhalb eines Dialogs abgefangen und
als Zeichnen interpretiert.

**Browser-Repro:** Fokus auf `#btn-new`, Enter. Dialog bleibt geschlossen.
Mit ausgewähltem Symbol kann stattdessen eine Zelle verändert werden.
Auch Pfeiltasten und Entf haben ohne Canvas-Fokus globale Nebenwirkungen.

**Auftrag:** Native Interaktion respektieren. Zeichen-/Navigationsbefehle
auf die fokussierte Zeichenfläche begrenzen. Globale Shortcuts gezielt
definieren, `event.defaultPrevented` und interaktive Ziele berücksichtigen.
Palette darf bei Auswahl den Fokus nicht durch Komplettneubau verlieren.

**Abnahme:** Nur per Tab/Enter/Space ein neues Chart anlegen, Symbol wählen,
zeichnen, speichern, exportieren. Buttons lösen ihre eigene Funktion aus
und verändern das Chart nicht nebenbei.

### SW-18 – Pointergesten sind nicht robust

**P2 · C**  
**Code:** `src/ui/canvas-view.js:133–162,173,224–295,339–365`.

- Strokes malen nur die gemeldeten Zellen; zwischen zwei Pointer-Events
  liegende Rasterzellen werden nicht interpoliert. Schnelles Ziehen kann
  Löcher hinterlassen.
- Der erste Touch zeichnet sofort. Kommt ein zweiter Finger zum Pinch,
  wird der begonnene Strich committed statt als Zoomabsicht rückgängig
  gemacht.
- Mitteltasten-Pan ist vorgesehen (`event.button === 1`), wird aber durch
  den früheren Filter `event.button !== 0` unerreichbar.
- Bewegungen werden bei Paint/Pan nicht konsequent auf den aktiven Pointer
  begrenzt; `lostpointercapture` hat keinen eigenen Abschluss.

**Auftrag:** Gesture-Zustandsautomat mit Besitzer-Pointer, klarer
Abbruchsemantik und Rastersegment-Interpolation. Touch-Pinch darf nicht
als Nebeneffekt zeichnen.

**Abnahme:** Sparse Pointer-Moves über zehn Zellen, Mehrfingerbeginn,
Pointercancel/LostCapture, Rechtsradieren und Mitteltaste automatisiert
prüfen; anschließend reale Tablet-/Stiftprobe.

### SW-19 – Reihennummern verschwinden im RS-Modus

**P2 · R/C**  
**Code:** `src/core/render-svg.js:243–250`;
`src/core/render-canvas.js:342–350`.

Die Nummerndichte filtert über `row % step`. Bei Schritt 2 sind aber alle
sichtbaren RS-Reihen ungerade.

**Probe:** 100 Reihen, RS-Modus: SVG zeigt nur Reihennummer `1`; die
anderen 49 sichtbaren Reihen haben keine Nummer. Bei ungerader Gesamthöhe
bleibt zusätzlich die letzte Reihe durch eine Ausnahme sichtbar.
Canvas hat denselben Fehler bei Zoomstufen mit `step === 2`.

**Auftrag:** Ausdünnung nach sichtbarem Reihenindex, anschließend die
tatsächliche Reihennummer ausgeben.

**Abnahme:** Höhen 60/61/100/120/121 und mehrere Zoomstufen in beiden
Modi; sinnvoll verteilte Nummern inklusive erster/letzter sichtbarer Reihe.

### SW-20 – SVG-Legenden sind nicht layoutfest

**P1 · B/C**  
**Code:** `src/core/render-svg.js:128–134,265–293`.

Die SVG-Breite folgt ausschließlich der Chartbreite. Legendentexte sind
einzeilig und ungemessen; Spaltenabstand und Zeilenhöhe sind konstant.
Lange Texte werden abgeschnitten oder laufen in Nachbarspalten.

**Browser-Nachweis:** Gültiges 1×1-Chart mit eigener Gruppe und Erklärung:
`viewBoxWidth = 88`, rechtes Textende laut `getBBox() ≈ 393.83`.
Der Text passt um ein Mehrfaches nicht in den exportierten Bereich.
Titel/Untertitel haben ebenfalls keine Layoutstrategie.

**Auftrag:** Mindestbreite, Textumbruch und variable Zeilenhöhen für die
Legende einführen. Exportlayout aus gemessenen oder konservativ
berechneten Textmaßen ableiten; CLI muss dieselbe deterministische
Layoutlogik nutzen. Keine Browser-only-Lösung im gemeinsamen Kern.

**Abnahme:** 1×1, schmale/lange Charts, 160-Zeichen-Erklärungen, deutsche
Begriffe und mehrere Spalten: sämtliche Inhalte innerhalb des ViewBox,
keine Überlappung; SVG, PNG und Druckansicht kontrollieren.

### SW-21 – Kontrast ist nicht zuverlässig

**P2 · R/C**  
**Code:** `src/core/color.js:35–36`;
`src/core/render-svg.js:80–87,179–182,225,237–240`;
`src/core/render-canvas.js:218–221,254–255,269–271`;
`src/ui/palette.js:43–47`; `src/ui/inspector.js:173–177`.

Die Luminanzschwelle 0,46 wählt nicht den besseren Kontrast.
**Probe:** auf `#aaaaaa` wird Weiß gewählt: Kontrast nur **2,32:1**.
Ein dunkles Symbol wäre wesentlich besser.

Weitere Fälle: `nostitch` bekommt grauen Hintergrund, seine Glyphfarbe
berücksichtigt aber weiterhin die darunterliegende Garnfarbe. Mehrfarbige
Gruppen verwenden nur die erste Zelle für Kontrast und Halo.
Paletten-/Legendenvorschauen zeichnen standardmäßig `#111111` ohne eigene
weiße Fläche auf dunklen UI-Flächen.

**Auftrag:** Tatsächliche Kontrastverhältnisse für die verfügbaren
Vordergrundfarben vergleichen. Sichtbaren Hintergrund konsistent
auflösen. Mehrfarbige Gruppen bewusst behandeln; Vorschauen mit passendem
Theme-Kontrast oder neutraler Papierfläche versehen.

**Abnahme:** Mittelgrau/Gelb, dunkles Theme, High Contrast, `nostitch` auf
dunkler Farbe und Zopf über wechselnden Farben visuell und rechnerisch prüfen.

### SW-22 – Die wichtigste Masche fehlt in der Legende

**P2 · R/A**  
**Code:** `src/core/chart.js:599–612`; `src/core/legend.js`;
`src/app.js:1447–1454`; `docs/format.md`, Cells.

`null` ist zugleich „leer“ und „rechte Masche auf der Vorderseite“.
`usedLegendKeys()` ignoriert es; ein reines Rechtsmaschenchart erhält
gar keine Symbollegende. Die Tabellenansicht lässt ungefärbte leere
Maschen ganz aus und nennt gefärbte leere Maschen nur „–“.

**Probe:** `legendEntries(createChart(...))` ergibt `[]`.
Für den Editor ist das ein nachvollziehbares Leerzustandsmodell, für ein
selbstständiges Druckdiagramm fehlt aber die Bedeutung der häufigsten
Zelle. Die Rückreihenoption erklärt Ausblenden, nicht ausreichend die
Unterscheidung zwischen Arbeitsanweisung und Vorderseitenansicht.

**Auftrag:** Leeres Kästchen als eigenes Legendenkonzept führen.
Die bestehende „Vorderseitenansicht“-Semantik im Export erklären, besonders
für rechte/linke Maschen auf Rückreihen. Kein Anleitungsgenerator nötig.

**Abnahme:** Ein exportiertes schlichtes Chart ist ohne App-Hilfe
interpretierbar; Tabelle benennt Maschen verständlich. Fachliche
Abnahme mit einer strickenden Person dokumentieren.

### SW-23 – Druck und Exportoptionen sind widersprüchlich

**P2 · C/A**  
**Code:** `src/app.js:1333–1412`; `src/core/render-svg.js:125`;
`src/core/units.js:43–62`; `index.html:301–308,359–381`.

- „Print“ bei gewähltem JSON landet zuerst im JSON-Speicherpfad und
  druckt nicht.
- `includeLegend: true` kann `chart.options.showLegend === false` nicht
  überschreiben, obwohl die Export-Checkbox wie ein Override wirkt.
- `paper` wird gespeichert, aber nicht im Druckpfad verwendet.
  `fitToPaper()` hat keinen Produktaufrufer.
- `max-width:100%` skaliert den Druck, während die Fußzeile weiterhin die
  ursprüngliche mm-Zellgröße nennt. Ein echtes Papier-/Kachellayout fehlt.
- PNG wird still auf maximal 8000 Pixel Kantenlänge reduziert; die
  ausgewählte Auflösung kann dadurch unterschritten werden.

**Auftrag:** Drucken unabhängig vom Downloadformat behandeln;
Optionspräzedenz festlegen. Papierwahl entweder wirksam machen oder
eindeutig als unverbindlichen Hinweis zeigen. Skalierung/Auflösung
transparent anzeigen.

**Abnahme:** JSON+Print, Legendenoverride, A4/A3/Letter, große Charts,
metrisch/imperial und PNG-Limit mit erwarteter Ausgabe prüfen.

### SW-24 – Service-Worker-Lebenszyklus gefährdet Offlinefähigkeit

**P1 · R/C**  
**Code:** `sw.js:45–60,70–82`; `src/app.js:1663–1670`.

Jeder Cache-Fehler wird verschluckt, auch bei `index.html` und
`src/app.js`. Der Worker aktiviert sich anschließend sofort und löscht
alte Caches. Die Löschbedingung lautet lediglich `key !== CACHE`:
auch Caches anderer Anwendungen derselben Origin werden entfernt.
Das ist gerade bei mehreren GitHub-Pages-Projekten relevant.

**Sandbox-Probe:** Alle Assetdownloads schlagen fehl; trotzdem läuft
`skipWaiting()`. Aktivierung löscht `other-app-v1` und den alten
Stitchwright-Cache.

Weitere Risiken: `cache.put()` wird nicht awaited/mit `waitUntil`
abgesichert; `caches.match()` sucht originweit; Cache-First plus manuell
gepflegter Versionsname kann Assets veralten lassen; `?nosw` deaktiviert
nur Neuregistrierung, keinen bereits kontrollierenden Worker.

**Auftrag:** Atomare Installation eines verpflichtenden Shell-Satzes.
Optionale Assets separat. Nur eigene versionierte Caches löschen und
gezielt lesen. Fehlgeschlagene Aktualisierung erhält die letzte komplette
Version. Update-Verhalten und Entwicklungs-Bypass eindeutig definieren.

**Abnahme:** Erstinstallation offline/mit 404, Update mit fehlendem
Kernmodul, alter offener Tab, Fremdcache auf gleicher Origin,
Reload offline und Deployment unter Unterpfad.

### SW-25 – Performanceversprechen ist zu eng auf Canvas beschränkt

**P2 · R/C**  
**Code:** `src/ui/store.js:45–48,71–98,100–126`;
`src/core/chart.js:589–608`; `src/core/render-canvas.js:260–271`;
`src/app.js:139–158,201–215,1429–1488`;
`src/ui/persistence.js:88–104`.

Jede Transaktion kopiert das gesamte Chart. `pushUndo()` serialisiert es
zusätzlich komplett. Das Budget berechnet JSON-Zeichen, nicht Heapbytes,
und erzwingt mindestens fünf Snapshots.

**Probe:** Sechs Einzelzellen-Edits in 1000×1000: ca. 288 ms auf diesem
Rechner; fünf behaltene Snapshots mit **50.023.610 JSON-Zeichen** trotz
**41.943.040 Byte** angeblichem Budget. Das ist kein Heap-Messwert,
zeigt aber bereits den Widerspruch innerhalb der eigenen Schätzung.

Weiterhin: Legenden scannen das gesamte Raster und suchen Gruppen pro
Zelle; Canvas durchläuft auch vertikal unsichtbare Gruppen und erzeugt
deren Glyphen; Tabellenansicht kann bis zu eine Million DOM-Zeilen bauen;
„Recent“ lädt mit `getAll()` alle kompletten Dokumente statt nur Metadaten.

**Auftrag:** Erst End-to-End messen. Historienbudget hart begrenzen;
bei Bedarf Patch-/Command-History. Gruppen nach Reihe indizieren,
vertikal cullen, Legende inkrementell/gezielt aktualisieren, Tabelle
paginieren und Recent-Metadaten separat abrufen.

**Abnahme:** 40×24, 200×200 und 1000×1000 mit vielen Gruppen/Farben:
Input-Latenz, Framezeiten, Save-Latenz, History-Speicher, Tabellenöffnung
und 50 gespeicherte Charts messen; Hardware und Messverfahren festhalten.

### SW-26 – Tests prüfen Bausteine, nicht das Produkt

**P1 · A/C**  
**Code:** `tests/*`, `package.json`, `.github/`, `scripts/check.js`.

66 grüne Tests sind real, aber ihre Aussagekraft wird überschätzt:
keine eingecheckten Tests für Store, Persistenz, Canvas-Interaktionen,
App-Workflows oder Service-Worker-Lifecycle. SVG-Tests suchen meist
Zeichenketten, prüfen aber weder XML-Struktur noch Layout. Der Perf-Test
misst nur einen 200×200-SVG-Export. Die als „Golden Charts“ beschriebenen
Beispieldateien werden von den Tests nicht eingelesen.

Es gibt keine eingecheckte CI-Workflowdatei. `check` prüft JS-Syntax und
JSON-Parsing, keine Formatierung, Schema-Konformität, Linkintegrität oder
Semantik. Es berücksichtigt nur `.js`, nicht die neue `.mjs`-Auditprobe.

**Auftrag:** Risikoorientiert ergänzen, nicht bloß die Testzahl steigern.
Store/Importer/CLI zuerst, danach wenige persistente Browser-Szenarien.
Abhängigkeiten weiterhin nur nach Projektregel/ADR; ein Browser-Testpaket
ist eine bewusste Tooling-Entscheidung.

**Abnahme:** Jeder P1 erhält eine reproduzierbare Regression. CI führt
mindestens bestehende Checks und neue reine Node-Tests aus. Browsermatrix
und Golden-Chart-Abnahme werden als ausführbarer Ablauf gepflegt.

### SW-27 – Die „App-Shell“ ist ein zweites Domänenmodul

**P2 · A/C**  
**Code:** `src/app.js` (1685 Zeilen); `src/ui/store.js`;
`src/ui/canvas-view.js`; `src/core/chart.js`.

Die Shell verwaltet gleichzeitig Dokumentlebenszyklus, Speicherzustand,
Clipboard, Bibliothek, Export, Druck, Tastatur, Dialoge, Scrollbars,
Fachaktionen und Rendering. Dateilänge allein ist kein Fehler; problematisch
sind globale mutable Variablen und implizite Eventfolgen.

Titeländerungen umgehen `Store.edit()`, andere Metadaten nicht.
Pinselgesten verwenden `begin/touch/commit`, Gruppeninspektor `edit`.
`renderAll()` baut auch bei kleinen Änderungen große DOM-Teile neu.
`fillSelection()` kennt eine hart codierte Liste von Gruppensymbolen
statt der bestehenden `isGroupSymbol()`-Abstraktion.

**Auftrag:** Nach den Integritätsfixes kleine Module entlang vorhandener
Zuständigkeiten extrahieren: Dokumentcontroller, Speicherkoordinator,
Editor-Kommandos, Exportcontroller. Explizite Command-Ergebnisse und
Änderungsarten statt zufälliger Eventabfolge.

**Abnahme:** Titel, Symbole, Gruppen und Optionen laufen durch dieselben
Revision-/Undo-/Save-Regeln; zentrale Zustandsabläufe sind ohne DOM testbar.
Kein Framework-Rewrite und keine neue Abhängigkeit dafür erforderlich.

### SW-28 – Internationalisierung ist noch keine reine Datenpflege

**P2 · B/C**  
**Code:** `src/core/i18n.js:13–25,60–67,89–106,129–138`;
`src/app.js:76–79,1500–1520`; `tests/i18n.test.js`.

**Browser-Repro:** Deutsch speichern und neu laden: UI deutsch,
`<html lang="en-GB">` bleibt englisch. Das HTML-Langattribut wird nur
beim Sprachwechsel gesetzt, nicht beim Initialisieren.

Neue Sprachen benötigen Codeänderungen: `LANGUAGE_META`,
`createBrowserI18n()` mit festem de/en-Laden und SW-Shell.
Gruppenlegenden sind an mehreren Stellen `lang === "de" ? ... : ...`.
Metadaten `reviewed` sind im Code und den Dateien dupliziert; der Test
bestätigt das Label, nicht eine fachliche Prüfung. Fehlende Keys werden
als Keys ausgegeben, entgegen D005.

**Auftrag:** Startsprache auch am Dokument setzen. Locale-Registry und
Fallback-Verhalten klar definieren, doppelte Sprachlogik reduzieren.
Statische/typisierte Übersetzungsschlüssel und Platzhalterparität prüfen.
Reviewstatus nur nach belegter Prüfung verwenden.

**Abnahme:** Erststart, gespeichertes Deutsch, Wechsel/Reset, fehlende Keys
und eine zusätzliche Testlocale prüfen. Screenreader bekommt die
passende Dokumentsprache.

### SW-29 – CLI-Vertrag ist lückenhaft

**P2 · C**  
**Code:** `cli/stitchwright.js:30–48,71–82,104–120,135–151`.

- Boolesche Flags konsumieren den nächsten Positionsparameter:
  `validate --json chart.json` behandelt den Dateinamen als Flagwert.
- Unbekannte Flags werden still akzeptiert.
- Bei JSON-Parse-/Dateifehlern erzeugt `--json` keinen JSON-Fehlervertrag,
  sondern nur `Error: ...` auf stderr.
- `legend` prüft das Chart vor der Auswertung nicht.
- `new` validiert das erzeugte Dokument nicht und verwendet immer die
  Standard-ID `"chart"`. Mehrere so erzeugte Dateien kollidieren beim
  Browserimport, der anhand der ID unmittelbar speichert.
- `--strict` verliert durch SW-06 seine entscheidende Wirkung.

**Auftrag:** Kleine explizite Befehlsschemata mit booleschen/wertigen Flags,
unbekannte Argumente ablehnen, konsistente maschinenlesbare Fehler,
Validierung vor sämtlichen Auswertungen. Dokumentidentität und Import-
Konflikte bewusst lösen.

**Abnahme:** Flagreihenfolgen, fehlende Werte, Tippfehler, defektes JSON,
Dateifehler, unbekannte Symbole und zwei neu erzeugte/importierte Charts.
Unbeabsichtigtes Überschreiben eines lokalen Charts muss ausgeschlossen sein.

### SW-30 – Metadaten beschreiben den Inhalt nicht zuverlässig

**P2 · R/C/A**  
**Code:** `src/core/chart.js:69–75,117–124`;
`src/core/render-svg.js:296–298`; `src/ui/persistence.js:63–73`.

`meta.modified` wird angelegt, aber bei Bearbeitung/Speicherung nicht
fortgeschrieben. Die separate Wrapper-Zeit `savedAt` repariert die
exportierten Metadaten nicht.

**Probe:** Edit einer Zelle lässt `meta.modified` unverändert.
Neue/importierte Charts erhalten außerdem automatisch
`meta.license: "GPL-3.0"`; der SVG-Footer trägt immer GPL-3.0, unabhängig
vom tatsächlichen Metafeld. Die Softwarelizenz ist aber keine
Lizenzentscheidung des Nutzers über sein Strickmuster.

**Auftrag:** Software- und Inhaltslizenz klar trennen. Ohne bewusste Angabe
keine Lizenz für Nutzerentwürfe behaupten. Änderungszeit zentral bei
inhaltlichen Commits aktualisieren; technische Speichervorgänge und Undo
mit definierter Semantik behandeln.

**Abnahme:** JSON-/SVG-Export gibt vereinbarte Metadaten korrekt wieder.
Eigene/fehlende Lizenz bleibt erhalten. Änderung, Undo und erneutes
Speichern haben nachvollziehbare Zeitstempel.

### SW-31 – Lokale Persistenz braucht Fehler- und Recoveryzustände

**P2 · C**  
**Code:** `src/ui/persistence.js:23–42,63–73,111–156`;
`src/app.js:81,115–129,1273–1278,1311–1323`; D006.

Direkte `localStorage.getItem()`-Aufrufe in der Shell sind nicht geschützt,
obwohl die Persistenzschicht auf private/gesperrte Speicherung vorbereitet
sein möchte. Ein abgelehntes `dbPromise` bleibt dauerhaft gecacht;
`blocked`/`versionchange` fehlen. Autosavefehler erscheinen nur in der
Konsole. Lokale Charts werden beim Start/Öffnen normalisiert, aber nicht
validiert.

Es existiert nur ein überschreibender Snapshot pro ID, kein in D006
angekündigter lokaler Versionsverlauf. Mehrere Tabs speichern dieselbe ID
ohne Konflikterkennung. Ein kaputter/importierter Zustand kann den letzten
brauchbaren Stand verdrängen.

**Auftrag:** Zustände „speichert/gesichert/Fehler/nicht verfügbar“ persistent
sichtbar machen. Wiederverbindung und IDB-Lifecycle behandeln. Validieren
vor Aktivierung lokaler Daten. Wiederherstellbare letzte Version und
einfache Mehrtab-Erkennung statt stiller Last-write-wins-Überraschung.

**Abnahme:** Storage verweigert, Quota erreicht, DB offen in anderem Tab,
kaputter lokaler Datensatz und konkurrierende Bearbeitung. JSON-Rettung
bleibt möglich; Fehler wirken nicht wie eine leere Bibliothek.

### SW-32 – Entwicklungsserver ist unnötig fragil

**P2 · C**  
**Code:** `scripts/serve.js:35–44,50–61`.

`decodeURIComponent()` läuft ungefangen im Requesthandler. Ein Requestpfad
`/%` wirft `URIError` und kann den Entwicklungsserver beenden.
Readstream-Fehler haben ebenfalls keinen Handler.

Die Pfadgrenze verhindert einfache `..`-Traversal, aber erlaubt alle
Dateien innerhalb des Projektroots einschließlich `.git/config`.
Symlinks innerhalb des Roots werden nicht anhand ihres Realpaths geprüft.
Das ist kein nachgewiesener öffentlich erreichbarer Produktionsfehler:
der Server bindet korrekt nur an Loopback, GitHub Pages verwendet ihn nicht.

**Auftrag:** Ungültige URLs mit 400 beantworten, Streamfehler behandeln,
interne Dateien ausschließen und Realpath-Grenzen berücksichtigen.
Den kleinen statischen Entwicklungsserver beibehalten.

**Abnahme:** In einem eigens gestarteten Testprozess malformed URL,
Traversal, Dotfile, fehlende Datei und kontrollierten Symlink prüfen.
Keine fremde laufende Entwicklungsinstanz für Crashproben verwenden.

### SW-33 – Modellinvarianten gelten nicht für alle Schreibpfade

**P2 · C**  
**Code:** `src/core/chart.js:163–183,231–276,298–306,488–534`;
`src/ui/store.js:45–68,71–90`.

`setCell()` kann unter eine Gruppe schreiben und damit eine ungültige
Überdeckung erzeugen. `paintCell()` entfernt erst die Gruppe und setzt
die Zelle, bevor die Farbe validiert ist. Scheitert `setColor()`, bleibt
ohne äußere `edit()`-Transaktion eine Teiländerung zurück.
`pasteFragment()` prüft nur oberflächlich, schreibt direkt und kann erst
später beim Gruppenanlegen scheitern.

`begin()` überschreibt einen offenen Pending-Snapshot, `commit()` kennt
kein Rollback. `edit()` und Gesten haben dadurch unterschiedliche
Fehlergarantien. Die API setzt implizit voraus, dass jeder Aufrufer den
richtigen Schutzmantel kennt.

**Auftrag:** Vorbedingungen vor Mutation prüfen; rohe Setter von
invariantenerhaltenden Commands unterscheiden und benennen. Gesten um
`cancel/rollback` ergänzen; verschachtelte Starts abweisen/definieren.

**Abnahme:** Ungültige Farbe, unbekanntes Symbol, überlappende Gruppe und
defektes Fragment hinterlassen das Ursprungsdokument unverändert.
Alle öffentlichen Commands erhalten die Dokumentvalidität.

### SW-34 – Bildspalte ist nicht Maschennummer

**P2 · C**  
**Code:** `src/core/chart.js:185–188,202–206`;
`src/core/render-svg.js:201–214,254–261`;
`src/core/viewport.js:136–143`;
`src/app.js:369–372,394–396`; `src/ui/inspector.js`, Auswahlbeschreibung;
`index.html:275–283`.

Die App nummeriert Maschen rechts→links, speichert Gruppen/Marker/Rapport
aber links→rechts. Der Status rechnet um, andere Anzeigen nicht.
Klick auf die sichtbare linke Masche 10 eines 10er-Charts selektiert
intern Spalte 1 und meldet „Column 1“. Auswahltexte nennen interne
Spalten „Stitch“. Rapportfelder „From stitch/To stitch“ zeichnen ihre
Grenzen von links. Marker „after stitch N“ ebenfalls.

**Auftrag:** Intern Bildspalten beibehalten, an allen UI-/Dokumentations-
Grenzen eindeutig in Maschennummern übersetzen. Bestehende gespeicherte
Koordinaten nicht ohne Migration umdeuten. Ein zentrales Paar
Konvertierungsfunktionen verwenden.

**Abnahme:** Asymmetrisches Chart mit zehn Spalten: Masche 1/2/10,
Rapport 2–4, Marker nach 3, Headerauswahl und Tabelle stimmen visuell
und sprachlich überein.

### SW-35 – Accessibility ist mehr als ARIA-Beschriftung

**P2 · C/A**  
**Code:** `index.html:173,208–215,322–612`;
`src/app.js:637–659,1429–1488`; `src/styles.css:1120–1154`.

Canvas ist als Bild bezeichnet, bietet aber keine semantisch zugängliche
aktive Zelle, Maschenbedeutung oder editierbare Alternative. Der Cursorstatus
ist kein Livebereich. Die Tabelle ist nur eine lückenhafte Leseliste
(SW-22), kein gleichwertiger Editor.

Mobile Seitenleisten werden nur per Transform aus dem Bild geschoben:
ihre Controls bleiben grundsätzlich fokussierbar. Beim Öffnen fehlen
Fokusübergabe, Inert-Behandlung des Hintergrunds und `aria-expanded`.
Dialoge haben Überschriften, aber keine explizite
`aria-labelledby`-Verknüpfung. Farbselektion hat nur ein visuelles
`data-selected`, keinen zugänglichen gedrückten Zustand.

**Auftrag:** Zuerst zuverlässige Tastaturpfade (SW-17), anschließend
benannte Dialoge, Fokusmanagement, zugänglichen Cursor-/Auswahlstatus und
eine praktikable textuelle Zellnavigation schaffen.

**Abnahme:** Vollständiger Tastaturablauf bei 390 und 1440 px;
Tab landet nicht in geschlossenen Drawern. Screenreader-Abnahme
gesondert durchführen. Keine WCAG-Konformität aus diesem Code-Audit ableiten.

### SW-36 – Kleine UI-Fehler summieren sich

**P3 · B/C**  
**Code:** `src/ui/palette.js:66–88`; `src/app.js:992–1003`;
`src/ui/persistence.js:216–229`.

**Browser-Repro:** Suche nach „knit“ zeigt verschiedene Zunahmen/Abnahmen,
aber nicht die normale rechte Masche. Die Basis-Kategorie wird schon
verworfen, bevor ihr separat erzeugter Knit-Button geprüft wird.

Der globale Enter-Handler der Gruppendialoge löst auch in der
Legenden-Textarea „Add“ aus statt eines Zeilenumbruchs und überschreibt
native Buttonabsichten. Der Dateiauswahldialog behandelt nur `change`;
bei Abbruch ohne Change bleibt die Promise offen und das versteckte
Inputelement bestehen. Wiederholter Palettenneubau verliert den Fokus.

**Auftrag:** Knit als regulären Suchkandidaten modellieren. Dialoge über
gezielte Submit-Semantik statt pauschales Enter behandeln. File-Input
auch bei Cancel aufräumen. Fokus bei gezieltem Rerender erhalten.

**Abnahme:** `knit`, `re`, `purl`, leere Treffer; Enter in Textarea,
Cancel-Button per Enter und mehrfach abgebrochene Dateiauswahl.

### SW-37 – Zopfgeometrie überschreitet die Zellhöhe

**P2 · C/A**  
**Code:** `src/core/symbols.js:91–134`;
`src/app.js:1165–1170`; `src/core/render-canvas.js:187–190,260–271`;
`src/core/render-svg.js:230–240`.

Die vertikale Strangspreizung ist konstant `0.12`. Bei vier Strängen
liegen die äußersten Mittellinien schon bei 0,02 und 0,98; Halo und
Strichbreite überschreiten die Zellgrenze. Bei zwölf Strängen liegen
Mittellinien zwischen −0,46 und 1,46. Die UI erlaubt bis zu zwölf
Maschen je Seite. Gruppen werden nicht auf ihre eigene Reihe geclippt.

Dadurch kann ein Zopf in Nachbarreihen hineinragen. Bei gemischten Farben
verschärft der einfarbige Halo die Verfälschung. Der Canvas-Clip umfasst
nur das gesamte Chart; SVG und Canvas können an Außenkanten abweichen.

**Auftrag:** Glyphen-Bounding-Boxes samt Strich/Halo als Invariante
definieren. Strangabstand an Anzahl anpassen oder zulässige Darstellungen
bewusst begrenzen. Fachliche Lesbarkeit in realer Druckgröße prüfen,
nicht nur Vorhandensein von Pfaden.

**Abnahme:** 1/1, 2/2, 4/4 und 12/12 bei 6-mm-Zellen sowie kleineren
Zoomstufen. Kein Übermalen benachbarter Reihen; keine visuelle
Abnahme allein anhand der bestehenden `glyph.length`-Tests.

### SW-38 – Verträge und Dokumentation sind nicht synchron

**P2 · C/A**  
**Code:** `schema/strickschrift.schema.json`; D004–D007;
`docs/sop/SOP-002-chart-und-symbol.md`, SOP-003, SOP-004;
`AGENTS.md:44–45`; `STATUS.md:65`; `src/version.js`.

Wichtige Abweichungen:

- Schema begrenzt Titel/Untertitel auf 120 und Labels auf 24; Runtime-
  Validator nicht. Schema erlaubt beliebige Zellstrings; die Runtime
  nicht. Optionale Rohfelder und erforderliche normalisierte Felder sind
  nicht als getrennte Verträge beschrieben. `$id` nutzt `.example`.
- D006 verspricht lokalen Versionsverlauf, der nicht existiert, und
  „keine Netzwerkaufrufe nach dem ersten Laden“. Tatsächlich gibt es
  SW-Updates/Cachemiss-Fetches. „Keine Übertragung von Chartdaten“ und
  „keine Netzwerkanfrage überhaupt“ sind unterschiedliche Aussagen.
- D005/SOP-003 versprechen Sprachen ohne Codeänderung; SW-28 widerlegt das.
- D007 nennt Symbol-Packs Daten; es existiert eine fest importierte
  Registry mit Renderfunktionen und UI-Sonderfällen. Es fehlt eine
  Packidentität im Dokument. Das ist ein brauchbarer Startpunkt, aber
  noch keine fertige Pack-Schnittstelle.
- SOP-004 verlangt Status „vorzeigbar“ und taggt `v0.1.0`, während das
  Projekt bereits andere Alpha-Versionen veröffentlicht.
- AGENTS nennt noch 0.1.0-alpha.1, STATUS angekündigte Issue-Vorlagen,
  obwohl diese vorhanden sind. „Single source“ in `version.js` ist
  manuell mit package/SW/HTML/Dokumentation synchronisiert.
- „Golden Charts werden von Tests geladen“ ist gegenwärtig falsch.

**Auftrag:** Rohformat und kanonisches Modell explizit beschreiben;
gemeinsame Fixturematrix für Schema/Runtime. Zusagen an tatsächliche
Funktionen angleichen, Release-SOP aktualisieren und automatisch prüfbare
Versions-/Assetkonsistenz hinzufügen. Neue Architekturentscheidungen als
ADR, reine Fehlerkorrekturen nicht künstlich zu Grundsatzentscheidungen
aufblähen.

**Abnahme:** Ein Agent kann aus Dokumentation und CLI denselben Vertrag
ableiten. Kein behaupteter Test/Review/Versionsverlauf ohne Beleg.

## 4. Querschnittskritik

### 4.1 Datenintegrität ist derzeit eine Konvention, keine Garantie

Das Modell, der Validator und die UI haben jeweils einen Teil der Regeln.
Keiner besitzt die vollständige Verantwortung. Ein valides Ausgangschart
bleibt nach erlaubten UI-Aktionen nicht zwingend valide. Dazu kommt, dass
Speichern und JSON-Export keine letzte Integritätsbarriere besitzen.

Die richtige Konsequenz ist nicht „vor jedem Pointermove das ganze Chart
validieren“. Stattdessen müssen kleine atomare Commands ihre Invarianten
selbst erhalten; umfassende Validierung gehört an Import-/Aktivierungs-
und geeignete Persistenzgrenzen. Dieser Unterschied ist entscheidend für
Korrektheit **und** Performance.

### 4.2 Der Undo-Entwurf ist einfach, aber nicht zu Ende geführt

Vollsnapshots sind für kleine Charts ein vertretbarer Start. Kritisch ist,
dass Dokumentidentität, Revisionsstand, offene Gesten und Save-Status nicht
gemeinsam modelliert sind. Ein Patch-History-System allein würde SW-01
bis SW-05 nicht lösen. Erst die Zustandsregeln sauber definieren, dann
die Speicherrepräsentation optimieren.

### 4.3 „Gleiche Glyphen“ heißt noch nicht „gleiche Ausgabe“

Canvas und SVG teilen Pfade, aber nicht alle Entscheidungen:
Nummernausdünnung, sichtbare Hintergründe, Gruppen-Clipping, Textlayout,
Legendenikon-Skalierung und Druckgröße unterscheiden sich. Es fehlen
visuelle Vergleichsfixtures. Die Aussage „Preview cannot drift“ in den
Kommentaren ist stärker als die tatsächliche Garantie.

### 4.4 Symbolik braucht fachliche Abnahme

Die Kombination „Fläche = verbrauchte Maschen“ bei Abnahmen und
einzelligen Zunahmen ist eine bewusste eigene Diagrammsprache, kein
belegter Standard. Ein reiner Editor muss keine Maschenbilanz berechnen.
Er muss aber eindeutig erklären, was eine Reihe, eine leere Zelle,
ein Rückreihenzeichen und eine Spannweite bedeuten. Beispiel-Chart und
schöne Pfade belegen nicht, dass ein echtes Muster damit ohne
Missverständnisse nachgestrickt werden kann.

Die anstehende Symbolgestaltung sollte deshalb getrennte Abnahmen haben:
Erkennbarkeit bei kleiner Darstellung, eindeutige Richtungssemantik,
asymmetrische Zöpfe, Rückreihen und gedruckte Legende. Der Audit schreibt
keinen neuen Symbolstil vor.

### 4.5 Security: schlanke Angriffsfläche, schwache Vertrauensgrenzen

Positiv: keine Laufzeitabhängigkeiten, kein Backend, keine dynamische
Codeausführung in den geprüften Anwendungspfaden, keine erkennbaren
Telemetrieaufrufe. Die vorhandenen `innerHTML`-Stellen verwenden intern
erzeugtes Glyph-SVG; Nutzertexte darin werden escaped.

Die realen Risiken sind gegenwärtig eher Eingabevalidierung,
Ressourcenverbrauch, Datenverlust und Cacheisolation als klassische
Account-/Serverangriffe. Der Prototype-Lookup-Fehler ist konkret.
Unbegrenzte Importallokationen sind konkret aus dem Ablauf ableitbar.
Es wurde keine funktionierende XSS-Kette aus einem erfolgreich validierten
Chart behauptet oder nachgewiesen.

Bei späteren externen Symbol-Packs darf die aktuelle Annahme „Glyphen sind
vertrauenswürdiger eingebauter Code“ nicht unbemerkt übernommen werden.
Das ist eine neue Vertrauensgrenze und gehört dann in deren ADR.

### 4.6 Produktgrenzen ehrlich machen

„Offline“, „große Charts“, „Tastaturbedienung“ und „Agentenschnittstelle“
sind derzeit implementierte Ansätze, noch keine umfassend abgesicherten
Eigenschaften. Das Alpha-Label passt. Vor stärkerer Empfehlung sind
Messungen und Workflow-Abnahmen nötig. Mehr Features würden die aktuellen
Integritätsprobleme eher vervielfachen.

## 5. Ausführbarer Arbeitsplan für den nächsten Agenten

### Paket A – Dokument- und Speichersicherheit

**Befunde:** SW-01, SW-02, SW-03, SW-14, SW-31; ID-Kollision aus SW-29.  
**Abhängigkeiten:** keine; zuerst bearbeiten.

1. Store-Zustandsregeln für Dokument-ID, Revision, savedRevision,
   Transaktion und Dokumentwechsel schriftlich als kurze Abnahme festlegen.
2. Node-Tests für Replace/Undo/Redo und Bibliotheks-Roundtrip.
3. Speicherkoordinator mit kontrollierbar asynchronem Storage-Adapter testen.
4. Browserabläufe „Edit → sofort Neu“, „Save läuft → Edit“,
   „Save läuft → anderes Dokument“ abnehmen.
5. Recovery/Importkonflikte lösen, ohne vorhandene lokale Dokumente
   ungefragt umzuschreiben.

**Fertig, wenn:** kein Dirty-Zustand still verschwindet; „Saved“ bezieht
sich nachweislich auf die aktive Revision; Dokumente bleiben getrennt.

### Paket B – Valide UI-Kommandos

**Befunde:** SW-04, SW-05, SW-10, SW-11, SW-15, SW-16, SW-33.  
**Abhängigkeiten:** A für gemeinsame Transaktionsregeln.

1. Eindeutige Instanz-IDs und atomare Platzierungs-/Paste-Kommandos.
2. Palette/Clipboard-Konflikte und Strukturtransformationen.
3. Nach jeder Aktion einer kleinen deterministischen Befehlssequenz
   `validateChart()` aufrufen.
4. Undo/Redo der gesamten Sequenz muss exakt nachvollziehbare Inhalte
   wiederherstellen.

**Fertig, wenn:** normale Editoraktionen keine ungültigen Charts erzeugen;
Fehlschläge hinterlassen keine Teilmutation.

### Paket C – Import- und Agentenvertrag

**Befunde:** SW-06–SW-09, SW-29, SW-38 (Formatteil).  
**Abhängigkeiten:** parallel zur fachlichen Planung möglich, Umsetzung nach
Abstimmung der kanonischen Modellinvarianten.

1. Rohvalidierung vor Allokation/Normalisierung.
2. Prototypsicherer Symbol-Lookup und totaler Validator.
3. Versionierte Normalisierung/Migration mit Verlustdiagnosen.
4. CLI-Argumente/JSON-Fehlerausgabe vereinheitlichen.
5. Gemeinsame gute/schlechte Fixtures für CLI, Browserimport und Schema.

**Fertig, wenn:** `validate --json --strict` ein verlässlicher Vertrag ist
und ungültige Daten niemals als still repariertes Erfolgsergebnis erscheinen.

### Paket D – Interaktion und Zugänglichkeit

**Befunde:** SW-12, SW-17, SW-18, SW-28, SW-34–SW-36.  
**Abhängigkeiten:** B für gemeinsame Commands.

1. Fokusgebundene Tastaturbefehle, sichtbare Reihen als gemeinsame Policy.
2. Pointer-Zustandsautomat, Stroke-Interpolation, Touch-Abnahme.
3. Einheitliche Maschenkoordinaten an UI-Grenzen.
4. Dialog-/Drawer-Fokus und sprachlicher Dokumentstatus.

**Fertig, wenn:** derselbe kleine Entwurf per Maus und Tastatur korrekt
entsteht; RS-Auswahl verändert keine versteckten Inhalte.

### Paket E – Verlässlicher Export

**Befunde:** SW-13, SW-19–SW-23, SW-30, SW-37.  
**Abhängigkeiten:** stabile Semantik aus B/D.

1. Kleine Export-Golden-Charts mit schmalem Layout, langen Texten,
   Rückreihen, Farben und asymmetrischen Zöpfen.
2. SVG als XML parsen; Text-/Glyphengrenzen prüfen.
3. Canvas/SVG/PNG visuell vergleichen; Druckgröße und Lizenztext abnehmen.
4. Reales synthetisches Strickmuster mit Daniel fachlich prüfen.

**Fertig, wenn:** Druckartefakte vollständig lesbar sind und die
UI-Optionen ihren tatsächlichen Effekt korrekt beschreiben.

### Paket F – Offline, Performance, Releasequalität

**Befunde:** SW-24–SW-27, SW-32, SW-38 (Betriebsteil).  
**Abhängigkeiten:** Integritätskorrekturen zuerst, dann messen/refaktorieren.

1. SW-Lifecycle mit Fehlerfällen und Fremdcaches testen.
2. End-to-End-Benchmarks und reales History-Budget.
3. Nur belegte Engpässe optimieren.
4. CI/Release-SOP, Versionen und Dokumentationszusagen synchronisieren.

**Fertig, wenn:** eine fehlgeschlagene Aktualisierung die funktionierende
Offlineversion erhält und definierte große Charts messbar bedienbar bleiben.

## 6. Mindest-Testmatrix

| Ebene | Unverzichtbare Fälle |
|---|---|
| Modell | gültig → Command → gültig; Fehler → unverändert; doppelte IDs; Rapporttransformationen; asymmetrische Spiegelung; Clipboard-Farben |
| Store | Dokumentwechsel; Undo/Redo; offene Transaktion; No-op; Rollback; Snapshotbudget |
| Import | falsche Typen; fehlende Version; unbekannte Version/Keys; geerbte Symbolnamen; Limits vor Allokation; Roundtrip |
| Persistenz | Save/Edit-Race; Save/Wechsel-Race; Fehler/Quota; Wiederanlauf; Bibliothekslegende; gleiche ID; zwei Tabs |
| CLI | Exitcodes; JSON auch bei Fehlern; Flagposition; ungültiges `new`; `legend` auf defekter Datei; Überschreibschutz |
| Browser | Buttons per Tastatur; mehrfach gleiche Gruppen; Reload; RS-Auswahl; schnelle Pointerbewegung; Cancel; Drawers; gespeicherte Sprache |
| Export | kurze/schmale Charts; lange Legenden; echte XML-Struktur; Textgrenzen; RS-Nummern; Kontrast; Druckoptionen; PNG-Grenzen |
| PWA | komplette Erstinstallation; einzelnes fehlendes Kernasset; fehlgeschlagenes Update; Fremdcache; alter Tab; Unterpfad; Offline |
| Performance | 40×24/200×200/1000×1000; leer/dicht/viele Gruppen; History; Paste; Tabellenansicht; viele lokale Charts |
| Fachlichkeit | leere Masche; Hin-/Rückreihen; asymmetrischer Zopf; Abnahme/Zunahme; Marker/Rapportnummern; physischer Ausdruck |

## 7. Reproduktion und Ergebnisprotokoll

### Bestehende Checks

```sh
npm run check
```

Ergebnis am Ausgangsstand: **66 Tests bestanden**, keine fehlgeschlagenen
Tests. Keine Aussage über die oben ungetesteten Pfade.

### Zusätzliche deterministische Node-Proben

```sh
node docs/audits/2026-11-19-probes.mjs
```

Das Skript importiert die tatsächlichen Produktmodule, arbeitet mit
synthetischen Charts und mockt ausschließlich Canvas/Storage/SW-Umgebung.
Es verändert keine Projekt- oder Benutzerdaten. Die SW-Cachelöschungen sind
simuliert. Die Ergebnisse stehen als JSON unter den Befund-IDs.
Laufzeiten sind maschinenabhängig.

Wesentliche beobachtete Ergebnisse:

```text
SW-01: Undo nach Wechsel B führt zu Dokument A.
SW-04: Gruppen-IDs ["cable","cable"], E_GROUP_DUPLICATE.
SW-05: 1 Gruppe, 0 Undo-Einträge, dirty=false, Null-Gesture-Fehler.
SW-06: falsche groups werden [], unbekanntes Feld weg, strictErrors=[].
SW-07: Validator wirft bei rows=42.
SW-08: constructor akzeptiert; Legende wirft.
SW-09: Chart mit Breite 0 erzeugt, danach E_SIZE.
SW-10: Resize lässt ungültigen Rapport stehen.
SW-11: 1/3 front wird 1/3 back statt 3/1 back.
SW-12: versteckte Gruppe auf Reihe 2 ohne Warnung.
SW-13: zwei unterschiedliche X-Gruppen ergeben einen Legendeneintrag.
SW-14: geladene Bibliotheksgruppe hat keine legend mehr.
SW-15: eingefügtes Z ohne Palette, E_COLOR_ID.
SW-16: Rechtsmaschen-Pinsel lässt Gruppe stehen.
SW-19: RS-Chart mit Höhe 100 hat nur Reihennummer 1.
SW-21: Weiß auf #aaaaaa, Kontrast 2,323:1.
SW-22: Rechtsmaschenchart hat leere Legende.
SW-24: Installation trotz aller Assetfehler; fremder Cache gelöscht.
SW-25: 5 Snapshots überschreiten schon als JSON-Zeichen das Bytebudget.
SW-30: modified bleibt nach Edit identisch.
```

### Browserproben

Lokaler eigener Auditserver auf Port 8187, URL `/?nosw`, synthetische
Dokumente. Geprüft wurden:

- Enter auf fokussiertem „New“: Dialog öffnet nicht.
- „knit“-Suche: normale rechte Masche fehlt.
- Deutsch speichern/Reload: deutsche UI, HTML weiterhin `en-GB`.
- Autosave aus/Edit/Neu: keine Sicherungsabfrage.
- Zwei Zöpfe zeichnen und in IndexedDB lesen: beide ID `cable`.
- Schmale SVG-Legende per Browser-`getBBox()`: Textende außerhalb ViewBox.
- Save/Edit-Interleaving durch einmalige Instrumentierung von
  `IDBObjectStore.put`: UI „Saved“, persistierter Titel veraltet.

Die Browserproben sind Sitzungsbelege, noch keine eingecheckte
automatische Browser-Testsuite. Der Bericht fordert deren Überführung
in dauerhafte Regressionen ausdrücklich.

## 8. Abschlusskriterium des Audits

Der Audit ist mit diesem Bericht und den reproduzierbaren Proben
abgeschlossen. **Die Fehler sind damit nicht behoben.** Als nächstes
Paket A/B/C bearbeiten, statt die Befundliste nur als langfristige Roadmap
abzulegen. Nach Abschluss eines Pakets IDs, Regressionen und Restfragen
im Journal nachführen; einen neuen Auditstand nicht mit diesem historischen
Ausgangsbefund überschreiben.
