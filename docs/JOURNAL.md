# Arbeitsjournal

Chronologisches Protokoll. Jede Sitzung bekommt einen Eintrag: Ziel, getan,
entschieden, offen. ADRs enthalten die dauerhaften Gründe; hier steht der
Verlauf.

## 2026-11-18 – Projektstart

**Ziel:** Aus Daniels Wunsch „nicht mehr mit Kästchenpapier dasitzen“ ein
Produkt machen: ein freier, lokaler Strickschrift-Editor, der von Menschen
und Agenten benutzt werden kann.

**Entschieden:**

- Kein Anleitungsgenerator, nur Diagramme.
- Statische Web-App statt Desktop-App oder Python-Server. Das ist der einzige
  Weg, Windows, macOS, Linux, Tablet und Stift ohne drei Codebasen zu bedienen.
- Vanilla JavaScript, Canvas für den Editor, SVG für den Export. Keine
  Laufzeitabhängigkeiten.
- Symbolsprache „Klar“ mit den gelernten Ankern (leer = re, Punkt = li,
  Kreis = Umschlag) und einer eigenen, ruhigeren Grammatik für alles andere.
- Farben von Anfang an, obwohl Daniel selbst einfarbig strickt.
- Deutsch und Englisch gepflegt; i18n-Architektur ab Tag eins.
- GPL-3.0, privates GitHub-Repository. Veröffentlichung erst nach einer
  vorzeigbaren Version.
- Keine Cloud, keine Konten, keine Telemetrie, keine Kollaboration.

**Getan:** Projektordner, Repository, Regeln, README, Status, Roadmap, ADRs,
SOPs, Lizenz.

**Offen:** Editor-Kern und Oberfläche. Die nächste Sitzung baut Modell,
Symbolglyphen, SVG-Export und die erste Canvas-Ansicht.

## 2026-11-18 – Editor-MVP gebaut

**Ziel:** Vom Projektgerüst zu einem benutzbaren Editor.

**Getan:**

- Symbolpack Klar mit Grundzeichen, Zunahmen, Abnahmen, Textur, Hilfszeichen
  und einem parametrisierten Zopf-Generator.
- Chart-Modell mit Raster, Farben, Gruppen, Rapport, Rückreihen-Modus.
- Validator mit Diagnose-Codes; JSON-Schema für Editoren und Agenten.
- SVG-Export mit Titel, Gitternetz, Nummern, Rapportlinien und Legende.
- Node-CLI: `validate`, `render`, `new`, `legend`.
- Canvas-Editor: Pan/Zoom, Stift, Radierer, Auswahl, Gruppenplatzierung,
  Farben, Undo/Redo, Tastatur-Cursor.
- Lokale Persistenz in IndexedDB, Autosave, Öffnen/Speichern, JSON/SVG/PNG,
  Drucken über den Browser.
- Deutsch/Englisch, hell/dunkel/System/hoher Kontrast, metrisch/imperial.
- PWA mit Service Worker; offline neu laden funktioniert.
- Beispieldateien und 54 Tests.

**Entschieden:** Der Editor zeichnet auf Canvas nur den sichtbaren Ausschnitt;
bei sehr kleinem Zoom werden Symbole zugunsten der Übersicht weggelassen. Der
SVG-Export bleibt vollständig. Das hält große Charts flüssig.

**Geprüft:** Zeichnen, Farbe, Zopf, Auswahl, Undo, neues Chart, Öffnen-Dialog,
SVG-Export, PNG-Export, Sprachwechsel, dunkles Theme, Offline-Neuladen.

**Offen:** Zopf-Über-/Unterführung optisch verfeinern, Touch auf echten
Geräten, eigene Symbol-Packs, Übersetzungen und eine reale Abnahme.

## 2026-11-18 – Rückmeldung aus dem ersten Test

**Beobachtet:** Der Leer-Hinweis blieb nach „Leeres Chart“ stehen. Reihe und
Spalte ließen sich nur über das rechte Panel hinzufügen, das bei schmalen
Fenstern zugeklappt ist.

**Getan:**

- Der Leer-Hinweis ist schließbar, merkt sich die Entscheidung und verschwindet
  auch beim ersten Klick auf die Zeichenfläche. „Leeres Chart“ heißt jetzt
  „Jetzt zeichnen“ und schließt nur den Hinweis; neue Größen kommen über „Neu“.
- Immer sichtbare `+ Reihe`- und `+ Spalte`-Buttons oben rechts auf der
  Zeichenfläche. Sie hängen eine Reihe oben bzw. eine Spalte rechts an.
  Die vier richtungsgenauen Buttons im rechten Panel bleiben erhalten.
- Raster-Erweiterungen schließen den Leer-Hinweis und passen die Ansicht an.
- 54 Tests weiter grün; im Browser geprüft: Hinweis bleibt nach Reload weg,
  Größe wächst von 300 × 300 auf 301 × 301.

## 2026-11-18 – Reihen/Spalten löschen, Zopfrichtung korrigiert

**Beobachtet:** Raster ließ sich nur erweitern, nicht verkleinern. Außerdem
waren die Zopfrichtungen „vorne“ und „hinten“ vertauscht.

**Getan:**

- Reihen- und Spaltennummern auf der Zeichenfläche sind anklickbar. Die
  Auswahl erscheint als Markierung und als Label neben den Schnellbuttons.
  Der Papierkorb löscht die ausgewählte Reihe/Spalte nach Bestätigung.
  `Entf` löst dasselbe aus, solange eine Reihe/Spalte ausgewählt ist.
- Die Zopf-Glyphen wurden getauscht: Bei „vorne“ liegt der zuerst gestrickte
  Strang (im Bild rechts) oben, bei „hinten“ der linke. Die Dokumentation
  erklärt jetzt ausdrücklich die Leserichtung.
- Demo-Chart und SVG neu erzeugt.
- 57 Tests grün, Browserprüfung: Reihe 24 und Spalte 1 gelöscht, Größe
  jeweils korrekt reduziert.

## 2026-11-18 – Scrollbalken

**Beobachtet:** Bei großen Charts und gezoomter Ansicht fehlten sichtbare
Scrollbalken; in schmalen Fenstern war nicht erkennbar, dass die obere
Bedienleiste horizontal scrollt.

**Getan:**

- Eigene horizontale und vertikale Scrollbalken auf der Zeichenfläche. Sie
  erscheinen nur, wenn das Chart größer als der Ausschnitt ist, und lassen
  sich am Griff, per Klick in die Spur oder mit den Pfeiltasten bedienen.
