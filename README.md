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
  **Ctrl** = resize from center; multi-select **marquee**; **smart alignment guides** with snapping.
- **Rich, per-character text editing** — select any run and change font, size,
  **bold/italic/underline/strike**, font color, highlight; paragraph alignment (L/C/R/J),
  vertical align, **multi-level bullets/numbering** with **Tab/Shift+Tab** to demote/promote.
  Toolbar reflects the formatting at the caret. **Type-to-edit**: select a shape and just start typing.
- **Format Painter** (copy one object's look onto another).
- Shape **fill** & **outline** colors (theme + standard palettes + custom picker).
- **Group / ungroup** (`Ctrl+G` / `Ctrl+Shift+G`), **Z-order** (front/back/forward/backward),
  **align & distribute**, rotate/flip.
- **Undo/redo** (full history), **copy/cut/paste/duplicate**, paste images from OS clipboard.

**Tables** (Insert ▸ Table — with **Table Design** & **Layout** contextual tabs)
- Click/double-click into the table to **edit cells**; **Tab** moves to the next cell (auto-adds a row at the end).
- **Insert/Delete** rows & columns, **6 table styles**, **Header Row / Banded Rows / First Column** toggles,
  per-cell **shading**, and **border** color. Renders with proper header fill, banding and borders.

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
- Tables don't support merged/split cells yet; picture glow/soft-edges are CSS-filter approximations.
- Charts, SmartArt, embedded video, and master-slide editing are not yet implemented.

These are the natural next steps if you want to keep extending it.
