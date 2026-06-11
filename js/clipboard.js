/* ============ clipboard.js — copy / cut / paste / duplicate ============ */
(function (PP) {
  'use strict';
  const S = PP.State;
  let board = null;       // { kind:'objects'|'slide', data:[...] }
  let pasteCount = 0;

  PP.copy = function () {
    if (S.view === 'sorter' || !S.selection.length) {
      board = { kind: 'slide', data: PP.deepClone(PP.slide()) };
      PP.status('Slide copied');
      return;
    }
    const objs = PP.selectedObjs().map(PP.deepClone);
    if (objs.length) { board = { kind: 'objects', data: objs }; pasteCount = 0; PP.status('Copied'); }
  };

  PP.cut = function () {
    if (!S.selection.length) { PP.copy(); return; }
    PP.copy();
    PP.deleteSelected();
    PP.status('Cut');
  };

  PP.paste = function () {
    if (!board) return;
    if (board.kind === 'slide') {
      const copy = PP.deepClone(board.data);
      copy.id = PP.uid('slide');
      copy.objects.forEach(function (o) { o.id = PP.uid('obj'); });
      PP.addSlide(copy);
      return;
    }
    pasteCount++;
    const off = 20 * pasteCount;
    const newIds = [];
    const gidMap = {};
    board.data.forEach(function (src) {
      const o = PP.deepClone(src);
      o.id = PP.uid('obj');
      if (o.groupId) { gidMap[o.groupId] = gidMap[o.groupId] || PP.uid('grp'); o.groupId = gidMap[o.groupId]; }
      o.x += off; o.y += off;
      PP.slide().objects.push(o);
      newIds.push(o.id);
    });
    PP.select(newIds);
    PP.commit('Paste');
    PP.status('Pasted');
  };

  PP.duplicate = function () {
    if (!S.selection.length) { PP.duplicateSlide(); return; }
    const newIds = [];
    const gidMap = {};
    PP.selectedObjs().forEach(function (src) {
      const o = PP.deepClone(src);
      o.id = PP.uid('obj');
      if (o.groupId) { gidMap[o.groupId] = gidMap[o.groupId] || PP.uid('grp'); o.groupId = gidMap[o.groupId]; }
      o.x += 16; o.y += 16;
      PP.slide().objects.push(o);
      newIds.push(o.id);
    });
    PP.select(newIds);
    PP.commit('Duplicate');
  };

  PP.selectAll = function () {
    if (S.editingId) return;
    PP.select(PP.slide().objects.map(function (o) { return o.id; }));
    PP.emit('change');
  };

  // System paste — only used to bring OS-clipboard IMAGES (e.g. screenshots) in.
  // Object/slide copy-cut-paste is handled by the keyboard layer to avoid double-fires.
  PP.initClipboard = function () {
    window.addEventListener('paste', function (e) {
      if (S.editingId) return; // let text editor handle
      const items = (e.clipboardData || {}).items || [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') === 0) {
          const file = items[i].getAsFile();
          const reader = new FileReader();
          reader.onload = function (ev) {
            const img = new Image();
            img.onload = function () { PP.insertImageFromDataURL(ev.target.result, img.width, img.height); };
            img.src = ev.target.result;
          };
          reader.readAsDataURL(file);
          e.preventDefault();
        }
      }
    });
  };

})(window.PP);
