/* ============ comments.js — slide comments: markers + comments pane ============ */
(function (PP) {
  'use strict';
  const S = PP.State;
  const AUTHOR = 'Edwin Ang';

  function comments(slide) { slide = slide || PP.slide(); slide.comments = slide.comments || []; return slide.comments; }
  function nowTs() { try { return Date.now(); } catch (e) { return 0; } }
  function timeStr(ts) { try { return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  function initials(name) { return (name || '?').split(' ').map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase(); }

  /* ---------- ops ---------- */
  PP.newComment = function (x, y) {
    const list = comments();
    const c = { id: PP.uid('cm'), author: AUTHOR, text: '', x: x != null ? x : 70, y: y != null ? y : 70, ts: nowTs(), replies: [], done: false };
    list.push(c);
    PP._activeComment = c.id; PP._editingComment = c.id;
    PP.commit('New Comment');
    PP.openCommentsPane();
    PP.renderObjects();
  };
  PP.deleteComment = function (id) {
    const list = comments();
    const i = list.findIndex(function (c) { return c.id === id; });
    if (i >= 0) { list.splice(i, 1); if (PP._activeComment === id) PP._activeComment = null; PP.commit('Delete Comment'); PP.render(); PP.renderCommentsPane(); }
  };
  PP.deleteActiveComment = function () { if (PP._activeComment) PP.deleteComment(PP._activeComment); };
  PP.resolveComment = function (id) {
    const c = comments().find(function (x) { return x.id === id; });
    if (c) { c.done = !c.done; PP.commit('Resolve Comment'); PP.render(); PP.renderCommentsPane(); }
  };
  PP.stepComment = function (dir) {
    const list = comments(); if (!list.length) return;
    let i = list.findIndex(function (c) { return c.id === PP._activeComment; });
    i = (i + dir + list.length) % list.length;
    PP._activeComment = list[i].id; PP.openCommentsPane(); PP.render(); PP.renderCommentsPane();
  };

  /* ---------- markers on the canvas ---------- */
  PP.renderCommentMarkers = function (root) {
    const list = (PP.slide().comments) || [];
    if (!list.length) return;
    const inv = 1 / S.zoom;
    list.forEach(function (c) {
      if (c.done) return;
      const m = PP.el('div', { class: 'comment-marker' + (PP._activeComment === c.id ? ' active' : '') });
      m.style.cssText = 'position:absolute;left:' + c.x + 'px;top:' + c.y + 'px;width:' + (26 * inv) + 'px;height:' + (26 * inv) +
        'px;font-size:' + (12 * inv) + 'px;line-height:' + (24 * inv) + 'px;border-width:' + inv + 'px;transform:translate(-50%,-100%)';
      m.textContent = initials(c.author);
      m.addEventListener('mousedown', function (e) {
        e.stopPropagation(); e.preventDefault();
        PP._activeComment = c.id; PP.openCommentsPane(); PP.renderCommentsPane();
        const start = PP.screenToSlide(e.clientX, e.clientY), ox = c.x, oy = c.y; let moved = false;
        function mv(ev) { const sp = PP.screenToSlide(ev.clientX, ev.clientY); c.x = ox + (sp.x - start.x); c.y = oy + (sp.y - start.y); moved = true; PP.renderObjects(); }
        function up() { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); if (moved) PP.commit('Move Comment'); }
        window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
      });
      root.appendChild(m);
    });
  };

  /* ---------- comments pane ---------- */
  let pane = null;
  PP.isCommentsPaneOpen = function () { return !!pane; };
  PP.openCommentsPane = function () { if (!pane) { build(); } PP.renderCommentsPane(); };
  PP.toggleCommentsPane = function () { if (pane) closePane(); else PP.openCommentsPane(); };
  PP.closeCommentsPane = function () { closePane(); };
  function closePane() { if (pane) { pane.remove(); pane = null; } }
  function build() {
    pane = PP.el('div', { class: 'sel-pane comments-pane' });
    pane.innerHTML = '<div class="sp-title">Comments <button class="sp-close">&times;</button></div>' +
      '<div class="sp-tools"><button data-cm="new">&#128172; New</button></div>' +
      '<div class="sp-list cm-list"></div>';
    document.body.appendChild(pane);
    pane.querySelector('.sp-close').addEventListener('click', closePane);
    pane.querySelector('.sp-tools').addEventListener('click', function (e) { if (e.target.closest('button')) PP.newComment(); });
    const ed = document.getElementById('editor').getBoundingClientRect();
    pane.style.top = (ed.top + 12) + 'px'; pane.style.right = '14px';
  }

  PP.renderCommentsPane = function (focusNew) {
    if (!pane) return;
    const list = pane.querySelector('.cm-list'); list.innerHTML = '';
    const all = comments();
    if (!all.length) { list.appendChild(PP.el('div', { class: 'ap-empty', text: 'No comments on this slide. Click New to add one.' })); return; }
    all.forEach(function (c) {
      const card = PP.el('div', { class: 'cm-card' + (PP._activeComment === c.id ? ' active' : '') + (c.done ? ' done' : '') });
      card.addEventListener('mousedown', function (e) { if (e.target.closest('button,textarea,input')) return; PP._activeComment = c.id; PP.renderObjects(); PP.renderCommentsPane(); });
      const head = PP.el('div', { class: 'cm-head' });
      head.appendChild(PP.el('span', { class: 'cm-avatar', text: initials(c.author) }));
      head.appendChild(PP.el('div', { class: 'cm-meta' }, [PP.el('div', { class: 'cm-author', text: c.author }), PP.el('div', { class: 'cm-time', text: timeStr(c.ts) })]));
      head.appendChild(PP.el('button', { class: 'cm-act', html: c.done ? '&#10003;' : '&#9711;', title: c.done ? 'Reopen' : 'Resolve', onclick: function (e) { e.stopPropagation(); PP.resolveComment(c.id); } }));
      head.appendChild(PP.el('button', { class: 'cm-act', html: '&times;', title: 'Delete', onclick: function (e) { e.stopPropagation(); PP.deleteComment(c.id); } }));
      card.appendChild(head);

      if (PP._editingComment === c.id || !c.text) {
        const ta = PP.el('textarea', { class: 'cm-input', placeholder: 'Type your comment…' });
        ta.value = c.text;
        ta.addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ta.blur(); } if (e.key === 'Escape') ta.blur(); });
        ta.addEventListener('blur', function () { c.text = ta.value.trim(); PP._editingComment = null; if (!c.text) { PP.deleteComment(c.id); } else { PP.commit('Edit Comment'); PP.renderCommentsPane(); } });
        card.appendChild(ta);
        if (focusNew || PP._editingComment === c.id) setTimeout(function () { ta.focus(); }, 0);
      } else {
        const body = PP.el('div', { class: 'cm-text', text: c.text });
        body.addEventListener('dblclick', function () { PP._editingComment = c.id; PP.renderCommentsPane(); });
        card.appendChild(body);
      }

      (c.replies || []).forEach(function (r) {
        card.appendChild(PP.el('div', { class: 'cm-reply' }, [
          PP.el('span', { class: 'cm-avatar small', text: initials(r.author) }),
          PP.el('div', {}, [PP.el('div', { class: 'cm-author', text: r.author + ' · ' + timeStr(r.ts) }), PP.el('div', { class: 'cm-text', text: r.text })])
        ]));
      });
      if (c.text && !c.done) {
        const reply = PP.el('input', { class: 'cm-replybox', placeholder: 'Reply…' });
        reply.addEventListener('keydown', function (e) {
          e.stopPropagation();
          if (e.key === 'Enter' && reply.value.trim()) { c.replies.push({ author: AUTHOR, text: reply.value.trim(), ts: nowTs() }); PP.commit('Reply'); PP.renderCommentsPane(); }
        });
        card.appendChild(reply);
      }
      list.appendChild(card);
    });
  };

  PP.on('slidechange', function () { if (pane) { PP._editingComment = null; PP.renderCommentsPane(); } });

})(window.PP);
