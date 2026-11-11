// «Мы сейчас»: несколько чувств за день у каждого. В 00:00 по Минску всё обнуляется.
import { S } from '../state.js';
import { api } from '../api.js';
import { $, $$, esc, sheet, toast, fmtTime, fmtDay } from '../ui.js';
import { icon } from '../art/icons.js';
import { portrait } from '../art/faces.js';
import { haptic } from '../tg.js';

const PALETTE = ['#F6C860', '#F28CA6', '#B39DEB', '#7FCFB0', '#F7B39A', '#8FB6F2', '#9AA3B5', '#E8676B'];
let pollT = null;

const whoOf = (uid) => (uid === S.me.id ? (S.me.role === 'admin' ? 'girl' : 'boy') : (S.me.role === 'admin' ? 'boy' : 'girl'));
const itemsOf = (uid) => {
  const v = (S.moods || {})[String(uid)];
  return Array.isArray(v) ? v : (v ? [v] : []);
};

function ago(ts) {
  if (!ts) return '';
  const s = Date.now() / 1000 - ts;
  if (s < 90) return 'только что';
  if (s < 3600) return `${Math.round(s / 60)} мин назад`;
  if (s < 86400) return `в ${fmtTime(ts)}`;
  return `${fmtDay(ts).toLowerCase()} в ${fmtTime(ts)}`;
}

function chips(items) {
  return `<div class="mood-chips">${items.map((m) => `<span class="mchip" style="--c:${m.color}"><i></i>${esc(m.label)} ${m.level}%</span>`).join('')}</div>`;
}

function personHTML(person) {
  if (!person) return '';
  const items = itemsOf(person.id);
  const mine = person.id === S.me.id;
  return `<button class="mood-person" data-mood="${person.id}">
    ${portrait(whoOf(person.id), items, 112)}
    <b>${esc(mine ? 'Я' : person.name)}</b>
    ${items.length ? chips(items)
      : `<span class="mood-time">${mine ? 'Нажми, чтобы отметить, что чувствуешь' : 'сегодня пока не отмечал(а)'}</span>`}
  </button>`;
}

export function moodsCardHTML() {
  return `<div class="card moods-card" id="moods-card">
    <h2>${icon('heart')} Мы сейчас<span class="spacer"></span><span class="chip gray" id="mood-edit">${icon('plus')}чувство</span></h2>
    <div class="moods-row">${personHTML(S.me)}${personHTML(S.partner)}</div>
    <p class="muted tiny" style="margin:10px 2px 0;text-align:center">Проценты делятся между чувствами поровну. В 00:00 всё начинается с чистого листа</p>
  </div>`;
}

export function bindMoods(root) {
  const card = $('#moods-card', root);
  if (!card) return;
  $$('[data-mood]', card).forEach((b) => {
    b.onclick = () => { haptic.tap(); +b.dataset.mood === S.me.id ? editSheet(root) : historySheet(+b.dataset.mood); };
  });
  $('#mood-edit', card).onclick = () => editSheet(root);
  clearInterval(pollT);
  pollT = setInterval(async () => {
    if (!document.body.contains(card)) { clearInterval(pollT); return; }
    try {
      const d = await api('/moods');
      if (JSON.stringify(d.moods) !== JSON.stringify(S.moods)) { S.moods = d.moods; refresh(root); }
    } catch (e) { /* */ }
  }, 30000);
}

function refresh(root) {
  const card = $('#moods-card', root);
  if (!card) return;
  $('.moods-row', card).innerHTML = personHTML(S.me) + personHTML(S.partner);
  bindMoods(root);
}

export function splitLevels(n) {
  if (!n) return [];
  const base = Math.floor(100 / n), extra = 100 - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
}

