import { S, isAdmin } from '../state.js';
import { api } from '../api.js';
import { $, $$, esc, sheet, fullscreen, toast, confetti, fmtDate, days, avatarHTML, emptyHTML, confirmSheet } from '../ui.js';
import { icon } from '../art/icons.js';
import { haptic, openLink } from '../tg.js';

let root = null;
let N = null;
let tab = 'wishes';
let whoWish = 'partner';
let whoFact = 'partner';

const TABS = [
  ['wishes', 'Хотелки', 'gift'],
  ['facts', 'Анкеты', 'star'],
  ['letters', 'Письма', 'letter'],
  ['plans', 'Планы', 'list'],
];
const SIZES = { s: 'Мелочь', m: 'Приятность', l: 'Мечта' };
const CATS = { date: ['Свидание', 'heart', 'c2'], trip: ['Поездка', 'sparkle', 'c3'], food: ['Вкусное', 'bowl', 'c1'], home: ['Дома', 'moon', 'c4'], dream: ['Мечта', 'star', 'c5'] };
const COLORS = { rose: '#FFB3C7', sky: '#A9D3FF', lilac: '#CDB8FF', mint: '#A8E6CC', sun: '#FFD98A' };
const DESC = {
  wishes: 'Пишите, что хочется — прямо или намёком. Можно тайно «забронировать» хотелку второго: он(а) не узнает, что ты уже готовишь сюрприз.',
  facts: 'Всё важное друг о друге: размеры, любимые цветы, что поднимает настроение. Чтобы всегда попадать в точку.',
  letters: 'Письма с замочком: откроются в нужный день или в нужный момент — «когда грустно», «когда скучаешь»…',
  plans: 'Всё, что сделаем вместе после дембеля. Отмечайте галочками, когда сбудется.',
};

export function render(r) {
  root = r;
  root.innerHTML = `<div class="head"><div><h1>Важное</h1><p>Маленькие большие вещи друг о друге</p></div></div>
    <div class="seg" id="ntabs">${TABS.map(([k, t, ic]) => `<button data-t="${k}">${icon(ic)}${t}</button>`).join('')}</div>
    <div id="ncontent"><div class="empty">Загружаем…</div></div>
    <button class="fab hidden" id="fab" aria-label="Добавить">${icon('plus')}</button>`;
  $$('#ntabs button', root).forEach((b) => { b.onclick = () => { tab = b.dataset.t; haptic.sel(); draw(); }; });
  $('#fab', root).onclick = () => (tab === 'wishes' ? wishSheet() : tab === 'letters' ? letterWrite() : null);
  load();
}

export function destroy() { root = null; }

async function load() {
  try {
    const d = await api('/notes');
    N = d.notes;
    draw();
  } catch (e) { $('#ncontent', root).innerHTML = emptyHTML(esc(e.message)); }
}

function set(d) { N = d.notes; if (root) draw(); }

function draw() {
  if (!root || !N) return;
  $$('#ntabs button', root).forEach((b) => b.classList.toggle('on', b.dataset.t === tab));
  $('#fab', root).classList.toggle('hidden', !(tab === 'wishes' || tab === 'letters'));
  const c = $('#ncontent', root);
  c.innerHTML = `<p class="muted tiny" style="margin:-4px 4px 14px;font-weight:600">${DESC[tab]}</p>` + ({ wishes, facts, letters, plans }[tab])();
  ({ wishes: bindWishes, facts: bindFacts, letters: bindLetters, plans: bindPlans }[tab])(c);
}

function whoToggle(cur, id) {
  const pa = S.partner, me = S.me;
  return `<div class="who-toggle" id="${id}">
    ${pa ? `<button data-w="partner" class="${cur === 'partner' ? 'on' : ''}">${avatarHTML(pa, S.avatars[pa.id], 'sm')}${esc(pa.name)}</button>` : ''}
    <button data-w="me" class="${cur === 'me' ? 'on' : ''}">${avatarHTML(me, S.avatars[me.id], 'sm')}Я</button></div>`;
}

