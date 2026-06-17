# PowerPoint (web replica)

A faithful, browser-based clone of Microsoft PowerPoint — ribbon UI, slide editing,
shapes/text/images, presentation mode, transitions & animations, and the real
PowerPoint keyboard shortcuts. **No install, no build step.**

## Run it

- **Easiest:** double-click `Launch PowerPoint.bat` (or just open `index.html` in any
  modern browser). It runs entirely client-side; your work auto-saves to the browser.
- Everything is plain HTML/CSS/JS — nothing to compile.

## What's implemented

**Editing surface**
- Slide canvas (16:9), live thumbnail panel, notes pane, status bar, zoom slider + Fit-to-window,
  **Ctrl+mouse-wheel zoom**.
- Insert **text boxes, shapes** (20+: rectangle, rounded rect, oval, triangles, diamond,
  pentagon/hexagon, stars, arrows, lines, heart, cloud, callout, cross…), and **pictures** —
  **draw-to-create** (pick a shape, then drag a crosshair to draw it, exactly like PowerPoint;
  a single click drops a default size).
- **Move / resize / rotate** with live handles & rotation handle; **Shift** = constrain/aspect,
  **Ctrl** = resize from center; **Ctrl+drag = duplicate**; **Shift+click** to multi-select;
  marquee select; **smart alignment guides** with snapping.
- **Drag-and-drop image files** from the desktop straight onto a slide.
- **Smart guides**: alignment lines **plus equal-spacing markers** that snap an object to be evenly
  spaced between its neighbours (with PowerPoint-style distance ticks).
- **Hyperlinks** (`Ctrl+K`) on any object — link to a web URL or another slide; clickable in the show.
- **Mini formatting toolbar** floats above selected text (bold/italic/underline, size, color, highlight, bullets).
- **Rich, per-character text editing** — select any run and change font, size,
  **bold/italic/underline/strike**, font color, highlight; paragraph alignment (L/C/R/J),
  vertical align, **multi-level bullets/numbering** with **Tab/Shift+Tab** to demote/promote.
  Toolbar reflects the formatting at the caret. **Type-to-edit**: select a shape and just start typing.
