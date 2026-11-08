import { S, emit, on, isAdmin } from '../state.js';
import { api } from '../api.js';
import { $, $$, esc, toast, avatarHTML, fmtAgo, fmtDate, days } from '../ui.js';
import { icon, flameSVG } from '../art/icons.js';
import { petSVG } from '../art/pets.js';
import { haptic } from '../tg.js';

let root = null, offs = [];

const THEMES = [
  ['auto', 'Как в Telegram', 'linear-gradient(135deg,#FFF5F7 50%,#170F1C 50%)', '#FF5C8A'],
  ['light', 'Светлая', 'linear-gradient(135deg,#FFF5F7,#FFE3EB)', '#FF5C8A'],
  ['dark', 'Тёмная', 'linear-gradient(135deg,#1E1424,#2A1D32)', '#FF79A3'],
  ['peach', 'Персик', 'linear-gradient(135deg,#FFF4EC,#FFD9C2)', '#FF7A59'],
  ['lavender', 'Лаванда', 'linear-gradient(135deg,#F7F3FF,#DCCBFF)', '#8C6CF2'],
  ['night', 'Ночь', 'linear-gradient(135deg,#0D1330,#27346E)', '#7FA6FF'],
  ['mint', 'Мята', 'linear-gradient(135deg,#F0FBF6,#BDEFD9)', '#22B39A'],
];
const NOTIFY = [
  ['events', 'Важные даты и дембель', 'Напоминания за неделю, за день и в сам день', 'calendar', 'c1'],
  ['chat', 'Сообщения из чата', 'Если ты не в приложении', 'chat', 'c2'],
  ['pet', 'Питомец', 'Голод, огонёк, рост и выбор', 'paw', 'c6'],
  ['notes', 'Письма и хотелки', 'Когда тебе пишут что-то новое', 'letter', 'c7'],
];

export function render(r) {
  root = r;
  draw();
  offs.push(on('avatar', draw), on('presence', draw));
}
export function destroy() { offs.forEach((f) => f()); offs = []; root = null; }

function draw() {
  if (!root) return;
  const me = S.me, pa = S.partner, p = S.pet;
  const role = me.role === 'admin' ? `<span class="chip">${icon('crown')}Админ</span>` : `<span class="chip">${icon('heart')}Любимый</span>`;
  const joined = me.joined ? Math.max(1, Math.ceil((Date.now() / 1000 - me.joined) / 86400)) : 1;
  root.innerHTML = `
    <div class="card me-card">
      ${avatarHTML(me, S.avatars[me.id], 'xl')}
      <h2>${esc([me.first_name, me.last_name].filter(Boolean).join(' '))}</h2>
      <div class="muted" style="font-weight:700">${me.username ? '@' + esc(me.username) : 'без username'}</div>
      <div class="role">${role}</div>
    </div>
    ${pa ? `<div class="card"><div class="partner-card">${avatarHTML(pa, S.avatars[pa.id])}
      <div class="grow"><b style="font-size:16px">${esc([pa.first_name, pa.last_name].filter(Boolean).join(' ') || pa.name)}</b>
      <div class="tiny" style="font-weight:800;color:${S.partnerOnline ? 'var(--good)' : 'var(--text2)'}">${S.partnerOnline ? 'сейчас в приложении' : esc(fmtAgo(pa.last_seen))}</div></div>
      <button class="icon-btn" id="to-chat">${icon('chat')}</button></div></div>` : ''}
    <div class="card"><h2>${icon('sparkle')} Мы в цифрах</h2><div class="mini-stats">
      <div><b>${joined}</b><span>${days(joined)} в приложении</span></div>
      <div><b style="display:flex;align-items:center;gap:4px">${flameSVG(p.streak > 0, 22)}${p.streak || 0}</b><span>огонёк (рекорд ${p.streak_best || 0})</span></div>
      ${p.status === 'alive' ? `<div style="display:flex;align-items:center;gap:8px"><span style="width:46px;flex:none">${petSVG(p.species, { stage: p.stage, mood: 'happy' })}</span><span><b style="font-size:16px">${esc(p.name || 'Малыш')}</b><span>${esc(p.stage_name)}</span></span></div>
      <div><b>${p.xp}</b><span>опыта у питомца</span></div>` : `<div><b>—</b><span>питомец ещё не выбран</span></div><div><b>${S.events.length}</b><span>важных дат</span></div>`}
    </div></div>
    <div class="card"><h2>${icon('palette')} Тема</h2><div class="themes">
      ${THEMES.map(([k, t, bg, ac]) => `<button class="theme ${S.settings.theme === k ? 'on' : ''}" data-th="${k}"><i style="background:${bg};--tc:${ac}"></i>${t}</button>`).join('')}
    </div></div>
    <div class="card"><h2>${icon('bell')} Уведомления в боте</h2>
      ${NOTIFY.map(([k, t, d, ic, c]) => `<div class="toggle-row"><span class="ic ${c}">${icon(ic)}</span><div class="grow"><b>${t}</b><span>${d}</span></div><button class="sw ${S.settings.notify[k] ? 'on' : ''}" data-n="${k}" aria-label="${t}"></button></div>`).join('')}
    </div>
    ${isAdmin() ? `<div class="card"><h2>${icon('shield')} Возможности админа</h2>
      <p class="muted tiny" style="margin:0 0 6px">Ты можешь: удалять любые даты, сообщения и записи, менять имя питомца без ограничения в 14 дней, начинать выбор питомца заново и дарить ему опыт (в «Истории» питомца).</p></div>` : ''}
    <div class="foot">сделано с любовью · ${fmtDate(new Date())}</div>`;
  $$('[data-th]', root).forEach((b) => { b.onclick = () => setTheme(b.dataset.th); });
  $$('[data-n]', root).forEach((b) => { b.onclick = () => toggleNotify(b.dataset.n, b); });
  const tc = $('#to-chat', root);
  if (tc) tc.onclick = () => emit('go', { tab: 'chat' });
}

async function setTheme(t) {
  haptic.sel();
  S.settings.theme = t;
  emit('theme', t);
  draw();
  try { await api('/settings', { method: 'POST', body: { theme: t } }); } catch (e) { toast(e.message, 'err'); }
}

async function toggleNotify(k, btn) {
  haptic.sel();
  S.settings.notify[k] = !S.settings.notify[k];
  btn.classList.toggle('on', S.settings.notify[k]);
  try { await api('/settings', { method: 'POST', body: { notify: { [k]: S.settings.notify[k] } } }); } catch (e) { toast(e.message, 'err'); }
}
