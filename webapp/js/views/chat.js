import { S, emit, on, nameOf, isAdmin, loadAvatar } from '../state.js';
import { api } from '../api.js';
import { $, $$, esc, sheet, toast, fmtTime, fmtDay, fmtAgo, avatarHTML, confetti } from '../ui.js';
import { icon } from '../art/icons.js';
import { petSVG } from '../art/pets.js';
import { haptic } from '../tg.js';

let root = null, pollT = null, offs = [];
let msgs = [];
let partnerRead = 0;
let replyTo = null;
let hasMore = false, loadingOld = false;

const REACTS = ['heart', 'fire', 'star', 'sparkle'];

export function render(r) {
  root = r;
  const pa = S.partner;
  root.innerHTML = `<div class="chat-wrap">
    <div class="chat-head">
      <div id="pa-av">${avatarHTML(pa, pa && S.avatars[pa.id])}</div>
      <div class="grow"><b>${esc(pa ? pa.name : 'Чат')}</b><span id="pa-st"></span></div>
    </div>
    <div class="msgs" id="msgs"><div class="empty">Загружаем…</div></div>
    <div id="reply-slot"></div>
    <div class="composer"><textarea id="inp" rows="1" maxlength="2000" placeholder="Напиши что-нибудь нежное…"></textarea>
      <button class="icon-btn accent" id="send" aria-label="Отправить">${icon('send')}</button></div>
  </div>`;
  presence();
  offs.push(on('presence', presence));
  offs.push(on('avatar', (uid) => { if (pa && uid === pa.id && root) $('#pa-av', root).innerHTML = avatarHTML(pa, S.avatars[pa.id]); }));
  const inp = $('#inp', root);
  inp.addEventListener('input', () => { inp.style.height = 'auto'; inp.style.height = Math.min(130, inp.scrollHeight) + 'px'; });
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || !('ontouchstart' in window)) && !e.shiftKey) { e.preventDefault(); send(); } });
  $('#send', root).onclick = send;
  $('#msgs', root).addEventListener('scroll', onScroll);
  load();
  pollT = setInterval(poll, 3000);
  document.body.style.overflow = 'hidden';
}

export function destroy() {
  clearInterval(pollT);
  offs.forEach((f) => f()); offs = [];
  document.body.style.overflow = '';
  root = null;
  replyTo = null;
}

function presence() {
  if (!root) return;
  const st = $('#pa-st', root);
  const on = S.partnerOnline;
  st.className = on ? 'on' : '';
  st.textContent = S.partner ? (on ? 'в приложении' : fmtAgo(S.partner.last_seen)) : 'второй человек ещё не подключён';
}