function editSheet(root) {
  const E = S.emotions || {};
  const MAX = 8;
  // выбранное: ключ эмоции или {label,color} для своего
  const sel = [];
  const customs = [];
  itemsOf(S.me.id).forEach((m) => {
    if (m.emotion === 'custom') { const c = { label: m.label, color: m.color }; customs.push(c); sel.push(c); } else if (E[m.emotion]) sel.push(m.emotion);
  });
  let color = PALETTE[0];
  const asItem = (x) => (typeof x === 'string' ? { emotion: x, label: E[x][0], color: E[x][1] } : { emotion: 'custom', label: x.label, color: x.color });
  const has = (x) => sel.includes(x);
  const toggle = (x) => {
    const i = sel.indexOf(x);
    if (i >= 0) sel.splice(i, 1);
    else if (sel.length >= MAX) { toast(`Можно выбрать до ${MAX} чувств`, 'err'); return; } else sel.push(x);
    haptic.sel();
  };
  sheet({
    title: 'Что я чувствую сегодня',
    html: `<div class="mood-live" id="live"></div>
      <div class="emo-grid all" id="grid"></div>
      <div class="custom-add">
        <div class="field"><input id="c-label" maxlength="24" placeholder="Своё чувство…"></div>
        <button class="btn sq" id="c-add" aria-label="Добавить своё">${icon('plus')}</button>
      </div>
      <div class="colors" id="c-col">${PALETTE.map((c) => `<button data-c="${c}" style="background:${c}" class="${c === color ? 'on' : ''}" aria-label="Цвет"></button>`).join('')}</div>
      <button class="btn block" id="m-save">${icon('check')} Сохранить</button>
      <p class="muted tiny" style="text-align:center;margin:10px 0 0">Отметь всё, что чувствуешь — проценты разделятся поровну сами. В 00:00 всё обнулится</p>`,
    onMount(sh, close) {
      const draw = () => {
        const items = sel.map(asItem);
        const lv = splitLevels(items.length);
        const shown = items.map((m, i) => ({ ...m, level: lv[i] }));
        $('#live', sh).innerHTML = `${portrait(S.me.role === 'admin' ? 'girl' : 'boy', shown, 104)}
          <div class="grow">${shown.length ? `<div class="bline">${shown.map((m) => `<i style="width:${m.level}%;background:${m.color}"></i>`).join('')}</div>
            <div class="mood-chips left">${shown.map((m) => `<span class="mchip" style="--c:${m.color}"><i></i>${esc(m.label)} ${m.level}%</span>`).join('')}</div>`
            : '<span class="muted">Выбери одно или несколько чувств</span>'}</div>`;
        const keys = Object.keys(E);
        $('#grid', sh).innerHTML = keys.map((k) => `<button data-e="${k}" class="${has(k) ? 'on' : ''}" style="--c:${E[k][1]}"><i></i>${esc(E[k][0])}</button>`).join('')
          + customs.map((c, i) => `<button data-cu="${i}" class="custom ${has(c) ? 'on' : ''}" style="--c:${c.color}"><i></i>${esc(c.label)}</button>`).join('');
        $$('[data-e]', sh).forEach((b) => { b.onclick = () => { toggle(b.dataset.e); draw(); }; });
        $$('[data-cu]', sh).forEach((b) => { b.onclick = () => { toggle(customs[+b.dataset.cu]); draw(); }; });
      };
      $$('#c-col button', sh).forEach((b) => { b.onclick = () => { color = b.dataset.c; $$('#c-col button', sh).forEach((x) => x.classList.toggle('on', x === b)); haptic.sel(); }; });
      const addCustom = () => {
        const inp = $('#c-label', sh);
        const label = inp.value.trim();
        if (!label) { inp.focus(); return; }
        const low = label.toLowerCase();
        const builtin = Object.keys(E).find((k) => E[k][0].toLowerCase() === low);
        if (builtin) { if (!has(builtin)) toggle(builtin); } else {
          let c = customs.find((x) => x.label.toLowerCase() === low);
          if (!c) { c = { label, color }; customs.push(c); }
          if (!has(c)) toggle(c);
        }
        inp.value = '';
        draw();
      };
      $('#c-add', sh).onclick = addCustom;
      $('#c-label', sh).onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } };
      $('#m-save', sh).onclick = async () => {
        const btn = $('#m-save', sh);
        btn.disabled = true;
        try {
          const d = await api('/moods/today', { method: 'POST', body: { items: sel.map(asItem) } });
          S.moods = d.moods;
          haptic.ok(); refresh(root); close();
          toast(sel.length ? 'Сохранено' : 'Сегодня без отметок');
        } catch (e) { toast(e.message, 'err'); btn.disabled = false; }
      };
      draw();
    },
  });
}

async function historySheet(uid) {
  let hist = [];
  try { hist = (await api('/moods')).history.filter((h) => h.uid === uid).reverse(); } catch (e) { /* */ }
  const p = S.partner;
  const today = itemsOf(uid);
  sheet({
    title: `${esc(p?.name || '')} сейчас`,
    html: `${today.length ? `<div style="display:flex;justify-content:center;margin:-6px 0 8px">${portrait(whoOf(uid), today, 120)}</div>${chips(today)}` : '<div class="empty">Сегодня пока ничего</div>'}
      ${hist.length ? `<label class="lbl" style="margin-top:16px">Последние дни</label><div class="mood-hist">${hist.slice(0, 20).map((h) => `<div class="mh"><i style="background:${h.color}"></i><div class="grow"><b>${esc(h.label)} · ${h.level}%</b></div><small>${ago(h.ts)}</small></div>`).join('')}</div>` : ''}`,
  });
}

export function destroyMoods() { clearInterval(pollT); }
