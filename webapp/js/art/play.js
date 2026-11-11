// Рисунки для игр: моментик, карты, руки для «Камень, ножницы, бумага». Всё — SVG.

let uid = 0;

// ---------- моментик ----------
export function coinSVG(size = 22, cls = '') {
  const id = 'cg' + (++uid);
  return `<svg class="coin ${cls}" width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true">
    <defs>
      <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE59A"/><stop offset=".55" stop-color="#F6C25B"/><stop offset="1" stop-color="#E39A3B"/></linearGradient>
    </defs>
    <circle cx="20" cy="20" r="18" fill="url(#${id})"/>
    <circle cx="20" cy="20" r="18" fill="none" stroke="#C27B2A" stroke-width="1.6" opacity=".55"/>
    <circle cx="20" cy="20" r="13.5" fill="none" stroke="#FFF3C9" stroke-width="1.4" opacity=".75"/>
    <path d="M20 28.2s-7-4.3-7-9.2c0-2.2 1.6-3.8 3.6-3.8 1.4 0 2.6.8 3.4 1.9.8-1.1 2-1.9 3.4-1.9 2 0 3.6 1.6 3.6 3.8 0 4.9-7 9.2-7 9.2z" fill="#FFF6DA" stroke="#C27B2A" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M9.5 13.5a12 12 0 0 1 6-5.2" stroke="#fff" stroke-width="2" stroke-linecap="round" fill="none" opacity=".7"/>
  </svg>`;
}

// ---------- масти ----------
const SUIT_PATH = {
  H: 'M12 21s-8.5-5.4-8.5-11.4C3.5 6.9 5.4 5 7.8 5c1.8 0 3.3 1 4.2 2.4C12.9 6 14.4 5 16.2 5c2.4 0 4.3 1.9 4.3 4.6C20.5 15.6 12 21 12 21z',
  D: 'M12 2.5l7.2 9.5L12 21.5 4.8 12z',
  S: 'M12 2.8s8.6 6.3 8.6 11.5c0 2.7-2 4.5-4.3 4.5-1.6 0-2.9-.8-3.6-2l1 4.7H10.3l1-4.7c-.7 1.2-2 2-3.6 2-2.3 0-4.3-1.8-4.3-4.5C3.4 9.1 12 2.8 12 2.8z',
  C: 'M12 3.2a4.2 4.2 0 0 1 3.9 5.8 4.2 4.2 0 1 1-2.6 7.4l1 4.4H9.7l1-4.4a4.2 4.2 0 1 1-2.6-7.4A4.2 4.2 0 0 1 12 3.2z',
};
export const RED = { H: 1, D: 1 };
export const SUIT_NAME = { S: 'пики', C: 'трефы', D: 'бубны', H: 'черви' };

export function suitSVG(s, size = 14, cls = '') {
  return `<svg class="suit ${RED[s] ? 'red' : 'black'} ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="${SUIT_PATH[s]}" fill="currentColor"/></svg>`;
}

const RANK_LABEL = { J: 'В', Q: 'Д', K: 'К', A: 'Т' };
export const rankOf = (c) => c.slice(0, -1);
export const suitOf = (c) => c.slice(-1);
export const rankLabel = (r) => RANK_LABEL[r] || r;

// ---------- карта ----------
function pips(s, r) {
  const n = { 6: 6, 7: 7, 8: 8, 9: 9, 10: 10 }[r];
  const P = {
    6: [[30, 26], [70, 26], [30, 70], [70, 70], [30, 114], [70, 114]],
    7: [[30, 26], [70, 26], [50, 48], [30, 70], [70, 70], [30, 114], [70, 114]],
    8: [[30, 26], [70, 26], [50, 48], [30, 70], [70, 70], [50, 92], [30, 114], [70, 114]],
    9: [[30, 24], [70, 24], [30, 55], [70, 55], [50, 70], [30, 85], [70, 85], [30, 116], [70, 116]],
    10: [[30, 24], [70, 24], [50, 40], [30, 55], [70, 55], [30, 85], [70, 85], [50, 100], [30, 116], [70, 116]],
  }[n];
  return P.map(([x, y]) => `<g transform="translate(${x - 9} ${y - 9}) ${y > 72 ? `rotate(180 9 9)` : ''}"><path d="${SUIT_PATH[s]}" transform="scale(.75)" fill="currentColor"/></g>`).join('');
}

function face(s, r) {
  // фигура: рамка, большая буква и масть — аккуратно, без копирования классических рисунков
  const big = { J: 'В', Q: 'Д', K: 'К' }[r];
  return `<rect x="20" y="20" width="60" height="100" rx="8" fill="currentColor" opacity=".08"/>
    <rect x="20" y="20" width="60" height="100" rx="8" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".45"/>
    <path d="M36 44l5 7 9-11 9 11 5-7-2 16H38z" fill="currentColor" opacity=".85"/>
    <text x="50" y="92" text-anchor="middle" font-family="Manrope, sans-serif" font-weight="800" font-size="34" fill="currentColor">${big}</text>
    <g transform="translate(41 98)"><path d="${SUIT_PATH[s]}" transform="scale(.75)" fill="currentColor"/></g>`;
}

function ace(s) {
  return `<g transform="translate(26 46)"><path d="${SUIT_PATH[s]}" transform="scale(2)" fill="currentColor"/></g>`;
}

