// Иконки интерфейса (собственные, линейные) и нарисованная еда.

const P = {
  timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.6 1.8M9.5 2.8h5M12 2.8v3.2M18.6 6.2l1.4-1.4"/>',
  paw: '<ellipse cx="12" cy="16" rx="4.6" ry="3.8"/><circle cx="6.2" cy="10.6" r="1.9"/><circle cx="9.6" cy="6.8" r="2"/><circle cx="14.4" cy="6.8" r="2"/><circle cx="17.8" cy="10.6" r="1.9"/>',
  chat: '<path d="M20 12.2c0 4-3.6 7-8 7-1.2 0-2.3-.2-3.3-.6L4 20l1.2-3.6C4.4 15.2 4 13.8 4 12.2c0-4 3.6-7.2 8-7.2s8 3.2 8 7.2z"/><path d="M9.6 11.3c0-1 .8-1.6 1.6-1.4.4.1.7.4.8.7.1-.3.4-.6.8-.7.8-.2 1.6.4 1.6 1.4 0 1.3-2.4 2.8-2.4 2.8s-2.4-1.5-2.4-2.8z" fill="currentColor" stroke="none"/>',
  book: '<path d="M4.5 5.5c2.7-1 5.3-.8 7.5.8 2.2-1.6 4.8-1.8 7.5-.8v13c-2.7-1-5.3-.8-7.5.8-2.2-1.6-4.8-1.8-7.5-.8z"/><path d="M12 6.3v13"/>',
  user: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.8 19.6c1.2-3.4 4-5.2 7.2-5.2s6 1.8 7.2 5.2"/>',
  heart: '<path d="M12 19.5S4.5 15 4.5 9.6C4.5 7.3 6.2 5.5 8.4 5.5c1.5 0 2.8.8 3.6 2 .8-1.2 2.1-2 3.6-2 2.2 0 3.9 1.8 3.9 4.1 0 5.4-7.5 9.9-7.5 9.9z"/>',
  bowl: '<path d="M3.5 12h17c0 4.2-3.6 7-8.5 7s-8.5-2.8-8.5-7z"/><path d="M8 9.5c0-1.4 1-2.5 2.2-2.5M12 9c0-2 1.3-3.6 3-3.6M16 9.5c0-1 .6-1.8 1.4-1.8"/>',
  ball: '<circle cx="12" cy="12" r="7.8"/><path d="M5 9.5c4.5 1.6 9.5 1.6 14 0M5 14.5c4.5-1.6 9.5-1.6 14 0"/>',
  bubbles: '<circle cx="9" cy="14" r="5"/><circle cx="16.5" cy="8" r="3.2"/><circle cx="17.5" cy="16.5" r="2"/><path d="M7 12.4c.4-.9 1.1-1.5 2-1.7"/>',
  moon: '<path d="M19 14.6A7.6 7.6 0 0 1 9.4 5a7.6 7.6 0 1 0 9.6 9.6z"/><path d="M16 4.5l.5 1.3 1.3.5-1.3.5-.5 1.3-.5-1.3-1.3-.5 1.3-.5z" fill="currentColor"/>',
  hand: '<path d="M7.5 12V7.2a1.5 1.5 0 0 1 3 0V11M10.5 11V5.8a1.5 1.5 0 0 1 3 0V11M13.5 11V6.8a1.5 1.5 0 0 1 3 0v6.4c0 3.6-2.4 6.3-5.6 6.3-2.3 0-3.7-1.2-4.9-3.3L4.6 13a1.4 1.4 0 0 1 2.3-1.5L7.5 12"/>',
  gift: '<rect x="4" y="9" width="16" height="11" rx="2"/><path d="M3 9h18M12 9v11M12 9c-1.5-3.6-6-4.4-6-1.7C6 9 9 9 12 9zm0 0c1.5-3.6 6-4.4 6-1.7C18 9 15 9 12 9z"/>',
  game: '<path d="M7 8h10a4.5 4.5 0 0 1 4.3 5.8l-1 3.3a2.5 2.5 0 0 1-4.2 1L14 16h-4l-2.1 2.1a2.5 2.5 0 0 1-4.2-1l-1-3.3A4.5 4.5 0 0 1 7 8z"/><path d="M8 11v3M6.5 12.5h3"/><circle cx="16" cy="11.6" r=".9" fill="currentColor"/><circle cx="17.6" cy="13.6" r=".9" fill="currentColor"/>',
  history: '<path d="M4 12a8 8 0 1 0 2.4-5.7M4 4.5v3.8h3.8"/><path d="M12 8v4.4l3 1.8"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  send: '<path d="M4.5 12L20 4.5 16.5 20l-3.8-6.2z"/><path d="M12.7 13.8L20 4.5"/>',
  trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>',
  edit: '<path d="M5 19l1-4 9.5-9.5a2.1 2.1 0 0 1 3 3L9 18z"/><path d="M14 7l3 3"/>',
  check: '<path d="M5 12.5l4.2 4.2L19 7"/>',
  lock: '<rect x="5.5" y="10.5" width="13" height="9" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  letter: '<rect x="3.5" y="6" width="17" height="12.5" rx="2.5"/><path d="M4 7l8 6 8-6"/>',
  star: '<path d="M12 4.5l2.3 4.7 5.2.8-3.8 3.6.9 5.1L12 16.3l-4.6 2.4.9-5.1-3.8-3.6 5.2-.8z"/>',
  calendar: '<rect x="4" y="5.5" width="16" height="14" rx="3"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  bell: '<path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5H5z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  palette: '<path d="M12 4a8 8 0 0 0 0 16c1.2 0 1.8-.8 1.8-1.7 0-1.2-1-1.5-1-2.6 0-1 .8-1.7 1.8-1.7H17a3 3 0 0 0 3-3C20 7 16.4 4 12 4z"/><circle cx="8" cy="11" r="1.2" fill="currentColor"/><circle cx="10.5" cy="7.6" r="1.2" fill="currentColor"/><circle cx="14.5" cy="7.6" r="1.2" fill="currentColor"/>',
  crown: '<path d="M4.5 17.5L3.5 8l5 4 3.5-6 3.5 6 5-4-1 9.5z"/><path d="M5 20h14"/>',
  fire: '<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.1 0-3.7 3-5.6 3.6-9.4 2.4 1.6 3.4 3.7 3.4 5.6 1-.8 1.6-2 1.7-3.3 2.6 2 4.3 4.6 4.3 7.2C18.5 18.4 15.9 21 12 21z"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  sparkle: '<path d="M12 3.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2L5 10.5l5.2-1.8z"/><path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
  list: '<path d="M9 7h11M9 12h11M9 17h11"/><circle cx="5" cy="7" r="1.1" fill="currentColor"/><circle cx="5" cy="12" r="1.1" fill="currentColor"/><circle cx="5" cy="17" r="1.1" fill="currentColor"/>',
  reply: '<path d="M10 8L5 12.5 10 17"/><path d="M5.5 12.5H14a5 5 0 0 1 5 5V19"/>',
  shield: '<path d="M12 3.5l7 2.8v5.3c0 4.5-3 7.6-7 8.9-4-1.3-7-4.4-7-8.9V6.3z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
};