// ================= ХОТЕЛКИ =================
function wishes() {
  const uid = whoWish === 'me' || !S.partner ? S.me.id : S.partner.id;
  const list = N.wishes.filter((w) => w.author === uid).sort((a, b) => a.done - b.done);
  const mine = uid === S.me.id;
  return whoToggle(S.partner ? whoWish : 'me', 'wwho') + (list.length ? list.map((w) => `
    <div class="wish ${w.done ? 'done' : ''}" data-w="${w.id}">
      ${!mine && w.reserved_by ? `<div class="reserved">${w.reserved_by === S.me.id ? 'ты готовишь сюрприз' : 'забронировано'}</div>` : ''}
      <div class="w-title">${esc(w.title)}</div>
      ${w.note ? `<div class="w-note">${esc(w.note)}</div>` : ''}
      <div class="w-tags">
        ${w.hint ? `<span class="chip">${icon('sparkle')}намёк</span>` : ''}
        <span class="chip gray"><span class="size-dots">${['s', 'm', 'l'].map((s, i) => `<i class="${i <= ['s', 'm', 'l'].indexOf(w.size) ? 'on' : ''}"></i>`).join('')}</span>${SIZES[w.size] || ''}</span>
        ${w.link ? `<button class="chip gray" data-link="${esc(w.link)}">${icon('link')}ссылка</button>` : ''}
        ${w.done ? `<span class="chip" style="background:var(--good);color:#fff">${icon('check')}сбылось</span>` : ''}
      </div>
      <div class="w-actions">
        ${mine
          ? `<button class="btn ${w.done ? 'plain' : 'ghost'} sm grow" data-act="done">${icon('check')}${w.done ? 'Вернуть' : 'Сбылось!'}</button>
             <button class="btn plain sm" data-act="delete" aria-label="Удалить">${icon('trash')}</button>`
          : `${!w.done ? `<button class="btn ${w.reserved_by === S.me.id ? 'plain' : ''} sm grow" data-act="reserve">${icon('gift')}${w.reserved_by === S.me.id ? 'Отменить' : w.reserved_by ? 'Уже готовят' : 'Подарю я'}</button>` : ''}
             <button class="btn ghost sm ${w.done ? 'grow' : ''}" data-act="done">${icon('check')}${w.done ? 'Вернуть' : 'Подарено'}</button>
             ${isAdmin() ? `<button class="btn plain sm" data-act="delete" aria-label="Удалить">${icon('trash')}</button>` : ''}`}
      </div>
    </div>`).join('') : emptyHTML(mine ? 'Здесь будут твои хотелки. Нажми «+», чтобы добавить первую — или оставь намёк.' : `${esc(S.partner?.name || '')} пока ничего не загадал(а)`, 'gift'));
}

function bindWishes(c) {
  $$('#wwho button', c).forEach((b) => { b.onclick = () => { whoWish = b.dataset.w; haptic.sel(); draw(); }; });
  $$('[data-link]', c).forEach((b) => { b.onclick = () => { let u = b.dataset.link; if (!/^https?:/.test(u)) u = 'https://' + u; openLink(u); }; });
  $$('[data-w] [data-act]', c).forEach((b) => {
    b.onclick = async () => {
      const id = b.closest('[data-w]').dataset.w, a = b.dataset.act;
      if (a === 'delete' && !(await confirmSheet('Удалить хотелку?', { ok: 'Удалить', danger: true }))) return;
      try {
        const d = await api(`/notes/wishes/${id}`, { method: 'PATCH', body: { action: a } });
        set(d);
        const w = N.wishes.find((x) => x.id === id);
        if (a === 'reserve' && w?.reserved_by === S.me.id) { haptic.ok(); toast('Тсс! Это секрет — второй(ая) не узнает'); }
        if (a === 'done' && w?.done) confetti(50);
      } catch (e) { toast(e.message, 'err'); }
    };
  });
}

