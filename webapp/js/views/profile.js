import { S, emit, on, isAdmin } from '../state.js';
import { api } from '../api.js';
import { $, $$, esc, toast, avatarHTML, fmtAgo, fmtDate, days } from '../ui.js';
import { icon, flameSVG } from '../art/icons.js';
import { petSVG } from '../art/pets.js';
import { coinSVG } from '../art/play.js';
import { haptic, tg } from '../tg.js';

let root = null, offs = [];

const THEMES = [
  ['graphite', 'Графит', 'linear-gradient(135deg,#111113,#2A2A30)', '#F2A1B5'],
  ['midnight', 'Полночь', 'linear-gradient(135deg,#0D111C,#22224A)', '#8FB6F2'],
  ['oled', 'Чёрная', 'linear-gradient(135deg,#000,#1A1A1A)', '#F2A1B5'],
  ['mocha', 'Мокко', 'linear-gradient(135deg,#15110E,#3A2A20)', '#E7B48E'],
  ['forest', 'Лес', 'linear-gradient(135deg,#0E1411,#1E3A2C)', '#8FD4B0'],
  ['plum', 'Слива', 'linear-gradient(135deg,#120E19,#33224A)', '#CDB4EC'],
  ['dusk', 'Сумерки', 'linear-gradient(135deg,#130F17,#3A2036)', '#F2A1B5'],
  ['auto', 'Как в Telegram', 'linear-gradient(135deg,#F6F2ED 50%,#111113 50%)', '#F2A1B5'],
  ['milk', 'Молочная', 'linear-gradient(135deg,#F6F2ED,#EADBCB)', '#C98B6B'],
  ['light', 'Розовая', 'linear-gradient(135deg,#FFF5F7,#FFE3EB)', '#FF5C8A'],
  ['peach', 'Персик', 'linear-gradient(135deg,#FFF4EC,#FFD9C2)', '#FF7A59'],
  ['lavender', 'Лаванда', 'linear-gradient(135deg,#F7F3FF,#DCCBFF)', '#8C6CF2'],
  ['mint', 'Мята', 'linear-gradient(135deg,#F0FBF6,#BDEFD9)', '#22B39A'],
];
const NOTIFY = [
  ['events', 'Важные даты и дембель', 'Напоминания за неделю, за день и в сам день', 'calendar', 'c1'],
  ['chat', 'Сообщения из чата', 'Если ты не в приложении', 'chat', 'c2'],
  ['pet', 'Питомец', 'Голод, огонёк, рост и выбор', 'paw', 'c6'],
  ['notes', 'Письма и хотелки', 'Когда тебе пишут что-то новое', 'letter', 'c7'],
  ['games', 'Игры и моментики', 'Вызовы, «твой ход», купоны', 'game', 'c4'],
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
    <div class="card" id="home-card"><h2>${icon('sparkle')} На экран «Домой»</h2>
      <p class="muted tiny" style="margin:-4px 0 12px;font-weight:600">Иконка приложения на экране телефона: открывается в одно касание, без поиска бота. Настоящие виджеты с цифрами iPhone разрешает только обычным приложениям из App Store, а это приложение работает внутри Telegram.</p>
      <button class="btn block" id="home-add">${icon('plus')} Добавить на экран</button></div>
    <div class="card"><h2>${icon('palette')} Тема</h2><div class="themes">
      ${THEMES.map(([k, t, bg, ac]) => `<button class="theme ${S.settings.theme === k ? 'on' : ''}" data-th="${k}"><i style="background:${bg};--tc:${ac}"></i>${t}</button>`).join('')}
    </div></div>
    <div class="card"><h2>${icon('bell')} Уведомления в боте</h2>
      ${NOTIFY.map(([k, t, d, ic, c]) => `<div class="toggle-row"><span class="ic ${c}">${icon(ic)}</span><div class="grow"><b>${t}</b><span>${d}</span></div><button class="sw ${S.settings.notify[k] ? 'on' : ''}" data-n="${k}" aria-label="${t}"></button></div>`).join('')}
    </div>
    ${isAdmin() ? `<div class="card"><h2>${icon('shield')} Возможности админа</h2>
      <p class="muted tiny" style="margin:0 0 6px">Ты можешь: удалять любые даты, сообщения и записи, начинать выбор питомца заново и дарить ему опыт (в «Истории» питомца), начислять и списывать моментики.</p></div>
    <div class="card" id="adm-coins"><h2>${coinSVG(22)} Моментики</h2>
      <div class="seg" id="ac-who">${[me, pa].filter(Boolean).map((x, i) => `<button data-u="${x.id}" class="${i === (pa ? 1 : 0) ? 'on' : ''}">${esc(x.id === me.id ? 'Себе' : x.name)}</button>`).join('')}</div>
      <div class="row" style="margin-top:10px"><div class="field grow" style="margin:0"><input id="ac-amount" type="number" inputmode="numeric" min="1" max="100000" placeholder="Сколько"></div></div>
      <div class="chips-quick" id="ac-quick">${[10, 25, 50, 100, 500].map((n) => `<button data-q="${n}">${n}</button>`).join('')}</div>
      <div class="field"><input id="ac-reason" maxlength="80" placeholder="За что (необязательно)"></div>
      <div class="toggle-row" style="padding:2px 0 10px"><div class="grow"><b>Сообщить в боте</b><span>Придёт короткое уведомление</span></div><button class="sw on" id="ac-notify" aria-label="Сообщить"></button></div>
      <div class="row"><button class="btn plain grow" data-sign="-1">${icon('close')} Списать</button><button class="btn grow" data-sign="1">${icon('plus')} Начислить</button></div>
      <p class="muted tiny" id="ac-bal" style="margin:10px 0 0;text-align:center"></p></div>` : ''}
    <div class="foot">сделано с любовью · ${fmtDate(new Date())}</div>`;
  $$('[data-th]', root).forEach((b) => { b.onclick = () => setTheme(b.dataset.th); });
  $$('[data-n]', root).forEach((b) => { b.onclick = () => toggleNotify(b.dataset.n, b); });
  const tc = $('#to-chat', root);
  if (tc) tc.onclick = () => emit('go', { tab: 'chat' });
  setupHome();
  if (isAdmin()) setupCoins();
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

function setupHome() {
  const btn = $('#home-add', root);
  if (!btn) return;
  const can = tg && tg.isVersionAtLeast && tg.isVersionAtLeast('8.0') && tg.addToHomeScreen;
  if (!can) {
    btn.outerHTML = `<p class="muted tiny" style="margin:0">Обнови Telegram до последней версии — тогда здесь появится кнопка. Пока можно открыть меню «⋯» вверху приложения и выбрать «Добавить на экран „Домой“».</p>`;
    return;
  }
  try {
    tg.checkHomeScreenStatus((status) => {
      if (status === 'added') { btn.disabled = true; btn.innerHTML = `${icon('check')} Уже на экране`; }
    });
  } catch (e) { /* */ }
  btn.onclick = () => { haptic.tap(); try { tg.addToHomeScreen(); } catch (e) { toast('Не получилось. Попробуй через меню «⋯»'); } };
  tg.onEvent?.('homeScreenAdded', () => { btn.disabled = true; btn.innerHTML = `${icon('check')} Уже на экране`; toast('Готово! Иконка на экране «Домой»'); });
}

async function setupCoins() {
  const box = $('#adm-coins', root);
  if (!box) return;
  let who = +($('#ac-who .on', box)?.dataset.u || S.me.id);
  const showBal = (b) => {
    if (!b) return;
    $('#ac-bal', box).innerHTML = `Баланс: ${esc(S.me.name)} — <b>${b.me}</b>${S.partner ? `, ${esc(S.partner.name)} — <b>${b.opp}</b>` : ''}`;
  };
  try { showBal((await api('/games/live')).balance); } catch (e) { /* */ }
  $$('#ac-who button', box).forEach((b) => { b.onclick = () => { who = +b.dataset.u; $$('#ac-who button', box).forEach((x) => x.classList.toggle('on', x === b)); haptic.sel(); }; });
  $$('#ac-quick button', box).forEach((b) => { b.onclick = () => { $('#ac-amount', box).value = b.dataset.q; haptic.sel(); }; });
  $('#ac-notify', box).onclick = (e) => e.currentTarget.classList.toggle('on');
  $$('[data-sign]', box).forEach((b) => {
    b.onclick = async () => {
      const n = Math.abs(parseInt($('#ac-amount', box).value, 10) || 0);
      if (!n) { toast('Укажи сколько', 'err'); return; }
      b.disabled = true;
      try {
        const d = await api('/coins/admin', { method: 'POST', body: { uid: who, amount: n * +b.dataset.sign, reason: $('#ac-reason', box).value, notify: $('#ac-notify', box).classList.contains('on') } });
        haptic.ok();
        toast(+b.dataset.sign > 0 ? `Начислено ${n}` : `Списано ${n}`);
        $('#ac-amount', box).value = ''; $('#ac-reason', box).value = '';
        showBal(d.balance);
      } catch (e) { toast(e.message, 'err'); }
      b.disabled = false;
    };
  });
}