- Die Scrollbalken sind mit `role="scrollbar"` und Werten für Screenreader
  versehen; der Fokus bleibt in der Tastaturbedienung.
- Seitenleisten, Dialoge, Tabellenansicht und die obere Bedienleiste zeigen
  jetzt sichtbare, schlanke native Scrollbalken, wenn Inhalt überläuft.
- Im Browser bei 182 % geprüft: beide Balken erscheinen, Griffe ziehen die
  Ansicht, Werte ändern sich; bei „Einpassen“ verschwinden sie wieder.

## 2026-11-18 – Eigene Gruppen bleiben erhalten

**Beobachtet:** Eine eigene Gruppe (z. B. `TL`) musste für jede Verwendung neu
angelegt werden; der Dialog zeigte `TL` als Platzhalter, was wie ein Vorgabewert
wirkte.

**Getan:**

- Eigene Gruppen werden in einer lokalen Bibliothek gespeichert und unter
  „Eigene“ in der Symbolleiste als wiederverwendbare Buttons angezeigt.
- Beim Anlegen wird die Gruppe automatisch in die Bibliothek übernommen; beim
  Öffnen eines Charts werden darin enthaltene eigene Gruppen ergänzt.
- Der Platzhalter im Namensfeld ist jetzt „Name“, das Feld ist leer.
- „Neue eigene Gruppe“ öffnet den Dialog; bestehende Gruppen werden mit einem
  Klick ausgewählt und direkt gesetzt.
- 57 Tests grün; Browserprüfung: `TL` angelegt, gesetzt, nach Reload weiter in
  der Palette vorhanden.

## 2026-11-18 – Legendentext und öffentliche Alpha

**Beobachtet:** Eigene Gruppen brauchten einen frei geschriebenen Legendentext,
damit später klar ist, wofür `TL` steht. Daniel hat die Veröffentlichung
freigegeben.

**Getan:**

- Eigene Gruppen haben jetzt ein optionales Feld `legend`. Es erscheint in der
  Legende, im Export und in der Tabellenansicht; der Dialog und der Inspector
  können es bearbeiten.
- Die lokale Bibliothek speichert den Legendentext mit. Änderungen im Inspector
  aktualisieren die Bibliothek (Vergleich über den Inhalt, nicht nur die Anzahl).
- Ausführliche Projektseite `about.html`, Screenshot, README, Changelog,
  Contribution-Hinweise und Versionskonstante `0.2.0-alpha.1`.
- Repository wird öffentlich, GitHub Pages veröffentlicht die App; die Alpha
  ist überall klar gekennzeichnet.
- 64 Tests grün; Browserprüfung: Legendentext angelegt, platziert, im Inspector
  geändert und nach Reload angezeigt.

## 2026-11-18 – Maschenmarker und Bereiche kopieren

**Beobachtet:** Das Chart braucht sichtbare Maschengruppen wie gesetzte
Maschenmarker; außerdem fehlten sichtbare Kopieren-/Einfügen-Schaltflächen für
einen ausgewählten Bereich.

**Getan:**

- `options.markers` speichert Grenzen nach Masche N. Canvas und SVG zeichnen
  gestrichelte violette Hilfslinien; sie sind ausdrücklich keine Strickanweisung
  und erscheinen nicht in der Legende.
- Marker-Werkzeug: Klick setzt oder entfernt einen Marker. Zusätzlich „Marker
  alle N“ und „Marker löschen“ im Größen-Panel.
- Marker folgen Spalten einfügen/löschen, Spiegeln und Verkleinern; Validierung
  prüft Lage und Duplikate.
- Auswahlwerkzeug mit Ziehen, sichtbare Kopieren-/Einfügen-Buttons in der
  Werkzeugleiste, Zielzelle anklicken, einfügen. Farben und Gruppen werden
  mitkopiert; nach dem Einfügen bleibt der eingefügte Bereich ausgewählt.
- Werkzeugauswahl auf `button[data-tool]` begrenzt; vorher traf sie auch die
  Zeichenfläche.
- 64 Tests grün; Browserprüfung: Marker alle 5 gesetzt und einzeln entfernt,
  3×3-Bereich kopiert und an anderer Stelle eingefügt.

## 2026-11-19 – Englisch als Präsentationssprache

**Beobachtet:** Daniel will Stitchwright international präsentieren. Die App
war zwar zweisprachig, startete aber auf Deutsch – inklusive Startseite,
Manifest und README. Für ein Publikum außerhalb des deutschsprachigen Raums
ist das die falsche erste Begegnung.

**Getan:**

- Englisch (britisch, einfach) ist Standardsprache: `DEFAULT_LANGUAGE = "en"`,
  neue Einstellungen starten englisch, `lang="en-GB"` in HTML und Manifest.
- Deutsch bleibt vollständig gepflegt und im Einstellungsdialog wählbar;
  gespeicherte deutsche Einstellungen bleiben erhalten.
- Alle fest eingebauten deutschen Texte in `index.html` übersetzt; fehlende
  `data-i18n`-Anker für Werkzeugleiste, Seitenleisten und Zeichenfläche
  ergänzt, damit der Umschalter auch diese Bereiche aktualisiert.
- Validierungsmeldungen und CLI-Ausgaben englisch; CLI rendert und legt die
  Legende standardmäßig auf Englisch an.
- Beispiel-Chart und Beispiel-Dateien englisch; README und CONTRIBUTING
  übersetzt.
- 66 Tests grün (zwei neue: Standardsprache und SVG-Sprachwahl).
- Browserprüfung: Start englisch, Wechsel auf Deutsch aktualisiert alle
  Bereiche inklusive Zeichenfläche und Legende, Reload behält Deutsch,
  Rückwechsel auf Englisch funktioniert, Beispiel lädt mit englischem Titel.

## 2026-11-19 – Englische Projektseite und 0.3.0-alpha.1

**Beobachtet:** Daniel hat den Text für die Projektseite freigegeben. Die
Seite soll ohne CLI-Hürde funktionieren, den Preisvergleich nennen, das
Symbolpack auf Englisch **Clear** heißen und automatische Anleitungen als
langfristige Idee unter „Planned“ führen.

**Getan:**

- `about.html` vollständig auf Englisch neu geschrieben: hero, Feature-Karten,
  Browser-Schnellstart, „Run it yourself“, Agenten-CLI, Status, Planned,
  Contributing, Technik, Dokumentation, Datenschutz, Transparenz und Lizenz.