- **Format Painter** (copy one object's look onto another; **double-click to lock** for repeated use).
- Shape **fill** & **outline** colors (theme + standard palettes + custom picker), **gradient fills**
  (linear/radial presets) for shapes and slide backgrounds, and an **eyedropper** to pick any on-screen color.
- **Group / ungroup** (`Ctrl+G` / `Ctrl+Shift+G`), **Z-order** (front/back/forward/backward),
  **align & distribute**, rotate/flip.
- **Undo/redo** (full history), **copy/cut/paste/duplicate**, paste images from OS clipboard.

**Charts** (Insert ▸ Chart — with a **Chart Design** contextual tab)
- 5 chart types: **Clustered Column, Bar, Line, Area, Pie** (rendered as crisp SVG with axes,
  gridlines, legend, category labels and pie % labels).
- **Edit Data** — a PowerPoint-style spreadsheet grid: edit categories/series, add/delete rows & columns.
- Switch chart type from the gallery; toggle **Chart Title / Legend / Gridlines**. Double-click a chart to edit its data.

**SmartArt** (Insert ▸ SmartArt — with a **SmartArt Design** contextual tab)
- 5 layouts: **Basic List, Process, Cycle, Hierarchy (org chart), Pyramid** — rendered with
  themed node boxes and connectors/arrows.
- **Type your text here** outline pane (double-click the graphic): each line is a shape;
  **Tab / Shift+Tab** demote/promote for the Hierarchy tree; live preview as you type.
- Switch layout from the gallery and **change colors** from the design tab.

**Find & Replace** (`Ctrl+F` / `Ctrl+H`)
- Searches text boxes **and** table cells across all slides; **Match case**, **Find Next/Previous**
  (jumps to and selects the match), **Replace** / **Replace All** (preserves rich formatting where possible).

**View ▸ Show**
- **Gridlines** and center **Guides** toggles (drawing aids, like PowerPoint).

**Tables** (Insert ▸ Table — with **Table Design** & **Layout** contextual tabs)
- Click/double-click into the table to **edit cells**; **Tab** moves to the next cell (auto-adds a row at the end).
- **Insert/Delete** rows & columns, **Merge / Split cells** (Shift+click to select a range), **6 table styles**,
  **Header Row / Banded Rows / First Column** toggles, per-cell **shading**, and **border** color.

**Multi-select / group resize**
- Select several objects (or a group) and drag the bounding-box handles to **resize proportionally**
  (Shift keeps aspect); text scales with the box, like PowerPoint.

**Shape Format** (contextual tab — appears when a shape is selected)
- **Merge Shapes** — real boolean operations: **Union, Combine, Fragment, Intersect, Subtract**
  (works on any shapes incl. curves; results are smooth editable freeforms).
- **Shape Styles** quick-gallery, **Shape Fill / Outline**, **Shape Effects** (shadow, soft shadow,
  glow, soft edges), **Edit Shape ▸ Change Shape** and **Edit Points** — true **Bézier** point
  editing (a circle is 4 points, a rectangle 4, a pentagon 5, just like PowerPoint). PowerPoint controls:
  **Ctrl+click the line** to add a point, **Ctrl+click a point** to delete it, drag points/handles to
  reshape, **right-click** for **Smooth / Straight / Corner Point** and **Exit Edit Points**
  (Alt while dragging a handle forces an independent corner).
- **WordArt** text fill/outline, **Arrange** (forward/back, align, group, rotate),
  **Rotate / Flip H / Flip V**, and a **Size** group (Height/Width in cm).

**Picture Format** (contextual tab — appears when a picture is selected)
- **Crop** — drag the black crop handles (correct PowerPoint crop math: image scale stays fixed,
  the frame moves); Enter/click-away to apply, Esc to cancel.
- **Adjust** — Corrections (brightness/contrast), Color (grayscale/sepia/saturation/tone),
  Artistic Effects, Transparency, Change Picture, Reset Picture.
- **Picture Styles** gallery (frame, rounded, drop shadow, soft edge…), **Picture Border**,
  **Picture Effects**, plus the **Arrange** and **Size** groups.

**Selection Pane & Header/Footer**
- **Selection Pane** (Arrange ▸ Selection Pane / right-click ▸ Arrange) — lists every object on the slide;
  click to select, **eye toggle** to show/hide, **reorder** (bring forward/back), **double-click to rename**.
- **Header & Footer** (Insert ▸ Header & Footer) — slide **number**, **date**, and **footer** text, with
  "don't show on title slide"; rendered on slides, thumbnails and in the show.

**Slides**
- New / duplicate / delete / **drag-reorder** in the thumbnail panel, **right-click slide menu**,
  **layouts** (Title, Title+Content, Section, Two Content, Title Only, Blank, Caption), **Slide Sorter** view.

**Design / Transitions / Animations**
- 8 **themes**, **format background** color.
- 10 slide **transitions** (Fade, Push, Wipe, Split, Zoom, Morph, Fall Over…) with duration & Apply-to-All.
- 8 entrance **animations** (Appear, Fly In, Float, Wipe, Zoom, Bounce, Spin).

**Slide Show**
- Full-screen presentation (F5 / Shift+F5), click/keys to advance, transitions + animations play,
  on-screen controls, Esc to end.
- **Presenter View** (`Alt+F5` or Slide Show ▸ Presenter View): current slide, **next-slide preview**,
  **speaker notes**, an **elapsed timer** + clock, and slide-number nav — just like PowerPoint.

**Files**
- Auto-save to browser storage, **Save As** (download `.pptx.json`), **Open** a saved file,
  Print, and a **File ▸ backstage** menu.

## Keyboard shortcuts (PowerPoint parity)

| Action | Keys |
|---|---|
| New slide | `Ctrl+M` |
| Save / Open / Print | `Ctrl+S` / `Ctrl+O` / `Ctrl+P` |
| Undo / Redo | `Ctrl+Z` / `Ctrl+Y` (or `Ctrl+Shift+Z`) |
| Cut / Copy / Paste / Duplicate | `Ctrl+X` / `Ctrl+C` / `Ctrl+V` / `Ctrl+D` |
| Select all | `Ctrl+A` |
| Delete object | `Delete` / `Backspace` |
| Bold / Italic / Underline | `Ctrl+B` / `Ctrl+I` / `Ctrl+U` |
| Align L / C / R / Justify | `Ctrl+L` / `Ctrl+E` / `Ctrl+R` / `Ctrl+J` |
| Grow / shrink font | `Ctrl+]` / `Ctrl+[` (or `Ctrl+Shift+>` / `<`) |
| Group / ungroup | `Ctrl+G` / `Ctrl+Shift+G` |
| Find / Replace | `Ctrl+F` / `Ctrl+H` |
| Hyperlink | `Ctrl+K` |
| Duplicate by dragging | `Ctrl`+drag an object |
| Edit text in object | `Enter`, `F2`, or just start typing (Esc to finish) |
| Demote / promote bullet | `Tab` / `Shift+Tab` (while editing) |
| Nudge / fine-nudge | Arrow keys / `Ctrl`+Arrows |
| Constrain move / resize / rotate | hold `Shift` while dragging |
| Cycle objects | `Tab` / `Shift+Tab` |
| Next / previous slide | `PageDown` / `PageUp` (or arrows with nothing selected) |
| First / last slide | `Home` / `End` |
| Start show from beginning / current | `F5` / `Shift+F5` |
| In show: next / previous / end | `Space`·`→`·`Enter` / `←`·`Backspace` / `Esc` |
| Right-click | context menu |

## Architecture

```
index.html            shell (title bar, ribbon, panels, status bar)
css/styles.css        layout + canvas + handles + slideshow
css/ribbon.css        ribbon, popovers, galleries
js/util.js            helpers, event bus, palettes
js/state.js           data model + undo/redo + slide/object ops
js/geometry.js        transform math, hit-testing, snapping
js/render.js          paint slide, objects, selection, thumbnails, zoom
js/objects.js         shape geometry (SVG paths) + insert helpers
js/shapeops.js        Merge Shapes boolean engine (rasterize → contour → freeform)
js/tables.js          table rendering, cell editing & row/col/style operations
js/charts.js          chart objects: SVG rendering (5 types) + data-edit dialog
js/smartart.js        SmartArt diagrams (5 layouts) + outline text-pane editor
js/find.js            Find & Replace + View overlays (gridlines/guides)
js/panels.js          Selection Pane (list/show-hide/reorder/rename objects)
js/selection.js       pointer interaction: select/move/resize/rotate/marquee/reorder
js/text.js            in-place contenteditable text editing
js/clipboard.js       copy/cut/paste/duplicate (+ OS image paste)
js/ribbon.js          ribbon tabs/groups + command dispatcher
js/contextmenu.js     right-click menu, color popovers, dropdowns, align, views, backstage
js/shortcuts.js       global keyboard map
js/slideshow.js       themes, transitions, animations, presentation mode
js/io.js              localStorage + file open/save/export
js/app.js             bootstrap & wiring
```

## Known limitations (vs. real PowerPoint)
- Save format is JSON (`.pptx.json`), not the binary OOXML `.pptx`.
- Picture glow/soft-edges are CSS-filter approximations.
- Embedded video/audio and master-slide/theme editing are not yet implemented; save is JSON, not binary `.pptx`.

These are the natural next steps if you want to keep extending it.
