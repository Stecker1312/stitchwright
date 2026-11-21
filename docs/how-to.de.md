# So zeichnest du dein erstes Chart

Formatierte Seite: [how-to.de.html](../how-to.de.html).

Stitchwright ist ein Chart-Editor, kein Anleitungsgenerator. Du zeichnest das
Bild, dem eine Strickerin folgt. Diese Anleitung dauert etwa fünf Minuten.

## 1. Editor öffnen

Öffne <https://stecker1312.github.io/stitchwright/> in einem aktuellen Browser.
Du kannst die App auch über das Browsermenü installieren und nach dem ersten
Laden offline benutzen.

Es gibt kein Konto und keine Cloud. Deine Charts bleiben im Browser oder in
Dateien, die du selbst speicherst.

## 2. Chart anlegen

Wähle **Neu**, gib einen Titel, Breite in Maschen und Höhe in Reihen ein und
klicke **Chart anlegen**.

Oder wähle **Beispiel laden**, um ein fertiges Chart mit Zöpfen, Farben und
Legende zu sehen.

Ein leeres Kästchen bedeutet **re**. Die Symbole tragen die zusätzliche
Information.

## 3. Zeichnen

1. Wähle ein Symbol unter **Symbole**.
2. Klicke oder ziehe auf dem Raster.
3. Mit dem **Radierer** entfernst du eine Masche, mit Rechtsklick und Stift
   geht das auch direkt.
4. Wähle unter **Farben** eine Farbe, wenn du eine Farbfläche möchtest. Farbe
   ist eine eigene Ebene; sie ersetzt kein Symbol.
5. Mit **Rückgängig** machst du einen Fehler rückgängig.

Die Statusleiste zeigt Reihe und Masche unter dem Zeiger.

## 4. Zöpfe und Mehrfachsymbole

Ein Zopf ist ein Symbol über mehrere Maschen, keine Sammlung einzelner
Kästchen.

1. Öffne den Bereich **Zöpfe**.
2. Wähle eine Vorgabe wie **2/2 vorne**.
3. Klicke ins Raster. Die ganze Gruppe wird auf einmal gesetzt.
4. Mit dem **Auswahl**-Werkzeug kannst du die Gruppe später ändern oder
   entfernen.
5. Für andere Breiten wähle **Eigener Zopf**. Die Kombination bleibt unter
   **Eigene Zöpfe** gespeichert – du gibst sie nur einmal ein.

Die Legende nennt die genaue Zopfrichtung.

## 5. Reihen und Spalten

- **+ Reihe** und **+ Spalte** schaffen Platz.
- Zum Löschen zuerst die Reihen- oder Spaltennummer anklicken, dann den
  Papierkorb und bestätigen.
- **Nur Hinreihen** blendet gerade Reihen aus und nummeriert 1, 3, 5 … Die
  versteckten Reihen bleiben gespeichert.

## 6. Rapport und Legende

- Setze **Von Masche** und **Bis Masche**, um einen Rapport zu markieren.
- Die Legende wird automatisch aus Symbolen, Gruppen und Farben erzeugt.
- Du kannst die Legende am Bildschirm ausblenden und für den Export einblenden.

## 7. Speichern und sichern

- **Speichern** legt das Chart in diesem Browser ab.
- **Exportieren → JSON** schreibt eine echte Datei. Das ist deine Sicherung
  und der beste Weg, ein Chart auf ein anderes Gerät zu bringen.
- **Öffnen** lädt ein lokales Chart oder eine JSON-Datei.

Das ist eine frühe Alpha. Sichere wichtige Charts zusätzlich als JSON-Datei.

## 8. Exportieren und drucken

Wähle **Exportieren**:

- **SVG** für scharfen Druck und große Charts.
- **PNG** zum schnellen Teilen.
- **JSON** als bearbeitbare Quelle.

**Drucken** benutzt das SVG und die Papiergröße aus den Chart-Einstellungen.
Der Browser öffnet daraus den Druck- oder PDF-Dialog.

## 9. Bewegen und zoomen

- **+ / −** zoomt hinein und heraus.
- **Einpassen** zeigt das ganze Chart.
- Mit dem **Hand**-Werkzeug verschiebst du die Ansicht. Das Mausrad scrollt,
  Strg + Mausrad zoomt.
- Auf Touch zeichnet ein Finger; zwei Finger zoomen und verschieben.

## 10. Häufige Probleme

**Ich sehe die gerade gesetzte Masche nicht.**
Prüfe Zoom und ausgewähltes Symbol. Leere Kästchen bedeuten re; eine leere
Zelle mit Farbe ist also eine rechte Masche mit Farbe.

**Das Chart sieht leer aus.**
Wähle zuerst ein Symbol oder lade das Beispiel. Eine Farbe allein zeichnet
kein Symbol.

**Reihen fehlen.**
Schalte **Nur Hinreihen** aus, um alle Reihen zu sehen.

**Es fragt nach ungespeicherten Änderungen.**
Wähle **Speichern und weiter**, **Verwerfen** oder **Abbrechen**. Beim
Abbrechen geht nichts verloren.

**Die Datei lässt sich nicht öffnen.**
Es muss Stitchwright-JSON sein. Ändere die Datei nicht von Hand, wenn du das
Format nicht kennst. Das Format steht in [`format.md`](format.md).

**Ich habe einen Fehler gefunden.**
Öffne ein Issue im Repository. Nenne Browser, Betriebssystem, Schritte zum
Nachstellen und wenn möglich die Chart-JSON. Bitte keine persönlichen Daten
oder vertraulichen Projekte anhängen.

## 11. Tastatur

| Taste | Aktion |
|---|---|
| `V` | Auswählen |
| `P` | Zeichnen |
| `E` | Radieren |
| `H` | Verschieben |
| Pfeiltasten | Cursor auf der Zeichenfläche bewegen |
| Leertaste / Enter | Am Cursor zeichnen |
| Entf | Am Cursor radieren |
| Strg/Cmd + Z | Rückgängig |
| Strg/Cmd + Shift + Z | Wiederholen |
| Strg/Cmd + S | Speichern |
| Strg/Cmd + O | Öffnen |
| Strg/Cmd + N | Neu |
| Strg/Cmd + E | Exportieren |
| `+` / `-` | Zoom |
| `0` | Einpassen |
| `?` | Hilfe |

Tastatur-Zeichenbefehle funktionieren nur, wenn die Zeichenfläche den Fokus
hat. Klicke einmal auf die Fläche oder wähle ein Symbol; der Fokus wandert
automatisch dorthin.

## 12. Weitere Hilfe

- In der App: **Hilfe**.
- [Chart-Format](format.md)
- [Symbolsprache](symbols.md)
- [Mitmachen](../CONTRIBUTING.md)
- [Issues](https://github.com/Stecker1312/stitchwright/issues)