- Windows- und macOS-Nutzer brauchen weder Node noch CLI: Live-Demo öffnen
  oder PWA installieren; der lokale Start und die CLI sind klar optional.
- „Automatic written instructions from a drawn chart“ steht unter „Planned“.
- Symbolpack heißt auf Englisch **Clear**, auf Deutsch weiter **Klar**.
- `docs/format.md` und `docs/symbols.md` auf Englisch übersetzt; interne ADRs,
  SOPs, Status und Journal bleiben deutsch und werden auf der Seite als
  interne Notizen gekennzeichnet.
- Neuer englischer Screenshot (1440 × 900) aus dem Beispiel-Chart.
- Version auf `0.3.0-alpha.1` gesetzt, Changelog und Service-Worker-Cache
  aktualisiert; mobile Kopfzeile der Projektseite umgebrochen.
- Öffentliche Dateien von privaten Projektverweisen bereinigt.
- 66 Tests grün; Browserprüfung hell/dunkel, Desktop und 390 px Breite.

## 2026-11-19 – Umfassender Code-Audit für Agenten

**Ziel:** Auf Daniels Wunsch den Code umfassend und kritisch prüfen und
eine direkt von Agenten nutzbare Arbeitsgrundlage ablegen.

**Getan:**

- Ausgangsstand `d3b1ff81580d5137285479f43f6cd286aa4c7764` geprüft:
  Kern, UI, Persistenz, CLI, Schema, Renderer, Service Worker, Tests,
  HTML/CSS und Dokumentationsverträge.
- Bericht `docs/audits/2026-11-19-code-audit.md`: 38 Befunde mit stabilen IDs,
  Priorität, Belegstufe, Codeorten, Reparaturauftrag und Abnahmekriterien;
  sechs geordnete Arbeitspakete und Mindest-Testmatrix.
- Reproduzierbare, synthetische Node-Proben unter
  `docs/audits/2026-11-19-probes.mjs`; keine Produktfehler in dieser Sitzung behoben.
- Kritische Punkte: dokumentübergreifendes Undo, ungesicherter Dokumentwechsel,
  Save/Edit-Race, doppelte Gruppen-IDs aus der UI, fehlerhafte Importnormalisierung,
  Verlust von Bibliothekslegenden und unvollständige SW-Installation.

**Geprüft:** `npm run check` mit 66/66 erfolgreichen Tests; zusätzliche
Auditprobe inklusive gemocktem SW-Lifecycle ausgeführt und Syntax geprüft.
Chromium bestätigte unter anderem zwei Zöpfe mit ID `cable`, „Saved“ trotz
neuerer ungespeicherter Änderung, blockiertes Enter auf „New“, fehlende
Knit-Suchtreffer, falsches HTML-lang nach deutschem Reload und SVG-Text
außerhalb des ViewBox. Keine reale Touch-/Strick-/Druckabnahme.

**Offen:** Sämtliche Auditbefunde. Zuerst Arbeitspakete A/B/C bearbeiten.
Der parallel entstandene unversionierte Ordner `design/` gehört nicht zum
Audit-Ausgangsstand und wurde nicht bearbeitet.

## 2026-11-19 – Audit-Pakete A/B/C und zentrale P2-Fixes

**Ziel:** Die P1-Befunde des Code-Audits beheben und die wichtigsten
P2-Sicherheits-, Export- und Interaktionsfehler mit Regressionen absichern.

**Getan:**

- Dokumentwechsel ist eine harte Store-Grenze: Undo/Redo, Auswahl, Cursor,
  Pinsel und Bibliothek werden zurückgesetzt; offene Änderungen werden
  gespeichert, verworfen oder abgebrochen. Autosave-Timer sind an Dokument
  und Revision gebunden.
- Speichern quittiert nur die tatsächlich geschriebene Revision. Änderungen
  während des Speicherns bleiben dirty; Schreibfehler bleiben sichtbar.
- Gruppen bekommen aus der UI eindeutige Instanz-IDs; Tastaturplatzierung ist
  atomar, dirty und rückgängig; Marker funktionieren per Tastatur.
- Import validiert Rohdaten vor der Normalisierung, behält unbekannte Felder,
  begrenzt Dateigröße und Collections; der Validator ist total und
  prototypsicher.
- Rapportgrenzen folgen Einfügen, Löschen, Resize und Spiegeln; asymmetrische
  Zöpfe tauschen beim Spiegeln die Stränge.
- Rückreihenmodus hält Cursor und Auswahl auf sichtbaren Reihen und warnt vor
  versteckten Gruppen; Füllen/Löschen lässt ausgeblendete Reihen unberührt.
- Clipboard-Fragmente tragen ihre Palette; Konflikte werden beim Einfügen
  umgemappt. Fehlgeschlagene Paints und Pastes hinterlassen keine Teilmutation.
- Tastatur respektiert native Buttons; Zeichenbefehle brauchen den Canvas.
  Pointer interpolieren, Pinch bricht den ersten Strich ab, Mittelklick-Pan
  und Pointer-Cancel sind definiert.
- SVG-Legenden umbrechen lange Texte und erweitern den ViewBox; RS-Reihennummern
  folgen sichtbaren Zeilen; Kontrast wählt den besseren von Schwarz/Weiß;
  `nostitch` bekommt seinen grauen Grund.
- Druck ist unabhängig vom Downloadformat; Legenden-Override und Papierwahl
  wirken; PNG-Kappung wird gemeldet.
- Service Worker installiert Pflichtassets atomar, behält bei Fehlern die alte
  Version und löscht nur eigene Caches. Entwicklungsserver validiert URLs,
  Dotfiles und Realpaths.
- Persistenz speichert eine vorherige vollständige Chartversion, zeigt
  Speicherfehler und warnt bei parallelen Tabs. Öffnen bietet Wiederherstellung.
- CLI: explizite Flag-Schemata, JSON-Fehlervertrag, eindeutige IDs, Validierung
  vor dem Schreiben, `legend` prüft das Chart.
- 108 Node-Tests, neue Audit-Regressionen und CI-Workflow; Browserprüfungen für
  Tastatur, offene Änderungen, RS-Auswahl, mobile Drawer und Offline-Reload.
- Version auf 0.4.0-alpha.1 angehoben; lokale Änderungen noch nicht veröffentlicht.

