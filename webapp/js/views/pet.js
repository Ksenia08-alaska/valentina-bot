import { S, emit, nameOf, isAdmin, loadAvatar } from '../state.js';
import { api } from '../api.js';
import { $, $$, esc, sheet, fullscreen, toast, confetti, fmtDate, fmtCd, days, plural, avatarHTML, confirmSheet } from '../ui.js';
import { icon, foodSVG, flameSVG } from '../art/icons.js';
import { petSVG, SPECIES_ORDER, SPECIES_INFO } from '../art/pets.js';
import { heart } from '../art/couple.js';
import { haptic } from '../tg.js';
import { catchGame, memoryGame } from '../games.js';

let root = null;
let pollT = null, behT = null, cdT = null, bubbleT = null;
let fetchedAt = Date.now();
let tempMood = null, tempMoodT = null;
let askedName = false;
let lastPetTap = 0;

const STAT_META = [
  { k: 'food', t: 'Сытость', ico: 'bowl' },
  { k: 'joy', t: 'Радость', ico: 'heart' },
  { k: 'energy', t: 'Энергия', ico: 'moon' },
  { k: 'clean', t: 'Чистота', ico: 'bubbles' },
];
const MOOD_TEXT = { happy: 'в хорошем настроении', love: 'абсолютно счастлив', sleep: 'сладко спит', hungry: 'проголодался', sad: 'немного грустит', dirty: 'испачкался', tired: 'устал' };

// ---------- общий жизненный цикл ----------
export function render(r) {
  root = r;
  draw();
  pollT = setInterval(refresh, 20000);
}

export function destroy() {
  [pollT, behT, cdT, bubbleT, tempMoodT].forEach((t) => { clearInterval(t); clearTimeout(t); });
  root = null;
}

async function refresh() {
  try {
    const d = await api('/pet');
    const wasAlive = S.pet.status === 'alive';
    const prevPicks = JSON.stringify(S.pet.picks);
    const prevStage = S.pet.stage;
    setPet(d.pet);
    if (!root) return;
    if (!wasAlive && S.pet.status === 'alive') { confetti(90); draw(); return; }
    if (wasAlive && S.pet.status !== 'alive') { draw(); return; }
    if (S.pet.status !== 'alive') { if (JSON.stringify(S.pet.picks) !== prevPicks) draw(); return; }
    if (S.pet.stage !== prevStage) { drawPetOnly(true); }
    updatePanels();
  } catch (e) { /* тихо */ }
}

function setPet(p) {
  S.pet = p;
  fetchedAt = Date.now();
}

function draw() {
  [behT, cdT].forEach((t) => clearInterval(t));
  if (!root) return;
  if (S.pet.status === 'alive') drawAlive(); else drawChoose();
}

// =============== ВЫБОР ПИТОМЦА ===============
function drawChoose() {
  const me = S.me, pa = S.partner;
  const myPick = S.pet.picks[me.id];
  const paPick = pa ? S.pet.picks[pa.id] : null;
  const who = (p, pick, person) => `<div class="pick-who ${pick ? 'has' : ''}">
      ${pick ? petSVG(pick, { stage: 2, mood: 'happy' }) : `<svg viewBox="0 0 74 74" width="74" height="74"><circle cx="37" cy="37" r="30" fill="none" stroke="currentColor" stroke-opacity=".2" stroke-width="3" stroke-dasharray="6 7"/><text x="37" y="47" text-anchor="middle" font-size="30" font-weight="900" fill="currentColor" opacity=".25">?</text></svg>`}
      <b>${esc(person ? person.name : '—')}</b><span>${pick ? esc(S.species[pick].name) : 'ещё думает…'}</span></div>`;
  const match = myPick && paPick && myPick === paPick;
  root.innerHTML = `
    <div class="head"><div><h1>Выбираем малыша</h1><p>Питомец появится, когда ваши выборы совпадут</p></div></div>
    <div class="card">
      <div class="pick-status">${who('me', myPick, me)}${who('pa', paPick, pa)}</div>
      <button class="btn ghost block" style="margin-top:12px" id="to-chat">${icon('chat')} Обсудить в чате</button>
    </div>
    <div class="species-grid">${SPECIES_ORDER.map((sp) => {
      const mine = myPick === sp, his = paPick === sp;
      return `<button class="sp-card ${mine ? 'mine' : ''} ${mine && his ? 'match' : ''}" data-sp="${sp}">
        <div class="who">${mine ? `<i>${esc(me.name)}</i>` : ''}${his ? `<i class="p">${esc(pa.name)}</i>` : ''}</div>
        ${petSVG(sp, { stage: 3, mood: mine || his ? 'love' : 'happy' })}<b>${esc(S.species[sp].name)}</b></button>`;
    }).join('')}</div>
    ${!pa ? '<p class="muted tiny" style="text-align:center;margin-top:14px">Второй человек ещё не подключён (PARTNER_ID в настройках бота)</p>' : ''}
    ${match ? '' : ''}`;
  $('#to-chat', root).onclick = () => emit('go', { tab: 'chat' });
  $$('[data-sp]', root).forEach((b) => { b.onclick = () => speciesSheet(b.dataset.sp); });
}

