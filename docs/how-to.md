# How to draw your first chart

Formatted page: [how-to.html](../how-to.html).

Stitchwright is a chart editor, not an instruction generator. You draw the
picture that a knitter follows. This guide takes about five minutes.

## 1. Open the editor

Open <https://stecker1312.github.io/stitchwright/> in a current browser. You
can also install it from your browser's menu and use it offline after the first
load.

There is no account and no cloud. Your charts stay in the browser or in files
you save yourself.

## 2. Start a chart

Choose **New**, enter a title, width in stitches and height in rows, then
**Create chart**.

Or choose **Load example** to see a finished chart with cables, colours and a
legend.

An empty cell means **knit**. The symbols are the extra information.

## 3. Draw

1. Pick a symbol under **Symbols**.
2. Click or drag on the grid.
3. Use the **Eraser** to remove a stitch, or right-click with the pencil.
4. Pick a colour under **Colours** if you want a colour fill. Colour is a
   separate layer; it does not replace the symbol.
5. To repeat an area: choose **Select**, drag a rectangle, press Ctrl+C, click
   the target cell and press Ctrl+V. Colours and groups come along.
6. Use **Undo** if something goes wrong.

The status bar shows the row and stitch under the pointer.

## 4. Cables and multi-stitch symbols

Cables are one symbol across several stitches, not several separate cells.

1. Open the **Cables** section.
2. Choose a preset such as **2/2 front**.
3. Click the grid. The whole group is placed at once.
4. Choose the group with the **Select** tool if you want to change or remove it.
5. For other widths, choose **Custom cable**. The combination is kept under
   **Custom cables**, so you enter it only once.

The legend gives the exact cable direction.

## 5. Rows and columns

- **+ Row** and **+ Column** add space.
- To delete a row or column, click its number first, then the trash button and
  confirm.
- Drag across several row or column numbers, or Shift-click, to select a range;
  the trash button deletes the whole range.
- **Right-side rows only** hides even rows and numbers 1, 3, 5 … The hidden
  rows are still stored.

## 6. Repeat and legend

- Set **From stitch** and **To stitch** to mark a repeat.
- The legend is built automatically from the symbols, groups and colours you
  use.
- You can switch the legend off for the screen and on for export.
- Optional **Stitch counts** put a small number at the first stitch of each run
  of equal stitches.

## 7. Save and back up

- **Save** stores the chart in this browser.
- **Export → JSON** writes a real file. This is your backup and the best way to
  move a chart to another device.
- **Open** loads a local chart or a JSON file.

This is an early alpha. Keep an extra JSON copy of charts you care about.

## 8. Export and print

Choose **Export**:

- **SVG** for sharp printing and large charts.
- **PNG** for quick sharing.
- **JSON** as the editable source.

**Print** uses the SVG and the paper size from the chart settings. The browser
turns it into a print or PDF dialogue.

## 9. Move around

- **+ / −** zooms in and out.
- **Fit** shows the whole chart.
- The **hand** tool pans. The mouse wheel scrolls; Ctrl + wheel zooms.
- On touch, one finger draws and two fingers zoom and pan.

## 10. Common problems

**I cannot see the stitch I just placed.**
Check the zoom level and the selected symbol. Empty cells are knit, so an empty
cell with a colour is still a knit stitch with a colour.

**The chart looks empty.**
Pick a symbol first, or use **Load example**. A colour alone does not draw a
symbol.

**Rows are missing.**
Turn off **Right-side rows only** to show every row.

**It asks about unsaved changes.**
Choose **Save and continue**, **Discard** or **Cancel**. Nothing is lost when
you cancel.

**The file will not open.**
It must be Stitchwright JSON. Do not rename or edit the file by hand unless you
know the format. The format is described in
[`format.md`](format.md).

**I found a bug.**
Open an issue in the repository. Include your browser, operating system, steps
to reproduce and, if possible, the chart JSON. Do not attach personal data or
confidential projects.

## 11. Keyboard

| Key | Action |
|---|---|
| `V` | Select |
| `P` | Pencil |
| `E` | Eraser |
| `H` | Pan |
| Arrow keys | Move the cursor on the canvas |
| Space / Enter | Paint at the cursor |
| Delete | Erase at the cursor |
| Ctrl/Cmd + Z | Undo |
| Ctrl/Cmd + Shift + Z | Redo |
| Ctrl/Cmd + S | Save |
| Ctrl/Cmd + O | Open |
| Ctrl/Cmd + N | New |
| Ctrl/Cmd + E | Export |
| `+` / `-` | Zoom |
| `0` | Fit |
| `?` | Help |

Keyboard drawing commands only work when the chart canvas has focus. Click the
canvas once or choose a symbol; the focus moves there automatically.

## 12. More help

- In the app: **Help**.
- [Chart format](format.md)
- [Symbol set](symbols.md)
- [Contributing](../CONTRIBUTING.md)
- [Issues](https://github.com/Stecker1312/stitchwright/issues)