**Offen:** P2-Restpunkte aus dem Audit: App-Shell-Refactor, vollständige
Performance-Messung, dynamische Sprachregistry, Mehrfarben-Halos bei Zöpfen,
echte Touch-/Druck-/Strickabnahme. Keine Behauptung einer vollständigen
Audit-Abnahme.

## 2026-11-20 – P2-Rest: Koordination, Registry, Kontrast und Abnahme

**Getan:**

- Save-Koordination in `src/ui/save-coordinator.js` ausgelagert und mit
  Node-Tests für Save/Edit-Race, Dokumentwechsel und queued Saves abgedeckt.
- Sprachregistry `src/locales/languages.json`; neue Sprachen brauchen nur
  Registry-Eintrag und Locale-Datei. Die App lädt alle registrierten Sprachen,
  fällt bei fehlenden Dateien auf Englisch zurück und meldet Ladefehler.
- Mehrfarbige Gruppen bekommen einen neutralen Halo und die Farbe mit dem
  besten Worst-Case-Kontrast; `SW-21` ist damit auch für Zöpfe über Farbwechsel
  abgedeckt.
- Persistenz speichert die vorherige vollständige Chartversion nur bei
  inhaltlicher Änderung; Öffnen bietet eine Wiederherstellung. Parallele Tabs
  melden sich über BroadcastChannel. Speicherfehler bleiben sichtbar.
- Performance-Snapshot `docs/audits/2026-11-20-performance.md` und
  `2026-11-20-benchmark.mjs`: 40×24, 200×200 und 1000×1000 gemessen.
  History-Budget 32 MiB, 3 Snapshots bei 1000×1000; sechs Edits ca. 300 ms.
- Golden-Sample-Test lädt und rendert alle `samples/*.json`.
  Browserabnahme als `docs/sop/SOP-006-browser-abnahme.md` beschrieben.
- Version 0.4.0-alpha.1, 108 Tests grün, CI-Workflow vorhanden.

**Offen:** App-Shell weiter entflechten, echte Browser-Matrix mit 50 lokalen
Charts, Patch-History nur bei Bedarf, Touch-/Druck-/Strickabnahme. Keine
vollständige Audit-Abnahme behaupten.

## 2026-11-20 – Einsteiger-How-to

**Beobachtet:** Die App ist bewusst einfach, aber die Dokumentation begann mit
Format, Symbolen und Entwicklerabläufen. Menschen, die nur ein Chart zeichnen
wollen, brauchten einen kurzen Einstieg.

**Getan:**

- `how-to.html` und `how-to.de.html`: fünfminütige Anleitung von
  „Editor öffnen“ über Zeichnen, Zöpfe, Reihen, Speichern, Export und
  Tastatur bis zu häufigen Problemen.
- App-Hilfe, README und Projektseite verlinken die Anleitung; die App wählt
  automatisch die englische oder deutsche Fassung.
- Service Worker speichert beide How-to-Dateien als optionale Offline-Hilfe.

**Geprüft:** `npm run check` grün; Browser: Help-Link zeigt in beiden Sprachen
auf die richtige Datei.

## 2026-11-20 – Konstruktive Symbolstudie C als Standard

**Beobachtet:** Daniel hat drei Symbolstudien prüfen lassen und C
(Konstruktiv) als Standard gewählt. C deckt die meisten bisherigen Symbole ab,
aber nicht Perle, Wende, Abketten und Anschlagen; außerdem bringt es
Linksmaschen-Varianten und zwei Abhebevarianten mit.

**Getan:**

- C-Glyphen in `src/core/symbols.js` als Standard hinterlegt. IDs und
  Dateiformat bleiben unverändert; alte Charts rendern mit den neuen Formen.
- `tbl` ist jetzt das konstruktive X, dazu `ptbl` mit Purpunkt. `slip` und
  `slipw` unterscheiden Faden hinten/vorne. `p2tog` und `ssp` ergänzen die
  Linksabnahmen.
- Perle, Wende, Abketten und Anschlagen im gleichen Stil neu gezeichnet.
- Zöpfe sind zwei offene Kreuzungslinien mit durchgehendem Vorderband; der
  Glyph bleibt parametrisch für 1/1 bis 4/4 und größere Gruppen.
- Docs `symbols.md`, D003-Nachtrag, neue ADR D011, Screenshot und
  `samples/klar-demo.svg` aktualisiert.
- Version auf 0.5.0-alpha.1, 108 Tests grün, Browserprüfung des Beispiels.

**Offen:** Fachliche Strick- und Druckabnahme der neuen Glyphen; keine
Behauptung, dass die Studie ohne reale Strickprobe fertig ist.

## 2026-11-21 – Eigene Zöpfe bleiben erhalten

**Beobachtet:** Daniel hat einen eigenen Zopf (3/2 hinten) angelegt. Nach dem
Wechsel auf eine andere Gruppe war die Kombination weg und musste neu
eingegeben werden. Eigene Gruppen liegen bereits in einer lokalen Bibliothek;
Zöpfe hatten keine.

**Getan:**

- `src/ui/custom-cables.js`: reine Bibliothekslogik mit Validierung,
  Deduplizierung, Preset-Filter und Obergrenze 24.
- Persistenz in `localStorage` unter `stitchwright.customCables.v1`.
- Die Palette zeigt eigene Zöpfe unter **Eigene Zöpfe** direkt unter den
  Presets; ein Klick setzt die Kombination wieder als aktives Symbol.
- Beim Öffnen eines Charts werden dessen eigene Zöpfe in die Bibliothek
  übernommen.
- Der Zopf-Dialog startet mit dem aktiven bzw. zuletzt angelegten Zopf statt
  immer mit 2/2 vorne.
- Neu angelegte Palette-Einträge werden sichtbar gescrollt.
- Sechs neue Node-Tests; gesamt 114 grün. Browser: 3/2 hinten angelegt,
  gewechselt, erneut ausgewählt, neu geladen und Dialogvorbelegung geprüft.

**Offen:** Einträge lassen sich noch nicht aus der Bibliothek löschen.

## 2026-11-21 – 0.5.1-alpha.1 veröffentlicht

**Anlass:** Daniel hat in Brave die GitHub-Pages-Fassung geöffnet und den
Zopf-Fix dort erwartet. Die Live-Fassung war noch 0.5.0-alpha.1.

**Getan:**

- Version auf 0.5.1-alpha.1 und Datum 2026-11-21 gesetzt (`package.json`,
  `src/version.js`, STATUS, README, Projektseite, How-tos).
