import { S, isAdmin } from '../state.js';
import { api } from '../api.js';
import { $, $$, esc, plural, days, fmtDate, MONTHS, MONTHS_N, sheet, toast, confetti, confirmSheet } from '../ui.js';
import { icon } from '../art/icons.js';
import { coupleHero, journey } from '../art/couple.js';
import { haptic } from '../tg.js';

const TZ = '+03:00'; // Минск
const LOVE = [
  'считать дни до встречи и улыбаться каждому вычеркнутому',
  'ждать, даже когда очень трудно',
  'писать «спокойной ночи» через сотни километров',
  'хранить его голос в голосовых',
  'знать, что он тоже смотрит на это небо',
  'быть рядом, даже когда далеко',
  'один огонёк на двоих',
  'вместе растить маленького пушистика',
  'перечитывать старые переписки',
  'обнимать телефон, когда он звонит',
  'верить в «скоро»',
  'гордиться им каждый день',
  'засыпать с мыслью о встрече',
  'вычёркивать дни в календаре сердечками',
  'когда расстояние — просто цифра',
  'ждать письма, как чуда',
  'улыбаться без причины, вспоминая его',
  'планировать первый день после дембеля',
  'держаться за руки даже через экран',
  'тёплые слова в холодный день',
  'когда каждое «привет» — праздник',
  'знать его наизусть',
  'одна песня на двоих',
  'быть дома друг в друге',
  'тихое «я рядом»',
  'ещё один день ближе',
  'не отпускать, даже когда далеко',
  'смелость ждать',
  'его форма и её улыбка',
  'когда «мы» важнее, чем «я»',
];
const UNITS = ['days', 'weeks', 'months', 'hours', 'minutes'];
let timer = null;
let unitIdx = 0;

function dmbDates() {
  return {
    start: new Date(`${S.dmb.start}T00:00:00${TZ}`),
    end: new Date(`${S.dmb.end}T00:00:00${TZ}`),
  };
}
const now = () => new Date(Date.now() + (S.serverOffset || 0));

// «сегодня» по Минску как дата без времени
function minskToday() {
  const d = new Date(now().getTime() + 3 * 3600e3);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function nextOcc(month, day) {
  const t = minskToday();
  for (const y of [t.getUTCFullYear(), t.getUTCFullYear() + 1]) {
    const d = new Date(Date.UTC(y, month - 1, Math.min(day, new Date(Date.UTC(y, month, 0)).getUTCDate())));
    if (d >= t) return { date: d, left: Math.round((d - t) / 864e5) };
  }
  return { date: t, left: 0 };
}

function monthsBetween(a, b) {
  let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  const tmp = new Date(a); tmp.setMonth(a.getMonth() + m);
  if (tmp > b) { m--; tmp.setMonth(a.getMonth() + m); }
  return { m, d: Math.floor((b - tmp) / 864e5) };
}

function bigValue(msLeft, end) {
  const n = now();
  const dd = Math.ceil(msLeft / 864e5);
  switch (UNITS[unitIdx]) {
    case 'weeks': { const w = Math.floor(dd / 7), r = dd % 7; return [w, `${plural(w, 'неделя', 'недели', 'недель')}${r ? ` и ${r} ${days(r)}` : ''}`]; }
    case 'months': { const { m, d } = monthsBetween(n, end); return [m, `${plural(m, 'месяц', 'месяца', 'месяцев')}${d ? ` и ${d} ${days(d)}` : ''}`]; }
    case 'hours': { const h = Math.floor(msLeft / 3600e3); return [h.toLocaleString('ru'), plural(h, 'час', 'часа', 'часов')]; }
    case 'minutes': { const m = Math.floor(msLeft / 60e3); return [m.toLocaleString('ru'), plural(m, 'минута', 'минуты', 'минут')]; }
    default: return [dd, `${days(dd)} до встречи`];
  }
}

const KIND_ICON = { birthday: 'gift', anniversary: 'heart', holiday: 'star', date: 'calendar', other: 'sparkle' };
const KIND_NAME = { birthday: 'День рождения', anniversary: 'Годовщина', holiday: 'Праздник', date: 'Наша дата', other: 'Другое' };
const WD = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];

function eventsHTML() {
  const list = S.events.map((e) => ({ ...e, ...nextOcc(e.month, e.day) })).sort((a, b) => a.left - b.left);
  if (!list.length) return '<div class="empty">Добавь первую важную дату</div>';
  return list.map((e) => {
    const years = e.year ? e.date.getUTCFullYear() - e.year : null;
    const when = e.left === 0 ? 'Сегодня!' : e.left === 1 ? 'Завтра' : `${e.left} ${days(e.left)}`;
    return `<div class="ev ${e.left === 0 ? 'today' : ''}" data-ev="${e.id}">
      <div class="ev-ic ${e.kind}">${icon(KIND_ICON[e.kind] || 'calendar')}</div>
      <div class="grow"><div class="ev-t">${esc(e.title)}</div>
      <div class="ev-d">${e.date.getUTCDate()} ${MONTHS[e.date.getUTCMonth()]}, ${WD[e.date.getUTCDay()]}${years ? ` · ${years} ${plural(years, 'год', 'года', 'лет')}` : ''}</div></div>
      <div class="ev-left">${e.left > 1 ? `<small>через</small>` : ''}${when}</div></div>`;
  }).join('');
}