export function icon(name, cls = '') {
  return `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
}

// ---------- еда ----------
const O = 'stroke="#3B2B33" stroke-width="2.2" stroke-linejoin="round"';
const FOOD = {
  fish: `<path d="M8 32 Q22 16 40 26 L52 18 L50 32 L52 46 L40 38 Q22 48 8 32Z" fill="#7EC8F2" ${O}/><circle cx="18" cy="29" r="2.6" fill="#3B2B33"/><path d="M27 26 q4 6 0 12" fill="none" stroke="#3B8FC4" stroke-width="2.2"/>`,
  milk: `<path d="M20 22 L24 14 H40 L44 22 V50 a4 4 0 0 1 -4 4 H24 a4 4 0 0 1 -4 -4Z" fill="#FFFFFF" ${O}/><path d="M20 30 H44 V40 H20Z" fill="#8FD0FF"/><path d="M26 34 q3 -4 6 0 q3 4 6 0" fill="none" stroke="#fff" stroke-width="2"/><rect x="24" y="10" width="16" height="5" rx="2" fill="#FF8FB1" ${O}/>`,
  chicken: `<path d="M38 14 a13 13 0 1 1 -14 20 L14 44" fill="#E8A25C" ${O}/><path d="M14 44 l-4 -2 a3 3 0 1 0 -2 5 a3 3 0 1 0 5 2 l-2 -4" fill="#FFF6EA" ${O}/><path d="M36 20 q5 2 6 8" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".6"/>`,
  cookie: `<circle cx="32" cy="32" r="18" fill="#E7B36A" ${O}/><circle cx="25" cy="26" r="3" fill="#6B3E26"/><circle cx="37" cy="24" r="2.4" fill="#6B3E26"/><circle cx="38" cy="37" r="3" fill="#6B3E26"/><circle cx="26" cy="39" r="2.2" fill="#6B3E26"/>`,
  cheese: `<path d="M10 40 L44 18 L54 30 V46 H10Z" fill="#FFD65C" ${O}/><path d="M10 40 H54" stroke="#3B2B33" stroke-width="2"/><circle cx="24" cy="44" r="2.6" fill="#E9B23A"/><circle cx="40" cy="31" r="3.4" fill="#E9B23A"/><circle cx="46" cy="42" r="2" fill="#E9B23A"/>`,
  strawberry: `<path d="M32 54 C16 44 14 26 22 22 C27 20 30 22 32 23 C34 22 37 20 42 22 C50 26 48 44 32 54Z" fill="#FF5E78" ${O}/><path d="M22 20 L28 22 L32 14 L36 22 L42 20 L38 26 L26 26Z" fill="#7ED37F" ${O}/><g fill="#FFE27A"><circle cx="26" cy="33" r="1.4"/><circle cx="34" cy="31" r="1.4"/><circle cx="40" cy="36" r="1.4"/><circle cx="30" cy="41" r="1.4"/><circle cx="36" cy="45" r="1.4"/></g>`,
  bone: `<path d="M16 26 a6 6 0 1 1 6 -8 L42 38 a6 6 0 1 1 8 6 a6 6 0 1 1 -8 6 L22 30 a6 6 0 1 1 -6 -4Z" fill="#FFF6E6" ${O}/>`,
  carrot: `<path d="M44 20 L18 50 C14 52 12 50 14 46 L40 16Z" fill="#FF9A3C" ${O}/><path d="M40 16 C40 8 46 6 48 8 C46 12 48 14 52 14 C54 18 50 22 44 20" fill="#7ED37F" ${O}/><path d="M28 34 l4 3 M22 42 l3 2 M34 26 l3 2" stroke="#D7701E" stroke-width="2" stroke-linecap="round"/>`,
  apple: `<path d="M32 22 C20 14 10 24 14 38 C17 48 24 54 32 50 C40 54 47 48 50 38 C54 24 44 14 32 22Z" fill="#FF6B6B" ${O}/><path d="M32 22 C32 16 34 12 36 10" stroke="#6B3E26" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M34 16 C38 10 46 12 46 12 C44 18 38 18 34 16Z" fill="#7ED37F" ${O}/><path d="M20 30 q2 -6 8 -6" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".6"/>`,
  seeds: `<g ${O}><path d="M20 26 q6 -12 12 0 q-6 14 -12 0Z" fill="#5E4A3E"/><path d="M34 22 q6 -12 12 0 q-6 14 -12 0Z" fill="#5E4A3E"/><path d="M26 40 q6 -12 12 0 q-6 14 -12 0Z" fill="#5E4A3E"/></g><path d="M24 22 v6 M38 18 v6 M30 36 v6" stroke="#E9DCC8" stroke-width="2" stroke-linecap="round"/>`,
  grapes: `<g fill="#B07BE8" ${O}><circle cx="26" cy="26" r="7"/><circle cx="38" cy="26" r="7"/><circle cx="32" cy="36" r="7"/><circle cx="22" cy="38" r="6"/><circle cx="42" cy="38" r="6"/><circle cx="32" cy="48" r="6"/></g><path d="M32 18 V10 M32 14 q6 -6 12 -2" stroke="#6B8E3A" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
  salad: `<path d="M12 34 C10 20 22 12 32 18 C42 12 54 20 52 34 Z" fill="#8ED16B" ${O}/><path d="M32 18 V36 M22 24 L28 34 M42 24 L36 34" stroke="#5E9F44" stroke-width="2" fill="none"/><path d="M10 34 H54 C52 46 44 52 32 52 C20 52 12 46 10 34Z" fill="#FFFFFF" ${O}/>`,
};

export function foodSVG(id, size = 44) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">${FOOD[id] || FOOD.cookie}</svg>`;
}

export const FOOD_IDS = Object.keys(FOOD);

// Огонёк серии
export function flameSVG(on = true, size = 26) {
  return `<svg class="flame ${on ? 'on' : 'off'}" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true">
    <path d="M16 30c-6 0-10-4-10-9.4 0-5.8 4.6-8.6 5.6-14.6 3.8 2.4 5.2 5.8 5.2 8.8 1.6-1.2 2.4-3 2.6-5C23.4 12.8 26 16.8 26 20.6 26 26 22 30 16 30z" fill="${on ? 'url(#fg)' : '#C9BFC4'}" stroke="#3B2B33" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M16 27c-2.8 0-4.6-1.8-4.6-4.2 0-2.6 2.2-3.8 2.8-6.2 1.6 1 2.4 2.4 2.4 3.8.8-.4 1.4-1.2 1.6-2.2 1.4 1.2 2.4 2.8 2.4 4.6 0 2.4-1.8 4.2-4.6 4.2z" fill="${on ? '#FFE27A' : '#E7DFE3'}"/>
    <defs><linearGradient id="fg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#FF5C8A"/><stop offset="1" stop-color="#FFA24C"/></linearGradient></defs>
  </svg>`;
}
