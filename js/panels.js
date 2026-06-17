/* ============ panels.js — Selection Pane ============ */
(function (PP) {
  'use strict';
  const S = PP.State;

  const TYPE_NAMES = {
    text: 'TextBox', rect: 'Rectangle', roundRect: 'Rounded Rectangle', ellipse: 'Oval',
    triangle: 'Triangle', diamond: 'Diamond', image: 'Picture', line: 'Line', arrow: 'Arrow',
    table: 'Table', chart: 'Chart', smartart: 'Diagram', freeform: 'Freeform'
  };
  PP.objDisplayName = function (o, slide) {
    if (o.name) return o.name;
    slide = slide || PP.slide();
    const base = TYPE_NAMES[o.type] || (o.type ? o.type[0].toUpperCase() + o.type.slice(1) : 'Shape');
    let n = 0;
    for (let i = 0; i < slide.objects.length; i++) {
      if ((TYPE_NAMES[slide.objects[i].type] || '') === base || slide.objects[i].type === o.type) { n++; if (slide.objects[i] === o) break; }
    }
    return base + ' ' + n;
  };

  let pane = null;
  PP.isSelectionPaneOpen = function () { return !!pane; };
  PP.toggleSelectionPane = function () {
    if (pane) { closePane(); return; }
    pane = PP.el('div', { class: 'sel-pane' });
    pane.innerHTML =
      '<div class="sp-title">Selection <button class="sp-close" title="Close">&times;</button></div>' +
      '<div class="sp-tools">' +
      '<button data-sp="showall">Show All</button><button data-sp="hideall">Hide All</button>' +
      '<span class="sp-spacer"></span>' +
      '<button data-sp="fwd" title="Bring Forward">&#9650;</button><button data-sp="back" title="Send Backward">&#9660;</button>' +
      '</div><div class="sp-list"></div>';
    document.body.appendChild(pane);
    pane.querySelector('.sp-close').addEventListener('click', closePane);
    pane.querySelector('.sp-tools').addEventListener('click', function (e) {
      const b = e.target.closest('button'); if (!b) return;
      const a = b.dataset.sp;
      if (a === 'showall') { PP.slide().objects.forEach(function (o) { o.hidden = false; }); PP.commit('Show All'); }
      else if (a === 'hideall') { PP.slide().objects.forEach(function (o) { o.hidden = true; }); PP.clearSelection(); PP.commit('Hide All'); }
      else if (a === 'fwd') { PP.zOrder('forward'); }
      else if (a === 'back') { PP.zOrder('backward'); }
      renderPane();
    });
    position();
    renderPane();
  };
  function closePane() { if (pane) { pane.remove(); pane = null; } }
  PP.closeSelectionPane = closePane;

  function position() {
    if (!pane) return;
    const ed = document.getElementById('editor').getBoundingClientRect();
    pane.style.top = (ed.top + 12) + 'px';
    pane.style.right = '14px';
  }

  PP.renderSelectionPane = function () { if (pane) renderPane(); };
  function renderPane() {
    if (!pane) return;
    const list = pane.querySelector('.sp-list');
    list.innerHTML = '';
    const objs = PP.slide().objects;
    // front-most first (top of list)
    for (let i = objs.length - 1; i >= 0; i--) {
      const o = objs[i];
      const row = PP.el('div', { class: 'sp-row' + (PP.isSelected(o.id) ? ' sel' : ''), dataset: { id: o.id } });
      const eye = PP.el('button', { class: 'sp-eye' + (o.hidden ? ' off' : ''), title: o.hidden ? 'Show' : 'Hide', html: o.hidden ? '&#8212;' : '&#128065;' });
      eye.addEventListener('click', function (e) { e.stopPropagation(); o.hidden = !o.hidden; if (o.hidden && PP.isSelected(o.id)) PP.select(PP.State.selection.filter(function (x) { return x !== o.id; })); PP.commit('Visibility'); renderPane(); });
      const name = PP.el('span', { class: 'sp-name', text: PP.objDisplayName(o) });
      name.addEventListener('dblclick', function (e) {
        e.stopPropagation();
        const inp = PP.el('input', { class: 'sp-rename', value: name.textContent });
        name.replaceWith(inp); inp.focus(); inp.select();
        function commit() { o.name = inp.value.trim() || undefined; PP.commit('Rename'); renderPane(); }
        inp.addEventListener('blur', commit);
        inp.addEventListener('keydown', function (ev) { ev.stopPropagation(); if (ev.key === 'Enter') inp.blur(); if (ev.key === 'Escape') { inp.value = name.textContent; inp.blur(); } });
      });
      row.appendChild(eye); row.appendChild(name);
      row.addEventListener('mousedown', function (e) {
        if (e.target.closest('.sp-eye')) return;
        PP.select(o.id, e.shiftKey); PP.emit('change');
      });
      list.appendChild(row);
    }
  }

  // keep pane in sync
  PP.on('selection', function () { if (pane) renderPane(); });
  PP.on('slidechange', function () { if (pane) renderPane(); });

  /* ============ Animation Pane ============ */
  const EFFECT_NAMES = { fadeIn: 'Appear', fly: 'Fly In', float: 'Float In', wipe: 'Wipe', zoomIn: 'Zoom', bounce: 'Bounce', spin: 'Spin' };
  const TRIGGER_ICON = { click: '&#128432;', withPrev: '&#9201;', afterPrev: '&#8987;' };
  let apane = null;
  PP.isAnimationPaneOpen = function () { return !!apane; };
  PP.toggleAnimationPane = function () {
    if (apane) { closeAP(); return; }
    apane = PP.el('div', { class: 'sel-pane anim-pane' });
    apane.innerHTML =
      '<div class="sp-title">Animation Pane <button class="sp-close">&times;</button></div>' +
      '<div class="sp-tools"><button data-ap="play">&#9654; Play From</button></div>' +
      '<div class="sp-list ap-list"></div>';
    document.body.appendChild(apane);
    apane.querySelector('.sp-close').addEventListener('click', closeAP);
    apane.querySelector('.sp-tools').addEventListener('click', function (e) {
      if (e.target.closest('button')) PP.previewAnimations();
    });
    const ed = document.getElementById('editor').getBoundingClientRect();
    apane.style.top = (ed.top + 12) + 'px'; apane.style.right = '14px';
    renderAP();
  };
  function closeAP() { if (apane) { apane.remove(); apane = null; } }
  PP.closeAnimationPane = closeAP;
  PP.renderAnimPane = function () { if (apane) renderAP(); };

  function renderAP() {
    const list = apane.querySelector('.ap-list'); list.innerHTML = '';
    const slide = PP.slide(), anims = PP.slideAnims(slide);
    if (!anims.length) { list.appendChild(PP.el('div', { class: 'ap-empty', text: 'No animations. Select an object and pick an effect on the Animations tab.' })); return; }
    anims.forEach(function (a) {
      const o = PP.findObj(a.objId, slide); if (!o) return;
      const num = PP.animNumberFor(slide, a.objId);
      const row = PP.el('div', { class: 'ap-row' + (PP.isSelected(a.objId) ? ' sel' : '') });
      row.appendChild(PP.el('span', { class: 'ap-num', text: String(num) }));
      row.appendChild(PP.el('span', { class: 'ap-trig', html: TRIGGER_ICON[a.trigger] || '' , title: a.trigger }));
      row.appendChild(PP.el('span', { class: 'ap-name', text: (EFFECT_NAMES[a.effect] || a.effect) + ' · ' + PP.objDisplayName(o, slide) }));
      const up = PP.el('button', { class: 'ap-btn', html: '&#9650;', title: 'Move earlier', onclick: function (e) { e.stopPropagation(); PP.moveAnim(a.objId, -1); } });
      const down = PP.el('button', { class: 'ap-btn', html: '&#9660;', title: 'Move later', onclick: function (e) { e.stopPropagation(); PP.moveAnim(a.objId, 1); } });
      const rm = PP.el('button', { class: 'ap-btn', html: '&times;', title: 'Remove', onclick: function (e) { e.stopPropagation(); PP.removeAnim(a.objId); } });
      row.appendChild(up); row.appendChild(down); row.appendChild(rm);
      row.addEventListener('mousedown', function (e) { if (e.target.closest('.ap-btn')) return; PP.select(a.objId); PP.emit('change'); });
      list.appendChild(row);
    });
  }
  PP.on('selection', function () { if (apane) renderAP(); });
  PP.on('slidechange', function () { if (apane) renderAP(); });

})(window.PP);
