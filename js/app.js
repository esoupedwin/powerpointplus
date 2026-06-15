/* ============ app.js — bootstrap & wiring ============ */
(function (PP) {
  'use strict';
  const S = PP.State;

  function wireTitlebar() {
    document.querySelector('.qat').addEventListener('click', function (e) {
      const b = e.target.closest('.qat-btn'); if (!b) return;
      PP.cmd(b.dataset.cmd);
    });
  }

  function wireStatusBar() {
    document.querySelector('.status-right').addEventListener('click', function (e) {
      const vb = e.target.closest('.view-btn');
      if (vb) {
        if (vb.dataset.cmd === 'present') { PP.startShow(S.current); return; }
        PP.setView(vb.dataset.view);
        return;
      }
    });
    document.getElementById('zoom-in').addEventListener('click', function () { PP.setZoom(S.zoom + 0.1); });
    document.getElementById('zoom-out').addEventListener('click', function () { PP.setZoom(S.zoom - 0.1); });
    document.getElementById('zoom-fit').addEventListener('click', function () { PP.fitToWindow(); });
    document.getElementById('zoom-slider').addEventListener('input', function () { PP.setZoom(this.value / 100); });
  }

  function wireNotes() {
    const notes = document.getElementById('notes-area');
    notes.addEventListener('input', function () { PP.slide().notes = this.value; S.dirty = true; });
    notes.addEventListener('change', function () { PP.commit('Edit Notes'); });
  }

  function wireThumbDblClick() {
    document.getElementById('thumbs').addEventListener('dblclick', function (e) {
      const row = e.target.closest('.thumb-row'); if (!row) return;
      const o = PP.slide().objects.find(function (x) { return x.placeholder === 'title'; });
      if (o) PP.beginTextEdit(o.id);
    });
  }

  function wireEvents() {
    PP.on('change', function () {
      if (S.editingId) { PP.renderThumbs(); PP.updateStatus(); PP.refreshActiveEditor(); return; }
      if (S.tableEditId) { PP.renderThumbs(); PP.updateStatus(); return; }
      PP.render();
    });
    PP.on('selection', function () { if (!S.editingId) { PP.renderSelection(); } PP.syncRibbonState(); });
    PP.on('slidechange', function () { if (PP.closeTextPane) PP.closeTextPane(); PP.render(); });
    PP.on('history', updateUndoRedo);
  }

  function updateUndoRedo() {
    const u = document.querySelector('.qat-btn[data-cmd="undo"]');
    const r = document.querySelector('.qat-btn[data-cmd="redo"]');
    if (u) u.style.opacity = PP.canUndo() ? 1 : 0.4;
    if (r) r.style.opacity = PP.canRedo() ? 1 : 0.4;
  }

  function boot() {
    // state
    const saved = PP.loadLocal();
    PP.initState(saved || PP.newDoc());

    // subsystems
    PP.initSelection();
    PP.initContext();
    PP.initRibbon();
    PP.initShortcuts();
    PP.initClipboard();
    PP.initTables();
    PP.initIO();

    // ui wiring
    wireTitlebar();
    wireStatusBar();
    wireNotes();
    wireThumbDblClick();
    wireEvents();

    // first paint
    PP.render();
    PP.fitToWindow();
    updateUndoRedo();

    // re-fit on window resize when in fit mode
    window.addEventListener('resize', function () { if (S.fitMode && S.view === 'normal') PP.fitToWindow(); });

    PP.status('Ready');
    setTimeout(function () { PP.status(''); }, 1500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})(window.PP);
