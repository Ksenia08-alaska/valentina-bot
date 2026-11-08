// Мы двое — современная мягкая иллюстрация (без жёстких контуров).
// Она: длинные тёмно-каштановые волнистые волосы, кремовый свитер, пудровая юбка.
// Он: стритвир — оверсайз-худи, цепь, кепка козырьком назад, карго, массивные кроссовки.

let N = 0;
const SKIN = '#F7D6C6', SKIN_S = '#E8B7A3', LINE = '#4A2F3A';

function grad(id, a, b, vertical = true) {
  return `<linearGradient id="${id}" x1="0" y1="0" x2="${vertical ? 0 : 1}" y2="${vertical ? 1 : 0}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
}

function face(cx, cy, r, { lashes = false, smile = 'soft' } = {}) {
  const ex = r * 0.38, ey = cy + r * 0.12, w = r * 0.2;
  const eye = (x) => `<path d="M${x - w},${ey} q${w},${-w * 0.95} ${w * 2},0" fill="none" stroke="${LINE}" stroke-width="2.3" stroke-linecap="round"/>`
    + (lashes ? `<path d="M${x + (x < cx ? -w : w)},${ey} l${x < cx ? -3 : 3},-2.4" stroke="${LINE}" stroke-width="1.8" stroke-linecap="round"/>` : '');
  return eye(cx - ex) + eye(cx + ex)
    + `<ellipse cx="${cx - r * 0.56}" cy="${cy + r * 0.42}" rx="${r * 0.17}" ry="${r * 0.1}" fill="#F49AAE" opacity=".45"/>`
    + `<ellipse cx="${cx + r * 0.56}" cy="${cy + r * 0.42}" rx="${r * 0.17}" ry="${r * 0.1}" fill="#F49AAE" opacity=".45"/>`
    + (smile === 'open'
      ? `<path d="M${cx - r * 0.16},${cy + r * 0.44} q${r * 0.16},${r * 0.22} ${r * 0.32},0z" fill="#C2566F"/>`
      : `<path d="M${cx - r * 0.13},${cy + r * 0.44} q${r * 0.13},${r * 0.13} ${r * 0.26},0" fill="none" stroke="${LINE}" stroke-width="2.1" stroke-linecap="round"/>`);
}

function arm(d, color, w) {
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
}
function endOf(d) {
  const p = d.trim().split(/[\s,]+/);
  return [+p[p.length - 2], +p[p.length - 1]];
}

// pose: 'hold' (рука к партнёру) | 'down' | 'wave' | 'hug'
// Стиль «без лиц»: взрослые пропорции, чистые формы, мягкие градиенты, только румянец.
const SK_L = '#F8DCCD', SK_D = '#EBC1AD';

function hand(x, y, rot = 0) {
  return `<g transform="translate(${x},${y}) rotate(${rot})"><ellipse rx="4.2" ry="5.2" fill="${SK_L}"/><path d="M-3.2,1.5 q3.2,3 6.4,0" stroke="${SK_D}" stroke-width="1" fill="none" opacity=".7"/></g>`;
}
function sleeve(d, fill, cuff, w = 10) {
  // рукав + манжета (последние ~6px пути)
  return `<path d="${d}" fill="none" stroke="${fill}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`
    + `<path d="${d}" fill="none" stroke="${cuff}" stroke-width="${w}" stroke-linecap="butt" stroke-dasharray="0 1000" />`;
}
function sneaker(x, flip = 1) {
  return `<g transform="translate(${x},0) scale(${flip},1)">
    <path d="M-9,-11 Q-9,-15 -4,-15 L3,-15 Q7,-15 9,-10 Q14,-8 14,-4 L14,-1 L-10,-1 L-10,-6 Z" fill="#FFFFFF"/>
    <rect x="-10.5" y="-3.4" width="25" height="3.6" rx="1.8" fill="#E6E1E8"/>
    <path d="M-3,-14 L-1,-10 M0,-14.5 L2,-10.5 M3,-14.5 L5,-10.5" stroke="#D9D2DC" stroke-width=".9" stroke-linecap="round"/>
    <path d="M5,-7 Q9,-8 12,-5" stroke="#F2A1B5" stroke-width="1.4" fill="none" stroke-linecap="round"/></g>`;
}

