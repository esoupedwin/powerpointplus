/* ============ shapeops.js — Merge Shapes (boolean operations) ============ */
(function (PP) {
  'use strict';

  function isMergeable(o) {
    if (!o) return false;
    if (o.type === 'image' || o.type === 'line' || o.type === 'arrow') return false;
    const p = PP.shapePath(o.type === 'freeform' ? 'rect' : o.type, 10, 10);
    return o.type === 'freeform' || (p && p.d);
  }

  // Rasterize one object into a boolean mask on a canvas grid (slide coords -> px).
  function rasterize(o, ox, oy, scale, cw, ch) {
    const cv = document.createElement('canvas');
    cv.width = cw; cv.height = ch;
    const ctx = cv.getContext('2d');
    ctx.setTransform(scale, 0, 0, scale, -ox * scale, -oy * scale); // draw directly in slide units
    ctx.translate(o.x + o.w / 2, o.y + o.h / 2);
    ctx.rotate(o.rotation * Math.PI / 180);
    ctx.translate(-o.w / 2, -o.h / 2);
    let d;
    if (o.type === 'freeform' && o.path) {
      // unit-space path scaled to w,h
      const m = new DOMMatrix().scaleSelf(o.w, o.h);
      const p = new Path2D();
      p.addPath(new Path2D(o.path), m);
      ctx.fillStyle = '#000'; ctx.fill(p, o.fillRule === 'evenodd' ? 'evenodd' : 'nonzero');
    } else {
      d = PP.shapePath(o.type, o.w, o.h).d;
      ctx.fillStyle = '#000'; ctx.fill(new Path2D(d));
    }
    const img = ctx.getImageData(0, 0, cw, ch).data;
    const mask = new Uint8Array(cw * ch);
    for (let i = 0, j = 3; i < mask.length; i++, j += 4) mask[i] = img[j] > 64 ? 1 : 0;
    return mask;
  }

  // Extract closed boundary loops from a boolean grid (rectilinear), corner coords.
  function extractContours(grid, w, h) {
    const edges = [];
    const at = function (x, y) { return (x < 0 || y < 0 || x >= w || y >= h) ? 0 : grid[y * w + x]; };
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!grid[y * w + x]) continue;
        if (!at(x, y - 1)) edges.push([[x + 1, y], [x, y]]);       // top
        if (!at(x, y + 1)) edges.push([[x, y + 1], [x + 1, y + 1]]); // bottom
        if (!at(x - 1, y)) edges.push([[x, y], [x, y + 1]]);       // left
        if (!at(x + 1, y)) edges.push([[x + 1, y + 1], [x + 1, y]]); // right
      }
    }
    // chain edges into loops
    const map = new Map();
    const key = function (p) { return p[0] + ',' + p[1]; };
    edges.forEach(function (e) {
      const k = key(e[0]);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push({ e: e, used: false });
    });
    const loops = [];
    edges.forEach(function (start) {
      // find an unused entry for this edge
      const arr = map.get(key(start[0]));
      const rec = arr && arr.find(function (r) { return r.e === start && !r.used; });
      if (!rec || rec.used) return;
      const loop = [];
      let cur = rec;
      let guard = 0;
      while (cur && !cur.used && guard++ < 1e6) {
        cur.used = true;
        loop.push(cur.e[0]);
        const nextArr = map.get(key(cur.e[1]));
        cur = nextArr && nextArr.find(function (r) { return !r.used; });
      }
      if (loop.length > 2) loops.push(loop);
    });
    return loops;
  }

  // Douglas-Peucker simplify
  function simplify(points, eps) {
    if (points.length < 4) return points;
    const keep = new Array(points.length).fill(false);
    keep[0] = keep[points.length - 1] = true;
    const stack = [[0, points.length - 1]];
    while (stack.length) {
      const seg = stack.pop(), a = seg[0], b = seg[1];
      let maxD = 0, idx = -1;
      for (let i = a + 1; i < b; i++) {
        const d = ptSegDist(points[i], points[a], points[b]);
        if (d > maxD) { maxD = d; idx = i; }
      }
      if (maxD > eps && idx > 0) { keep[idx] = true; stack.push([a, idx], [idx, b]); }
    }
    return points.filter(function (_, i) { return keep[i]; });
  }
  function ptSegDist(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const l2 = dx * dx + dy * dy;
    if (!l2) return Math.hypot(p[0] - a[0], p[1] - a[1]);
    let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
  }
  // Chaikin smoothing for a closed loop
  function chaikin(points, iters) {
    for (let k = 0; k < iters; k++) {
      const out = [];
      for (let i = 0; i < points.length; i++) {
        const p = points[i], q = points[(i + 1) % points.length];
        out.push([p[0] * 0.75 + q[0] * 0.25, p[1] * 0.75 + q[1] * 0.25]);
        out.push([p[0] * 0.25 + q[0] * 0.75, p[1] * 0.25 + q[1] * 0.75]);
      }
      points = out;
    }
    return points;
  }
  // Chaikin on an OPEN polyline — keeps the two endpoints fixed (corners stay put)
  function chaikinOpen(points, iters) {
    for (let k = 0; k < iters; k++) {
      if (points.length < 3) break;
      const out = [points[0]];
      for (let i = 0; i < points.length - 1; i++) {
        const p = points[i], q = points[i + 1];
        out.push([p[0] * 0.75 + q[0] * 0.25, p[1] * 0.75 + q[1] * 0.25]);
        out.push([p[0] * 0.25 + q[0] * 0.75, p[1] * 0.25 + q[1] * 0.75]);
      }
      out.push(points[points.length - 1]);
      points = out;
    }
    return points;
  }
  // direction-change (deviation) angle at b, in degrees: 0=straight, 90=right-angle corner
  function devAngle(a, b, c) {
    const v1x = b[0] - a[0], v1y = b[1] - a[1], v2x = c[0] - b[0], v2y = c[1] - b[1];
    const m1 = Math.hypot(v1x, v1y), m2 = Math.hypot(v2x, v2y);
    if (!m1 || !m2) return 0;
    let cos = (v1x * v2x + v1y * v2y) / (m1 * m2);
    cos = Math.max(-1, Math.min(1, cos));
    return Math.acos(cos) * 180 / Math.PI;
  }
  // Smooth a closed loop but PRESERVE sharp corners (PowerPoint-like merge result)
  function smoothPreserve(points, iters) {
    const n = points.length;
    if (n < 4) return points;
    const SHARP = 32; // deg — above this a vertex is treated as a hard corner
    const sharp = [];
    for (let i = 0; i < n; i++) {
      if (devAngle(points[(i - 1 + n) % n], points[i], points[(i + 1) % n]) > SHARP) sharp.push(i);
    }
    if (sharp.length < 2) return chaikin(points, iters);
    const out = [];
    for (let s = 0; s < sharp.length; s++) {
      const i0 = sharp[s], i1 = sharp[(s + 1) % sharp.length];
      const seg = []; let i = i0;
      while (true) { seg.push(points[i]); if (i === i1) break; i = (i + 1) % n; }
      const sm = chaikinOpen(seg, iters);
      for (let k = 0; k < sm.length - 1; k++) out.push(sm[k]); // drop shared endpoint
    }
    return out;
  }

  // Build boolean grid for an op from a coverage (bitmask) array
  function gridForValue(coverage, predicate, n) {
    const g = new Uint8Array(coverage.length);
    for (let i = 0; i < coverage.length; i++) g[i] = predicate(coverage[i], n) ? 1 : 0;
    return g;
  }
  function popcount(v) { let c = 0; while (v) { c += v & 1; v >>= 1; } return c; }

  // Convert a set of loops (in px) into a normalized freeform object
  function loopsToObject(loops, ox, oy, scale, template) {
    // to slide coords + smooth
    const slideLoops = loops.map(function (loop) {
      let pts = loop.map(function (p) { return [ox + p[0] / scale, oy + p[1] / scale]; });
      pts = simplify(pts, 0.9 / scale);          // collapse the 1px staircase (eps in slide units)
      pts = smoothPreserve(pts, 2);              // round curves but keep sharp corners
      return pts;
    }).filter(function (l) { return l.length > 2; });
    if (!slideLoops.length) return null;
    // bbox
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    slideLoops.forEach(function (l) { l.forEach(function (p) { minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1]); maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]); }); });
    const w = Math.max(1, maxX - minX), h = Math.max(1, maxY - minY);
    // path in unit coords (0..1)
    const d = slideLoops.map(function (l) {
      return 'M' + l.map(function (p) { return PP.round((p[0] - minX) / w, 4) + ',' + PP.round((p[1] - minY) / h, 4); }).join(' L') + ' Z';
    }).join(' ');
    const o = PP.makeObject('freeform', {
      x: minX, y: minY, w: w, h: h, path: d, fillRule: 'evenodd',
      fill: template.fill, stroke: template.stroke, strokeWidth: template.strokeWidth, opacity: template.opacity
    });
    return o;
  }

  PP.mergeShapes = function (op) {
    const objs = PP.selectedObjs().filter(isMergeable);
    if (objs.length < 2) { PP.status('Select two or more shapes to merge'); return; }
    if (objs.length > 16) { PP.status('Too many shapes for merge'); return; }

    // overall bbox in slide coords
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    objs.forEach(function (o) { const b = PP.aabb(o); minX = Math.min(minX, b.x); minY = Math.min(minY, b.y); maxX = Math.max(maxX, b.r); maxY = Math.max(maxY, b.b); });
    minX -= 2; minY -= 2; maxX += 2; maxY += 2;
    const W = maxX - minX, H = maxY - minY;
    const scale = Math.min(1500 / Math.max(W, H), 6);
    const cw = Math.max(8, Math.ceil(W * scale)), ch = Math.max(8, Math.ceil(H * scale));

    const masks = objs.map(function (o) { return rasterize(o, minX, minY, scale, cw, ch); });
    const n = objs.length, full = (1 << n) - 1;
    const coverage = new Uint16Array(cw * ch);
    for (let i = 0; i < coverage.length; i++) {
      let v = 0;
      for (let s = 0; s < n; s++) if (masks[s][i]) v |= (1 << s);
      coverage[i] = v;
    }

    const template = { fill: objs[0].fill, stroke: objs[0].stroke, strokeWidth: objs[0].strokeWidth, opacity: objs[0].opacity };
    const results = [];

    if (op === 'fragment') {
      const values = {};
      for (let i = 0; i < coverage.length; i++) if (coverage[i]) values[coverage[i]] = true;
      Object.keys(values).map(Number).forEach(function (val) {
        const g = gridForValue(coverage, function (c) { return c === val; });
        const loops = extractContours(g, cw, ch);
        const o = loopsToObject(loops, minX, minY, scale, template);
        if (o) results.push(o);
      });
    } else {
      let pred;
      if (op === 'union') pred = function (c) { return c !== 0; };
      else if (op === 'intersect') pred = function (c) { return c === full; };
      else if (op === 'subtract') pred = function (c) { return c === 1; }; // in shape0 only
      else if (op === 'combine') pred = function (c) { return popcount(c) === 1; };
      else pred = function (c) { return c !== 0; };
      const g = gridForValue(coverage, pred);
      const loops = extractContours(g, cw, ch);
      const o = loopsToObject(loops, minX, minY, scale, template);
      if (o) results.push(o);
    }

    if (!results.length) { PP.status('Merge produced no result'); return; }

    // replace source shapes with results, keeping z position of the lowest source
    const s = PP.slide();
    const firstIdx = Math.min.apply(null, objs.map(function (o) { return s.objects.indexOf(o); }));
    const ids = objs.map(function (o) { return o.id; });
    s.objects = s.objects.filter(function (o) { return ids.indexOf(o.id) < 0; });
    s.objects.splice.apply(s.objects, [firstIdx, 0].concat(results));
    PP.select(results.map(function (o) { return o.id; }));
    PP.commit('Merge Shapes (' + op + ')');
    PP.status('Merge: ' + op);
  };

  PP.MERGE_OPS = [
    { id: 'union', name: 'Union' },
    { id: 'combine', name: 'Combine' },
    { id: 'fragment', name: 'Fragment' },
    { id: 'intersect', name: 'Intersect' },
    { id: 'subtract', name: 'Subtract' },
  ];

})(window.PP);
