// «Игры»: моментики, вызовы, «Камень, ножницы, бумага», «Дурак», купоны и желания.
import { S, nameOf } from '../state.js';
import { api } from '../api.js';
import { $, $$, esc, sheet, fullscreen, toast, confetti, confirmSheet, plural, fmtAgo } from '../ui.js';
import { icon } from '../art/icons.js';
import { coinSVG, cardSVG, cardBackSVG, suitSVG, handSVG, handWaitSVG, RPS, rankOf, suitOf, rankLabel } from '../art/play.js';
import { haptic } from '../tg.js';

let root = null, data = null, pollT = null, screen = null;
const coins = (n) => plural(n, 'моментик', 'моментика', 'моментиков');
const fem = (uid) => uid === (S.me.role === 'admin' ? S.me.id : S.partner?.id);
const partnerName = () => S.partner?.name || 'второй';
// склонение имён: Дима → Димы / Диму / Димой, Ксюша → Ксюши / Ксюшу / Ксюшей
const HUSH = 'гкхжчшщ';
const gen = (n) => (n && /[ая]$/.test(n) ? n.slice(0, -1) + (n.endsWith('я') || HUSH.includes(n.slice(-2, -1)) ? 'и' : 'ы') : n || '');
const acc = (n) => (n && /[ая]$/.test(n) ? n.slice(0, -1) + (n.endsWith('я') ? 'ю' : 'у') : n || '');
const ins = (n) => (n && /[ая]$/.test(n) ? n.slice(0, -1) + (n.endsWith('я') || 'жчшщц'.includes(n.slice(-2, -1)) ? 'ей' : 'ой') : n || '');
const RPS_GEN = { rock: 'камня', scissors: 'ножниц', paper: 'бумаги' };
const GAME_NAMES = { rps: 'Камень, ножницы, бумага', durak: 'Дурак' };

function stakeText(s) {
  if (!s || s.kind === 'none') return 'просто так';
  if (s.kind === 'coins') return `на ${s.amount} ${coins(s.amount)}`;
  return 'на желание' + (s.text ? ` «${s.text}»` : '');
}
function stakeChip(s) {
  if (!s || s.kind === 'none') return `<span class="chip gray">просто так</span>`;
  if (s.kind === 'coins') return `<span class="chip coin-chip">${coinSVG(16)}${s.amount}</span>`;
  return `<span class="chip">${icon('star')}желание</span>`;
}
function durakTitle(st) {
  return `${st.mode === 'perevodnoy' ? 'Переводной' : 'Подкидной'} · ${st.deck} карт${st.cheats ? ' · с шулерами' : ''}`;
}

// ================= экран вкладки =================
export function render(r) {
  root = r;
  root.innerHTML = `<div class="card wallet skel"><div class="empty">Загружаем…</div></div>`;
  load();
  pollT = setInterval(() => { if (!screen) live(); }, 4000);
}
export function destroy() { clearInterval(pollT); root = null; }

async function load() {
  try { data = await api('/games'); draw(); } catch (e) { if (root) root.innerHTML = `<div class="card"><div class="empty">${esc(e.message)}</div></div>`; }
}
async function live() {
  if (!root || document.hidden) return;
  try {
    const d = await api('/games/live');
    const sig = (x) => JSON.stringify([x.rps && [x.rps.status, x.rps.id], x.durak && [x.durak.status, x.durak.id], x.balance]);
    if (sig(d) !== sig(data)) await load();
  } catch (e) { /* */ }
}
function apply(d) { Object.assign(data, d); if (root) draw(); }

function draw() {
  if (!root || !data) return;
  const b = data.balance;
  const earnedToday = data.earn.reduce((t, e) => t + e.got, 0);
  const earnMax = data.earn.reduce((t, e) => t + e.cap, 0);
  root.innerHTML = `
    <div class="card wallet">
      <div class="wallet-coin">${coinSVG(64, 'spin-in')}</div>
      <div class="grow">
        <span class="muted tiny" style="font-weight:800;letter-spacing:.04em">МОИ МОМЕНТИКИ</span>
        <div class="wallet-bal"><b>${b.me}</b></div>
        ${S.partner ? `<span class="muted tiny">У ${esc(gen(partnerName()))} — ${b.opp}</span>` : ''}
      </div>
      <div class="wallet-actions">
        <button class="icon-btn" id="w-earn" aria-label="Как заработать">${icon('sparkle')}</button>
        <button class="icon-btn" id="w-hist" aria-label="История">${icon('history')}</button>
      </div>
      <div class="wallet-today"><div class="bar"><i style="width:${Math.round(earnedToday / earnMax * 100)}%"></i></div><span>Сегодня заработано ${earnedToday} из ${earnMax}</span></div>
    </div>
    ${liveCard('rps')}${liveCard('durak')}
    <div class="game-tiles">
      <button class="gtile rps-tile" data-new="rps">
        <div class="gt-art">${handSVG('rock', 52, 'l')}${handSVG('scissors', 52, 'm')}${handSVG('paper', 52, 'r')}</div>
        <b>Камень, ножницы, бумага</b><span>На желание или моментики</span>
      </button>
      <button class="gtile durak-tile" data-new="durak">
        <div class="gt-art cards-fan">${cardSVG('AS', 'f1')}${cardSVG('KH', 'f2')}${cardSVG('QD', 'f3')}</div>
        <b>Дурак</b><span>Подкидной, переводной, с шулерами</span>
      </button>
    </div>
    ${couponsCard()}
    ${owedCard()}
    ${historyCard()}`;
  $('#w-earn', root).onclick = earnSheet;
  $('#w-hist', root).onclick = ledgerSheet;
  $$('[data-new]', root).forEach((x) => { x.onclick = () => { haptic.tap(); openOrNew(x.dataset.new); }; });
  bindLive();
  bindCoupons();
  bindOwed();
}

