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
    <p class="muted tiny" style="margin:10px 2px 0;text-align:center">На день — 100%, которые делят между собой твои чувства. В 00:00 всё начинается с чистого листа</p>
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
  const E = S.emotions || {};
  const groups = (S.emotionGroups && S.emotionGroups.length) ? S.emotionGroups : [['Чувства', Object.keys(E)]];
  const st = { emotion: null, level: 30, label: '', color: PALETTE[0], open: false, group: null };
  const used = () => itemsOf(S.me.id).reduce((t, m) => t + m.level, 0);
  const free = () => {
    const sameLabel = st.emotion === 'custom' ? st.label.trim().toLowerCase() : (E[st.emotion] ? E[st.emotion][0].toLowerCase() : '');
    const same = itemsOf(S.me.id).find((m) => m.label.toLowerCase() === sameLabel);
    return Math.max(0, 100 - used() + (same ? same.level : 0));
  };
  const preview = () => {
    const e = st.emotion === 'custom' ? { label: st.label || 'Своё', color: st.color } : { label: E[st.emotion][0], color: E[st.emotion][1] };
    return { emotion: st.emotion, label: e.label, color: e.color, level: st.level };
  };
  sheet({
    title: 'Мои чувства сегодня',
    html: `<div class="budget" id="budget"></div>
      <div id="today-list"></div>
      <button class="btn ghost block" id="open-add">${icon('plus')} Добавить чувство</button>
      <div id="adder" class="hidden">
        <div class="emo-groups" id="groups">${groups.map(([g, keys], gi) => `
          <div class="egroup" data-g="${gi}">
            <button class="egroup-head" data-gh="${gi}"><b>${esc(g)}</b><span>${keys.length}</span>${icon('back')}</button>
            <div class="emo-grid">${keys.filter((k) => E[k]).map((k) => `<button data-e="${k}" style="--c:${E[k][1]}"><i></i>${esc(E[k][0])}</button>`).join('')}</div>
          </div>`).join('')}
          <div class="egroup" data-g="c"><button class="egroup-head" data-gh="c"><b>Своё чувство</b><span>+</span>${icon('back')}</button>
            <div><div class="field"><input id="c-label" maxlength="24" placeholder="Как назвать чувство?"></div>
              <div class="colors" id="c-col">${PALETTE.map((c) => `<button data-c="${c}" style="background:${c}" class="${c === st.color ? 'on' : ''}"></button>`).join('')}</div></div></div>
        </div>
        <div id="setup" class="hidden">
          <div class="mood-preview" id="mp"></div>
          <label class="lbl">Сколько из оставшихся процентов: <b id="lv"></b></label>
          <input type="range" min="5" max="100" step="5" id="level" class="range">
          <div class="field" style="margin-top:12px"><input id="note" maxlength="120" placeholder="Пару слов (необязательно)"></div>
          <button class="btn block" id="m-save">${icon('check')} Добавить</button>
        </div>
      </div>
      <p class="muted tiny" style="text-align:center;margin:12px 0 0">На весь день — 100%, чувства делят их между собой. В 00:00 всё обнуляется. ${esc(S.partner?.name || '')} получит уведомление</p>`,
    onMount(sh) {
      const drawBudget = () => {
        const u = used();
        $('#budget', sh).innerHTML = `<div class="bline">${itemsOf(S.me.id).map((m) => `<i style="width:${m.level}%;background:${m.color}"></i>`).join('')}</div><span>Занято ${u}% из 100%${u >= 100 ? ' — удали или уменьши чувство, чтобы добавить новое' : ''}</span>`;
      };
      const drawToday = () => {
        const items = itemsOf(S.me.id);
        $('#today-list', sh).innerHTML = items.length
          ? `<div class="today-moods">${items.map((m) => `<div class="tm" style="--c:${m.color}"><i></i><div class="grow"><b>${esc(m.label)} · ${m.level}%</b>${m.note ? `<span>«${esc(m.note)}»</span>` : ''}</div><button data-del="${m.id}" aria-label="Удалить">${icon('close')}</button></div>`).join('')}</div>`
          : '<div class="empty" style="padding:8px 0 14px">Сегодня пока ничего — добавь первое чувство</div>';
        $$('[data-del]', sh).forEach((b) => {
          b.onclick = async () => {
            try { const d = await api('/mood/' + b.dataset.del, { method: 'DELETE' }); S.moods = d.moods; haptic.tap(); drawAll(); refresh(root); } catch (e) { toast(e.message, 'err'); }
          };
        });
      };
      const drawSetup = () => {
        const on = !!st.emotion && (st.emotion !== 'custom' || st.label.trim());
        $('#setup', sh).classList.toggle('hidden', !on);
        $$('#groups [data-e]', sh).forEach((b) => b.classList.toggle('on', b.dataset.e === st.emotion));
        if (!on) return;
        const fr = free();
        const lv = $('#level', sh);
        lv.max = Math.max(5, fr);
        lv.disabled = fr <= 0;
        st.level = Math.min(st.level, fr) || Math.min(30, fr);
        lv.value = st.level;
        const p = preview();
        $('#mp', sh).innerHTML = `${portrait(S.me.role === 'admin' ? 'girl' : 'boy', p, 110)}<b style="color:${p.color}">${esc(p.label)}</b>`;
        lv.style.setProperty('--c', p.color);
        lv.style.setProperty('--v', (fr ? (st.level - 5) / Math.max(1, fr - 5) * 100 : 0) + '%');
        $('#lv', sh).textContent = fr > 0 ? `${st.level}% (свободно ${fr}%)` : 'свободных процентов нет';
        $('#m-save', sh).disabled = fr <= 0;
      };
      const drawAll = () => { drawBudget(); drawToday(); drawSetup(); };
      $('#open-add', sh).onclick = () => {
        st.open = !st.open;
        $('#adder', sh).classList.toggle('hidden', !st.open);
        $('#open-add', sh).classList.toggle('hidden', st.open);
        haptic.tap();
      };
      $$('[data-gh]', sh).forEach((h) => {
        h.onclick = () => {
          const g = h.closest('.egroup');
          const was = g.classList.contains('open');
          $$('.egroup', sh).forEach((x) => x.classList.remove('open'));
          if (!was) g.classList.add('open');
          if (h.dataset.gh === 'c') { st.emotion = 'custom'; setTimeout(() => $('#c-label', sh).focus(), 200); }
          haptic.sel(); drawSetup();
        };
      });
      $$('#groups [data-e]', sh).forEach((b) => { b.onclick = () => { st.emotion = b.dataset.e; haptic.sel(); drawSetup(); }; });
      $$('#c-col button', sh).forEach((b) => { b.onclick = () => { st.color = b.dataset.c; $$('#c-col button', sh).forEach((x) => x.classList.toggle('on', x === b)); drawSetup(); }; });
      $('#c-label', sh).oninput = (e) => { st.label = e.target.value; st.emotion = 'custom'; drawSetup(); };
      $('#level', sh).oninput = (e) => { st.level = +e.target.value; drawSetup(); };
      $('#m-save', sh).onclick = async () => {
        if (st.emotion === 'custom' && !st.label.trim()) { toast('Напиши, как назвать чувство', 'err'); return; }
        try {
          const d = await api('/mood', { method: 'POST', body: { emotion: st.emotion, level: st.level, note: $('#note', sh).value, label: st.label, color: st.color } });
          S.moods = d.moods;
          haptic.ok(); refresh(root);
          st.emotion = null; st.label = ''; $('#note', sh).value = ''; $('#c-label', sh).value = '';
          $$('.egroup', sh).forEach((x) => x.classList.remove('open'));
          st.open = false; $('#adder', sh).classList.add('hidden'); $('#open-add', sh).classList.remove('hidden');
          drawAll();
          toast('Добавлено');
        } catch (e) { toast(e.message, 'err'); }
      };
      drawAll();
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
