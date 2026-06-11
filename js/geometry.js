/* ============ geometry.js — transform math & coordinate mapping ============ */
(function (PP) {
  'use strict';

  // The slide-canvas DOM is scaled by State.zoom. Convert screen px -> slide units.
  PP.canvasRect = function () { return document.getElementById('slide-canvas').getBoundingClientRect(); };

  PP.screenToSlide = function (clientX, clientY) {
    const r = PP.canvasRect();
    const z = PP.State.zoom;
    return { x: (clientX - r.left) / z, y: (clientY - r.top) / z };
  };

  PP.screenDeltaToSlide = function (dx, dy) {
    const z = PP.State.zoom;
    return { x: dx / z, y: dy / z };
  };

  // center of an object in slide units
  PP.objCenter = function (o) { return { x: o.x + o.w / 2, y: o.y + o.h / 2 }; };

  // rotate a point around a center by angle (deg)
  PP.rotatePoint = function (px, py, cx, cy, deg) {
    const a = PP.deg2rad(deg);
    const cos = Math.cos(a), sin = Math.sin(a);
    const dx = px - cx, dy = py - cy;
    return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
  };

  // Compute new geometry when dragging a resize handle.
  // handle: nw,n,ne,e,se,s,sw,w ; start = {x,y,w,h,rotation}; pointer in slide units; opts {keepRatio,fromCenter}
  PP.resizeFromHandle = function (start, handle, slideX, slideY, opts) {
    opts = opts || {};
    const cx = start.x + start.w / 2, cy = start.y + start.h / 2;
    // Map pointer into object's local (unrotated) coordinate frame
    const local = PP.rotatePoint(slideX, slideY, cx, cy, -start.rotation);

    // Ctrl = resize symmetrically about the center (PowerPoint behavior)
    if (opts.fromCenter) {
      let halfW = start.w / 2, halfH = start.h / 2;
      if (/[ew]/.test(handle)) halfW = Math.abs(local.x - cx);
      if (/[ns]/.test(handle)) halfH = Math.abs(local.y - cy);
      if (opts.keepRatio && start.w && start.h) {
        const ratio = start.w / start.h;
        if (/[ew]/.test(handle)) halfH = halfW / ratio; else halfW = halfH * ratio;
      }
      const w = Math.max(8, halfW * 2), h = Math.max(8, halfH * 2);
      return { x: cx - w / 2, y: cy - h / 2, w: w, h: h, rotation: start.rotation };
    }
    let left = start.x, top = start.y, right = start.x + start.w, bottom = start.y + start.h;

    const hasW = /w/.test(handle), hasE = /e/.test(handle);
    const hasN = /n/.test(handle), hasS = /s/.test(handle);

    if (hasE) right = local.x;
    if (hasW) left = local.x;
    if (hasS) bottom = local.y;
    if (hasN) top = local.y;

    let w = Math.max(8, right - left);
    let h = Math.max(8, bottom - top);

    if (opts.keepRatio && start.w && start.h) {
      const ratio = start.w / start.h;
      // drive by the dominant axis
      if (hasE || hasW) h = w / ratio; else if (hasN || hasS) w = h * ratio;
      // corner: keep both proportional to larger change
      if ((hasE || hasW) && (hasN || hasS)) {
        const rw = w / start.w, rh = h / start.h;
        const r = Math.max(rw, rh);
        w = start.w * r; h = start.h * r;
      }
    }

    // recompute the fixed corner so opposite edge stays anchored (in local frame)
    let nx = left, ny = top;
    if (hasW && !hasE) nx = right - w;
    if (hasN && !hasS) ny = bottom - h;
    if (!hasW && !hasE) nx = start.x; // pure vertical handle keeps x via center later
    if (!hasN && !hasS) ny = start.y;

    // For pure-edge handles keep center on the unchanged axis
    let newCx, newCy;
    if (!hasW && !hasE) { newCx = cx; } else { newCx = nx + w / 2; }
    if (!hasN && !hasS) { newCy = cy; } else { newCy = ny + h / 2; }

    // The local-frame box has a new center; rotate that center offset back to slide frame
    // local center relative to original center:
    const lcx = (nx + w / 2), lcy = (ny + h / 2);
    const rotated = PP.rotatePoint(lcx, lcy, cx, cy, start.rotation);
    if (!hasW && !hasE) rotated.x = cx;
    if (!hasN && !hasS) rotated.y = cy;

    return { x: rotated.x - w / 2, y: rotated.y - h / 2, w: w, h: h, rotation: start.rotation };
  };

  // angle (deg) from object center to a pointer
  PP.angleTo = function (o, slideX, slideY) {
    const c = PP.objCenter(o);
    let a = Math.atan2(slideY - c.y, slideX - c.x) * 180 / Math.PI;
    return a + 90; // handle sits above the shape
  };

  // axis-aligned bounding box of a rotated object (slide units)
  PP.aabb = function (o) {
    const c = PP.objCenter(o);
    const pts = [[o.x, o.y], [o.x + o.w, o.y], [o.x + o.w, o.y + o.h], [o.x, o.y + o.h]]
      .map(function (p) { return PP.rotatePoint(p[0], p[1], c.x, c.y, o.rotation); });
    const xs = pts.map(function (p) { return p.x; }), ys = pts.map(function (p) { return p.y; });
    return { x: Math.min.apply(null, xs), y: Math.min.apply(null, ys),
             r: Math.max.apply(null, xs), b: Math.max.apply(null, ys) };
  };

  // does a marquee rect intersect an object's aabb
  PP.rectIntersects = function (m, o) {
    const b = PP.aabb(o);
    return !(b.x > m.x + m.w || b.r < m.x || b.y > m.y + m.h || b.b < m.y);
  };

  // hit test: is slide point inside (rotated) object
  PP.hitTest = function (o, sx, sy) {
    const c = PP.objCenter(o);
    const p = PP.rotatePoint(sx, sy, c.x, c.y, -o.rotation);
    return p.x >= o.x && p.x <= o.x + o.w && p.y >= o.y && p.y <= o.y + o.h;
  };

  PP.topObjectAt = function (sx, sy) {
    const objs = PP.slide().objects;
    for (let i = objs.length - 1; i >= 0; i--) {
      if (!objs[i].locked && PP.hitTest(objs[i], sx, sy)) return objs[i];
    }
    return null;
  };

})(window.PP);
