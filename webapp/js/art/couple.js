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
export function girl({ x = 0, y = 0, s = 1, pose = 'hold', cls = '' } = {}) {
  const id = 'g' + (++N);
  const r = 27, hy = -142;
  const armD = pose === 'hold' ? 'M14,-104 Q24,-88 33,-78' : pose === 'wave' ? 'M14,-104 Q30,-112 30,-132'
    : pose === 'hug' ? 'M14,-104 Q30,-104 40,-104' : 'M14,-104 Q19,-90 19,-76';
  const [hx2, hy2] = endOf(armD);
  return `<g class="${cls}"><g transform="translate(${x},${y}) scale(${s})">
  <defs>${grad(id + 'h', '#6B4334', '#3B2420')}${grad(id + 'k', '#EAA9B9', '#D98FA3')}${grad(id + 's', '#FBF1E8', '#EEDCCD')}</defs>
  <path d="M${-r - 3},${hy - 4} C${-r - 10},${hy + 30} ${-r - 2},${hy + 46} ${-r - 9},${hy + 66} C${-r - 13},${hy + 80} ${-r + 2},${hy + 92} ${-r + 10},${hy + 84}
           L${r - 10},${hy + 84} C${r - 2},${hy + 92} ${r + 13},${hy + 80} ${r + 9},${hy + 66} C${r + 2},${hy + 46} ${r + 10},${hy + 30} ${r + 3},${hy - 4}
           C${r + 2},${hy - r - 10} ${-r - 2},${hy - r - 10} ${-r - 3},${hy - 4}Z" fill="url(#${id}h)"/>
  <rect x="-10" y="-48" width="7" height="42" rx="3.5" fill="${SKIN}"/><rect x="3" y="-48" width="7" height="42" rx="3.5" fill="${SKIN}"/>
  <path d="M-16,-2 q0,-8 9,-8 q5,0 6,4 l0,6z" fill="#FFFFFF"/><path d="M16,-2 q0,-8 -9,-8 q-5,0 -6,4 l0,6z" fill="#FFFFFF"/>
  <rect x="-17" y="-3" width="16" height="3.4" rx="1.7" fill="#E4D8DE"/><rect x="1" y="-3" width="16" height="3.4" rx="1.7" fill="#E4D8DE"/>
  <path d="M-17,-74 L17,-74 L27,-40 Q0,-34 -27,-40Z" fill="url(#${id}k)"/>
  <path d="M-6,-72 L-10,-38 M6,-72 L10,-38" stroke="#C97E93" stroke-width="1.4" opacity=".5"/>
  ${arm('M-14,-104 Q-21,-90 -20,-76', `url(#${id}s)`, 11)}
  <path d="M-18,-112 Q0,-118 18,-112 Q23,-92 20,-70 Q0,-66 -20,-70 Q-23,-92 -18,-112Z" fill="url(#${id}s)"/>
  <path d="M-19,-73 Q0,-69 19,-73" stroke="#E2CDBC" stroke-width="3" fill="none" stroke-dasharray="1.6 2.4"/>
  <path d="M-7,-113 Q0,-108 7,-113" stroke="#E2CDBC" stroke-width="3" fill="none"/>
  <path transform="translate(9,-96) scale(.32)" d="M0,10 C-15,0 -16,-13 -7.5,-15 C-2.5,-16 0,-12 0,-9 C0,-12 2.5,-16 7.5,-15 C16,-13 15,0 0,10Z" fill="#E68FA5"/>
  ${arm(armD, `url(#${id}s)`, 11)}
  <circle cx="${hx2}" cy="${hy2}" r="4.6" fill="${SKIN}"/><circle cx="-20" cy="-74" r="4.6" fill="${SKIN}"/>
  <rect x="-5" y="${hy + 20}" width="10" height="12" rx="4" fill="${SKIN_S}"/>
  <ellipse cx="0" cy="${hy}" rx="${r}" ry="${r * 1.04}" fill="${SKIN}"/>
  ${face(0, hy + 2, r, { lashes: true })}
  <path d="M0,${hy - r - 4} C${-r - 4},${hy - r - 4} ${-r - 6},${hy - 6} ${-r - 2},${hy + 26} C${-r + 2},${hy + 34} ${-r + 6},${hy + 30} ${-r + 5},${hy + 18}
           C${-r + 4},${hy + 2} ${-r + 6},${hy - 12} ${-8},${hy - r + 6} Q${-2},${hy - r + 2} 0,${hy - r - 1}
           Q${2},${hy - r + 2} ${8},${hy - r + 6} C${r - 6},${hy - 12} ${r - 4},${hy + 2} ${r - 5},${hy + 18}
           C${r - 6},${hy + 30} ${r - 2},${hy + 34} ${r + 2},${hy + 26} C${r + 6},${hy - 6} ${r + 4},${hy - r - 4} 0,${hy - r - 4}Z" fill="url(#${id}h)"/>
  <path d="M-14,${hy - r + 4} q-8,10 -9,24 M15,${hy - r + 6} q7,8 8,20" stroke="#8A5A46" stroke-width="2" fill="none" stroke-linecap="round" opacity=".55"/>
  <circle cx="${-r + 1}" cy="${hy + 10}" r="1.8" fill="#F1D6A0"/><circle cx="${r - 1}" cy="${hy + 10}" r="1.8" fill="#F1D6A0"/>
</g></g>`;
}

export function boy({ x = 0, y = 0, s = 1, pose = 'hold', walk = false, cls = '' } = {}) {
  const id = 'b' + (++N);
  const r = 27, hy = -150;
  const armD = pose === 'hold' ? 'M-17,-112 Q-28,-94 -34,-82' : pose === 'hug' ? 'M-17,-112 Q-32,-112 -42,-110'
    : pose === 'wave' ? 'M-17,-112 Q-34,-120 -34,-140' : 'M-17,-112 Q-24,-96 -23,-80';
  const [hx2, hy2] = endOf(armD);
  const lx = walk ? 4 : 0;
  return `<g class="${cls}"><g transform="translate(${x},${y}) scale(${s})">
  <defs>${grad(id + 'h', '#45414E', '#2A2731')}${grad(id + 'p', '#5E616B', '#464851')}${grad(id + 'r', '#7A4E35', '#4E3122')}</defs>
  <path d="M-19,-70 L-2,-70 L${-3 - lx},-10 L${-21 - lx},-10Z" fill="url(#${id}p)"/>
  <path d="M2,-70 L19,-70 L${21 + lx},-10 L${3 + lx},-10Z" fill="url(#${id}p)"/>
  <rect x="${-20 - lx / 2}" y="-44" width="8" height="10" rx="2" fill="#3F4149" opacity=".7"/><rect x="${12 + lx / 2}" y="-44" width="8" height="10" rx="2" fill="#3F4149" opacity=".7"/>
  <g transform="translate(${-lx},0)"><path d="M-25,-3 q0,-10 12,-10 q8,0 10,5 l0,5z" fill="#FFFFFF"/><rect x="-26" y="-4" width="24" height="5" rx="2.5" fill="#E7E2E8"/><path d="M-20,-9 q5,-2 9,1" stroke="#E68FA5" stroke-width="2" fill="none" stroke-linecap="round"/></g>
  <g transform="translate(${lx},0)"><path d="M25,-3 q0,-10 -12,-10 q-8,0 -10,5 l0,5z" fill="#FFFFFF"/><rect x="2" y="-4" width="24" height="5" rx="2.5" fill="#E7E2E8"/><path d="M20,-9 q-5,-2 -9,1" stroke="#E68FA5" stroke-width="2" fill="none" stroke-linecap="round"/></g>
  ${arm('M17,-112 Q25,-96 24,-80', `url(#${id}h)`, 14)}
  <path d="M-22,-120 Q0,-126 22,-120 Q29,-96 26,-66 Q0,-61 -26,-66 Q-29,-96 -22,-120Z" fill="url(#${id}h)"/>
  <path d="M-14,-122 Q0,-110 14,-122 Q12,-128 0,-128 Q-12,-128 -14,-122Z" fill="#3A3642"/>
  <path d="M-4,-114 v12 M4,-114 v12" stroke="#ECE6EE" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M-12,-84 h24 l-3,12 h-18z" fill="#36333F"/>
  <path d="M-25,-69 Q0,-64 25,-69" stroke="#24212A" stroke-width="3" fill="none"/>
  <path d="M-11,-121 Q0,-100 11,-121" stroke="#DCDFE6" stroke-width="2.2" fill="none" stroke-dasharray="2.4 1.4"/>
  <path transform="translate(0,-104) scale(.3)" d="M0,10 C-15,0 -16,-13 -7.5,-15 C-2.5,-16 0,-12 0,-9 C0,-12 2.5,-16 7.5,-15 C16,-13 15,0 0,10Z" fill="#F2B8C6"/>
  ${arm(armD, `url(#${id}h)`, 14)}
  <circle cx="${hx2}" cy="${hy2}" r="5" fill="${SKIN}"/><circle cx="24" cy="-78" r="5" fill="${SKIN}"/>
  <rect x="-6" y="${hy + 20}" width="12" height="12" rx="4" fill="${SKIN_S}"/>
  <ellipse cx="${-r + 1}" cy="${hy + 6}" rx="4.5" ry="6" fill="${SKIN_S}"/><ellipse cx="${r - 1}" cy="${hy + 6}" rx="4.5" ry="6" fill="${SKIN_S}"/>
  <circle cx="${r - 1}" cy="${hy + 11}" r="1.8" fill="#DCDFE6"/>
  <ellipse cx="0" cy="${hy}" rx="${r}" ry="${r * 1.03}" fill="${SKIN}"/>
  ${face(0, hy + 3, r, {})}
  <path d="M${-r + 1},${hy - 4} Q${-r + 1},${hy - 18} 0,${hy - 19} Q${r - 1},${hy - 18} ${r - 1},${hy - 4} Q${r - 5},${hy - 12} ${r - 12},${hy - 11} Q${r - 18},${hy - 7} ${4},${hy - 10} Q${-4},${hy - 6} ${-10},${hy - 11} Q${-r + 8},${hy - 13} ${-r + 1},${hy - 4}Z" fill="url(#${id}r)"/>
  <path d="M${-r - 1},${hy - 12} C${-r - 1},${hy - r - 14} ${r + 1},${hy - r - 14} ${r + 1},${hy - 12} Q0,${hy - 20} ${-r - 1},${hy - 12}Z" fill="#26232C"/>
  <path d="M${r - 4},${hy - 22} q12,-6 22,-2 q-8,6 -20,8z" fill="#1D1B22"/>
  <path d="M-6,${hy - 17} q6,-4 12,0" stroke="#7A4E35" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M-12,${hy - r - 2} q8,-4 16,-3" stroke="#FFFFFF" stroke-width="2" fill="none" stroke-linecap="round" opacity=".18"/>
</g></g>`;
}

export function heart(x, y, s = 1, fill = '#F2A1B5', cls = '') {
  return `<path class="${cls}" transform="translate(${x},${y}) scale(${s})" d="M0,10 C-15,0 -16,-13 -7.5,-15 C-2.5,-16 0,-12 0,-9 C0,-12 2.5,-16 7.5,-15 C16,-13 15,0 0,10Z" fill="${fill}"/>`;
}

export function coupleHero({ done = false } = {}) {
  return `<svg viewBox="0 -18 300 218" class="couple-hero" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs><radialGradient id="halo" cx=".5" cy=".55" r=".5"><stop offset="0" stop-color="#F2A1B5" stop-opacity=".28"/><stop offset="1" stop-color="#F2A1B5" stop-opacity="0"/></radialGradient></defs>
    <ellipse cx="150" cy="110" rx="140" ry="95" fill="url(#halo)"/>
    <ellipse cx="150" cy="190" rx="92" ry="7" fill="#000" opacity=".16"/>
    <g class="float-heart">${heart(150, -2, 0.95, '#F2A1B5')}</g>
    <g class="float-heart h2">${heart(124, -8, 0.45, '#E9C9A0')}</g>
    <g class="float-heart h3">${heart(176, -10, 0.4, '#C9B3EA')}</g>
    ${girl({ x: 116, y: 190, s: 1.02, pose: done ? 'hug' : 'hold', cls: 'sway-l' })}
    ${boy({ x: 186, y: 190, s: 1.0, pose: done ? 'hug' : 'hold', cls: 'sway-r' })}
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
    ${girl({ x: endX + (done ? 4 : 8), y: 95, s: 0.36, pose: done ? 'hug' : 'wave' })}
    ${boy({ x: done ? endX - 12 : bx, y: 95, s: 0.35, pose: done ? 'hug' : 'down', walk: !done, cls: done ? '' : 'walker' })}
  </svg>`;
}
