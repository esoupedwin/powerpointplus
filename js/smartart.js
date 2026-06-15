/* ============ smartart.js — SmartArt diagrams: layouts, rendering, editing ============ */
(function (PP) {
  'use strict';
  const S = PP.State;
  const NS = 'http://www.w3.org/2000/svg';

  PP.SMARTART_LAYOUTS = [
    { id: 'list', name: 'Basic List' },
    { id: 'process', name: 'Basic Process' },
    { id: 'cycle', name: 'Basic Cycle' },
    { id: 'hierarchy', name: 'Hierarchy' },
    { id: 'pyramid', name: 'Basic Pyramid' },
  ];

  PP.selectedSmartArt = function () { const o = PP.selectedObjs()[0]; return (o && o.type === 'smartart') ? o : null; };

  function shade(hex, pct) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const f = pct < 0 ? 0 : 255, t = Math.abs(pct);
    r = Math.round((f - r) * t + r); g = Math.round((f - g) * t + g); b = Math.round((f - b) * t + b);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  PP.insertSmartArt = function (layout) {
    const w = 720, h = 420;
    const o = PP.makeObject('smartart', {
      w: w, h: h, x: (PP.SLIDE_W - w) / 2, y: (PP.SLIDE_H - h) / 2,
      layout: layout || 'list', accent: (S.doc.theme && S.doc.theme.accent) || '#4472C4',
      nodes: [{ text: 'Text', level: 0 }, { text: 'Text', level: 0 }, { text: 'Text', level: 0 }],
      fill: 'none', stroke: 'none'
    });
    const r = PP.addObject(o);
    setTimeout(function () { PP.openTextPane(r.id); }, 0);
    return r;
  };

  /* ---------- rendering ---------- */
  PP.smartartContent = function (o) {
    const wrap = PP.el('div', { style: 'position:absolute;inset:0;overflow:hidden' });
    const layout = LAYOUTS[o.layout] || LAYOUTS.list;
    const model = layout(o);
    // connectors (svg under boxes)
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', '0 0 ' + o.w + ' ' + o.h);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.style.position = 'absolute'; svg.style.inset = '0';
    svg.innerHTML = (model.defs || '') + (model.shapes || '') + (model.conns || '');
    wrap.appendChild(svg);
    // node boxes (html for crisp text)
    (model.boxes || []).forEach(function (b) {
      const d = PP.el('div', { class: 'sa-node' });
      d.style.cssText = 'position:absolute;left:' + b.x + 'px;top:' + b.y + 'px;width:' + b.w + 'px;height:' + b.h +
        'px;background:' + (b.fill || 'transparent') + ';color:' + (b.color || '#fff') +
        ';border-radius:' + (b.r != null ? b.r : 6) + 'px;display:flex;align-items:center;justify-content:center;' +
        'text-align:center;padding:4px 8px;box-sizing:border-box;font-size:' + (b.fs || 16) + 'px;font-weight:600;overflow:hidden;line-height:1.15';
      d.textContent = b.text;
      wrap.appendChild(d);
    });
    return wrap;
  };

  function arrowDefs(color) {
    return '<defs><marker id="sa-ah" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto">' +
      '<path d="M0,0 L6,3 L0,6 Z" fill="' + color + '"/></marker></defs>';
  }

  const LAYOUTS = {
    list: function (o) {
      const W = o.w, H = o.h, items = topItems(o), n = Math.max(1, items.length), p = 16;
      const bh = (H - p * (n + 1)) / n, boxes = [];
      items.forEach(function (it, i) {
        boxes.push({ x: p, y: p + i * (bh + p), w: W - 2 * p, h: bh, text: it.text, fill: o.accent, color: '#fff', fs: 18 });
      });
      return { boxes: boxes };
    },
    process: function (o) {
      const W = o.w, H = o.h, items = topItems(o), n = Math.max(1, items.length), p = 18, gap = 30;
      const bw = (W - 2 * p - (n - 1) * gap) / n, bh = Math.min(H * 0.5, 110), y = (H - bh) / 2;
      const boxes = []; let conns = arrowDefs(shade(o.accent, -0.2));
      items.forEach(function (it, i) {
        const x = p + i * (bw + gap);
        boxes.push({ x: x, y: y, w: bw, h: bh, text: it.text, fill: o.accent, color: '#fff', fs: 16 });
        if (i < n - 1) {
          const ax = x + bw + 4, ay = H / 2;
          conns += '<line x1="' + ax + '" y1="' + ay + '" x2="' + (ax + gap - 8) + '" y2="' + ay + '" stroke="' + shade(o.accent, -0.2) + '" stroke-width="4" marker-end="url(#sa-ah)"/>';
        }
      });
      return { boxes: boxes, conns: conns };
    },
    cycle: function (o) {
      const W = o.w, H = o.h, items = topItems(o), n = Math.max(1, items.length);
      const cx = W / 2, cy = H / 2, ringR = Math.min(W, H) / 2 - 20;
      const nodeR = Math.max(28, Math.min(ringR * 0.42, 70));
      const R = ringR - nodeR;
      const boxes = [], pts = []; let conns = arrowDefs(shade(o.accent, -0.2));
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + i * 2 * Math.PI / n;
        const x = cx + R * Math.cos(a), y = cy + R * Math.sin(a);
        pts.push([x, y]);
        boxes.push({ x: x - nodeR, y: y - nodeR, w: nodeR * 2, h: nodeR * 2, text: items[i].text, fill: o.accent, color: '#fff', r: nodeR, fs: 14 });
      }
      for (let i = 0; i < n && n > 1; i++) {
        const a = pts[i], b = pts[(i + 1) % n];
        const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
        const ux = dx / len, uy = dy / len;
        const x1 = a[0] + ux * (nodeR + 6), y1 = a[1] + uy * (nodeR + 6);
        const x2 = b[0] - ux * (nodeR + 12), y2 = b[1] - uy * (nodeR + 12);
        conns += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + shade(o.accent, -0.2) + '" stroke-width="4" marker-end="url(#sa-ah)"/>';
      }
      return { boxes: boxes, conns: conns };
    },
    pyramid: function (o) {
      const W = o.w, H = o.h, items = topItems(o), n = Math.max(1, items.length), p = 14;
      const bandH = (H - 2 * p) / n, cx = W / 2, maxW = W - 2 * p, minW = maxW * 0.22;
      let shapes = '', boxes = [];
      for (let i = 0; i < n; i++) {
        const topW = minW + (maxW - minW) * (i / n);
        const botW = minW + (maxW - minW) * ((i + 1) / n);
        const y0 = p + i * bandH, y1 = y0 + bandH - 4;
        const fill = shade(o.accent, -0.15 + 0.3 * (i / Math.max(1, n - 1)));
        shapes += '<polygon points="' + (cx - topW / 2) + ',' + y0 + ' ' + (cx + topW / 2) + ',' + y0 + ' ' +
          (cx + botW / 2) + ',' + y1 + ' ' + (cx - botW / 2) + ',' + y1 + '" fill="' + fill + '"/>';
        boxes.push({ x: cx - botW / 2, y: y0, w: botW, h: bandH - 4, text: items[i].text, fill: 'transparent', color: '#fff', fs: 15 });
      }
      return { shapes: shapes, boxes: boxes };
    },
    hierarchy: function (o) {
      const W = o.w, H = o.h, p = 16;
      const roots = buildTree(o.nodes);
      let leaves = 0;
      function place(node) {
        if (!node.children.length) { node._x = leaves++; }
        else { node.children.forEach(place); node._x = (node.children[0]._x + node.children[node.children.length - 1]._x) / 2; }
      }
      let maxDepth = 0;
      function depthOf(node, d) { maxDepth = Math.max(maxDepth, d); node._d = d; node.children.forEach(function (c) { depthOf(c, d + 1); }); }
      roots.forEach(function (r) { place(r); depthOf(r, 0); });
      const totalLeaves = Math.max(1, leaves);
      const colW = (W - 2 * p) / totalLeaves;
      const bw = Math.min(colW - 10, 160), bh = 44, vGap = (H - 2 * p - bh) / Math.max(1, maxDepth) - bh;
      const boxes = []; let conns = '';
      const accent = o.accent;
      function cxOf(node) { return p + node._x * colW + colW / 2; }
      function cyOf(node) { return p + node._d * (bh + Math.max(24, vGap)) + bh / 2; }
      function walk(node) {
        const cx = cxOf(node), cy = cyOf(node);
        boxes.push({ x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh, text: node.text, fill: node._d === 0 ? accent : shade(accent, 0.15 + node._d * 0.08), color: node._d === 0 ? '#fff' : '#1f1f1f', fs: 14 });
        node.children.forEach(function (c) {
          const ccx = cxOf(c), ccy = cyOf(c);
          const midY = (cy + bh / 2 + ccy - bh / 2) / 2;
          conns += '<path d="M' + cx + ',' + (cy + bh / 2) + ' V' + midY + ' H' + ccx + ' V' + (ccy - bh / 2) + '" fill="none" stroke="' + shade(accent, -0.1) + '" stroke-width="2"/>';
          walk(c);
        });
      }
      roots.forEach(walk);
      return { boxes: boxes, conns: conns };
    },
  };

  function topItems(o) { return o.nodes.filter(function (n) { return (n.level || 0) === 0; }); }
  function buildTree(nodes) {
    const root = { children: [], level: -1 };
    const stack = [root];
    nodes.forEach(function (n) {
      const node = { text: n.text, level: n.level || 0, children: [] };
      while (stack.length > 1 && stack[stack.length - 1].level >= node.level) stack.pop();
      stack[stack.length - 1].children.push(node); stack.push(node);
    });
    return root.children;
  }

  /* ---------- operations ---------- */
  PP.smartartSetLayout = function (layout) {
    const o = PP.selectedSmartArt(); if (!o) return;
    o.layout = layout; PP.commit('SmartArt Layout');
  };
  PP.smartartSetColor = function (color) {
    const o = PP.selectedSmartArt(); if (!o) return;
    o.accent = color; PP.commit('SmartArt Color');
  };

  /* ---------- text pane (outline editor) ---------- */
  let pane = null;
  PP.openTextPane = function (id) {
    const o = id ? PP.findObj(id) : PP.selectedSmartArt();
    if (!o || o.type !== 'smartart') return;
    PP.closeTextPane();
    pane = PP.el('div', { class: 'sa-pane' });
    pane.appendChild(PP.el('div', { class: 'sa-pane-title', text: 'Type your text here' }));
    const ta = PP.el('textarea', { class: 'sa-pane-text', spellcheck: 'false' });
    ta.value = o.nodes.map(function (n) { return '  '.repeat(n.level || 0) + n.text; }).join('\n');
    pane.appendChild(ta);
    pane.appendChild(PP.el('div', { class: 'sa-pane-hint', text: 'Enter = new shape • Tab / Shift+Tab = demote / promote (Hierarchy)' }));
    document.body.appendChild(pane);
    positionPane(o);

    function parse() {
      const lines = ta.value.split('\n');
      const nodes = lines.map(function (ln) {
        const m = ln.match(/^[\t ]*/)[0];
        const level = Math.floor(m.replace(/\t/g, '  ').length / 2);
        return { text: ln.trim(), level: level };
      }).filter(function (n, i) { return n.text !== '' || lines.length === 1; });
      o.nodes = nodes.length ? nodes : [{ text: '', level: 0 }];
      PP.renderObjects(); PP.renderSelection();
    }
    ta.addEventListener('input', parse);
    ta.addEventListener('keydown', function (e) {
      e.stopPropagation();
      if (e.key === 'Tab') {
        e.preventDefault();
        const s = ta.selectionStart, val = ta.value;
        const lineStart = val.lastIndexOf('\n', s - 1) + 1;
        if (e.shiftKey) {
          if (val.slice(lineStart, lineStart + 2) === '  ') { ta.value = val.slice(0, lineStart) + val.slice(lineStart + 2); ta.selectionStart = ta.selectionEnd = s - 2; }
        } else { ta.value = val.slice(0, lineStart) + '  ' + val.slice(lineStart); ta.selectionStart = ta.selectionEnd = s + 2; }
        parse();
      } else if (e.key === 'Escape') { PP.closeTextPane(); }
    });
    setTimeout(function () { ta.focus(); }, 0);
  };
  PP.closeTextPane = function () { if (pane) { pane.remove(); pane = null; } };
  PP.isTextPaneOpen = function () { return !!pane; };

  function positionPane(o) {
    if (!pane) return;
    const r = PP.canvasRect(), z = S.zoom;
    const left = r.left + o.x * z;
    pane.style.left = Math.max(8, left - 250) + 'px';
    pane.style.top = (r.top + o.y * z) + 'px';
  }

})(window.PP);