- Service-Worker-Cache auf `stitchwright-v0.5.1` angehoben; der alte Cache wird
  beim Aktivieren gelöscht.
- Changelog mit dem Zopf-Fix, den Prüfungen und 114 Tests ergänzt.
- `npm run check` grün; Browserprüfung und Offline-Laden vor der
  Veröffentlichung.
- Commit, Tag `v0.5.1-alpha.1`, Push und GitHub Release.

**Hinweis:** Die lokale Zopf-Bibliothek ist browsergebunden. Nach dem Update
muss Daniel den 3/2-Zopf in Brave einmal neu anlegen; danach bleibt er.

## 2026-11-21 – Bereiche auswählen, kopieren und Maschen zählen

**Beobachtet:** Daniel wollte mehrere Reihen/Spalten über die Nummern
markieren und löschen, Rechtecke per Maus aufziehen und mit Ctrl+C/Ctrl+V
vervielfältigen. Außerdem fehlten ihm kleine Zahlen für Folgen gleicher
Maschen; Wende, Abketten und Anschlagen hält er als Chartzeichen nicht für
sinnvoll.

**Getan:**

- `headerSelection` ist jetzt ein normalisierter Bereich `{kind, from, to}`.
  Ziehen über die Nummern und Shift-Klick erweitern ihn; der Papierkorb löscht
  den ganzen Bereich von oben nach unten. Status, Inspector und Bestätigung
  zeigen den Bereich.
- Die Rechteckauswahl startet auch auf einer Gruppe. Ein Klick ohne Ziehen
  wählt weiterhin die Gruppe; Ziehen erzeugt das Rechteck. Ctrl+C/Ctrl+V und
  die Kopieren/Einfügen-Buttons arbeiten mit Farben und Gruppen.
- `stitchCountRuns` in `src/core/run-lengths.js` zählt Folgen gleicher Maschen
  und Farbe in Strickrichtung (rechts nach links). Die Zahl steht in der ersten
  Masche der Folge; Gruppen brechen die Folge, `nostitch` und leere Reihen
  werden nicht beschriftet.
- Chart-Option `showStitchCounts` (Standard aus) mit Checkbox im Panel,
  Canvas- und SVG-Ausgabe; Schema und Format-Dokumentation aktualisiert.
- Wende, Abketten und Anschlagen sind mit `hidden: true` aus der Palette
  genommen; IDs und Rendering bleiben für alte Charts erhalten.
- 130 Node-Tests grün. Browser: Zeilen-Ziehen, Shift-Klick, Bereich löschen,
  Rechteck auf einer Gruppe, Ctrl+C/V, Maschenzahlen und SVG-Ausgabe geprüft.

**Offen:** Touch-Abnahme; Zopf-Symbolstudie für asymmetrische Breiten liegt
weiterhin bei Daniel; die Änderungen sind noch nicht veröffentlicht.

## 2026-11-22 – Asymmetrische Zöpfe zeichnen

**Beobachtet:** Daniel hat einen 1/2-Zopf „hinter die Arbeit“ skizziert: drei
Maschen, ein durchgehendes Vorderband von links unten nach rechts oben und ein
kurzer hinterer Schenkel nur in der rechten Zelle. Der bisherige Glyph zeichnete
zwei volle Kreuzungslinien und traf die Asymmetrie nicht. Sein eigener 3/2-Zopf
hinten war davon ebenfalls betroffen.

**Getan:**

- `cableGlyph` unterscheidet jetzt symmetrische und asymmetrische Breiten.
  Symmetrische Zöpfe behalten das volle X aus Studie C. Bei `left !== right`
  läuft das Vorderband über die ganze Gruppe; das hintere Bündel erscheint als
  kurzer Schenkel von der äußeren unteren Ecke zur Vorderbandlinie. `back` legt
  den Schenkel nach rechts, `front` nach links.
- Der Schenkel wird vor dem Vorderband gezeichnet und mündet ohne Lücke in die
  Linie. Es gibt keinen zusätzlichen Halo, weil er das Vorderband nicht kreuzt.
- Regressionstests für 1/2 und 2/1 in beiden Richtungen; 134 Tests grün.
- `docs/symbols.md` und ADR D011 um die asymmetrische Regel ergänzt.
- Browser: 2/1-Zopf hinten über den Dialog angelegt und bei 70 % und 146 %
  Zoom geprüft; Vorderband durchgehend, Schenkel rechts.
- Version auf 0.6.0-alpha.1 und Datum 2026-11-22 gesetzt.

**Offen:** Touch-, Druck- und reale Strickabnahme; die Legende nennt weiterhin
die Bildseiten (links/rechts) und die Richtung, nicht die Zahl der gehaltenen
Maschen. Eine eigene 1/2-Voreinstellung ist nicht nötig, weil eigene Zöpfe
bereits in der lokalen Bibliothek bleiben.

## 2026-11-22 – 0.6.0-alpha.1 veröffentlicht

**Anlass:** Der asymmetrische Zopf-Glyph war korrigiert; Daniel prüft die
Live-Fassung auf GitHub Pages.

**Getan:**

- Version 0.6.0-alpha.1 und Datum 2026-11-22 in `package.json`,
  `src/version.js`, STATUS, README, Projektseite, How-tos, AGENTS, D009 und
  SOP-004 gesetzt.
- Service-Worker-Cache auf `stitchwright-v0.6.0` angehoben; der
  Regressionstest löscht die alten Caches bis v0.5.1.
- 134 Tests und `npm run check` grün.
- Commit `af8d231`, Tag `v0.6.0-alpha.1`, Push und GitHub Release.
- GitHub Pages gebaut; `src/version.js`, `about.html` und das neue Sample
  live geprüft. Der Beispiel-SVG enthält den kurzen Schenkel.

**Hinweis:** Die lokale Zopf-Bibliothek ist browsergebunden. Ein 1/2-Zopf
hinten wird als eigener Zopf mit linker Seite 2, rechter Seite 1 und Richtung
Hinten angelegt; danach bleibt er in der Bibliothek.

## 2026-11-22 – Zopf-Legende eindeutig

**Beobachtet:** Daniel hat „Cable 2/1 to back“ als „2 Maschen nach hinten“
gelesen. Standard ist aber vorne/hinten: 2/1 back heißt 2 vorne, 1 hinten und
passt zu seinem Bild. Bei Richtung „front“ waren die Zahlen dagegen wirklich
vertauscht, weil die Legende die Bildseiten links/rechts statt vorne/hinten
zeigte.

