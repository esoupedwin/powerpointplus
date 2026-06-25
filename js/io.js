/* ============ io.js — persistence: localStorage, file open/save/export ============ */
(function (PP) {
  'use strict';
  const S = PP.State;
  const KEY = 'pp_replica_doc';

  PP.save = function () {
    try {
      localStorage.setItem(KEY, JSON.stringify(S.doc));
      S.dirty = false;
      PP.status('Saved to browser storage ✓');
    } catch (e) {
      PP.status('Save failed (storage full?) — use Save As to download');
    }
    PP.updateStatus();
  };

  PP.loadLocal = function () {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  };

  PP.exportFile = function () {
    const blob = new Blob([JSON.stringify(S.doc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = PP.el('a', { href: url, download: (S.doc.title || 'Presentation') + '.pptx.json' });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    PP.status('Downloaded ' + a.download);
  };

  PP.openFile = function (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const doc = JSON.parse(e.target.result);
        if (!doc.slides) throw new Error('bad');
        PP.initState(doc);
        PP.render(); PP.fitToWindow();
        PP.status('Opened ' + file.name);
      } catch (err) { PP.status('Could not open file — not a valid presentation'); }
    };
    reader.readAsText(file);
  };

  PP.initIO = function () {
    // image insert
    document.getElementById('file-image').addEventListener('change', function () {
      const replaceId = PP._replaceImgId; PP._replaceImgId = null;
      Array.prototype.forEach.call(this.files, function (file, idx) {
        const reader = new FileReader();
        reader.onload = function (e) {
          if (replaceId && idx === 0) {
            const o = PP.findObj(replaceId);
            if (o) { o.src = e.target.result; o.crop = null; PP.commit('Change Picture'); PP.render(); return; }
          }
          const img = new Image();
          img.onload = function () { PP.insertImageFromDataURL(e.target.result, img.width, img.height); };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      });
      this.value = '';
    });
    // video / audio insert
    document.getElementById('file-video').addEventListener('change', function () {
      if (this.files[0]) { const r = new FileReader(); r.onload = function (e) { PP.insertVideoData(e.target.result); }; r.readAsDataURL(this.files[0]); }
      this.value = '';
    });
    document.getElementById('file-audio').addEventListener('change', function () {
      if (this.files[0]) { const r = new FileReader(); r.onload = function (e) { PP.insertAudioData(e.target.result); }; r.readAsDataURL(this.files[0]); }
      this.value = '';
    });
    // open file
    document.getElementById('file-open').addEventListener('change', function () {
      if (this.files[0]) PP.openFile(this.files[0]);
      this.value = '';
    });

    // autosave on changes (debounced)
    let t = null;
    PP.on('change', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        try { localStorage.setItem(KEY, JSON.stringify(S.doc)); S.dirty = false; } catch (e) {}
      }, 1200);
    });

    // warn on unload if dirty
    window.addEventListener('beforeunload', function (e) {
      if (S.dirty) { e.preventDefault(); e.returnValue = ''; }
    });

    // drag-and-drop image files from the desktop onto the slide
    const scroll = document.getElementById('canvas-scroll');
    scroll.addEventListener('dragover', function (e) {
      if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types, 'Files') >= 0) {
        e.preventDefault(); e.dataTransfer.dropEffect = 'copy';
      }
    });
    scroll.addEventListener('drop', function (e) {
      if (!e.dataTransfer || !e.dataTransfer.files.length) return;
      e.preventDefault();
      const sp = PP.screenToSlide(e.clientX, e.clientY);
      Array.prototype.forEach.call(e.dataTransfer.files, function (file, i) {
        if (file.type.indexOf('image') !== 0) return;
        const reader = new FileReader();
        reader.onload = function (ev) {
          const img = new Image();
          img.onload = function () {
            const o = PP.insertImageFromDataURL(ev.target.result, img.width, img.height);
            o.x = sp.x - o.w / 2 + i * 18; o.y = sp.y - o.h / 2 + i * 18;
            PP.commit('Insert Picture'); PP.render();
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      });
    });
  };

})(window.PP);