function speciesSheet(sp) {
  haptic.tap();
  const mine = S.pet.picks[S.me.id] === sp;
  const his = S.partner && S.pet.picks[S.partner.id] === sp;
  sheet({
    title: esc(S.species[sp].name),
    html: `<div style="width:220px;margin:-40px auto -6px">${petSVG(sp, { stage: 0, mood: 'love' })}</div>
      <p style="text-align:center;font-weight:700;margin:4px 0 6px">${SPECIES_INFO[sp]}</p>
      <p class="muted tiny" style="text-align:center;margin:0 0 16px">Начнёт с малыша и вырастет, если вы оба будете заботиться о нём каждый день. Любимую еду придётся угадать!</p>
      ${his ? `<div style="text-align:center;margin-bottom:12px"><span class="chip">${esc(S.partner.name)} тоже хочет его!</span></div>` : ''}
      ${mine ? `<button class="btn ghost block" disabled>${icon('check')} Это твой выбор</button>`
        : `<button class="btn block" id="pick">${icon('heart')} Выбираю ${his ? 'его — совпадём!' : 'его'}</button>`}`,
    onMount(sh, close) {
      const b = $('#pick', sh);
      if (b) b.onclick = async () => {
        b.disabled = true;
        try {
          const d = await api('/pet/pick', { method: 'POST', body: { species: sp } });
          setPet(d.pet);
          close();
          if (d.adopted) {
            confetti(110);
            haptic.ok();
            draw();
          } else {
            haptic.ok();
            toast('Выбор отправлен в чат');
            draw();
          }
        } catch (e) { toast(e.message, 'err'); b.disabled = false; }
      };
    },
  });
}

// =============== ЖИВОЙ ПИТОМЕЦ ===============
function mood() {
  if (tempMood) return tempMood;
  if (S.pet.sleep_until * 1000 > Date.now() + (S.serverOffset || 0)) return 'sleep';
  return S.pet.mood;
}
function isNight() {
  const h = new Date(Date.now() + (S.serverOffset || 0) + 3 * 3600e3).getUTCHours();
  return h >= 23 || h < 8;
}
function petName() { return S.pet.name || 'Малыш'; }

