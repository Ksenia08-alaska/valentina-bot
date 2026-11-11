import { api, ApiError } from './api.js';
import { S, emit, on, loadAvatar } from './state.js';
import { setupTelegram, tgColorScheme, onTgThemeChange, setHeaderColor, haptic, tg, devUser, appToken } from './tg.js';
import { $, $$, toast, esc } from './ui.js';
import { icon } from './art/icons.js';
import { coupleHero } from './art/couple.js';

import * as timerView from './views/timer.js';
import * as petView from './views/pet.js';
import * as chatView from './views/chat.js';
import * as gamesView from './views/games.js';
import * as notesView from './views/notes.js';
import * as profileView from './views/profile.js';

const TABS = [
  { id: 'timer', label: 'Таймер', ico: 'timer', view: timerView },
  { id: 'pet', label: 'Питомец', ico: 'paw', view: petView },
  { id: 'games', label: 'Игры', ico: 'game', view: gamesView },
  { id: 'chat', label: 'Чат', ico: 'chat', view: chatView },
  { id: 'notes', label: 'Важное', ico: 'book', view: notesView },
  { id: 'profile', label: 'Профиль', ico: 'user', view: profileView },
];
let current = null;

// ---------- тема ----------
export function applyTheme(theme) {
  const t = !theme ? 'graphite' : theme === 'auto' ? (tgColorScheme() === 'dark' ? 'graphite' : 'milk') : theme;
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('theme', theme || 'graphite'); } catch (e) { /* */ }
  requestAnimationFrame(() => {
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    if (bg) setHeaderColor(bg);
  });
}
on('theme', applyTheme);
onTgThemeChange(() => { if (S.settings.theme === 'auto') applyTheme('auto'); });

// ---------- навигация ----------
function renderNav() {
  $('#nav').innerHTML = TABS.map((t) => `<button class="nav-btn" data-tab="${t.id}" aria-label="${t.label}">${icon(t.ico)}<span>${t.label}</span>${t.id === 'chat' ? '<i class="badge hidden" id="chat-badge"></i>' : ''}</button>`).join('');
  $$('#nav .nav-btn').forEach((b) => { b.onclick = () => { haptic.sel(); go(b.dataset.tab); }; });
}

export function go(tab, opts) {
  const t = TABS.find((x) => x.id === tab) || TABS[0];
  if (current && current.view.destroy) current.view.destroy();
  current = t;
  $$('#nav .nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === t.id));
  const app = $('#app');
  app.innerHTML = '';
  const root = document.createElement('div');
  root.className = 'view view-' + t.id;
  app.append(root);
  window.scrollTo(0, 0);
  try { sessionStorage.setItem('tab', t.id); } catch (e) { /* */ }
  t.view.render(root, opts);
}
on('go', ({ tab, opts }) => go(tab, opts));

function updateBadge() {
  const b = $('#chat-badge');
  if (!b) return;
  b.textContent = S.unread > 9 ? '9+' : S.unread;
  b.classList.toggle('hidden', !S.unread || (current && current.id === 'chat'));
}
on('unread', updateBadge);

// ---------- фоновое обновление ----------
async function ping() {
  try {
    const d = await api('/ping');
    const changed = d.unread !== S.unread || d.partner_online !== S.partnerOnline;
    S.unread = d.unread;
    S.partnerOnline = d.partner_online;
    if (S.partner) S.partner.online = d.partner_online;
    if (changed) { emit('unread'); emit('presence'); }
    emit('ping', d);
  } catch (e) { /* тихо */ }
}

function showFatal(title, text) {
  $('#splash').classList.add('gone');
  $('#nav').innerHTML = '';
  $('#app').innerHTML = `<div class="view" style="text-align:center;padding-top:8vh">
    ${coupleHero()}
    <div class="card" style="margin-top:14px"><h2 style="justify-content:center">${esc(title)}</h2><p class="muted" style="margin:0">${text}</p></div></div>`;
}

async function boot() {
  setupTelegram();
  let saved = 'auto';
  try { saved = localStorage.getItem('theme') || 'graphite'; } catch (e) { /* */ }
  applyTheme(saved);

  if (!tg?.initData && !devUser && !appToken) {
    showFatal('Открой приложение из Telegram', 'Это наше маленькое приложение живёт внутри бота. Открой его по кнопке в чате с ботом.');
    return;
  }
  let d;
  try {
    d = await api('/bootstrap');
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) {
      showFatal('Доступ закрыт', 'Это приложение только для двоих.');
    } else if (e instanceof ApiError && e.status === 401) {
      showFatal('Не получилось войти', 'Закрой приложение и открой его снова по кнопке в боте.');
    } else {
      showFatal('Сервер просыпается…', `${esc(e.message)}<br><br><button class="btn" onclick="location.reload()">Попробовать ещё раз</button>`);
    }
    return;
  }
  Object.assign(S, {
    me: d.me, partner: d.partner, settings: d.settings, dmb: d.dmb, events: d.events, pet: d.pet,
    species: d.species, foods: d.foods, stages: d.stages, stageXp: d.stage_xp, unread: d.unread,
    partnerOnline: !!(d.partner && d.partner.online), serverOffset: d.server_time * 1000 - Date.now(),
    moods: d.moods || {}, emotions: d.emotions || {}, emotionGroups: d.emotion_groups || [],
  });
  applyTheme(S.settings.theme);
  loadAvatar(S.me.id);
  if (S.partner) loadAvatar(S.partner.id);

  renderNav();
  const start = new URLSearchParams(location.search).get('tab') || tg?.initDataUnsafe?.start_param
    || (() => { try { return sessionStorage.getItem('tab'); } catch (e) { return null; } })() || 'timer';
  go(start);
  updateBadge();
  $('#splash').classList.add('gone');

  if (d.visit && d.visit.streak_up && d.pet.streak > 1) {
    setTimeout(() => toast(`Огонёк горит уже ${d.pet.streak} дн. подряд!`), 900);
  }
  if (d.coins && d.coins.login_bonus) {
    setTimeout(() => toast(`+${d.coins.login_bonus} моментиков за то, что заглянул${S.me.role === 'admin' ? 'а' : ''}`), d.visit && d.visit.streak_up ? 3600 : 1200);
  }
  setInterval(ping, 15000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) ping(); });
}

boot();