**Getan:**

- `cableLegendParts` berechnet die Zahlen in Standardreihenfolge vorne/hinten
  und nennt zusätzlich die Maschen auf der Hilfsnadel, zum Beispiel
  „Cable 2/1 · 1 held back“.
- `groupLegend` und `legendEntries` nutzen dieselbe Funktion; die doppelte
  Zopf-Logik in `legend.js` ist entfernt.
- Tests für 2/1 hinten, 1/2 vorne und 2/1 vorne; 135 Tests grün.
- Beide Beispiel-SVGs neu gerendert. Browser: Properties-Legende zeigt
  „Cable 2/1 · 1 held back“.
- Version auf 0.6.1-alpha.1 gesetzt.

## 2026-11-22 – 0.6.1-alpha.1 veröffentlicht

**Anlass:** Die Zopf-Legende war für Daniel missverständlich. Die neue Fassung
nennt vorne/hinten und die Maschen auf der Hilfsnadel ausdrücklich.

**Getan:**

- Version 0.6.1-alpha.1 in `package.json`, `src/version.js`, STATUS, README,
  Projektseite, How-tos, AGENTS, D009 und SOP-004 gesetzt.
- Service-Worker-Cache auf `stitchwright-v0.6.1`; Regressionstest löscht die
  alten Caches bis v0.6.0.
- 135 Tests und `npm run check` grün.
- Beide Beispiel-SVGs und der Editor-Screenshot neu erzeugt.
- Commit `6167c68`, Tag `v0.6.1-alpha.1`, Push und GitHub Release.
- GitHub Pages gebaut; `src/version.js`, `about.html` und die Legende im
  Beispiel-SVG live geprüft.

## 2026-11-22 – Farbige Hilfslinien zwischen Maschen

**Beobachtet:** Daniel markiert in Strickschriften Grenzen zwischen zwei
Maschen, zum Beispiel die Mitte zwischen Masche 13 und 14, um symmetrische
oder geteilte Muster leichter zu lesen. Die vorhandenen Maschenmarker sind
dafür zu starr: immer gestrichelt, immer violett und immer über die ganze
Höhe. Die Linie soll eine eigene Farbe haben und per Ziehen über den gewählten
Maschengrenzen entstehen. Sie ist ausdrücklich nur eine Lesehilfe.

**Getan:**

- Neues optionales Chart-Feld `guides` (D012): `{id, color, boundary,
  fromRow, toRow}`. `boundary` zählt Bildspalten von links, `fromRow`/`toRow`
  sind inklusiv. Die Farbe ist ein eigener Hex-Wert, keine Paletten-ID.
- Modell: Anlegen, Entfernen, Leeren, Überlappungssuche; Reihen-/Spalten-
  Einfügen und -Löschen, Verkleinern sowie Spiegeln verschieben oder kürzen
  die Linien mit dem Raster.
- Canvas und SVG zeichnen Hilfslinien oberhalb der Maschen, damit Zöpfe sie
  nicht verdecken. Die Linienbreite skaliert mit der Zelle, nicht mit dem
  Viewport.
- Editor: neues Werkzeug „Hilfslinie“ (Taste L) mit Farbwähler, Linienzähler
  und „Linien löschen“ im Werkzeugpanel. Klick setzt eine Linie über die ganze
  Höhe, Ziehen begrenzt sie auf Reihen; Klick oder Rechtsklick auf eine
  bestehende Linie entfernt sie. Die zuletzt gewählte Farbe bleibt in den
  Einstellungen.
- Schema, Format-Dokumentation (`docs/format.md`), README, Projektseite,
  How-tos und Hilfe erklären die Hilfslinien. Die Legende bleibt unverändert.
- 13 neue Node-Tests für Modell, Geometrie, Validierung und SVG; insgesamt
  148 Tests und `npm run check` grün.
- Browser: 42 × 26-Chart, rote Linie über die ganze Höhe, grüne Teil-Linie
  über Ziehen, Klick- und Rechtsklick-Löschen, Alle-löschen, Rückgängig,
  Autosave und Neuladen geprüft; SVG-Export enthält die Linien.

**Offen:** Ob Hilfslinien auch waagerecht oder als Treppenlinie gebraucht
werden, entscheidet Daniel nach einer echten Strickschrift. Das aktuelle
Modell kann nur senkrechte Linien auf Maschengrenzen.

## 2026-11-22 – Reihennummern beidseitig und beim Zoomen sichtbar

**Beobachtet:** Bei großen Charts verschwinden beim Hineinzoomen die
Papierränder aus dem Bild. Damit waren auch die Reihennummern weg, obwohl
gerade dann der Bezug zur Reihe wichtig ist. Außerdem standen sie nur links.

**Getan:**

- Canvas: Reihennummern stehen jetzt links und rechts. Liegt ein Papierrand
  außerhalb des Viewports, wird die zugehörige Nummernspalte an den
  Viewport-Rand geheftet; ist der Rand sichtbar, bleibt sie direkt daneben.
  Die Zahlen haben einen Hintergrund-Halo, damit sie über Maschen lesbar
  bleiben.
- Beide Nummernspalten sind anklickbar und wählen dieselbe Reihe; Ziehen
  erweitert die Reihenauswahl wie bisher. `headerAt` kennt dafür die
  Viewport-Breite; die Layoutlogik liegt geteilt in `rowNumberLayout`.
- `fitView` lässt 44 px Rand, damit die beidseitigen Nummern auch im
  eingepassten Zustand Platz haben.
- SVG-Export und CLI rendern die Reihennummern ebenfalls links und rechts;
  der rechte Rand wuchs von 20 auf 44 px.
- Tests: neuer Viewport-Test für geheftete Nummern, Klick auf die rechte
  Nummernspalte und ein SVG-Test für beidseitige Reihennummern; insgesamt
  150 Tests und `npm run check` grün.
- Browser: 42 × 26-Chart bei 286 % Zoom. Beide Spalten sichtbar, links
  geheftet und rechts am Papierrand; nach dem Scrollen umgekehrt. Klick auf
  die rechte Nummer wählt Reihe 17.

**Nachtrag:** Spaltennummern stehen seit demselben Tag ebenfalls oben und
unten und heften sich beim Zoomen an den Viewport. Siehe den nächsten
Eintrag.

