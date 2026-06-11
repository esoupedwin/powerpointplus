/* ============ ribbon.js — ribbon tabs, groups, commands ============ */
(function (PP) {
  'use strict';
  const S = PP.State;
  let activeTab = 'home';

  /* ---------- command dispatcher ---------- */
  PP.cmd = function (name, arg) {
    switch (name) {
      case 'save': PP.save(); break;
      case 'open': document.getElementById('file-open').click(); break;
      case 'undo': PP.undo(); break;
      case 'redo': PP.redo(); break;
      case 'present': PP.startShow(0); break;
      case 'presentCurrent': PP.startShow(S.current); break;
      case 'newSlide': PP.addSlide(PP.contentSlide()); break;
      case 'newSlideTitle': PP.addSlide(PP.titleSlide()); break;
      case 'duplicateSlide': PP.duplicateSlide(); break;
      case 'deleteSlide': PP.deleteSlide(); break;
      case 'copy': PP.copy(); break;
      case 'cut': PP.cut(); break;
      case 'paste': PP.paste(); break;
      case 'duplicate': PP.duplicate(); break;
      case 'delete': PP.deleteSelected(); break;
      case 'selectAll': PP.selectAll(); break;
      case 'insertShape': PP.armInsert('shape', arg); break;
      case 'textBox': PP.armInsert('text'); break;
      case 'formatPainter': PP.startFormatPainter(); break;
      case 'layout': PP.applyLayout(arg); break;
      case 'layoutMenu': PP.openLayoutMenu(arg && arg.anchor); break;
      case 'picture': document.getElementById('file-image').click(); break;
      case 'table': PP.insertTable(arg && arg.r || 3, arg && arg.c || 3); break;
      case 'bold': PP.formatText('bold'); break;
      case 'italic': PP.formatText('italic'); break;
      case 'underline': PP.formatText('underline'); break;
      case 'strike': PP.formatText('strike'); break;
      case 'align': PP.formatText('align', arg); break;
      case 'valign': setProp('valign', arg); break;
      case 'bullet': toggleBullet(arg); break;
      case 'fontFamily': PP.formatText('fontName', arg); break;
      case 'fontSize': PP.formatText('fontSize', parseFloat(arg)); break;
      case 'growFont': stepFont(1); break;
      case 'shrinkFont': stepFont(-1); break;
      case 'fillColor': setProp('fill', arg); break;
      case 'lineColor': setProp('stroke', arg); break;
      case 'highlight': PP.formatText('backColor', arg); break;
      case 'fontColor': PP.formatText('foreColor', arg); break;
      case 'strokeWidth': setProp('strokeWidth', parseFloat(arg)); break;
      case 'merge': PP.mergeShapes(arg); break;
      case 'changeShape': changeShapeType(arg); break;
      case 'effect': applyEffect(arg); break;
      case 'shapeStyle': applyShapeStyle(arg); break;
      case 'correct': applyAdjust(arg); break;
      case 'recolor': applyAdjust(arg); break;
      case 'artistic': applyAdjust(arg); break;
      case 'transparency': applyToImages({ opacity: parseFloat(arg) }, 'Transparency'); break;
      case 'resetPicture': applyToImages({ adjust: null, crop: null, opacity: 1, border: null, radius: 0, effects: null }, 'Reset Picture'); break;
      case 'pictureStyle': applyPictureStyle(arg); break;
      case 'pictureBorder': applyToImages({ border: { color: arg, width: 4 } }, 'Picture Border'); break;
      case 'crop': PP.beginCrop(PP.State.selection[0]); break;
      case 'changePicture': PP.replacePictureFor(PP.State.selection[0]); break;
      case 'editPoints': PP.beginEditPoints(PP.State.selection[0]); break;
      case 'tblInsert': PP.tableInsert(arg); break;
      case 'tblDelete': PP.tableDelete(arg); break;
      case 'tblStyle': PP.tableApplyStyle(arg); break;
      case 'tblToggle': PP.tableToggle(arg); break;
      case 'tblShade': PP.tableShade(arg); break;
      case 'tblBorder': PP.tableBorderColor(arg); break;
      case 'flipH': flipSel('h'); break;
      case 'flipV': flipSel('v'); break;
      case 'rotate90': rotateSel(arg === 'left' ? -90 : 90); break;
      case 'group': PP.groupSelected(); break;
      case 'ungroup': PP.ungroupSelected(); break;
      case 'front': PP.zOrder('front'); break;
      case 'back': PP.zOrder('back'); break;
      case 'forward': PP.zOrder('forward'); break;
      case 'backward': PP.zOrder('backward'); break;
      case 'align-objs': PP.alignObjects(arg); break;
      case 'theme': PP.applyTheme(arg); break;
      case 'bgColor': setSlideBg(arg); break;
      case 'transition': PP.setTransition(arg); break;
      case 'transitionAll': PP.setTransition(arg, true); break;
      case 'animation': PP.setAnimation(arg); break;
      case 'view': PP.setView(arg); break;
      case 'fit': PP.fitToWindow(); break;
      case 'lineSpacing': setProp('lineHeight', parseFloat(arg)); break;
      default: PP.status('Command: ' + name);
    }
  };

  function setProp(p, v) {
    if (PP.applyToSelection(makeProps(p, v), 'Format')) { PP.refreshActiveEditor(); }
  }
  function makeProps(p, v) { const o = {}; o[p] = v; return o; }
  function toggleBullet(kind) {
    const objs = PP.selectedTextObjs();
    if (!objs.length) return;
    const allOn = objs.every(function (o) { return o.bullet === kind; });
    objs.forEach(function (o) { o.bullet = allOn ? null : kind; });
    PP.commit('Bullets');
  }
  function stepFont(dir) {
    const sizes = PP.FONT_SIZES;
    const st = PP.queryTextState && PP.queryTextState();
    let cur = st && st.fontSize ? st.fontSize : (PP.selectedObjs()[0] || {}).fontSize || 18;
    let i = sizes.findIndex(function (s) { return s >= cur; });
    if (i < 0) i = sizes.length - 1;
    // when current sits between table sizes, nudge toward the next discrete size
    if (dir > 0 && sizes[i] <= cur) i++;
    if (dir < 0 && sizes[i] >= cur) i--;
    i = PP.clamp(i, 0, sizes.length - 1);
    PP.formatText('fontSize', sizes[i]);
  }
  function setSlideBg(c) { PP.slide().background = c; PP.commit('Background'); }

  function changeShapeType(type) {
    const objs = PP.selectedObjs().filter(function (o) { return o.type !== 'image' && o.type !== 'text'; });
    if (!objs.length) return;
    objs.forEach(function (o) { o.type = type; if (o.type === 'freeform') { o.path = null; } });
    PP.commit('Change Shape');
  }
  const EFFECT_PRESETS = {
    none: null,
    shadow: { shadow: { dx: 5, dy: 5, blur: 7, color: 'rgba(0,0,0,.45)' } },
    'shadow-soft': { shadow: { dx: 0, dy: 6, blur: 12, color: 'rgba(0,0,0,.35)' } },
    glow: { glow: { blur: 12, color: '#4472C4' } },
    'glow-orange': { glow: { blur: 12, color: '#ED7D31' } },
    soft: { softEdges: 4 },
  };
  function applyEffect(name) {
    const objs = PP.selectedObjs();
    if (!objs.length) return;
    objs.forEach(function (o) {
      if (name === 'none') { o.effects = null; return; }
      o.effects = Object.assign({}, o.effects, EFFECT_PRESETS[name]);
    });
    PP.commit('Shape Effect');
  }
  const SHAPE_STYLES = [
    { fill: '#4472C4', stroke: '#2F528F', color: '#FFFFFF' },
    { fill: '#ED7D31', stroke: '#C55A11', color: '#FFFFFF' },
    { fill: '#A5A5A5', stroke: '#7B7B7B', color: '#FFFFFF' },
    { fill: '#FFC000', stroke: '#BF9000', color: '#000000' },
    { fill: '#70AD47', stroke: '#548235', color: '#FFFFFF' },
    { fill: '#FFFFFF', stroke: '#4472C4', color: '#4472C4' },
    { fill: 'none', stroke: '#4472C4', color: '#4472C4' },
    { fill: '#264478', stroke: '#1F3864', color: '#FFFFFF' },
  ];
  function applyShapeStyle(i) {
    const st = SHAPE_STYLES[i]; if (!st) return;
    const objs = PP.selectedObjs();
    objs.forEach(function (o) { o.fill = st.fill; o.stroke = st.stroke; o.strokeWidth = o.strokeWidth || 1; if (o.type !== 'image') o.color = st.color; });
    PP.commit('Shape Style');
    PP.refreshActiveEditor();
  }
  function flipSel(axis) {
    PP.selectedObjs().forEach(function (o) { if (axis === 'h') o.flipH = !o.flipH; else o.flipV = !o.flipV; });
    PP.commit('Flip');
  }
  function rotateSel(deg) { PP.selectedObjs().forEach(function (o) { o.rotation = (o.rotation + deg) % 360; }); PP.commit('Rotate'); }

  /* ---------- picture adjustments ---------- */
  function imagesInSel() { return PP.selectedObjs().filter(function (o) { return o.type === 'image'; }); }
  function applyToImages(props, label) {
    const objs = imagesInSel(); if (!objs.length) return;
    objs.forEach(function (o) { Object.assign(o, props); });
    PP.commit(label || 'Picture');
  }
  function applyAdjust(delta) {
    const objs = imagesInSel(); if (!objs.length) return;
    objs.forEach(function (o) { o.adjust = Object.assign({ brightness: 1, contrast: 1, saturate: 1 }, o.adjust, delta); });
    PP.commit('Picture Adjust');
  }
  const PICTURE_STYLES = [
    { name: 'Simple Frame, White', radius: 0, border: { color: '#FFFFFF', width: 8 }, effects: { shadow: { dx: 3, dy: 3, blur: 7, color: 'rgba(0,0,0,.4)' } } },
    { name: 'Rounded Rectangle', radius: 18, border: null, effects: null },
    { name: 'Drop Shadow Rectangle', radius: 0, border: null, effects: { shadow: { dx: 6, dy: 6, blur: 10, color: 'rgba(0,0,0,.45)' } } },
    { name: 'Soft Edge Rectangle', radius: 0, border: null, effects: { softEdges: 6 } },
    { name: 'Thick Black Border', radius: 0, border: { color: '#000000', width: 6 }, effects: null },
    { name: 'Rounded + Shadow', radius: 16, border: { color: '#FFFFFF', width: 6 }, effects: { shadow: { dx: 4, dy: 4, blur: 8, color: 'rgba(0,0,0,.4)' } } },
  ];
  function applyPictureStyle(i) {
    const st = PICTURE_STYLES[i]; if (!st) return;
    applyToImages({ radius: st.radius, border: st.border, effects: st.effects }, 'Picture Style');
  }
  PP.replacePictureFor = function (id) {
    PP._replaceImgId = id;
    document.getElementById('file-image').click();
  };

  /* ---------- Picture Format (contextual) ---------- */
  function buildPictureFormat() {
    // Adjust
    const correctionsBtn = menuBtn('&#9728;', 'Corrections', function (a) {
      PP.openMenu(a, [
        { label: 'Brightness +20%', run: function () { PP.cmd('correct', { brightness: 1.2 }); } },
        { label: 'Brightness −20%', run: function () { PP.cmd('correct', { brightness: 0.8 }); } },
        { label: 'Contrast +20%', run: function () { PP.cmd('correct', { contrast: 1.3 }); } },
        { label: 'Contrast −20%', run: function () { PP.cmd('correct', { contrast: 0.8 }); } },
        { label: 'Sharpen / Reset', run: function () { PP.cmd('correct', { brightness: 1, contrast: 1 }); } },
      ]);
    });
    const colorBtn2 = menuBtn('&#127912;', 'Color', function (a) {
      PP.openMenu(a, [
        { label: 'Grayscale', run: function () { PP.cmd('recolor', { grayscale: 1, sepia: 0 }); } },
        { label: 'Sepia', run: function () { PP.cmd('recolor', { sepia: 0.8, grayscale: 0 }); } },
        { label: 'Saturation 200%', run: function () { PP.cmd('recolor', { saturate: 2 }); } },
        { label: 'Saturation 0%', run: function () { PP.cmd('recolor', { saturate: 0 }); } },
        { label: 'Cool Tone', run: function () { PP.cmd('recolor', { hue: 180 }); } },
        { label: 'Warm Tone', run: function () { PP.cmd('recolor', { hue: 30 }); } },
      ]);
    });
    const artisticBtn = menuBtn('&#10022;', 'Artistic Effects', function (a) {
      PP.openMenu(a, [
        { label: 'Blur', run: function () { PP.cmd('artistic', { blur: 3 }); } },
        { label: 'Pencil Grayscale', run: function () { PP.cmd('artistic', { grayscale: 1, contrast: 1.4 }); } },
        { label: 'None', run: function () { PP.cmd('artistic', { blur: 0 }); } },
      ]);
    });
    const transBtn = menuBtn('&#9617;', 'Transparency', function (a) {
      PP.openMenu(a, [0, 0.15, 0.3, 0.5, 0.7].map(function (t) {
        return { label: Math.round(t * 100) + '%', run: function () { PP.cmd('transparency', 1 - t); } };
      }));
    });
    const adjust = group('Adjust', [
      PP.el('div', { class: 'rstack' }, [
        menuRowBtn('&#127759;', 'Change Picture', function () { PP.cmd('changePicture'); }),
        menuRowBtn('&#8635;', 'Reset Picture', function () { PP.cmd('resetPicture'); }),
      ]),
      PP.el('div', { class: 'rstack' }, [correctionsBtn, colorBtn2, artisticBtn]),
      transBtn
    ]);

    // Picture Styles
    const gallery = PP.el('div', { class: 'theme-strip' });
    PICTURE_STYLES.forEach(function (st, i) {
      const chip = PP.el('div', { class: 'theme-chip', title: st.name, onclick: function () { PP.cmd('pictureStyle', i); } });
      chip.style.background = 'linear-gradient(135deg,#bcd,#9ab)';
      if (st.radius) chip.style.borderRadius = '6px';
      if (st.border) chip.style.border = (st.border.width / 2) + 'px solid ' + st.border.color;
      if (st.effects && st.effects.shadow) chip.style.boxShadow = '3px 3px 5px rgba(0,0,0,.4)';
      gallery.appendChild(chip);
    });
    const borderBtn = colorRow('&#9633;', 'Picture Border', 'pictureBorder');
    const effectsBtn = menuBtn('&#9673;', 'Picture Effects', function (a) {
      PP.openMenu(a, [
        { label: 'Shadow', run: function () { PP.cmd('effect', 'shadow'); } },
        { label: 'Glow', run: function () { PP.cmd('effect', 'glow'); } },
        { label: 'Soft Edges', run: function () { PP.cmd('effect', 'soft'); } },
        { label: 'No Effects', run: function () { PP.cmd('effect', 'none'); } },
      ]);
    });
    const styles = group('Picture Styles', [gallery, PP.el('div', { class: 'rstack' }, [borderBtn, effectsBtn])]);

    // Arrange (reuse)
    const arrange = group('Arrange', [
      PP.el('div', { class: 'rstack' }, [smallRow('&#11014;', 'Bring Forward', 'forward'), smallRow('&#11015;', 'Send Backward', 'backward')]),
      PP.el('div', { class: 'rstack' }, [
        menuRowBtn('&#9783;', 'Align', function () { PP.openArrangeMenu(arrange); }),
        menuRowBtn('&#8635;', 'Rotate', function () { PP.openMenu(arrange, [
          { label: 'Rotate Right 90°', run: function () { PP.cmd('rotate90', 'right'); } },
          { label: 'Rotate Left 90°', run: function () { PP.cmd('rotate90', 'left'); } },
          { label: 'Flip Horizontal', run: function () { PP.cmd('flipH'); } },
          { label: 'Flip Vertical', run: function () { PP.cmd('flipV'); } },
        ]); }),
      ])
    ]);

    // Size + Crop
    const cropBtn = bigBtn('&#9986;', 'Crop', 'crop');
    const o = imagesInSel()[0] || { w: 0, h: 0 };
    const hIn = PP.el('input', { class: 'r-input', type: 'number', value: Math.round(pxToCm(o.h) * 100) / 100, style: 'width:58px', onchange: function () { setSize('h', cmToPx(parseFloat(this.value))); } });
    const wIn = PP.el('input', { class: 'r-input', type: 'number', value: Math.round(pxToCm(o.w) * 100) / 100, style: 'width:58px', onchange: function () { setSize('w', cmToPx(parseFloat(this.value))); } });
    const size = group('Size', [cropBtn, PP.el('div', { style: 'display:flex;flex-direction:column;gap:4px' }, [
      PP.el('div', { class: 'r-field' }, [PP.el('span', { html: '&#8597;', style: 'width:14px' }), hIn]),
      PP.el('div', { class: 'r-field' }, [PP.el('span', { html: '&#8596;', style: 'width:14px' }), wIn]),
    ])]);

    return [adjust, styles, arrange, size];
  }
  function menuBtn(icon, label, onclick) {
    const b = PP.el('button', { class: 'rbtn', onclick: function () { onclick(b); } }, [PP.el('span', { class: 'ico', html: icon }), PP.el('span', { text: label })]);
    return b;
  }
  function menuRowBtn(icon, label, onclick) {
    const b = PP.el('button', { class: 'rbtn small', onclick: function () { onclick(b); } }, [PP.el('span', { class: 'ico', html: icon }), PP.el('span', { text: label })]);
    return b;
  }

  /* ---------- ribbon construction ---------- */
  function group(label, body) {
    const g = PP.el('div', { class: 'rgroup' });
    const b = PP.el('div', { class: 'rgroup-body' });
    (Array.isArray(body) ? body : [body]).forEach(function (n) { if (n) b.appendChild(n); });
    g.appendChild(b);
    g.appendChild(PP.el('div', { class: 'rgroup-label', text: label }));
    return g;
  }
  function bigBtn(icon, label, cmd, arg) {
    return PP.el('button', { class: 'rbtn big', dataset: { cmd: cmd || '', arg: arg || '' },
      onclick: function () { PP.cmd(cmd, arg); } }, [PP.el('span', { class: 'ico', html: icon }), PP.el('span', { text: label })]);
  }
  function btn(icon, label, cmd, arg) {
    return PP.el('button', { class: 'rbtn', dataset: { cmd: cmd || '', arg: arg || '' },
      onclick: function () { PP.cmd(cmd, arg); } }, [PP.el('span', { class: 'ico', html: icon }), PP.el('span', { text: label })]);
  }
  function iconBtn(content, cls, cmd, arg, title) {
    return PP.el('button', { class: 'icon-btn ' + (cls || ''), title: title || '', dataset: { cmd: cmd, arg: arg == null ? '' : arg },
      onclick: function () { PP.cmd(cmd, arg); } }, [PP.el('span', { html: content })]);
  }

  function fontSelect() {
    const sel = PP.el('select', { class: 'r-select r-font', title: 'Font',
      onchange: function () { PP.cmd('fontFamily', this.value); } });
    PP.FONTS.forEach(function (f) { sel.appendChild(PP.el('option', { value: f, text: f, style: 'font-family:' + f })); });
    sel.id = 'sel-font';
    return sel;
  }
  function sizeField() {
    const wrap = PP.el('div', { class: 'r-field' });
    const sel = PP.el('input', { class: 'r-input r-size', id: 'sel-size', value: '18',
      onchange: function () { PP.cmd('fontSize', this.value); },
      onkeydown: function (e) { if (e.key === 'Enter') { PP.cmd('fontSize', this.value); this.blur(); } } });
    wrap.appendChild(sel);
    wrap.appendChild(iconBtn('A&#9650;', '', 'growFont', '', 'Increase Font Size'));
    wrap.appendChild(iconBtn('A&#9660;', '', 'shrinkFont', '', 'Decrease Font Size'));
    return wrap;
  }

  function colorBtn(icon, cmd, defColor, title) {
    const wrap = PP.el('div', { class: 'color-btn', title: title });
    wrap.appendChild(PP.el('span', { class: 'ico', html: icon }));
    const bar = PP.el('div', { class: 'bar', style: 'background:' + defColor });
    wrap.appendChild(bar);
    wrap.dataset.color = defColor; wrap.dataset.cmd = cmd;
    wrap.addEventListener('click', function (e) {
      PP.openColorPopover(wrap, cmd, function (c) { bar.style.background = c; wrap.dataset.color = c; PP.cmd(cmd, c); });
    });
    return wrap;
  }

  /* ---------- tab definitions ---------- */
  function buildHome() {
    const clipboard = group('Clipboard', [
      bigBtn('&#128203;', 'Paste', 'paste'),
      PP.el('div', { class: 'rstack' }, [
        smallRow('&#9986;', 'Cut', 'cut'),
        smallRow('&#128203;', 'Copy', 'copy'),
        smallRow('&#128396;', 'Format', 'formatPainter')
      ])
    ]);

    const layoutBtn = PP.el('button', { class: 'rbtn small', onclick: function () { PP.openLayoutMenu(layoutBtn); } },
      [PP.el('span', { class: 'ico', html: '&#9707;' }), PP.el('span', { text: 'Layout' })]);
    const slides = group('Slides', [
      bigBtn('&#10010;', 'New\nSlide', 'newSlide'),
      PP.el('div', { class: 'rstack' }, [
        layoutBtn,
        smallRow('&#8635;', 'Reset', 'reset'),
        smallRow('&#9776;', 'Section', 'section')
      ])
    ]);

    const fontRow1 = PP.el('div', { class: 'r-field' }, [fontSelect(), sizeField()]);
    const fontRow2 = PP.el('div', { class: 'r-field' }, [
      iconBtn('B', 'bold', 'bold', '', 'Bold (Ctrl+B)'),
      iconBtn('I', 'italic', 'italic', '', 'Italic (Ctrl+I)'),
      iconBtn('U', 'underline', 'underline', '', 'Underline (Ctrl+U)'),
      iconBtn('S', 'strike', 'strike', '', 'Strikethrough'),
      colorBtn('A', 'fontColor', '#FF0000', 'Font Color'),
      colorBtn('&#9609;', 'highlight', '#FFFF00', 'Text Highlight Color')
    ]);
    const font = group('Font', PP.el('div', { style: 'display:flex;flex-direction:column;gap:3px' }, [fontRow1, fontRow2]));

    const paraRow1 = PP.el('div', { class: 'r-field' }, [
      iconBtn('&#8226;&#8801;', '', 'bullet', 'disc', 'Bullets'),
      iconBtn('1.&#8801;', '', 'bullet', 'number', 'Numbering'),
      iconBtn('&#8801;', '', 'lineSpacing', '1.5', 'Line Spacing'),
    ]);
    const paraRow2 = PP.el('div', { class: 'r-field' }, [
      iconBtn('&#8801;', '', 'align', 'left', 'Align Left (Ctrl+L)'),
      iconBtn('&#9776;', '', 'align', 'center', 'Center (Ctrl+E)'),
      iconBtn('&#8803;', '', 'align', 'right', 'Align Right (Ctrl+R)'),
      iconBtn('&#9636;', '', 'align', 'justify', 'Justify (Ctrl+J)'),
      iconBtn('&#8593;', '', 'valign', 'top', 'Align Top'),
      iconBtn('&#8597;', '', 'valign', 'middle', 'Align Middle'),
      iconBtn('&#8595;', '', 'valign', 'bottom', 'Align Bottom'),
    ]);
    const para = group('Paragraph', PP.el('div', { style: 'display:flex;flex-direction:column;gap:3px' }, [paraRow1, paraRow2]));

    const draw = group('Drawing', [
      shapeQuickPalette(),
      PP.el('div', { class: 'rstack' }, [
        shapeFillRow(), shapeOutlineRow(), arrangeRow()
      ])
    ]);

    const editing = group('Editing', PP.el('div', { class: 'rstack' }, [
      smallRow('&#128269;', 'Find', 'find'),
      smallRow('&#8644;', 'Replace', 'replace'),
      smallRow('&#9745;', 'Select All', 'selectAll')
    ]));

    return [clipboard, slides, font, para, draw, editing];
  }

  function smallRow(icon, label, cmd, arg) {
    return PP.el('button', { class: 'rbtn small', onclick: function () { PP.cmd(cmd, arg); } },
      [PP.el('span', { class: 'ico', html: icon }), PP.el('span', { text: label })]);
  }
  function shapeFillRow() {
    const r = PP.el('button', { class: 'rbtn small', onclick: function (e) { PP.openColorPopover(r, 'fillColor', function (c) { PP.cmd('fillColor', c); }); } },
      [PP.el('span', { class: 'ico', html: '&#128396;' }), PP.el('span', { text: 'Shape Fill' })]);
    return r;
  }
  function shapeOutlineRow() {
    const r = PP.el('button', { class: 'rbtn small', onclick: function (e) { PP.openColorPopover(r, 'lineColor', function (c) { PP.cmd('lineColor', c); }); } },
      [PP.el('span', { class: 'ico', html: '&#9633;' }), PP.el('span', { text: 'Shape Outline' })]);
    return r;
  }
  function arrangeRow() {
    const r = PP.el('button', { class: 'rbtn small', onclick: function () { PP.openArrangeMenu(r); } },
      [PP.el('span', { class: 'ico', html: '&#9783;' }), PP.el('span', { text: 'Arrange' })]);
    return r;
  }

  function shapeQuickPalette() {
    const grid = PP.el('div', { class: 'shape-grid', style: 'grid-template-columns:repeat(5,26px)' });
    ['rect', 'roundRect', 'ellipse', 'triangle', 'arrowRight', 'diamond', 'pentagon', 'star', 'line', 'arrow'].forEach(function (t) {
      grid.appendChild(shapeCell(t));
    });
    return grid;
  }

  function shapeCell(type) {
    const cell = PP.el('div', { class: 'shape-cell', title: PP.SHAPE_NAMES[type], onclick: function () { PP.cmd('insertShape', type); PP.hideMenus(); } });
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 20 20');
    const p = PP.shapePath(type, 20, 20);
    let node;
    if (p.tag === 'line') { node = document.createElementNS(ns, 'line'); node.setAttribute('x1', 2); node.setAttribute('y1', 18); node.setAttribute('x2', 18); node.setAttribute('y2', 2); node.setAttribute('stroke', '#444'); node.setAttribute('stroke-width', 2); if (p.markerEnd) node.setAttribute('marker-end', ''); }
    else { node = document.createElementNS(ns, 'path'); node.setAttribute('d', PP.shapePath(type, 18, 18).d); node.setAttribute('transform', 'translate(1,1)'); node.setAttribute('fill', '#8aa9d6'); node.setAttribute('stroke', '#3a5a8a'); }
    svg.appendChild(node);
    cell.appendChild(svg);
    return cell;
  }

  function buildInsert() {
    return [
      group('Slides', bigBtn('&#10010;', 'New\nSlide', 'newSlide')),
      group('Tables', bigBtn('&#9638;', 'Table', 'table')),
      group('Images', [bigBtn('&#128444;', 'Pictures', 'picture')]),
      group('Illustrations', fullShapeButton()),
      group('Text', [bigBtn('&#65120;', 'Text\nBox', 'textBox'), bigBtn('&#9000;', 'Header\n& Footer', 'headerFooter'), bigBtn('&#127760;', 'WordArt', 'wordart')]),
      group('Symbols', [bigBtn('&#8721;', 'Equation', 'equation'), bigBtn('&#937;', 'Symbol', 'symbol')]),
      group('Media', bigBtn('&#9658;', 'Video', 'video')),
    ];
  }
  function fullShapeButton() {
    const b = bigBtn('&#9733;', 'Shapes', 'shapesMenu');
    b.onclick = function () { PP.openShapesMenu(b); };
    return b;
  }

  function buildDesign() {
    const strip = PP.el('div', { class: 'theme-strip' });
    PP.THEMES.forEach(function (t) {
      const chip = PP.el('div', { class: 'theme-chip', title: t.name,
        onclick: function () { PP.cmd('theme', t.name); } });
      chip.style.background = t.bg;
      chip.appendChild(PP.el('div', { style: 'position:absolute;left:6px;top:8px;font-size:13px;font-weight:600;color:' + t.accent, text: 'Aa' }));
      chip.appendChild(PP.el('div', { style: 'position:absolute;bottom:0;left:0;right:0;height:8px;background:' + t.accent }));
      strip.appendChild(chip);
    });
    const bgBtn = bigBtn('&#127912;', 'Format\nBackground', 'bgMenu');
    bgBtn.onclick = function () { PP.openColorPopover(bgBtn, 'bgColor', function (c) { PP.cmd('bgColor', c); }); };
    return [group('Themes', strip), group('Customize', bgBtn)];
  }

  function buildTransitions() {
    const strip = PP.el('div', { class: 'fx-strip' });
    PP.TRANSITIONS.forEach(function (t) {
      const chip = PP.el('div', { class: 'fx-chip' + (PP.slide().transition.type === t.id ? ' active' : ''), dataset: { tid: t.id },
        onclick: function () { PP.cmd('transition', t.id); } },
        [PP.el('div', { class: 'ico', html: t.icon }), PP.el('span', { text: t.name })]);
      strip.appendChild(chip);
    });
    const dur = PP.el('div', { class: 'r-field', style: 'flex-direction:column;align-items:flex-start;gap:4px' }, [
      PP.el('label', { style: 'font-size:11px', text: 'Duration' }),
      PP.el('input', { class: 'r-input', type: 'number', step: '0.25', value: (PP.slide().transition.duration / 1000), style: 'width:64px',
        onchange: function () { PP.slide().transition.duration = parseFloat(this.value) * 1000; PP.commit('Duration'); } })
    ]);
    const applyAll = btn('&#9745;', 'Apply To All', 'transitionAll', PP.slide().transition.type);
    applyAll.onclick = function () { PP.setTransition(PP.slide().transition.type, true); };
    return [group('Transition to This Slide', strip), group('Timing', [dur, applyAll])];
  }

  function buildAnimations() {
    const strip = PP.el('div', { class: 'fx-strip' });
    PP.ANIMATIONS.forEach(function (a) {
      const chip = PP.el('div', { class: 'fx-chip', dataset: { aid: a.id }, onclick: function () { PP.cmd('animation', a.id); } },
        [PP.el('div', { class: 'ico', html: a.icon }), PP.el('span', { text: a.name })]);
      strip.appendChild(chip);
    });
    return [group('Animation (select an object first)', strip)];
  }

  function buildSlideShow() {
    return [
      group('Start Slide Show', [bigBtn('&#9654;', 'From\nBeginning', 'present'), bigBtn('&#9655;', 'From\nCurrent', 'presentCurrent')]),
      group('Set Up', [bigBtn('&#128362;', 'Rehearse', 'rehearse'), bigBtn('&#9745;', 'Use\nTimings', 'timings')]),
    ];
  }

  function buildView() {
    return [
      group('Presentation Views', [
        viewBtn('&#9707;', 'Normal', 'normal'),
        viewBtn('&#9638;', 'Slide\nSorter', 'sorter'),
        bigBtn('&#128196;', 'Notes\nPage', 'notesView'),
        bigBtn('&#128065;', 'Reading\nView', 'reading')
      ]),
      group('Zoom', [bigBtn('&#128269;', 'Zoom', 'zoomDlg'), bigBtn('&#9974;', 'Fit to\nWindow', 'fit')]),
      group('Show', [PP.el('label', { style: 'font-size:12px;display:flex;gap:4px;align-items:center' }, [
        PP.el('input', { type: 'checkbox', checked: 'checked', onchange: function () { toggleGuides(this.checked); } }), 'Guides'
      ])]),
    ];
  }
  function viewBtn(icon, label, v) {
    const b = bigBtn(icon, label, 'view', v);
    if (S.view === v) b.classList.add('toggled');
    return b;
  }
  function toggleGuides(on) { document.getElementById('selection-layer').dataset.guides = on ? '1' : '0'; }

  /* ---------- Shape Format (contextual) ---------- */
  function buildShapeFormat() {
    // Insert Shapes
    const editShapeBtn = PP.el('button', { class: 'rbtn small', onclick: function () {
      PP.openMenu(editShapeBtn, [
        { icon: '&#9998;', label: 'Change Shape', run: function () { openChangeShape(editShapeBtn); } },
        { icon: '&#9711;', label: 'Edit Points', run: function () { PP.cmd('editPoints'); } },
      ]);
    } }, [PP.el('span', { class: 'ico', html: '&#9998;' }), PP.el('span', { text: 'Edit Shape' })]);
    const mergeBtn = PP.el('button', { class: 'rbtn small', onclick: function () {
      PP.openMenu(mergeBtn, PP.MERGE_OPS.map(function (m) {
        return { icon: mergeIcon(m.id), label: m.name, run: function () { PP.mergeShapes(m.id); } };
      }));
    } }, [PP.el('span', { class: 'ico', html: '&#9684;' }), PP.el('span', { text: 'Merge Shapes' })]);
    const insertShapes = group('Insert Shapes', [
      shapeQuickPalette(),
      PP.el('div', { class: 'rstack' }, [editShapeBtn, smallRow('&#65120;', 'Text Box', 'textBox'), mergeBtn])
    ]);

    // Shape Styles
    const gallery = PP.el('div', { class: 'theme-strip' });
    SHAPE_STYLES.forEach(function (st, i) {
      const chip = PP.el('div', { class: 'theme-chip', title: 'Shape Style', onclick: function () { PP.cmd('shapeStyle', i); } });
      chip.style.background = st.fill === 'none' ? '#fff' : st.fill;
      chip.style.border = '2px solid ' + st.stroke;
      chip.appendChild(PP.el('div', { style: 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-weight:700;color:' + st.color, text: 'Abc' }));
      gallery.appendChild(chip);
    });
    const fillBtn = colorRow('&#128396;', 'Shape Fill', 'fillColor');
    const outlineBtn = colorRow('&#9633;', 'Shape Outline', 'lineColor');
    const effectsBtn = PP.el('button', { class: 'rbtn small', onclick: function () {
      PP.openMenu(effectsBtn, [
        { icon: '&#9673;', label: 'Shadow', run: function () { PP.cmd('effect', 'shadow'); } },
        { icon: '&#9672;', label: 'Soft Shadow', run: function () { PP.cmd('effect', 'shadow-soft'); } },
        { icon: '&#10024;', label: 'Glow (Blue)', run: function () { PP.cmd('effect', 'glow'); } },
        { icon: '&#10024;', label: 'Glow (Orange)', run: function () { PP.cmd('effect', 'glow-orange'); } },
        { icon: '&#9617;', label: 'Soft Edges', run: function () { PP.cmd('effect', 'soft'); } },
        '-',
        { icon: '&#10005;', label: 'No Effects', run: function () { PP.cmd('effect', 'none'); } },
      ]);
    } }, [PP.el('span', { class: 'ico', html: '&#9673;' }), PP.el('span', { text: 'Shape Effects' })]);
    const shapeStyles = group('Shape Styles', [gallery, PP.el('div', { class: 'rstack' }, [fillBtn, outlineBtn, effectsBtn])]);

    // WordArt Styles
    const waGallery = PP.el('div', { class: 'theme-strip' });
    [['#000000', 'none'], ['#4472C4', 'none'], ['#ED7D31', '#7B3F00']].forEach(function (pair) {
      const chip = PP.el('div', { class: 'theme-chip', title: 'WordArt', style: 'display:flex;align-items:center;justify-content:center;background:#fff',
        onclick: function () { PP.formatText('foreColor', pair[0]); } });
      chip.appendChild(PP.el('div', { style: 'font-size:22px;font-weight:800;color:' + pair[0] + ';-webkit-text-stroke:' + (pair[1] === 'none' ? '0' : '1px ' + pair[1]), text: 'A' }));
      waGallery.appendChild(chip);
    });
    const textFill = colorRow('A', 'Text Fill', 'fontColor');
    const textOutline = colorRow('A', 'Text Outline', 'highlight');
    const wordart = group('WordArt Styles', [waGallery, PP.el('div', { class: 'rstack' }, [textFill, textOutline])]);

    // Arrange
    const bringBtn = smallRow('&#11014;', 'Bring Forward', 'forward');
    const sendBtn = smallRow('&#11015;', 'Send Backward', 'backward');
    const alignBtn2 = PP.el('button', { class: 'rbtn small', onclick: function () { PP.openArrangeMenu(alignBtn2); } }, [PP.el('span', { class: 'ico', html: '&#9783;' }), PP.el('span', { text: 'Align' })]);
    const groupBtn = PP.el('button', { class: 'rbtn small', onclick: function () {
      PP.openMenu(groupBtn, [
        { icon: '&#9783;', label: 'Group', run: function () { PP.groupSelected(); } },
        { icon: '&#9635;', label: 'Ungroup', run: function () { PP.ungroupSelected(); } },
      ]);
    } }, [PP.el('span', { class: 'ico', html: '&#9783;' }), PP.el('span', { text: 'Group' })]);
    const rotateBtn = PP.el('button', { class: 'rbtn small', onclick: function () {
      PP.openMenu(rotateBtn, [
        { icon: '&#8635;', label: 'Rotate Right 90°', run: function () { PP.cmd('rotate90', 'right'); } },
        { icon: '&#8634;', label: 'Rotate Left 90°', run: function () { PP.cmd('rotate90', 'left'); } },
        { icon: '&#8596;', label: 'Flip Horizontal', run: function () { PP.cmd('flipH'); } },
        { icon: '&#8597;', label: 'Flip Vertical', run: function () { PP.cmd('flipV'); } },
      ]);
    } }, [PP.el('span', { class: 'ico', html: '&#8635;' }), PP.el('span', { text: 'Rotate' })]);
    const arrange = group('Arrange', [
      PP.el('div', { class: 'rstack' }, [bringBtn, sendBtn, smallRow('&#9783;', 'Selection Pane', 'selectionPane')]),
      PP.el('div', { class: 'rstack' }, [alignBtn2, groupBtn, rotateBtn])
    ]);

    // Size
    const o = PP.selectedObjs()[0] || { w: 0, h: 0 };
    const hIn = PP.el('input', { class: 'r-input', type: 'number', step: '1', value: Math.round(pxToCm(o.h) * 100) / 100, style: 'width:60px',
      onchange: function () { setSize('h', cmToPx(parseFloat(this.value))); } });
    const wIn = PP.el('input', { class: 'r-input', type: 'number', step: '1', value: Math.round(pxToCm(o.w) * 100) / 100, style: 'width:60px',
      onchange: function () { setSize('w', cmToPx(parseFloat(this.value))); } });
    const size = group('Size', PP.el('div', { style: 'display:flex;flex-direction:column;gap:4px' }, [
      PP.el('div', { class: 'r-field' }, [PP.el('span', { html: '&#8597;', style: 'width:16px' }), hIn, PP.el('span', { text: 'cm', style: 'font-size:10px;color:#605e5c' })]),
      PP.el('div', { class: 'r-field' }, [PP.el('span', { html: '&#8596;', style: 'width:16px' }), wIn, PP.el('span', { text: 'cm', style: 'font-size:10px;color:#605e5c' })]),
    ]));

    return [insertShapes, shapeStyles, wordart, arrange, size];
  }
  function pxToCm(px) { return px / PP.SLIDE_W * 33.867; } // 16:9 widescreen = 33.867cm wide
  function cmToPx(cm) { return cm / 33.867 * PP.SLIDE_W; }
  function setSize(dim, px) {
    const objs = PP.selectedObjs(); if (!objs.length || !px) return;
    objs.forEach(function (o) { o[dim] = Math.max(2, px); });
    PP.commit('Size');
  }
  function colorRow(icon, label, cmd) {
    const r = PP.el('button', { class: 'rbtn small', onclick: function () { PP.openColorPopover(r, cmd, function (c) { PP.cmd(cmd, c); }); } },
      [PP.el('span', { class: 'ico', html: icon }), PP.el('span', { text: label })]);
    return r;
  }
  function mergeIcon(id) {
    return { union: '&#9899;', combine: '&#9920;', fragment: '&#9636;', intersect: '&#9686;', subtract: '&#9901;' }[id] || '&#9684;';
  }
  function openChangeShape(anchor) {
    PP.openMenu(anchor, PP.SHAPES.filter(function (t) { return t !== 'line' && t !== 'arrow'; }).map(function (t) {
      return { icon: '&#9633;', label: PP.SHAPE_NAMES[t], run: function () { PP.cmd('changeShape', t); } };
    }));
  }

  /* ---------- Table Design / Layout (contextual) ---------- */
  function buildTableDesign() {
    const o = PP.selectedTable ? PP.selectedTable() : null;
    const st = (o && o.tableStyle) || {};
    const opt = function (key, label) {
      const lbl = PP.el('label', { style: 'font-size:12px;display:flex;gap:5px;align-items:center;cursor:pointer' });
      const cb = PP.el('input', { type: 'checkbox', onchange: function () { PP.cmd('tblToggle', key); } });
      if (st[key]) cb.checked = true;
      lbl.appendChild(cb); lbl.appendChild(document.createTextNode(label));
      return lbl;
    };
    const options = group('Table Style Options', PP.el('div', { style: 'display:flex;flex-direction:column;gap:3px' }, [
      opt('headerRow', 'Header Row'), opt('banded', 'Banded Rows'), opt('firstCol', 'First Column')
    ]));

    const gallery = PP.el('div', { class: 'theme-strip' });
    (PP.TABLE_STYLES || []).forEach(function (ts, i) {
      const chip = PP.el('div', { class: 'theme-chip', title: ts.name, onclick: function () { PP.cmd('tblStyle', i); } });
      chip.style.background = ts.band2;
      chip.appendChild(PP.el('div', { style: 'position:absolute;top:0;left:0;right:0;height:33%;background:' + ts.headerFill }));
      chip.appendChild(PP.el('div', { style: 'position:absolute;top:66%;left:0;right:0;height:34%;background:' + ts.band1 }));
      gallery.appendChild(chip);
    });
    const styles = group('Table Styles', gallery);

    const shadeBtn = colorRow('&#128396;', 'Shading', 'tblShade');
    const borderBtn = colorRow('&#9633;', 'Borders', 'tblBorder');
    const draw = group('Draw Borders', PP.el('div', { class: 'rstack' }, [shadeBtn, borderBtn]));
    return [options, styles, draw];
  }

  function buildTableLayout() {
    const del = PP.el('button', { class: 'rbtn', onclick: function () {
      PP.openMenu(del, [
        { label: 'Delete Columns', run: function () { PP.cmd('tblDelete', 'col'); } },
        { label: 'Delete Rows', run: function () { PP.cmd('tblDelete', 'row'); } },
        { label: 'Delete Table', run: function () { PP.cmd('tblDelete', 'table'); } },
      ]);
    } }, [PP.el('span', { class: 'ico', html: '&#10006;' }), PP.el('span', { text: 'Delete' })]);
    const rowsCols = group('Rows & Columns', [
      del,
      PP.el('div', { class: 'rstack' }, [
        smallRow('&#8593;', 'Insert Above', 'tblInsert', 'above'),
        smallRow('&#8595;', 'Insert Below', 'tblInsert', 'below'),
      ]),
      PP.el('div', { class: 'rstack' }, [
        smallRow('&#8592;', 'Insert Left', 'tblInsert', 'left'),
        smallRow('&#8594;', 'Insert Right', 'tblInsert', 'right'),
      ]),
    ]);
    const align = group('Alignment', PP.el('div', { class: 'r-field' }, [
      iconBtn('&#8801;', '', 'align', 'left', 'Align Left'),
      iconBtn('&#9776;', '', 'align', 'center', 'Center'),
      iconBtn('&#8803;', '', 'align', 'right', 'Align Right'),
      iconBtn('&#8593;', '', 'valign', 'top', 'Align Top'),
      iconBtn('&#8597;', '', 'valign', 'middle', 'Align Middle'),
      iconBtn('&#8595;', '', 'valign', 'bottom', 'Align Bottom'),
    ]));
    const arrange = group('Arrange', PP.el('div', { class: 'rstack' }, [
      smallRow('&#11014;', 'Bring Forward', 'forward'),
      smallRow('&#11015;', 'Send Backward', 'backward'),
    ]));
    return [rowsCols, align, arrange];
  }

  /* ---------- render the active tab ---------- */
  PP.renderRibbon = function () {
    const body = document.getElementById('ribbon-body');
    body.innerHTML = '';
    let groups = [];
    if (activeTab === 'home') groups = buildHome();
    else if (activeTab === 'insert') groups = buildInsert();
    else if (activeTab === 'design') groups = buildDesign();
    else if (activeTab === 'transitions') groups = buildTransitions();
    else if (activeTab === 'animations') groups = buildAnimations();
    else if (activeTab === 'slideshow') groups = buildSlideShow();
    else if (activeTab === 'view') groups = buildView();
    else if (activeTab === 'shapeformat') groups = buildShapeFormat();
    else if (activeTab === 'pictureformat') groups = buildPictureFormat();
    else if (activeTab === 'tabledesign') groups = buildTableDesign();
    else if (activeTab === 'tablelayout') groups = buildTableLayout();
    groups.forEach(function (g) { body.appendChild(g); });
    PP.syncRibbonState();
  };

  /* ---------- contextual tab reveal ---------- */
  let shapeTabBtn = null, picTabBtn = null, tblDesignBtn = null, tblLayoutBtn = null;
  function ensureCtxTab() {
    if (shapeTabBtn) return;
    const tabs = document.getElementById('ribbon-tabs');
    tblDesignBtn = PP.el('button', { class: 'rtab ctx-tab', dataset: { tab: 'tabledesign' }, text: 'Table Design', style: 'color:#b7472a;display:none' });
    tblLayoutBtn = PP.el('button', { class: 'rtab ctx-tab', dataset: { tab: 'tablelayout' }, text: 'Layout', style: 'color:#b7472a;display:none' });
    picTabBtn = PP.el('button', { class: 'rtab ctx-tab', dataset: { tab: 'pictureformat' }, text: 'Picture Format', style: 'color:#b7472a;display:none' });
    shapeTabBtn = PP.el('button', { class: 'rtab ctx-tab', dataset: { tab: 'shapeformat' }, text: 'Shape Format', style: 'color:#b7472a;display:none' });
    [tblDesignBtn, tblLayoutBtn, picTabBtn, shapeTabBtn].forEach(function (b) { tabs.appendChild(b); });
  }
  PP.updateContextualTab = function () {
    ensureCtxTab();
    const sel = PP.selectedObjs();
    const isTable = sel.length === 1 && sel[0].type === 'table';
    const hasImg = !isTable && sel.length && sel.every(function (o) { return o.type === 'image'; });
    const hasOther = !isTable && sel.length && sel.some(function (o) { return o.type !== 'image'; });
    tblDesignBtn.style.display = isTable ? '' : 'none';
    tblLayoutBtn.style.display = isTable ? '' : 'none';
    picTabBtn.style.display = hasImg ? '' : 'none';
    shapeTabBtn.style.display = hasOther ? '' : 'none';
    const ctx = ['pictureformat', 'shapeformat', 'tabledesign', 'tablelayout'];
    if (ctx.indexOf(activeTab) >= 0) {
      const stillValid = (activeTab === 'pictureformat' && hasImg) || (activeTab === 'shapeformat' && hasOther) ||
        ((activeTab === 'tabledesign' || activeTab === 'tablelayout') && isTable);
      if (!stillValid) {
        PP.gotoTab(isTable ? 'tabledesign' : hasImg ? 'pictureformat' : hasOther ? 'shapeformat' : 'home');
        return;
      }
      PP.renderRibbon();
    }
  };

  /* ---------- reflect selected-object formatting in toolbar ---------- */
  PP.syncRibbonState = function () {
    const o = PP.selectedObjs()[0];
    const setTog = function (cmd, on) {
      PP.$$('.icon-btn[data-cmd="' + cmd + '"]').forEach(function (b) { b.classList.toggle('toggled', !!on); });
    };
    const live = PP.queryTextState && PP.queryTextState();   // caret-level state while editing
    if (live) {
      setTog('bold', live.bold); setTog('italic', live.italic); setTog('underline', live.underline); setTog('strike', live.strike);
      const f = document.getElementById('sel-font'); if (f && live.fontFamily) f.value = live.fontFamily;
      const sz = document.getElementById('sel-size'); if (sz && live.fontSize) sz.value = live.fontSize;
      PP.$$('.icon-btn[data-cmd="align"]').forEach(function (b) { b.classList.toggle('toggled', b.dataset.arg === live.align); });
      if (o) PP.$$('.icon-btn[data-cmd="bullet"]').forEach(function (b) { b.classList.toggle('toggled', b.dataset.arg === o.bullet); });
      return;
    }
    if (o && (o.type === 'text' || o.text != null)) {
      setTog('bold', o.bold); setTog('italic', o.italic); setTog('underline', o.underline); setTog('strike', o.strike);
      const f = document.getElementById('sel-font'); if (f) f.value = o.fontFamily;
      const sz = document.getElementById('sel-size'); if (sz) sz.value = o.fontSize;
      PP.$$('.icon-btn[data-cmd="align"]').forEach(function (b) { b.classList.toggle('toggled', b.dataset.arg === o.align); });
      PP.$$('.icon-btn[data-cmd="valign"]').forEach(function (b) { b.classList.toggle('toggled', b.dataset.arg === o.valign); });
      PP.$$('.icon-btn[data-cmd="bullet"]').forEach(function (b) { b.classList.toggle('toggled', b.dataset.arg === o.bullet); });
    } else {
      ['bold', 'italic', 'underline', 'strike'].forEach(function (c) { setTog(c, false); });
    }
  };

  /* ---------- tab switching ---------- */
  function init() {
    document.getElementById('ribbon-tabs').addEventListener('click', function (e) {
      const t = e.target.closest('.rtab'); if (!t) return;
      const tab = t.dataset.tab;
      if (tab === 'file') { PP.openBackstage(); return; }
      activeTab = tab;
      PP.$$('.rtab').forEach(function (b) { b.classList.toggle('active', b === t); });
      PP.renderRibbon();
    });
    ensureCtxTab();
    PP.renderRibbon();

    PP.on('selection', function () { PP.syncRibbonState(); PP.updateContextualTab(); });
    PP.on('change', function () {
      if (activeTab === 'transitions' || activeTab === 'animations') return; // avoid rebuild flicker
      PP.syncRibbonState();
      PP.updateContextualTab();
    });
    PP.on('slidechange', function () {
      if (activeTab === 'transitions') PP.renderRibbon();
    });
  }

  PP.gotoTab = function (tab) {
    activeTab = tab;
    PP.$$('.rtab').forEach(function (b) { b.classList.toggle('active', b.dataset.tab === tab); });
    PP.renderRibbon();
  };

  PP.initRibbon = init;
})(window.PP);