export function girl({ x = 0, y = 0, s = 1, pose = 'hold', cls = '' } = {}) {
  const id = 'g' + (++N);
  const armR = pose === 'hold' ? 'M15,-172 Q22,-152 27,-133' : pose === 'wave' ? 'M15,-172 Q28,-182 30,-205'
    : pose === 'hug' ? 'M15,-172 Q30,-168 40,-164' : 'M15,-172 Q19,-152 19,-131';
  const [hx, hy] = endOf(armR);
  return `<g class="${cls}"><g transform="translate(${x},${y}) scale(${s})">
  <defs>
    ${grad(id + 'h', '#DDB98B', '#B48A59')}${grad(id + 'hf', '#E3C394', '#C29A68')}
    ${grad(id + 's', '#F7EEE4', '#E8D9C9')}${grad(id + 'j', '#C2D2EA', '#9FB3D5')}
    ${grad(id + 'f', SK_L, '#F2CDBB')}
  </defs>
  <!-- волосы сзади -->
  <path d="M0,-226 C-19,-226 -21,-208 -20,-190 C-21,-170 -22,-150 -21,-128 Q-17,-122 -12,-127 Q-8,-121 -4,-126 L4,-126 Q8,-121 12,-127 Q17,-122 21,-128 C22,-150 21,-170 20,-190 C21,-208 19,-226 0,-226Z" fill="url(#${id}h)"/>
  <!-- джинсы -->
  <path d="M-17,-122 L-1,-122 L-2,-12 L-19,-12 Z" fill="url(#${id}j)"/>
  <path d="M1,-122 L17,-122 L19,-12 L2,-12 Z" fill="url(#${id}j)"/>
  <path d="M-1.5,-118 L-2,-12 M1.5,-118 L2,-12" stroke="#8EA2C6" stroke-width="1"/>
  <path d="M-15,-110 L-17,-14 M15,-110 L17,-14" stroke="#D3DEEF" stroke-width="1" opacity=".8"/>
  <path d="M-12,-70 q2,-3 5,-2 M8,-74 q2,-3 5,-1" stroke="#8EA2C6" stroke-width=".9" fill="none" opacity=".7"/>
  ${sneaker(-10, -1)}${sneaker(10, 1)}
  <!-- шея -->
  <path d="M-5,-190 L5,-190 L5.5,-178 L-5.5,-178Z" fill="${SK_D}"/>
  <!-- левый рукав (свисает) -->
  <path d="M-15,-172 Q-21,-152 -21,-131" fill="none" stroke="url(#${id}s)" stroke-width="10" stroke-linecap="round"/>
  <path d="M-21.3,-137 L-21,-131" stroke="#E2D1BF" stroke-width="10" stroke-linecap="round"/>
  ${hand(-21, -125, 6)}
  <!-- свитер -->
  <path d="M-18,-181 Q-8,-185 0,-184 Q8,-185 18,-181 Q22,-165 21,-150 Q21,-134 19,-120 Q0,-116 -19,-120 Q-21,-134 -21,-150 Q-22,-165 -18,-181Z" fill="url(#${id}s)"/>
  <path d="M-19,-124 Q0,-120 19,-124" stroke="#E0CDB9" stroke-width="5" fill="none" opacity=".9"/>
  <path d="M-17,-124 v4 M-12,-123.4 v4 M-7,-123 v4 M-2,-122.8 v4 M3,-122.8 v4 M8,-123 v4 M13,-123.4 v4 M18,-124 v4" stroke="#D7C3AE" stroke-width=".8"/>
  <path d="M-7,-184 Q0,-179 7,-184" stroke="#E0CDB9" stroke-width="3" fill="none"/>
  <path d="M-12,-160 q4,6 2,14 M11,-158 q-3,7 -1,15" stroke="#E2D2C1" stroke-width="1.2" fill="none"/>
  <!-- правый рукав -->
  <path d="${armR}" fill="none" stroke="url(#${id}s)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
  ${hand(hx + (pose === 'hold' ? 1 : 0), hy + 5, pose === 'hold' ? -20 : 0)}
  <!-- голова -->
  <path d="M0,-226 C9.5,-226 15.5,-219 15.5,-208 C15.5,-197.5 9,-189 0,-188 C-9,-189 -15.5,-197.5 -15.5,-208 C-15.5,-219 -9.5,-226 0,-226Z" fill="url(#${id}f)"/>
  <ellipse cx="-8.5" cy="-202" rx="4.2" ry="2.5" fill="#F4A3B4" opacity=".45"/><ellipse cx="8.5" cy="-202" rx="4.2" ry="2.5" fill="#F4A3B4" opacity=".45"/>
  <!-- волосы спереди: прямой пробор -->
  <path d="M0,-228 C-12,-228 -19,-221 -19.5,-208 C-20,-196 -19,-184 -18,-170 Q-16,-166 -14,-171 C-14.5,-186 -14.5,-198 -12,-210 Q-7,-221 0,-224Z" fill="url(#${id}hf)"/>
  <path d="M0,-228 C12,-228 19,-221 19.5,-208 C20,-196 19,-184 18,-170 Q16,-166 14,-171 C14.5,-186 14.5,-198 12,-210 Q7,-221 0,-224Z" fill="url(#${id}hf)"/>
  <path d="M-4,-224 Q-14,-216 -16.5,-196 M4,-224 Q14,-216 16.5,-196 M-9,-223 Q-17,-212 -17.5,-188" stroke="#EED4AC" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".8"/>
  <path d="M0,-228 L0,-223" stroke="#A9804F" stroke-width="1" opacity=".6"/>
</g></g>`;
}

