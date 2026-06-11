/* ============ util.js — helpers & global namespace ============ */
window.PP = window.PP || {};
(function (PP) {
  'use strict';

  let _id = 1;
  PP.uid = function (prefix) { return (prefix || 'o') + '_' + (Date.now().toString(36)) + '_' + (_id++); };

  PP.clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };
  PP.deg2rad = function (d) { return d * Math.PI / 180; };
  PP.round = function (v, p) { p = p || 0; const f = Math.pow(10, p); return Math.round(v * f) / f; };

  PP.deepClone = function (o) { return JSON.parse(JSON.stringify(o)); };

  // DOM helper
  PP.el = function (tag, props, children) {
    const e = document.createElement(tag);
    if (props) for (const k in props) {
      if (k === 'class') e.className = props[k];
      else if (k === 'style') e.setAttribute('style', props[k]);
      else if (k === 'html') e.innerHTML = props[k];
      else if (k === 'text') e.textContent = props[k];
      else if (k.slice(0, 2) === 'on' && typeof props[k] === 'function') e.addEventListener(k.slice(2), props[k]);
      else if (k === 'dataset') { for (const d in props[k]) e.dataset[d] = props[k][d]; }
      else if (props[k] != null) e.setAttribute(k, props[k]);
    }
    if (children) (Array.isArray(children) ? children : [children]).forEach(function (c) {
      if (c == null) return;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  };

  PP.$ = function (sel, root) { return (root || document).querySelector(sel); };
  PP.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  // simple event bus
  const listeners = {};
  PP.on = function (ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); };
  PP.emit = function (ev, data) { (listeners[ev] || []).forEach(function (fn) { fn(data); }); };

  PP.status = function (msg) {
    const s = document.getElementById('status-msg');
    if (s) { s.textContent = msg || ''; }
  };

  // PowerPoint-ish color palette (theme + standard)
  PP.THEME_COLORS = [
    '#FFFFFF', '#000000', '#E7E6E6', '#44546A', '#4472C4', '#ED7D31',
    '#A5A5A5', '#FFC000', '#5B9BD5', '#70AD47'
  ];
  PP.STANDARD_COLORS = [
    '#C00000', '#FF0000', '#FFC000', '#FFFF00', '#92D050',
    '#00B050', '#00B0F0', '#0070C0', '#002060', '#7030A0'
  ];

  PP.FONTS = ['Calibri', 'Calibri Light', 'Arial', 'Arial Black', 'Times New Roman',
    'Georgia', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Courier New', 'Comic Sans MS',
    'Impact', 'Segoe UI', 'Cambria', 'Garamond', 'Consolas'];
  PP.FONT_SIZES = [8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 44, 54, 60, 66, 72, 80, 88, 96];

})(window.PP);