function milestonesHTML(start, end) {
  const total = end - start;
  const n = now();
  const items = [
    { t: 'Начало службы', d: start },
    { t: '100 дней позади', d: new Date(start.getTime() + 100 * 864e5) },
    { t: 'Экватор — половина пути', d: new Date(start.getTime() + total / 2) },
    { t: 'Остался год', d: new Date(end.getTime() - 365 * 864e5) },
    { t: 'Остаётся 100 дней', d: new Date(end.getTime() - 100 * 864e5) },
    { t: 'Последний месяц', d: new Date(end.getTime() - 30 * 864e5) },
    { t: 'ДЕМБЕЛЬ', d: end },
  ].filter((x) => x.d >= start).sort((a, b) => a.d - b.d);
  let nextFound = false;
  return items.map((m) => {
    const done = m.d <= n;
    const next = !done && !nextFound;
    if (next) nextFound = true;
    const left = Math.ceil((m.d - n) / 864e5);
    return `<div class="ms ${done ? 'done' : ''} ${next ? 'next' : ''}"><div class="ms-dot">${done ? icon('check') : ''}</div>
      <div><b>${m.t}</b><span>${fmtDate(m.d)}${next ? ` · через ${left} ${days(left)}` : ''}</span></div></div>`;
  }).join('');
}

export function render(root) {
  const { start, end } = dmbDates();
  const dayOfYear = Math.floor((minskToday() - new Date(Date.UTC(minskToday().getUTCFullYear(), 0, 0))) / 864e5);
  const phrase = LOVE[dayOfYear % LOVE.length];
  const done = now() >= end;
  const todayEv = S.events.filter((e) => nextOcc(e.month, e.day).left === 0);

  root.innerHTML = `
    <div class="head"><div><h1>${done ? 'Он дома!' : 'До дембеля'}</h1>
      <p>Служба: ${fmtDate(start)} — ${fmtDate(end)}</p></div></div>
    ${todayEv.map((e) => `<div class="card today-banner"><h2>${icon(KIND_ICON[e.kind] || 'star')} Сегодня: ${esc(e.title)}</h2><div class="hand" style="font-size:24px">Поздравляем, обнимаем, любим!</div></div>`).join('')}
    <div class="card hero">
      ${coupleHero({ done })}
      ${done
        ? `<div class="big-num">ДМБ!</div><div class="big-unit">Ожидание закончилось. Начинается самое лучшее</div>`
        : `<div class="big-num" id="big"></div><div class="big-unit" id="big-unit"></div>
           <div class="clock"><div><b id="c-h">00</b><span>часов</span></div><div><b id="c-m">00</b><span>минут</span></div><div><b id="c-s">00</b><span>секунд</span></div></div>`}
      <div class="loveis">Любовь — это… <b>${phrase}</b></div>
    </div>
    <div class="card">
      <h2>${icon('heart')} Путь домой<span class="spacer"></span><span class="pct" id="pct"></span></h2>
      <div id="journey"></div>
      <div class="stats-grid" id="stats"></div>
    </div>
    <div class="card">
      <h2>${icon('calendar')} Важные даты<span class="spacer"></span><button class="icon-btn accent" id="add-ev" aria-label="Добавить дату">${icon('plus')}</button></h2>
      <div id="events">${eventsHTML()}</div>
    </div>
    <div class="card"><h2>${icon('star')} Этапы службы</h2>${milestonesHTML(start, end)}</div>
  `;

  const tick = () => {
    const n = now();
    const total = end - start;
    const passed = Math.min(total, Math.max(0, n - start));
    const left = Math.max(0, end - n);
    const p = passed / total;
    $('#pct', root).textContent = (p * 100).toFixed(4).replace('.', ',') + '%';
    if (!done) {
      const [v, u] = bigValue(left, end);
      $('#big', root).textContent = v;
      $('#big-unit', root).textContent = u;
      const h = Math.floor(left / 3600e3) % 24, m = Math.floor(left / 60e3) % 60, s = Math.floor(left / 1e3) % 60;
      $('#c-h', root).textContent = String(h).padStart(2, '0');
      $('#c-m', root).textContent = String(m).padStart(2, '0');
      $('#c-s', root).textContent = String(s).padStart(2, '0');
    }
    return p;
  };
  const p = tick();
  $('#journey', root).innerHTML = journey(p);
  const passedD = Math.max(0, Math.floor((now() - start) / 864e5));
  const leftD = Math.max(0, Math.ceil((end - now()) / 864e5));
  let saturdays = 0;
  for (let d = new Date(now()); d < end; d.setDate(d.getDate() + 1)) if (d.getDay() === 6) saturdays++;
  $('#stats', root).innerHTML = `
    <div class="stat"><b>${passedD}</b><span>${plural(passedD, 'день', 'дня', 'дней')} позади</span></div>
    <div class="stat"><b>${leftD}</b><span>осталось</span></div>
    <div class="stat"><b>${saturdays}</b><span>${plural(saturdays, 'суббота', 'субботы', 'суббот')} врозь</span></div>`;
  timer = setInterval(tick, 1000);

  const big = $('#big', root);
  if (big) big.onclick = () => { unitIdx = (unitIdx + 1) % UNITS.length; haptic.sel(); tick(); big.animate([{ transform: 'scale(.85)' }, { transform: 'scale(1)' }], { duration: 300, easing: 'cubic-bezier(.34,1.56,.64,1)' }); };

  if (todayEv.length) setTimeout(() => confetti(60), 600);
  bindEvents(root);
}