export function boy({ x = 0, y = 0, s = 1, pose = 'hold', walk = false, cls = '' } = {}) {
  const id = 'b' + (++N);
  const armL = pose === 'hold' ? 'M-18,-188 Q-27,-162 -32,-138' : pose === 'hug' ? 'M-18,-188 Q-34,-182 -44,-176'
    : pose === 'wave' ? 'M-18,-188 Q-32,-198 -34,-222' : 'M-18,-188 Q-23,-164 -23,-140';
  const [hx, hy] = endOf(armL);
  const lx = walk ? 3 : 0;
  return `<g class="${cls}"><g transform="translate(${x},${y}) scale(${s})">
  <defs>
    ${grad(id + 'h', '#3A3641', '#28252E')}${grad(id + 'p', '#62656F', '#4B4E57')}
    ${grad(id + 'r', '#8A5A3B', '#5C3825')}${grad(id + 'f', SK_L, '#F2CDBB')}
  </defs>
  <!-- брюки -->
  <path d="M-19,-130 L-1,-130 L${-2 - lx},-12 L${-20 - lx},-12 Z" fill="url(#${id}p)"/>
  <path d="M1,-130 L19,-130 L${20 + lx},-12 L${2 + lx},-12 Z" fill="url(#${id}p)"/>
  <path d="M-1.5,-126 L${-2 - lx},-12 M1.5,-126 L${2 + lx},-12" stroke="#42444C" stroke-width="1"/>
  <path d="M-17,-118 L${-19 - lx},-14 M17,-118 L${19 + lx},-14" stroke="#73767F" stroke-width="1" opacity=".8"/>
  <path d="M${-20 - lx},-16 h18 M${2 + lx},-16 h18" stroke="#42444C" stroke-width="2" opacity=".6"/>
  ${sneaker(-11 - lx, -1)}${sneaker(11 + lx, 1)}
  <!-- шея -->
  <path d="M-6,-206 L6,-206 L6.5,-192 L-6.5,-192Z" fill="${SK_D}"/>
  <!-- капюшон за шеей -->
  <path d="M-14,-196 Q-16,-206 -8,-206 L8,-206 Q16,-206 14,-196 Q0,-188 -14,-196Z" fill="#2E2B35"/>
  <!-- правый рукав (свисает) -->
  <path d="M18,-188 Q23,-164 23,-140" fill="none" stroke="url(#${id}h)" stroke-width="12" stroke-linecap="round"/>
  <path d="M23,-146 L23,-140" stroke="#2A2730" stroke-width="12" stroke-linecap="round"/>
  ${hand(23, -133, -4)}
  <!-- худи -->
  <path d="M-22,-197 Q-10,-201 0,-200 Q10,-201 22,-197 Q26,-178 25,-160 Q25,-144 23,-128 Q0,-124 -23,-128 Q-25,-144 -25,-160 Q-26,-178 -22,-197Z" fill="url(#${id}h)"/>
  <path d="M-12,-197 Q0,-186 12,-197" stroke="#46424F" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M-4,-190 L-4.5,-174 M4,-190 L4.5,-174" stroke="#E9E4EC" stroke-width="1.3" stroke-linecap="round"/>
  <rect x="-5.6" y="-175" width="2.4" height="3.2" rx="1" fill="#C9CDD6"/><rect x="3.4" y="-175" width="2.4" height="3.2" rx="1" fill="#C9CDD6"/>
  <path d="M-13,-153 L13,-153 L16,-136 L-16,-136Z" fill="#2E2B35"/>
  <path d="M-13,-153 L-16,-136 M13,-153 L16,-136" stroke="#46424F" stroke-width="1.2"/>
  <path d="M-23,-132 Q0,-128 23,-132" stroke="#2A2730" stroke-width="5" fill="none"/>
  <path d="M-16,-176 q3,8 1,16 M15,-174 q-3,8 -1,15" stroke="#46424F" stroke-width="1.2" fill="none"/>
  <!-- левый рукав -->
  <path d="${armL}" fill="none" stroke="url(#${id}h)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
  ${hand(hx - (pose === 'hold' ? 1 : 0), hy + 6, pose === 'hold' ? 20 : 0)}
  <!-- уши и голова -->
  <ellipse cx="-16.5" cy="-222" rx="3.2" ry="4.8" fill="${SK_D}"/><ellipse cx="16.5" cy="-222" rx="3.2" ry="4.8" fill="${SK_D}"/>
  <path d="M0,-244 C10.5,-244 17,-236 17,-224 C17,-213 11,-205 0,-204 C-11,-205 -17,-213 -17,-224 C-17,-236 -10.5,-244 0,-244Z" fill="url(#${id}f)"/>
  <ellipse cx="-9" cy="-217" rx="4.2" ry="2.4" fill="#F4A3B4" opacity=".38"/><ellipse cx="9" cy="-217" rx="4.2" ry="2.4" fill="#F4A3B4" opacity=".38"/>
  <!-- короткие каштановые волосы -->
  <path d="M-17.5,-224 C-19,-238 -12,-250 1,-250 C13,-250 19.5,-240 17.5,-224 Q16,-231 13,-234 Q8,-232 4,-235 Q-2,-231 -8,-234 Q-13,-233 -15,-229 Q-16.5,-227 -17.5,-224Z" fill="url(#${id}r)"/>
  <path d="M-8,-246 Q2,-249 10,-244 M-12,-240 Q-4,-244 4,-241" stroke="#A9744F" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".75"/>
</g></g>`;
}

