/* ============ render.js — paint slide, objects, selection, thumbnails ============ */
(function (PP) {
  'use strict';
  const S = PP.State;

  const elObjects = function () { return document.getElementById('slide-objects'); };
  const elSel = function () { return document.getElementById('selection-layer'); };
  const elBg = function () { return document.getElementById('slide-bg'); };
  const elCanvas = function () { return document.getElementById('slide-canvas'); };

  /* ---------- zoom / sizing ---------- */
  PP.applyZoom = function () {
    const c = elCanvas();
    c.style.width = PP.SLIDE_W + 'px';
    c.style.height = PP.SLIDE_H + 'px';
    c.style.transform = 'scale(' + S.zoom + ')';
    c.style.transformOrigin = 'top left';
    const stage = document.getElementById('stage');
    stage.style.width = (PP.SLIDE_W * S.zoom) + 'px';
    stage.style.height = (PP.SLIDE_H * S.zoom) + 'px';
    stage.style.boxSizing = 'content-box';
    const lbl = document.getElementById('zoom-label');
    if (lbl) lbl.textContent = Math.round(S.zoom * 100) + '%';
    const sl = document.getElementById('zoom-slider');
    if (sl) sl.value = Math.round(S.zoom * 100);
    PP.renderSelection();
  };

  PP.setZoom = function (pct, noFit) {
    S.zoom = PP.clamp(pct, 0.25, 4);
    if (!noFit) S.fitMode = false;
    PP.applyZoom();
  };

  PP.fitToWindow = function () {
    const scroll = document.getElementById('canvas-scroll');
    const pad = 60;
    const zw = (scroll.clientWidth - pad) / PP.SLIDE_W;
    const zh = (scroll.clientHeight - pad) / PP.SLIDE_H;
    S.zoom = PP.clamp(Math.min(zw, zh), 0.1, 4);
    S.fitMode = true;
    PP.applyZoom();
  };

  /* ---------- object content ---------- */
  // Convert plain text (with \n) into block elements so bullets/paragraphs work.
  PP.linesToBlocks = function (text) {
    if (text == null || text === '') return '<div><br></div>';
    return String(text).split('\n').map(function (l) {
      return '<div>' + (l === '' ? '<br>' : escapeHTML(l)) + '</div>';
    }).join('');
  };
  function escapeHTML(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function textHTML(o) {
    const isPlaceholder = o.placeholder && (!o._touched);
    let cls = 'obj-text' + (isPlaceholder ? ' placeholder-hint' : '');
    if (o.bullet === 'disc') cls += ' bulleted';
    else if (o.bullet === 'number') cls += ' numbered';
    const div = PP.el('div', { class: cls });
    const st = div.style;
    st.fontFamily = o.fontFamily;
    st.fontSize = o.fontSize + 'px';
    st.color = o.color;
    st.fontWeight = o.bold ? '700' : '400';
    st.fontStyle = o.italic ? 'italic' : 'normal';
    st.textDecoration = (o.underline ? 'underline ' : '') + (o.strike ? 'line-through' : '');
    st.textAlign = o.align;
    st.lineHeight = o.lineHeight;
    st.display = 'flex';
    st.flexDirection = 'column';
    st.justifyContent = o.valign === 'top' ? 'flex-start' : o.valign === 'bottom' ? 'flex-end' : 'center';
    st.padding = '4px 8px';
    st.boxSizing = 'border-box';
    if (isPlaceholder) {
      div.textContent = o.text;
    } else if (o.html != null && o.html !== '') {
      div.innerHTML = o.html;
    } else {
      div.innerHTML = PP.linesToBlocks(o.text);
    }
    return div;
  }

  // Resolve a fill that may be a solid color string or a gradient object.
  // Injects gradient <defs> into the given svg and returns the paint value.
  let _gradSeq = 0;
  function resolveFill(svg, ns, fill) {
    if (fill === 'none' || fill == null) return 'none';
    if (typeof fill === 'string') return fill;
    // gradient object: { type:'linear'|'radial', angle, stops:[{c,p}] }
    const id = 'g' + (++_gradSeq);
    const grad = document.createElementNS(ns, fill.type === 'radial' ? 'radialGradient' : 'linearGradient');
    grad.setAttribute('id', id);
    if (fill.type !== 'radial') {
      const a = (fill.angle == null ? 90 : fill.angle) * Math.PI / 180;
      const x = Math.cos(a) / 2, y = Math.sin(a) / 2;
      grad.setAttribute('x1', 0.5 - x); grad.setAttribute('y1', 0.5 - y);
      grad.setAttribute('x2', 0.5 + x); grad.setAttribute('y2', 0.5 + y);
    } else { grad.setAttribute('cx', '0.5'); grad.setAttribute('cy', '0.5'); grad.setAttribute('r', '0.6'); }
    (fill.stops || []).forEach(function (s) {
      const st = document.createElementNS(ns, 'stop');
      st.setAttribute('offset', (s.p * 100) + '%'); st.setAttribute('stop-color', s.c);
      grad.appendChild(st);
    });
    let defs = svg.querySelector('defs');
    if (!defs) { defs = document.createElementNS(ns, 'defs'); svg.appendChild(defs); }
    defs.appendChild(grad);
    return 'url(#' + id + ')';
  }
  PP.isGradient = function (f) { return f && typeof f === 'object'; };
  function bgCSS(b) { return PP.isGradient(b) ? PP.gradientCSS(b) : (b || '#fff'); }
  PP.bgCSS = bgCSS;
  PP.gradientCSS = function (g) {
    if (typeof g === 'string') return g;
    const stops = (g.stops || []).map(function (s) { return s.c + ' ' + (s.p * 100) + '%'; }).join(', ');
    if (g.type === 'radial') return 'radial-gradient(circle at 50% 50%, ' + stops + ')';
    return 'linear-gradient(' + ((g.angle == null ? 90 : g.angle) + 90) + 'deg, ' + stops + ')';
  };

  function shapeSVG(o) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.style.position = 'absolute'; svg.style.inset = '0'; svg.style.overflow = 'visible';

    // freeform (merge-shapes result / edited points) — unit-space path stretched to the object box
    if (o.type === 'freeform' && (o.path || o.nodes)) {
      svg.setAttribute('viewBox', '0 0 1 1');
      const node = document.createElementNS(ns, 'path');
      node.setAttribute('d', o.nodes ? PP.nodesToPath(o.nodes, o.closed) : o.path);
      node.setAttribute('fill', resolveFill(svg, ns, o.fill));
      node.setAttribute('fill-rule', o.fillRule || 'nonzero');
      node.setAttribute('stroke', o.stroke === 'none' ? 'none' : o.stroke);
      node.setAttribute('stroke-width', (o.strokeWidth || 0));
      node.setAttribute('vector-effect', 'non-scaling-stroke');
      node.setAttribute('opacity', o.opacity != null ? o.opacity : 1);
      svg.appendChild(node);
      return svg;
    }

    svg.setAttribute('viewBox', '0 0 ' + o.w + ' ' + o.h);
    const path = PP.shapePath(o.type, o.w, o.h);
    let node;
    if (path.tag === 'line') {
      node = document.createElementNS(ns, 'line');
      node.setAttribute('x1', path.x1); node.setAttribute('y1', path.y1);
      node.setAttribute('x2', path.x2); node.setAttribute('y2', path.y2);
      node.setAttribute('stroke', o.stroke === 'none' ? o.fill : o.stroke);
      node.setAttribute('stroke-width', o.strokeWidth || 2);
    } else {
      node = document.createElementNS(ns, 'path');
      node.setAttribute('d', path.d);
      node.setAttribute('fill', resolveFill(svg, ns, o.fill));
      node.setAttribute('stroke', o.stroke === 'none' ? 'none' : o.stroke);
      node.setAttribute('stroke-width', o.strokeWidth || 0);
      node.setAttribute('vector-effect', 'non-scaling-stroke');
    }
    if (path.markerEnd) {
      const defs = document.createElementNS(ns, 'defs');
      defs.innerHTML = '<marker id="ah_' + o.id + '" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="' + (o.stroke === 'none' ? o.fill : o.stroke) + '"/></marker>';
      svg.appendChild(defs);
      node.setAttribute('marker-end', 'url(#ah_' + o.id + ')');
    }
    node.setAttribute('opacity', o.opacity != null ? o.opacity : 1);
    svg.appendChild(node);
    return svg;
  }

  // CSS filter string for shape/picture effects (shadow, glow, soft edges)
  function effectFilter(fx) {
    if (!fx) return '';
    const parts = [];
    if (fx.shadow) parts.push('drop-shadow(' + (fx.shadow.dx || 4) + 'px ' + (fx.shadow.dy || 4) + 'px ' + (fx.shadow.blur || 6) + 'px ' + (fx.shadow.color || 'rgba(0,0,0,.45)') + ')');
    if (fx.glow) parts.push('drop-shadow(0 0 ' + (fx.glow.blur || 10) + 'px ' + (fx.glow.color || '#4472C4') + ') drop-shadow(0 0 ' + (fx.glow.blur || 10) + 'px ' + (fx.glow.color || '#4472C4') + ')');
    if (fx.softEdges) parts.push('blur(' + (fx.softEdges || 3) + 'px)');
    return parts.join(' ');
  }
  PP.effectFilter = effectFilter;

  // CSS filter for picture corrections / color
  function adjustFilter(a) {
    if (!a) return '';
    const p = [];
    if (a.brightness != null && a.brightness !== 1) p.push('brightness(' + a.brightness + ')');
    if (a.contrast != null && a.contrast !== 1) p.push('contrast(' + a.contrast + ')');
    if (a.saturate != null && a.saturate !== 1) p.push('saturate(' + a.saturate + ')');
    if (a.grayscale) p.push('grayscale(' + a.grayscale + ')');
    if (a.sepia) p.push('sepia(' + a.sepia + ')');
    if (a.blur) p.push('blur(' + a.blur + 'px)');
    if (a.hue) p.push('hue-rotate(' + a.hue + 'deg)');
    return p.join(' ');
  }
  PP.adjustFilter = adjustFilter;

  function imageContent(o) {
    const box = PP.el('div', { style: 'position:absolute;inset:0;overflow:hidden' });
    const img = PP.el('img', { src: o.src, style: 'display:block;pointer-events:none;position:absolute' });
    const c = o.crop || { l: 0, t: 0, r: 0, b: 0 };
    const fw = 1 - c.l - c.r, fh = 1 - c.t - c.b;
    if ((c.l || c.t || c.r || c.b) && fw > 0 && fh > 0) {
      img.style.width = (100 / fw) + '%';
      img.style.height = (100 / fh) + '%';
      img.style.left = (-c.l / fw * 100) + '%';
      img.style.top = (-c.t / fh * 100) + '%';
    } else {
      img.style.width = '100%'; img.style.height = '100%'; img.style.objectFit = 'fill';
    }
    const f = adjustFilter(o.adjust);
    if (f) img.style.filter = f;
    img.style.opacity = o.opacity != null ? o.opacity : 1;
    if (o.radius) box.style.borderRadius = o.radius + 'px';
    if (o.border) box.style.boxShadow = 'inset 0 0 0 ' + (o.border.width || 3) + 'px ' + (o.border.color || '#FFFFFF');
    box.appendChild(img);
    return box;
  }

  PP.renderObjectContent = function (o) {
    const wrap = PP.el('div', { class: 'obj-content' });
    if (o.effects) wrap.style.filter = effectFilter(o.effects);
    if (o.flipH || o.flipV) { wrap.style.transform = 'scale(' + (o.flipH ? -1 : 1) + ',' + (o.flipV ? -1 : 1) + ')'; wrap.style.transformOrigin = 'center'; }
    if (o.type === 'text') {
      wrap.appendChild(textHTML(o));
    } else if (o.type === 'image') {
      wrap.appendChild(imageContent(o));
    } else if (o.type === 'table') {
      wrap.appendChild(PP.tableHTML(o));
    } else if (o.type === 'chart') {
      wrap.appendChild(PP.chartSVG(o));
    } else if (o.type === 'smartart') {
      wrap.appendChild(PP.smartartContent(o));
    } else {
      wrap.appendChild(shapeSVG(o));
      // shapes can also hold text
      if (o.text) {
        const t = textHTML(Object.assign({}, o, { fill: 'none' }));
        t.style.position = 'absolute'; t.style.inset = '0';
        wrap.appendChild(t);
      }
    }
    return wrap;
  };

  PP.objNode = function (o) {
    const node = PP.el('div', {
      class: 'obj' + (S.editingId === o.id ? ' editing' : ''),
      dataset: { id: o.id },
      style: 'left:' + o.x + 'px;top:' + o.y + 'px;width:' + o.w + 'px;height:' + o.h +
        'px;transform:rotate(' + o.rotation + 'deg);opacity:' + (o.opacity != null ? o.opacity : 1)
    });
    node.appendChild(PP.renderObjectContent(o));
    return node;
  };

  PP.renderObjects = function () {
    const root = elObjects();
    root.innerHTML = '';
    PP.slide().objects.forEach(function (o) { if (!o.hidden) root.appendChild(PP.objNode(o)); });
    PP.footerNodes(S.current).forEach(function (n) { root.appendChild(n); });
    if (PP.renderCommentMarkers) PP.renderCommentMarkers(root);
    if (S.animBadges && PP.slideAnims) {
      const inv = 1 / S.zoom;
      PP.slideAnims(PP.slide()).forEach(function (a) {
        const o = PP.findObj(a.objId); if (!o || o.hidden) return;
        const num = PP.animNumberFor(PP.slide(), a.objId);
        const badge = PP.el('div', { class: 'anim-badge', text: String(num) });
        badge.style.cssText = 'position:absolute;left:' + (o.x) + 'px;top:' + (o.y) + 'px;' +
          'transform:translate(-100%,-30%);width:' + (18 * inv) + 'px;height:' + (16 * inv) + 'px;' +
          'font-size:' + (11 * inv) + 'px;line-height:' + (16 * inv) + 'px';
        root.appendChild(badge);
      });
    }
  };

  // Header/Footer placeholders (date • footer • slide number) along the bottom
  PP.footerNodes = function (idx) {
    const hf = S.doc.hf; if (!hf) return [];
    const slide = S.doc.slides[idx]; if (!slide) return [];
    if (hf.dontShowTitle && slide.layout === 'title') return [];
    const out = [], pad = 40, third = (PP.SLIDE_W - 2 * pad) / 3;
    const mk = function (x, align, text) {
      return PP.el('div', { class: 'slide-footer', text: text,
        style: 'position:absolute;bottom:16px;left:' + x + 'px;width:' + third + 'px;text-align:' + align +
          ';font-size:14px;color:#595959;pointer-events:none;overflow:hidden;white-space:nowrap' });
    };
    if (hf.date) out.push(mk(pad, 'left', hf.dateText || new Date().toLocaleDateString()));
    if (hf.footer && hf.footerText) out.push(mk(pad + third, 'center', hf.footerText));
    if (hf.number) out.push(mk(pad + 2 * third, 'right', String(idx + 1)));
    return out;
  };

  /* ---------- background ---------- */
  PP.renderBackground = function () {
    const bg = elBg();
    const s = PP.slide();
    if (PP.isGradient(s.background)) bg.style.background = PP.gradientCSS(s.background);
    else if (s.background && s.background.indexOf && s.background.indexOf('gradient') >= 0) bg.style.background = s.background;
    else bg.style.background = s.background || '#FFFFFF';
  };

  /* ---------- selection handles ---------- */
  PP.renderSelection = function () {
    const layer = elSel();
    layer.innerHTML = '';
    if (S.view !== 'normal') return;
    if (S.cropId && PP.renderCropUI) { PP.renderCropUI(); return; }
    if (S.editPtsId && PP.renderEditPointsUI) { PP.renderEditPointsUI(); return; }
    const objs = PP.selectedObjs().filter(function (o) { return !o.hidden; });
    const inv = 1 / S.zoom;            // counter-scale handles to stay screen-constant

    // multi-select: a single group bounding box with resize handles
    if (objs.length > 1) {
      let x = Infinity, y = Infinity, r = -Infinity, b = -Infinity;
      objs.forEach(function (o) { x = Math.min(x, o.x); y = Math.min(y, o.y); r = Math.max(r, o.x + o.w); b = Math.max(b, o.y + o.h); });
      objs.forEach(function (o) {
        const bx = PP.el('div', { class: 'sel-box', dataset: { id: o.id } });
        bx.style.left = o.x + 'px'; bx.style.top = o.y + 'px'; bx.style.width = o.w + 'px'; bx.style.height = o.h + 'px';
        bx.style.transform = 'rotate(' + o.rotation + 'deg)'; bx.style.transformOrigin = 'center';
        bx.style.borderWidth = inv + 'px'; bx.style.opacity = '.5';
        layer.appendChild(bx);
      });
      const gb = PP.el('div', { class: 'group-box' });
      gb.style.left = x + 'px'; gb.style.top = y + 'px'; gb.style.width = (r - x) + 'px'; gb.style.height = (b - y) + 'px';
      gb.style.borderWidth = inv + 'px';
      layer.appendChild(gb);
      const positions = { nw: [0, 0], n: [.5, 0], ne: [1, 0], e: [1, .5], se: [1, 1], s: [.5, 1], sw: [0, 1], w: [0, .5] };
      Object.keys(positions).forEach(function (h) {
        const p = positions[h], hsz = 9 * inv;
        const hd = PP.el('div', { class: 'handle sq', dataset: { h: h, id: '__group__' } });
        hd.style.width = hsz + 'px'; hd.style.height = hsz + 'px'; hd.style.borderWidth = inv + 'px';
        hd.style.left = (x + p[0] * (r - x)) + 'px'; hd.style.top = (y + p[1] * (b - y)) + 'px';
        hd.style.transform = 'translate(-50%,-50%)';
        layer.appendChild(hd);
      });
      return;
    }

    objs.forEach(function (o) {
      if (S.editingId === o.id) return;
      const box = PP.el('div', { class: 'sel-box', dataset: { id: o.id } });
      box.style.left = o.x + 'px'; box.style.top = o.y + 'px';
      box.style.width = o.w + 'px'; box.style.height = o.h + 'px';
      box.style.transform = 'rotate(' + o.rotation + 'deg)';
      box.style.transformOrigin = 'center';
      box.style.borderWidth = (1 * inv) + 'px';
      layer.appendChild(box);

      if (S.selection.length === 1) {
        const hs = o.type === 'line' ? ['w', 'e'] : ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
        const hsz = 9 * inv;
        const positions = {
          nw: [0, 0], n: [.5, 0], ne: [1, 0], e: [1, .5],
          se: [1, 1], s: [.5, 1], sw: [0, 1], w: [0, .5]
        };
        hs.forEach(function (h) {
          const p = positions[h];
          const hd = PP.el('div', { class: 'handle' + (o.type === 'text' ? ' sq' : ''), dataset: { h: h, id: o.id } });
          hd.style.width = hsz + 'px'; hd.style.height = hsz + 'px';
          hd.style.borderWidth = inv + 'px';
          hd.style.left = (o.x + p[0] * o.w) + 'px';
          hd.style.top = (o.y + p[1] * o.h) + 'px';
          hd.style.transform = 'translate(-50%,-50%) rotate(' + o.rotation + 'deg)';
          // rotate around object's center so handles follow rotation
          hd.style.transformOrigin = 'center';
          positionRotated(hd, o, p[0], p[1], inv);
          layer.appendChild(hd);
        });
        // rotate handle
        if (o.type !== 'line') {
          const rot = PP.el('div', { class: 'handle rotate', dataset: { h: 'rotate', id: o.id } });
          const stem = PP.el('div', { class: 'rotate-stem' });
          rotateHandlePos(rot, stem, o, inv);
          layer.appendChild(stem); layer.appendChild(rot);
        }
      }
    });
  };

  function positionRotated(hd, o, fx, fy, inv) {
    const c = PP.objCenter(o);
    const px = o.x + fx * o.w, py = o.y + fy * o.h;
    const r = PP.rotatePoint(px, py, c.x, c.y, o.rotation);
    hd.style.left = r.x + 'px'; hd.style.top = r.y + 'px';
    hd.style.transform = 'translate(-50%,-50%)';
  }

  function rotateHandlePos(rot, stem, o, inv) {
    const c = PP.objCenter(o);
    const topMid = { x: o.x + o.w / 2, y: o.y };
    const r = PP.rotatePoint(topMid.x, topMid.y, c.x, c.y, o.rotation);
    const len = 26 * inv;
    // direction outward (the slide-up vector rotated)
    const dir = PP.rotatePoint(topMid.x, topMid.y - 1, c.x, c.y, o.rotation);
    const vx = dir.x - r.x, vy = dir.y - r.y;
    const handlePt = { x: r.x + vx * len, y: r.y + vy * len };
    rot.style.left = handlePt.x + 'px'; rot.style.top = handlePt.y + 'px';
    rot.style.width = (12 * inv) + 'px'; rot.style.height = (12 * inv) + 'px';
    rot.style.borderWidth = inv + 'px';
    rot.style.transform = 'translate(-50%,-50%)';
    stem.style.left = r.x + 'px'; stem.style.top = r.y + 'px';
    stem.style.height = len + 'px'; stem.style.width = inv + 'px';
    const ang = Math.atan2(vy, vx) * 180 / Math.PI - 90;
    stem.style.transformOrigin = 'top center';
    stem.style.transform = 'translateX(-50%) rotate(' + ang + 'deg)';
  }

  /* ---------- full render ---------- */
  PP.render = function () {
    if (S.view === 'sorter') { PP.renderSorter(); return; }
    PP.renderBackground();
    PP.renderObjects();
    if (PP.renderOverlay) PP.renderOverlay();
    PP.renderSelection();
    PP.renderThumbs();
    PP.updateStatus();
    const notes = document.getElementById('notes-area');
    if (notes && document.activeElement !== notes) notes.value = PP.slide().notes || '';
  };

  PP.updateStatus = function () {
    document.getElementById('status-slide').textContent =
      'Slide ' + (S.current + 1) + ' of ' + S.doc.slides.length;
    document.getElementById('doc-title').textContent = S.doc.title + (S.dirty ? '' : '');
  };

  /* ---------- thumbnails ---------- */
  PP.renderThumbs = function () {
    const root = document.getElementById('thumbs');
    root.innerHTML = '';
    const sections = PP.computeSections();
    const headerAt = {}; const collapsedSet = {};
    if (sections) sections.forEach(function (sec) {
      headerAt[sec.start] = sec;
      if (sec.collapsed) for (let k = sec.start; k < sec.start + sec.count; k++) collapsedSet[k] = true;
    });
    S.doc.slides.forEach(function (slide, i) {
      if (headerAt[i]) root.appendChild(sectionHeader(headerAt[i]));
      if (collapsedSet[i]) return;
      const row = PP.el('div', { class: 'thumb-row', dataset: { idx: i } });
      row.appendChild(PP.el('div', { class: 'thumb-num', text: String(i + 1) }));
      const th = PP.el('div', { class: 'thumb' + (i === S.current ? ' active' : ''), dataset: { idx: i } });
      const render = PP.el('div', { class: 'thumb-render' });
      render.style.width = PP.SLIDE_W + 'px';
      render.style.height = PP.SLIDE_H + 'px';
      render.style.background = bgCSS(slide.background);
      // scale to thumb width (~170px) — set after attach
      slide.objects.forEach(function (o) {
        if (o.hidden) return;
        const n = PP.objNode(o);
        n.style.cursor = 'default'; n.style.pointerEvents = 'none';
        render.appendChild(n);
      });
      PP.footerNodes(i).forEach(function (n) { render.appendChild(n); });
      th.appendChild(render);
      row.appendChild(th);
      root.appendChild(row);
      // scale
      requestAnimationFrame(function () {
        const scale = th.clientWidth / PP.SLIDE_W;
        render.style.transform = 'scale(' + scale + ')';
      });
    });
  };

  function sectionHeader(sec) {
    const h = PP.el('div', { class: 'section-header', dataset: { start: sec.start } });
    const tri = PP.el('span', { class: 'sec-tri', html: sec.collapsed ? '&#9654;' : '&#9660;' });
    tri.addEventListener('click', function (e) { e.stopPropagation(); PP.toggleSectionCollapsed(sec); });
    const name = PP.el('span', { class: 'sec-name', text: sec.name });
    if (!sec.isDefault) name.addEventListener('dblclick', function (e) {
      e.stopPropagation();
      const inp = PP.el('input', { class: 'sec-rename', value: sec.name });
      name.replaceWith(inp); inp.focus(); inp.select();
      function commit() { PP.renameSection(sec.start, inp.value.trim() || sec.name); }
      inp.addEventListener('blur', commit);
      inp.addEventListener('keydown', function (ev) { ev.stopPropagation(); if (ev.key === 'Enter') inp.blur(); if (ev.key === 'Escape') { inp.value = sec.name; inp.blur(); } });
    });
    h.appendChild(tri); h.appendChild(name);
    h.appendChild(PP.el('span', { class: 'sec-count', text: String(sec.count) }));
    h.addEventListener('click', function () { PP.goToSlide(sec.start); });
    h.addEventListener('contextmenu', function (e) { e.preventDefault(); PP.openSectionMenu(e.clientX, e.clientY, sec); });
    return h;
  }

  /* ---------- slide sorter ---------- */
  PP.renderSorter = function () {
    const scroll = document.getElementById('canvas-scroll');
    scroll.innerHTML = '';
    const grid = PP.el('div', { class: 'sorter-grid' });
    S.doc.slides.forEach(function (slide, i) {
      const card = PP.el('div', { class: 'sorter-card' + (i === S.current ? ' active' : ''), dataset: { idx: i } });
      card.appendChild(PP.el('div', { class: 'num', text: String(i + 1) }));
      const render = PP.el('div', { class: 'thumb-render', style: 'width:' + PP.SLIDE_W + 'px;height:' + PP.SLIDE_H + 'px;background:' + bgCSS(slide.background) });
      slide.objects.forEach(function (o) {
        const n = PP.objNode(o); n.style.pointerEvents = 'none'; render.appendChild(n);
      });
      card.appendChild(render);
      grid.appendChild(card);
      requestAnimationFrame(function () { render.style.transform = 'scale(' + (card.clientWidth / PP.SLIDE_W) + ')'; });
    });
    scroll.appendChild(grid);
  };

})(window.PP);
