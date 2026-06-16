/* ============ selection.js — pointer interaction: select/move/resize/rotate/marquee ============ */
(function (PP) {
  'use strict';
  const S = PP.State;

  let drag = null;     // active drag descriptor
  let pending = null;  // armed insert {kind:'shape'|'text', type}
  let painter = null;  // format-painter clipboard style

  const SNAP = 6; // snapping tolerance in slide units

  /* ---------- armed insert (draw-to-create, PowerPoint style) ---------- */
  PP.armInsert = function (kind, type) {
    pending = { kind: kind, type: type };
    document.getElementById('slide-canvas').style.cursor = 'crosshair';
    PP.status(kind === 'text' ? 'Click and drag to draw a text box' : 'Click and drag to draw the shape');
  };
  function disarm() { pending = null; document.getElementById('slide-canvas').style.cursor = ''; PP.status(''); }

  function startDraw(sp, e) {
    const t = pending.kind === 'text' ? 'text' : pending.type;
    const isLine = (t === 'line' || t === 'arrow');
    const o = PP.makeObject(t, {
      x: sp.x, y: sp.y, w: 1, h: 1,
      fill: pending.kind === 'text' ? 'none' : PP.State.doc.theme.accent,
      stroke: isLine ? '#2F528F' : (pending.kind === 'text' ? 'none' : '#2F528F'),
      strokeWidth: isLine ? 2 : 1, text: ''
    });
    if (pending.kind === 'text') { o.placeholder = 'textbox'; o.valign = 'top'; o.color = '#000000'; o.fontSize = 18; o._touched = true; }
    PP.slide().objects.push(o);
    PP.select(o.id);
    drag = { mode: 'draw', o: o, startX: sp.x, startY: sp.y, kind: pending.kind, moved: false };
    PP.renderObjects(); PP.renderSelection();
  }
  function drawUpdate(sp, e) {
    const o = drag.o;
    let x = Math.min(drag.startX, sp.x), y = Math.min(drag.startY, sp.y);
    let w = Math.abs(sp.x - drag.startX), h = Math.abs(sp.y - drag.startY);
    if (e.shiftKey && o.type !== 'line' && o.type !== 'arrow') { const s = Math.max(w, h); w = h = s; }
    o.x = x; o.y = y; o.w = Math.max(1, w); o.h = Math.max(1, h);
    drag.moved = w > 3 || h > 3;
    PP.renderObjects(); PP.renderSelection();
  }
  function finishDraw(d) {
    const o = d.o, kind = d.kind;
    if (!d.moved) { // simple click → default size centered on click
      if (o.type === 'line' || o.type === 'arrow') { o.w = 200; o.h = 4; }
      else if (kind === 'text') { o.w = 320; o.h = 60; }
      else { o.w = 180; o.h = 130; }
      o.x = d.startX - o.w / 2; o.y = d.startY - o.h / 2;
    }
    disarm();
    PP.commit('Insert');
    if (kind === 'text' || o.type !== 'image') {
      if (kind === 'text') setTimeout(function () { PP.beginTextEdit(o.id); }, 0);
    }
  }

  /* ---------- format painter ---------- */
  const PAINT_PROPS = ['fill', 'stroke', 'strokeWidth', 'opacity', 'fontFamily', 'fontSize', 'color',
    'bold', 'italic', 'underline', 'strike', 'align', 'valign', 'lineHeight', 'bullet', 'effects', 'radius'];
  let painterSticky = false;
  PP.startFormatPainter = function (sticky) {
    const o = PP.selectedObjs()[0];
    if (!o) { PP.status('Select an object first'); return; }
    painter = {};
    PAINT_PROPS.forEach(function (p) { painter[p] = o[p]; });
    painterSticky = !!sticky;
    document.getElementById('slide-canvas').style.cursor = 'copy';
    PP.status('Format Painter' + (sticky ? ' (locked — Esc to stop)' : '') + ': click an object to apply');
  };
  function applyPainter(target) {
    PAINT_PROPS.forEach(function (p) { if (painter[p] !== undefined) target[p] = PP.deepClone(painter[p]); });
    target.html = null; // let object-level styles cascade
    PP.commit('Format Painter');
  }
  function stopPainter() { painter = null; painterSticky = false; document.getElementById('slide-canvas').style.cursor = ''; PP.status(''); }

  PP.cancelArmed = function () {
    let was = !!(pending || painter);
    disarm(); stopPainter();
    return was;
  };
  PP.isArmed = function () { return !!(pending || painter); };

  /* ================= CROP MODE ================= */
  let crop = null;
  PP.beginCrop = function (id) {
    const o = PP.findObj(id);
    if (!o || o.type !== 'image') { PP.status('Select a picture to crop'); return; }
    if (S.editingId) PP.endTextEdit();
    const c = o.crop || { l: 0, t: 0, r: 0, b: 0 };
    const fw = 1 - c.l - c.r, fh = 1 - c.t - c.b;
    const fullW = o.w / fw, fullH = o.h / fh;
    crop = {
      o: o,
      full: { x: o.x - c.l * fullW, y: o.y - c.t * fullH, w: fullW, h: fullH },
      rect: { x: o.x, y: o.y, w: o.w, h: o.h }
    };
    S.cropId = id;
    PP.status('Crop: drag the black handles. Press Enter or click away to apply, Esc to cancel.');
    PP.renderSelection();
  };
  PP.isCropping = function () { return !!crop; };
  PP.endCrop = function (apply) {
    if (!crop) return;
    if (apply !== false) {
      const o = crop.o, f = crop.full, r = crop.rect;
      o.crop = {
        l: (r.x - f.x) / f.w, t: (r.y - f.y) / f.h,
        r: (f.x + f.w - (r.x + r.w)) / f.w, b: (f.y + f.h - (r.y + r.h)) / f.h
      };
      o.x = r.x; o.y = r.y; o.w = r.w; o.h = r.h;
      PP.commit('Crop');
    }
    crop = null; S.cropId = null;
    PP.status(''); PP.render();
  };

  function renderCropUI() {
    const layer = document.getElementById('selection-layer');
    layer.innerHTML = '';
    const inv = 1 / S.zoom;
    const f = crop.full, r = crop.rect;
    // dimmed full image ghost
    const ghost = PP.el('div', { class: 'crop-ghost' });
    ghost.style.cssText = 'position:absolute;left:' + f.x + 'px;top:' + f.y + 'px;width:' + f.w + 'px;height:' + f.h +
      'px;background-image:url(' + crop.o.src + ');background-size:100% 100%;opacity:.45;pointer-events:none';
    layer.appendChild(ghost);
    // bright crop window
    const win = PP.el('div');
    win.style.cssText = 'position:absolute;left:' + r.x + 'px;top:' + r.y + 'px;width:' + r.w + 'px;height:' + r.h +
      'px;overflow:hidden;outline:' + inv + 'px solid #fff;pointer-events:none';
    const inner = PP.el('div');
    inner.style.cssText = 'position:absolute;left:' + (f.x - r.x) + 'px;top:' + (f.y - r.y) + 'px;width:' + f.w + 'px;height:' + f.h +
      'px;background-image:url(' + crop.o.src + ');background-size:100% 100%';
    win.appendChild(inner); layer.appendChild(win);
    // crop handles
    const hs = { nw: [0, 0], n: [.5, 0], ne: [1, 0], e: [1, .5], se: [1, 1], s: [.5, 1], sw: [0, 1], w: [0, .5] };
    Object.keys(hs).forEach(function (h) {
      const p = hs[h];
      const hd = PP.el('div', { class: 'crop-handle', dataset: { ch: h } });
      hd.style.left = (r.x + p[0] * r.w) + 'px'; hd.style.top = (r.y + p[1] * r.h) + 'px';
      hd.style.width = (14 * inv) + 'px'; hd.style.height = (14 * inv) + 'px';
      hd.style.transform = 'translate(-50%,-50%)';
      layer.appendChild(hd);
    });
  }

  function onCropDown(sp, e) {
    const handle = e.target.closest('.crop-handle');
    if (handle) {
      drag = { mode: 'crop-resize', h: handle.dataset.ch, start: Object.assign({}, crop.rect), sx: sp.x, sy: sp.y };
    } else if (sp.x >= crop.rect.x && sp.x <= crop.rect.x + crop.rect.w && sp.y >= crop.rect.y && sp.y <= crop.rect.y + crop.rect.h) {
      drag = { mode: 'crop-move', start: Object.assign({}, crop.rect), sx: sp.x, sy: sp.y };
    } else {
      PP.endCrop(true);
    }
    e.preventDefault();
  }
  function cropResize(sp) {
    const f = crop.full, s = drag.start, h = drag.h;
    let x = s.x, y = s.y, x2 = s.x + s.w, y2 = s.y + s.h;
    if (/w/.test(h)) x = PP.clamp(sp.x, f.x, x2 - 20);
    if (/e/.test(h)) x2 = PP.clamp(sp.x, x + 20, f.x + f.w);
    if (/n/.test(h)) y = PP.clamp(sp.y, f.y, y2 - 20);
    if (/s/.test(h)) y2 = PP.clamp(sp.y, y + 20, f.y + f.h);
    crop.rect = { x: x, y: y, w: x2 - x, h: y2 - y };
    renderCropUI();
  }
  function cropMove(sp) {
    const f = crop.full, s = drag.start;
    let nx = PP.clamp(s.x + (sp.x - drag.sx), f.x, f.x + f.w - s.w);
    let ny = PP.clamp(s.y + (sp.y - drag.sy), f.y, f.y + f.h - s.h);
    crop.rect = { x: nx, y: ny, w: s.w, h: s.h };
    renderCropUI();
  }

  /* ================= EDIT POINTS (Bézier nodes) ================= */
  let epts = null;
  PP.beginEditPoints = function (id) {
    const o = PP.findObj(id);
    if (!o || o.type === 'image' || o.type === 'line' || o.type === 'arrow' || o.type === 'text') {
      PP.status('Edit Points works on shapes'); return;
    }
    const nodes = PP.shapeToNodes(o);
    if (!nodes || nodes.length < 2) { PP.status('Cannot edit points of this shape'); return; }
    o.type = 'freeform';
    o.nodes = nodes;
    o.path = PP.nodesToPath(nodes);
    epts = { o: o, active: -1 };
    S.editPtsId = id;
    document.getElementById('slide-canvas').style.cursor = 'crosshair';
    PP.status('Edit Points: drag to move • Ctrl+click the line to add a point • Ctrl+click a point to delete • arrow keys nudge • right-click for Smooth/Straight/Corner & Open/Close Path • Esc to finish');
    PP.commit('Edit Points');
    PP.renderSelection();
  };
  PP.isEditingPoints = function () { return !!epts; };
  PP.endEditPoints = function () {
    if (!epts) return;
    epts.o.path = PP.nodesToPath(epts.o.nodes, epts.o.closed);
    epts = null; S.editPtsId = null;
    document.getElementById('slide-canvas').style.cursor = '';
    PP.status(''); PP.commit('Edit Points'); PP.render();
  };

  function toSlide(o, up) { return [o.x + up[0] * o.w, o.y + up[1] * o.h]; }
  function toUnit(o, sx, sy) { return [(sx - o.x) / o.w, (sy - o.y) / o.h]; }

  function renderEditPointsUI() {
    const layer = document.getElementById('selection-layer');
    const o = epts.o, inv = 1 / S.zoom, nodes = o.nodes;
    // control handles for the active node (drawn first, beneath anchors)
    if (epts.active >= 0 && nodes[epts.active]) {
      const nd = nodes[epts.active];
      ['hi', 'ho'].forEach(function (hk) {
        if (!nd[hk]) return;
        const ap = toSlide(o, nd.p), hp = toSlide(o, nd[hk]);
        layer.appendChild(lineEl(ap, hp, inv));
        const c = PP.el('div', { class: 'ep-ctrl', dataset: { hk: hk } });
        c.style.left = hp[0] + 'px'; c.style.top = hp[1] + 'px';
        c.style.width = (9 * inv) + 'px'; c.style.height = (9 * inv) + 'px';
        c.style.borderWidth = inv + 'px';
        c.style.transform = 'translate(-50%,-50%)';
        layer.appendChild(c);
      });
    }
    // anchors
    nodes.forEach(function (nd, i) {
      const p = toSlide(o, nd.p);
      const hd = PP.el('div', { class: 'vertex-handle' + (i === epts.active ? ' active' : ''), dataset: { vi: i } });
      hd.style.left = p[0] + 'px'; hd.style.top = p[1] + 'px';
      hd.style.width = (9 * inv) + 'px'; hd.style.height = (9 * inv) + 'px';
      hd.style.transform = 'translate(-50%,-50%)';
      layer.appendChild(hd);
    });
  }
  function lineEl(a, b, inv) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
    const e = PP.el('div', { class: 'ep-line' });
    e.style.left = a[0] + 'px'; e.style.top = a[1] + 'px';
    e.style.width = len + 'px'; e.style.height = inv + 'px';
    e.style.transformOrigin = 'left center';
    e.style.transform = 'rotate(' + ang + 'deg)';
    return e;
  }

  function onEditPointsDown(sp, e) {
    // PowerPoint: Ctrl+click a point deletes it; Ctrl+click the path adds a point
    if (e.ctrlKey || e.metaKey) {
      const a = e.target.closest('.vertex-handle');
      if (a) deletePoint(+a.dataset.vi); else addPoint(sp);
      e.preventDefault(); return true;
    }
    const ctrl = e.target.closest('.ep-ctrl');
    if (ctrl) { drag = { mode: 'ephandle', hk: ctrl.dataset.hk, alt: e.altKey }; e.preventDefault(); return true; }
    const anchor = e.target.closest('.vertex-handle');
    if (anchor) {
      epts.active = +anchor.dataset.vi;
      drag = { mode: 'vertex', vi: epts.active };
      PP.renderSelection();
      e.preventDefault(); return true;
    }
    if (!PP.hitTest(epts.o, sp.x, sp.y)) { PP.endEditPoints(); }
    else { epts.active = -1; PP.renderSelection(); }
    return true;
  }

  function projOnSeg(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
    let t = l2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    const pt = [a[0] + t * dx, a[1] + t * dy];
    return { pt: pt, d: Math.hypot(p[0] - pt[0], p[1] - pt[1]) };
  }
  function addPoint(sp) {
    const o = epts.o, nodes = o.nodes, u = toUnit(o, sp.x, sp.y);
    let ei = 0, edD = Infinity, proj = u;
    for (let i = 0; i < nodes.length; i++) {
      const pr = projOnSeg(u, nodes[i].p, nodes[(i + 1) % nodes.length].p);
      if (pr.d < edD) { edD = pr.d; ei = i; proj = pr.pt; }
    }
    nodes.splice(ei + 1, 0, { p: proj, hi: null, ho: null, type: 'corner' });
    epts.active = ei + 1;
    o.path = PP.nodesToPath(nodes);
    PP.commit('Add Point'); PP.renderObjects(); PP.renderSelection();
  }
  function deletePoint(i) {
    const nodes = epts.o.nodes;
    if (nodes.length <= 2) { PP.status('A shape needs at least 2 points'); return; }
    nodes.splice(i, 1); epts.active = -1;
    epts.o.path = PP.nodesToPath(nodes);
    PP.commit('Delete Point'); PP.renderObjects(); PP.renderSelection();
  }
  function setPointType(i, type) {
    const o = epts.o, nd = o.nodes[i]; if (!nd) return;
    nd.type = type;
    if ((type === 'smooth' || type === 'straight') && !nd.hi && !nd.ho) {
      // auto-generate handles tangent to neighbours (like PowerPoint)
      const n = o.nodes.length;
      const prev = o.nodes[(i - 1 + n) % n].p, next = o.nodes[(i + 1) % n].p;
      let tx = next[0] - prev[0], ty = next[1] - prev[1];
      const m = Math.hypot(tx, ty) || 1; tx /= m; ty /= m;
      const dp = Math.hypot(nd.p[0] - prev[0], nd.p[1] - prev[1]) * 0.33;
      const dn = Math.hypot(nd.p[0] - next[0], nd.p[1] - next[1]) * 0.33;
      nd.hi = [nd.p[0] - tx * dp, nd.p[1] - ty * dp];
      nd.ho = [nd.p[0] + tx * dn, nd.p[1] + ty * dn];
    }
    o.path = PP.nodesToPath(o.nodes);
    PP.commit('Point Type'); PP.renderObjects(); PP.renderSelection();
  }
  function nodeAt(sp) {
    if (!epts) return -1;
    const o = epts.o; let best = -1, bestD = 12 / S.zoom;
    o.nodes.forEach(function (nd, i) {
      const p = toSlide(o, nd.p);
      const d = Math.hypot(p[0] - sp.x, p[1] - sp.y);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  }
  // exposed for the right-click menu
  PP.epAddPoint = function (sp) { if (epts) addPoint(sp); };
  PP.epDeletePoint = function (i) { if (epts) deletePoint(i); };
  PP.epSetType = function (i, t) { if (epts) setPointType(i, t); };
  PP.epNodeAt = function (sp) { return nodeAt(sp); };
  PP.epActive = function () { return epts ? epts.active : -1; };
  PP.epIsClosed = function () { return epts ? (epts.o.closed !== false) : true; };
  PP.epToggleClosed = function () {
    if (!epts) return;
    const o = epts.o;
    o.closed = !(o.closed !== false);
    o.path = PP.nodesToPath(o.nodes, o.closed);
    PP.commit(o.closed ? 'Close Path' : 'Open Path');
    PP.renderObjects(); PP.renderSelection();
  };
  // arrow-key nudging of the selected point
  PP.epNudge = function (dx, dy) {
    if (!epts || epts.active < 0) return;
    const o = epts.o, nd = o.nodes[epts.active];
    const ux = dx / o.w, uy = dy / o.h;
    nd.p = [nd.p[0] + ux, nd.p[1] + uy];
    if (nd.hi) nd.hi = [nd.hi[0] + ux, nd.hi[1] + uy];
    if (nd.ho) nd.ho = [nd.ho[0] + ux, nd.ho[1] + uy];
    o.path = PP.nodesToPath(o.nodes, o.closed);
    PP.commit('Move Point'); PP.renderObjects(); PP.renderSelection();
  };

  function dragVertex(sp) {
    const o = epts.o, nd = o.nodes[drag.vi];
    const u = toUnit(o, sp.x, sp.y);
    const dx = u[0] - nd.p[0], dy = u[1] - nd.p[1];
    nd.p = u;
    if (nd.hi) nd.hi = [nd.hi[0] + dx, nd.hi[1] + dy];
    if (nd.ho) nd.ho = [nd.ho[0] + dx, nd.ho[1] + dy];
    o.path = PP.nodesToPath(o.nodes);
    PP.renderObjects(); PP.renderSelection();
  }
  function dragHandle(sp) {
    const o = epts.o, nd = o.nodes[epts.active];
    if (!nd) return;
    const u = toUnit(o, sp.x, sp.y);
    nd[drag.hk] = u;
    const other = drag.hk === 'hi' ? 'ho' : 'hi';
    // point-type behaviour (Alt while dragging forces an independent corner, like PowerPoint)
    const type = drag.alt ? 'corner' : (nd.type || 'smooth');
    if (type !== 'corner' && nd[other]) {
      const vx = u[0] - nd.p[0], vy = u[1] - nd.p[1], m = Math.hypot(vx, vy);
      if (m > 1e-5) {
        // smooth = symmetric (equal length); straight = collinear but keep opposite length
        const ol = (type === 'smooth') ? m : Math.hypot(nd[other][0] - nd.p[0], nd[other][1] - nd.p[1]);
        nd[other] = [nd.p[0] - vx / m * ol, nd.p[1] - vy / m * ol];
      }
    }
    if (drag.alt) nd.type = 'corner';
    o.path = PP.nodesToPath(o.nodes);
    PP.renderObjects(); PP.renderSelection();
  }

  function onEditPointsDbl(sp) {
    const i = nodeAt(sp);
    if (i >= 0) deletePoint(i); else addPoint(sp);
  }

  PP.cancelModes = function () {
    if (crop) { PP.endCrop(false); return true; }
    if (epts) { PP.endEditPoints(); return true; }
    return false;
  };
  PP.applyCrop = function () { if (crop) PP.endCrop(true); };
  PP.renderCropUI = renderCropUI;
  PP.renderEditPointsUI = renderEditPointsUI;

  function init() {
    const canvas = document.getElementById('slide-canvas');
    canvas.addEventListener('mousedown', onCanvasDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    canvas.addEventListener('dblclick', onDblClick);

    // thumbnail interactions
    const thumbs = document.getElementById('thumbs');
    thumbs.addEventListener('mousedown', onThumbDown);

    // sorter clicks
    document.getElementById('canvas-scroll').addEventListener('click', function (e) {
      if (S.view !== 'sorter') return;
      const card = e.target.closest('.sorter-card');
      if (card) { PP.goToSlide(+card.dataset.idx); }
    });
    document.getElementById('canvas-scroll').addEventListener('dblclick', function (e) {
      if (S.view !== 'sorter') return;
      const card = e.target.closest('.sorter-card');
      if (card) { S.view = 'normal'; PP.goToSlide(+card.dataset.idx); PP.setView('normal'); }
    });
  }

  /* ---------- canvas pointer ---------- */
  function onCanvasDown(e) {
    if (e.button === 2) return; // context menu handled elsewhere
    PP.hideMenus();
    if (PP.isTextPaneOpen && PP.isTextPaneOpen()) PP.closeTextPane();
    const sp = PP.screenToSlide(e.clientX, e.clientY);

    // special modes intercept first
    if (crop) { onCropDown(sp, e); return; }
    if (epts) { if (onEditPointsDown(sp, e)) return; }

    const handle = e.target.closest('.handle');

    // If we're editing text and clicked inside the same object, let text handle it.
    if (S.editingId) {
      const objNode = e.target.closest('.obj');
      if (objNode && objNode.dataset.id === S.editingId) return;
      PP.endTextEdit();
    }
    // Table cell editing: clicks inside the editing table are native; outside ends edit.
    if (S.tableEditId) {
      const tnode = e.target.closest('.obj');
      if (tnode && tnode.dataset.id === S.tableEditId) {
        const td = e.target.closest('td');
        if (td) {
          const rc = { r: +td.dataset.r, c: +td.dataset.c };
          if (e.shiftKey && S.tableCell) {
            S.tableSel = { r1: S.tableCell.r, c1: S.tableCell.c, r2: rc.r, c2: rc.c };
            e.preventDefault();
            PP.highlightTableSel && PP.highlightTableSel();
          } else { S.tableCell = rc; S.tableSel = null; PP.highlightTableSel && PP.highlightTableSel(); }
        }
        return;
      }
      PP.endTableEdit();
    }

    // armed draw-to-insert takes priority
    if (pending) { startDraw(sp, e); e.preventDefault(); return; }
    // format painter: next click applies the copied style (sticky stays armed)
    if (painter) {
      const t = PP.topObjectAt(sp.x, sp.y);
      if (t) { PP.select(t.id); applyPainter(t); }
      if (!painterSticky) stopPainter();
      e.preventDefault(); return;
    }

    if (handle) {
      startTransform(handle, sp, e);
      e.preventDefault();
      return;
    }

    const hit = PP.topObjectAt(sp.x, sp.y);
    if (hit) {
      let ids = hit.groupId ? PP.groupMembers(hit.groupId) : [hit.id];
      if (e.shiftKey) {                       // Shift adds to selection (PowerPoint)
        ids.forEach(function (id) { PP.select(id, true); });
      } else if (!PP.isSelected(hit.id)) {
        PP.select(ids);
      }
      PP.emit('change');
      startMove(sp, e);                       // Ctrl held → drag makes a duplicate
      e.preventDefault();
    } else {
      if (!e.shiftKey) PP.clearSelection();
      startMarquee(sp, e);
    }
  }

  /* ---------- move ---------- */
  function startMove(sp, e) {
    const objs = PP.selectedObjs();
    if (!objs.length) return;
    drag = {
      mode: 'move', startX: sp.x, startY: sp.y,
      orig: objs.map(function (o) { return { o: o, x: o.x, y: o.y }; }),
      moved: false, alt: e.altKey, ctrlDup: (e.ctrlKey || e.metaKey), dupDone: false
    };
  }

  /* ---------- transform (resize/rotate) ---------- */
  function startTransform(handle, sp, e) {
    const id = handle.dataset.id;
    if (id === '__group__') { startGroupResize(handle.dataset.h, sp); return; }
    const o = PP.findObj(id);
    if (!o) return;
    const h = handle.dataset.h;
    if (h === 'rotate') {
      drag = { mode: 'rotate', o: o, start: { rotation: o.rotation }, startAngle: PP.angleTo(o, sp.x, sp.y) };
    } else {
      drag = { mode: 'resize', o: o, handle: h, start: { x: o.x, y: o.y, w: o.w, h: o.h, rotation: o.rotation } };
    }
  }

  /* ---------- group (multi-select) resize ---------- */
  function startGroupResize(h, sp) {
    const objs = PP.selectedObjs();
    let x = Infinity, y = Infinity, r = -Infinity, b = -Infinity;
    objs.forEach(function (o) { x = Math.min(x, o.x); y = Math.min(y, o.y); r = Math.max(r, o.x + o.w); b = Math.max(b, o.y + o.h); });
    drag = {
      mode: 'group-resize', h: h,
      box: { x: x, y: y, w: r - x, h: b - y },
      snap: objs.map(function (o) { return { o: o, x: o.x, y: o.y, w: o.w, h: o.h, fs: o.fontSize }; }),
      moved: false
    };
  }
  function groupResize(sp, e) {
    const bx = drag.box, h = drag.h;
    const hasW = /w/.test(h), hasE = /e/.test(h), hasN = /n/.test(h), hasS = /s/.test(h);
    let left = bx.x, top = bx.y, right = bx.x + bx.w, bottom = bx.y + bx.h;
    if (hasE) right = sp.x; if (hasW) left = sp.x; if (hasS) bottom = sp.y; if (hasN) top = sp.y;
    let nw = Math.max(10, right - left), nh = Math.max(10, bottom - top);
    let sx = nw / bx.w, sy = nh / bx.h;
    if (e.shiftKey) { const s = Math.min(sx, sy); sx = sy = s; }
    // anchor = opposite edge (fixed corner)
    const ax = hasW ? bx.x + bx.w : bx.x;
    const ay = hasN ? bx.y + bx.h : bx.y;
    drag.snap.forEach(function (rec) {
      rec.o.x = ax + (rec.x - ax) * sx;
      rec.o.y = ay + (rec.y - ay) * sy;
      rec.o.w = rec.w * sx;
      rec.o.h = rec.h * sy;
      if (rec.o.type === 'text' || rec.o.text != null) rec.o.fontSize = Math.max(4, rec.fs * (sx + sy) / 2);
    });
    drag.moved = true;
    PP.renderObjects(); PP.renderSelection();
  }

  /* ---------- marquee ---------- */
  function startMarquee(sp, e) {
    drag = { mode: 'marquee', startX: sp.x, startY: sp.y, additive: e.shiftKey, base: S.selection.slice() };
    const m = document.getElementById('marquee');
    m.style.display = 'block';
    placeMarquee(sp.x, sp.y, sp.x, sp.y);
  }

  function placeMarquee(x1, y1, x2, y2) {
    const z = S.zoom;
    const m = document.getElementById('marquee');
    const x = Math.min(x1, x2), y = Math.min(y1, y2), w = Math.abs(x2 - x1), h = Math.abs(y2 - y1);
    m.style.left = (x * z) + 'px'; m.style.top = (y * z) + 'px';
    m.style.width = (w * z) + 'px'; m.style.height = (h * z) + 'px';
    return { x: x, y: y, w: w, h: h };
  }

  /* ---------- move handler ---------- */
  function onMove(e) {
    if (!drag) return;
    const sp = PP.screenToSlide(e.clientX, e.clientY);

    if (drag.mode === 'group-resize') { groupResize(sp, e); return; }
    if (drag.mode === 'crop-resize') { cropResize(sp); return; }
    if (drag.mode === 'crop-move') { cropMove(sp); return; }
    if (drag.mode === 'vertex') { dragVertex(sp); return; }
    if (drag.mode === 'ephandle') { dragHandle(sp); return; }

    if (drag.mode === 'move') {
      let dx = sp.x - drag.startX, dy = sp.y - drag.startY;
      if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; } // constrain
      drag.moved = drag.moved || Math.abs(dx) > 1 || Math.abs(dy) > 1;
      // Ctrl+drag → leave originals in place and move a fresh duplicate
      if (drag.ctrlDup && !drag.dupDone && drag.moved) {
        drag.orig.forEach(function (rec) { rec.o.x = rec.x; rec.o.y = rec.y; });
        const gidMap = {}, clones = [];
        drag.orig.forEach(function (rec) {
          const c = PP.deepClone(rec.o); c.id = PP.uid('obj');
          if (c.groupId) { gidMap[c.groupId] = gidMap[c.groupId] || PP.uid('grp'); c.groupId = gidMap[c.groupId]; }
          PP.slide().objects.push(c);
          clones.push({ o: c, x: rec.x, y: rec.y });
        });
        PP.select(clones.map(function (c) { return c.o.id; }));
        drag.orig = clones; drag.dupDone = true;
      }
      // snap first object to guides
      const snap = computeSnap(drag.orig[0], dx, dy);
      dx += snap.dx; dy += snap.dy;
      drag.orig.forEach(function (rec) { rec.o.x = rec.x + dx; rec.o.y = rec.y + dy; });
      showGuides(snap.guides);
      PP.renderObjects(); PP.renderSelection();
      PP.status('Position ' + Math.round(drag.orig[0].o.x) + ', ' + Math.round(drag.orig[0].o.y));
    } else if (drag.mode === 'draw') {
      drawUpdate(sp, e);
      return;
    } else if (drag.mode === 'resize') {
      const isCorner = drag.handle.length === 2;
      const g = PP.resizeFromHandle(drag.start, drag.handle, sp.x, sp.y,
        { keepRatio: e.shiftKey || (drag.o.type === 'image' && isCorner && !e.altKey), fromCenter: e.ctrlKey });
      Object.assign(drag.o, g);
      drag.moved = true;
      PP.renderObjects(); PP.renderSelection();
      PP.status('Size ' + Math.round(drag.o.w) + ' × ' + Math.round(drag.o.h));
    } else if (drag.mode === 'rotate') {
      let ang = drag.start.rotation + (PP.angleTo(drag.o, sp.x, sp.y) - drag.startAngle);
      if (e.shiftKey) ang = Math.round(ang / 15) * 15;
      drag.o.rotation = Math.round(ang);
      drag.moved = true;
      PP.renderObjects(); PP.renderSelection();
      PP.status('Rotation ' + Math.round(((drag.o.rotation % 360) + 360) % 360) + '°');
    } else if (drag.mode === 'marquee') {
      const r = placeMarquee(drag.startX, drag.startY, sp.x, sp.y);
      const ids = PP.slide().objects.filter(function (o) { return PP.rectIntersects(r, o); })
        .map(function (o) { return o.id; });
      S.selection = drag.additive ? drag.base.concat(ids.filter(function (i) { return drag.base.indexOf(i) < 0; })) : ids;
      PP.renderSelection();
    }
  }

  function onUp(e) {
    clearGuides();
    if (!drag) return;
    const d = drag; drag = null;
    if (d.mode === 'marquee') {
      document.getElementById('marquee').style.display = 'none';
      PP.emit('selection');
      return;
    }
    if (d.mode === 'draw') { finishDraw(d); return; }
    if (d.mode === 'crop-resize' || d.mode === 'crop-move') { PP.status('Crop: Enter/click away to apply, Esc to cancel'); return; }
    if (d.mode === 'vertex' || d.mode === 'ephandle') { epts.o.path = PP.nodesToPath(epts.o.nodes); PP.commit('Edit Points'); return; }
    if (d.moved) {
      PP.commit(d.mode === 'move' ? (d.dupDone ? 'Duplicate' : 'Move') : (d.mode === 'resize' || d.mode === 'group-resize') ? 'Resize' : 'Rotate');
    }
    PP.status('');
  }

  /* ---------- double-click: edit text ---------- */
  function onDblClick(e) {
    const sp = PP.screenToSlide(e.clientX, e.clientY);
    if (epts) { onEditPointsDbl(sp); return; }
    if (crop) { PP.endCrop(true); return; }
    const hit = PP.topObjectAt(sp.x, sp.y);
    if (!hit) return;
    if (hit.type === 'table') {
      PP.select(hit.id);
      const td = e.target.closest('td');
      PP.beginTableEdit(hit.id, td ? +td.dataset.r : 0, td ? +td.dataset.c : 0);
      return;
    }
    if (hit.type === 'chart') { PP.select(hit.id); PP.openChartData(hit.id); return; }
    if (hit.type === 'smartart') { PP.select(hit.id); PP.openTextPane(hit.id); return; }
    if (hit.type === 'text' || (hit.type !== 'image' && hit.type !== 'line' && hit.type !== 'arrow' && hit.type !== 'chart' && hit.type !== 'smartart')) {
      PP.select(hit.id);
      PP.beginTextEdit(hit.id);
    }
  }

  /* ---------- snapping guides ---------- */
  function computeSnap(rec, dx, dy) {
    const o = rec.o;
    const others = PP.slide().objects.filter(function (x) { return !PP.isSelected(x.id); });
    const moving = { x: rec.x + dx, y: rec.y + dy, w: o.w, h: o.h };
    const guides = [];
    let snapDx = 0, snapDy = 0;
    const mx = [moving.x, moving.x + moving.w / 2, moving.x + moving.w];
    const my = [moving.y, moving.y + moving.h / 2, moving.y + moving.h];
    // slide center + edges as targets
    const targetsX = [0, PP.SLIDE_W / 2, PP.SLIDE_W];
    const targetsY = [0, PP.SLIDE_H / 2, PP.SLIDE_H];
    others.forEach(function (x) { targetsX.push(x.x, x.x + x.w / 2, x.x + x.w); targetsY.push(x.y, x.y + x.h / 2, x.y + x.h); });

    let bestX = SNAP, bestY = SNAP;
    mx.forEach(function (v) { targetsX.forEach(function (t) { const dd = t - v; if (Math.abs(dd) < bestX) { bestX = Math.abs(dd); snapDx = dd; guides.push({ axis: 'x', pos: t }); } }); });
    my.forEach(function (v) { targetsY.forEach(function (t) { const dd = t - v; if (Math.abs(dd) < bestY) { bestY = Math.abs(dd); snapDy = dd; guides.push({ axis: 'y', pos: t }); } }); });
    return { dx: snapDx, dy: snapDy, guides: guides.filter(function (g) { return (g.axis === 'x' && Math.abs((g.pos) - (moving.x + snapDx)) < 2) || true; }) };
  }

  let guideEls = [];
  function showGuides(guides) {
    clearGuides();
    const layer = document.getElementById('selection-layer');
    (guides || []).slice(-2).forEach(function (g) {
      const e = PP.el('div', { style: 'position:absolute;background:#e0457b;pointer-events:none;z-index:80' });
      if (g.axis === 'x') { e.style.left = g.pos + 'px'; e.style.top = 0; e.style.width = (1 / S.zoom) + 'px'; e.style.height = PP.SLIDE_H + 'px'; }
      else { e.style.top = g.pos + 'px'; e.style.left = 0; e.style.height = (1 / S.zoom) + 'px'; e.style.width = PP.SLIDE_W + 'px'; }
      layer.appendChild(e); guideEls.push(e);
    });
  }
  function clearGuides() { guideEls.forEach(function (e) { e.remove(); }); guideEls = []; }

  /* ---------- nudging via keyboard ---------- */
  PP.nudge = function (dx, dy) {
    const objs = PP.selectedObjs();
    if (!objs.length) return;
    objs.forEach(function (o) { o.x += dx; o.y += dy; });
    PP.commit('Move');
  };

  /* ---------- thumbnail drag-reorder ---------- */
  let thumbDrag = null;
  function onThumbDown(e) {
    const row = e.target.closest('.thumb-row');
    if (!row) return;
    const idx = +row.dataset.idx;
    PP.goToSlide(idx);
    thumbDrag = { from: idx, startY: e.clientY, moved: false };
    window.addEventListener('mousemove', onThumbMove);
    window.addEventListener('mouseup', onThumbUp);
  }
  function onThumbMove(e) {
    if (!thumbDrag) return;
    if (Math.abs(e.clientY - thumbDrag.startY) > 6) thumbDrag.moved = true;
    if (!thumbDrag.moved) return;
    // show drop indicator
    clearThumbDrop();
    const rows = PP.$$('#thumbs .thumb-row');
    let target = rows.length;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i].getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) { target = i; break; }
    }
    thumbDrag.to = target;
    const bar = PP.el('div', { class: 'thumb-drop' });
    if (target < rows.length) rows[target].parentNode.insertBefore(bar, rows[target]);
    else document.getElementById('thumbs').appendChild(bar);
  }
  function onThumbUp() {
    window.removeEventListener('mousemove', onThumbMove);
    window.removeEventListener('mouseup', onThumbUp);
    clearThumbDrop();
    if (thumbDrag && thumbDrag.moved && thumbDrag.to != null) {
      let to = thumbDrag.to; if (to > thumbDrag.from) to--;
      PP.moveSlide(thumbDrag.from, to);
    }
    thumbDrag = null;
  }
  function clearThumbDrop() { PP.$$('.thumb-drop').forEach(function (e) { e.remove(); }); }

  PP.initSelection = init;
})(window.PP);