function wishSheet() {
  let size = 'm', hint = false;
  sheet({
    title: 'Новая хотелка',
    html: `<div class="field"><label class="lbl">Чего хочется?</label><input id="w-t" maxlength="120" placeholder="Например: плед с рукавами"></div>
      <div class="field"><label class="lbl">Подробнее (цвет, размер, где видела)</label><textarea id="w-n" maxlength="500" placeholder="необязательно"></textarea></div>
      <div class="field"><label class="lbl">Ссылка</label><input id="w-l" maxlength="400" placeholder="необязательно" inputmode="url"></div>
      <div class="field"><label class="lbl">Насколько большая</label><div class="choice" id="w-s">${Object.entries(SIZES).map(([k, v]) => `<button data-s="${k}" class="${k === size ? 'on' : ''}">${v}</button>`).join('')}</div></div>
      <div class="toggle-row" style="border:0"><span class="ic c7">${icon('sparkle')}</span><div class="grow"><b>Это намёк</b><span>Пометим как лёгкий намёк, без давления</span></div><button class="sw" id="w-h"></button></div>
      <button class="btn block" id="w-save" style="margin-top:8px">${icon('check')} Добавить</button>`,
    onMount(sh, close) {
      $$('#w-s button', sh).forEach((b) => { b.onclick = () => { size = b.dataset.s; $$('#w-s button', sh).forEach((x) => x.classList.toggle('on', x === b)); }; });
      $('#w-h', sh).onclick = (e) => { hint = !hint; e.currentTarget.classList.toggle('on', hint); haptic.sel(); };
      $('#w-save', sh).onclick = async () => {
        const title = $('#w-t', sh).value.trim();
        if (!title) { toast('Напиши, чего хочется', 'err'); return; }
        try {
          set(await api('/notes/wishes', { method: 'POST', body: { title, note: $('#w-n', sh).value, link: $('#w-l', sh).value, size, hint } }));
          whoWish = 'me'; draw(); close(); haptic.ok(); toast(hint ? 'Намёк оставлен' : 'Хотелка добавлена');
        } catch (e) { toast(e.message, 'err'); }
      };
    },
  });
}

// ================= АНКЕТЫ =================
function facts() {
  const uid = whoFact === 'me' || !S.partner ? S.me.id : S.partner.id;
  const mine = uid === S.me.id;
  const data = N.facts[uid] || {};
  const fields = N.fact_fields.map(([k, t]) => [k, t]);
  const custom = Object.keys(data).filter((k) => !fields.some(([f]) => f === k)).map((k) => [k, k]);
  const all = [...fields, ...custom];
  const filled = all.filter(([k]) => data[k]).length;
  return whoToggle(S.partner ? whoFact : 'me', 'fwho')
    + `<div class="row" style="justify-content:space-between;margin:0 4px 10px"><span class="muted tiny" style="font-weight:800">Заполнено ${filled} из ${all.length}</span>${mine ? `<button class="chip" id="f-add">${icon('plus')}свой пункт</button>` : ''}</div>`
    + `<div class="facts">${all.map(([k, t]) => `<button class="fact ${data[k] ? '' : 'empty-f'}" data-k="${esc(k)}" data-t="${esc(t)}" ${mine ? '' : 'data-ro'}><span>${esc(t)}</span><b>${data[k] ? esc(data[k]) : mine ? 'заполнить' : 'пока не заполнено'}</b></button>`).join('')}</div>`;
}

function bindFacts(c) {
  $$('#fwho button', c).forEach((b) => { b.onclick = () => { whoFact = b.dataset.w; haptic.sel(); draw(); }; });
  $$('.fact', c).forEach((b) => {
    b.onclick = () => {
      if (b.hasAttribute('data-ro')) { if (!b.classList.contains('empty-f')) { haptic.tap(); } return; }
      factSheet(b.dataset.k, b.dataset.t);
    };
  });
  const add = $('#f-add', c);
  if (add) add.onclick = () => factSheet('', '');
}

