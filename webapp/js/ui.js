import { icon } from './art/icons.js';
import { heart } from './art/couple.js';
import { pushBack, popBack, haptic } from './tg.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function plural(n, one, few, many) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}
export const days = (n) => plural(n, 'день', 'дня', 'дней');

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTHS_N = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
export { MONTHS, MONTHS_N };

export function fmtDate(d, withYear = true) {
  d = d instanceof Date ? d : new Date(d);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${withYear ? ' ' + d.getFullYear() : ''}`;
}
export function fmtTime(ts) {
  const d = new Date(ts * 1000);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
export function fmtDay(ts) {
  const d = new Date(ts * 1000), now = new Date();
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return 'Сегодня';
  if (d.toDateString() === y.toDateString()) return 'Вчера';
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${d.getFullYear() !== now.getFullYear() ? ' ' + d.getFullYear() : ''}, ${WD[d.getDay()]}`;
}
export function fmtAgo(ts) {
  if (!ts) return 'давно';
  const s = Date.now() / 1000 - ts;
  if (s < 70) return 'в сети';
  if (s < 3600) return `был(а) ${Math.round(s / 60)} мин назад`;
  if (s < 86400) return `был(а) в ${fmtTime(ts)}`;
  return `был(а) ${fmtDay(ts).toLowerCase()}`;
}
export function fmtCd(sec) {
  if (sec <= 0) return '';
  if (sec >= 3600) return `${Math.floor(sec / 3600)}ч ${Math.ceil((sec % 3600) / 60)}м`;
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ---------- тост ----------
let toastT;
export function toast(msg, type = '') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'show ' + type;
  clearTimeout(toastT);
  toastT = setTimeout(() => { t.className = ''; }, 2600);
  if (type === 'err') haptic.err();
}

// ---------- шторка снизу ----------
export function sheet({ title = '', html = '', onMount, onClose } = {}) {
  const layer = $('#layer');
  const bd = document.createElement('div');
  bd.className = 'backdrop';
  const sh = document.createElement('div');
  sh.className = 'sheet';
  sh.innerHTML = `<div class="grab"></div>${title ? `<h3>${title}</h3>` : ''}<div class="sheet-body">${html}</div>`;
  layer.append(bd, sh);
  requestAnimationFrame(() => { bd.classList.add('show'); sh.classList.add('show'); });
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    popBack(close);
    bd.classList.remove('show');
    sh.classList.remove('show');
    setTimeout(() => { bd.remove(); sh.remove(); }, 420);
    onClose && onClose();
  };
  bd.onclick = close;
  // свайп вниз, чтобы закрыть
  let y0 = null;
  sh.addEventListener('touchstart', (e) => { if (sh.scrollTop <= 0) y0 = e.touches[0].clientY; }, { passive: true });
  sh.addEventListener('touchmove', (e) => {
    if (y0 === null) return;
    const dy = e.touches[0].clientY - y0;
    if (dy > 0) { sh.style.transition = 'none'; sh.style.transform = `translate(-50%, ${dy}px)`; }
  }, { passive: true });
  sh.addEventListener('touchend', (e) => {
    if (y0 === null) return;
    const dy = e.changedTouches[0].clientY - y0;
    sh.style.transition = ''; sh.style.transform = '';
    y0 = null;
    if (dy > 110) close();
  });
  pushBack(close);
  onMount && onMount(sh, close);
  return close;
}

// полноэкранный слой (игры, письмо)
export function fullscreen({ html = '', onMount, onClose } = {}) {
  const layer = $('#layer');
  const el = document.createElement('div');
  el.className = 'full';
  el.innerHTML = html;
  layer.append(el);
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    popBack(close);
    el.style.transition = 'opacity .25s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 260);
    onClose && onClose();
  };
  pushBack(close);
  onMount && onMount(el, close);
  return close;
}

export function confirmSheet(text, { ok = 'Да', danger = false } = {}) {
  return new Promise((resolve) => {
    let res = false;
    sheet({
      title: text,
      html: `<div class="row"><button class="btn plain grow" data-n>Отмена</button><button class="btn grow ${danger ? 'danger' : ''}" data-y>${ok}</button></div>`,
      onMount(sh, close) {
        $('[data-n]', sh).onclick = close;
        $('[data-y]', sh).onclick = () => { res = true; close(); };
      },
      onClose() { resolve(res); },
    });
  });
}

// ---------- конфетти ----------
const CC = ['#FF5C8A', '#FFB36B', '#FFD25E', '#7E8CF7', '#3CC48A', '#C86CF2', '#6FC9F0'];
export function confetti(n = 70, hearts = true) {
  const box = document.createElement('div');
  box.className = 'confetti';
  for (let i = 0; i < n; i++) {
    const el = document.createElement('i');
    const isH = hearts && i % 4 === 0;
    if (isH) {
      el.className = 'h';
      el.innerHTML = `<svg viewBox="-17 -17 34 30" width="16" height="16">${heart(0, 0, 1, CC[i % CC.length])}</svg>`;
    } else el.style.background = CC[i % CC.length];
    el.style.left = Math.random() * 100 + '%';
    el.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px');
    el.style.setProperty('--rot', (Math.random() * 900 - 450) + 'deg');
    el.style.animationDuration = (2.2 + Math.random() * 1.8) + 's';
    el.style.animationDelay = (Math.random() * 0.6) + 's';
    box.append(el);
  }
  document.body.append(box);
  haptic.ok();
  setTimeout(() => box.remove(), 4800);
}

export function avatarHTML(person, url, cls = '') {
  const letter = esc((person?.first_name || person?.name || '?')[0]);
  return `<div class="avatar ${cls}">${url ? `<img src="${url}" alt="">` : letter}${person?.online ? '<i class="dot-online"></i>' : ''}</div>`;
}

export function emptyHTML(text, ico = 'heart') {
  return `<div class="empty">${icon(ico, '')}<div>${text}</div></div>`;
}

export function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