function skyHTML() {
  const h = new Date(Date.now() + 3 * 3600e3).getUTCHours();
  let bg, deco;
  if (h >= 22 || h < 6) {
    bg = 'linear-gradient(180deg,#1B2350,#3B3B7A)';
    deco = `<svg viewBox="0 0 92 92" style="position:absolute;inset:0"><circle cx="62" cy="28" r="12" fill="#FFF3C4"/><circle cx="68" cy="24" r="10" fill="#2A2F63"/>${[[18, 20], [30, 50], [14, 64], [44, 18], [72, 60], [50, 70]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="#fff"/>`).join('')}</svg>`;
  } else if (h < 9 || h >= 18) {
    bg = 'linear-gradient(180deg,#FFB38A,#FF8FB1 60%,#B79CFF)';
    deco = `<svg viewBox="0 0 92 92" style="position:absolute;inset:0"><circle cx="46" cy="70" r="16" fill="#FFE27A"/><ellipse cx="22" cy="30" rx="14" ry="6" fill="#fff" opacity=".6"/></svg>`;
  } else {
    bg = 'linear-gradient(180deg,#7EC8F2,#BFE6FF)';
    deco = `<svg viewBox="0 0 92 92" style="position:absolute;inset:0"><circle cx="66" cy="26" r="11" fill="#FFE27A"/><ellipse cx="28" cy="46" rx="16" ry="7" fill="#fff"/><ellipse cx="38" cy="42" rx="10" ry="7" fill="#fff"/></svg>`;
  }
  return `<div class="sky" style="background:${bg}">${deco}</div>`;
}

function drawAlive() {
  const p = S.pet;
  root.innerHTML = `
    <div class="pet-top">
      <div class="grow"><button class="pet-name" id="name-btn">${esc(petName())}${icon('edit')}</button>
        <div class="pet-sub" id="pet-sub"></div></div>
      <div class="streak" id="streak"></div>
    </div>
    <div class="room ${isNight() ? 'night' : ''}" id="room">
      <div class="window">${skyHTML()}</div>
      <div class="frame"><div><svg viewBox="-17 -17 34 30" width="26" height="24">${heart(0, 0, 1)}</svg></div></div>
      <div class="rug"></div>
      <div class="pet-stage" id="pet-stage"><div class="pet-flip" id="pet-flip"><div id="pet-act"></div></div></div>
      <div class="bubble" id="bubble"></div>
    </div>
    <div class="card"><div class="xp-row"><span id="xp-l"></span><span id="xp-r"></span></div><div class="bar"><i id="xp-bar"></i></div></div>
    <div class="card"><div class="stat-bars" id="stat-bars"></div></div>
    <div class="actions" id="actions"></div>
    <div class="card" style="margin-top:14px" id="today"></div>`;
  drawPetOnly();
  updatePanels();
  bindAlive();
  behT = setInterval(behave, 5200);
  cdT = setInterval(updateCooldowns, 1000);
  setTimeout(() => say(greeting()), 700);
  if (!p.name && !askedName) { askedName = true; setTimeout(nameSheet, 1200); }
}

function drawPetOnly(grow = false) {
  const el = $('#pet-act', root);
  if (!el) return;
  const m = mood();
  el.innerHTML = petSVG(S.pet.species, { stage: S.pet.stage, mood: m });
  const room = $('#room', root);
  $('.zzz', room)?.remove();
  if (m === 'sleep') room.insertAdjacentHTML('beforeend', '<div class="zzz"><span>z</span><span>z</span><span>Z</span></div>');
  room.classList.toggle('night', isNight() || m === 'sleep');
  if (grow) { el.classList.remove('act-spin'); void el.offsetWidth; el.classList.add('act-spin'); }
}

function updatePanels() {
  if (!root || S.pet.status !== 'alive') return;
  const p = S.pet;
  const age = Math.max(1, Math.ceil((Date.now() / 1000 - p.born_at) / 86400));
  $('#name-btn', root).innerHTML = `${esc(petName())}${icon('edit')}`;
  $('#pet-sub', root).textContent = `${p.stage_name} · ${age}-й день с нами · ${MOOD_TEXT[mood()] || ''}`;
  const st = $('#streak', root);
  st.className = 'streak' + (p.streak_at_risk ? ' risk' : '');
  st.innerHTML = `${flameSVG(p.streak > 0)}${p.streak}`;
  const to = p.stage_to;
  $('#xp-l', root).textContent = `Стадия ${p.stage + 1}: ${p.stage_name}`;
  $('#xp-r', root).textContent = to ? `${p.xp} / ${to} опыта` : `${p.xp} опыта · максимум!`;
  $('#xp-bar', root).style.width = (to ? ((p.xp - p.stage_from) / (to - p.stage_from)) * 100 : 100) + '%';
  $('#stat-bars', root).innerHTML = STAT_META.map((s) => {
    const v = Math.round(p.stats[s.k]);
    return `<div class="sbar ${v < 30 ? 'low' : ''}"><div class="lbl">${icon(s.ico)}${s.t}<b>${v}%</b></div><div class="bar"><i style="width:${v}%"></i></div></div>`;
  }).join('');
  const A = [
    ['feed', 'Покормить', 'bowl', 'c1'], ['play', 'Играть', 'ball', 'c2'], ['wash', 'Помыть', 'bubbles', 'c3'], ['sleep', 'Уложить', 'moon', 'c4'],
    ['pet', 'Обнять', 'hand', 'c8'], ['gift', 'Подарок', 'gift', 'c5'], ['games', 'Игры', 'game', 'c6'], ['history', 'История', 'history', 'c7'],
  ];
  $('#actions', root).innerHTML = A.map(([k, t, ic, c]) => `<button class="act" data-act="${k}"><span class="ic ${c}">${icon(ic)}</span>${t}<i class="cd hidden"></i>${k === 'gift' && p.gift_ready ? '<i class="dot"></i>' : ''}</button>`).join('');
  $$('[data-act]', root).forEach((b) => { b.onclick = () => onAction(b.dataset.act); });
  const visited = p.today_visits || [];
  const person = (u) => u ? `<div class="row" style="gap:8px">${avatarHTML(u, S.avatars[u.id], 'sm')}<div><b style="font-size:13.5px">${esc(u.name)}</b><div class="tiny ${visited.includes(u.id) ? '' : 'muted'}" style="font-weight:800;color:${visited.includes(u.id) ? 'var(--good)' : ''}">${visited.includes(u.id) ? 'заходил(а) сегодня' : 'ещё не заходил(а)'}</div></div></div>` : '';
  $('#today', root).innerHTML = `<h2>${flameSVG(p.streak > 0, 22)} Огонёк дружбы<span class="spacer"></span><span class="chip gray">рекорд ${p.streak_best}</span></h2>
    <div class="row" style="justify-content:space-between">${person(S.me)}${person(S.partner)}</div>
    <p class="muted tiny" style="margin:12px 0 0">Огонёк растёт, когда вы <b>оба</b> заходите хотя бы раз в день. Пропустите день — погаснет.
    Сегодня ещё можно получить: уход <b>${p.care_left}</b>, игры <b>${p.game_left}</b> опыта.</p>`;
  updateCooldowns();
}

function updateCooldowns() {
  if (!root || !S.pet.cooldowns) return;
  const el = (Date.now() - fetchedAt) / 1000;
  $$('[data-act]', root).forEach((b) => {
    const cd = S.pet.cooldowns[b.dataset.act];
    if (cd === undefined || b.dataset.act === 'pet') return;
    const left = Math.max(0, Math.round(cd - el));
    const tag = $('.cd', b);
    tag.classList.toggle('hidden', !left);
    tag.textContent = fmtCd(left);
    b.classList.toggle('cool', !!left);
  });
}

function bindAlive() {
  $('#name-btn', root).onclick = nameSheet;
  $('#streak', root).onclick = () => toast(S.pet.streak_at_risk ? 'Загляните сегодня оба, иначе огонёк погаснет!' : `Огонёк: ${S.pet.streak} ${days(S.pet.streak)} подряд`);
  $('#pet-stage', root).onclick = (e) => petTap(e);
}

// ---------- поведение ----------
function phrases() {
  const p = S.pet, sp = S.species[p.species], me = S.me.name, pa = S.partner?.name || '';
  const end = new Date(`${S.dmb.end}T00:00:00+03:00`);
  const left = Math.max(0, Math.ceil((end - Date.now()) / 864e5));
  const m = mood();
  const list = [`${sp.sound}!`, `Привет, ${me}!`, `Я люблю вас обоих`, `До дембеля ${left} ${days(left)}. Я считаю!`, `${pa} тоже обо мне заботится`, `Поиграем?`, `Вы самая красивая пара`];
  if (m === 'hungry') list.push('Я бы что-нибудь съел…', 'Животик урчит', 'Покормишь?');
  if (m === 'dirty') list.push('Кажется, мне нужно в ванну', 'Я немножко чумазый');
  if (m === 'tired') list.push('Глазки слипаются…', 'Хочу баиньки');
  if (m === 'sad') list.push('Мне скучно…', 'Обними меня', `Скучаю по ${pa || 'вам'}`);
  if (m === 'love') list.push('Я самый счастливый!', 'Мур-мур-мур', 'Обожаю вас!');
  if (p.species === 'parrot' && S.lastChatText) list.push(`${sp.sound}! «${S.lastChatText.slice(0, 40)}»`);
  if (p.species === 'hamster') list.push('Набил щёчки!', 'Где моё колесо?');
  if (p.species === 'raccoon') list.push('Что бы такое помыть…', 'Я не воровал печеньку. Почти.');
  if (p.species === 'turtle') list.push('Не спешим…', 'Медленно, но вместе');
  if (p.species.startsWith('dog')) list.push('Гулять?!', 'Где мячик?');
  if (p.species.startsWith('cat')) list.push('Мне нужна коробка', 'Почеши за ушком');
  if (p.gift_ready) list.push('У меня для тебя подарок!');
  if (p.streak_at_risk) list.push(`${pa} сегодня ещё не заходил(а). Огонёк ждёт!`);
  return list;
}
function greeting() {
  const h = new Date(Date.now() + 3 * 3600e3).getUTCHours();
  if (mood() === 'sleep') return 'Zzz… ';
  const g = h < 5 ? 'Почему не спишь' : h < 12 ? 'Доброе утро' : h < 18 ? 'Привет' : 'Добрый вечер';
  return `${g}, ${S.me.name}!`;
}

function say(text, ms = 3200) {
  const b = $('#bubble', root);
  if (!b || !text) return;
  b.textContent = text;
  b.classList.add('show');
  clearTimeout(bubbleT);
  bubbleT = setTimeout(() => b.classList.remove('show'), ms);
}

function act(cls) {
  const el = $('#pet-act', root);
  if (!el) return;
  el.classList.remove('act-hop', 'act-wiggle', 'act-spin', 'act-squish', 'act-wash');
  void el.offsetWidth;
  el.classList.add(cls);
}

let posX = 0;
function walkTo(x) {
  const stage = $('#pet-stage', root), flip = $('#pet-flip', root);
  if (!stage) return;
  flip.classList.toggle('left', x < posX);
  posX = x;
  stage.style.transform = `translateX(${x}px)`;
}

function behave() {
  if (!root || document.hidden) return;
  if (mood() === 'sleep') { if (Math.random() < 0.25) say('Zzz…', 1800); return; }
  const r = Math.random();
  const room = $('#room', root);
  const maxX = Math.max(40, room.clientWidth / 2 - 110);
  if (r < 0.22) walkTo(Math.round((Math.random() * 2 - 1) * maxX));
  else if (r < 0.38) act('act-hop');
  else if (r < 0.5) act('act-wiggle');
  else if (r < 0.74) say(phrases()[Math.floor(Math.random() * phrases().length)]);
  else if (r < 0.86) butterfly();
  else if (r < 0.93) holdSign();
  else walkTo(0);
}

function butterfly() {
  const room = $('#room', root);
  const b = document.createElement('div');
  b.className = 'butterfly';
  const col = ['#FF8FB1', '#B79CFF', '#6FC9F0', '#FFD25E'][Math.floor(Math.random() * 4)];
  b.innerHTML = `<svg viewBox="0 0 40 40" width="34" height="34"><g class="w"><path d="M20 20 C10 4 0 10 6 20 C0 30 12 34 20 22Z" fill="${col}" stroke="#3B2B33" stroke-width="1.8"/><path d="M20 20 C30 4 40 10 34 20 C40 30 28 34 20 22Z" fill="${col}" stroke="#3B2B33" stroke-width="1.8"/></g><path d="M20 14 V28" stroke="#3B2B33" stroke-width="2.4" stroke-linecap="round"/></svg>`;
  const W = room.clientWidth;
  b.style.left = '-40px'; b.style.top = '60px';
  room.append(b);
  const pts = [[W * 0.3, 120], [W * 0.55, 70], [W * 0.45, 150], [W + 40, 40]];
  let i = 0;
  const step = () => {
    if (i >= pts.length || !b.isConnected) { b.remove(); return; }
    const [x, y] = pts[i++];
    b.style.left = x + 'px'; b.style.top = y + 'px';
    if (i === 2) { act('act-hop'); say('Бабочка!', 1500); }
    setTimeout(step, 2600);
  };
  requestAnimationFrame(() => requestAnimationFrame(step));
}

function holdSign() {
  const end = new Date(`${S.dmb.end}T00:00:00+03:00`);
  const left = Math.max(0, Math.ceil((end - Date.now()) / 864e5));
  const room = $('#room', root);
  $('.room-sign', room)?.remove();
  const s = document.createElement('div');
  s.className = 'room-sign';
  s.textContent = left ? `ещё ${left} ${days(left)}!` : 'ДЕМБЕЛЬ!';
  room.append(s);
  act('act-hop');
  setTimeout(() => s.remove(), 3500);
}

function hearts(n = 5, x, y) {
  const room = $('#room', root);
  if (!room) return;
  const r = room.getBoundingClientRect();
  for (let i = 0; i < n; i++) {
    const h = document.createElement('div');
    h.className = 'fx fx-heart';
    const cx = (x ?? r.width / 2) + (Math.random() * 80 - 40), cy = (y ?? r.height * 0.55) + (Math.random() * 30 - 15);
    h.style.left = cx + 'px'; h.style.top = cy + 'px';
    h.style.setProperty('--r', (Math.random() * 40 - 20) + 'deg');
    h.style.animationDelay = (i * 0.08) + 's';
    const c = ['#FF5C8A', '#FF8FB1', '#FFB3C7', '#FF6F9A'][i % 4];
    h.innerHTML = `<svg viewBox="-17 -17 34 30" width="${18 + Math.random() * 14}" height="${16 + Math.random() * 12}">${heart(0, 0, 1, c)}</svg>`;
    room.append(h);
    setTimeout(() => h.remove(), 1700);
  }
}

function bubblesFx() {
  const room = $('#room', root);
  for (let i = 0; i < 12; i++) {
    const b = document.createElement('div');
    b.className = 'bubble-fx';
    const s = 10 + Math.random() * 22;
    b.style.width = b.style.height = s + 'px';
    b.style.left = (room.clientWidth / 2 + posX - 60 + Math.random() * 120) + 'px';
    b.style.top = (170 + Math.random() * 80) + 'px';
    b.style.animationDelay = (Math.random() * 0.8) + 's';
    room.append(b);
    setTimeout(() => b.remove(), 2600);
  }
}

function setTempMood(m, ms) {
  tempMood = m;
  drawPetOnly();
  clearTimeout(tempMoodT);
  tempMoodT = setTimeout(() => { tempMood = null; drawPetOnly(); }, ms);
}

async function petTap(e) {
  haptic.soft();
  const room = $('#room', root).getBoundingClientRect();
  hearts(3, e.clientX - room.left, e.clientY - room.top);
  act('act-squish');
  if (mood() !== 'sleep') say(`${S.species[S.pet.species].sound}!`, 1400);
  if (Date.now() - lastPetTap > 4000) {
    lastPetTap = Date.now();
    doAction('pet', null, true);
  }
}

// ---------- действия ----------
async function doAction(action, food, silent = false) {
  try {
    const d = await api('/pet/action', { method: 'POST', body: { action, food } });
    const prevStage = S.pet.stage;
    setPet(d.pet);
    const r = d.result;
    if (!r.ok) { if (!silent) { toast(r.msg); say(r.msg.split('—')[0], 2600); } return r; }
    if (!silent || r.xp) {
      if (r.xp && !silent) toast(`${r.msg} +${r.xp} опыта`);
    }
    if (S.pet.stage !== prevStage) grown();
    updatePanels();
    return r;
  } catch (e) { toast(e.message, 'err'); return { ok: false }; }
}

function grown() {
  confetti(100);
  drawPetOnly(true);
  setTimeout(() => say(`Я подрос! Теперь я «${S.pet.stage_name}»`, 4200), 600);
}

async function onAction(a) {
  haptic.tap();
  if (a === 'feed') return feedSheet();
  if (a === 'games') return gamesSheet();
  if (a === 'history') return historyScreen();
  if (a === 'gift') return openGift();
  if (a === 'pet') {
    hearts(8); act('act-squish');
    const r = await doAction('pet', null, true);
    say(r && r.xp ? `Обнимашки! +${r.xp}` : 'Обнимашки!', 1800);
    return;
  }
  const r = await doAction(a);
  if (!r || !r.ok) return;
  if (a === 'play') { setTempMood('play', 3000); act('act-hop'); setTimeout(() => act('act-hop'), 700); setTimeout(() => act('act-spin'), 1400); hearts(4); }
  if (a === 'wash') { bubblesFx(); act('act-wash'); setTimeout(() => say('Я чистенький!'), 1300); }
  if (a === 'sleep') { drawPetOnly(); say('Спокойной ночи…', 2000); }
}

function feedSheet() {
  const p = S.pet;
  sheet({
    title: `Чем угостим ${esc(petName())}?`,
    html: `<div class="foods">${p.foods.map((f) => `<button class="food ${p.fav === f ? 'fav' : ''}" data-f="${f}">${foodSVG(f, 52)}${esc(S.foods[f])}${p.fav === f ? '<span class="tiny" style="color:var(--accent)">любимое</span>' : ''}</button>`).join('')}</div>
      <p class="muted tiny" style="text-align:center;margin:14px 0 0">${p.fav ? 'Любимую еду вы уже знаете' : 'Одна из этих вкусняшек — самая любимая. Угадаете?'}</p>`,
    onMount(sh, close) {
      $$('[data-f]', sh).forEach((b) => {
        b.onclick = async () => {
          close();
          const f = b.dataset.f;
          const r = await doAction('feed', f);
          if (!r || !r.ok) return;
          const room = $('#room', root);
          const bowl = document.createElement('div');
          bowl.className = 'room-bowl';
          bowl.style.transform = `translateX(${posX}px)`;
          bowl.innerHTML = foodSVG(f, 54);
          room.append(bowl);
          setTempMood('eat', 2600);
          setTimeout(() => act('act-hop'), 300);
          if (r.fav) { hearts(10); setTimeout(() => say('Это моё самое любимое!', 3000), 500); confetti(40); }
          else setTimeout(() => say('Ням-ням!'), 500);
          setTimeout(() => bowl.remove(), 2700);
        };
      });
    },
  });
}

async function openGift() {
  if (!S.pet.gift_ready) { toast('Сегодня подарок уже был. Завтра будет новый!'); return; }
  try {
    const d = await api('/pet/gift', { method: 'POST' });
    setPet(d.pet);
    updatePanels();
    const g = d.gift;
    act('act-hop');
    sheet({
      title: g.kind === 'reason' ? 'Питомец принёс записку!' : 'Питомец шепчет тебе…',
      html: `<div class="gift-card"><div class="gift-box">${petSVG(S.pet.species, { stage: S.pet.stage, mood: 'love', size: 120 })}</div>
        ${g.kind === 'reason' ? `<div class="num">Причина №${g.num} из 101</div>` : ''}
        <p>${esc(g.text)}</p><button class="btn block" data-ok>${icon('heart')} Сохраню в сердце</button></div>`,
      onMount(sh, close) { $('[data-ok]', sh).onclick = close; confetti(30); },
    });
  } catch (e) { toast(e.message, 'err'); }
}

function nameSheet() {
  const p = S.pet;
  const next = p.name_next_change * 1000;
  const locked = p.name && next > Date.now() && !isAdmin();
  sheet({
    title: p.name ? 'Имя питомца' : 'Как назовём малыша?',
    html: `<div style="width:170px;margin:-34px auto 0">${petSVG(p.species, { stage: p.stage, mood: 'love' })}</div>
      ${locked
        ? `<p style="text-align:center;font-weight:800">Сейчас его зовут «${esc(p.name)}»</p><p class="muted" style="text-align:center">Имя можно менять раз в 14 дней. Следующая смена — ${fmtDate(new Date(next))}.</p>`
        : `<div class="field"><input id="pet-name" maxlength="20" placeholder="Например: Персик" value="${esc(p.name || '')}"></div>
           <p class="muted tiny" style="text-align:center;margin:-4px 0 14px">Имя увидите вы оба, а в чат придёт сообщение. Менять можно раз в 14 дней${isAdmin() ? ' (админу — когда угодно)' : ''}.</p>
           <button class="btn block" id="save-name">${icon('check')} Готово</button>`}`,
    onMount(sh, close) {
      const b = $('#save-name', sh);
      if (!b) return;
      setTimeout(() => $('#pet-name', sh).focus(), 350);
      b.onclick = async () => {
        const name = $('#pet-name', sh).value.trim();
        if (name.length < 2) { toast('Имя слишком короткое', 'err'); return; }
        try {
          const d = await api('/pet/name', { method: 'POST', body: { name } });
          setPet(d.pet);
          close();
          haptic.ok();
          updatePanels();
          hearts(10);
          setTimeout(() => say(`Теперь я — ${name}!`, 3500), 300);
        } catch (e) { toast(e.message, 'err'); }
      };
    },
  });
}

function gamesSheet() {
  const p = S.pet;
  sheet({
    title: 'Мини-игры',
    html: `<p class="muted tiny" style="text-align:center;margin:-6px 0 14px">Игры дают опыт питомцу. Сегодня ещё можно заработать: <b>${p.game_left}</b></p>
      <div class="games-list">
        <button class="game-item" data-g="catch"><span class="ic" style="background:var(--soft)">${foodSVG('cookie', 40)}</span><div><b>Вкусняшки</b><span>Лови еду, уворачивайся от тучек · рекорд ${p.records.catch || 0}</span></div></button>
        <button class="game-item" data-g="memory"><span class="ic" style="background:var(--soft)">${foodSVG('strawberry', 40)}</span><div><b>Пары</b><span>Найди одинаковые карточки — чем меньше ходов, тем больше опыта</span></div></button>
      </div>`,
    onMount(sh, close) {
      $$('[data-g]', sh).forEach((b) => { b.onclick = () => { close(); setTimeout(() => playGame(b.dataset.g), 250); }; });
    },
  });
}

function playGame(game) {
  let stop = () => {};
  const title = game === 'catch' ? 'Вкусняшки' : 'Пары';
  fullscreen({
    html: `<div class="game-head"><button class="icon-btn" data-x>${icon('close')}</button><h2>${title}</h2></div><div id="game-root"></div>`,
    onMount(el, close) {
      $('[data-x]', el).onclick = close;
      const g = $('#game-root', el);
      const finish = async (score, moves = 0) => {
        let res = null;
        try {
          const d = await api('/pet/game', { method: 'POST', body: { game, score, moves } });
          setPet(d.pet); res = d.result;
        } catch (e) { toast(e.message, 'err'); }
        if (res && res.grown && res.grown.length) confetti(100); else haptic.ok();
        g.innerHTML = `<div class="game-over">${petSVG(S.pet.species, { stage: S.pet.stage, mood: 'love', size: 170 })}
          <div class="muted" style="font-weight:800">${game === 'catch' ? 'Поймано очков' : 'Ходов понадобилось'}</div>
          <div class="big">${game === 'catch' ? score : moves}</div>
          <p style="font-weight:800">${res ? (res.xp ? `+${res.xp} опыта для ${esc(petName())}` : 'Сегодня лимит опыта за игры уже набран — но играть всё равно можно!') : ''}</p>
          <div class="row"><button class="btn plain grow" data-x2>Выйти</button><button class="btn grow" data-again>Ещё раз</button></div></div>`;
        $('[data-x2]', g).onclick = close;
        $('[data-again]', g).onclick = start;
        updatePanels();
      };
      const start = () => {
        stop();
        if (game === 'catch') catchGame(g, { species: S.pet.species, stage: S.pet.stage, foods: S.pet.foods, fav: S.pet.fav, onEnd: (s) => finish(s) }).then((s) => { stop = s; });
        else stop = memoryGame(g, { onEnd: (m) => finish(0, m) });
      };
      start();
    },
    onClose() { stop(); },
  });
}

function historyScreen() {
  const p = S.pet;
  const ico = { adopted: 'heart', stage: 'star', name: 'edit', streak: 'fire', fav: 'bowl' };
  const c = p.counters || {};
  fullscreen({
    html: `<div class="game-head"><button class="icon-btn" data-x>${icon('back')}</button><h2>История ${esc(petName())}</h2></div>
      <div class="card"><h2>${icon('sparkle')} Как мы растём</h2>
        <div class="stages">${S.stages.map((n, i) => `<div class="stg ${i > p.stage ? 'locked' : ''} ${i === p.stage ? 'cur' : ''}">${petSVG(p.species, { stage: i, mood: i > p.stage ? 'sleep' : 'happy' })}<div>${i > p.stage ? `${S.stageXp[i]} оп.` : esc(n)}</div></div>`).join('')}</div></div>
      <div class="card"><h2>${icon('list')} Вместе мы уже</h2><div class="mini-stats">
        <div><b>${c.feed || 0}</b><span>раз покормили</span></div><div><b>${c.play || 0}</b><span>раз поиграли</span></div>
        <div><b>${c.pet || 0}</b><span>обнимашек</span></div><div><b>${c.games || 0}</b><span>мини-игр</span></div>
        <div><b>${c.wash || 0}</b><span>купаний</span></div><div><b>${p.streak_best}</b><span>рекорд огонька</span></div></div></div>
      <div class="card"><h2>${icon('history')} Летопись</h2><div class="tl">${[...p.history].reverse().map((h) => `<div class="tl-item"><b>${esc(h.text)}</b><span>${fmtDate(new Date(h.ts * 1000))}</span></div>`).join('') || '<div class="muted">Пока пусто</div>'}</div></div>
      ${isAdmin() ? `<div class="card"><h2>${icon('crown')} Админ</h2><div class="row"><button class="btn plain grow sm" data-xp>+100 опыта</button><button class="btn danger grow sm" data-reset>Выбрать заново</button></div></div>` : ''}`,
    onMount(el, close) {
      $('[data-x]', el).onclick = close;
      const xp = $('[data-xp]', el);
      if (xp) xp.onclick = async () => {
        try { const d = await api('/pet/xp', { method: 'POST', body: { xp: 100 } }); const s0 = S.pet.stage; setPet(d.pet); toast('+100 опыта'); if (S.pet.stage !== s0) { close(); grown(); } updatePanels(); } catch (e) { toast(e.message, 'err'); }
      };
      const rs = $('[data-reset]', el);
      if (rs) rs.onclick = async () => {
        if (!(await confirmSheet('Начать выбор питомца заново? Текущий питомец уйдёт в архив.', { ok: 'Да, заново', danger: true }))) return;
        try { const d = await api('/pet/reset', { method: 'POST' }); setPet(d.pet); close(); draw(); } catch (e) { toast(e.message, 'err'); }
      };
    },
  });
}
