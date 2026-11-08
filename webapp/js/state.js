// Общее состояние приложения + простые события.
import { avatarURL } from './api.js';

export const S = {
  me: null, partner: null, settings: { theme: 'auto', notify: {} },
  dmb: null, events: [], pet: null, species: {}, foods: {}, stages: [], stageXp: [],
  unread: 0, partnerOnline: false, avatars: {}, lastChatText: '',
};

const subs = {};
export function on(evt, fn) {
  (subs[evt] = subs[evt] || []).push(fn);
  return () => { subs[evt] = subs[evt].filter((f) => f !== fn); };
}
export function emit(evt, data) {
  (subs[evt] || []).forEach((f) => { try { f(data); } catch (e) { console.error(e); } });
}

export function nameOf(uid) {
  if (!uid) return 'Питомец';
  if (S.me && uid === S.me.id) return S.me.name;
  if (S.partner && uid === S.partner.id) return S.partner.name;
  return '';
}

export function isAdmin() {
  return S.me && S.me.role === 'admin';
}

const loading = {};
export async function loadAvatar(uid) {
  if (!uid) return null;
  if (uid in S.avatars) return S.avatars[uid];
  if (!loading[uid]) {
    loading[uid] = avatarURL(uid).then((u) => { S.avatars[uid] = u; emit('avatar', uid); return u; });
  }
  return loading[uid];
}

// Дата «сейчас» по Минску (как на сервере), для таймера и событий
export function nowMinsk() {
  return new Date();
}