function factSheet(key, title) {
  const cur = (N.facts[S.me.id] || {})[key] || '';
  sheet({
    title: key ? esc(title) : 'Свой пункт',
    html: `${key ? '' : '<div class="field"><label class="lbl">Название</label><input id="f-k" maxlength="40" placeholder="Например: любимая поза для сна"></div>'}
      <div class="field"><label class="lbl">Ответ</label><input id="f-v" maxlength="300" value="${esc(cur)}" placeholder="Напиши как есть"></div>
      <div class="row">${cur ? `<button class="btn plain" id="f-del">${icon('trash')}</button>` : ''}<button class="btn grow" id="f-save">${icon('check')} Сохранить</button></div>`,
    onMount(sh, close) {
      setTimeout(() => ($('#f-k', sh) || $('#f-v', sh)).focus(), 350);
      const save = async (val) => {
        const k = key || $('#f-k', sh).value.trim();
        if (!k) { toast('Напиши название пункта', 'err'); return; }
        try { set(await api('/notes/facts', { method: 'POST', body: { fields: { [k]: val } } })); close(); haptic.ok(); } catch (e) { toast(e.message, 'err'); }
      };
      $('#f-save', sh).onclick = () => save($('#f-v', sh).value.trim());
      const del = $('#f-del', sh);
      if (del) del.onclick = () => save('');
    },
  });
}

// ================= ПИСЬМА =================
function letterState(l) {
  if (l.to === S.me.id) {
    if (l.locked && l.mode === 'date') {
      const left = Math.ceil((new Date(l.date + 'T00:00:00+03:00') - Date.now()) / 864e5);
      return `откроется через ${left} ${days(left)}`;
    }
    if (l.locked && l.mode === 'mood') return N.moods[l.mood] || 'открой, когда захочется';
    return l.opened_at || l.mode !== 'mood' ? `от ${fmtDate(new Date(l.created * 1000), false)}` : '';
  }
  return l.mode === 'mood' ? (l.opened_at ? 'прочитано' : 'ещё не открыто') : l.mode === 'date' ? `откроется ${fmtDate(new Date(l.date + 'T00:00:00'))}` : `отправлено ${fmtDate(new Date(l.created * 1000), false)}`;
}

function letters() {
  const inbox = N.letters.filter((l) => l.to === S.me.id);
  const out = N.letters.filter((l) => l.author === S.me.id);
  const env = (l, outgoing) => `<button class="env ${l.color} ${outgoing ? 'out' : ''} ${!outgoing && !l.locked && !l.opened_at && l.mode !== 'mood' && Date.now() / 1000 - l.created < 3 * 86400 ? 'new' : ''}" data-l="${l.id}">
    <span class="seal">${icon(l.locked ? 'lock' : 'heart')}</span><b>${esc(l.title)}</b><span>${esc(letterState(l))}</span></button>`;
  return `<div class="card"><h2>${icon('letter')} Тебе<span class="spacer"></span><span class="chip gray">${inbox.length}</span></h2>
      ${inbox.length ? `<div class="letters">${inbox.map((l) => env(l, false)).join('')}</div>` : `<div class="empty">Пока писем нет. Но они обязательно будут</div>`}</div>
    <div class="card"><h2>${icon('send')} От тебя<span class="spacer"></span><span class="chip gray">${out.length}</span></h2>
      ${out.length ? `<div class="letters">${out.map((l) => env(l, true)).join('')}</div>` : `<div class="empty">Напиши письмо на будущее — нажми «+»</div>`}</div>`;
}

function bindLetters(c) {
  $$('[data-l]', c).forEach((b) => {
    b.onclick = async () => {
      const l = N.letters.find((x) => x.id === b.dataset.l);
      if (!l) return;
      haptic.tap();
      if (l.to === S.me.id && l.locked && l.mode === 'date') {
        b.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-4deg)' }, { transform: 'rotate(4deg)' }, { transform: 'rotate(0)' }], { duration: 400 });
        toast(`Это письмо откроется ${fmtDate(new Date(l.date + 'T00:00:00'))}. Терпение!`);
        return;
      }
      if (l.to === S.me.id && l.locked && l.mode === 'mood') {
        if (!(await confirmSheet(`«${N.moods[l.mood]}». Открыть письмо сейчас?`, { ok: 'Открыть' }))) return;
        try { set(await api(`/notes/letters/${l.id}`, { method: 'PATCH', body: { action: 'open' } })); } catch (e) { toast(e.message, 'err'); return; }
        return readLetter(N.letters.find((x) => x.id === l.id));
      }
      if (l.to === S.me.id && !l.opened_at) api(`/notes/letters/${l.id}`, { method: 'PATCH', body: { action: 'open' } }).then(set).catch(() => {});
      readLetter(l);
    };
  });
}

