/* ============ tables.js — table rendering, editing & operations ============ */
(function (PP) {
  'use strict';
  const S = PP.State;

  PP.selectedTable = function () {
    const o = PP.selectedObjs()[0];
    return (o && o.type === 'table') ? o : null;
  };
  function tableById(id) { const o = PP.findObj(id); return (o && o.type === 'table') ? o : null; }

  // set of "r,c" cells hidden because an anchor merge covers them
  function coveredSet(o) {
    const cov = {};
    if (!o.merges) return cov;
    Object.keys(o.merges).forEach(function (k) {
      const p = k.split(',').map(Number), m = o.merges[k];
      for (let r = p[0]; r < p[0] + (m.rs || 1); r++)
        for (let c = p[1]; c < p[1] + (m.cs || 1); c++)
          if (!(r === p[0] && c === p[1])) cov[r + ',' + c] = true;
    });
    return cov;
  }

  /* ---------- render ---------- */
  PP.tableHTML = function (o) {
    const editing = S.tableEditId === o.id;
    const st = o.tableStyle || {};
    const table = PP.el('table', { class: 'pp-table' });
    table.style.cssText = 'width:100%;height:100%;border-collapse:collapse;table-layout:fixed;' +
      'font-family:' + o.fontFamily + ';font-size:' + o.fontSize + 'px';

    const cg = document.createElement('colgroup');
    const totalW = o.colW.reduce(function (a, b) { return a + b; }, 0) || o.cols;
    o.colW.forEach(function (w) { const col = document.createElement('col'); col.style.width = (w / totalW * 100) + '%'; cg.appendChild(col); });
    table.appendChild(cg);

    const covered = coveredSet(o);
    const totalH = o.rowH.reduce(function (a, b) { return a + b; }, 0) || o.rows;
    for (let r = 0; r < o.rows; r++) {
      const tr = document.createElement('tr');
      tr.style.height = (o.rowH[r] / totalH * 100) + '%';
      for (let c = 0; c < o.cols; c++) {
        if (covered[r + ',' + c]) continue; // hidden by a merge anchor
        const td = document.createElement('td');
        td.dataset.r = r; td.dataset.c = c;
        const span = o.merges && o.merges[r + ',' + c];
        if (span) { if (span.rs > 1) td.rowSpan = span.rs; if (span.cs > 1) td.colSpan = span.cs; }
        const isHeader = st.headerRow && r === 0;
        const isFirstCol = st.firstCol && c === 0;
        let bg = st.band2;
        if (st.banded) {
          const bodyIdx = r - (st.headerRow ? 1 : 0);
          bg = (bodyIdx % 2 === 1) ? st.band1 : st.band2;
        }
        if (isHeader) bg = st.headerFill;
        if (o.cellFill && o.cellFill[r] && o.cellFill[r][c]) bg = o.cellFill[r][c];
        const bold = isHeader || isFirstCol;
        td.style.cssText = 'border:' + (st.borderWidth || 1) + 'px solid ' + (st.border || '#fff') +
          ';background:' + (bg || '#fff') + ';padding:4px 8px;vertical-align:' + (o.valign === 'top' ? 'top' : o.valign === 'bottom' ? 'bottom' : 'middle') +
          ';color:' + (isHeader ? st.headerColor : st.textColor) + ';font-weight:' + (bold ? '700' : '400') +
          ';text-align:' + (o.align || 'left') + ';overflow:hidden;word-wrap:break-word';
        td.textContent = (o.cells[r] && o.cells[r][c]) || '';
        if (editing) { td.setAttribute('contenteditable', 'true'); td.style.cursor = 'text'; }
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }
    return table;
  };

  /* ---------- cell editing ---------- */
  PP.beginTableEdit = function (id, r, c) {
    const o = tableById(id); if (!o) return;
    if (S.editingId) PP.endTextEdit();
    S.tableEditId = id; S.tableCell = { r: r || 0, c: c || 0 };
    PP.select(id);
    PP.renderObjects(); PP.renderSelection();
    setTimeout(function () { focusCell(id, r || 0, c || 0, true); }, 0);
    PP.status('Editing table — Tab moves to the next cell, Esc to finish');
  };

  function focusCell(id, r, c, selectAll) {
    const td = document.querySelector('#slide-objects .obj[data-id="' + id + '"] td[data-r="' + r + '"][data-c="' + c + '"]');
    if (!td) return;
    td.focus();
    if (selectAll) {
      const range = document.createRange(); range.selectNodeContents(td);
      const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
    }
    S.tableCell = { r: r, c: c };
  }

  PP.endTableEdit = function () {
    if (!S.tableEditId) return;
    syncCells(S.tableEditId);
    S.tableEditId = null; S.tableCell = null;
    PP.commit('Edit Table');
    PP.render();
  };

  function syncCells(id) {
    const o = tableById(id); if (!o) return;
    const tds = PP.$$('#slide-objects .obj[data-id="' + id + '"] td');
    tds.forEach(function (td) { o.cells[+td.dataset.r][+td.dataset.c] = td.innerText.replace(/\n$/, ''); });
  }

  PP.highlightTableSel = function () {
    if (!S.tableEditId) return;
    const root = document.querySelector('#slide-objects .obj[data-id="' + S.tableEditId + '"]');
    if (!root) return;
    PP.$$('td', root).forEach(function (td) { td.classList.remove('cell-sel'); });
    if (!S.tableSel) return;
    const s = S.tableSel, r1 = Math.min(s.r1, s.r2), r2 = Math.max(s.r1, s.r2), c1 = Math.min(s.c1, s.c2), c2 = Math.max(s.c1, s.c2);
    PP.$$('td', root).forEach(function (td) {
      const r = +td.dataset.r, c = +td.dataset.c;
      if (r >= r1 && r <= r2 && c >= c1 && c <= c2) td.classList.add('cell-sel');
    });
  };

  PP.initTables = function () {
    const root = document.getElementById('slide-objects');
    root.addEventListener('input', function (e) {
      if (!S.tableEditId) return;
      const td = e.target.closest('td'); if (!td) return;
      const o = tableById(S.tableEditId); if (!o) return;
      o.cells[+td.dataset.r][+td.dataset.c] = td.innerText.replace(/\n$/, '');
      PP.renderThumbs();
    });
    root.addEventListener('keydown', function (e) {
      if (!S.tableEditId) return;
      const td = e.target.closest('td'); if (!td) return;
      e.stopPropagation();
      const o = tableById(S.tableEditId); if (!o) return;
      const r = +td.dataset.r, c = +td.dataset.c;
      if (e.key === 'Escape') { e.preventDefault(); PP.endTableEdit(); document.getElementById('slide-canvas').focus(); }
      else if (e.key === 'Tab') {
        e.preventDefault(); syncCells(o.id);
        let nr = r, nc = c + (e.shiftKey ? -1 : 1);
        if (nc >= o.cols) { nc = 0; nr++; }
        if (nc < 0) { nc = o.cols - 1; nr--; }
        if (nr >= o.rows) { PP.tableInsert('below'); nr = o.rows - 1; PP.renderObjects(); }
        if (nr < 0) nr = 0;
        focusCell(o.id, nr, nc, true);
      }
    });
  };

  /* ---------- structure ops ---------- */
  PP.tableInsert = function (where) {
    const o = PP.selectedTable() || tableById(S.tableEditId); if (!o) return;
    const cell = S.tableCell || { r: o.rows - 1, c: o.cols - 1 };
    if (where === 'above' || where === 'below') {
      const at = cell.r + (where === 'below' ? 1 : 0);
      o.cells.splice(at, 0, new Array(o.cols).fill(''));
      o.rowH.splice(at, 0, 1); o.rows++;
      o.h += o.h / (o.rows - 1);
    } else {
      const at = cell.c + (where === 'right' ? 1 : 0);
      o.cells.forEach(function (row) { row.splice(at, 0, ''); });
      o.colW.splice(at, 0, 1); o.cols++;
      o.w += o.w / (o.cols - 1);
    }
    if (o.cellFill) o.cellFill = null;
    o.merges = null;
    commitTable(o, 'Insert');
  };

  PP.tableDelete = function (what) {
    const o = PP.selectedTable() || tableById(S.tableEditId); if (!o) return;
    const cell = S.tableCell || { r: 0, c: 0 };
    if (what === 'table') {
      const s = PP.slide();
      s.objects = s.objects.filter(function (x) { return x.id !== o.id; });
      S.tableEditId = null; PP.clearSelection(); PP.commit('Delete Table'); PP.render(); return;
    }
    if (what === 'row' && o.rows > 1) {
      o.cells.splice(cell.r, 1); o.rowH.splice(cell.r, 1); o.rows--;
    } else if (what === 'col' && o.cols > 1) {
      o.cells.forEach(function (row) { row.splice(cell.c, 1); }); o.colW.splice(cell.c, 1); o.cols--;
    }
    o.merges = null;
    commitTable(o, 'Delete');
  };

  function commitTable(o, label) {
    const wasEditing = S.tableEditId === o.id;
    PP.commit(label);
    PP.render();
    if (wasEditing) { S.tableEditId = o.id; PP.renderObjects(); }
  }

  /* ---------- design ops ---------- */
  PP.tableApplyStyle = function (i) {
    const o = PP.selectedTable() || tableById(S.tableEditId); if (!o) return;
    const st = PP.TABLE_STYLES[i]; if (!st) return;
    Object.assign(o.tableStyle, { headerFill: st.headerFill, headerColor: st.headerColor, band1: st.band1, band2: st.band2, border: st.border, textColor: st.textColor });
    o.cellFill = null;
    commitTable(o, 'Table Style');
  };
  PP.tableToggle = function (key) {
    const o = PP.selectedTable() || tableById(S.tableEditId); if (!o) return;
    o.tableStyle[key] = !o.tableStyle[key];
    commitTable(o, 'Table Option');
  };
  PP.tableShade = function (color) {
    const o = PP.selectedTable() || tableById(S.tableEditId); if (!o) return;
    const cell = S.tableCell; if (!cell) { PP.status('Click a cell first'); return; }
    if (!o.cellFill) { o.cellFill = []; for (let r = 0; r < o.rows; r++) o.cellFill.push(new Array(o.cols).fill(null)); }
    o.cellFill[cell.r][cell.c] = color;
    commitTable(o, 'Cell Shading');
  };
  PP.tableBorderColor = function (color) {
    const o = PP.selectedTable() || tableById(S.tableEditId); if (!o) return;
    o.tableStyle.border = color; commitTable(o, 'Border');
  };

  /* ---------- merged cells ---------- */
  PP.tableMerge = function () {
    const o = PP.selectedTable() || tableById(S.tableEditId); if (!o) return;
    const sel = S.tableSel || (S.tableCell ? { r1: S.tableCell.r, c1: S.tableCell.c, r2: S.tableCell.r, c2: S.tableCell.c } : null);
    if (!sel) { PP.status('Select cells to merge (Shift+click a second cell)'); return; }
    const r1 = Math.min(sel.r1, sel.r2), r2 = Math.max(sel.r1, sel.r2);
    const c1 = Math.min(sel.c1, sel.c2), c2 = Math.max(sel.c1, sel.c2);
    if (r1 === r2 && c1 === c2) { PP.status('Select at least two cells to merge'); return; }
    // combine text into anchor, clear the rest
    const parts = [];
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) {
      const v = (o.cells[r] && o.cells[r][c]) || ''; if (v) parts.push(v);
      if (!(r === r1 && c === c1)) o.cells[r][c] = '';
    }
    o.cells[r1][c1] = parts.join(' ');
    if (!o.merges) o.merges = {};
    // remove any existing merges overlapping the range
    Object.keys(o.merges).forEach(function (k) {
      const p = k.split(',').map(Number), m = o.merges[k];
      const er = p[0] + (m.rs || 1) - 1, ec = p[1] + (m.cs || 1) - 1;
      if (!(p[0] > r2 || er < r1 || p[1] > c2 || ec < c1)) delete o.merges[k];
    });
    o.merges[r1 + ',' + c1] = { rs: r2 - r1 + 1, cs: c2 - c1 + 1 };
    S.tableSel = null; S.tableCell = { r: r1, c: c1 };
    commitTable(o, 'Merge Cells');
  };
  PP.tableSplit = function () {
    const o = PP.selectedTable() || tableById(S.tableEditId); if (!o || !o.merges) return;
    const cell = S.tableCell || { r: 0, c: 0 };
    // find the anchor whose span contains this cell
    let removed = false;
    Object.keys(o.merges).forEach(function (k) {
      const p = k.split(',').map(Number), m = o.merges[k];
      if (cell.r >= p[0] && cell.r < p[0] + (m.rs || 1) && cell.c >= p[1] && cell.c < p[1] + (m.cs || 1)) { delete o.merges[k]; removed = true; }
    });
    if (removed) commitTable(o, 'Split Cells'); else PP.status('Selected cell is not merged');
  };

})(window.PP);