## 2026-11-22 – Spaltennummern oben und unten

**Anlass:** Nach den Reihennummern fehlten die Spaltennummern oben. Beim
Arbeiten in der Mitte eines großen Charts ist die untere Nummernzeile weit
weg; Daniel möchte die Spalten jederzeit ablesen können.

**Getan:**

- Canvas: Die Stichnummern stehen jetzt oben und unten am Papier. Liegt die
  Papierkante außerhalb des Viewports, heftet sich die jeweilige Nummernzeile
  an den oberen oder unteren Bildschirmrand. Beide Zeilen sind anklickbar und
  wählen dieselbe Spalte; Ziehen erweitert die Auswahl wie bisher.
- `columnNumberLayout` teilt die Geometrie zwischen Renderer und Trefferprüfung.
  `headerAt` nimmt dafür zusätzlich die Viewport-Höhe entgegen.
- Die Zahlen nutzen denselben Hintergrund-Halo wie die Reihennummern und
  bleiben dadurch auch über Maschen lesbar.
- SVG-Export und CLI drucken die Stichnummern ebenfalls oben und unten. Der
  obere Rand wuchs von 56 auf 72 px; Beispiel-SVGs neu erzeugt.
- Der Editor-Screenshot zeigt den Beispielchart mit Nummern an allen vier
  Rändern und den farbigen Hilfslinien.
- Tests: neue Trefferprüfungen für obere/unten geheftete Spaltennummern und
  ein SVG-Test für beide Nummernzeilen; insgesamt 152 Tests grün.
- Browser: 32 × 20-Beispiel bei 105 % und 286 % Zoom, hell und dunkel. Oben
  und unten sichtbar; Klick auf die obere Nummer wählt Spalte 24, Klick auf
  die untere Spalte 21.

## 2026-11-22 – 0.6.2-alpha.1 veröffentlicht

**Anlass:** Daniel nutzt die öffentliche Version und wollte die neuen
Randnummern und Hilfslinien dort haben.

**Getan:**

- Version 0.6.2-alpha.1 in `package.json`, `src/version.js`, STATUS, README,
  Projektseite, How-tos, AGENTS, D009 und SOP-004 gesetzt.
- Service-Worker-Cache auf `stitchwright-v0.6.2`; der Regressionstest prüft,
  dass v0.6.2 aktiv bleibt und die älteren Caches bis v0.6.1 verschwinden.
- Changelog-Eintrag mit Hilfslinien und beidseitigen Randnummern; 152 Tests
  und `npm run check` grün.
- Beispiel-SVGs neu gerendert; Editor-Screenshot auf den Beispielchart mit
  Nummern an allen vier Rändern und Hilfslinien umgestellt.
- Commit `2e2bc34`, Push auf `main`, Tag `v0.6.2-alpha.1` und GitHub Release.
- GitHub Pages gebaut; `src/version.js`, `sw.js` und der Versions-Badge live
  geprüft. Die gehostete App lädt den Beispielchart mit oberen und unteren
  Spaltennummern.

## 2026-11-22 – Fester Hintergrundrahmen um die Zeichenfläche

**Beobachtet:** Daniel hat im Testbrowser bis 286 % gezoomt. Rechts lief das
Muster bis an die Canvas-Kante, die angehefteten Reihennummern lagen auf den
Maschen, und nirgends war mehr Hintergrund zu sehen. Bei starkem Zoom soll
immer ein Stück Rand sichtbar bleiben.

**Getan:**

- Neuer fester Rahmen: 44 px links und rechts, 28 px oben und unten. Der
  Chart wird an der Innenkante beschnitten; die vier Randstreifen werden nach
  dem Zeichnen mit der Hintergrundfarbe übermalt und tragen die Nummern.
- `viewportFrame` teilt die Innenfläche zwischen Renderer, Trefferprüfung,
  Zeigerlogik und `fitView`. `fitView` lässt jetzt 56 px Rand.
- `cellAt`, `guideTargetAt` und `ensureVisible` kennen den Rahmen: Klicks,
  Hilfslinien und der Tastaturcursor bleiben in der Zeichenfläche, der Rand
  wählt weiterhin Reihen und Spalten.
- Die Nummernspalten sitzen im Rahmen: links/rechts Reihennummern, oben/unten
  Spaltennummern. Der rechte Scrollbalken liegt ebenfalls im Rahmen und
  überdeckt die Zahlen nicht.
- Tests: neuer Viewport-Test für Rahmen-Treffer und Fit-Rand; insgesamt
  153 Tests und `npm run check` grün.
- Browser: 32 × 20-Beispiel bei 286 % Zoom, hell und dunkel. Rahmen an allen
  vier Seiten sichtbar; Klick in den rechten Rahmen wählt Reihe 12 und malt
  keine Zelle.

## 2026-11-22 – 0.6.3-alpha.1 veröffentlicht

**Anlass:** Der feste Hintergrundrahmen soll in der öffentlichen Version
verfügbar sein, die Daniel benutzt.

**Getan:**

- Version 0.6.3-alpha.1 in `package.json`, `src/version.js`, STATUS, README,
  Projektseite, How-tos, AGENTS, D009 und SOP-004 gesetzt.
- Service-Worker-Cache auf `stitchwright-v0.6.3`; der Regressionstest behält
  v0.6.3 und löscht die Caches bis v0.6.2.
- Changelog, Status und Screenshot aktualisiert; 153 Tests und
  `npm run check` grün.
- Commit `af284da`, Push auf `main`, Tag `v0.6.3-alpha.1` und GitHub Release.
- GitHub Pages gebaut; `src/version.js`, `sw.js` und der Badge live geprüft.
  Die gehostete App zeigt bei 286 % Zoom den festen Rahmen an allen vier
  Seiten; nach dem Leeren des alten Caches wurde der neue Stand geladen.

## 2026-11-22 – Scrollbalken mit Überweg über die Musterkante

**Beobachtet:** Daniel hat bei starkem Zoom an die Musterkante gescrollt. Die
erste Masche lag unter dem neuen Rahmen und war abgeschnitten. Der
Scrollbalken endete bisher genau an der Canvas-Kante und kannte den Rahmen
nicht.

**Getan:**

- Neuer Überweg `VIEWPORT_PAN_OVERSCROLL = 40`: Der Scrollbalken reicht an
  beiden Enden 40 px über das Muster hinaus. Bei maximalem Scrollstand steht
  die erste bzw. letzte Masche vollständig mit Hintergrund vor dem Rahmen.
