import { S, emit, isAdmin } from '../state.js';
import { api } from '../api.js';
import { $, $$, esc, sheet, fullscreen, toast, confetti, fmtDate, fmtCd, days, avatarHTML, confirmSheet } from '../ui.js';
import { icon, foodSVG, flameSVG } from '../art/icons.js';
import { petSVG, SPECIES_ORDER, SPECIES_INFO } from '../art/pets.js';
import { gingerSVG } from '../art/ginger.js';
import { bowlSVG, ballSVG, tubSVG, bedSVG, postSVG, giftSVG, petIconsBar } from '../art/room.js';
import { heart } from '../art/couple.js';
import { haptic } from '../tg.js';
import { catchGame, memoryGame } from '../games.js';

let root = null;
let pollT = null, brainT = null, cdT = null, bubbleT = null;
let fetchedAt = Date.now();
let askedName = false;
let lastPetTap = 0;

// состояние котика в комнате
const pet = { x: 0, facing: 1, pose: 'sit', mood: 'happy', busy: false, walkT: null, until: 0 };
// положение предметов (доля ширины комнаты)
const SPOT = { post: 0.1, bowl: 0.3, tub: 0.5, ball: 0.7, bed: 0.86 };
const MOOD_TEXT = { happy: 'в хорошем настроении', love: 'абсолютно счастлив', sleep: 'сладко спит', hungry: 'проголодался', sad: 'немного грустит', dirty: 'испачкался', tired: 'устал', sick: 'ему плохо без вас' };

export function render(r) {
  root = r;
  draw();
  pollT = setInterval(refresh, 20000);
}

export function destroy() {
  [pollT, brainT, cdT, bubbleT, pet.walkT].forEach((t) => { clearInterval(t); clearTimeout(t); });
  root = null;
}

function setPet(p) { S.pet = p; fetchedAt = Date.now(); }

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
    if (S.pet.stage !== prevStage) grown();
    updatePanels();
  } catch (e) { /* */ }
}

function draw() {
  [brainT, cdT].forEach((t) => clearInterval(t));
  if (!root) return;
  if (S.pet.status === 'alive') drawAlive(); else drawChoose();
}

