// «Мы сейчас»: настроение каждого из нас.
import { S } from '../state.js';
import { api } from '../api.js';
import { $, $$, esc, sheet, toast, fmtTime, fmtDay } from '../ui.js';
import { icon } from '../art/icons.js';
import { portrait } from '../art/faces.js';
import { haptic } from '../tg.js';

const PALETTE = ['#F6C860', '#F28CA6', '#B39DEB', '#7FCFB0', '#F7B39A', '#8FB6F2', '#9AA3B5', '#E8676B'];
let pollT = null;

const whoOf = (uid) => (uid === S.me.id ? (S.me.role === 'admin' ? 'girl' : 'boy') : (S.me.role === 'admin' ? 'boy' : 'girl'));

function ago(ts) {
  if (!ts) return '';
  const s = Date.now() / 1000 - ts;
  if (s < 90) return 'только что';
  if (s < 3600) return `${Math.round(s / 60)} мин назад`;
  if (s < 86400) return `сегодня в ${fmtTime(ts)}`;
  return `${fmtDay(ts).toLowerCase()} в ${fmtTime(ts)}`;
}

function personHTML(person) {
  if (!person) return '';
  const m = (S.moods || {})[String(person.id)];
  const mine = person.id === S.me.id;
  return `<button class="mood-person" data-mood="${person.id}">
    ${portrait(whoOf(person.id), m, 112)}
    <b>${esc(mine ? 'Я' : person.name)}</b>
    ${m ? `<span class="mood-label" style="color:${m.color}">${esc(m.label)} · ${m.level}%</span>
           ${m.note ? `<span class="mood-note">«${esc(m.note)}»</span>` : ''}
           <span class="mood-time">${ago(m.ts)}</span>`
      : `<span class="mood-time">${mine ? 'Нажми, чтобы рассказать' : 'пока не делился(ась)'}</span>`}
  </button>`;
}

export function moodsCardHTML() {
  return `<div class="card moods-card" id="moods-card">
    <h2>${icon('heart')} Мы сейчас<span class="spacer"></span><span class="chip gray" id="mood-edit">${icon('edit')}моё настроение</span></h2>
    <div class="moods-row">${personHTML(S.me)}${personHTML(S.partner)}</div>
  </div>`;
}

export function bindMoods(root) {
  const card = $('#moods-card', root);
  if (!card) return;
  const rebind = () => {
    $$('[data-mood]', card).forEach((b) => {
      b.onclick = () => { haptic.tap(); +b.dataset.mood === S.me.id ? editSheet(root) : historySheet(+b.dataset.mood); };
    });
    $('#mood-edit', card).onclick = () => editSheet(root);
  };
  rebind();
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
  const cur = (S.moods || {})[String(S.me.id)] || { emotion: 'happy', level: 60, note: '' };
  const st = { emotion: cur.emotion, level: cur.level, note: cur.note || '', label: cur.emotion === 'custom' ? cur.label : '', color: cur.color || PALETTE[0] };
  const E = S.emotions || {};
  const preview = () => {
    const e = st.emotion === 'custom' ? { label: st.label || 'Своё', color: st.color } : { label: E[st.emotion][0], color: E[st.emotion][1] };
    return { emotion: st.emotion, label: e.label, color: e.color, level: st.level };
  };
  sheet({
    title: 'Как ты сейчас?',
    html: `<div class="mood-preview" id="mp"></div>
      <div class="emo-grid" id="emo">${Object.entries(E).map(([k, [t, c]]) => `<button data-e="${k}" style="--c:${c}"><i></i>${t}</button>`).join('')}<button data-e="custom" style="--c:${st.color}"><i></i>Своё…</button></div>
      <div id="custom" class="hidden" style="margin-top:12px">
        <div class="field"><input id="c-label" maxlength="24" placeholder="Как назвать чувство?" value="${esc(st.label)}"></div>
        <div class="colors" id="c-col">${PALETTE.map((c) => `<button data-c="${c}" style="background:${c}" class="${c === st.color ? 'on' : ''}"></button>`).join('')}</div>
      </div>
      <label class="lbl" style="margin-top:16px">Насколько сильно: <b id="lv">${st.level}%</b></label>
      <input type="range" min="0" max="100" step="5" id="level" value="${st.level}" class="range">
      <div class="field" style="margin-top:12px"><input id="note" maxlength="120" placeholder="Пару слов (необязательно)" value="${esc(st.note)}"></div>
      <button class="btn block" id="m-save">${icon('check')} Поделиться</button>
      <p class="muted tiny" style="text-align:center;margin:10px 0 0">${esc(S.partner?.name || '')} увидит это в приложении и получит уведомление</p>`,
    onMount(sh, close) {
      const upd = () => {
        const p = preview();
        $('#mp', sh).innerHTML = `${portrait(S.me.role === 'admin' ? 'girl' : 'boy', p, 132)}<b style="color:${p.color}">${esc(p.label)}</b>`;
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
          close(); haptic.ok(); refresh(root);
        } catch (e) { toast(e.message, 'err'); }
      };
      upd();
    },
  });
}

async function historySheet(uid) {
  let hist = [];
  try { hist = (await api('/moods')).history.filter((h) => h.uid === uid).reverse(); } catch (e) { /* */ }
  const p = S.partner;
  sheet({
    title: `Настроение: ${esc(p?.name || '')}`,
    html: hist.length ? `<div class="mood-hist">${hist.slice(0, 20).map((h) => `<div class="mh"><i style="background:${h.color}"></i><div class="grow"><b>${esc(h.label)} · ${h.level}%</b>${h.note ? `<span>«${esc(h.note)}»</span>` : ''}</div><small>${ago(h.ts)}</small></div>`).join('')}</div>`
      : '<div class="empty">Пока ничего. Как только поделится — увидишь здесь</div>',
  });
}

export function destroyMoods() { clearInterval(pollT); }
