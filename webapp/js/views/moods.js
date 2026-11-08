// «Мы сейчас»: несколько чувств за день у каждого. В 00:00 по Минску всё обнуляется.
import { S } from '../state.js';
import { api } from '../api.js';
import { $, $$, esc, sheet, toast, fmtTime, fmtDay, confirmSheet } from '../ui.js';
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
  const last = items.length ? items.reduce((a, b) => (b.ts > a.ts ? b : a)) : null;
  return `<button class="mood-person" data-mood="${person.id}">
    ${portrait(whoOf(person.id), items, 112)}
    <b>${esc(mine ? 'Я' : person.name)}</b>
    ${items.length ? `${chips(items)}${last && last.note ? `<span class="mood-note">«${esc(last.note)}»</span>` : ''}<span class="mood-time">обновлено ${ago(last.ts)}</span>`
      : `<span class="mood-time">${mine ? 'Нажми, чтобы рассказать, что чувствуешь' : 'сегодня пока не делился(ась)'}</span>`}
  </button>`;
}

export function moodsCardHTML() {
  return `<div class="card moods-card" id="moods-card">
    <h2>${icon('heart')} Мы сейчас<span class="spacer"></span><span class="chip gray" id="mood-edit">${icon('plus')}чувство</span></h2>
    <div class="moods-row">${personHTML(S.me)}${personHTML(S.partner)}</div>
    <p class="muted tiny" style="margin:10px 2px 0;text-align:center">Можно добавить несколько чувств за день. В 00:00 всё начинается с чистого листа</p>
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

function editSheet(root) {
  const st = { emotion: 'happy', level: 60, label: '', color: PALETTE[0] };
  const E = S.emotions || {};
  const preview = () => {
    const e = st.emotion === 'custom' ? { label: st.label || 'Своё', color: st.color } : { label: E[st.emotion][0], color: E[st.emotion][1] };
    return { emotion: st.emotion, label: e.label, color: e.color, level: st.level };
  };
  sheet({
    title: 'Что ты чувствуешь?',
    html: `<div id="today-list"></div>
      <div class="mood-preview" id="mp"></div>
      <div class="emo-grid" id="emo">${Object.entries(E).map(([k, [t, c]]) => `<button data-e="${k}" style="--c:${c}"><i></i>${t}</button>`).join('')}<button data-e="custom" style="--c:${st.color}"><i></i>Своё…</button></div>
      <div id="custom" class="hidden" style="margin-top:12px">
        <div class="field"><input id="c-label" maxlength="24" placeholder="Как назвать чувство?"></div>
        <div class="colors" id="c-col">${PALETTE.map((c) => `<button data-c="${c}" style="background:${c}" class="${c === st.color ? 'on' : ''}"></button>`).join('')}</div>
      </div>
      <label class="lbl" style="margin-top:16px">Насколько сильно: <b id="lv">${st.level}%</b></label>
      <input type="range" min="0" max="100" step="5" id="level" value="${st.level}" class="range">
      <div class="field" style="margin-top:12px"><input id="note" maxlength="120" placeholder="Пару слов (необязательно)"></div>
      <button class="btn block" id="m-save">${icon('plus')} Добавить чувство</button>
      <p class="muted tiny" style="text-align:center;margin:10px 0 0">${esc(S.partner?.name || '')} увидит это и получит уведомление. В 00:00 список обнулится</p>`,
    onMount(sh, close) {
      const drawToday = () => {
        const items = itemsOf(S.me.id);
        $('#today-list', sh).innerHTML = items.length
          ? `<label class="lbl">Сегодня у тебя</label><div class="today-moods">${items.map((m) => `<div class="tm" style="--c:${m.color}"><i></i><div class="grow"><b>${esc(m.label)} · ${m.level}%</b>${m.note ? `<span>«${esc(m.note)}»</span>` : ''}</div><button data-del="${m.id}" aria-label="Удалить">${icon('close')}</button></div>`).join('')}</div>`
          : '';
        $$('[data-del]', sh).forEach((b) => {
          b.onclick = async () => {
            try { const d = await api('/mood/' + b.dataset.del, { method: 'DELETE' }); S.moods = d.moods; haptic.tap(); drawToday(); refresh(root); } catch (e) { toast(e.message, 'err'); }
          };
        });
      };
      const upd = () => {
        const p = preview();
        $('#mp', sh).innerHTML = `${portrait(S.me.role === 'admin' ? 'girl' : 'boy', p, 120)}<b style="color:${p.color}">${esc(p.label)}</b>`;
        $$('#emo button', sh).forEach((b) => b.classList.toggle('on', b.dataset.e === st.emotion));
        $('#custom', sh).classList.toggle('hidden', st.emotion !== 'custom');
        $('#level', sh).style.setProperty('--c', p.color);
        $('#level', sh).style.setProperty('--v', st.level + '%');
        $('#lv', sh).textContent = st.level + '%';
      };
      $$('#emo button', sh).forEach((b) => { b.onclick = () => { st.emotion = b.dataset.e; haptic.sel(); upd(); }; });
      $$('#c-col button', sh).forEach((b) => { b.onclick = () => { st.color = b.dataset.c; $$('#c-col button', sh).forEach((x) => x.classList.toggle('on', x === b)); upd(); }; });
      $('#c-label', sh).oninput = (e) => { st.label = e.target.value; upd(); };
      $('#level', sh).oninput = (e) => { st.level = +e.target.value; upd(); };
      $('#m-save', sh).onclick = async () => {
        if (st.emotion === 'custom' && !st.label.trim()) { toast('Напиши, как назвать чувство', 'err'); return; }
        try {
          const d = await api('/mood', { method: 'POST', body: { emotion: st.emotion, level: st.level, note: $('#note', sh).value, label: st.label, color: st.color } });
          S.moods = d.moods;
          haptic.ok(); refresh(root); drawToday();
          $('#note', sh).value = '';
          toast('Добавлено');
        } catch (e) { toast(e.message, 'err'); }
      };
      drawToday(); upd();
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
      ${hist.length ? `<label class="lbl" style="margin-top:16px">Последние дни</label><div class="mood-hist">${hist.slice(0, 20).map((h) => `<div class="mh"><i style="background:${h.color}"></i><div class="grow"><b>${esc(h.label)} · ${h.level}%</b>${h.note ? `<span>«${esc(h.note)}»</span>` : ''}</div><small>${ago(h.ts)}</small></div>`).join('')}</div>` : ''}`,
  });
}

export function destroyMoods() { clearInterval(pollT); }