// ---------- вызовы ----------
function liveCard(kind) {
  const g = data[kind];
  if (!g) return '';
  const me = S.me.id;
  const title = GAME_NAMES[kind] + (kind === 'durak' ? ` · ${durakTitle(g.settings).toLowerCase()}` : g.first_to > 1 ? ` · до ${g.first_to} побед` : '');
  let body = '', btns = '';
  if (g.status === 'invite' && g.to === me) {
    body = `<b>${esc(nameOf(g.by))} зовёт сыграть</b><span>${esc(title)} — ${esc(stakeText(g.stake))}</span>`;
    btns = `<button class="btn plain sm" data-act="${kind}:decline">Не сейчас</button><button class="btn sm" data-act="${kind}:accept">Играем!</button>`;
  } else if (g.status === 'invite') {
    body = `<b>Ждём ${esc(partnerName())}…</b><span>${esc(title)} — ${esc(stakeText(g.stake))}</span>`;
    btns = `<button class="btn plain sm" data-act="${kind}:cancel">Отменить</button>`;
  } else if (g.status === 'playing') {
    body = `<b>Идёт партия</b><span>${esc(title)} — ${esc(stakeText(g.stake))}</span>`;
    btns = `<button class="btn sm" data-open="${kind}">Открыть</button>`;
  } else if (g.status === 'done' && g.result) {
    const r = g.result;
    body = `<b>${r.draw ? 'Ничья' : r.winner === me ? 'Ты победил' + (fem(me) ? 'а' : '') + '!' : 'Победа у ' + esc(gen(nameOf(r.winner)))}</b><span>${esc(title)} — ${esc(stakeText(g.stake))}</span>`;
    btns = `<button class="btn plain sm" data-close="${kind}">Скрыть</button><button class="btn sm" data-open="${kind}">Смотреть</button>`;
  } else {
    return '';
  }
  return `<div class="card live-card ${g.status}"><div class="lc-ico ${kind}">${kind === 'rps' ? handSVG('rock', 34) : cardBackSVG()}</div>
    <div class="grow lc-text">${body}</div><div class="lc-btns">${btns}</div></div>`;
}

function bindLive() {
  $$('[data-act]', root).forEach((b) => {
    b.onclick = async () => {
      const [kind, act] = b.dataset.act.split(':');
      b.disabled = true;
      try {
        const d = await api(`/play/${kind}/${act}`, { method: 'POST', body: {} });
        haptic.ok(); apply(d);
        if (act === 'accept') open(kind);
      } catch (e) { toast(e.message, 'err'); b.disabled = false; }
    };
  });
  $$('[data-open]', root).forEach((b) => { b.onclick = () => open(b.dataset.open); });
  $$('[data-close]', root).forEach((b) => {
    b.onclick = async () => { try { apply(await api(`/play/${b.dataset.close}/close`, { method: 'POST', body: {} })); } catch (e) { toast(e.message, 'err'); } };
  });
}

function openOrNew(kind) {
  const g = data[kind];
  if (g && (g.status === 'playing' || g.status === 'done')) { open(kind); return; }
  if (g && g.status === 'invite') { toast(g.to === S.me.id ? 'Тебя уже зовут — ответь на вызов' : `Ждём, когда ${partnerName()} примет вызов`); return; }
  setupSheet(kind);
}
function open(kind) { if (kind === 'rps') rpsScreen(); else durakScreen(); }

// ---------- настройка вызова ----------
function setupSheet(kind, preset) {
  if (!S.partner) { toast('Нужен второй игрок'); return; }
  const st = Object.assign({ stake: 'wish', amount: 10, text: '', first_to: 1, mode: 'podkidnoy', deck: 36, cheats: false }, preset || {});
  sheet({
    title: kind === 'rps' ? 'Камень, ножницы, бумага' : 'Дурак',
    html: `${kind === 'rps' ? `
        <label class="lbl">Играем до</label>
        <div class="seg" id="s-ft">${[1, 2, 3].map((n) => `<button data-v="${n}" class="${st.first_to === n ? 'on' : ''}">${n} ${plural(n, 'победы', 'побед', 'побед')}</button>`).join('')}</div>`
      : `<label class="lbl">Вид</label>
        <div class="seg" id="s-mode"><button data-v="podkidnoy" class="${st.mode === 'podkidnoy' ? 'on' : ''}">Подкидной</button><button data-v="perevodnoy" class="${st.mode === 'perevodnoy' ? 'on' : ''}">Переводной</button></div>
        <p class="muted tiny hint" id="mode-hint"></p>
        <label class="lbl">Колода</label>
        <div class="seg" id="s-deck"><button data-v="36" class="${st.deck === 36 ? 'on' : ''}">36 карт</button><button data-v="24" class="${st.deck === 24 ? 'on' : ''}">24 карты</button></div>
        <div class="toggle-row" style="border:0;padding:14px 0 4px"><span class="ic c7">${icon('shield')}</span><div class="grow"><b>С шулерами</b><span>Можно жульничать: класть «не те» карты. Поймал — соперник забирает стол. Обвинил зря — забираешь сам</span></div><button class="sw ${st.cheats ? 'on' : ''}" id="s-cheat" aria-label="С шулерами"></button></div>`}
      <label class="lbl">Ставка</label>
      <div class="seg" id="s-stake"><button data-v="wish">На желание</button><button data-v="coins">На моментики</button><button data-v="none">Просто так</button></div>
      <div id="stake-box"></div>
      <button class="btn block" id="s-go" style="margin-top:14px">${icon('send')} Позвать ${esc(acc(S.partner.name))}</button>`,
    onMount(sh, close) {
      const seg = (id, key, conv = (v) => v) => $$(`#${id} button`, sh).forEach((b) => {
        b.onclick = () => { st[key] = conv(b.dataset.v); $$(`#${id} button`, sh).forEach((x) => x.classList.toggle('on', x === b)); haptic.sel(); drawStake(); };
      });
      const drawStake = () => {
        $$('#s-stake button', sh).forEach((x) => x.classList.toggle('on', x.dataset.v === st.stake));
        const mh = $('#mode-hint', sh);
        if (mh) mh.textContent = st.mode === 'perevodnoy' ? 'Пока карта не побита, её можно перевести картой того же достоинства — и отбиваться придётся сопернику' : 'Классика: отбиваешься или берёшь, соперник подкидывает карты того же достоинства';
        const box = $('#stake-box', sh);
        if (st.stake === 'coins') {
          box.innerHTML = `<div class="stake-coins"><div class="field grow" style="margin:0"><input id="s-amount" type="number" inputmode="numeric" min="1" max="1000" value="${st.amount}"></div>${coinSVG(28)}</div>
            <div class="chips-quick">${[5, 10, 25, 50, 100].map((n) => `<button data-q="${n}" class="${st.amount === n ? 'on' : ''}">${n}</button>`).join('')}</div>
            <p class="muted tiny hint">У тебя ${data.balance.me}. Ставка замораживается у обоих, победитель забирает всё. Ничья — ставки возвращаются</p>`;
          $('#s-amount', box).oninput = (e) => { st.amount = parseInt(e.target.value, 10) || 0; };
          $$('[data-q]', box).forEach((b) => { b.onclick = () => { st.amount = +b.dataset.q; drawStake(); haptic.sel(); }; });
        } else if (st.stake === 'wish') {
          box.innerHTML = `<div class="field"><textarea id="s-text" rows="2" maxlength="140" placeholder="Какое желание? Можно оставить пустым и придумать потом">${esc(st.text)}</textarea></div>
            <p class="muted tiny hint">Проигравший исполняет желание победителя — оно появится в списке «Желания»</p>`;
          $('#s-text', box).oninput = (e) => { st.text = e.target.value; };
        } else {
          box.innerHTML = '<p class="muted tiny hint">Без ставки — просто для удовольствия</p>';
        }
      };
      seg('s-ft', 'first_to', Number); seg('s-mode', 'mode'); seg('s-deck', 'deck', Number); seg('s-stake', 'stake');
      const ch = $('#s-cheat', sh);
      if (ch) ch.onclick = () => { st.cheats = !st.cheats; ch.classList.toggle('on', st.cheats); haptic.sel(); };
      drawStake();
      $('#s-go', sh).onclick = async () => {
        const stake = st.stake === 'coins' ? { kind: 'coins', amount: st.amount } : st.stake === 'wish' ? { kind: 'wish', text: st.text } : { kind: 'none' };
        if (stake.kind === 'coins' && stake.amount > data.balance.me) { toast(`Не хватает: у тебя ${data.balance.me} ${coins(data.balance.me)}`, 'err'); return; }
        const btn = $('#s-go', sh);
        btn.disabled = true;
        try {
          const d = await api(`/play/${kind}`, { method: 'POST', body: { stake, first_to: st.first_to, mode: st.mode, deck: st.deck, cheats: st.cheats } });
          haptic.ok(); close(); apply(d);
          toast(`Вызов отправлен — ждём ${acc(S.partner.name)}`);
        } catch (e) { toast(e.message, 'err'); btn.disabled = false; }
      };
    },
  });
}

