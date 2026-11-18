# D002 – Statische Web-App, kein Backend

- Datum: 2026-11-18
- Status: Gültig
- Betrifft: Stitchwright

## Zusammenhang

Die App soll auf Windows, macOS und Linux laufen, im Browser und auf Tablets,
und möglichst ohne Installation. Ein Python- oder Node-Server wäre eine
zusätzliche Abhängigkeit, ein Sicherheits- und Wartungsproblem und würde die
Veröffentlichung erschweren. Außerdem sollen Daten das Gerät nicht verlassen.

## Entscheidung

Stitchwright ist eine statische Web-App:

- HTML, CSS, JavaScript ES Modules, keine Laufzeitabhängigkeiten.
- Der Editor zeichnet auf **Canvas**; nur der sichtbare Ausschnitt wird
  gerendert. Das hält große Charts flüssig.
- Der Export erzeugt **SVG** aus demselben Modell und denselben Symboldaten.
- Speicherung in IndexedDB/localStorage und in Dateien, die der Mensch wählt.
- Ein Service Worker macht die App offline nutzbar; ein Manifest macht sie
  installierbar.
- Die Node-CLI teilt den Kern mit der App, damit Agenten prüfen und rendern
  können, ohne einen Browser zu starten.

## Folgen

- Eine Codebasis für alle Plattformen.
- Keine Serverkosten, keine Accounts, keine Netzwerkabhängigkeit.
- Grenzen der Browser-Datei-APIs werden mit Download/Upload-Fallback
  abgefedert.
- Ein späterer Cloud-Sync wäre ein separates Modul und widerspricht D006;
  er bräuchte eine neue Entscheidung.

## Alternativen

- Electron/Tauri: größer, plattformspezifisch, mehr Angriffsfläche.
- Python-Server mit Browser-UI: zusätzliche Installation, Ports, Prozesse.
- Reine Desktop-App: schließt Tablet und einfache Veröffentlichung aus.
