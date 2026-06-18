/* ============ state.js — data model, undo/redo, mutations ============ */
(function (PP) {
  'use strict';

  // Logical slide dimensions (16:9). All object coords are in these units.
  PP.SLIDE_W = 1280;
  PP.SLIDE_H = 720;

  const State = {
    doc: null,
    current: 0,        // current slide index
    selection: [],     // array of object ids on current slide
    zoom: 1,
    fitMode: true,
    view: 'normal',    // normal | sorter
    editingId: null,   // object id being text-edited
    history: [],
    histPos: -1,
    dirty: false,
  };
  PP.State = State;

  /* ---------- factories ---------- */
  PP.makeObject = function (type, props) {
    const base = {
      id: PP.uid('obj'),
      type: type,
      x: 440, y: 280, w: 400, h: 160, rotation: 0,
      fill: '#4472C4', stroke: '#2F528F', strokeWidth: 1,
      opacity: 1,
      // text
      text: '', fontFamily: 'Calibri', fontSize: 18, color: '#000000',
      bold: false, italic: false, underline: false, strike: false,
      align: 'left', valign: 'middle', lineHeight: 1.1, bullet: null,
      // image
      src: null,
      locked: false,
    };
    return Object.assign(base, props || {});
  };

  PP.makeSlide = function (layout) {
    const s = { id: PP.uid('slide'), background: '#FFFFFF', objects: [], notes: '',
      transition: { type: 'none', duration: 1000 }, layout: layout || 'title-content' };
    return s;
  };

  PP.titleSlide = function () {
    const s = PP.makeSlide('title');
    s.objects.push(PP.makeObject('text', {
      x: 160, y: 230, w: 960, h: 140, text: 'Click to add title',
      fontSize: 54, bold: false, color: '#262626', align: 'center', valign: 'middle',
      fill: 'none', stroke: 'none', placeholder: 'title'
    }));
    s.objects.push(PP.makeObject('text', {
      x: 260, y: 390, w: 760, h: 80, text: 'Click to add subtitle',
      fontSize: 24, color: '#595959', align: 'center', valign: 'middle',
      fill: 'none', stroke: 'none', placeholder: 'subtitle'
    }));
    return s;
  };

  PP.contentSlide = function () {
    const s = PP.makeSlide('title-content');
    s.objects.push(PP.makeObject('text', {
      x: 80, y: 50, w: 1120, h: 110, text: 'Click to add title',
      fontSize: 40, bold: false, color: '#262626', align: 'left', valign: 'middle',
      fill: 'none', stroke: 'none', placeholder: 'title'
    }));
    s.objects.push(PP.makeObject('text', {
      x: 80, y: 180, w: 1120, h: 480, text: 'Click to add text',
      fontSize: 24, color: '#262626', align: 'left', valign: 'top',
      fill: 'none', stroke: 'none', placeholder: 'body', bullet: 'disc'
    }));
    return s;
  };

  /* ---------- layouts ---------- */
  PP.LAYOUTS = [
    { id: 'title', name: 'Title Slide' },
    { id: 'title-content', name: 'Title and Content' },
    { id: 'section', name: 'Section Header' },
    { id: 'two-content', name: 'Two Content' },
    { id: 'title-only', name: 'Title Only' },
    { id: 'blank', name: 'Blank' },
    { id: 'caption', name: 'Picture with Caption' },
  ];

  PP.applyLayout = function (type) {
    const s = PP.slide();
    const oldTitle = s.objects.find(function (o) { return o.placeholder === 'title'; });
    const oldBody = s.objects.find(function (o) { return o.placeholder === 'body' || o.placeholder === 'subtitle'; });
    const keep = s.objects.filter(function (o) { return !o.placeholder; });
    const titleText = oldTitle && oldTitle._touched ? { text: oldTitle.text, html: oldTitle.html, _touched: true } : {};
    const bodyText = oldBody && oldBody._touched ? { text: oldBody.text, html: oldBody.html, _touched: true } : {};
    const ph = [];
    const T = function (o) { return PP.makeObject('text', Object.assign({ fill: 'none', stroke: 'none', color: '#262626' }, o)); };

    if (type === 'title') {
      ph.push(T(Object.assign({ x: 160, y: 230, w: 960, h: 140, text: 'Click to add title', fontSize: 54, align: 'center', valign: 'middle', placeholder: 'title' }, titleText)));
      ph.push(T(Object.assign({ x: 260, y: 390, w: 760, h: 80, text: 'Click to add subtitle', fontSize: 24, color: '#595959', align: 'center', valign: 'middle', placeholder: 'subtitle' }, bodyText)));
    } else if (type === 'title-content') {
      ph.push(T(Object.assign({ x: 80, y: 50, w: 1120, h: 110, text: 'Click to add title', fontSize: 40, valign: 'middle', placeholder: 'title' }, titleText)));
      ph.push(T(Object.assign({ x: 80, y: 180, w: 1120, h: 480, text: 'Click to add text', fontSize: 24, valign: 'top', bullet: 'disc', placeholder: 'body' }, bodyText)));
    } else if (type === 'section') {
      ph.push(T(Object.assign({ x: 80, y: 300, w: 1000, h: 120, text: 'Section title', fontSize: 48, bold: true, valign: 'middle', placeholder: 'title' }, titleText)));
      ph.push(T(Object.assign({ x: 80, y: 230, w: 1000, h: 60, text: 'Click to add text', fontSize: 22, color: '#595959', valign: 'middle', placeholder: 'subtitle' }, bodyText)));
    } else if (type === 'two-content') {
      ph.push(T(Object.assign({ x: 80, y: 50, w: 1120, h: 110, text: 'Click to add title', fontSize: 40, valign: 'middle', placeholder: 'title' }, titleText)));
      ph.push(T(Object.assign({ x: 80, y: 180, w: 540, h: 480, text: 'Click to add text', fontSize: 22, valign: 'top', bullet: 'disc', placeholder: 'body' }, bodyText)));
      ph.push(T({ x: 660, y: 180, w: 540, h: 480, text: 'Click to add text', fontSize: 22, valign: 'top', bullet: 'disc', placeholder: 'body' }));
    } else if (type === 'title-only') {
      ph.push(T(Object.assign({ x: 80, y: 50, w: 1120, h: 110, text: 'Click to add title', fontSize: 40, valign: 'middle', placeholder: 'title' }, titleText)));
    } else if (type === 'caption') {
      ph.push(T(Object.assign({ x: 80, y: 60, w: 460, h: 90, text: 'Click to add title', fontSize: 30, bold: true, valign: 'middle', placeholder: 'title' }, titleText)));
      ph.push(T(Object.assign({ x: 80, y: 170, w: 460, h: 480, text: 'Click to add text', fontSize: 18, valign: 'top', placeholder: 'body' }, bodyText)));
    } /* blank: no placeholders */

    s.objects = ph.concat(keep);
    s.layout = type;
    State.selection = [];
    PP.commit('Layout');
    PP.emit('slidechange');
  };

  PP.newDoc = function () {
    return {
      title: 'Presentation1',
      theme: { name: 'Office', accent: '#4472C4', bg: '#FFFFFF', font: 'Calibri' },
      size: { w: 1280, h: 720 },
      slides: [PP.titleSlide()],
    };
  };

  PP.setSlideSize = function (w, h, scaleObjects) {
    const ow = PP.SLIDE_W, oh = PP.SLIDE_H;
    if (w === ow && h === oh) return;
    PP.SLIDE_W = w; PP.SLIDE_H = h;
    State.doc.size = { w: w, h: h };
    if (scaleObjects) {
      const sx = w / ow, sy = h / oh, fs = Math.min(sx, sy);
      State.doc.slides.forEach(function (s) {
        s.objects.forEach(function (o) {
          o.x *= sx; o.y *= sy; o.w *= sx; o.h *= sy;
          if (o.fontSize) o.fontSize = Math.round(o.fontSize * fs);
        });
      });
    }
    PP.commit('Slide Size');
    PP.applyZoom(); PP.render(); PP.fitToWindow();
  };

  /* ---------- accessors ---------- */
  PP.slide = function () { return State.doc.slides[State.current]; };
  PP.slideAt = function (i) { return State.doc.slides[i]; };
  PP.findObj = function (id, slide) {
    slide = slide || PP.slide();
    return slide.objects.find(function (o) { return o.id === id; });
  };
  PP.selectedObjs = function () {
    const s = PP.slide();
    return State.selection.map(function (id) { return PP.findObj(id, s); }).filter(Boolean);
  };

  /* ---------- history ---------- */
  PP.snapshot = function (label) {
    // truncate redo branch
    State.history = State.history.slice(0, State.histPos + 1);
    State.history.push({ doc: PP.deepClone(State.doc), current: State.current, label: label || '' });
    if (State.history.length > 120) State.history.shift();
    State.histPos = State.history.length - 1;
    State.dirty = true;
    PP.emit('history');
  };

  PP.commit = function (label) {        // call AFTER a mutation to record it
    PP.snapshot(label);
    PP.emit('change');
  };

  PP.undo = function () {
    if (State.histPos <= 0) { PP.status('Nothing to undo'); return; }
    State.histPos--;
    const snap = State.history[State.histPos];
    State.doc = PP.deepClone(snap.doc);
    State.current = Math.min(snap.current, State.doc.slides.length - 1);
    State.selection = [];
    State.editingId = null;
    PP.emit('change'); PP.emit('history');
    PP.status('Undo' + (snap.label ? ' ' + snap.label : ''));
  };

  PP.redo = function () {
    if (State.histPos >= State.history.length - 1) { PP.status('Nothing to redo'); return; }
    State.histPos++;
    const snap = State.history[State.histPos];
    State.doc = PP.deepClone(snap.doc);
    State.current = Math.min(snap.current, State.doc.slides.length - 1);
    State.selection = [];
    State.editingId = null;
    PP.emit('change'); PP.emit('history');
    PP.status('Redo');
  };

  PP.canUndo = function () { return State.histPos > 0; };
  PP.canRedo = function () { return State.histPos < State.history.length - 1; };

  /* ---------- selection ---------- */
  PP.select = function (ids, additive) {
    if (!Array.isArray(ids)) ids = ids ? [ids] : [];
    if (additive) {
      ids.forEach(function (id) {
        const i = State.selection.indexOf(id);
        if (i >= 0) State.selection.splice(i, 1); else State.selection.push(id);
      });
    } else {
      State.selection = ids.slice();
    }
    PP.emit('selection');
  };
  PP.clearSelection = function () { State.selection = []; PP.emit('selection'); };
  PP.isSelected = function (id) { return State.selection.indexOf(id) >= 0; };

  /* ---------- slide ops ---------- */
  PP.goToSlide = function (i) {
    if (i < 0 || i >= State.doc.slides.length) return;
    State.editingId = null;
    State.current = i;
    State.selection = [];
    PP.emit('slidechange');
    PP.emit('change');
  };

  PP.addSlide = function (slideObj, atIndex) {
    const s = slideObj || PP.contentSlide();
    const idx = (atIndex == null) ? State.current + 1 : atIndex;
    State.doc.slides.splice(idx, 0, s);
    State.current = idx;
    State.selection = [];
    PP.commit('New Slide');
    PP.emit('slidechange');
    return s;
  };

  PP.duplicateSlide = function (i) {
    i = (i == null) ? State.current : i;
    const copy = PP.deepClone(State.doc.slides[i]);
    copy.id = PP.uid('slide');
    copy.objects.forEach(function (o) { o.id = PP.uid('obj'); });
    State.doc.slides.splice(i + 1, 0, copy);
    State.current = i + 1;
    State.selection = [];
    PP.commit('Duplicate Slide');
    PP.emit('slidechange');
  };

  PP.deleteSlide = function (i) {
    i = (i == null) ? State.current : i;
    if (State.doc.slides.length <= 1) {
      State.doc.slides[0] = PP.contentSlide();
    } else {
      State.doc.slides.splice(i, 1);
    }
    State.current = PP.clamp(State.current, 0, State.doc.slides.length - 1);
    State.selection = [];
    PP.commit('Delete Slide');
    PP.emit('slidechange');
  };

  PP.moveSlide = function (from, to) {
    if (from === to || from < 0 || to < 0) return;
    const arr = State.doc.slides;
    const [s] = arr.splice(from, 1);
    arr.splice(to, 0, s);
    State.current = to;
    PP.commit('Move Slide');
    PP.emit('slidechange');
  };

  /* ---------- sections ---------- */
  // A section is marked on the slide that STARTS it: slide.section = { name, collapsed }.
  PP.hasSections = function () { return State.doc.slides.some(function (s) { return s.section; }); };
  PP.computeSections = function () {
    const slides = State.doc.slides;
    if (!PP.hasSections()) return null;
    const list = []; let cur = null;
    slides.forEach(function (s, i) {
      if (i === 0 && !s.section) { cur = { start: 0, name: 'Default Section', count: 0, isDefault: true, collapsed: !!State.doc._defCollapsed }; list.push(cur); }
      if (s.section) { cur = { start: i, name: s.section.name, count: 0, collapsed: !!s.section.collapsed, marker: s }; list.push(cur); }
      if (cur) cur.count++;
    });
    return list;
  };
  PP.sectionStartFor = function (idx) {
    idx = (idx == null) ? State.current : idx;
    for (let i = idx; i >= 0; i--) { if (State.doc.slides[i].section) return i; }
    return 0;
  };
  PP.addSection = function (atIndex, name) {
    atIndex = (atIndex == null) ? State.current : atIndex;
    const s = State.doc.slides[atIndex]; if (!s) return;
    s.section = { name: name || 'Untitled Section', collapsed: false };
    PP.commit('Add Section'); PP.emit('slidechange');
  };
  PP.renameSection = function (startIndex, name) {
    const s = State.doc.slides[startIndex];
    if (s && s.section) { s.section.name = name; PP.commit('Rename Section'); }
    else if (startIndex === 0) { /* default section can't be renamed */ }
    PP.emit('slidechange');
  };
  PP.removeSection = function (startIndex) {
    const s = State.doc.slides[startIndex];
    if (s && s.section) { s.section = null; PP.commit('Remove Section'); PP.emit('slidechange'); }
  };
  PP.removeAllSections = function () {
    State.doc.slides.forEach(function (s) { s.section = null; });
    State.doc._defCollapsed = false;
    PP.commit('Remove All Sections'); PP.emit('slidechange');
  };
  PP.toggleSectionCollapsed = function (sec) {
    if (sec.isDefault) State.doc._defCollapsed = !State.doc._defCollapsed;
    else if (sec.marker) sec.marker.section.collapsed = !sec.marker.section.collapsed;
    PP.renderThumbs();
  };
  PP.setAllSectionsCollapsed = function (v) {
    State.doc._defCollapsed = v;
    State.doc.slides.forEach(function (s) { if (s.section) s.section.collapsed = v; });
    PP.renderThumbs();
  };

  /* ---------- object ops ---------- */
  PP.addObject = function (obj, opts) {
    PP.slide().objects.push(obj);
    if (!opts || !opts.silent) {
      PP.select(obj.id);
      PP.commit('Insert');
    }
    PP.emit('change');
    return obj;
  };

  PP.deleteSelected = function () {
    const s = PP.slide();
    if (!State.selection.length) return;
    s.objects = s.objects.filter(function (o) { return State.selection.indexOf(o.id) < 0; });
    State.selection = [];
    PP.commit('Delete');
  };

  PP.zOrder = function (dir) { // 'front','back','forward','backward'
    const s = PP.slide();
    State.selection.forEach(function (id) {
      const i = s.objects.findIndex(function (o) { return o.id === id; });
      if (i < 0) return;
      const [o] = s.objects.splice(i, 1);
      if (dir === 'front') s.objects.push(o);
      else if (dir === 'back') s.objects.unshift(o);
      else if (dir === 'forward') s.objects.splice(Math.min(i + 1, s.objects.length), 0, o);
      else if (dir === 'backward') s.objects.splice(Math.max(i - 1, 0), 0, o);
    });
    PP.commit('Reorder');
  };

  /* ---------- grouping ---------- */
  PP.groupSelected = function () {
    const objs = PP.selectedObjs();
    if (objs.length < 2) { PP.status('Select two or more objects to group'); return; }
    const gid = PP.uid('grp');
    objs.forEach(function (o) { o.groupId = gid; });
    PP.commit('Group');
    PP.status('Grouped');
  };
  PP.ungroupSelected = function () {
    const objs = PP.selectedObjs();
    let any = false;
    objs.forEach(function (o) { if (o.groupId) { o.groupId = null; any = true; } });
    if (any) { PP.commit('Ungroup'); PP.status('Ungrouped'); }
  };
  PP.groupMembers = function (gid) {
    return PP.slide().objects.filter(function (o) { return o.groupId === gid; }).map(function (o) { return o.id; });
  };

  // Apply props to all selected objects (returns true if changed)
  PP.applyToSelection = function (props, label) {
    const objs = PP.selectedObjs();
    if (!objs.length) return false;
    objs.forEach(function (o) { Object.assign(o, props); });
    PP.commit(label || 'Format');
    return true;
  };

  /* ---------- init ---------- */
  PP.initState = function (doc) {
    State.doc = doc || PP.newDoc();
    if (State.doc.size) { PP.SLIDE_W = State.doc.size.w; PP.SLIDE_H = State.doc.size.h; }
    else { PP.SLIDE_W = 1280; PP.SLIDE_H = 720; State.doc.size = { w: 1280, h: 720 }; }
    State.current = 0;
    State.selection = [];
    State.history = [];
    State.histPos = -1;
    PP.snapshot('Open');
    State.dirty = false;
  };

})(window.PP);
