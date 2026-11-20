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

- `docs/how-to.md` und `docs/how-to.de.md`: fünfminütige Anleitung von
  „Editor öffnen“ über Zeichnen, Zöpfe, Reihen, Speichern, Export und
  Tastatur bis zu häufigen Problemen.
- App-Hilfe, README und Projektseite verlinken die Anleitung; die App wählt
  automatisch die englische oder deutsche Fassung.
- Service Worker speichert beide How-to-Dateien als optionale Offline-Hilfe.

**Geprüft:** `npm run check` grün; Browser: Help-Link zeigt in beiden Sprachen
auf die richtige Datei.