// ---------- моментики ----------
function earnSheet() {
  sheet({
    title: 'Как получить моментики',
    html: `<div class="earn-list">${data.earn.map((e) => `<div class="earn ${e.got >= e.cap ? 'done' : ''}">
        <div class="grow"><b>${esc(e.title)}</b><span>+${e.amount}${e.cap > e.amount ? ` за раз, до ${e.cap} в день` : ' раз в день'}</span>
        <div class="bar"><i style="width:${Math.round(e.got / e.cap * 100)}%"></i></div></div>
        <span class="earn-got">${e.got >= e.cap ? icon('check') : `${e.got}/${e.cap}`}</span></div>`).join('')}</div>
      <p class="muted tiny" style="text-align:center;margin:12px 0 0">А ещё моментики можно выиграть в играх, получить за проданный купон или в подарок от админа</p>`,
  });
}
function ledgerSheet() {
  sheet({
    title: 'История моментиков',
    html: data.ledger.length ? `<div class="ledger">${data.ledger.map((l) => `<div class="lg"><div class="grow"><b>${esc(l.reason)}</b><span>${esc(fmtAgo(l.ts))}</span></div><b class="${l.delta > 0 ? 'plus' : 'minus'}">${l.delta > 0 ? '+' : '−'}${Math.abs(l.delta)}</b></div>`).join('')}</div>`
      : '<div class="empty">Пока пусто</div>',
  });
}