export function cardSVG(c, cls = '') {
  const s = suitOf(c), r = rankOf(c);
  const mid = r === 'A' ? ace(s) : ['J', 'Q', 'K'].includes(r) ? face(s, r) : pips(s, r);
  const lbl = rankLabel(r);
  return `<svg class="pcard ${RED[s] ? 'red' : 'black'} ${cls}" viewBox="0 0 100 140" data-card="${c}" aria-label="${lbl} ${SUIT_NAME[s]}">
    <rect x="1" y="1" width="98" height="138" rx="10" class="pc-bg"/>
    <g class="pc-ink">
      <text x="9" y="22" font-family="Manrope, sans-serif" font-weight="800" font-size="${lbl.length > 1 ? 17 : 19}" fill="currentColor">${lbl}</text>
      <g transform="translate(8.5 26)"><path d="${SUIT_PATH[s]}" transform="scale(.6)" fill="currentColor"/></g>
      <g transform="rotate(180 50 70)">
        <text x="9" y="22" font-family="Manrope, sans-serif" font-weight="800" font-size="${lbl.length > 1 ? 17 : 19}" fill="currentColor">${lbl}</text>
        <g transform="translate(8.5 26)"><path d="${SUIT_PATH[s]}" transform="scale(.6)" fill="currentColor"/></g>
      </g>
      <g transform="translate(0 0)">${mid}</g>
    </g>
  </svg>`;
}

export function cardBackSVG(cls = '') {
  const id = 'cb' + (++uid);
  return `<svg class="pcard back ${cls}" viewBox="0 0 100 140" aria-hidden="true">
    <defs><pattern id="${id}" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="14" height="14" fill="transparent"/><path d="M0 7h14M7 0v14" stroke="rgba(255,255,255,.14)" stroke-width="1.2"/></pattern></defs>
    <rect x="1" y="1" width="98" height="138" rx="10" class="pb-bg"/>
    <rect x="8" y="8" width="84" height="124" rx="7" fill="url(#${id})" stroke="rgba(255,255,255,.35)" stroke-width="1.4"/>
    <path d="M50 84s-14-8.6-14-18.2c0-4.3 3.1-7.4 7-7.4 2.9 0 5.4 1.6 7 3.9 1.6-2.3 4.1-3.9 7-3.9 3.9 0 7 3.1 7 7.4C64 75.4 50 84 50 84z" fill="rgba(255,255,255,.85)"/>
  </svg>`;
}

// ---------- руки для КНБ ----------
const SKIN = '#F6D2B8', SKIN2 = '#E9B796', INK = '#5A3A33';
const O = `stroke="${INK}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"`;

function fist() {
  return `<path d="M22 50c0-10 6-16 14-17h30c8 0 13 5 13 12v14c0 13-9 21-22 21H40c-11 0-18-8-18-18z" fill="${SKIN}" ${O}/>
    <path d="M38 34c-3-6 2-11 8-10l20 2c6 1 8 5 6 9" fill="${SKIN}" ${O}/>
    <path d="M46 34v10M57 34v10M67 35v9" ${O} fill="none"/>
    <path d="M22 54c6-3 14-2 18 3s3 11-3 13" fill="${SKIN2}" ${O}/>
    <path d="M58 80v10H38V78" fill="${SKIN}" ${O}/>`;
}
function palm() {
  return `<path d="M40 84v8h22v-8" fill="${SKIN}" ${O}/>
    <path d="M33 62L20 50a5 5 0 0 1 7-7.2l12 11" fill="${SKIN}" ${O}/>
    <rect x="31" y="22" width="10.5" height="38" rx="5.2" fill="${SKIN}" ${O}/>
    <rect x="42" y="12" width="10.5" height="44" rx="5.2" fill="${SKIN}" ${O}/>
    <rect x="53" y="14" width="10.5" height="42" rx="5.2" fill="${SKIN}" ${O}/>
    <rect x="64" y="24" width="10.5" height="36" rx="5.2" fill="${SKIN}" ${O}/>
    <path d="M30 50h45v12c0 14-9 23-22 23h-2c-12 0-21-9-21-21z" fill="${SKIN}" ${O}/>
    <path d="M36 54c3-2 7-2 9 1" fill="none" stroke="${SKIN2}" stroke-width="3" stroke-linecap="round"/>`;
}
function scissors() {
  return `<path d="M24 56c0-9 6-14 13-14h29c8 0 12 5 12 11v12c0 12-8 19-20 19H40c-10 0-16-8-16-17z" fill="${SKIN}" ${O}/>
    <path d="M38 44L30 14a5 5 0 0 1 9.6-2.6L48 42" fill="${SKIN}" ${O}/>
    <path d="M50 42l9-30a5 5 0 0 1 9.6 2.8L60 44" fill="${SKIN}" ${O}/>
    <path d="M58 52v9M68 52v9" ${O} fill="none"/>
    <path d="M24 60c6-3 13-2 17 3" fill="none" ${O}/>
    <path d="M58 84v8H40v-8" fill="${SKIN}" ${O}/>`;
}
export const RPS = { rock: 'Камень', scissors: 'Ножницы', paper: 'Бумага' };
export function handSVG(kind, size = 96, cls = '') {
  const body = kind === 'rock' ? fist() : kind === 'paper' ? palm() : scissors();
  return `<svg class="hand ${cls}" width="${size}" height="${size}" viewBox="0 0 100 100" aria-label="${RPS[kind]}">${body}</svg>`;
}
export function handWaitSVG(size = 96) {
  return `<svg class="hand wait" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true">
    <circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="6 9" opacity=".5"/>
    <text x="50" y="62" text-anchor="middle" font-family="Manrope, sans-serif" font-weight="800" font-size="34" fill="currentColor" opacity=".6">?</text></svg>`;
}