function readLetter(l) {
  const mine = l.author === S.me.id;
  fullscreen({
    html: `<div class="game-head"><button class="icon-btn" data-x>${icon('back')}</button><h2>${mine ? 'Твоё письмо' : 'Письмо'}</h2></div>
      <div class="paper" style="background-color:#FFFDF8;border-top:10px solid ${COLORS[l.color] || COLORS.rose}">
        <h4>${esc(l.title)}</h4><p>${esc(l.body)}</p>
        <div class="sign">${esc(mine ? S.me.name : S.partner?.name || '')}, ${fmtDate(new Date(l.created * 1000))}</div></div>
      ${mine ? `<p class="muted tiny" style="text-align:center;margin-top:14px">${esc(letterState(l))}</p><button class="btn plain block" data-del style="color:var(--bad)">${icon('trash')} Удалить письмо</button>` : ''}`,
    onMount(el, close) {
      $('[data-x]', el).onclick = close;
      if (!mine) setTimeout(() => confetti(30), 400);
      const del = $('[data-del]', el);
      if (del) del.onclick = async () => {
        if (!(await confirmSheet('Удалить письмо?', { ok: 'Удалить', danger: true }))) return;
        try { set(await api(`/notes/letters/${l.id}`, { method: 'PATCH', body: { action: 'delete' } })); close(); } catch (e) { toast(e.message, 'err'); }
      };
    },
  });
}

function letterWrite() {
  if (!S.partner) { toast('Второй человек ещё не подключён'); return; }
  let mode = 'now', mood = 'sad', color = 'rose';
  fullscreen({
    html: `<div class="game-head"><button class="icon-btn" data-x>${icon('close')}</button><h2>Письмо для ${esc(S.partner.name)}</h2></div>
      <div class="card">
        <div class="field"><label class="lbl">Заголовок</label><input id="l-t" maxlength="80" placeholder="Например: Открой меня в плохой день"></div>
        <div class="field"><label class="lbl">Письмо</label><textarea id="l-b" maxlength="5000" style="min-height:180px" placeholder="Пиши от сердца…"></textarea></div>
        <label class="lbl">Когда можно открыть</label>
        <div class="seg" id="l-m"><button data-m="now" class="on">Сразу</button><button data-m="date">В день…</button><button data-m="mood">Когда…</button></div>
        <div id="l-extra"></div>
        <label class="lbl" style="margin-top:6px">Цвет конверта</label>
        <div class="colors" id="l-c">${Object.entries(COLORS).map(([k, v]) => `<button data-c="${k}" class="${k === color ? 'on' : ''}" style="background:${v}"></button>`).join('')}</div>
      </div>
      <button class="btn block" id="l-send">${icon('send')} Запечатать и отправить</button>`,
    onMount(el, close) {
      $('[data-x]', el).onclick = close;
      const extra = () => {
        const x = $('#l-extra', el);
        if (mode === 'date') x.innerHTML = `<div class="field"><input type="date" id="l-d" value="${S.dmb.end}"></div><p class="muted tiny" style="margin:-6px 4px 12px">По умолчанию — день дембеля</p>`;
        else if (mode === 'mood') {
          x.innerHTML = `<div class="choice" id="l-mood" style="margin-bottom:14px">${Object.entries(N.moods).map(([k, v]) => `<button data-mo="${k}" class="${k === mood ? 'on' : ''}">${v}</button>`).join('')}</div>`;
          $$('#l-mood button', x).forEach((b) => { b.onclick = () => { mood = b.dataset.mo; $$('#l-mood button', x).forEach((y) => y.classList.toggle('on', y === b)); }; });
        } else x.innerHTML = '';
      };
      $$('#l-m button', el).forEach((b) => { b.onclick = () => { mode = b.dataset.m; $$('#l-m button', el).forEach((y) => y.classList.toggle('on', y === b)); extra(); haptic.sel(); }; });
      $$('#l-c button', el).forEach((b) => { b.onclick = () => { color = b.dataset.c; $$('#l-c button', el).forEach((y) => y.classList.toggle('on', y === b)); }; });
      $('#l-send', el).onclick = async () => {
        const body = $('#l-b', el).value.trim();
        if (!body) { toast('Письмо пустое', 'err'); return; }
        const payload = { title: $('#l-t', el).value.trim(), body, mode, mood, color };
        if (mode === 'date') payload.date = $('#l-d', el).value;
        try { set(await api('/notes/letters', { method: 'POST', body: payload })); close(); confetti(40); toast('Письмо запечатано и отправлено'); } catch (e) { toast(e.message, 'err'); }
      };
    },
  });
}