// ---------- купоны ----------
let couponTab = 'shop';
function couponsCard() {
  const me = S.me.id;
  const shop = data.coupons.filter((c) => c.author !== me && c.status === 'available');
  const mine = data.coupons.filter((c) => c.buyer === me);
  const sell = data.coupons.filter((c) => c.author === me);
  const list = couponTab === 'shop' ? shop : couponTab === 'mine' ? mine : sell;
  const empty = { shop: `${esc(partnerName())} пока не выставил${fem(S.partner?.id) ? 'а' : ''} купонов`, mine: 'Ты ещё ничего не купил' + (fem(me) ? 'а' : ''), sell: 'Выставь купон — например, «Массаж 10 минут» или «Выбираю фильм»' }[couponTab];
  return `<div class="card coupons-card"><h2>${icon('gift')} Купоны<span class="spacer"></span><button class="chip" id="cp-add">${icon('plus')}купон</button></h2>
    <div class="seg" id="cp-tabs"><button data-t="shop" class="${couponTab === 'shop' ? 'on' : ''}">Купить${shop.length ? ` · ${shop.length}` : ''}</button><button data-t="mine" class="${couponTab === 'mine' ? 'on' : ''}">Мои${mine.filter((c) => c.status === 'bought').length ? ` · ${mine.filter((c) => c.status === 'bought').length}` : ''}</button><button data-t="sell" class="${couponTab === 'sell' ? 'on' : ''}">Выставленные</button></div>
    <div class="coupons">${list.length ? list.map(couponHTML).join('') : `<div class="empty" style="padding:16px 6px">${empty}</div>`}</div></div>`;
}
function couponHTML(c) {
  const me = S.me.id;
  let st = '', btn = '';
  if (c.status === 'available') {
    if (c.author === me) { st = 'в продаже'; btn = `<button class="icon-btn sm" data-cdel="${c.id}" aria-label="Удалить">${icon('trash')}</button>`; } else btn = `<button class="btn sm" data-cbuy="${c.id}">Купить</button>`;
  } else if (c.status === 'bought') {
    if (c.buyer === me) { st = 'куплен — можно использовать'; btn = `<button class="btn sm" data-cuse="${c.id}">Использовать</button>`; } else st = `куплен${fem(c.buyer) ? 'а' : ''} ${esc(ins(nameOf(c.buyer)))}`;
  } else st = 'использован ' + esc(fmtAgo(c.used_at));
  return `<div class="coupon ${c.status}"><div class="cp-price">${coinSVG(20)}<b>${c.price}</b></div>
    <div class="grow"><b>${esc(c.title)}</b>${c.note ? `<span>${esc(c.note)}</span>` : ''}<small>${c.author === me ? 'от тебя' : 'от ' + esc(gen(nameOf(c.author)))}${st ? ' · ' + st : ''}</small></div>${btn}</div>`;
}
function bindCoupons() {
  $$('#cp-tabs button', root).forEach((b) => { b.onclick = () => { couponTab = b.dataset.t; haptic.sel(); draw(); }; });
  $('#cp-add', root).onclick = couponSheet;
  const act = async (id, a, method = 'POST') => {
    try { const d = await api(method === 'DELETE' ? `/coupons/${id}` : `/coupons/${id}/${a}`, { method, body: method === 'DELETE' ? undefined : {} }); haptic.ok(); apply(d); return true; } catch (e) { toast(e.message, 'err'); return false; }
  };
  $$('[data-cbuy]', root).forEach((b) => {
    b.onclick = async () => {
      const c = data.coupons.find((x) => x.id === b.dataset.cbuy);
      if (await confirmSheet(`Купить «${esc(c.title)}» за ${c.price} ${coins(c.price)}?`, { ok: 'Купить' })) {
        if (await act(c.id, 'buy')) { couponTab = 'mine'; draw(); confetti(40, true); toast('Купон твой! Используй, когда захочешь'); }
      }
    };
  });
  $$('[data-cuse]', root).forEach((b) => {
    b.onclick = async () => {
      const c = data.coupons.find((x) => x.id === b.dataset.cuse);
      if (await confirmSheet(`Использовать «${esc(c.title)}»? ${esc(nameOf(c.author))} получит уведомление`, { ok: 'Использовать' })) {
        if (await act(c.id, 'use')) toast('Готово! Ждём исполнения');
      }
    };
  });
  $$('[data-cdel]', root).forEach((b) => {
    b.onclick = async () => { if (await confirmSheet('Убрать купон из продажи?', { ok: 'Убрать', danger: true })) act(b.dataset.cdel, '', 'DELETE'); };
  });
}
function couponSheet() {
  const IDEAS = ['Массаж 15 минут', 'Выбираю фильм', 'Завтрак в постель', 'Час обнимашек', 'Желание без отказа', 'Свидание моей мечты'];
  sheet({
    title: 'Новый купон',
    html: `<div class="field"><input id="cp-title" maxlength="60" placeholder="Что даёт купон"></div>
      <div class="chips-quick ideas">${IDEAS.map((t) => `<button data-i="${esc(t)}">${esc(t)}</button>`).join('')}</div>
      <div class="field"><input id="cp-note" maxlength="200" placeholder="Условия (необязательно)"></div>
      <label class="lbl">Цена</label>
      <div class="stake-coins"><div class="field grow" style="margin:0"><input id="cp-price" type="number" inputmode="numeric" min="1" max="5000" value="30"></div>${coinSVG(28)}</div>
      <div class="chips-quick">${[10, 30, 50, 100, 200].map((n) => `<button data-p="${n}">${n}</button>`).join('')}</div>
      <p class="muted tiny hint">${esc(partnerName())} купит его за моментики — они придут тебе. Потом купон можно использовать, и тебе придёт уведомление</p>
      <button class="btn block" id="cp-save" style="margin-top:12px">${icon('check')} Выставить</button>`,
    onMount(sh, close) {
      $$('[data-i]', sh).forEach((b) => { b.onclick = () => { $('#cp-title', sh).value = b.dataset.i; haptic.sel(); }; });
      $$('[data-p]', sh).forEach((b) => { b.onclick = () => { $('#cp-price', sh).value = b.dataset.p; haptic.sel(); }; });
      $('#cp-save', sh).onclick = async () => {
        try {
          const d = await api('/coupons', { method: 'POST', body: { title: $('#cp-title', sh).value, note: $('#cp-note', sh).value, price: parseInt($('#cp-price', sh).value, 10) || 0 } });
          haptic.ok(); close(); couponTab = 'sell'; apply(d); toast('Купон выставлен');
        } catch (e) { toast(e.message, 'err'); }
      };
    },
  });
}

// ---------- желания ----------
function owedCard() {
  const me = S.me.id;
  const open = data.owed.filter((o) => !o.done);
  const done = data.owed.filter((o) => o.done).slice(0, 5);
  if (!data.owed.length) return '';
  const row = (o) => `<div class="owed ${o.done ? 'done' : ''}"><span class="ow-ic">${icon('star')}</span>
    <div class="grow"><b>${o.from === me ? `Я исполняю для ${esc(gen(nameOf(o.to)))}` : `${esc(nameOf(o.from))} исполняет для меня`}</b>
    <span>${o.text ? '«' + esc(o.text) + '»' : 'желание на выбор победителя'} · ${GAME_NAMES[o.game] || ''}</span></div>
    <button class="sw-check ${o.done ? 'on' : ''}" data-owed="${o.id}" aria-label="Исполнено">${icon('check')}</button></div>`;
  return `<div class="card"><h2>${icon('star')} Желания<span class="spacer"></span>${open.length ? `<span class="chip">${open.length}</span>` : ''}</h2>
    ${open.map(row).join('') || '<div class="empty" style="padding:8px">Все желания исполнены</div>'}
    ${done.length ? `<label class="lbl" style="margin-top:12px">Исполнено</label>${done.map(row).join('')}` : ''}</div>`;
}
function bindOwed() {
  $$('[data-owed]', root).forEach((b) => {
    b.onclick = async () => { try { const d = await api(`/owed/${b.dataset.owed}/done`, { method: 'POST', body: {} }); haptic.ok(); apply(d); } catch (e) { toast(e.message, 'err'); } };
  });
}

function historyCard() {
  const h = data.history.slice(0, 6);
  if (!h.length) return '';
  const me = S.me.id;
  const wins = data.history.filter((x) => x.winner === me).length;
  const loses = data.history.filter((x) => x.loser === me).length;
  return `<div class="card"><h2>${icon('crown')} Последние игры<span class="spacer"></span><span class="chip gray">${wins} : ${loses}</span></h2>
    ${h.map((x) => `<div class="hist-row ${x.draw ? 'draw' : x.winner === me ? 'win' : 'lose'}"><i></i><div class="grow"><b>${GAME_NAMES[x.game]}</b><span>${esc(stakeText(x.stake))} · ${esc(fmtAgo(x.ts))}</span></div>
      <b>${x.draw ? 'ничья' : x.winner === me ? 'победа' : 'поражение'}</b></div>`).join('')}</div>`;
}

