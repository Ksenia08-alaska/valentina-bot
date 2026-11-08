import { initData, devUser, appToken } from './tg.js';

const BASE = ((window.APP_CONFIG && window.APP_CONFIG.API_BASE) || '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(msg, status) { super(msg); this.status = status; }
}

export async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const init = initData();
  if (init) headers['X-Init-Data'] = init;
  else if (appToken) headers['X-App-Token'] = appToken;
  else if (devUser) headers['X-Dev-User'] = devUser;
  let res;
  try {
    res = await fetch(BASE + '/api' + path, {
      method, headers, body: body ? JSON.stringify(body) : undefined, cache: 'no-store',
    });
  } catch (e) {
    throw new ApiError('Нет связи с сервером. Проверь интернет', 0);
  }
  let data = null;
  try { data = await res.json(); } catch (e) { /* пусто */ }
  if (!res.ok || !data || data.ok === false) {
    throw new ApiError((data && data.error) || `Ошибка сервера (${res.status})`, res.status);
  }
  return data;
}

export async function avatarURL(uid) {
  const headers = {};
  const init = initData();
  if (init) headers['X-Init-Data'] = init;
  else if (appToken) headers['X-App-Token'] = appToken;
  else if (devUser) headers['X-Dev-User'] = devUser;
  try {
    const res = await fetch(BASE + '/api/avatar/' + uid, { headers });
    if (res.status !== 200) return null;
    return URL.createObjectURL(await res.blob());
  } catch (e) {
    return null;
  }
}
