// Обёртка над Telegram.WebApp (и заглушка, если открыто в обычном браузере).
const W = window.Telegram && window.Telegram.WebApp;
export const tg = W && W.initData !== undefined ? W : null;

export const devUser = new URLSearchParams(location.search).get('dev');

// личный ключ из кнопки в клавиатуре (там Telegram не передаёт initData)
export const appToken = (() => {
  const q = new URLSearchParams(location.search).get('t');
  try {
    if (q) sessionStorage.setItem('t', q);
    return q || sessionStorage.getItem('t') || '';
  } catch (e) { return q || ''; }
})();

export function initData() {
  return tg ? tg.initData : '';
}

export function setupTelegram() {
  if (!tg) return;
  try {
    tg.ready();
    tg.expand();
    if (tg.isVersionAtLeast && tg.isVersionAtLeast('7.7')) tg.disableVerticalSwipes();
  } catch (e) { /* старый клиент */ }
  const setVars = () => {
    const r = document.documentElement.style;
    const sa = tg.safeAreaInset || {}, csa = tg.contentSafeAreaInset || {};
    r.setProperty('--tg-safe-area-inset-top', (sa.top || 0) + 'px');
    r.setProperty('--tg-safe-area-inset-bottom', (sa.bottom || 0) + 'px');
    r.setProperty('--tg-content-safe-area-inset-top', (csa.top || 0) + 'px');
    if (tg.viewportStableHeight) r.setProperty('--tg-viewport-stable-height', tg.viewportStableHeight + 'px');
  };
  setVars();
  tg.onEvent?.('viewportChanged', setVars);
  tg.onEvent?.('safeAreaChanged', setVars);
  tg.onEvent?.('contentSafeAreaChanged', setVars);
}

export function tgColorScheme() {
  if (tg && tg.colorScheme) return tg.colorScheme;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function onTgThemeChange(fn) {
  tg?.onEvent?.('themeChanged', fn);
}

export function setHeaderColor(color) {
  try {
    if (tg && tg.isVersionAtLeast('6.1')) {
      tg.setHeaderColor(color);
      tg.setBackgroundColor(color);
      if (tg.isVersionAtLeast('7.10')) tg.setBottomBarColor?.(color);
    }
  } catch (e) { /* */ }
}

export const haptic = {
  tap() { try { tg?.HapticFeedback.impactOccurred('light'); } catch (e) { /* */ } },
  soft() { try { tg?.HapticFeedback.impactOccurred('soft'); } catch (e) { /* */ } },
  heavy() { try { tg?.HapticFeedback.impactOccurred('medium'); } catch (e) { /* */ } },
  ok() { try { tg?.HapticFeedback.notificationOccurred('success'); } catch (e) { /* */ } },
  err() { try { tg?.HapticFeedback.notificationOccurred('error'); } catch (e) { /* */ } },
  sel() { try { tg?.HapticFeedback.selectionChanged(); } catch (e) { /* */ } },
};

// Кнопка «Назад» Telegram: стек обработчиков
const backStack = [];
function backHandler() {
  const fn = backStack[backStack.length - 1];
  if (fn) fn();
}
if (tg) tg.BackButton.onClick(backHandler);
export function pushBack(fn) {
  backStack.push(fn);
  if (tg) tg.BackButton.show();
}
export function popBack(fn) {
  const i = backStack.lastIndexOf(fn);
  if (i >= 0) backStack.splice(i, 1);
  if (tg && !backStack.length) tg.BackButton.hide();
}
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') backHandler(); });

export function openLink(url) {
  if (tg) tg.openLink(url); else window.open(url, '_blank');
}