function bindEvents(root) {
  $('#add-ev', root).onclick = addEventSheet;
  $$('[data-ev]', root).forEach((el) => {
    el.onclick = () => {
      const e = S.events.find((x) => x.id === el.dataset.ev);
      if (!e) return;
      const canDel = isAdmin() || (!e.builtin && e.author === S.me.id);
      const occ = nextOcc(e.month, e.day);
      sheet({
        title: esc(e.title),
        html: `<div style="text-align:center" class="muted">${KIND_NAME[e.kind] || ''} · ${e.day} ${MONTHS[e.month - 1]}${e.year ? ` (с ${e.year} года)` : ''}</div>
          <div style="text-align:center;margin:14px 0 18px"><span class="chip">${icon('bell')} Бот напомнит за неделю, за день и в сам день</span></div>
          <div style="text-align:center;font-family:var(--display);font-size:40px;color:var(--accent)">${occ.left === 0 ? 'Сегодня!' : `${occ.left} ${days(occ.left)}`}</div>
          ${canDel ? `<button class="btn plain block" style="margin-top:18px;color:var(--bad)" data-del>${icon('trash')} Удалить дату</button>` : ''}`,
        onMount(sh, close) {
          const b = $('[data-del]', sh);
          if (b) b.onclick = async () => {
            close();
            if (!(await confirmSheet('Удалить эту дату?', { ok: 'Удалить', danger: true }))) return;
            try {
              const d = await api('/events/' + e.id, { method: 'DELETE' });
              S.events = d.events;
              $('#events').innerHTML = eventsHTML();
              bindEvents(document.querySelector('.view-timer'));
            } catch (err) { toast(err.message, 'err'); }
          };
        },
      });
    };
  });
}

function addEventSheet() {
  let kind = 'date';
  sheet({
    title: 'Новая важная дата',
    html: `
      <div class="field"><label class="lbl">Что за день?</label><input id="ev-title" maxlength="60" placeholder="Например: наше первое свидание"></div>
      <div class="field row"><div class="grow"><label class="lbl">День</label><select id="ev-day">${Array.from({ length: 31 }, (_, i) => `<option>${i + 1}</option>`).join('')}</select></div>
        <div class="grow" style="flex:1.6"><label class="lbl">Месяц</label><select id="ev-month">${MONTHS_N.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('')}</select></div></div>
      <div class="field"><label class="lbl">Год (если хочешь считать годовщины)</label><input id="ev-year" inputmode="numeric" maxlength="4" placeholder="необязательно"></div>
      <div class="field"><label class="lbl">Тип</label><div class="choice" id="ev-kind">
        ${Object.entries(KIND_NAME).map(([k, v]) => `<button data-k="${k}" class="${k === kind ? 'on' : ''}">${v}</button>`).join('')}</div></div>
      <button class="btn block" id="ev-save">${icon('check')} Сохранить</button>`,
    onMount(sh, close) {
      $$('#ev-kind button', sh).forEach((b) => { b.onclick = () => { kind = b.dataset.k; $$('#ev-kind button', sh).forEach((x) => x.classList.toggle('on', x === b)); haptic.sel(); }; });
      $('#ev-save', sh).onclick = async () => {
        const title = $('#ev-title', sh).value.trim();
        if (!title) { toast('Напиши название', 'err'); return; }
        try {
          const d = await api('/events', { method: 'POST', body: { title, day: +$('#ev-day', sh).value, month: +$('#ev-month', sh).value, year: $('#ev-year', sh).value.trim(), kind } });
          S.events = d.events;
          close();
          haptic.ok();
          toast('Дата добавлена. Бот напомнит!');
          const v = document.querySelector('.view-timer');
          if (v) { $('#events', v).innerHTML = eventsHTML(); bindEvents(v); }
        } catch (e) { toast(e.message, 'err'); }
      };
    },
  });
}

export function destroy() {
  clearInterval(timer);
}