- `scrollbarMetrics` berechnet Bereich und Startposition aus der Innenfläche
  des Rahmens. `currentScroll`/`setScroll` arbeiten mit dieser Startposition,
  nicht mehr mit `-offset`.
- Die Scrollbalken erscheinen weiterhin nur, wenn das Muster größer als die
  Innenfläche ist; beim Einpassen bleiben sie verborgen.
- Test für den Überweg und die Randstände; insgesamt 154 Tests grün.
- Browser: 32 × 20-Beispiel bei 286 % Zoom. Home zeigt die linke Musterkante
  vollständig, End die rechte; dazwischen bleibt der Rahmen sichtbar.

## 2026-11-22 – 0.6.4-alpha.1 veröffentlicht

**Anlass:** Der Scrollbalken-Überweg soll in der öffentlichen Version
verfügbar sein, damit die erste und letzte Masche bei starkem Zoom nicht mehr
abgeschnitten werden.

**Getan:**

- Version 0.6.4-alpha.1 in `package.json`, `src/version.js`, STATUS, README,
  Projektseite, How-tos, AGENTS, D009 und SOP-004 gesetzt.
- Service-Worker-Cache auf `stitchwright-v0.6.4`; der Regressionstest behält
  v0.6.4 und löscht die Caches bis v0.6.3.
- Changelog und Status aktualisiert; 154 Tests und `npm run check` grün.
- Commit `cb2adde`, Push auf `main`, Tag `v0.6.4-alpha.1` und GitHub Release.
- GitHub Pages gebaut; live geprüft: Home zeigt die linke Musterkante samt
  äußerer Masche mit 40 px Hintergrund vor dem Rahmen, End die rechte Kante
  samt Masche 1.

## 2026-11-22 – Runden als Chart-Eigenschaft

**Beobachtet:** Stitchwright war auf Hin- und Rückreihen ausgelegt. Für Mützen,
Socken, Yokes und andere Arbeiten in Runden fehlte die Bedeutung „jede Reihe
ist eine Runde auf der rechten Seite“. Eine reine Anzeige-Umschaltung hätte
nicht in der Datei gestanden und wäre beim Export oder Teilen verloren gegangen.

**Getan:**

- Neues optionales Chart-Feld `options.construction` mit `"flat"` (Default)
  und `"round"` (D013). Rundcharts zeigen alle Runden, nummerieren 1 … n und
  dürfen kein `rowsMode: "rs"` tragen; der Validator meldet
  `E_ROUND_ROWS_MODE`. Alte Dateien bleiben flach, ältere Leser ignorieren das
  Feld und rendern wegen `rowsMode: "all"` trotzdem alle Runden.
- Oberfläche: „Strickweise“ im Dialog für neue Charts und in den
  Chart-Einstellungen. Im Rundmodus verschwindet der Rückreihen-Umschalter;
  Status, Tabelle, Inspector sowie Hinzufügen/Löschen sprechen von Runden.
- CLI: `new --round`; Schema, Format-Doku, README, How-tos, Projektseite und
  SOPs aktualisiert.
- ADR D013 angelegt; D001 und D004 verweisen darauf.
- 165 Node-Tests grün. Browser: 12 × 6-Rundchart angelegt, gezeichnet,
  Tabelle und Status geprüft, auf flach zurückgeschaltet, Deutsch und Englisch,
  hell und dunkel; Autosave und Reload behalten `construction: "round"` und
  `rowsMode: "all"`. Keine Konsolenfehler.

## 2026-11-22 – 0.6.5-alpha.1 veröffentlicht

**Anlass:** Runden als Chart-Eigenschaft sollen öffentlich verfügbar sein.
Außerdem war der GitHub-Actions-Check dauerhaft rot, weil der Workflow eine
npm-Lockfile erwartete, die das Projekt bewusst nicht hat.

**Getan:**

- Version 0.6.5-alpha.1 in `package.json`, `src/version.js`, STATUS, README,
  Projektseite, How-tos, AGENTS, D009 und SOP-004 gesetzt.
- Service-Worker-Cache auf `stitchwright-v0.6.5`; der Regressionstest behält
  v0.6.5 und löscht die Caches bis v0.6.4.
- Changelog, Status, Screenshot und Projektseiten aktualisiert; 165 Tests und
  `npm run check` grün.
- Check-Workflow ohne `cache: npm`; das Projekt hat bewusst keine Lockfile.
- Commit `9282eef`, Push auf `main`, Check-Run `45058402695` grün, Pages-Run
  `45058402447` grün.
- Live geprüft: <https://stecker1312.github.io/stitchwright/> zeigt Version
  0.6.5-alpha.1 und die Construction-Auswahl; Cache `stitchwright-v0.6.5`,
  keine Konsolenfehler. Offline-Neuladen aus dem Cache funktioniert.
- Tag `v0.6.5-alpha.1` und GitHub Release.

## 2026-11-22 – Wende wieder in der Palette

**Beobachtet:** Daniel hat eine Anwendung für das Wendezeichen gefunden. Die
Entscheidung aus der Sitzung zu Bereichen und Maschenzahlen, Wende, Abketten
und Anschlagen aus der Palette zu nehmen, war für die Wende zu pauschal:
Verkürzte Reihen an Fersen, Halsausschnitten und formgestrickten Teilen
brauchen eine sichtbare Markierung im Chart.

**Getan:**

- `hidden: true` beim Symbol `shortrow` entfernt. Es steht wieder unter
  **Hilfszeichen** in der Palette, mit Name „Wende“, Legendentext „wenden“ und
  dem konstruktiven U-Turn aus Studie C.
- Abketten und Anschlagen bleiben ausgeblendet; ihre IDs, Glyphen und das
  Rendering für alte Charts sind unverändert.
- Der Symboltest prüft jetzt ausdrücklich, dass die Wende sichtbar ist und
  Abketten/Anschlagen verborgen bleiben.
- `docs/symbols.md`, STATUS und Changelog beschreiben die Ausnahme.
- Version auf 0.6.6-alpha.1 und Service-Worker-Cache auf
  `stitchwright-v0.6.6` gesetzt; 165 Tests und `npm run check` grün.
- Browser: Wende in der Palette, per Tastatur platziert, Status und Legende
  zeigen „Wende/wenden“; danach rückgängig gemacht, das bestehende Chart
  bleibt unverändert. SVG-Ausgabe enthält Glyph und Legendentext.