async function load() {
  try {
    const d = await api('/chat');
    msgs = d.messages; partnerRead = d.partner_read; hasMore = d.has_more;
    S.partnerOnline = d.partner_online; presence();
    draw(true);
    markRead();
  } catch (e) { $('#msgs', root).innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}

async function poll() {
  if (!root || document.hidden) return;
  const last = msgs.length ? msgs[msgs.length - 1].id : 0;
  try {
    const d = await api('/chat?after=' + last);
    const box = $('#msgs', root);
    const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
    let changed = false;
    const fresh = d.messages.filter((m) => !msgs.some((x) => x.id === m.id));
    if (fresh.length) {
      msgs.push(...fresh);
      changed = true;
      if (fresh.some((m) => m.uid !== S.me.id)) haptic.soft();
      if (fresh.some((m) => m.type === 'adopted')) confetti(80);
    }
    if (d.partner_read !== partnerRead) { partnerRead = d.partner_read; changed = true; }
    if (d.partner_online !== S.partnerOnline) { S.partnerOnline = d.partner_online; if (S.partner) S.partner.online = d.partner_online; presence(); }
    if (changed) { draw(nearBottom); markRead(); }
  } catch (e) { /* */ }
}

async function onScroll(e) {
  const box = e.target;
  if (box.scrollTop > 40 || !hasMore || loadingOld || !msgs.length) return;
  loadingOld = true;
  try {
    const d = await api('/chat?before=' + msgs[0].id);
    const h0 = box.scrollHeight;
    msgs = [...d.messages, ...msgs];
    hasMore = d.has_more && d.messages.length > 0;
    draw(false);
    box.scrollTop = box.scrollHeight - h0;
  } catch (err) { /* */ }
  loadingOld = false;
}

function markRead() {
  const last = msgs.length ? msgs[msgs.length - 1].id : 0;
  if (!last) return;
  const lastText = [...msgs].reverse().find((m) => m.type === 'text' && !m.deleted && m.uid);
  if (lastText) S.lastChatText = lastText.text;
  api('/chat/read', { method: 'POST', body: { id: last } }).catch(() => {});
  S.unread = 0;
  emit('unread');
}

function sysHTML(m) {
  const t = fmtTime(m.ts);
  if (m.type === 'pick') {
    return `<div class="sys">${petSVG(m.species, { stage: 2, mood: 'love' })}<b>${esc(nameOf(m.uid))} выбирает: ${esc(S.species[m.species]?.name || '')}</b><span>${t}</span></div>`;
  }
  if (m.type === 'adopted') {
    return `<div class="sys big">${petSVG(m.species, { stage: 0, mood: 'love' })}<b>${esc(m.text)}</b><span>${t}</span></div>`;
  }
  if (m.type === 'stage') {
    return `<div class="sys">${petSVG(m.species || S.pet.species, { stage: m.stage || 0, mood: 'happy' })}<b>${esc(m.text)}</b><span>${t}</span></div>`;
  }
  if (m.type === 'name') {
    return `<div class="sys"><b>${esc(nameOf(m.uid))}: ${esc(m.text)}</b><span>${t}</span></div>`;
  }
  return `<div class="sys"><b>${esc(m.text)}</b><span>${t}</span></div>`;
}

function msgHTML(m) {
  if (m.type !== 'text') return sysHTML(m);
  const mine = m.uid === S.me.id;
  const q = m.reply_to ? msgs.find((x) => x.id === m.reply_to) : null;
  const reacts = Object.values(m.reactions || {});
  const read = mine && partnerRead >= m.id;
  return `<div class="msg ${mine ? 'me' : 'them'} ${m.deleted ? 'deleted' : ''} ${reacts.length ? 'has-r' : ''}" data-id="${m.id}">${q ? `<div class="quote">${esc(q.deleted ? 'удалено' : q.text)}</div>` : ''}<span class="txt">${m.deleted ? 'сообщение удалено' : esc(m.text)}</span>
    <div class="meta">${fmtTime(m.ts)}${mine ? icon('check') + (read ? icon('check') : '') : ''}</div>
    ${reacts.length ? `<div class="reacts">${reacts.map((r) => `<i>${icon(r)}</i>`).join('')}</div>` : ''}</div>`;
}

function draw(toBottom) {
  if (!root) return;
  const box = $('#msgs', root);
  if (!msgs.length) {
    box.innerHTML = `<div class="empty" style="margin:auto">${S.pet.status !== 'alive' ? 'Здесь вы выбираете питомца и болтаете. Выбор каждого будет приходить сюда.' : 'Напишите друг другу что-нибудь тёплое'}</div>`;
    return;
  }
  let html = '', lastDay = '';
  for (const m of msgs) {
    const day = fmtDay(m.ts);
    if (day !== lastDay) { html += `<div class="day-sep">${day}</div>`; lastDay = day; }
    html += msgHTML(m);
  }
  box.innerHTML = html;
  bindMsgs(box);
  if (toBottom) requestAnimationFrame(() => { box.scrollTop = box.scrollHeight; });
}

function bindMsgs(box) {
  $$('.msg', box).forEach((el) => {
    const id = +el.dataset.id;
    let t = null, lastTap = 0;
    const start = () => { t = setTimeout(() => { t = null; haptic.heavy(); msgMenu(id); }, 480); };
    const cancel = () => { if (t) { clearTimeout(t); t = null; } };
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchend', cancel);
    el.addEventListener('touchmove', cancel, { passive: true });
    el.addEventListener('contextmenu', (e) => { e.preventDefault(); msgMenu(id); });
    el.addEventListener('click', () => {
      const n = Date.now();
      if (n - lastTap < 320) react(id, 'heart');
      lastTap = n;
    });
  });
}

async function react(id, r) {
  const m = msgs.find((x) => x.id === id);
  if (!m || m.deleted) return;
  haptic.tap();
  try {
    const d = await api(`/chat/${id}/react`, { method: 'POST', body: { reaction: r } });
    Object.assign(m, d.message);
    draw(false);
  } catch (e) { toast(e.message, 'err'); }
}

function msgMenu(id) {
  const m = msgs.find((x) => x.id === id);
  if (!m || m.deleted) return;
  const canDel = m.uid === S.me.id || isAdmin();
  sheet({
    html: `<div class="react-pick">${REACTS.map((r) => `<button data-r="${r}">${icon(r)}</button>`).join('')}</div>
      <div class="menu-list">
        <button data-a="reply">${icon('reply')} Ответить</button>
        <button data-a="copy">${icon('list')} Скопировать</button>
        ${canDel ? `<button data-a="del" class="red">${icon('trash')} Удалить</button>` : ''}
      </div>`,
    onMount(sh, close) {
      $$('[data-r]', sh).forEach((b) => { b.onclick = () => { close(); react(id, b.dataset.r); }; });
      $$('[data-a]', sh).forEach((b) => {
        b.onclick = async () => {
          close();
          if (b.dataset.a === 'reply') setReply(m);
          if (b.dataset.a === 'copy') { try { await navigator.clipboard.writeText(m.text); toast('Скопировано'); } catch (e) { toast('Не получилось скопировать'); } }
          if (b.dataset.a === 'del') {
            try { const d = await api('/chat/' + id, { method: 'DELETE' }); Object.assign(m, d.message); draw(false); } catch (e) { toast(e.message, 'err'); }
          }
        };
      });
    },
  });
}

function setReply(m) {
  replyTo = m;
  const slot = $('#reply-slot', root);
  if (!m) { slot.innerHTML = ''; return; }
  slot.innerHTML = `<div class="reply-bar">${icon('reply')}<div class="grow">${esc(m.text)}</div><button id="rx">${icon('close')}</button></div>`;
  $('#rx', slot).onclick = () => setReply(null);
  $('#inp', root).focus();
}

async function send() {
  const inp = $('#inp', root);
  const text = inp.value.trim();
  if (!text) return;
  inp.value = '';
  inp.style.height = 'auto';
  haptic.tap();
  const rt = replyTo ? replyTo.id : null;
  setReply(null);
  try {
    const d = await api('/chat', { method: 'POST', body: { text, reply_to: rt } });
    if (!msgs.find((x) => x.id === d.message.id)) msgs.push(d.message);
    draw(true);
    S.lastChatText = text;
  } catch (e) {
    inp.value = text;
    toast(e.message, 'err');
  }
}