// ================= общий экран игры =================
function resultBlock(g, kind) {
  const me = S.me.id, r = g.result || {};
  const win = r.winner === me, s = g.stake;
  let title, sub = '';
  if (r.draw) title = 'Ничья!';
  else if (win) title = r.surrender ? `${nameOf(r.loser)} сдал${fem(r.loser) ? 'ась' : 'ся'} — победа твоя!` : 'Победа!';
  else if (kind === 'durak') title = r.surrender ? 'Ты сдал' + (fem(me) ? 'ась' : 'ся') : `Ты остал${fem(me) ? 'ась' : 'ся'} в дураках`;
  else title = r.surrender ? 'Ты сдал' + (fem(me) ? 'ась' : 'ся') : 'Не повезло';
  if (s.kind === 'coins') sub = r.draw ? 'Ставки вернулись' : win ? `+${s.amount * 2} ${coins(s.amount * 2)} на баланс` : `−${s.amount} ${coins(s.amount)}`;
  if (s.kind === 'wish') sub = r.draw ? 'Желание остаётся при своих' : win ? `${nameOf(r.loser)} исполняет твоё желание${s.text ? ': «' + s.text + '»' : ''}` : `Ты исполняешь желание ${gen(nameOf(r.winner))}${s.text ? ': «' + s.text + '»' : ''}`;
  return `<div class="g-result ${r.draw ? 'draw' : win ? 'win' : 'lose'}">
    <div class="gr-badge">${win ? icon('crown') : r.draw ? icon('heart') : icon('sparkle')}</div>
    <h2>${esc(title)}</h2>${sub ? `<p>${s.kind === 'coins' ? coinSVG(20) : ''}${esc(sub)}</p>` : ''}
    <div class="row"><button class="btn plain grow" data-gclose>Закрыть</button><button class="btn grow" data-again>Ещё раз</button></div></div>`;
}

function againPreset(g, kind) {
  const s = g.stake;
  return { stake: s.kind, amount: s.amount || 10, text: s.text || '', first_to: g.first_to || 1,
    mode: g.settings?.mode, deck: g.settings?.deck, cheats: g.settings?.cheats };
}

// ================= Камень, ножницы, бумага =================
function rpsScreen() {
  let g = data.rps, shownRounds = g ? g.rounds.length : 0, anim = false, t = null, closeFn = null;
  if (!g) return;
  screen = 'rps';
  closeFn = fullscreen({
    html: `<div class="gscreen rps-screen">
      <div class="g-top"><button class="icon-btn" data-x aria-label="Назад">${icon('back')}</button><div class="grow"><b>Камень, ножницы, бумага</b><span id="r-sub"></span></div><span id="r-stake"></span><button class="icon-btn" data-menu aria-label="Ещё">${icon('list')}</button></div>
      <div class="rps-board">
        <div class="rps-side opp"><span class="rps-name" id="r-oname"></span><div class="rps-hand" id="r-ohand"></div><span class="rps-state" id="r-ostate"></span></div>
        <div class="rps-mid"><div class="rps-score" id="r-score"></div><div class="rps-msg" id="r-msg"></div></div>
        <div class="rps-side me"><div class="rps-hand" id="r-mhand"></div><span class="rps-name">Я</span></div>
      </div>
      <div class="rps-pick" id="r-pick">${Object.keys(RPS).map((k) => `<button data-p="${k}">${handSVG(k, 64)}<span>${RPS[k]}</span></button>`).join('')}</div>
      <div id="r-res"></div></div>`,
    onMount(el, close) {
      $('[data-x]', el).onclick = close;
      $('[data-menu]', el).onclick = () => gameMenu('rps', g);
      $$('[data-p]', el).forEach((b) => {
        b.onclick = async () => {
          if (anim || !g || g.status !== 'playing' || g.my_pick) return;
          haptic.tap();
          g.my_pick = b.dataset.p;
          paint(el);
          try { const d = await api('/rps/pick', { method: 'POST', body: { choice: b.dataset.p } }); update(el, d); } catch (e) { toast(e.message, 'err'); g.my_pick = null; paint(el); }
        };
      });
      paint(el);
      t = setInterval(async () => { if (!document.hidden) { try { update(el, await api('/games/live')); } catch (e) { /* */ } } }, 1200);
    },
    onClose() { clearInterval(t); screen = null; load(); },
  });

  function update(el, d) {
    data.balance = d.balance;
    const ng = d.rps;
    if (!ng || ng.id !== g.id) { g = ng || g; paint(el); return; }
    const newRound = ng.rounds.length > shownRounds;
    g = ng;
    data.rps = ng;
    if (newRound && !anim) reveal(el); else if (!anim) paint(el);
  }

  function reveal(el) {
    const r = g.rounds[g.rounds.length - 1];
    shownRounds = g.rounds.length;
    anim = true;
    $('#r-res', el).innerHTML = '';
    $('#r-pick', el).classList.add('off');
    $('#r-ohand', el).innerHTML = handSVG('rock', 104, 'shake flip');
    $('#r-mhand', el).innerHTML = handSVG('rock', 104, 'shake');
    $('#r-msg', el).innerHTML = '<span class="count">Камень… ножницы… бумага!</span>';
    $('#r-ostate', el).textContent = '';
    haptic.tap();
    setTimeout(() => {
      $('#r-ohand', el).innerHTML = handSVG(r.opp, 104, 'pop flip');
      $('#r-mhand', el).innerHTML = handSVG(r.me, 104, 'pop');
      const me = S.me.id;
      const txt = !r.winner ? 'Ничья — ещё раз!' : r.winner === me ? 'Раунд твой!' : `Раунд у ${gen(nameOf(r.winner))}`;
      $('#r-msg', el).innerHTML = `<b class="${!r.winner ? 'draw' : r.winner === me ? 'win' : 'lose'}">${txt}</b><small>${RPS[r.me]} против ${RPS_GEN[r.opp]}</small>`;
      $('#r-score', el).innerHTML = scoreHTML();
      if (r.winner === me) haptic.ok(); else haptic.err?.();
      setTimeout(() => { anim = false; paint(el, true); }, g.status === 'done' ? 900 : 1700);
    }, 1050);
  }

  function scoreHTML() {
    return `<b>${g.score.me}</b><i>:</i><b>${g.score.opp}</b>`;
  }

  function paint(el, afterReveal) {
    if (!g) return;
    const me = S.me.id;
    $('#r-sub', el).textContent = g.first_to > 1 ? `до ${g.first_to} ${plural(g.first_to, 'победы', 'побед', 'побед')}` : 'один раунд';
    $('#r-stake', el).innerHTML = stakeChip(g.stake);
    $('#r-oname', el).textContent = partnerName();
    $('#r-score', el).innerHTML = scoreHTML();
    if (g.status === 'done') {
      const last = g.rounds[g.rounds.length - 1];
      if (last) {
        $('#r-ohand', el).innerHTML = handSVG(last.opp, 104, 'flip');
        $('#r-mhand', el).innerHTML = handSVG(last.me, 104);
      }
      $('#r-pick', el).classList.add('hide');
      $('#r-ostate', el).textContent = '';
      $('#r-msg', el).innerHTML = '';
      $('#r-res', el).innerHTML = `<div class="g-res-wrap">${resultBlock(g, 'rps')}</div>`;
      $('[data-gclose]', el).onclick = async () => { try { await api('/play/rps/close', { method: 'POST', body: {} }); } catch (e) { /* */ } closeFn(); };
      $('[data-again]', el).onclick = async () => {
        try { await api('/play/rps/close', { method: 'POST', body: {} }); } catch (e) { /* */ }
        const p = againPreset(g, 'rps'); closeFn(); setTimeout(() => setupSheet('rps', p), 300);
      };
      if (g.result && g.result.winner === me && !el.dataset.conf) { el.dataset.conf = 1; confetti(80, true); }
      return;
    }
    $('#r-res', el).innerHTML = '';
    $('#r-pick', el).classList.toggle('off', !!g.my_pick || g.status !== 'playing');
    $$('#r-pick [data-p]', el).forEach((b) => b.classList.toggle('on', b.dataset.p === g.my_pick));
    $('#r-mhand', el).innerHTML = g.my_pick ? handSVG(g.my_pick, 104, 'pop') : handWaitSVG(104);
    $('#r-ohand', el).innerHTML = g.opp_picked ? `<div class="ready">${handSVG('rock', 104, 'flip hidden-hand')}<span>${icon('check')}</span></div>` : handWaitSVG(104);
    $('#r-ostate', el).textContent = g.status === 'invite' ? 'ещё не принял' + (fem(S.partner?.id) ? 'а' : '') + ' вызов' : g.opp_picked ? 'выбор сделан' : 'выбирает…';
    if (!afterReveal) {
      $('#r-msg', el).innerHTML = g.status === 'invite' ? '<span class="muted">Ждём ответа на вызов</span>'
        : g.my_pick ? `<span class="muted">${g.opp_picked ? 'Открываем…' : `Ждём ${acc(partnerName())}`}</span>` : '<span class="muted">Выбери жест — второй его не увидит, пока не выберет сам</span>';
    } else if (!g.my_pick) {
      $('#r-msg', el).insertAdjacentHTML('beforeend', '<span class="muted tiny" style="display:block;margin-top:4px">Выбирай следующий жест</span>');
    }
  }
}

