/* ============ find.js — Find & Replace + View overlays (gridlines/guides) ============ */
(function (PP) {
  'use strict';
  const S = PP.State;

  /* ================= FIND & REPLACE ================= */
  let bar = null;

  PP.openFindReplace = function (replaceMode) {
    if (bar) { bar.remove(); bar = null; }
    let matches = [], idx = -1;

    bar = PP.el('div', { class: 'findbar', style: 'position:fixed;top:92px;right:24px' });
    const findIn = PP.el('input', { placeholder: 'Find what…' });
    const repIn = PP.el('input', { placeholder: 'Replace with…' });
    const count = PP.el('span', { class: 'fr-count', text: '' });
    const matchCase = PP.el('input', { type: 'checkbox' });

    const row1 = PP.el('div', { class: 'row' }, [findIn, count,
      PP.el('button', { class: 'fr-close', html: '&times;', title: 'Close (Esc)', onclick: close })]);
    bar.appendChild(row1);
    if (replaceMode) {
      bar.appendChild(PP.el('div', { class: 'row' }, [repIn,
        PP.el('button', { text: 'Replace', onclick: replaceOne }),
        PP.el('button', { text: 'Replace All', onclick: replaceAll })]));
    }
    bar.appendChild(PP.el('div', { class: 'row' }, [
      PP.el('button', { text: 'Find Next', onclick: function () { next(1); } }),
      PP.el('button', { text: 'Previous', onclick: function () { next(-1); } }),
      PP.el('label', { style: 'font-size:11px;display:flex;gap:3px;align-items:center' }, [matchCase, 'Match case'])
    ]));

    document.body.appendChild(bar);
    setTimeout(function () { findIn.focus(); }, 0);

    findIn.addEventListener('input', recompute);
    matchCase.addEventListener('change', recompute);
    findIn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); next(e.shiftKey ? -1 : 1); }
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      e.stopPropagation();
    });
    if (replaceMode) repIn.addEventListener('keydown', function (e) { e.stopPropagation(); });

    function close() { if (bar) bar.remove(); bar = null; }
    PP._closeFind = close;

    function term() { return findIn.value; }
    function ci() { return !matchCase.checked; }

    function collect() {
      const t = term(); if (!t) return [];
      const needle = ci() ? t.toLowerCase() : t;
      const list = [];
      S.doc.slides.forEach(function (slide, si) {
        slide.objects.forEach(function (o) {
          if (o.type === 'text' || (o.text != null && o.type !== 'table' && o.type !== 'chart' && o.type !== 'image')) {
            const hay = ci() ? (o.text || '').toLowerCase() : (o.text || '');
            if (hay.indexOf(needle) >= 0) list.push({ si: si, id: o.id, kind: 'text' });
          } else if (o.type === 'table') {
            for (let r = 0; r < o.rows; r++) for (let c = 0; c < o.cols; c++) {
              const v = (o.cells[r] && o.cells[r][c]) || '';
              const hay = ci() ? v.toLowerCase() : v;
              if (hay.indexOf(needle) >= 0) list.push({ si: si, id: o.id, kind: 'cell', r: r, c: c });
            }
          }
        });
      });
      return list;
    }

    function recompute() {
      matches = collect(); idx = matches.length ? 0 : -1;
      updateCount();
      if (idx >= 0) goTo(matches[0]);
    }
    function updateCount() {
      count.textContent = matches.length ? (idx + 1) + ' of ' + matches.length : (term() ? 'No matches' : '');
    }
    function next(dir) {
      if (!matches.length) { recompute(); return; }
      idx = (idx + dir + matches.length) % matches.length;
      updateCount(); goTo(matches[idx]);
    }
    function goTo(m) {
      if (S.current !== m.si) PP.goToSlide(m.si);
      PP.select(m.id); PP.emit('change');
      PP.status('Found in slide ' + (m.si + 1));
    }

    function replaceInHTML(html, find, repl, caseSensitive) {
      if (html == null) return html;
      const flags = caseSensitive ? 'g' : 'gi';
      const re = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
      // only replace within text segments (between > and <)
      return html.replace(/>([^<]*)</g, function (m, txt) { return '>' + txt.replace(re, repl) + '<'; });
    }
    function replaceText(o, find, repl, caseSensitive) {
      const flags = caseSensitive ? 'g' : 'gi';
      const re = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
      o.text = (o.text || '').replace(re, repl);
      if (o.html != null) o.html = replaceInHTML(o.html, find, repl, caseSensitive);
    }
    function replaceOne() {
      const f = term(), rep = repIn.value; if (!f || idx < 0 || !matches[idx]) return;
      const m = matches[idx], o = PP.findObj(m.id, S.doc.slides[m.si]);
      if (!o) { recompute(); return; }
      if (m.kind === 'cell') {
        const re = new RegExp(f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), ci() ? 'i' : '');
        o.cells[m.r][m.c] = o.cells[m.r][m.c].replace(re, rep);
      } else replaceText(o, f, rep, !ci());
      PP.commit('Replace');
      recompute();
    }
    function replaceAll() {
      const f = term(), rep = repIn.value; if (!f) return;
      let n = 0;
      S.doc.slides.forEach(function (slide) {
        slide.objects.forEach(function (o) {
          if (o.type === 'text' || (o.text != null && o.type !== 'table' && o.type !== 'chart' && o.type !== 'image')) {
            if ((ci() ? (o.text || '').toLowerCase() : (o.text || '')).indexOf(ci() ? f.toLowerCase() : f) >= 0) { replaceText(o, f, rep, !ci()); n++; }
          } else if (o.type === 'table') {
            const re = new RegExp(f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), ci() ? 'gi' : 'g');
            for (let r = 0; r < o.rows; r++) for (let c = 0; c < o.cols; c++) {
              if (o.cells[r][c] && re.test(o.cells[r][c])) { o.cells[r][c] = o.cells[r][c].replace(re, rep); n++; }
            }
          }
        });
      });
      PP.commit('Replace All');
      PP.status('Replaced ' + n + ' item(s)');
      recompute();
    }
  };

  PP.isFindOpen = function () { return !!bar; };
  PP.closeFind = function () { if (PP._closeFind) PP._closeFind(); };

  /* ================= VIEW OVERLAYS ================= */
  PP.toggleGridlines = function () { S.showGrid = !S.showGrid; PP.renderOverlay(); PP.status('Gridlines ' + (S.showGrid ? 'on' : 'off')); };
  PP.toggleGuidesView = function () { S.showGuides = !S.showGuides; PP.renderOverlay(); PP.status('Guides ' + (S.showGuides ? 'on' : 'off')); };

  PP.renderOverlay = function () {
    const canvas = document.getElementById('slide-canvas');
    if (!canvas) return;
    let ov = document.getElementById('grid-overlay');
    if (!ov) {
      ov = PP.el('div', { id: 'grid-overlay' });
      const bg = document.getElementById('slide-bg');
      canvas.insertBefore(ov, bg.nextSibling);
    }
    const step = PP.SLIDE_W / 16; // ~80px logical grid
    ov.style.backgroundImage = S.showGrid
      ? 'repeating-linear-gradient(to right, rgba(0,0,0,.10) 0 1px, transparent 1px ' + step + 'px),' +
        'repeating-linear-gradient(to bottom, rgba(0,0,0,.10) 0 1px, transparent 1px ' + step + 'px)'
      : 'none';
    ov.innerHTML = '';
    if (S.showGuides) {
      ov.appendChild(PP.el('div', { class: 'guide-v' }));
      ov.appendChild(PP.el('div', { class: 'guide-h' }));
    }
  };

})(window.PP);
