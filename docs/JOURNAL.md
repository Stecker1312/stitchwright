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
Geräten, eigene Symbol-Packs, Übersetzungen, V-Probe als Abnahme.

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