function gameMenu(kind, g) {
  sheet({
    title: GAME_NAMES[kind],
    html: `${kind === 'durak' ? `<div class="rules muted tiny">${durakRules(g)}</div>` : '<div class="rules muted tiny">Камень бьёт ножницы, ножницы режут бумагу, бумага накрывает камень. Выбор второго не виден, пока не выберете оба. При ничьей раунд переигрывается.</div>'}
      <button class="btn danger block" id="gm-sur" style="margin-top:14px">Сдаться</button>`,
    onMount(sh, close) {
      $('#gm-sur', sh).onclick = async () => {
        close();
        if (!(await confirmSheet('Точно сдаться? Победа уйдёт сопернику', { ok: 'Сдаться', danger: true }))) return;
        try { const d = await api(`/play/${kind}/surrender`, { method: 'POST', body: {} }); Object.assign(data, d); haptic.ok(); } catch (e) { toast(e.message, 'err'); }
      };
    },
  });
}

function durakRules(g) {
  const s = g.settings;
  return `<b>${esc(durakTitle(s))}</b><br>
    Отбиваться можно старшей картой той же масти или козырем. Подкидывать — карты того же достоинства, что уже на столе, но не больше, чем карт у отбивающегося (и не больше 6).
    ${s.mode === 'perevodnoy' ? '<br>Переводной: пока ни одна карта не побита, можно положить карту того же достоинства и перевести ход на соперника.' : ''}
    ${s.cheats ? '<br>С шулерами: можно класть неправильные карты. Заметил — жми «Поймать шулера», пока карты на столе. Поймал — шулер забирает стол, обвинил зря — забираешь сам.' : ''}
    <br>Кто остался с картами, когда колода кончилась, — дурак.`;
}

