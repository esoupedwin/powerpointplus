/* ============ slideshow.js — themes, transitions, animations & presentation mode ============ */
(function (PP) {
  'use strict';
  const S = PP.State;

  /* ---------- themes ---------- */
  PP.THEMES = [
    { name: 'Office', accent: '#4472C4', bg: '#FFFFFF', font: 'Calibri', title: '#262626' },
    { name: 'Facet', accent: '#90C226', bg: '#FFFFFF', font: 'Trebuchet MS', title: '#2C3E1F' },
    { name: 'Ion', accent: '#1CADE4', bg: '#0B1F2A', font: 'Century Gothic', title: '#FFFFFF' },
    { name: 'Berlin', accent: '#F2A007', bg: '#1A1A1A', font: 'Trebuchet MS', title: '#FFFFFF' },
    { name: 'Wisp', accent: '#765F1E', bg: '#FBF9F4', font: 'Century Gothic', title: '#5A4A1A' },
    { name: 'Slice', accent: '#C0504D', bg: '#FFFFFF', font: 'Calibri', title: '#943634' },
    { name: 'Dividend', accent: '#1A6FC4', bg: '#F4F4F4', font: 'Verdana', title: '#1F3864' },
    { name: 'Crop', accent: '#5C8A3A', bg: '#FFFFFF', font: 'Cambria', title: '#3A5A1A' },
  ];

  PP.applyTheme = function (name) {
    const t = PP.THEMES.find(function (x) { return x.name === name; });
    if (!t) return;
    S.doc.theme = { name: t.name, accent: t.accent, bg: t.bg, font: t.font };
    S.doc.slides.forEach(function (slide) {
      if (!slide._bgCustom) slide.background = t.bg;
      slide.objects.forEach(function (o) {
        if (o.placeholder === 'title') o.color = t.title;
      });
    });
    PP.commit('Apply Theme ' + name);
    PP.status('Theme: ' + name);
  };

  /* ---------- transitions ---------- */
  PP.TRANSITIONS = [
    { id: 'none', name: 'None', icon: '&#9633;' },
    { id: 'fade', name: 'Fade', icon: '&#9681;' },
    { id: 'push', name: 'Push', icon: '&#8677;' },
    { id: 'wipe', name: 'Wipe', icon: '&#9698;' },
    { id: 'split', name: 'Split', icon: '&#9707;' },
    { id: 'cut', name: 'Cut', icon: '&#9634;' },
    { id: 'uncover', name: 'Uncover', icon: '&#8689;' },
    { id: 'zoom', name: 'Zoom', icon: '&#128269;' },
    { id: 'morph', name: 'Morph', icon: '&#8634;' },
    { id: 'fall', name: 'Fall Over', icon: '&#8615;' },
  ];

  PP.setTransition = function (id, all) {
    if (all) {
      S.doc.slides.forEach(function (s) { s.transition.type = id; });
      PP.status('Applied "' + id + '" to all slides');
    } else {
      PP.slide().transition.type = id;
    }
    PP.commit('Transition');
    if (typeof PP.renderRibbon === 'function') PP.renderRibbon();
    // quick preview
    previewTransition(id);
  };

  function previewTransition(id) {
    if (id === 'none') return;
    const c = document.getElementById('slide-canvas');
    c.style.animation = 'none';
    void c.offsetWidth;
    c.style.animation = 'show-' + id + ' 600ms ease';
    setTimeout(function () { c.style.animation = 'none'; }, 650);
  }

  /* ---------- animations ---------- */
  PP.ANIMATIONS = [
    { id: 'none', name: 'None', icon: '&#9633;' },
    { id: 'fadeIn', name: 'Appear', icon: '&#10022;' },
    { id: 'fly', name: 'Fly In', icon: '&#8599;' },
    { id: 'float', name: 'Float In', icon: '&#8593;' },
    { id: 'wipe', name: 'Wipe', icon: '&#9698;' },
    { id: 'zoomIn', name: 'Zoom', icon: '&#128269;' },
    { id: 'bounce', name: 'Bounce', icon: '&#9679;' },
    { id: 'spin', name: 'Spin', icon: '&#8635;' },
  ];

  PP.setAnimation = function (id) {
    const objs = PP.selectedObjs();
    if (!objs.length) { PP.status('Select an object to animate'); return; }
    objs.forEach(function (o) { o.animation = id === 'none' ? null : id; });
    PP.commit('Animation');
    PP.status('Animation: ' + id);
  };

  /* ---------- presentation overlay ---------- */
  let show = null;

  PP.isShowOpen = function () { return !!show; };

  PP.startShow = function (fromIndex, presenter) {
    injectStyles();
    show = { index: fromIndex || 0, pen: false, presenter: !!presenter, startedAt: nowMs() };
    const overlay = document.getElementById('slideshow');
    overlay.classList.remove('hidden');
    overlay.classList.toggle('presenter-mode', !!presenter);
    if (overlay.requestFullscreen) overlay.requestFullscreen().catch(function () {});
    document.addEventListener('keydown', onShowKey, true);
    overlay.addEventListener('click', onShowClick);
    overlay.addEventListener('contextmenu', onShowRight);
    document.getElementById('show-controls').addEventListener('click', onCtl);
    window.addEventListener('resize', sizeShow);
    if (presenter) timerId = setInterval(updateTimer, 500);
    renderShow(false);
  };
  PP.startPresenter = function (fromIndex) { PP.startShow(fromIndex == null ? S.current : fromIndex, true); };

  function nowMs() { try { return performance.now(); } catch (e) { return 0; } }
  let timerId = null;
  function updateTimer() {
    const el = document.getElementById('pv-elapsed'); if (!el || !show) return;
    const sec = Math.floor((nowMs() - show.startedAt) / 1000);
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    el.textContent = (h ? h + ':' : '') + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    const clk = document.getElementById('pv-clock');
    if (clk) { const d = new Date(); clk.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  }

  function endShow() {
    if (!show) return;
    if (timerId) { clearInterval(timerId); timerId = null; }
    document.removeEventListener('keydown', onShowKey, true);
    const overlay = document.getElementById('slideshow');
    overlay.classList.add('hidden');
    overlay.classList.remove('presenter-mode');
    overlay.removeEventListener('click', onShowClick);
    overlay.removeEventListener('contextmenu', onShowRight);
    document.getElementById('show-controls').removeEventListener('click', onCtl);
    window.removeEventListener('resize', sizeShow);
    const pv = document.getElementById('presenter'); if (pv) pv.remove();
    document.getElementById('show-stage').style.display = '';
    if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
    show = null;
    PP.goToSlide(S.current);
    PP.render();
  }
  PP.endShow = endShow;

  // build a scaled slide node (shared by show + presenter + previews)
  function buildSlideNode(index, animate) {
    const slide = S.doc.slides[index];
    const node = PP.el('div', { class: 'show-slide', style: 'position:absolute;top:0;left:0;width:' + PP.SLIDE_W + 'px;height:' + PP.SLIDE_H + 'px;transform-origin:top left;background:' + (slide.background || '#fff') });
    slide.objects.forEach(function (o) {
      const n = PP.objNode(o);
      n.style.pointerEvents = 'none';
      if (animate && o.animation) { n.classList.add('anim-' + o.animation); n.style.animationDelay = (0.15 * slide.objects.indexOf(o)) + 's'; }
      node.appendChild(n);
    });
    return node;
  }
  function fitSlide(wrap, node, boxW, boxH) {
    const scale = Math.min(boxW / PP.SLIDE_W, boxH / PP.SLIDE_H);
    node.style.transform = 'scale(' + scale + ')';
    wrap.style.width = (PP.SLIDE_W * scale) + 'px';
    wrap.style.height = (PP.SLIDE_H * scale) + 'px';
    wrap.innerHTML = ''; wrap.appendChild(node);
  }

  function onCtl(e) {
    const b = e.target.closest('button'); if (!b) return;
    e.stopPropagation();
    const a = b.dataset.show;
    if (a === 'next') next();
    else if (a === 'prev') prev();
    else if (a === 'end') endShow();
    else if (a === 'pen') { show.pen = !show.pen; document.getElementById('slideshow').classList.toggle('show-cursor', show.pen); }
  }

  function onShowClick(e) {
    if (show && show.presenter) return; // presenter panes have their own handlers
    if (e.target.closest('#show-controls')) return;
    next();
  }
  function onShowRight(e) { e.preventDefault(); prev(); }

  function next() {
    if (show.index < S.doc.slides.length - 1) { show.index++; renderShow(true); }
    else endShow();
  }
  function prev() { if (show.index > 0) { show.index--; renderShow(true); } }

  function onShowKey(e) {
    if (!show) return;
    const k = e.key;
    if (k === 'Escape') { e.preventDefault(); endShow(); }
    else if (k === ' ' || k === 'ArrowRight' || k === 'ArrowDown' || k === 'Enter' || k === 'PageDown' || k === 'n') { e.preventDefault(); next(); }
    else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'Backspace' || k === 'PageUp' || k === 'p') { e.preventDefault(); prev(); }
    else if (k === 'Home') { e.preventDefault(); show.index = 0; renderShow(true); }
    else if (k === 'End') { e.preventDefault(); show.index = S.doc.slides.length - 1; renderShow(true); }
    else if (/^[0-9]$/.test(k)) { /* type slide number then Enter — simplified: jump */ }
    e.stopPropagation();
  }

  function sizeShow() {
    if (show && show.presenter) { renderPresenter(); return; }
    const stage = document.getElementById('show-stage');
    const slide = stage.querySelector('.show-slide');
    if (!slide) return;
    const scale = Math.min(innerWidth / PP.SLIDE_W, innerHeight / PP.SLIDE_H);
    stage.style.width = (PP.SLIDE_W * scale) + 'px';
    stage.style.height = (PP.SLIDE_H * scale) + 'px';
    slide.style.transform = 'scale(' + scale + ')';
  }

  function renderShow(animate) {
    if (show.presenter) { renderPresenter(); return; }
    const slide = S.doc.slides[show.index];
    const stage = document.getElementById('show-stage');
    const node = buildSlideNode(show.index, true);
    const trans = (animate && slide.transition && slide.transition.type) || 'none';
    stage.innerHTML = '';
    stage.appendChild(node);
    sizeShow();
    if (animate && trans !== 'none' && trans !== 'cut') {
      node.style.animation = 'show-' + trans + ' ' + (slide.transition.duration || 700) + 'ms ease';
    }
  }

  /* ---------- presenter view ---------- */
  function renderPresenter() {
    document.getElementById('show-stage').style.display = 'none';
    const overlay = document.getElementById('slideshow');
    let pv = document.getElementById('presenter');
    if (!pv) {
      pv = PP.el('div', { id: 'presenter' });
      pv.innerHTML =
        '<div class="pv-top"><span id="pv-elapsed">0:00</span>' +
        '<span class="pv-tip">Tap the current slide or press → to advance</span>' +
        '<span id="pv-clock"></span></div>' +
        '<div class="pv-main"><div class="pv-current-wrap"><div class="pv-current"></div></div>' +
        '<div class="pv-side"><div class="pv-lbl">Next slide</div><div class="pv-next"></div>' +
        '<div class="pv-lbl">Notes</div><div class="pv-notes"></div></div></div>' +
        '<div class="pv-controls"><button data-show="prev" title="Previous">&#9664;</button>' +
        '<span id="pv-slidenum"></span>' +
        '<button data-show="next" title="Next">&#9654;</button>' +
        '<button data-show="end" title="End Show (Esc)">&#10005; End</button></div>';
      overlay.appendChild(pv);
      pv.querySelector('.pv-controls').addEventListener('click', onCtl);
      pv.querySelector('.pv-current-wrap').addEventListener('click', function () { next(); });
    }
    // current slide
    const curBox = pv.querySelector('.pv-current');
    const cw = pv.querySelector('.pv-current-wrap').clientWidth - 20, ch = pv.querySelector('.pv-current-wrap').clientHeight - 20;
    fitSlide(curBox, buildSlideNode(show.index, false), cw || 700, ch || 460);
    // next slide
    const nextBox = pv.querySelector('.pv-next');
    if (show.index < S.doc.slides.length - 1) {
      fitSlide(nextBox, buildSlideNode(show.index + 1, false), nextBox.clientWidth || 300, nextBox.clientHeight || 170);
    } else { nextBox.innerHTML = '<div class="pv-end">End of slide show</div>'; nextBox.style.width = ''; nextBox.style.height = ''; }
    // notes
    pv.querySelector('.pv-notes').textContent = S.doc.slides[show.index].notes || '';
    pv.querySelector('#pv-slidenum').textContent = (show.index + 1) + ' / ' + S.doc.slides.length;
    updateTimer();
  }

  /* ---------- inject keyframes ---------- */
  let injected = false;
  function injectStyles() {
    if (injected) return; injected = true;
    const css = `
    @keyframes show-fade{from{opacity:0}to{opacity:1}}
    @keyframes show-push{from{transform:translateX(100%)}to{transform:translateX(0)}}
    @keyframes show-wipe{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
    @keyframes show-split{from{clip-path:inset(0 50% 0 50%)}to{clip-path:inset(0 0 0 0)}}
    @keyframes show-uncover{from{transform:translateY(100%)}to{transform:translateY(0)}}
    @keyframes show-zoom{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}
    @keyframes show-morph{from{opacity:.2;transform:scale(1.04)}to{opacity:1;transform:scale(1)}}
    @keyframes show-fall{from{transform:perspective(800px) rotateX(-90deg);opacity:0}to{transform:perspective(800px) rotateX(0);opacity:1}}
    .anim-fadeIn{animation:a-fade .6s both}
    .anim-fly{animation:a-fly .6s both}
    .anim-float{animation:a-float .6s both}
    .anim-wipe{animation:a-wipe .6s both}
    .anim-zoomIn{animation:a-zoom .6s both}
    .anim-bounce{animation:a-bounce .8s both}
    .anim-spin{animation:a-spin .7s both}
    @keyframes a-fade{from{opacity:0}to{opacity:1}}
    @keyframes a-fly{from{opacity:0;transform:translate(-60px,40px)}to{opacity:1;transform:none}}
    @keyframes a-float{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:none}}
    @keyframes a-wipe{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
    @keyframes a-zoom{from{opacity:0;transform:scale(.3)}to{opacity:1;transform:scale(1)}}
    @keyframes a-bounce{0%{opacity:0;transform:translateY(-60px)}60%{opacity:1;transform:translateY(12px)}100%{transform:translateY(0)}}
    @keyframes a-spin{from{opacity:0;transform:rotate(-180deg) scale(.5)}to{opacity:1;transform:none}}
    .show-slide{box-shadow:0 0 1px rgba(0,0,0,.2)}
    `;
    document.head.appendChild(PP.el('style', { html: css }));
  }

})(window.PP);
