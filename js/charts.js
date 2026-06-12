/* ============ charts.js — chart objects: data, SVG rendering, editing ============ */
(function (PP) {
  'use strict';
  const S = PP.State;
  const NS = 'http://www.w3.org/2000/svg';

  PP.CHART_COLORS = ['#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5', '#70AD47', '#264478', '#9E480E'];
  PP.CHART_TYPES = [
    { id: 'column', name: 'Clustered Column' },
    { id: 'bar', name: 'Clustered Bar' },
    { id: 'line', name: 'Line' },
    { id: 'area', name: 'Area' },
    { id: 'pie', name: 'Pie' },
  ];

  PP.selectedChart = function () { const o = PP.selectedObjs()[0]; return (o && o.type === 'chart') ? o : null; };

  function defaultData() {
    return {
      categories: ['Category 1', 'Category 2', 'Category 3', 'Category 4'],
      series: [
        { name: 'Series 1', values: [4.3, 2.5, 3.5, 4.5] },
        { name: 'Series 2', values: [2.4, 4.4, 1.8, 2.8] },
        { name: 'Series 3', values: [2, 2, 3, 5] },
      ]
    };
  }

  PP.insertChart = function (type) {
    const w = 640, h = 400;
    const o = PP.makeObject('chart', {
      w: w, h: h, x: (PP.SLIDE_W - w) / 2, y: (PP.SLIDE_H - h) / 2,
      chartType: type || 'column', data: defaultData(),
      title: 'Chart Title', showLegend: true, showTitle: true, showGrid: true,
      fill: '#FFFFFF', stroke: '#D9D9D9'
    });
    return PP.addObject(o);
  };

  /* ---------- rendering ---------- */
  function niceMax(v) {
    if (v <= 0) return 1;
    const pow = Math.pow(10, Math.floor(Math.log10(v)));
    const f = v / pow;
    const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
    return nf * pow;
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function txt(x, y, s, opts) {
    opts = opts || {};
    return '<text x="' + x + '" y="' + y + '" font-family="Calibri,Segoe UI,sans-serif" font-size="' + (opts.size || 12) +
      '" fill="' + (opts.fill || '#595959') + '" text-anchor="' + (opts.anchor || 'start') + '"' +
      (opts.weight ? ' font-weight="' + opts.weight + '"' : '') +
      (opts.transform ? ' transform="' + opts.transform + '"' : '') + '>' + esc(s) + '</text>';
  }

  PP.chartSVG = function (o) {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', '0 0 ' + o.w + ' ' + o.h);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.style.position = 'absolute'; svg.style.inset = '0';
    svg.innerHTML = buildChart(o);
    return svg;
  };

  function buildChart(o) {
    const W = o.w, H = o.h, d = o.data;
    let s = '';
    // background
    s += '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="' + (o.fill || '#fff') + '" stroke="' + (o.stroke || '#D9D9D9') + '"/>';
    // title
    const hasTitle = o.showTitle !== false && o.title;
    if (hasTitle) s += txt(W / 2, 22, o.title, { size: 16, fill: '#404040', anchor: 'middle', weight: '600' });
    const legendW = o.showLegend !== false ? 120 : 14;
    const pad = { l: 46, r: legendW, t: hasTitle ? 36 : 16, b: 34 };
    const plotW = Math.max(20, W - pad.l - pad.r), plotH = Math.max(20, H - pad.t - pad.b);
    const colors = PP.CHART_COLORS;

    if (o.chartType === 'pie') {
      s += pieChart(o, pad, plotW, plotH, colors);
    } else if (o.chartType === 'bar') {
      s += barChart(o, pad, plotW, plotH, colors);
    } else {
      s += xyChart(o, pad, plotW, plotH, colors);
    }
    // legend
    if (o.showLegend !== false) {
      const names = o.chartType === 'pie' ? d.categories : d.series.map(function (x) { return x.name; });
      const lx = W - legendW + 8;
      let ly = pad.t + 6;
      names.forEach(function (nm, i) {
        s += '<rect x="' + lx + '" y="' + (ly - 9) + '" width="11" height="11" rx="2" fill="' + colors[i % colors.length] + '"/>';
        s += txt(lx + 16, ly, nm, { size: 11, fill: '#404040' });
        ly += 18;
      });
    }
    return s;
  }

  function yAxis(pad, plotW, plotH, maxV, vertical) {
    let s = '';
    const ticks = 5;
    for (let t = 0; t <= ticks; t++) {
      const val = maxV * t / ticks;
      if (vertical) { // value axis is horizontal (bar chart)
        const x = pad.l + plotW * t / ticks;
        s += '<line x1="' + x + '" y1="' + pad.t + '" x2="' + x + '" y2="' + (pad.t + plotH) + '" stroke="#E6E6E6"/>';
        s += txt(x, pad.t + plotH + 16, fmt(val), { size: 11, anchor: 'middle' });
      } else {
        const y = pad.t + plotH - plotH * t / ticks;
        s += '<line x1="' + pad.l + '" y1="' + y + '" x2="' + (pad.l + plotW) + '" y2="' + y + '" stroke="#E6E6E6"/>';
        s += txt(pad.l - 6, y + 4, fmt(val), { size: 11, anchor: 'end' });
      }
    }
    return s;
  }
  function fmt(v) { return (Math.round(v * 100) / 100).toString(); }

  function xyChart(o, pad, plotW, plotH, colors) {
    const d = o.data, n = d.categories.length, series = d.series;
    let maxV = 0; series.forEach(function (se) { se.values.forEach(function (v) { maxV = Math.max(maxV, v); }); });
    maxV = niceMax(maxV);
    let s = o.showGrid !== false ? yAxis(pad, plotW, plotH, maxV, false) : '';
    // axes
    s += '<line x1="' + pad.l + '" y1="' + (pad.t + plotH) + '" x2="' + (pad.l + plotW) + '" y2="' + (pad.t + plotH) + '" stroke="#A6A6A6"/>';
    const groupW = plotW / n;
    // category labels
    d.categories.forEach(function (c, i) {
      s += txt(pad.l + groupW * i + groupW / 2, pad.t + plotH + 16, c, { size: 11, anchor: 'middle' });
    });
    if (o.chartType === 'column') {
      const sN = series.length, gap = groupW * 0.18, barW = (groupW - gap) / sN;
      series.forEach(function (se, j) {
        se.values.forEach(function (v, i) {
          const bh = Math.max(0, v / maxV * plotH);
          const x = pad.l + groupW * i + gap / 2 + j * barW;
          const y = pad.t + plotH - bh;
          s += '<rect x="' + (x + 1) + '" y="' + y + '" width="' + Math.max(1, barW - 2) + '" height="' + bh + '" fill="' + colors[j % colors.length] + '"/>';
        });
      });
    } else { // line or area
      series.forEach(function (se, j) {
        const pts = se.values.map(function (v, i) {
          return [pad.l + groupW * i + groupW / 2, pad.t + plotH - v / maxV * plotH];
        });
        const dpath = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0] + ',' + p[1]; }).join(' ');
        if (o.chartType === 'area') {
          const base = pad.t + plotH;
          s += '<path d="' + dpath + ' L' + pts[pts.length - 1][0] + ',' + base + ' L' + pts[0][0] + ',' + base + ' Z" fill="' + colors[j % colors.length] + '" fill-opacity="0.35"/>';
        }
        s += '<path d="' + dpath + '" fill="none" stroke="' + colors[j % colors.length] + '" stroke-width="2.5"/>';
        pts.forEach(function (p) { s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3.5" fill="' + colors[j % colors.length] + '"/>'; });
      });
    }
    return s;
  }

  function barChart(o, pad, plotW, plotH, colors) {
    const d = o.data, n = d.categories.length, series = d.series;
    let maxV = 0; series.forEach(function (se) { se.values.forEach(function (v) { maxV = Math.max(maxV, v); }); });
    maxV = niceMax(maxV);
    let s = o.showGrid !== false ? yAxis(pad, plotW, plotH, maxV, true) : '';
    s += '<line x1="' + pad.l + '" y1="' + pad.t + '" x2="' + pad.l + '" y2="' + (pad.t + plotH) + '" stroke="#A6A6A6"/>';
    const catH = plotH / n, sN = series.length, gap = catH * 0.18, barH = (catH - gap) / sN;
    d.categories.forEach(function (c, i) {
      s += txt(pad.l - 6, pad.t + catH * i + catH / 2 + 4, c, { size: 11, anchor: 'end' });
    });
    series.forEach(function (se, j) {
      se.values.forEach(function (v, i) {
        const bw = Math.max(0, v / maxV * plotW);
        const y = pad.t + catH * i + gap / 2 + j * barH;
        s += '<rect x="' + pad.l + '" y="' + (y + 1) + '" width="' + bw + '" height="' + Math.max(1, barH - 2) + '" fill="' + colors[j % colors.length] + '"/>';
      });
    });
    return s;
  }

  function pieChart(o, pad, plotW, plotH, colors) {
    const d = o.data, vals = (d.series[0] || { values: [] }).values;
    const total = vals.reduce(function (a, b) { return a + Math.max(0, b); }, 0) || 1;
    const cx = pad.l + plotW / 2, cy = pad.t + plotH / 2, r = Math.min(plotW, plotH) / 2 * 0.92;
    let ang = -Math.PI / 2, s = '';
    vals.forEach(function (v, i) {
      const frac = Math.max(0, v) / total;
      const a2 = ang + frac * Math.PI * 2;
      const x1 = cx + r * Math.cos(ang), y1 = cy + r * Math.sin(ang);
      const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
      const large = frac > 0.5 ? 1 : 0;
      if (frac >= 0.9999) {
        s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + colors[i % colors.length] + '"/>';
      } else {
        s += '<path d="M' + cx + ',' + cy + ' L' + x1 + ',' + y1 + ' A' + r + ',' + r + ' 0 ' + large + ' 1 ' + x2 + ',' + y2 + ' Z" fill="' + colors[i % colors.length] + '" stroke="#fff" stroke-width="1"/>';
      }
      // percentage label
      const mid = (ang + a2) / 2, lr = r * 0.62;
      if (frac > 0.04) s += txt(cx + lr * Math.cos(mid), cy + lr * Math.sin(mid) + 4, Math.round(frac * 100) + '%', { size: 11, fill: '#fff', anchor: 'middle', weight: '600' });
      ang = a2;
    });
    return s;
  }

  /* ---------- operations ---------- */
  PP.chartSetType = function (type) {
    const o = PP.selectedChart(); if (!o) return;
    o.chartType = type; PP.commit('Chart Type');
  };
  PP.chartToggle = function (key) {
    const o = PP.selectedChart(); if (!o) return;
    // keys default to shown (undefined === true); flip to the opposite
    o[key] = (o[key] === false);
    PP.commit('Chart Option');
  };

  /* ---------- edit data dialog ---------- */
  PP.openChartData = function (id) {
    const o = id ? PP.findObj(id) : PP.selectedChart();
    if (!o || o.type !== 'chart') return;
    const data = PP.deepClone(o.data);

    const overlay = PP.el('div', { class: 'modal-overlay' });
    const dlg = PP.el('div', { class: 'modal chart-data' });
    dlg.appendChild(PP.el('div', { class: 'modal-title', text: 'Edit Chart Data' }));
    const wrap = PP.el('div', { class: 'cd-grid-wrap' });
    dlg.appendChild(wrap);

    function rebuild() {
      wrap.innerHTML = '';
      const tbl = PP.el('table', { class: 'cd-grid' });
      // header row: corner + series names + remove buttons
      const thead = PP.el('tr');
      thead.appendChild(PP.el('th', { text: '' }));
      data.series.forEach(function (se, j) {
        const th = PP.el('th');
        const inp = PP.el('input', { value: se.name, oninput: function () { se.name = this.value; } });
        th.appendChild(inp);
        const rm = PP.el('button', { class: 'cd-rm', text: '×', title: 'Delete series', onclick: function () { if (data.series.length > 1) { data.series.splice(j, 1); rebuild(); } } });
        th.appendChild(rm);
        thead.appendChild(th);
      });
      const addCol = PP.el('th');
      addCol.appendChild(PP.el('button', { class: 'cd-add', text: '+', title: 'Add series', onclick: function () { data.series.push({ name: 'Series ' + (data.series.length + 1), values: data.categories.map(function () { return 0; }) }); rebuild(); } }));
      thead.appendChild(addCol);
      tbl.appendChild(thead);
      // category rows
      data.categories.forEach(function (cat, i) {
        const tr = PP.el('tr');
        const td0 = PP.el('td');
        td0.appendChild(PP.el('input', { value: cat, oninput: function () { data.categories[i] = this.value; } }));
        const rm = PP.el('button', { class: 'cd-rm', text: '×', title: 'Delete row', onclick: function () { if (data.categories.length > 1) { data.categories.splice(i, 1); data.series.forEach(function (se) { se.values.splice(i, 1); }); rebuild(); } } });
        td0.appendChild(rm);
        tr.appendChild(td0);
        data.series.forEach(function (se) {
          const td = PP.el('td');
          td.appendChild(PP.el('input', { type: 'number', value: se.values[i], oninput: function () { se.values[i] = parseFloat(this.value) || 0; } }));
          tr.appendChild(td);
        });
        tr.appendChild(PP.el('td'));
        tbl.appendChild(tr);
      });
      // add row
      const addRow = PP.el('tr');
      const ac = PP.el('td');
      ac.appendChild(PP.el('button', { class: 'cd-add', text: '+', title: 'Add category', onclick: function () { data.categories.push('Category ' + (data.categories.length + 1)); data.series.forEach(function (se) { se.values.push(0); }); rebuild(); } }));
      addRow.appendChild(ac);
      tbl.appendChild(addRow);
      wrap.appendChild(tbl);
    }
    rebuild();

    const btns = PP.el('div', { class: 'modal-btns' });
    btns.appendChild(PP.el('button', { class: 'btn-secondary', text: 'Cancel', onclick: function () { overlay.remove(); } }));
    btns.appendChild(PP.el('button', { class: 'btn-primary', text: 'OK', onclick: function () { o.data = data; PP.commit('Edit Chart Data'); overlay.remove(); } }));
    dlg.appendChild(btns);
    overlay.appendChild(dlg);
    overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  };

})(window.PP);