// =============== ВЫБОР ПИТОМЦА ===============
function drawChoose() {
  const me = S.me, pa = S.partner;
  const myPick = S.pet.picks[me.id];
  const paPick = pa ? S.pet.picks[pa.id] : null;
  const who = (pick, person) => `<div class="pick-who ${pick ? 'has' : ''}">
      ${pick ? petSVG(pick, { stage: 2, mood: 'happy' }) : `<svg viewBox="0 0 74 74" width="74" height="74"><circle cx="37" cy="37" r="30" fill="none" stroke="currentColor" stroke-opacity=".2" stroke-width="3" stroke-dasharray="6 7"/><text x="37" y="47" text-anchor="middle" font-size="30" font-weight="900" fill="currentColor" opacity=".25">?</text></svg>`}
      <b>${esc(person ? person.name : '—')}</b><span>${pick ? esc(S.species[pick].name) : 'ещё думает…'}</span></div>`;
  root.innerHTML = `
    <div class="head"><div><h1>Выбираем малыша</h1><p>Питомец появится, когда ваши выборы совпадут</p></div></div>
    <div class="card"><div class="pick-status">${who(myPick, me)}${who(paPick, pa)}</div>
      <button class="btn ghost block" style="margin-top:12px" id="to-chat">${icon('chat')} Обсудить в чате</button></div>
    <div class="species-grid">${SPECIES_ORDER.map((sp) => {
      const mine = myPick === sp, his = paPick === sp;
      return `<button class="sp-card ${mine ? 'mine' : ''} ${mine && his ? 'match' : ''}" data-sp="${sp}">
        <div class="who">${mine ? `<i>${esc(me.name)}</i>` : ''}${his ? `<i class="p">${esc(pa.name)}</i>` : ''}</div>
        ${petSVG(sp, { stage: 3, mood: mine || his ? 'love' : 'happy' })}<b>${esc(S.species[sp].name)}</b></button>`;
    }).join('')}</div>`;
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
      <p class="muted tiny" style="text-align:center;margin:0 0 16px">Начнёт с малыша и будет расти по дням: 10, 50, 100, 200, 300 и 365 дней.</p>
      ${his ? `<div style="text-align:center;margin-bottom:12px"><span class="chip">${esc(S.partner.name)} тоже хочет его!</span></div>` : ''}
      ${mine ? `<button class="btn ghost block" disabled>${icon('check')} Это твой выбор</button>` : `<button class="btn block" id="pick">${icon('heart')} Выбираю ${his ? 'его — совпадём!' : 'его'}</button>`}`,
    onMount(sh, close) {
      const b = $('#pick', sh);
      if (b) b.onclick = async () => {
        b.disabled = true;
        try {
          const d = await api('/pet/pick', { method: 'POST', body: { species: sp } });
          setPet(d.pet); close(); haptic.ok();
          if (d.adopted) confetti(110); else toast('Выбор отправлен в чат');
          draw();
        } catch (e) { toast(e.message, 'err'); b.disabled = false; }
      };
    },
  });
}

// =============== КОМНАТА ===============
const isGinger = () => S.pet.species === 'cat_ginger';
const serverNow = () => Date.now() + (S.serverOffset || 0);
function petName() { return S.pet.name || 'Малыш'; }
function isNight() { const h = new Date(serverNow() + 3 * 3600e3).getUTCHours(); return h >= 23 || h < 8; }
function baseMood() {
  if (S.pet.sleep_until * 1000 > serverNow()) return 'sleep';
  return S.pet.mood;
}

function spriteHTML(pose, mood) {
  if (isGinger()) return gingerSVG({ stage: S.pet.stage, mood, pose });
  return petSVG(S.pet.species, { stage: S.pet.stage, mood: pose === 'sleep' ? 'sleep' : pose === 'eat' ? 'eat' : pose === 'play' ? 'play' : mood });
}

function setPose(pose, mood = pet.mood) {
  pet.pose = pose; pet.mood = mood;
  const el = $('#pet-sprite', root);
  if (el) el.innerHTML = spriteHTML(pose, mood);
}

function skyHTML() {
  const h = new Date(Date.now() + 3 * 3600e3).getUTCHours();
  if (h >= 22 || h < 6) return `<div class="sky" style="background:linear-gradient(180deg,#141A38,#2E2F63)"><svg viewBox="0 0 92 92" style="position:absolute;inset:0"><circle cx="62" cy="28" r="11" fill="#FFF3C4"/><circle cx="67" cy="24" r="9.5" fill="#1D2347"/>${[[18, 20], [30, 50], [14, 64], [44, 18], [72, 60], [50, 70]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="#fff"/>`).join('')}</svg></div>`;
  if (h < 9 || h >= 18) return `<div class="sky" style="background:linear-gradient(180deg,#E9A27E,#D98AA5 60%,#9F8BD8)"><svg viewBox="0 0 92 92" style="position:absolute;inset:0"><circle cx="46" cy="72" r="15" fill="#FFE3A3"/></svg></div>`;
  return `<div class="sky" style="background:linear-gradient(180deg,#86BCE6,#C6E2F7)"><svg viewBox="0 0 92 92" style="position:absolute;inset:0"><circle cx="66" cy="26" r="10" fill="#FFE7A0"/><ellipse cx="28" cy="46" rx="15" ry="6" fill="#fff"/><ellipse cx="37" cy="42" rx="9" ry="6" fill="#fff"/></svg></div>`;
}

function drawAlive() {
  const p = S.pet;
  root.innerHTML = `
    <div class="pet-top">
      <div class="grow"><button class="pet-name" id="name-btn"></button><div class="pet-sub" id="pet-sub"></div></div>
      <button class="streak" id="streak"></button>
    </div>
    <div class="room2 ${isNight() ? 'night' : ''}" id="room">
      <div class="window">${skyHTML()}</div>
      <div class="frame"><div><svg viewBox="-17 -17 34 30" width="24" height="22">${heart(0, 0, 1)}</svg></div></div>
      <div class="room-tools"><button data-act="games" aria-label="Мини-игры">${icon('game')}</button><button data-act="history" aria-label="История">${icon('history')}</button></div>
      <div class="floor"></div>
      <button class="obj obj-post" data-obj="post" style="left:${SPOT.post * 100}%" aria-label="Когтеточка">${postSVG()}</button>
      <button class="obj obj-bed" data-obj="bed" style="left:${SPOT.bed * 100}%" aria-label="Лежанка">${bedSVG()}<i class="cd"></i></button>
      <button class="obj obj-tub" data-obj="tub" style="left:${SPOT.tub * 100}%" aria-label="Ванночка">${tubSVG()}<i class="cd"></i></button>
      <button class="obj obj-bowl" data-obj="bowl" style="left:${SPOT.bowl * 100}%" aria-label="Миска">${bowlSVG()}<i class="cd"></i></button>
      <button class="obj obj-ball" data-obj="ball" style="left:${SPOT.ball * 100}%" aria-label="Клубок">${ballSVG()}<i class="cd"></i></button>
      <button class="obj obj-gift ${p.gift_ready ? '' : 'hidden'}" data-obj="gift" aria-label="Подарок">${giftSVG()}</button>
      <div class="pet-walker" id="pet-walker"><div class="pet-flip" id="pet-flip"><div id="pet-sprite"></div></div><div class="bubble" id="bubble"></div></div>
    </div>
    <p class="room-hint" id="room-hint">Нажми на миску, клубок, ванночку или лежанку — ${esc(petName())} сам подойдёт</p>
    <div class="card pet-stats"><div class="ring-row" id="rings"></div>
      <div class="xp-row" style="margin-top:12px"><span id="xp-l"></span><span id="xp-r"></span></div><div class="bar"><i id="xp-bar"></i></div></div>
    <div class="card" id="today"></div>`;
  const room = $('#room', root);
  pet.x = room.clientWidth * 0.5;
  pet.busy = false;
  placePet(false);
  setPose(baseMood() === 'sleep' ? 'sleep' : 'sit', baseMood());
  if (baseMood() === 'sleep') { pet.x = room.clientWidth * SPOT.bed; placePet(false); }
  updatePanels();
  bindRoom();
  brainT = setInterval(brain, 4500);
  cdT = setInterval(updateCooldowns, 1000);
  setTimeout(() => say(greeting()), 600);
  if (!p.name && !askedName) { askedName = true; setTimeout(nameSheet, 1200); }
}

function placePet(animate = true, ms = 0) {
  const w = $('#pet-walker', root);
  if (!w) return;
  w.style.transition = animate ? `left ${ms}ms linear` : 'none';
  w.style.left = pet.x + 'px';
  $('#pet-flip', root).classList.toggle('left', pet.facing < 0);
}

function walkTo(frac, then) {
  const room = $('#room', root);
  if (!room) return;
  const target = Math.max(50, Math.min(room.clientWidth - 50, room.clientWidth * frac));
  const dist = Math.abs(target - pet.x);
  clearTimeout(pet.walkT);
  if (dist < 8) { then && then(); return; }
  pet.facing = target > pet.x ? 1 : -1;
  const ms = Math.max(500, dist * (S.pet.stage <= 1 ? 14 : 10));
  setPose('walk', baseMood() === 'sick' ? 'sick' : 'happy');
  pet.x = target;
  requestAnimationFrame(() => placePet(true, ms));
  pet.walkT = setTimeout(() => { then && then(); }, ms + 30);
}

function updatePanels() {
  if (!root || S.pet.status !== 'alive') return;
  const p = S.pet;
  $('#name-btn', root).innerHTML = `${esc(petName())}${icon('edit')}`;
  const next = p.stage_to ? `до «${S.stages[p.stage + 1]}» ${Math.max(0, p.stage_to - p.growth_days)} ${days(Math.max(0, p.stage_to - p.growth_days))}` : 'максимальная стадия';
  $('#pet-sub', root).textContent = `${p.stage_name} · ${p.age_days + 1}-й день с нами · ${MOOD_TEXT[baseMood()] || ''}`;
  const st = $('#streak', root);
  st.className = 'streak' + (p.streak_at_risk ? ' risk' : '');
  st.innerHTML = `${flameSVG(p.streak > 0)}${p.streak}`;
  $('#rings', root).innerHTML = petIconsBar(p.stats);
  $('#xp-l', root).textContent = `Рост: ${p.growth_days} ${days(p.growth_days)}`;
  $('#xp-r', root).textContent = next;
  const span = p.stage_to ? p.stage_to - p.stage_from : 1;
  $('#xp-bar', root).style.width = (p.stage_to ? ((p.growth_days - p.stage_from) / span) * 100 : 100) + '%';
  $('.obj-gift', root).classList.toggle('hidden', !p.gift_ready);
  const visited = p.today_visits || [];
  const person = (u) => u ? `<div class="row" style="gap:8px">${avatarHTML(u, S.avatars[u.id], 'sm')}<div><b style="font-size:13.5px">${esc(u.name)}</b><div class="tiny" style="font-weight:800;color:${visited.includes(u.id) ? 'var(--good)' : 'var(--text2)'}">${visited.includes(u.id) ? 'заходил(а) сегодня' : 'ещё не заходил(а)'}</div></div></div>` : '';
  $('#today', root).innerHTML = `<h2>${flameSVG(p.streak > 0, 22)} Огонёк<span class="spacer"></span><span class="chip gray">${icon('shield')}${p.restores_left} из 3</span></h2>
    <div class="row" style="justify-content:space-between">${person(S.me)}${person(S.partner)}</div>
    <p class="muted tiny" style="margin:12px 0 0">Огонёк растёт, когда вы <b>оба</b> заходите хотя бы раз в день. Если кто-то пропустит — ${esc(petName())} заболеет, а огонёк спасёт восстановление: их ${p.restores_left} из 3 в этом месяце.
    ${p.sick ? '<br><b style="color:var(--bad)">Сейчас ему плохо — загляните сегодня оба, и он поправится.</b>' : ''}</p>`;
  updateCooldowns();
}

function updateCooldowns() {
  if (!root || !S.pet.cooldowns) return;
  const el = (Date.now() - fetchedAt) / 1000;
  const map = { bowl: 'feed', ball: 'play', tub: 'wash', bed: 'sleep' };
  Object.entries(map).forEach(([obj, act]) => {
    const b = $(`[data-obj="${obj}"]`, root);
    if (!b) return;
    const left = Math.max(0, Math.round(S.pet.cooldowns[act] - el));
    b.classList.toggle('cool', !!left);
    $('.cd', b).textContent = left ? fmtCd(left) : '';
  });
}

function bindRoom() {
  $('#name-btn', root).onclick = nameSheet;
  $('#streak', root).onclick = () => toast(S.pet.streak_at_risk ? 'Загляните сегодня оба, иначе огонёк погаснет!' : `Огонёк: ${S.pet.streak} ${days(S.pet.streak)} подряд`);
  $('#pet-walker', root).onclick = petTap;
  $$('[data-obj]', root).forEach((b) => { b.onclick = (e) => { e.stopPropagation(); useObject(b.dataset.obj); }; });
  $$('.room-tools [data-act]', root).forEach((b) => { b.onclick = () => { haptic.tap(); b.dataset.act === 'games' ? gamesSheet() : historyScreen(); }; });
}

// ---------- сценарий (что котик делает сам) ----------
function brain() {
  if (!root || document.hidden || pet.busy) return;
  const m = baseMood();
  if (m === 'sleep' || isNight()) {
    if (pet.pose !== 'sleep') { busy(99999); walkTo(SPOT.bed, () => { setPose('sleep', 'sleep'); pet.busy = false; }); }
    else if (Math.random() < .2) say('Zzz…', 1600);
    return;
  }
  if (m === 'sick') {
    if (pet.pose !== 'sit') setPose('sit', 'sick');
    if (Math.random() < .35) say(sickPhrase());
    return;
  }
  const r = Math.random();
  if (r < .26) { busy(4000); walkTo(.15 + Math.random() * .7, () => { setPose('sit', m); pet.busy = false; }); }
  else if (r < .4) { busy(5200); setPose('groom', m); setTimeout(() => { setPose('sit', m); pet.busy = false; }, 3600); }
  else if (r < .54) { busy(9000); walkTo(SPOT.post + .07, () => { pet.facing = -1; placePet(false); setPose('scratch', m); say('Шкряб-шкряб!', 1500); setTimeout(() => { setPose('sit', m); pet.busy = false; }, 3200); }); }
  else if (r < .66) { busy(9000); playBall(false); }
  else if (r < .86) { say(phrase()); }
  else if (r < .93) holdSign();
  else { busy(3000); setPose('stand', m); setTimeout(() => { setPose('sit', m); pet.busy = false; }, 2200); }
}
function busy(ms) { pet.busy = true; clearTimeout(pet.busyT); pet.busyT = setTimeout(() => { pet.busy = false; }, ms + 4000); }

function playBall(fromUser) {
  walkTo(SPOT.ball - .1, () => {
    pet.facing = 1; placePet(false);
    setPose('play', 'play');
    const ball = $('.obj-ball', root);
    ball.classList.remove('roll'); void ball.offsetWidth; ball.classList.add('roll');
    act('act-hop');
    setTimeout(() => act('act-hop'), 650);
    if (fromUser) hearts(4);
    setTimeout(() => { setPose('sit', baseMood()); pet.busy = false; }, 2000);
  });
}

function phrase() {
  const p = S.pet, sp = S.species[p.species], me = S.me.name, pa = S.partner?.name || '';
  const end = new Date(`${S.dmb.end}T00:00:00+03:00`);
  const left = Math.max(0, Math.ceil((end - Date.now()) / 864e5));
  const m = baseMood();
  const list = [`${sp.sound}!`, `Привет, ${me}!`, 'Я люблю вас обоих', `До дембеля ${left} ${days(left)}. Я считаю!`, `${pa} тоже обо мне заботится`, 'Поиграем?', 'Почеши за ушком', 'Мне нужна коробка'];
  if (m === 'hungry') list.push('Я бы что-нибудь съел…', 'Покормишь?');
  if (m === 'dirty') list.push('Кажется, мне пора в ванночку');
  if (m === 'tired') list.push('Глазки слипаются…');
  if (m === 'sad') list.push('Мне скучно…', 'Обними меня');
  if (p.gift_ready) list.push('У меня для тебя подарок у окна!');
  if (p.streak_at_risk) list.push(`${pa} сегодня ещё не заходил(а). Огонёк ждёт!`);
  return list[Math.floor(Math.random() * list.length)];
}
function sickPhrase() {
  const y = (S.pet.today_visits || []);
  const pa = S.partner;
  const who = pa && !y.includes(pa.id) ? pa.name : '';
  return ['Мне плохо без вас…', 'Апчхи…', who ? `Жду, когда зайдёт ${who}` : 'Заходите ко мне оба, пожалуйста', 'Обнимите меня…'][Math.floor(Math.random() * 4)];
}
function greeting() {
  if (baseMood() === 'sleep') return 'Zzz…';
  if (baseMood() === 'sick') return sickPhrase();
  const h = new Date(Date.now() + 3 * 3600e3).getUTCHours();
  return `${h < 5 ? 'Почему не спишь' : h < 12 ? 'Доброе утро' : h < 18 ? 'Привет' : 'Добрый вечер'}, ${S.me.name}!`;
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
  const el = $('#pet-sprite', root);
  if (!el) return;
  el.classList.remove('act-hop', 'act-wiggle', 'act-squish', 'act-spin');
  void el.offsetWidth;
  el.classList.add(cls);
}
function holdSign() {
  const end = new Date(`${S.dmb.end}T00:00:00+03:00`);
  const left = Math.max(0, Math.ceil((end - Date.now()) / 864e5));
  say(left ? `Ещё ${left} ${days(left)} — и он дома!` : 'ДЕМБЕЛЬ!', 3000);
  act('act-hop');
}
function hearts(n = 5) {
  const room = $('#room', root);
  if (!room) return;
  for (let i = 0; i < n; i++) {
    const h = document.createElement('div');
    h.className = 'fx fx-heart';
    h.style.left = (pet.x + Math.random() * 70 - 35) + 'px';
    h.style.bottom = (90 + Math.random() * 30) + 'px';
    h.style.setProperty('--r', (Math.random() * 40 - 20) + 'deg');
    h.style.animationDelay = (i * .08) + 's';
    h.innerHTML = `<svg viewBox="-17 -17 34 30" width="${18 + Math.random() * 12}" height="${16 + Math.random() * 10}">${heart(0, 0, 1, ['#F2A1B5', '#F7BACB', '#E68FA5'][i % 3])}</svg>`;
    room.append(h);
    setTimeout(() => h.remove(), 1700);
  }
}
function bubblesFx() {
  const room = $('#room', root);
  for (let i = 0; i < 12; i++) {
    const b = document.createElement('div');
    b.className = 'bubble-fx';
    const s = 10 + Math.random() * 20;
    b.style.width = b.style.height = s + 'px';
    b.style.left = (pet.x - 50 + Math.random() * 100) + 'px';
    b.style.bottom = (40 + Math.random() * 60) + 'px';
    b.style.animationDelay = (Math.random() * .8) + 's';
    room.append(b);
    setTimeout(() => b.remove(), 2600);
  }
}

// ---------- взаимодействие ----------
async function petTap() {
  haptic.soft();
  hearts(3);
  act('act-squish');
  if (baseMood() !== 'sleep') say(baseMood() === 'sick' ? 'Спасибо, что ты рядом…' : `${S.species[S.pet.species].sound}!`, 1400);
  if (Date.now() - lastPetTap > 4000) { lastPetTap = Date.now(); doAction('pet', null, true); }
}

async function doAction(action, food, silent = false) {
  try {
    const d = await api('/pet/action', { method: 'POST', body: { action, food } });
    const prevStage = S.pet.stage;
    setPet(d.pet);
    const r = d.result;
    if (!r.ok) { if (!silent) { toast(r.msg); say(r.msg.split('—')[0], 2600); } return r; }
    if (r.xp && !silent) toast(`${r.msg} +${r.xp} опыта`);
    if (S.pet.stage !== prevStage) grown();
    updatePanels();
    return r;
  } catch (e) { toast(e.message, 'err'); return { ok: false }; }
}

function grown() {
  confetti(100);
  setPose(pet.pose === 'walk' ? 'sit' : pet.pose, baseMood());
  act('act-spin');
  setTimeout(() => say(`Я подрос! Теперь я «${S.pet.stage_name}»`, 4200), 600);
}

async function useObject(obj) {
  haptic.tap();
  if (obj === 'gift') return openGift();
  if (obj === 'post') { busy(8000); walkTo(SPOT.post + .07, () => { pet.facing = -1; placePet(false); setPose('scratch', baseMood()); setTimeout(() => { setPose('sit', baseMood()); pet.busy = false; }, 3000); }); return; }
  if (obj === 'bowl') return feedSheet();
  const action = { ball: 'play', tub: 'wash', bed: 'sleep' }[obj];
  const r = await doAction(action);
  if (!r || !r.ok) return;
  busy(9000);
  if (obj === 'ball') playBall(true);
  if (obj === 'tub') walkTo(SPOT.tub, () => { setPose('groom', baseMood()); bubblesFx(); setTimeout(() => { say('Я чистенький!'); setPose('sit', baseMood()); pet.busy = false; }, 2600); });
  if (obj === 'bed') walkTo(SPOT.bed, () => { setPose('sleep', 'sleep'); say('Спокойной ночи…', 2000); pet.busy = false; updatePanels(); });
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
          busy(9000);
          const bowl = $('.obj-bowl', root);
          bowl.innerHTML = bowlSVG(`<g transform="translate(26,4) scale(.44)">${foodSVG(f, 64).replace(/<\/?svg[^>]*>/g, '')}</g>`) + '<i class="cd"></i>';
          walkTo(SPOT.bowl - .09, () => {
            pet.facing = 1; placePet(false);
            setPose('eat', 'eat');
            setTimeout(() => {
              bowl.innerHTML = bowlSVG() + '<i class="cd"></i>';
              setPose('sit', baseMood());
              say(r.fav ? 'Это моё самое любимое!' : 'Ням-ням!');
              if (r.fav) { hearts(10); confetti(40); }
              pet.busy = false; updateCooldowns();
            }, 3000);
          });
        };
      });
    },
  });
}