// ================= Дурак =================
const RANKS36 = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
function durakScreen() {
  let g = data.durak, sel = null, t = null, closeFn = null, lastV = -1, lastTable = 0, lastLog = '';
  if (!g) return;
  screen = 'durak';
  const ranks = () => (g.game.deck_size === 24 ? RANKS36.slice(3) : RANKS36);
  const val = (c) => ranks().indexOf(rankOf(c));
  const beats = (a, d) => (suitOf(d) === suitOf(a) ? val(d) > val(a) : suitOf(d) === g.game.trump && suitOf(a) !== g.game.trump);
  const tableRanks = () => new Set(g.game.table.flatMap((p) => [p.a, p.d].filter(Boolean).map(rankOf)));
  closeFn = fullscreen({
    html: `<div class="gscreen durak-screen">
      <div class="g-top"><button class="icon-btn" data-x aria-label="Назад">${icon('back')}</button><div class="grow"><b>Дурак</b><span id="d-sub"></span></div><span id="d-stake"></span><button class="icon-btn" data-menu aria-label="Правила">${icon('list')}</button></div>
      <div class="d-opp" id="d-opp"></div>
      <div class="d-mid"><div class="d-deck" id="d-deck"></div><div class="d-table" id="d-table"></div><div class="d-disc" id="d-disc"></div></div>
      <div class="d-status" id="d-status"></div>
      <div class="d-log" id="d-log"></div>
      <div class="d-actions" id="d-actions"></div>
      <div class="d-hand" id="d-hand"></div>
      <div id="d-res"></div></div>`,
    onMount(el, close) {
      $('[data-x]', el).onclick = close;
      $('[data-menu]', el).onclick = () => gameMenu('durak', g);
      paint(el);
      t = setInterval(async () => { if (!document.hidden) { try { const d = await api('/games/live'); data.balance = d.balance; if (d.durak && d.durak.id === g.id) { g = d.durak; data.durak = g; paint(el); } } catch (e) { /* */ } } }, 1300);
      window.addEventListener('resize', onResize);
      function onResize() { if (document.body.contains(el)) layoutHand(el); else window.removeEventListener('resize', onResize); }
    },
    onClose() { clearInterval(t); screen = null; load(); },
  });

  function legal(c) {
    const s = g.game;
    if (s.status !== 'playing') return false;
    if (s.role === 'attacker') return s.can.attack && (!s.table.length || tableRanks().has(rankOf(c)));
    if (!s.can.defend && !s.can.transfer) return false;
    if (s.can.transfer_rank && rankOf(c) === s.can.transfer_rank) return true;
    return s.table.some((p) => !p.d && beats(p.a, c));
  }

  async function send(el, body) {
    try {
      const d = await api('/durak/move', { method: 'POST', body });
      data.balance = d.balance;
      if (d.durak) { g = d.durak; data.durak = g; }
      sel = null;
      haptic.tap();
      if (d.caught) toast(d.caught.caught ? 'Поймал' + (fem(S.me.id) ? 'а' : '') + ' шулера! Соперник забирает стол' : 'Мимо — честная игра. Стол забираешь ты', d.caught.caught ? '' : 'err');
      paint(el);
    } catch (e) { toast(e.message, 'err'); }
  }

  function onCard(el, c) {
    const s = g.game;
    if (s.status !== 'playing') return;
    const ok = legal(c);
    if (s.role === 'attacker') {
      if (!s.can.attack) { toast(s.table.length >= s.limit ? 'Больше подкидывать нельзя — лимит на этот заход' : 'Сейчас ход соперника'); return; }
      if (!ok && !s.cheats) { toast('Подкинуть можно только карты того же достоинства, что на столе'); return; }
      if (!ok) toast('Шулерский ход — если поймают, заберёшь стол');
      send(el, { action: 'attack', card: c });
      return;
    }
    if (!(s.can.defend || s.can.transfer)) { toast(s.taking ? 'Ты уже берёшь' : 'Сейчас ход соперника'); return; }
    if (!ok && !s.cheats) { toast('Этой картой не отбиться'); haptic.err?.(); return; }
    sel = sel === c ? null : c;
    haptic.sel();
    // одна непобитая карта и нельзя переводить этой картой — кроем сразу
    const open = s.table.map((p, i) => [p, i]).filter(([p]) => !p.d);
    const canTr = s.can.transfer && (s.can.transfer_rank === rankOf(c) || s.cheats);
    if (sel && open.length === 1 && !canTr) {
      if (!beats(open[0][0].a, c)) toast('Шулерский ход — если поймают, заберёшь стол');
      send(el, { action: 'defend', idx: open[0][1], card: c });
      return;
    }
    paint(el);
  }

  function statusText() {
    const s = g.game, me = S.me.id;
    if (s.status !== 'playing') return '';
    const open = s.table.some((p) => !p.d);
    const pn = partnerName();
    if (s.role === 'attacker') {
      if (s.taking) return `${pn} берёт — подкинь ещё или отдай карты`;
      if (!s.table.length) return 'Твой ход — выбери карту';
      if (open) return `${pn} отбивается…`;
      return 'Всё побито — подкинь ещё или «Бито»';
    }
    if (s.taking) return 'Ты берёшь — ждём, подкинет ли соперник';
    if (open) {
      if (sel) return s.table.filter((p) => !p.d).length > 1 ? 'Нажми на карту на столе, которую кроешь' + (s.can.transfer ? ', или переведи' : '') : 'Можно перевести';
      return s.can.transfer ? 'Отбивайся, переводи или бери' : 'Отбивайся или бери';
    }
    return s.table.length ? `${pn} думает, подкинуть ли ещё…` : `Ходит ${pn}…`;
  }

  function logHTML() {
    const L = g.game.log;
    if (!L || !L.length) return '';
    const l = L[L.length - 1];
    const who = l.who ? (l.who === S.me.id ? 'Ты' : nameOf(l.who)) : '';
    const YOU = { 'ходит': 'ходишь', 'подкидывает': 'подкидываешь', 'кроет': 'кроешь', 'переводит': 'переводишь', 'берёт': 'берёшь', 'ловит': 'ловишь' };
    const text = l.who === S.me.id ? l.text.replace(/^(\S+)/, (w) => YOU[w] || w) : l.text;
    const txt = esc(text).replace(/\b(10|[6-9JQKA])([SCDH])\b/g, (m, r, s) => `<span class="cc ${s === 'H' || s === 'D' ? 'red' : ''}">${rankLabel(r)}${suitSVG(s, 12)}</span>`);
    return `${who ? `<b>${esc(who)}</b> ` : ''}${txt}`;
  }

  function layoutHand(el) {
    const box = $('#d-hand', el);
    const cards = $$('.hc', box);
    const n = cards.length;
    if (!n) return;
    const W = box.clientWidth - 8;
    const cw = Math.min(74, Math.max(54, W / 5.2));
    const step = n > 1 ? Math.min(cw + 6, (W - cw) / (n - 1)) : 0;
    const total = cw + step * (n - 1);
    const x0 = (W - total) / 2 + 4;
    cards.forEach((c, i) => { c.style.width = cw + 'px'; c.style.left = (x0 + i * step) + 'px'; c.style.zIndex = i + 1; });
    box.style.height = (cw * 1.4 + 22) + 'px';
  }

  function paint(el) {
    const s = g.game;
    $('#d-sub', el).textContent = durakTitle(g.settings);
    $('#d-stake', el).innerHTML = stakeChip(g.stake);
    if (!s) {
      $('#d-status', el).textContent = 'Ждём, когда примут вызов';
      return;
    }
    const me = S.me.id;
    // соперник
    const oc = s.opp_count;
    const shown = Math.min(oc, 12);
    $('#d-opp', el).innerHTML = `<div class="d-opp-name"><b>${esc(partnerName())}</b><span>${oc} ${plural(oc, 'карта', 'карты', 'карт')}${s.status === 'playing' ? ` · ${s.role === 'attacker' ? 'отбивается' : 'ходит'}` : ''}</span></div>
      <div class="d-opp-fan" style="--n:${shown}">${Array.from({ length: shown }, (_, i) => `<span style="--i:${i - (shown - 1) / 2}">${cardBackSVG()}</span>`).join('')}</div>`;
    // колода и козырь
    $('#d-deck', el).innerHTML = s.deck_left
      ? `<div class="deck-stack">${s.trump_card ? `<span class="trump-card">${cardSVG(s.trump_card)}</span>` : ''}${s.deck_left > 1 ? `<span class="deck-back">${cardBackSVG()}</span>` : ''}<b>${s.deck_left}</b></div>`
      : `<div class="deck-empty"><span>Козырь</span>${suitSVG(s.trump, 30)}<small>колода пуста</small></div>`;
    $('#d-disc', el).innerHTML = s.discard ? `<div class="disc-stack">${cardBackSVG('d1')}${cardBackSVG('d2')}<b>${s.discard}</b><small>бито</small></div>` : '';
    // стол
    const open = s.table.map((p, i) => [p, i]).filter(([p]) => !p.d);
    const pickTarget = sel && s.role === 'defender' && open.length > 1;
    $('#d-table', el).innerHTML = s.table.length ? s.table.map((p, i) => `<div class="pair ${i >= lastTable ? 'enter' : ''} ${pickTarget && !p.d ? 'target' + (beats(p.a, sel) ? ' fits' : '') : ''}" data-pair="${i}">
        ${cardSVG(p.a)}${p.d ? `<span class="cover">${cardSVG(p.d)}</span>` : ''}</div>`).join('')
      : `<div class="table-empty">${s.status === 'playing' ? (s.role === 'attacker' ? 'Твой ход' : `Ход ${gen(partnerName())}`) : ''}</div>`;
    lastTable = s.table.length;
    $$('[data-pair]', el).forEach((pe) => {
      pe.onclick = () => {
        const i = +pe.dataset.pair;
        if (!sel || s.role !== 'defender' || s.table[i].d) return;
        if (!beats(s.table[i].a, sel)) { if (!s.cheats) { toast('Этой картой её не покрыть'); return; } toast('Шулерский ход — если поймают, заберёшь стол'); }
        send(el, { action: 'defend', idx: i, card: sel });
      };
    });
    // статус и лог
    $('#d-status', el).innerHTML = `<span class="${(s.role === 'attacker' && (s.can.attack || s.can.bito || s.can.done)) || (s.role === 'defender' && (s.can.defend || s.can.take)) ? 'my' : ''}">${esc(statusText())}</span>`;
    const lh = logHTML();
    if (lh !== lastLog) { $('#d-log', el).innerHTML = lh; $('#d-log', el).classList.remove('flash'); void $('#d-log', el).offsetWidth; $('#d-log', el).classList.add('flash'); lastLog = lh; }
    // кнопки
    const c = s.can;
    const btns = [];
    if (c.bito) btns.push(`<button class="btn sm" data-a="bito">Бито</button>`);
    if (c.done) btns.push(`<button class="btn sm" data-a="done">Пусть забирает</button>`);
    if (c.take) btns.push(`<button class="btn plain sm" data-a="take">Беру</button>`);
    if (c.transfer && sel && (c.transfer_rank === rankOf(sel) || s.cheats)) btns.push(`<button class="btn sm" data-a="transfer">Перевести</button>`);
    if (sel && open.length === 1 && s.role === 'defender') btns.push(`<button class="btn sm" data-a="cover">Покрыть</button>`);
    if (c.catch) btns.push(`<button class="btn sm catch" data-a="catch">${icon('shield')} Поймать шулера</button>`);
    $('#d-actions', el).innerHTML = btns.join('');
    $$('[data-a]', el).forEach((b) => {
      b.onclick = async () => {
        const a = b.dataset.a;
        if (a === 'transfer') send(el, { action: 'transfer', card: sel });
        else if (a === 'cover') send(el, { action: 'defend', idx: open[0][1], card: sel });
        else if (a === 'catch') { if (await confirmSheet('Обвинить в шулерстве? Если зря — стол забираешь ты', { ok: 'Поймать!' })) send(el, { action: 'catch' }); } else send(el, { action: a });
      };
    });
    // рука
    $('#d-hand', el).innerHTML = s.hand.map((c2) => `<button class="hc ${sel === c2 ? 'sel' : ''} ${legal(c2) ? 'ok' : 'dim'} ${suitOf(c2) === s.trump ? 'trump' : ''}" data-c="${c2}">${cardSVG(c2)}</button>`).join('');
    $$('.hc', el).forEach((b) => { b.onclick = () => onCard(el, b.dataset.c); });
    layoutHand(el);
    // конец
    if (g.status === 'done' || s.status === 'finished') {
      $('#d-res', el).innerHTML = `<div class="g-res-wrap">${resultBlock(g, 'durak')}</div>`;
      $('[data-gclose]', el).onclick = async () => { try { await api('/play/durak/close', { method: 'POST', body: {} }); } catch (e) { /* */ } closeFn(); };
      $('[data-again]', el).onclick = async () => {
        try { await api('/play/durak/close', { method: 'POST', body: {} }); } catch (e) { /* */ }
        const p = againPreset(g, 'durak'); closeFn(); setTimeout(() => setupSheet('durak', p), 300);
      };
      if (g.result && g.result.winner === me && !el.dataset.conf) { el.dataset.conf = 1; confetti(90, true); haptic.ok(); }
      $('#d-actions', el).innerHTML = '';
    } else {
      $('#d-res', el).innerHTML = '';
    }
    if (s.v !== lastV && lastV !== -1 && ((s.role === 'attacker' && c.attack && !s.table.length) || (s.role === 'defender' && c.defend))) haptic.tap();
    lastV = s.v;
  }
}

