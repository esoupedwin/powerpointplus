/* ============ contextmenu.js — right-click menu, popovers, dropdowns, backstage ============ */
(function (PP) {
  'use strict';
  const S = PP.State;

  let openEls = [];
  PP.hideMenus = function () {
    openEls.forEach(function (e) { if (e && e.parentNode) e.remove(); });
    openEls = [];
    const cm = document.getElementById('context-menu'); cm.classList.add('hidden');
  };
  function track(el) { openEls.push(el); document.body.appendChild(el); return el; }

  document.addEventListener('mousedown', function (e) {
    if (e.target.closest('.r-menu') || e.target.closest('.color-pop') || e.target.closest('.symbol-pop') || e.target.closest('#context-menu')) return;
    if (e.target.closest('.color-btn') || e.target.closest('.rbtn')) return;
    PP.hideMenus();
  }, true);

  /* ---------- color popover ---------- */
  PP.openColorPopover = function (anchor, cmd, onPick) {
    PP.hideMenus();
    const pop = PP.el('div', { class: 'color-pop' });
    const addGrid = function (label, colors) {
      pop.appendChild(PP.el('div', { class: 'row-label', text: label }));
      const grid = PP.el('div', { class: 'swatch-grid' });
      colors.forEach(function (c) {
        grid.appendChild(PP.el('div', { class: 'swatch', style: 'background:' + (c === 'none' ? 'repeating-linear-gradient(45deg,#fff,#fff 4px,#f88 4px,#f88 5px)' : c), title: c,
          onclick: function () { onPick(c); PP.hideMenus(); } }));
      });
      pop.appendChild(grid);
    };
    addGrid('Theme Colors', PP.THEME_COLORS);
    addGrid('Standard Colors', PP.STANDARD_COLORS);

    // gradients (for fill / background)
    if (cmd === 'fillColor' || cmd === 'bgColor') {
      pop.appendChild(PP.el('div', { class: 'row-label', text: 'Gradient' }));
      const ggrid = PP.el('div', { class: 'swatch-grid', style: 'grid-template-columns:repeat(6,22px)' });
      gradientPresets(baseColor(cmd)).forEach(function (g) {
        const sw = PP.el('div', { class: 'swatch', title: 'Gradient', style: 'width:22px;height:22px;background:' + PP.gradientCSS(g),
          onclick: function () { onPick(g); PP.hideMenus(); } });
        ggrid.appendChild(sw);
      });
      pop.appendChild(ggrid);
    }

    const more = PP.el('div', { class: 'more' });
    more.appendChild(PP.el('button', { class: 'rbtn small', html: 'No Fill', onclick: function () { onPick('none'); PP.hideMenus(); } }));
    const inp = PP.el('input', { type: 'color', value: '#4472C4', oninput: function () { onPick(this.value); }, title: 'More Colors' });
    more.appendChild(inp);
    more.appendChild(PP.el('button', { class: 'rbtn small', html: '&#128167; Eyedropper', title: 'Pick a color from the screen', onclick: function () { eyedropper(onPick); } }));
    pop.appendChild(more);
    track(pop);
    positionPop(pop, anchor);
  };

  function baseColor(cmd) {
    let c;
    if (cmd === 'bgColor') c = PP.slide().background;
    else { const o = PP.selectedObjs()[0]; c = o && o.fill; }
    return (typeof c === 'string' && c[0] === '#') ? c : '#4472C4';
  }
  function shade(hex, pct) {
    if (typeof hex !== 'string' || hex[0] !== '#') return hex;
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const f = pct < 0 ? 0 : 255, t = Math.abs(pct);
    r = Math.round((f - r) * t + r); g = Math.round((f - g) * t + g); b = Math.round((f - b) * t + b);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  function gradientPresets(base) {
    return [
      { type: 'linear', angle: 90, stops: [{ c: base, p: 0 }, { c: '#FFFFFF', p: 1 }] },
      { type: 'linear', angle: 45, stops: [{ c: shade(base, 0.3), p: 0 }, { c: shade(base, -0.3), p: 1 }] },
      { type: 'linear', angle: 0, stops: [{ c: base, p: 0 }, { c: shade(base, -0.45), p: 1 }] },
      { type: 'radial', stops: [{ c: shade(base, 0.4), p: 0 }, { c: base, p: 1 }] },
      { type: 'linear', angle: 135, stops: [{ c: '#ED7D31', p: 0 }, { c: '#C00000', p: 1 }] },
      { type: 'linear', angle: 90, stops: [{ c: '#70AD47', p: 0 }, { c: '#1F3864', p: 1 }] },
    ];
  }
  function eyedropper(onPick) {
    PP.hideMenus();
    if (window.EyeDropper) {
      try { new window.EyeDropper().open().then(function (r) { onPick(r.sRGBHex); }).catch(function () {}); }
      catch (e) { PP.status('Eyedropper unavailable'); }
    } else PP.status('Eyedropper needs a Chromium-based browser');
  }

  function positionPop(pop, anchor) {
    const r = anchor.getBoundingClientRect();
    pop.style.left = r.left + 'px';
    pop.style.top = (r.bottom + 2) + 'px';
    const pr = pop.getBoundingClientRect();
    if (pr.right > innerWidth) pop.style.left = (innerWidth - pr.width - 6) + 'px';
    if (pr.bottom > innerHeight) pop.style.top = (r.top - pr.height - 2) + 'px';
  }

  /* ---------- generic dropdown menu ---------- */
  function menu(anchor, items) {
    PP.hideMenus();
    const m = PP.el('div', { class: 'r-menu' });
    items.forEach(function (it) {
      if (it === '-') { m.appendChild(PP.el('div', { class: 'ctx-sep' })); return; }
      const mi = PP.el('div', { class: 'mi', onclick: function () { PP.hideMenus(); it.run && it.run(); } },
        [PP.el('span', { class: 'ico', html: it.icon || '' }), PP.el('span', { text: it.label })]);
      m.appendChild(mi);
    });
    track(m); positionPop(m, anchor);
    return m;
  }

  // generic dropdown for ribbon buttons
  PP.openMenu = function (anchor, items) { return menu(anchor, items); };

  PP.openArrangeMenu = function (anchor) {
    menu(anchor, [
      { icon: '&#9783;', label: 'Group', run: function () { PP.groupSelected(); } },
      { icon: '&#9635;', label: 'Ungroup', run: function () { PP.ungroupSelected(); } },
      '-',
      { icon: '&#11014;', label: 'Bring to Front', run: function () { PP.zOrder('front'); } },
      { icon: '&#11015;', label: 'Send to Back', run: function () { PP.zOrder('back'); } },
      { icon: '&#9650;', label: 'Bring Forward', run: function () { PP.zOrder('forward'); } },
      { icon: '&#9660;', label: 'Send Backward', run: function () { PP.zOrder('backward'); } },
      '-',
      { icon: '&#8676;', label: 'Align Left', run: function () { PP.alignObjects('left'); } },
      { icon: '&#8597;', label: 'Align Center', run: function () { PP.alignObjects('center'); } },
      { icon: '&#8677;', label: 'Align Right', run: function () { PP.alignObjects('right'); } },
      { icon: '&#8593;', label: 'Align Top', run: function () { PP.alignObjects('top'); } },
      { icon: '&#8661;', label: 'Align Middle', run: function () { PP.alignObjects('middle'); } },
      { icon: '&#8595;', label: 'Align Bottom', run: function () { PP.alignObjects('bottom'); } },
      '-',
      { icon: '&#8633;', label: 'Distribute Horizontally', run: function () { PP.alignObjects('dist-h'); } },
      { icon: '&#8693;', label: 'Distribute Vertically', run: function () { PP.alignObjects('dist-v'); } },
      '-',
      { icon: '&#8635;', label: 'Rotate 90° Right', run: function () { rotateSel(90); } },
      { icon: '&#8634;', label: 'Rotate 90° Left', run: function () { rotateSel(-90); } },
      '-',
      { icon: '&#9776;', label: 'Selection Pane…', run: function () { PP.toggleSelectionPane(); } },
    ]);
  };
  function rotateSel(d) { PP.selectedObjs().forEach(function (o) { o.rotation = (o.rotation + d) % 360; }); PP.commit('Rotate'); }

  function shapeCellSVG(t) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', '0 0 20 20');
    const pp = PP.shapePath(t, 18, 18);
    let node;
    if (pp.tag === 'line') { node = document.createElementNS(ns, 'line'); node.setAttribute('x1', 2); node.setAttribute('y1', 16); node.setAttribute('x2', 16); node.setAttribute('y2', 2); node.setAttribute('stroke', '#444'); node.setAttribute('stroke-width', 2); if (t === 'arrow') node.setAttribute('marker-end', ''); }
    else { node = document.createElementNS(ns, 'path'); node.setAttribute('d', pp.d); if (pp.fillRule) node.setAttribute('fill-rule', pp.fillRule); node.setAttribute('transform', 'translate(1,1)'); node.setAttribute('fill', '#8aa9d6'); node.setAttribute('stroke', '#3a5a8a'); }
    svg.appendChild(node); return svg;
  }
  PP.openShapesMenu = function (anchor) {
    PP.hideMenus();
    const m = PP.el('div', { class: 'r-menu shapes-menu', style: 'padding:10px;max-height:70vh;overflow:auto' });
    PP.SHAPE_CATEGORIES.forEach(function (cat) {
      m.appendChild(PP.el('div', { class: 'row-label', style: 'font-size:11px;color:#605e5c;margin:6px 0 4px', text: cat.name }));
      const grid = PP.el('div', { class: 'shape-grid' });
      cat.shapes.forEach(function (t) {
        const cell = PP.el('div', { class: 'shape-cell', title: PP.SHAPE_NAMES[t] || t, onclick: function () { PP.cmd('insertShape', t); PP.hideMenus(); } });
        cell.appendChild(shapeCellSVG(t));
        grid.appendChild(cell);
      });
      m.appendChild(grid);
    });
    track(m); positionPop(m, anchor);
  };

  PP.openLayoutMenu = function (anchor) {
    anchor = anchor || document.querySelector('.rbtn.small');
    menu(anchor, PP.LAYOUTS.map(function (l) {
      return { icon: '&#9707;', label: l.name, run: function () { PP.applyLayout(l.id); } };
    }));
  };

  /* ---------- section menu (header right-click or Home ▸ Section) ---------- */
  PP.sectionItems = function (sec) {
    const items = [];
    items.push({ label: 'Add Section', run: function () { PP.addSection(S.current); } });
    if (sec && !sec.isDefault) {
      items.push({ label: 'Rename Section', run: function () { startRenameHeader(sec.start); } });
      items.push({ label: 'Remove Section', run: function () { PP.removeSection(sec.start); } });
    }
    items.push({ label: 'Remove All Sections', run: function () { PP.removeAllSections(); } });
    items.push('-');
    items.push({ label: 'Collapse All', run: function () { PP.setAllSectionsCollapsed(true); } });
    items.push({ label: 'Expand All', run: function () { PP.setAllSectionsCollapsed(false); } });
    return items;
  };
  function startRenameHeader(start) {
    const h = document.querySelector('.section-header[data-start="' + start + '"] .sec-name');
    if (h) { const ev = new MouseEvent('dblclick', { bubbles: true }); h.dispatchEvent(ev); }
  }
  PP.openSectionMenu = function (x, y, sec) { showCtxAt(x, y, PP.sectionItems(sec)); };
  PP.openSectionMenuAnchor = function (anchor) {
    const secs = PP.computeSections() || [];
    const start = PP.sectionStartFor ? PP.sectionStartFor(S.current) : 0;
    const sec = secs.find(function (s) { return s.start === start; });
    menu(anchor, PP.sectionItems(sec).map(function (it) { return it === '-' ? '-' : { label: it.label, run: it.run }; }));
  };
  function showCtxAt(x, y, items) {
    const cm = document.getElementById('context-menu'); cm.innerHTML = '';
    items.forEach(function (it) {
      if (it === '-') { cm.appendChild(PP.el('div', { class: 'ctx-sep' })); return; }
      const row = PP.el('div', { class: 'ctx-item' }, [PP.el('span', { text: it.label })]);
      row.addEventListener('click', function () { cm.classList.add('hidden'); it.run(); });
      cm.appendChild(row);
    });
    cm.classList.remove('hidden');
    cm.style.left = Math.min(x, innerWidth - 220) + 'px';
    cm.style.top = Math.min(y, innerHeight - cm.offsetHeight - 10) + 'px';
  }

  /* ---------- slide (thumbnail) context menu ---------- */
  function showSlideMenu(x, y, idx) {
    PP.goToSlide(idx);
    const cm = document.getElementById('context-menu');
    cm.innerHTML = '';
    const items = [
      { label: 'New Slide', run: function () { PP.addSlide(PP.contentSlide()); }, key: 'Ctrl+M' },
      { label: 'Duplicate Slide', run: function () { PP.duplicateSlide(idx); } },
      '-',
      { label: 'Layout', run: function () { PP.applyLayout('title-content'); } },
      { label: 'Reset Layout', run: function () { PP.applyLayout(PP.slide().layout || 'title-content'); } },
      '-',
      { label: 'Move Slide Up', run: function () { PP.moveSlide(idx, Math.max(0, idx - 1)); } },
      { label: 'Move Slide Down', run: function () { PP.moveSlide(idx, Math.min(S.doc.slides.length - 1, idx + 1)); } },
      '-',
      { label: 'Add Section', run: function () { PP.addSection(idx); } },
      { label: 'Format Background…', run: function () { PP.gotoTab('design'); } },
      { label: 'Delete Slide', run: function () { PP.deleteSlide(idx); }, key: 'Del' },
    ];
    items.forEach(function (it) {
      if (it === '-') { cm.appendChild(PP.el('div', { class: 'ctx-sep' })); return; }
      const row = PP.el('div', { class: 'ctx-item' }, [PP.el('span', { text: it.label })]);
      if (it.key) row.appendChild(PP.el('span', { class: 'ctx-key', text: it.key }));
      row.addEventListener('click', function () { cm.classList.add('hidden'); it.run(); });
      cm.appendChild(row);
    });
    cm.classList.remove('hidden');
    cm.style.left = Math.min(x, innerWidth - 220) + 'px';
    cm.style.top = Math.min(y, innerHeight - cm.offsetHeight - 10) + 'px';
  }

  /* ---------- right-click context menu ---------- */
  function buildContextMenu(onObject) {
    const items = [];
    if (onObject) {
      items.push(mi('Cut', 'cmd', 'cut', 'Ctrl+X'));
      items.push(mi('Copy', 'cmd', 'copy', 'Ctrl+C'));
      items.push(mi('Paste', 'cmd', 'paste', 'Ctrl+V'));
      items.push('-');
      items.push(mi('Duplicate', 'cmd', 'duplicate', 'Ctrl+D'));
      items.push(mi('Delete', 'cmd', 'delete', 'Del'));
      items.push('-');
      items.push(mi('Bring to Front', 'fn', function () { PP.zOrder('front'); }));
      items.push(mi('Send to Back', 'fn', function () { PP.zOrder('back'); }));
      items.push('-');
      if (S.selection.length > 1) items.push(mi('Group', 'fn', function () { PP.groupSelected(); }, 'Ctrl+G'));
      if (PP.selectedObjs().some(function (o) { return o.groupId; })) items.push(mi('Ungroup', 'fn', function () { PP.ungroupSelected(); }, 'Ctrl+Shift+G'));
      const so = PP.selectedObjs()[0];
      if (so && so.type === 'image') {
        items.push(mi('Crop', 'fn', function () { PP.beginCrop(so.id); }));
        items.push(mi('Change Picture…', 'fn', function () { PP.replacePictureFor(so.id); }));
      } else if (so && so.type !== 'text' && so.type !== 'line' && so.type !== 'arrow') {
        items.push(mi('Edit Points', 'fn', function () { PP.beginEditPoints(so.id); }));
      }
      items.push('-');
      items.push(mi('Link…', 'fn', function () { PP.openHyperlink(); }, 'Ctrl+K'));
      items.push(mi('Edit Text', 'fn', function () { PP.beginTextEdit(S.selection[0]); }));
    } else {
      items.push(mi('Paste', 'cmd', 'paste', 'Ctrl+V'));
      items.push('-');
      items.push(mi('New Slide', 'cmd', 'newSlide', 'Ctrl+M'));
      items.push(mi('Select All', 'cmd', 'selectAll', 'Ctrl+A'));
      items.push('-');
      items.push(mi('Format Background…', 'fn', function () { PP.gotoTab('design'); }));
      items.push(mi('Grid and Guides', 'fn', function () {}));
    }
    return items;
  }
  function mi(label, kind, val, key) { return { label: label, kind: kind, val: val, key: key }; }

  function showContextMenu(x, y, onObject) {
    const cm = document.getElementById('context-menu');
    cm.innerHTML = '';
    buildContextMenu(onObject).forEach(function (it) {
      if (it === '-') { cm.appendChild(PP.el('div', { class: 'ctx-sep' })); return; }
      const row = PP.el('div', { class: 'ctx-item' }, [PP.el('span', { text: it.label })]);
      if (it.key) row.appendChild(PP.el('span', { class: 'ctx-key', text: it.key }));
      row.addEventListener('click', function () {
        cm.classList.add('hidden');
        if (it.kind === 'cmd') PP.cmd(it.val); else it.val();
      });
      cm.appendChild(row);
    });
    cm.classList.remove('hidden');
    cm.style.left = Math.min(x, innerWidth - 220) + 'px';
    cm.style.top = Math.min(y, innerHeight - cm.offsetHeight - 10) + 'px';
  }

  function showEditPointsMenu(x, y, sp) {
    const i = PP.epNodeAt(sp);
    const onPoint = i >= 0;
    const cm = document.getElementById('context-menu');
    cm.innerHTML = '';
    const items = [];
    if (onPoint) {
      items.push({ label: 'Delete Point', run: function () { PP.epDeletePoint(i); }, key: 'Ctrl+Click' });
      items.push('-');
      items.push({ label: 'Smooth Point', run: function () { PP.epSetType(i, 'smooth'); } });
      items.push({ label: 'Straight Point', run: function () { PP.epSetType(i, 'straight'); } });
      items.push({ label: 'Corner Point', run: function () { PP.epSetType(i, 'corner'); } });
      items.push('-');
    } else {
      items.push({ label: 'Add Point', run: function () { PP.epAddPoint(sp); }, key: 'Ctrl+Click' });
      items.push('-');
    }
    items.push(PP.epIsClosed()
      ? { label: 'Open Path', run: function () { PP.epToggleClosed(); } }
      : { label: 'Close Path', run: function () { PP.epToggleClosed(); } });
    items.push({ label: 'Exit Edit Points', run: function () { PP.endEditPoints(); } });
    items.forEach(function (it) {
      if (it === '-') { cm.appendChild(PP.el('div', { class: 'ctx-sep' })); return; }
      const row = PP.el('div', { class: 'ctx-item' }, [PP.el('span', { text: it.label })]);
      if (it.key) row.appendChild(PP.el('span', { class: 'ctx-key', text: it.key }));
      row.addEventListener('click', function () { cm.classList.add('hidden'); it.run(); });
      cm.appendChild(row);
    });
    cm.classList.remove('hidden');
    cm.style.left = Math.min(x, innerWidth - 220) + 'px';
    cm.style.top = Math.min(y, innerHeight - cm.offsetHeight - 10) + 'px';
  }

  function initContext() {
    const canvas = document.getElementById('slide-canvas');
    canvas.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      const sp = PP.screenToSlide(e.clientX, e.clientY);
      if (PP.isEditingPoints && PP.isEditingPoints()) { showEditPointsMenu(e.clientX, e.clientY, sp); return; }
      const hit = PP.topObjectAt(sp.x, sp.y);
      if (hit && !PP.isSelected(hit.id)) PP.select(hit.id);
      showContextMenu(e.clientX, e.clientY, !!hit);
    });
    const thumbs = document.getElementById('thumbs');
    thumbs.addEventListener('contextmenu', function (e) {
      const row = e.target.closest('.thumb-row'); if (!row) return;
      e.preventDefault();
      showSlideMenu(e.clientX, e.clientY, +row.dataset.idx);
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#context-menu')) document.getElementById('context-menu').classList.add('hidden');
    });
  }
  PP.initContext = initContext;

  /* ---------- align / distribute ---------- */
  PP.alignObjects = function (how) {
    const objs = PP.selectedObjs();
    if (!objs.length) return;
    const useSlide = objs.length === 1;
    const bounds = useSlide ? { x: 0, y: 0, r: PP.SLIDE_W, b: PP.SLIDE_H }
      : { x: Math.min.apply(null, objs.map(function (o) { return o.x; })),
          y: Math.min.apply(null, objs.map(function (o) { return o.y; })),
          r: Math.max.apply(null, objs.map(function (o) { return o.x + o.w; })),
          b: Math.max.apply(null, objs.map(function (o) { return o.y + o.h; })) };
    objs.forEach(function (o) {
      if (how === 'left') o.x = bounds.x;
      else if (how === 'right') o.x = bounds.r - o.w;
      else if (how === 'center') o.x = (bounds.x + bounds.r) / 2 - o.w / 2;
      else if (how === 'top') o.y = bounds.y;
      else if (how === 'bottom') o.y = bounds.b - o.h;
      else if (how === 'middle') o.y = (bounds.y + bounds.b) / 2 - o.h / 2;
    });
    if (how === 'dist-h' && objs.length > 2) {
      const sorted = objs.slice().sort(function (a, b) { return a.x - b.x; });
      const span = (sorted[sorted.length - 1].x) - sorted[0].x;
      const step = span / (sorted.length - 1);
      sorted.forEach(function (o, i) { o.x = sorted[0].x + step * i; });
    }
    if (how === 'dist-v' && objs.length > 2) {
      const sorted = objs.slice().sort(function (a, b) { return a.y - b.y; });
      const span = (sorted[sorted.length - 1].y) - sorted[0].y;
      const step = span / (sorted.length - 1);
      sorted.forEach(function (o, i) { o.y = sorted[0].y + step * i; });
    }
    PP.commit('Align');
  };

  /* ---------- view switching ---------- */
  PP.setView = function (v) {
    S.view = v;
    const editor = document.getElementById('editor');
    const thumbsPanel = document.getElementById('thumbs-panel');
    if (v === 'sorter') {
      editor.classList.add('sorter-mode');
      thumbsPanel.classList.add('sorter-mode');
    } else {
      editor.classList.remove('sorter-mode');
      thumbsPanel.classList.remove('sorter-mode');
      // restore normal canvas structure
      const scroll = document.getElementById('canvas-scroll');
      if (!document.getElementById('stage')) {
        scroll.innerHTML = '<div id="stage"><div id="slide-canvas"><div id="slide-bg"></div><div id="slide-objects"></div><div id="selection-layer"></div><div id="marquee"></div></div></div>';
        PP.initSelection();
        PP.initContext();
        PP.applyZoom();
      }
    }
    PP.$$('.view-btn').forEach(function (b) { b.classList.toggle('active', b.dataset.view === v); });
    PP.render();
  };

  /* ---------- hyperlink dialog ---------- */
  PP.openHyperlink = function () {
    const o = PP.selectedObjs()[0];
    if (!o) { PP.status('Select an object to link'); return; }
    const cur = o.hyperlink || {};
    const overlay = PP.el('div', { class: 'modal-overlay' });
    const dlg = PP.el('div', { class: 'modal', style: 'min-width:420px' });
    dlg.appendChild(PP.el('div', { class: 'modal-title', text: 'Insert Hyperlink' }));
    const body = PP.el('div', { class: 'modal-body', style: 'display:flex;flex-direction:column;gap:10px' });
    const url = PP.el('input', { type: 'text', placeholder: 'https://example.com', value: cur.url || '', style: 'width:100%' });
    const slide = PP.el('input', { type: 'number', min: '1', max: String(S.doc.slides.length), placeholder: '#', value: cur.slide != null ? (cur.slide + 1) : '', style: 'width:80px' });
    body.appendChild(PP.el('label', { text: 'Address (web URL):' }));
    body.appendChild(url);
    body.appendChild(PP.el('label', { text: 'Or link to slide number:' }));
    body.appendChild(slide);
    dlg.appendChild(body);
    const btns = PP.el('div', { class: 'modal-btns' });
    if (o.hyperlink) btns.appendChild(PP.el('button', { class: 'btn-secondary', text: 'Remove Link', onclick: function () { o.hyperlink = null; PP.commit('Remove Hyperlink'); overlay.remove(); } }));
    btns.appendChild(PP.el('button', { class: 'btn-secondary', text: 'Cancel', onclick: function () { overlay.remove(); } }));
    btns.appendChild(PP.el('button', { class: 'btn-primary', text: 'OK', onclick: function () {
      const sv = slide.value ? Math.max(1, Math.min(S.doc.slides.length, parseInt(slide.value))) - 1 : null;
      if (sv != null) o.hyperlink = { slide: sv };
      else if (url.value.trim()) { let u = url.value.trim(); if (!/^[a-z]+:/i.test(u)) u = 'https://' + u; o.hyperlink = { url: u }; }
      else o.hyperlink = null;
      PP.commit('Hyperlink'); overlay.remove();
    } }));
    dlg.appendChild(btns);
    overlay.appendChild(dlg);
    overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    setTimeout(function () { url.focus(); }, 0);
  };

  /* ---------- Header & Footer dialog ---------- */
  PP.openHeaderFooter = function () {
    const hf = S.doc.hf || (S.doc.hf = { date: false, dateText: '', number: false, footer: false, footerText: '', dontShowTitle: true });
    const overlay = PP.el('div', { class: 'modal-overlay' });
    const dlg = PP.el('div', { class: 'modal', style: 'min-width:420px' });
    dlg.appendChild(PP.el('div', { class: 'modal-title', text: 'Header and Footer' }));
    const body = PP.el('div', { class: 'modal-body', style: 'display:flex;flex-direction:column;gap:12px' });
    const row = function (label, checked, extra) {
      const wrap = PP.el('div', { style: 'display:flex;flex-direction:column;gap:4px' });
      const lbl = PP.el('label', { style: 'display:flex;gap:8px;align-items:center;font-size:13px' });
      const cb = PP.el('input', { type: 'checkbox' }); if (checked) cb.checked = true;
      lbl.appendChild(cb); lbl.appendChild(document.createTextNode(label));
      wrap.appendChild(lbl); if (extra) wrap.appendChild(extra);
      wrap._cb = cb; return wrap;
    };
    const dateText = PP.el('input', { type: 'text', placeholder: 'Fixed date (blank = today)', value: hf.dateText || '', style: 'margin-left:24px;width:60%' });
    const dateRow = row('Date and time', hf.date, dateText);
    const numRow = row('Slide number', hf.number);
    const footText = PP.el('input', { type: 'text', placeholder: 'Footer text', value: hf.footerText || '', style: 'margin-left:24px;width:70%' });
    const footRow = row('Footer', hf.footer, footText);
    const titleRow = row("Don't show on title slide", hf.dontShowTitle);
    [dateRow, numRow, footRow, titleRow].forEach(function (r) { body.appendChild(r); });
    dlg.appendChild(body);
    const btns = PP.el('div', { class: 'modal-btns' });
    btns.appendChild(PP.el('button', { class: 'btn-secondary', text: 'Cancel', onclick: function () { overlay.remove(); } }));
    btns.appendChild(PP.el('button', { class: 'btn-primary', text: 'Apply to All', onclick: function () {
      hf.date = dateRow._cb.checked; hf.dateText = dateText.value.trim();
      hf.number = numRow._cb.checked; hf.footer = footRow._cb.checked; hf.footerText = footText.value.trim();
      hf.dontShowTitle = titleRow._cb.checked;
      PP.commit('Header & Footer'); overlay.remove();
    } }));
    dlg.appendChild(btns);
    overlay.appendChild(dlg);
    overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  };

  /* ---------- Insert ▸ Symbol ---------- */
  const SYMBOLS = {
    Math: '+ − × ÷ = ≠ ≈ ≡ ≤ ≥ ± ∓ ∞ ∝ ∑ ∏ ∫ ∮ √ ∛ ∂ ∇ ∆ ∈ ∉ ∋ ⊂ ⊃ ⊆ ⊇ ∪ ∩ ∅ ∀ ∃ ∄ ∴ ∵ ∠ ⊥ ∥ ° ′ ″ · ⋅ ¬ ∧ ∨ ⊕ ⊗ ℝ ℕ ℤ ℚ ℂ'.split(' '),
    Greek: 'α β γ δ ε ζ η θ ι κ λ μ ν ξ ο π ρ σ τ υ φ χ ψ ω Γ Δ Θ Λ Ξ Π Σ Φ Ψ Ω'.split(' '),
    Arrows: '← → ↑ ↓ ↔ ↕ ⇐ ⇒ ⇑ ⇓ ⇔ ↩ ↪ ↺ ↻ ➜ ➔ ⟶ ⟵ ⤴ ⤵'.split(' '),
    Currency: '$ € £ ¥ ¢ ₹ ₩ ₽ ₿ ¤ ฿ ₫ ₪'.split(' '),
    Punctuation: '… — – • ◦ ‣ ¶ § † ‡ « » “ ” ‘ ’ ‰ ′ ″ ※ ⁂'.split(' '),
    Symbols: '™ © ® ℠ ✓ ✔ ✗ ✘ ★ ☆ ♥ ♦ ♣ ♠ ☀ ☁ ☂ ☎ ✉ ✂ ✏ ⚙ ⚠ ☑ ☐ ☒ № ℃ ℉ ½ ¼ ¾ ⅓ ⅔'.split(' '),
  };
  PP.openSymbolPicker = function (anchor) {
    anchor = anchor || document.getElementById('ribbon-body') || document.body;
    PP.hideMenus();
    const pop = PP.el('div', { class: 'symbol-pop' });
    const tabs = PP.el('div', { class: 'sym-tabs' });
    const grid = PP.el('div', { class: 'sym-grid' });
    const cats = Object.keys(SYMBOLS);
    function show(cat) {
      grid.innerHTML = '';
      SYMBOLS[cat].forEach(function (g) {
        const cell = PP.el('button', { class: 'sym-cell', text: g, title: g });
        cell.addEventListener('click', function () { PP.insertSymbolText(g); });
        grid.appendChild(cell);
      });
      PP.$$('.sym-tab', tabs).forEach(function (t) { t.classList.toggle('active', t.textContent === cat); });
    }
    cats.forEach(function (c) {
      const t = PP.el('button', { class: 'sym-tab', text: c, onclick: function () { show(c); } });
      tabs.appendChild(t);
    });
    pop.appendChild(tabs); pop.appendChild(grid);
    pop.addEventListener('mousedown', function (e) { if (e.target.closest('.sym-cell')) e.preventDefault(); }); // keep caret
    track(pop); positionPop(pop, anchor); show(cats[0]);
  };

  /* ---------- Insert ▸ Equation ---------- */
  const EQUATIONS = [
    ['Quadratic Formula', 'x = (−b ± √(b² − 4ac)) / 2a'],
    ['Pythagorean Theorem', 'a² + b² = c²'],
    ['Binomial Theorem', '(x + a)ⁿ = Σₖ₌₀ⁿ C(n,k) xᵏ aⁿ⁻ᵏ'],
    ['Area of Circle', 'A = πr²'],
    ['Sum 1..n', 'Σᵢ₌₁ⁿ i = n(n + 1) / 2'],
    ["Euler's Identity", 'e^(iπ) + 1 = 0'],
    ['Fourier Series', 'f(x) = a₀ + Σₙ₌₁∞ (aₙ cos nx + bₙ sin nx)'],
    ['Limit Definition', "f′(x) = limₕ→₀ (f(x+h) − f(x)) / h"],
  ];
  PP.openEquationMenu = function (anchor) {
    anchor = anchor || document.getElementById('ribbon-body') || document.body;
    const items = EQUATIONS.map(function (e) {
      return { icon: '&#8721;', label: e[0], run: function () { PP.insertSymbolText(e[1], { w: 560, fontSize: 28 }); } };
    });
    items.push('-');
    items.push({ icon: '&#10133;', label: 'Insert New Equation', run: function () {
      const o = PP.insertSymbolText('Type equation here', { w: 420, fontSize: 28 });
    } });
    items.push({ icon: '&#937;', label: 'Math Symbols…', run: function () { PP.openSymbolPicker(anchor); } });
    menu(anchor, items);
  };

  /* ---------- online video dialog ---------- */
  PP.openVideoURLDialog = function () {
    const overlay = PP.el('div', { class: 'modal-overlay' });
    const dlg = PP.el('div', { class: 'modal', style: 'min-width:440px' });
    dlg.appendChild(PP.el('div', { class: 'modal-title', text: 'Insert Video from Website' }));
    const body = PP.el('div', { class: 'modal-body', style: 'display:flex;flex-direction:column;gap:8px' });
    body.appendChild(PP.el('label', { text: 'Paste a YouTube, Vimeo, or direct video URL:' }));
    const url = PP.el('input', { type: 'text', placeholder: 'https://www.youtube.com/watch?v=…', style: 'width:100%' });
    body.appendChild(url);
    dlg.appendChild(body);
    const btns = PP.el('div', { class: 'modal-btns' });
    btns.appendChild(PP.el('button', { class: 'btn-secondary', text: 'Cancel', onclick: function () { overlay.remove(); } }));
    btns.appendChild(PP.el('button', { class: 'btn-primary', text: 'Insert', onclick: function () { const u = url.value.trim(); if (u) PP.insertVideoURL(u); overlay.remove(); } }));
    dlg.appendChild(btns);
    overlay.appendChild(dlg);
    overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    setTimeout(function () { url.focus(); }, 0);
  };

  /* ---------- custom slide size dialog ---------- */
  PP.openSlideSizeDialog = function () {
    const overlay = PP.el('div', { class: 'modal-overlay' });
    const dlg = PP.el('div', { class: 'modal', style: 'min-width:340px' });
    dlg.appendChild(PP.el('div', { class: 'modal-title', text: 'Slide Size' }));
    const body = PP.el('div', { class: 'modal-body', style: 'display:flex;flex-direction:column;gap:10px' });
    const wIn = PP.el('input', { type: 'number', value: PP.SLIDE_W, style: 'width:90px' });
    const hIn = PP.el('input', { type: 'number', value: PP.SLIDE_H, style: 'width:90px' });
    body.appendChild(PP.el('label', { text: 'Width (px):' })); body.appendChild(wIn);
    body.appendChild(PP.el('label', { text: 'Height (px):' })); body.appendChild(hIn);
    const scaleLbl = PP.el('label', { style: 'display:flex;gap:8px;align-items:center;font-size:13px' });
    const scaleCb = PP.el('input', { type: 'checkbox' }); scaleCb.checked = true;
    scaleLbl.appendChild(scaleCb); scaleLbl.appendChild(document.createTextNode('Scale content to fit'));
    body.appendChild(scaleLbl);
    dlg.appendChild(body);
    const btns = PP.el('div', { class: 'modal-btns' });
    btns.appendChild(PP.el('button', { class: 'btn-secondary', text: 'Cancel', onclick: function () { overlay.remove(); } }));
    btns.appendChild(PP.el('button', { class: 'btn-primary', text: 'OK', onclick: function () {
      const w = Math.max(200, parseInt(wIn.value) || 1280), h = Math.max(150, parseInt(hIn.value) || 720);
      PP.setSlideSize(w, h, scaleCb.checked); overlay.remove();
    } }));
    dlg.appendChild(btns);
    overlay.appendChild(dlg);
    overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  };

  /* ---------- backstage (File menu) ---------- */
  PP.openBackstage = function () {
    const bs = PP.el('div', { id: 'backstage' });
    const side = PP.el('div', { class: 'bs-side' });
    side.appendChild(PP.el('div', { class: 'bs-back', html: '&#8592;', onclick: close }));
    [['New', newDoc], ['Open', function () { document.getElementById('file-open').click(); close(); }],
     ['Save', function () { PP.save(); close(); }], ['Save As', function () { PP.exportFile(); close(); }],
     ['Export PDF', function () { PP.startShow(0); close(); }], ['Print', function () { window.print(); close(); }],
     ['Close', close]].forEach(function (it) {
      side.appendChild(PP.el('div', { class: 'bs-item', text: it[0], onclick: it[1] }));
    });
    const main = PP.el('div', { class: 'bs-main' });
    main.appendChild(PP.el('h1', { text: 'New' }));
    const blank = PP.el('div', { class: 'bs-card', onclick: function () { newDoc(); } }, [PP.el('div', { html: '&#10010;', style: 'font-size:30px;color:#b7472a' }), PP.el('div', { text: 'Blank Presentation' })]);
    main.appendChild(blank);
    bs.appendChild(side); bs.appendChild(main);
    document.body.appendChild(bs);
    function close() { bs.remove(); }
    function newDoc() { PP.initState(PP.newDoc()); PP.render(); PP.fitToWindow(); close(); }
  };

})(window.PP);