// ================= ПЛАНЫ =================
let planCat = 'date';
function plans() {
  const list = [...N.plans].sort((a, b) => a.done - b.done);
  const done = N.plans.filter((p) => p.done).length;
  return `<div class="card">
    <h2>${icon('heart')} Когда ты вернёшься<span class="spacer"></span><span class="chip">${done} / ${N.plans.length}</span></h2>
    <div class="bar" style="margin-bottom:14px"><i style="width:${N.plans.length ? (done / N.plans.length) * 100 : 0}%"></i></div>
    <div class="choice" id="p-cat" style="margin-bottom:8px">${Object.entries(CATS).map(([k, [t]]) => `<button data-c="${k}" class="${k === planCat ? 'on' : ''}">${t}</button>`).join('')}</div>
    <div class="plan-add"><input id="p-inp" maxlength="200" placeholder="Например: встретить рассвет на крыше"><button class="icon-btn accent" id="p-add" style="width:46px;height:46px;flex:none">${icon('plus')}</button></div>
    <div style="margin-top:10px">${list.map((p) => `<div class="plan ${p.done ? 'done' : ''}" data-p="${p.id}">
      <button class="ck" data-a="toggle">${p.done ? icon('check') : ''}</button>
      <span class="pc ${CATS[p.cat]?.[2] || 'c2'}">${icon(CATS[p.cat]?.[1] || 'heart')}</span>
      <div class="grow pt" data-a="menu">${esc(p.text)}<div class="tiny muted">${esc(p.author === S.me.id ? 'ты' : S.partner?.name || '')}${p.done && p.done_at ? ` · сбылось ${fmtDate(new Date(p.done_at * 1000), false)}` : ''}</div></div></div>`).join('') || '<div class="empty">Первый общий план ждёт вас</div>'}</div></div>`;
}

function bindPlans(c) {
  $$('#p-cat button', c).forEach((b) => { b.onclick = () => { planCat = b.dataset.c; $$('#p-cat button', c).forEach((y) => y.classList.toggle('on', y === b)); }; });
  const add = async () => {
    const inp = $('#p-inp', c);
    const text = inp.value.trim();
    if (!text) return;
    try { set(await api('/notes/plans', { method: 'POST', body: { text, cat: planCat } })); haptic.ok(); } catch (e) { toast(e.message, 'err'); }
  };
  $('#p-add', c).onclick = add;
  $('#p-inp', c).onkeydown = (e) => { if (e.key === 'Enter') add(); };
  $$('[data-p] [data-a]', c).forEach((b) => {
    b.onclick = async () => {
      const id = b.closest('[data-p]').dataset.p;
      const p = N.plans.find((x) => x.id === id);
      if (b.dataset.a === 'toggle') {
        try { set(await api(`/notes/plans/${id}`, { method: 'PATCH', body: { action: 'toggle' } })); if (!p.done) confetti(40); else haptic.tap(); } catch (e) { toast(e.message, 'err'); }
        return;
      }
      if (p.author !== S.me.id && !isAdmin()) return;
      if (await confirmSheet(`Удалить «${esc(p.text)}»?`, { ok: 'Удалить', danger: true })) {
        try { set(await api(`/notes/plans/${id}`, { method: 'PATCH', body: { action: 'delete' } })); } catch (e) { toast(e.message, 'err'); }
      }
    };
  });
}
