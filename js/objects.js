/* ============ objects.js — shape geometry & insertion ============ */
(function (PP) {
  'use strict';

  // Return an SVG path (or line) description for a shape type at size w×h
  PP.shapePath = function (type, w, h) {
    const W = w, H = h;
    switch (type) {
      case 'rect': return { d: rectPath(0, 0, W, H) };
      case 'roundRect': {
        const r = Math.min(W, H) * 0.12;
        return { d: 'M' + r + ',0 H' + (W - r) + ' Q' + W + ',0 ' + W + ',' + r + ' V' + (H - r) +
          ' Q' + W + ',' + H + ' ' + (W - r) + ',' + H + ' H' + r + ' Q0,' + H + ' 0,' + (H - r) +
          ' V' + r + ' Q0,0 ' + r + ',0 Z' };
      }
      case 'ellipse': return { d: ellipsePath(W, H) };
      case 'triangle': return { d: 'M' + (W / 2) + ',0 L' + W + ',' + H + ' L0,' + H + ' Z' };
      case 'rtriangle': return { d: 'M0,0 L0,' + H + ' L' + W + ',' + H + ' Z' };
      case 'diamond': return { d: 'M' + (W / 2) + ',0 L' + W + ',' + (H / 2) + ' L' + (W / 2) + ',' + H + ' L0,' + (H / 2) + ' Z' };
      case 'pentagon': return { d: poly(W, H, 5, -90) };
      case 'hexagon': return { d: poly(W, H, 6, 0) };
      case 'star': return { d: star(W, H, 5) };
      case 'star6': return { d: star(W, H, 6) };
      case 'arrowRight': return { d: 'M0,' + (H * .3) + ' H' + (W * .6) + ' V0 L' + W + ',' + (H / 2) + ' L' + (W * .6) + ',' + H + ' V' + (H * .7) + ' H0 Z' };
      case 'arrowLeft': return { d: 'M' + W + ',' + (H * .3) + ' H' + (W * .4) + ' V0 L0,' + (H / 2) + ' L' + (W * .4) + ',' + H + ' V' + (H * .7) + ' H' + W + ' Z' };
      case 'arrowUp': return { d: 'M' + (W * .3) + ',' + H + ' V' + (H * .4) + ' H0 L' + (W / 2) + ',0 L' + W + ',' + (H * .4) + ' H' + (W * .7) + ' V' + H + ' Z' };
      case 'arrowDown': return { d: 'M' + (W * .3) + ',0 V' + (H * .6) + ' H0 L' + (W / 2) + ',' + H + ' L' + W + ',' + (H * .6) + ' H' + (W * .7) + ' V0 Z' };
      case 'callout': {
        const r = 8;
        return { d: 'M' + r + ',0 H' + (W - r) + ' Q' + W + ',0 ' + W + ',' + r + ' V' + (H * .65) +
          ' Q' + W + ',' + (H * .75) + ' ' + (W - r) + ',' + (H * .75) + ' H' + (W * .35) +
          ' L' + (W * .2) + ',' + H + ' L' + (W * .25) + ',' + (H * .75) + ' H' + r +
          ' Q0,' + (H * .75) + ' 0,' + (H * .65) + ' V' + r + ' Q0,0 ' + r + ',0 Z' };
      }
      case 'heart': return { d: 'M' + (W / 2) + ',' + (H * .25) + ' C' + (W * .5) + ',' + (H * .1) + ' ' + (W * .2) + ',' + (H * -.05) + ' ' + (W * .1) + ',' + (H * .25) + ' C0,' + (H * .55) + ' ' + (W * .35) + ',' + (H * .75) + ' ' + (W / 2) + ',' + H + ' C' + (W * .65) + ',' + (H * .75) + ' ' + W + ',' + (H * .55) + ' ' + (W * .9) + ',' + (H * .25) + ' C' + (W * .8) + ',' + (H * -.05) + ' ' + (W * .5) + ',' + (H * .1) + ' ' + (W / 2) + ',' + (H * .25) + ' Z' };
      case 'cloud': return { d: cloudPath(W, H) };
      case 'line': return { tag: 'line', x1: 0, y1: H, x2: W, y2: 0 };
      case 'arrow': return { tag: 'line', x1: 0, y1: H, x2: W, y2: 0, markerEnd: true };
      case 'plus': {
        const t = 0.33;
        return { d: 'M' + (W * t) + ',0 H' + (W * (1 - t)) + ' V' + (H * t) + ' H' + W + ' V' + (H * (1 - t)) +
          ' H' + (W * (1 - t)) + ' V' + H + ' H' + (W * t) + ' V' + (H * (1 - t)) + ' H0 V' + (H * t) + ' H' + (W * t) + ' Z' };
      }
      default: return { d: rectPath(0, 0, W, H) };
    }
  };

  function rectPath(x, y, w, h) { return 'M' + x + ',' + y + ' H' + (x + w) + ' V' + (y + h) + ' H' + x + ' Z'; }
  function ellipsePath(w, h) {
    const rx = w / 2, ry = h / 2;
    return 'M0,' + ry + ' A' + rx + ',' + ry + ' 0 1,0 ' + w + ',' + ry + ' A' + rx + ',' + ry + ' 0 1,0 0,' + ry + ' Z';
  }
  function poly(w, h, n, startDeg) {
    const cx = w / 2, cy = h / 2, rx = w / 2, ry = h / 2;
    let d = '';
    for (let i = 0; i < n; i++) {
      const a = PP.deg2rad(startDeg + i * 360 / n);
      const x = cx + rx * Math.cos(a), y = cy + ry * Math.sin(a);
      d += (i ? 'L' : 'M') + PP.round(x, 2) + ',' + PP.round(y, 2) + ' ';
    }
    return d + 'Z';
  }
  function star(w, h, points) {
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2, r = R * 0.4;
    let d = '';
    for (let i = 0; i < points * 2; i++) {
      const rad = i % 2 ? r : R;
      const a = PP.deg2rad(-90 + i * 180 / points);
      const x = cx + (w / Math.min(w, h)) * rad * Math.cos(a);
      const y = cy + (h / Math.min(w, h)) * rad * Math.sin(a);
      d += (i ? 'L' : 'M') + PP.round(x, 2) + ',' + PP.round(y, 2) + ' ';
    }
    return d + 'Z';
  }
  function cloudPath(w, h) {
    return 'M' + (w * .25) + ',' + (h * .9) + ' a' + (w * .15) + ',' + (h * .2) + ' 0 0,1 ' + (-w * .05) + ',' + (-h * .45) +
      ' a' + (w * .18) + ',' + (h * .25) + ' 0 0,1 ' + (w * .25) + ',' + (-h * .25) +
      ' a' + (w * .2) + ',' + (h * .2) + ' 0 0,1 ' + (w * .4) + ',0' +
      ' a' + (w * .15) + ',' + (h * .2) + ' 0 0,1 ' + (w * .12) + ',' + (h * .45) +
      ' a' + (w * .12) + ',' + (h * .15) + ' 0 0,1 ' + (-w * .1) + ',' + (h * .25) + ' Z';
  }

  // shapes available in the Insert > Shapes palette
  PP.SHAPES = [
    'rect', 'roundRect', 'ellipse', 'triangle', 'rtriangle', 'diamond',
    'pentagon', 'hexagon', 'star', 'star6', 'plus', 'heart',
    'cloud', 'callout', 'arrowRight', 'arrowLeft', 'arrowUp', 'arrowDown',
    'line', 'arrow'
  ];

  PP.SHAPE_NAMES = {
    rect: 'Rectangle', roundRect: 'Rounded Rectangle', ellipse: 'Oval', triangle: 'Isosceles Triangle',
    rtriangle: 'Right Triangle', diamond: 'Diamond', pentagon: 'Pentagon', hexagon: 'Hexagon',
    star: '5-Point Star', star6: '6-Point Star', plus: 'Cross', heart: 'Heart', cloud: 'Cloud',
    callout: 'Speech Bubble', arrowRight: 'Right Arrow', arrowLeft: 'Left Arrow', arrowUp: 'Up Arrow',
    arrowDown: 'Down Arrow', line: 'Line', arrow: 'Arrow'
  };

  /* ---------- Bézier node model (for Edit Points) ---------- */
  // node = { p:[x,y], hi:[x,y]|null, ho:[x,y]|null }   (unit coords 0..1)
  const KAPPA = 0.5522847498;

  PP.ellipseNodes = function () {
    const h = 0.5 * KAPPA; // 0.27614
    return [
      { p: [0.5, 0], hi: [0.5 - h, 0], ho: [0.5 + h, 0], type: 'smooth' },     // top
      { p: [1, 0.5], hi: [1, 0.5 - h], ho: [1, 0.5 + h], type: 'smooth' },     // right
      { p: [0.5, 1], hi: [0.5 + h, 1], ho: [0.5 - h, 1], type: 'smooth' },     // bottom
      { p: [0, 0.5], hi: [0, 0.5 + h], ho: [0, 0.5 - h], type: 'smooth' },     // left
    ];
  };

  PP.nodesToPath = function (nodes, closed) {
    if (!nodes || !nodes.length) return '';
    closed = closed !== false;
    const f = function (p) { return PP.round(p[0], 4) + ',' + PP.round(p[1], 4); };
    const n = nodes.length;
    let d = 'M' + f(nodes[0].p);
    const last = closed ? n : n - 1;
    for (let i = 1; i <= last; i++) {
      const a = nodes[(i - 1) % n], b = nodes[i % n];
      if (a.ho || b.hi) d += ' C' + f(a.ho || a.p) + ' ' + f(b.hi || b.p) + ' ' + f(b.p);
      else d += ' L' + f(b.p);
    }
    return d + (closed ? ' Z' : '');
  };

  // Parse a (unit-coord) path's FIRST subpath into Bézier nodes. Supports M,L,H,V,C,Q,Z.
  PP.pathToNodes = function (d) {
    const toks = d.match(/[MLHVCQZ]|-?\d*\.?\d+(?:e-?\d+)?/gi);
    if (!toks) return [];
    const nodes = []; let cmd = null, cp = [0, 0], i = 0;
    const num = function () { return parseFloat(toks[i++]); };
    while (i < toks.length) {
      const t = toks[i];
      if (/[A-Za-z]/.test(t)) { cmd = t.toUpperCase(); i++; if (cmd === 'Z') break; }
      if (cmd === 'M') { const x = num(), y = num(); cp = [x, y]; nodes.push({ p: [x, y], hi: null, ho: null }); cmd = 'L'; }
      else if (cmd === 'L') { const x = num(), y = num(); cp = [x, y]; nodes.push({ p: [x, y], hi: null, ho: null }); }
      else if (cmd === 'H') { const x = num(); cp = [x, cp[1]]; nodes.push({ p: cp.slice(), hi: null, ho: null }); }
      else if (cmd === 'V') { const y = num(); cp = [cp[0], y]; nodes.push({ p: cp.slice(), hi: null, ho: null }); }
      else if (cmd === 'C') { const x1 = num(), y1 = num(), x2 = num(), y2 = num(), x = num(), y = num(); if (nodes.length) nodes[nodes.length - 1].ho = [x1, y1]; nodes.push({ p: [x, y], hi: [x2, y2], ho: null }); cp = [x, y]; }
      else if (cmd === 'Q') { const qx = num(), qy = num(), x = num(), y = num(); const c1 = [cp[0] + 2 / 3 * (qx - cp[0]), cp[1] + 2 / 3 * (qy - cp[1])]; const c2 = [x + 2 / 3 * (qx - x), y + 2 / 3 * (qy - y)]; if (nodes.length) nodes[nodes.length - 1].ho = c1; nodes.push({ p: [x, y], hi: c2, ho: null }); cp = [x, y]; }
      else { i++; }
    }
    // drop a trailing node that just closes back onto the first
    if (nodes.length > 1) {
      const a = nodes[0].p, b = nodes[nodes.length - 1].p;
      if (Math.abs(a[0] - b[0]) < 1e-4 && Math.abs(a[1] - b[1]) < 1e-4) {
        if (nodes[nodes.length - 1].hi && nodes.length) nodes[0].hi = nodes[nodes.length - 1].hi;
        nodes.pop();
      }
    }
    nodes.forEach(function (n) { n.type = (n.hi || n.ho) ? 'smooth' : 'corner'; });
    return nodes;
  };

  // Build nodes for any object (preset shape or freeform) in unit coords.
  PP.shapeToNodes = function (o) {
    if (o.type === 'ellipse') return PP.ellipseNodes();
    if (o.type === 'freeform' && o.nodes) return PP.deepClone(o.nodes);
    const d = (o.type === 'freeform' && o.path) ? o.path : PP.shapePath(o.type, 1, 1).d;
    if (!d) return null;
    return PP.pathToNodes(d);
  };

  /* ---------- insert helpers ---------- */
  PP.insertShape = function (type) {
    const isLine = (type === 'line' || type === 'arrow');
    const o = PP.makeObject(type, {
      w: isLine ? 360 : 260, h: isLine ? 4 : 180,
      x: PP.SLIDE_W / 2 - (isLine ? 180 : 130),
      y: PP.SLIDE_H / 2 - (isLine ? 2 : 90),
      fill: isLine ? 'none' : PP.State.doc.theme.accent,
      stroke: isLine ? '#2F528F' : '#2F528F',
      strokeWidth: isLine ? 2 : 1,
      text: ''
    });
    if (isLine) { o.fill = 'none'; o.stroke = '#2F528F'; }
    return PP.addObject(o);
  };

  PP.insertTextBox = function () {
    const o = PP.makeObject('text', {
      x: PP.SLIDE_W / 2 - 200, y: PP.SLIDE_H / 2 - 40, w: 400, h: 80,
      text: '', fill: 'none', stroke: 'none', color: '#000000', fontSize: 18,
      valign: 'top', align: 'left', placeholder: 'textbox'
    });
    o._touched = true;
    PP.addObject(o);
    // enter edit mode immediately
    setTimeout(function () { PP.beginTextEdit(o.id); }, 0);
    return o;
  };

  PP.insertImageFromDataURL = function (src, naturalW, naturalH) {
    let w = 480, h = 360;
    if (naturalW && naturalH) {
      const ratio = naturalW / naturalH;
      w = Math.min(720, naturalW); h = w / ratio;
      if (h > 540) { h = 540; w = h * ratio; }
    }
    const o = PP.makeObject('image', {
      src: src, w: w, h: h, x: (PP.SLIDE_W - w) / 2, y: (PP.SLIDE_H - h) / 2,
      fill: 'none', stroke: 'none'
    });
    return PP.addObject(o);
  };

  PP.TABLE_STYLES = [
    { name: 'Medium Blue', headerFill: '#4472C4', headerColor: '#FFFFFF', band1: '#D9E1F2', band2: '#FFFFFF', border: '#FFFFFF', textColor: '#000000' },
    { name: 'Medium Orange', headerFill: '#ED7D31', headerColor: '#FFFFFF', band1: '#FCE4D6', band2: '#FFFFFF', border: '#FFFFFF', textColor: '#000000' },
    { name: 'Medium Green', headerFill: '#70AD47', headerColor: '#FFFFFF', band1: '#E2EFDA', band2: '#FFFFFF', border: '#FFFFFF', textColor: '#000000' },
    { name: 'Dark Gray', headerFill: '#444444', headerColor: '#FFFFFF', band1: '#D9D9D9', band2: '#FFFFFF', border: '#FFFFFF', textColor: '#000000' },
    { name: 'Light Grid', headerFill: '#FFFFFF', headerColor: '#000000', band1: '#FFFFFF', band2: '#FFFFFF', border: '#A6A6A6', textColor: '#000000' },
    { name: 'No Style Grid', headerFill: '#FFFFFF', headerColor: '#000000', band1: '#FFFFFF', band2: '#FFFFFF', border: '#000000', textColor: '#000000' },
  ];

  PP.insertTable = function (rows, cols) {
    rows = rows || 3; cols = cols || 4;
    const w = Math.min(960, cols * 200), h = Math.min(120 + rows * 8, rows * 50);
    const cells = [];
    for (let r = 0; r < rows; r++) cells.push(new Array(cols).fill(''));
    const base = PP.TABLE_STYLES[0];
    const o = PP.makeObject('table', {
      w: w, h: Math.max(h, rows * 46), x: (PP.SLIDE_W - w) / 2, y: (PP.SLIDE_H - rows * 46) / 2,
      rows: rows, cols: cols, cells: cells,
      colW: new Array(cols).fill(1), rowH: new Array(rows).fill(1),
      fill: 'none', stroke: 'none', fontSize: 18, fontFamily: 'Calibri', align: 'left', valign: 'middle',
      tableStyle: { headerRow: true, banded: true, firstCol: false, borderWidth: 1,
        headerFill: base.headerFill, headerColor: base.headerColor, band1: base.band1, band2: base.band2,
        border: base.border, textColor: base.textColor },
      cellFill: null
    });
    return PP.addObject(o);
  };

})(window.PP);