async function openGift() {
  if (!S.pet.gift_ready) { toast('Сегодня подарок уже был. Завтра будет новый!'); return; }
  try {
    const d = await api('/pet/gift', { method: 'POST' });
    setPet(d.pet); updatePanels();
    const g = d.gift;
    sheet({
      title: g.kind === 'reason' ? `${esc(petName())} принёс записку!` : `${esc(petName())} шепчет тебе…`,
      html: `<div class="gift-card"><div class="gift-box" style="width:140px;margin:0 auto">${spriteHTML('sit', 'love')}</div>
        ${g.kind === 'reason' ? `<div class="num">Причина №${g.num} из 101</div>` : ''}
        <p>${esc(g.text)}</p><button class="btn block" data-ok>${icon('heart')} Сохраню в сердце</button></div>`,
      onMount(sh, close) { $('[data-ok]', sh).onclick = close; confetti(30); },
    });
  } catch (e) { toast(e.message, 'err'); }
}

function nameSheet() {
  const p = S.pet;
  sheet({
    title: p.name ? 'Имя питомца' : 'Как назовём малыша?',
    html: `<div style="width:170px;margin:-30px auto 0">${spriteHTML('sit', 'love')}</div>
      <div class="field"><input id="pet-name" maxlength="20" placeholder="Например: Персик" value="${esc(p.name || '')}"></div>
      <p class="muted tiny" style="text-align:center;margin:-4px 0 14px">Имя увидите вы оба, а в чат придёт сообщение. Менять можно когда угодно.</p>
      <button class="btn block" id="save-name">${icon('check')} Готово</button>`,
    onMount(sh, close) {
      setTimeout(() => $('#pet-name', sh).focus(), 350);
      $('#save-name', sh).onclick = async () => {
        const name = $('#pet-name', sh).value.trim();
        if (name.length < 2) { toast('Имя слишком короткое', 'err'); return; }
        try {
          const d = await api('/pet/name', { method: 'POST', body: { name } });
          setPet(d.pet); close(); haptic.ok(); updatePanels(); hearts(8);
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
    html: `<p class="muted tiny" style="text-align:center;margin:-6px 0 14px">Игры дают опыт — так ${esc(petName())} растёт быстрее (${p.xp_per_day} опыта = +1 день роста). Сегодня ещё можно: <b>${p.game_left}</b></p>
      <div class="games-list">
        <button class="game-item" data-g="catch"><span class="ic" style="background:var(--soft)">${foodSVG('cookie', 40)}</span><div><b>Вкусняшки</b><span>Лови еду, уворачивайся от тучек · рекорд ${p.records.catch || 0}</span></div></button>
        <button class="game-item" data-g="memory"><span class="ic" style="background:var(--soft)">${foodSVG('strawberry', 40)}</span><div><b>Пары</b><span>Найди одинаковые карточки — чем меньше ходов, тем больше опыта</span></div></button>
      </div>`,
    onMount(sh, close) { $$('[data-g]', sh).forEach((b) => { b.onclick = () => { close(); setTimeout(() => playGame(b.dataset.g), 250); }; }); },
  });
}

function playGame(game) {
  let stop = () => {};
  fullscreen({
    html: `<div class="game-head"><button class="icon-btn" data-x>${icon('close')}</button><h2>${game === 'catch' ? 'Вкусняшки' : 'Пары'}</h2></div><div id="game-root"></div>`,
    onMount(el, close) {
      $('[data-x]', el).onclick = close;
      const g = $('#game-root', el);
      const finish = async (score, moves = 0) => {
        let res = null;
        try { const d = await api('/pet/game', { method: 'POST', body: { game, score, moves } }); setPet(d.pet); res = d.result; } catch (e) { toast(e.message, 'err'); }
        if (res && res.grown && res.grown.length) confetti(100); else haptic.ok();
        g.innerHTML = `<div class="game-over"><div style="width:170px;margin:0 auto">${spriteHTML('sit', 'love')}</div>
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
  const c = p.counters || {};
  const stageArt = (i) => isGinger() ? gingerSVG({ stage: i, mood: i > p.stage ? 'sleep' : 'happy', pose: i > p.stage ? 'sleep' : 'sit' }) : petSVG(p.species, { stage: i, mood: i > p.stage ? 'sleep' : 'happy' });
  fullscreen({
    html: `<div class="game-head"><button class="icon-btn" data-x>${icon('back')}</button><h2>История ${esc(petName())}</h2></div>
      <div class="card"><h2>${icon('sparkle')} Как мы растём</h2>
        <div class="stages">${S.stages.map((n, i) => `<div class="stg ${i > p.stage ? 'locked' : ''} ${i === p.stage ? 'cur' : ''}">${stageArt(i)}<div>${esc(n)}</div><div class="tiny muted">${S.stageXp[i]} дн.</div></div>`).join('')}</div>
        <p class="muted tiny" style="margin:12px 0 0">Сейчас: ${p.growth_days} ${days(p.growth_days)} роста (${p.age_days} ${days(p.age_days)} с нами + опыт за заботу и игры).</p></div>
      <div class="card"><h2>${icon('list')} Вместе мы уже</h2><div class="mini-stats">
        <div><b>${c.feed || 0}</b><span>раз покормили</span></div><div><b>${c.play || 0}</b><span>раз поиграли</span></div>
        <div><b>${c.pet || 0}</b><span>обнимашек</span></div><div><b>${c.games || 0}</b><span>мини-игр</span></div>
        <div><b>${c.wash || 0}</b><span>купаний</span></div><div><b>${p.streak_best}</b><span>рекорд огонька</span></div></div></div>
      <div class="card"><h2>${icon('history')} Летопись</h2><div class="tl">${[...p.history].reverse().map((h) => `<div class="tl-item"><b>${esc(h.text)}</b><span>${fmtDate(new Date(h.ts * 1000))}</span></div>`).join('') || '<div class="muted">Пока пусто</div>'}</div></div>
      ${isAdmin() ? `<div class="card"><h2>${icon('crown')} Админ</h2><div class="row"><button class="btn plain grow sm" data-xp>+1 день роста</button><button class="btn danger grow sm" data-reset>Выбрать заново</button></div></div>` : ''}`,
    onMount(el, close) {
      $('[data-x]', el).onclick = close;
      const xp = $('[data-xp]', el);
      if (xp) xp.onclick = async () => {
        try { const d = await api('/pet/xp', { method: 'POST', body: { xp: p.xp_per_day } }); const s0 = S.pet.stage; setPet(d.pet); toast('+1 день роста'); if (S.pet.stage !== s0) { close(); grown(); } updatePanels(); } catch (e) { toast(e.message, 'err'); }
      };
      const rs = $('[data-reset]', el);
      if (rs) rs.onclick = async () => {
        if (!(await confirmSheet('Начать выбор питомца заново? Текущий питомец уйдёт в архив.', { ok: 'Да, заново', danger: true }))) return;
        try { const d = await api('/pet/reset', { method: 'POST' }); setPet(d.pet); close(); draw(); } catch (e) { toast(e.message, 'err'); }
      };
    },
  });
}