export function heart(x, y, s = 1, fill = '#F2A1B5', cls = '') {
  return `<path class="${cls}" transform="translate(${x},${y}) scale(${s})" d="M0,10 C-15,0 -16,-13 -7.5,-15 C-2.5,-16 0,-12 0,-9 C0,-12 2.5,-16 7.5,-15 C16,-13 15,0 0,10Z" fill="${fill}"/>`;
}

export function coupleHero({ done = false } = {}) {
  return `<svg viewBox="0 -14 300 214" class="couple-hero" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs><radialGradient id="halo" cx=".5" cy=".55" r=".5"><stop offset="0" stop-color="#F2A1B5" stop-opacity=".28"/><stop offset="1" stop-color="#F2A1B5" stop-opacity="0"/></radialGradient></defs>
    <ellipse cx="150" cy="110" rx="140" ry="95" fill="url(#halo)"/>
    <ellipse cx="150" cy="192" rx="70" ry="6" fill="#000" opacity=".18"/>
    <g class="float-heart">${heart(150, 44, 0.62, '#F2A1B5')}</g>
    <g class="float-heart h2">${heart(141, 28, 0.3, '#E9C9A0')}</g>
    <g class="float-heart h3">${heart(156, 14, 0.26, '#C9B3EA')}</g>
    ${girl({ x: 124, y: 192, s: 0.74, pose: done ? 'hug' : 'hold', cls: 'sway-l' })}
    ${boy({ x: 175, y: 192, s: 0.74, pose: done ? 'hug' : 'hold', cls: 'sway-r' })}
  </svg>`;
}

// Полоса пути: он идёт к ней. progress 0..1
export function journey(progress) {
  const p = Math.max(0, Math.min(1, progress));
  const startX = 30, endX = 262;
  const bx = startX + (endX - startX) * p;
  const done = p >= 1;
  const marks = [0.25, 0.5, 0.75].map((m) => {
    const fx = startX + (endX - startX) * m;
    return `<circle cx="${fx}" cy="92" r="${p >= m ? 4.5 : 3.5}" fill="${p >= m ? '#F2A1B5' : 'currentColor'}" fill-opacity="${p >= m ? 1 : 0.25}"/><text x="${fx}" y="108" text-anchor="middle" font-size="9" fill="currentColor" opacity=".5">${m * 100}%</text>`;
  }).join('');
  return `<svg viewBox="0 30 330 86" class="journey" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs><linearGradient id="jg" gradientUnits="userSpaceOnUse" x1="${startX}" y1="0" x2="${endX}" y2="0"><stop offset="0" stop-color="#C9B3EA"/><stop offset="1" stop-color="#F2A1B5"/></linearGradient></defs>
    <path d="M${startX},92 H${endX + 30}" stroke="currentColor" stroke-opacity=".12" stroke-width="5" stroke-linecap="round"/>
    <path d="M${startX},92 H${bx}" stroke="url(#jg)" stroke-width="5" stroke-linecap="round"/>
    ${marks}
    <g transform="translate(${endX + 30},90)"><path d="M-16,0 V-20 L0,-33 L16,-20 V0Z" fill="#F2A1B5" fill-opacity=".22"/><path d="M-19,-18 L0,-35 L19,-18" fill="none" stroke="#F2A1B5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${heart(0, -14, 0.4, '#F2A1B5')}</g>
    ${girl({ x: endX + (done ? 4 : 8), y: 95, s: 0.27, pose: done ? 'hug' : 'wave' })}
    ${boy({ x: done ? endX - 12 : bx, y: 95, s: 0.27, pose: done ? 'hug' : 'down', walk: !done, cls: done ? '' : 'walker' })}
  </svg>`;
}
