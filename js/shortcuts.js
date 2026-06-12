/* ============ shortcuts.js — global keyboard handling (PowerPoint parity) ============ */
(function (PP) {
  'use strict';
  const S = PP.State;

  const GRID = 10;   // coarse nudge (slide units)
  const FINE = 1;    // fine nudge

  function inTextField(e) {
    const t = e.target;
    return t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' ||
      t.isContentEditable);
  }

  function init() {
    document.addEventListener('keydown', onKey);
    // Ctrl + mouse wheel = zoom (PowerPoint / Office behavior)
    const scroll = document.getElementById('canvas-scroll');
    scroll.addEventListener('wheel', function (e) {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const step = e.deltaY < 0 ? 0.1 : -0.1;
      PP.setZoom(PP.State.zoom + step);
    }, { passive: false });
  }

  function onKey(e) {
    // Slideshow has its own handler
    if (PP.isShowOpen && PP.isShowOpen()) return;

    // Crop / Edit-Points modes: Enter applies, Esc cancels
    if (PP.isCropping && PP.isCropping()) {
      if (e.key === 'Enter') { e.preventDefault(); PP.applyCrop(); }
      else if (e.key === 'Escape') { e.preventDefault(); PP.cancelModes(); }
      return;
    }
    if (PP.isEditingPoints && PP.isEditingPoints()) {
      if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); PP.endEditPoints(); }
      else if (e.key.indexOf('Arrow') === 0) {
        e.preventDefault();
        const s = (e.ctrlKey || e.metaKey) ? 1 : 5;
        if (e.key === 'ArrowLeft') PP.epNudge(-s, 0);
        else if (e.key === 'ArrowRight') PP.epNudge(s, 0);
        else if (e.key === 'ArrowUp') PP.epNudge(0, -s);
        else if (e.key === 'ArrowDown') PP.epNudge(0, s);
      }
      return;
    }

    // Text editing: let the editor handle keys (it stops propagation); only intercept nothing here
    if (S.editingId) return;

    // Don't hijack typing in ribbon inputs / notes
    if (inTextField(e)) {
      if (e.key === 'Escape') { e.target.blur(); }
      return;
    }

    const ctrl = e.ctrlKey || e.metaKey;
    const k = e.key;
    const lk = k.length === 1 ? k.toLowerCase() : k;

    // ----- type-to-edit: start typing on a selected text object (PowerPoint behavior) -----
    if (!ctrl && !e.altKey && k.length === 1 && S.selection.length === 1) {
      const o = PP.findObj(S.selection[0]);
      if (o && o.type !== 'image' && o.type !== 'line' && o.type !== 'arrow') {
        e.preventDefault();
        PP.beginTextEdit(o.id, k);
        return;
      }
    }

    // ----- Ctrl combos -----
    if (ctrl) {
      switch (lk) {
        case 'z': e.preventDefault(); e.shiftKey ? PP.redo() : PP.undo(); return;
        case 'y': e.preventDefault(); PP.redo(); return;
        case 'c': e.preventDefault(); PP.copy(); return;
        case 'x': e.preventDefault(); PP.cut(); return;
        case 'v': e.preventDefault(); PP.paste(); return;
        case 'd': e.preventDefault(); PP.duplicate(); return;
        case 'a': e.preventDefault(); PP.selectAll(); return;
        case 'f': e.preventDefault(); PP.openFindReplace(false); return;
        case 'h': e.preventDefault(); PP.openFindReplace(true); return;
        case 's': e.preventDefault(); PP.save(); return;
        case 'o': e.preventDefault(); document.getElementById('file-open').click(); return;
        case 'm': e.preventDefault(); PP.addSlide(PP.contentSlide()); return;
        case 'b': e.preventDefault(); PP.cmd('bold'); return;
        case 'i': e.preventDefault(); PP.cmd('italic'); return;
        case 'u': e.preventDefault(); PP.cmd('underline'); return;
        case 'e': e.preventDefault(); PP.cmd('align', 'center'); return;
        case 'l': e.preventDefault(); PP.cmd('align', 'left'); return;
        case 'r': e.preventDefault(); PP.cmd('align', 'right'); return;
        case 'j': e.preventDefault(); PP.cmd('align', 'justify'); return;
        case 'g': e.preventDefault(); e.shiftKey ? PP.ungroupSelected() : PP.groupSelected(); return;
        case ']': e.preventDefault(); PP.cmd('growFont'); return;
        case '[': e.preventDefault(); PP.cmd('shrinkFont'); return;
        case '=': e.preventDefault(); return;
        case 'p': e.preventDefault(); window.print(); return;
        case 'home': e.preventDefault(); PP.goToSlide(0); return;
        case 'end': e.preventDefault(); PP.goToSlide(S.doc.slides.length - 1); return;
      }
      if (e.shiftKey && (k === '>' || k === '.')) { e.preventDefault(); PP.cmd('growFont'); return; }
      if (e.shiftKey && (k === '<' || k === ',')) { e.preventDefault(); PP.cmd('shrinkFont'); return; }
      return;
    }

    // ----- function / nav keys -----
    switch (k) {
      case 'F5': e.preventDefault(); if (e.altKey) PP.startPresenter(S.current); else if (e.shiftKey) PP.startShow(S.current); else PP.startShow(0); return;
      case 'F2': e.preventDefault(); if (S.selection.length) PP.beginTextEdit(S.selection[0]); return;
      case 'Escape': e.preventDefault(); if (PP.isFindOpen && PP.isFindOpen()) { PP.closeFind(); return; } if (PP.cancelArmed()) return; PP.clearSelection(); PP.hideMenus(); PP.emit('change'); return;
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        if (S.selection.length) PP.deleteSelected();
        return;
      case 'Tab':
        e.preventDefault(); cycleSelection(e.shiftKey ? -1 : 1); return;
      case 'Enter':
        if (S.selection.length === 1) {
          const o = PP.findObj(S.selection[0]);
          if (o && o.type !== 'image' && o.type !== 'line') { e.preventDefault(); PP.beginTextEdit(o.id); return; }
        }
        return;
      case 'PageDown': e.preventDefault(); PP.goToSlide(S.current + 1); return;
      case 'PageUp': e.preventDefault(); PP.goToSlide(S.current - 1); return;
      case 'Home': if (!S.selection.length) { e.preventDefault(); PP.goToSlide(0); } return;
      case 'End': if (!S.selection.length) { e.preventDefault(); PP.goToSlide(S.doc.slides.length - 1); } return;
    }

    // ----- arrow keys -----
    if (k.indexOf('Arrow') === 0) {
      if (S.selection.length) {
        e.preventDefault();
        const step = e.ctrlKey ? FINE : GRID;
        if (k === 'ArrowLeft') PP.nudge(-step, 0);
        else if (k === 'ArrowRight') PP.nudge(step, 0);
        else if (k === 'ArrowUp') PP.nudge(0, -step);
        else if (k === 'ArrowDown') PP.nudge(0, step);
      } else {
        // navigate slides
        e.preventDefault();
        if (k === 'ArrowDown' || k === 'ArrowRight') PP.goToSlide(S.current + 1);
        else PP.goToSlide(S.current - 1);
      }
    }
  }

  function cycleSelection(dir) {
    const objs = PP.slide().objects;
    if (!objs.length) return;
    let idx = -1;
    if (S.selection.length) idx = objs.findIndex(function (o) { return o.id === S.selection[0]; });
    idx = (idx + dir + objs.length) % objs.length;
    PP.select(objs[idx].id);
    PP.emit('change');
  }

  PP.initShortcuts = init;
})(window.PP);
