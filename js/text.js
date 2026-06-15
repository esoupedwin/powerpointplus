/* ============ text.js — in-place rich text editing (per-character formatting) ============ */
(function (PP) {
  'use strict';
  const S = PP.State;

  let activeEditor = null;

  function canHaveText(o) { return o && o.type !== 'image' && o.type !== 'line' && o.type !== 'arrow' && o.type !== 'chart' && o.type !== 'table' && o.type !== 'smartart'; }

  PP.selectedTextObjs = function () { return PP.selectedObjs().filter(canHaveText); };

  PP.beginTextEdit = function (id, initialChar) {
    const o = PP.findObj(id);
    if (!canHaveText(o)) return;
    if (S.editingId === id) return;
    S.editingId = id;
    PP.select(id);
    PP.renderObjects();
    PP.renderSelection();

    const node = document.querySelector('#slide-objects .obj[data-id="' + id + '"]');
    if (!node) return;
    node.classList.add('editing');
    const editor = node.querySelector('.obj-text');
    activeEditor = editor;

    // load content
    if (o.placeholder && !o._touched) editor.innerHTML = '<div><br></div>';
    else editor.innerHTML = (o.html && o.html !== '') ? o.html : PP.linesToBlocks(o.text);
    editor.classList.remove('placeholder-hint');
    editor.setAttribute('contenteditable', 'true');
    editor.style.cursor = 'text';
    editor.style.userSelect = 'text';
    editor.style.webkitUserSelect = 'text';

    try { document.execCommand('styleWithCSS', false, true); } catch (e) {}

    editor.addEventListener('input', onInput);
    editor.addEventListener('blur', onBlur);
    editor.addEventListener('mousedown', stop);
    editor.addEventListener('dblclick', stop);
    editor.addEventListener('keydown', onKeyDown);
    document.addEventListener('selectionchange', onSelChange);

    setTimeout(function () {
      editor.focus();
      const range = document.createRange();
      range.selectNodeContents(editor);
      const sel = window.getSelection();
      sel.removeAllRanges(); sel.addRange(range);
      if (o.placeholder && !o._touched) sel.collapseToStart();
      if (initialChar) { document.execCommand('insertText', false, initialChar); onInput(); }
      PP.syncRibbonState();
    }, 0);

    function stop(e) { e.stopPropagation(); }

    function onInput() {
      o.html = editor.innerHTML;
      o.text = editor.innerText.replace(/\n$/, '');
      o._touched = true;
      if (o.placeholder === 'textbox') o.h = Math.max(o.h, editor.scrollHeight);
      PP.renderThumbs();
      PP.renderSelection();
    }
    function onBlur() { PP.endTextEdit(); }

    function onKeyDown(e) {
      e.stopPropagation(); // shield global shortcuts while typing
      if (e.key === 'Escape') { e.preventDefault(); PP.endTextEdit(); document.getElementById('slide-canvas').focus(); return; }
      if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); PP.endTextEdit(); return; }
      if (e.key === 'Tab') {
        e.preventDefault();
        if (o.bullet) { indentBlock(editor, e.shiftKey ? -1 : 1); }
        else document.execCommand('insertText', false, '\t');
        onInput();
        return;
      }
      // inline formatting shortcuts operate on the current selection
      if (e.ctrlKey && !e.altKey) {
        const k = e.key.toLowerCase();
        const map = { b: 'bold', i: 'italic', u: 'underline' };
        if (map[k]) { e.preventDefault(); document.execCommand(map[k]); onInput(); PP.syncRibbonState(); return; }
        if (k === 'e') { e.preventDefault(); document.execCommand('justifyCenter'); onInput(); return; }
        if (k === 'l') { e.preventDefault(); document.execCommand('justifyLeft'); onInput(); return; }
        if (k === 'r') { e.preventDefault(); document.execCommand('justifyRight'); onInput(); return; }
        if (k === 'j') { e.preventDefault(); document.execCommand('justifyFull'); onInput(); return; }
        if (k === 'a') { e.preventDefault(); document.execCommand('selectAll'); return; }
      }
    }
    function onSelChange() {
      if (S.editingId !== id) return;
      PP.syncRibbonState();
    }
    PP._detachSel = function () { document.removeEventListener('selectionchange', onSelChange); };
  };

  function indentBlock(editor, dir) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    let node = sel.anchorNode;
    while (node && node !== editor && node.parentNode !== editor) node = node.parentNode;
    if (!node || node === editor) return;
    const cur = parseFloat(node.style.marginLeft) || 0;
    const next = PP.clamp(cur + dir * 1.3, 0, 1.3 * 6);
    node.style.marginLeft = next + 'em';
  }

  PP.endTextEdit = function () {
    if (!S.editingId) return;
    const o = PP.findObj(S.editingId);
    const node = document.querySelector('#slide-objects .obj[data-id="' + S.editingId + '"]');
    if (node) {
      const editor = node.querySelector('.obj-text');
      if (editor && o) {
        o.html = cleanHTML(editor.innerHTML);
        o.text = editor.innerText.replace(/\n$/, '');
        editor.removeAttribute('contenteditable');
      }
      node.classList.remove('editing');
    }
    if (PP._detachSel) { PP._detachSel(); PP._detachSel = null; }
    activeEditor = null;
    const wasEmptyBox = o && o.placeholder === 'textbox' && !o.text.trim();
    S.editingId = null;
    if (wasEmptyBox) {
      const s = PP.slide();
      s.objects = s.objects.filter(function (x) { return x.id !== o.id; });
      PP.clearSelection();
    }
    PP.commit('Edit Text');
    PP.render();
  };

  function cleanHTML(html) {
    // drop empty trailing structure but keep formatting
    if (html === '<br>' || html === '') return '<div><br></div>';
    return html;
  }

  /* ---------- format routing (used by ribbon & shortcuts) ---------- */
  // kind: 'bold','italic','underline','strike','foreColor','backColor','fontName','fontSize','align'
  PP.formatText = function (kind, val) {
    if (S.editingId && activeEditor) {
      activeEditor.focus();
      runExec(activeEditor, kind, val);
      const o = PP.findObj(S.editingId);
      o.html = activeEditor.innerHTML;
      o.text = activeEditor.innerText.replace(/\n$/, '');
      o._touched = true;
      reflectObjectLevel(o, kind, val);
      PP.renderThumbs(); PP.syncRibbonState();
      return true;
    }
    const objs = PP.selectedTextObjs();
    if (!objs.length) return false;
    objs.forEach(function (o) {
      applyOffscreen(o, kind, val);
      reflectObjectLevel(o, kind, val);
      o._touched = o._touched || (kind !== 'align');
    });
    PP.commit('Format');
    return true;
  };

  function runExec(root, kind, val) {
    if (kind === 'bold') document.execCommand('bold');
    else if (kind === 'italic') document.execCommand('italic');
    else if (kind === 'underline') document.execCommand('underline');
    else if (kind === 'strike') document.execCommand('strikeThrough');
    else if (kind === 'foreColor') document.execCommand('foreColor', false, val);
    else if (kind === 'backColor') document.execCommand('hiliteColor', false, val) || document.execCommand('backColor', false, val);
    else if (kind === 'fontName') document.execCommand('fontName', false, val);
    else if (kind === 'fontSize') setFontSize(root, val);
    else if (kind === 'align') document.execCommand('justify' + ({ left: 'Left', center: 'Center', right: 'Right', justify: 'Full' }[val] || 'Left'));
  }

  // arbitrary px font size via the classic font[size=7] swap (needs styleWithCSS OFF)
  function setFontSize(root, px) {
    try { document.execCommand('styleWithCSS', false, false); } catch (e) {}
    document.execCommand('fontSize', false, '7');
    Array.prototype.forEach.call(root.querySelectorAll('font[size="7"]'), function (f) {
      const span = document.createElement('span');
      span.style.fontSize = px + 'px';
      while (f.firstChild) span.appendChild(f.firstChild);
      f.replaceWith(span);
    });
    try { document.execCommand('styleWithCSS', false, true); } catch (e) {}
  }

  // apply to whole box without visible focus change
  function applyOffscreen(o, kind, val) {
    const hidden = document.createElement('div');
    hidden.setAttribute('contenteditable', 'true');
    hidden.style.cssText = 'position:fixed;left:-99999px;top:0;width:600px;white-space:pre-wrap';
    hidden.innerHTML = (o.html && o.html !== '') ? o.html : PP.linesToBlocks(o.text);
    document.body.appendChild(hidden);
    hidden.focus();
    try { document.execCommand('styleWithCSS', false, true); } catch (e) {}
    const sel = window.getSelection();
    const r = document.createRange(); r.selectNodeContents(hidden);
    sel.removeAllRanges(); sel.addRange(r);
    runExec(hidden, kind, val);
    o.html = hidden.innerHTML;
    o.text = hidden.innerText.replace(/\n$/, '');
    hidden.remove();
  }

  // keep object-level props in sync so the ribbon reflects state & defaults cascade
  function reflectObjectLevel(o, kind, val) {
    if (kind === 'bold') o.bold = !o.bold;
    else if (kind === 'italic') o.italic = !o.italic;
    else if (kind === 'underline') o.underline = !o.underline;
    else if (kind === 'strike') o.strike = !o.strike;
    else if (kind === 'foreColor') o.color = val;
    else if (kind === 'fontName') o.fontFamily = val;
    else if (kind === 'fontSize') o.fontSize = parseFloat(val);
    else if (kind === 'align') o.align = val;
  }

  PP.applyEditorStyle = function () { PP.refreshActiveEditor(); };
  PP.refreshActiveEditor = function () {
    if (!S.editingId || !activeEditor) return;
    const o = PP.findObj(S.editingId);
    activeEditor.style.textAlign = o.align;
  };

  // Read formatting state of the current caret/selection for the ribbon.
  PP.queryTextState = function () {
    if (S.editingId && activeEditor) {
      let fs = '';
      try {
        const sel = window.getSelection();
        let n = sel.anchorNode; if (n && n.nodeType === 3) n = n.parentNode;
        if (n) { fs = Math.round(parseFloat(getComputedStyle(n).fontSize)); }
      } catch (e) {}
      let fam = '';
      try { fam = document.queryCommandValue('fontName').replace(/['"]/g, ''); } catch (e) {}
      return {
        bold: q('bold'), italic: q('italic'), underline: q('underline'), strike: q('strikeThrough'),
        align: q('justifyCenter') ? 'center' : q('justifyRight') ? 'right' : q('justifyFull') ? 'justify' : 'left',
        fontSize: fs, fontFamily: fam
      };
    }
    return null;
  };
  function q(c) { try { return document.queryCommandState(c); } catch (e) { return false; } }

})(window.PP);
