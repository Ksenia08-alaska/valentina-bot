// Мы двое — нарисованные человечки (оригинальные, в мягком «открыточном» стиле).
// Она — светло-русые длинные волосы, он — короткие каштановые, пока служит — в форме.

const SKIN = '#FFE2D2', SKIN_D = '#D99A86', INK = '#3B2B33', BLUSH = '#FF94AE';

function face(x, y, r, { happy = true, wink = false } = {}) {
  const ex = r * 0.36, ey = y + r * 0.12, er = r * 0.1;
  const eye = (cx, closed) => closed
    ? `<path d="M${cx - er * 1.2},${ey} q${er * 1.2},${-er * 1.6} ${er * 2.4},0" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`
    : `<ellipse cx="${cx}" cy="${ey}" rx="${er}" ry="${er * 1.2}" fill="${INK}"/><circle cx="${cx + er * 0.35}" cy="${ey - er * 0.45}" r="${er * 0.42}" fill="#fff"/>`;
  return eye(x - ex, happy) + eye(x + ex, happy && !wink ? true : wink)
    + `<ellipse cx="${x - r * 0.58}" cy="${y + r * 0.38}" rx="${r * 0.15}" ry="${r * 0.09}" fill="${BLUSH}" opacity=".7"/>`
    + `<ellipse cx="${x + r * 0.58}" cy="${y + r * 0.38}" rx="${r * 0.15}" ry="${r * 0.09}" fill="${BLUSH}" opacity=".7"/>`
    + `<path d="M${x - r * 0.12},${y + r * 0.36} q${r * 0.12},${r * 0.14} ${r * 0.24},0" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`;
}

function limb(d, color, outline, w = 7) {
  return `<path d="${d}" fill="none" stroke="${outline}" stroke-width="${w + 4.4}" stroke-linecap="round" stroke-linejoin="round"/>`
    + `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

// arm: 'down' | 'hold' (рука к партнёру) | 'up' (машет) | 'hug'
export function girl({ x = 0, y = 0, s = 1, arm = 'hold', flip = false, happy = true, cls = '' } = {}) {
  const hairC = '#F4D898', hairD = '#C79F55', dress = '#FF9DB6', dressD = '#D9627F';
  const r = 34, hy = -96;
  const armD = arm === 'hold' ? 'M12,-54 Q26,-44 36,-40'
    : arm === 'up' ? 'M12,-54 Q28,-66 30,-84'
      : arm === 'hug' ? 'M12,-54 Q30,-58 38,-62' : 'M12,-54 Q18,-40 18,-30';
  return `<g class="${cls}"><g transform="translate(${x},${y}) scale(${flip ? -s : s},${s})">
  <!-- волосы сзади -->
  <path d="M${-r - 2},${hy} Q${-r - 8},${hy + 52} ${-r + 2},${hy + 64} Q${-r + 14},${hy + 70} ${-r + 18},${hy + 50} L${r - 18},${hy + 50} Q${r - 14},${hy + 70} ${r - 2},${hy + 64} Q${r + 8},${hy + 52} ${r + 2},${hy} Q${r},${hy - r - 6} 0,${hy - r - 6} Q${-r},${hy - r - 6} ${-r - 2},${hy}Z" fill="${hairC}" stroke="${hairD}" stroke-width="3" stroke-linejoin="round"/>
  <!-- ножки -->
  ${limb('M-8,-16 L-8,-4', SKIN, SKIN_D, 7)}${limb('M8,-16 L8,-4', SKIN, SKIN_D, 7)}
  <ellipse cx="-9" cy="-1" rx="8" ry="4.5" fill="#E8607E" stroke="${INK}" stroke-width="2"/><ellipse cx="9" cy="-1" rx="8" ry="4.5" fill="#E8607E" stroke="${INK}" stroke-width="2"/>
  <!-- платье -->
  ${limb('M-12,-54 Q-20,-44 -20,-32', SKIN, SKIN_D, 7)}
  <path d="M-13,-62 Q0,-58 13,-62 L28,-18 Q0,-10 -28,-18Z" fill="${dress}" stroke="${dressD}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M-24,-24 Q0,-17 24,-24" fill="none" stroke="#fff" stroke-width="2.6" stroke-dasharray="1 6" stroke-linecap="round" opacity=".9"/>
  <path d="M-6,-60 L0,-54 L6,-60" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
  ${limb(armD, SKIN, SKIN_D, 7)}
  <!-- голова -->
  <circle cx="0" cy="${hy}" r="${r}" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="3"/>
  ${face(0, hy + 2, r, { happy })}
  <!-- чёлка -->
  <path d="M${-r - 1},${hy + 4} Q${-r - 2},${hy - r - 4} 0,${hy - r - 3} Q${r + 2},${hy - r - 4} ${r + 1},${hy + 4} Q${r - 6},${hy - 14} ${r - 16},${hy - 16} Q${r - 22},${hy - 6} ${r - 30},${hy - 18} Q${-6},${hy - 8} ${-12},${hy - 20} Q${-22},${hy - 8} ${-r + 8},${hy - 14} Q${-r + 2},${hy - 6} ${-r - 1},${hy + 4}Z" fill="${hairC}" stroke="${hairD}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M-14,${hy - r + 6} q8,-4 16,-2" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".6" fill="none"/>
  <!-- бантик -->
  <g transform="translate(${r - 6},${hy - r + 6}) rotate(25)"><path d="M0,0 L-11,-7 Q-13,0 -11,7Z M0,0 L11,-7 Q13,0 11,7Z" fill="#FF6F9A" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><circle r="3.6" fill="#FF4F86" stroke="${INK}" stroke-width="1.8"/></g>
</g></g>`;
}

export function boy({ x = 0, y = 0, s = 1, arm = 'hold', flip = false, uniform = true, happy = true, walk = false, cls = '' } = {}) {
  const hairC = '#7B4A2B', hairD = '#4A2B17';
  const shirt = uniform ? '#7E9160' : '#7FB4E8', shirtD = uniform ? '#4C5C35' : '#3F78B5';
  const pants = uniform ? '#61714A' : '#4E5B78', boots = uniform ? '#3E3530' : '#F2F2F2';
  const r = 33, hy = -100;
  const armD = arm === 'hold' ? 'M-13,-56 Q-26,-46 -36,-40'
    : arm === 'up' ? 'M-13,-56 Q-28,-68 -30,-86'
      : arm === 'hug' ? 'M-13,-56 Q-30,-60 -38,-64' : 'M-13,-56 Q-19,-42 -19,-32';
  const legL = walk ? 'M-7,-20 L-11,-4' : 'M-7,-20 L-7,-4';
  const legR = walk ? 'M7,-20 L11,-4' : 'M7,-20 L7,-4';
  return `<g class="${cls}"><g transform="translate(${x},${y}) scale(${flip ? -s : s},${s})">
  ${limb(legL, pants, INK, 9)}${limb(legR, pants, INK, 9)}
  <ellipse cx="${walk ? -12 : -8}" cy="-1" rx="9" ry="5" fill="${boots}" stroke="${INK}" stroke-width="2.2"/><ellipse cx="${walk ? 12 : 8}" cy="-1" rx="9" ry="5" fill="${boots}" stroke="${INK}" stroke-width="2.2"/>
  ${limb('M13,-56 Q19,-42 19,-32', shirt, shirtD, 9)}
  <path d="M-15,-64 Q0,-60 15,-64 L19,-18 Q0,-14 -19,-18Z" fill="${shirt}" stroke="${shirtD}" stroke-width="3" stroke-linejoin="round"/>
  ${uniform
    ? `<path d="M-18,-26 h36" stroke="#4A3A2A" stroke-width="4"/><rect x="-4" y="-29" width="8" height="6" rx="1.5" fill="#E9C46A" stroke="${INK}" stroke-width="1.5"/>
       <path d="M-6,-62 L0,-52 L6,-62" fill="none" stroke="${shirtD}" stroke-width="2.4" stroke-linejoin="round"/>
       <rect x="-13" y="-50" width="9" height="7" rx="1.5" fill="none" stroke="${shirtD}" stroke-width="2"/><rect x="4" y="-50" width="9" height="7" rx="1.5" fill="none" stroke="${shirtD}" stroke-width="2"/>
       <path d="M-14,-40 l3,-2 l3,2 M-14,-37 l3,-2 l3,2" stroke="#E9C46A" stroke-width="1.6" fill="none"/>`
    : `<path d="M-6,-62 Q0,-56 6,-62" fill="none" stroke="#fff" stroke-width="2.4"/><path transform="translate(0,-40) scale(.8)" d="M0,6 C-9,0 -10,-8 -4.5,-9 C-1.5,-9.5 0,-7 0,-5 C0,-7 1.5,-9.5 4.5,-9 C10,-8 9,0 0,6Z" fill="#FF6F9A"/>`}
  ${limb(armD, shirt, shirtD, 9)}
  <circle cx="${armD.split(' ').pop().split(',')[0]}" cy="${armD.split(' ').pop().split(',')[1]}" r="5" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="2.2"/>
  <circle cx="19" cy="-31" r="5" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="2.2"/>
  <!-- голова -->
  <ellipse cx="${-r + 1}" cy="${hy + 6}" rx="6" ry="8" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="2.6"/>
  <ellipse cx="${r - 1}" cy="${hy + 6}" rx="6" ry="8" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="2.6"/>
  <circle cx="0" cy="${hy}" r="${r}" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="3"/>
  ${face(0, hy + 4, r, { happy })}
  <!-- короткие каштановые волосы -->
  <path d="M${-r + 1},${hy - 2} Q${-r - 2},${hy - r - 6} ${2},${hy - r - 5} Q${r + 3},${hy - r - 4} ${r - 1},${hy - 2} Q${r - 6},${hy - 14} ${r - 12},${hy - 16} L${r - 16},${hy - 10} L${r - 20},${hy - 18} Q${4},${hy - 14} ${-6},${hy - 20} L${-10},${hy - 12} L${-15},${hy - 20} Q${-r + 6},${hy - 14} ${-r + 1},${hy - 2}Z" fill="${hairC}" stroke="${hairD}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M-12,${hy - r + 4} q8,-4 18,-2" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".35" fill="none"/>
  ${uniform ? `<!-- пилотка -->
  <g transform="translate(6,${hy - r + 2}) rotate(-10)"><path d="M-26,4 Q-22,-14 0,-16 Q22,-14 26,4 Q0,-2 -26,4Z" fill="#6F8352" stroke="#43532E" stroke-width="2.8" stroke-linejoin="round"/><path d="M-24,2 Q0,-6 24,2" fill="none" stroke="#43532E" stroke-width="2"/><path transform="translate(0,-6) scale(.55)" d="M0,-9 L2.6,-2.8 L9,-2.8 L3.8,1.2 L5.8,7.6 L0,3.6 L-5.8,7.6 L-3.8,1.2 L-9,-2.8 L-2.6,-2.8Z" fill="#E9C46A" stroke="${INK}" stroke-width="1.6"/></g>` : ''}
</g></g>`;
}

export function heart(x, y, s = 1, fill = '#FF5C8A', cls = '') {
  return `<path class="${cls}" transform="translate(${x},${y}) scale(${s})" d="M0,10 C-15,0 -16,-13 -7.5,-15 C-2.5,-16 0,-12 0,-9 C0,-12 2.5,-16 7.5,-15 C16,-13 15,0 0,10Z" fill="${fill}" stroke="#3B2B33" stroke-width="${2.2 / s}" stroke-linejoin="round"/>`;
}

// Главная сцена: держатся за руки над табличкой со счётчиком (табличка — HTML поверх)
export function coupleHero({ done = false } = {}) {
  return `<svg viewBox="0 0 300 200" class="couple-hero" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse cx="150" cy="186" rx="110" ry="10" fill="#000" opacity=".08"/>
    <g class="float-heart">${heart(150, 46, 1.25, '#FF5C8A')}</g>
    <g class="float-heart h2">${heart(122, 30, 0.6, '#FF9BB7')}</g>
    <g class="float-heart h3">${heart(178, 26, 0.5, '#FFC2D3')}</g>
    ${girl({ x: 112, y: 184, s: 0.98, arm: done ? 'hug' : 'hold', cls: 'sway-l' })}
    ${boy({ x: 190, y: 184, s: 0.98, arm: done ? 'hug' : 'hold', uniform: !done, cls: 'sway-r' })}
  </svg>`;
}

// Полоса пути: он идёт к ней. progress 0..1
export function journey(progress) {
  const p = Math.max(0, Math.min(1, progress));
  const startX = 30, endX = 262;
  const bx = startX + (endX - startX) * p;
  const done = p >= 1;
  const flags = [0.25, 0.5, 0.75].map((m) => {
    const fx = startX + (endX - startX) * m;
    const passed = p >= m;
    return `<g transform="translate(${fx},92)"><path d="M0,0 V-22" stroke="#9A7F8A" stroke-width="2"/><path d="M0,-22 L13,-17 L0,-12Z" fill="${passed ? '#FF6F9A' : '#D9CBD2'}"/><text x="0" y="16" text-anchor="middle" font-size="9" fill="currentColor" opacity=".6">${m * 100}%</text></g>`;
  }).join('');
  return `<svg viewBox="0 26 330 90" class="journey" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M${startX},92 H${endX + 30}" stroke="currentColor" stroke-opacity=".15" stroke-width="6" stroke-linecap="round"/>
    <path d="M${startX},92 H${bx}" stroke="url(#jg)" stroke-width="6" stroke-linecap="round"/>
    <defs><linearGradient id="jg" gradientUnits="userSpaceOnUse" x1="${startX}" y1="0" x2="${endX}" y2="0"><stop offset="0" stop-color="#FFB3C7"/><stop offset="1" stop-color="#FF5C8A"/></linearGradient></defs>
    ${flags}
    <!-- домик -->
    <g transform="translate(${endX + 28},90)"><path d="M-18,0 V-22 L0,-36 L18,-22 V0Z" fill="#FFE3EA" stroke="#C9768D" stroke-width="2.4" stroke-linejoin="round"/><path d="M-22,-20 L0,-40 L22,-20" fill="none" stroke="#E25579" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><rect x="-5" y="-13" width="10" height="13" rx="2" fill="#C9768D"/>${heart(0, -24, 0.35, '#FF5C8A')}</g>
    ${girl({ x: endX + (done ? -2 : 4), y: 95, s: 0.42, arm: done ? 'hug' : 'up', flip: false })}
    ${boy({ x: done ? endX - 18 : bx, y: 95, s: 0.4, arm: done ? 'hug' : 'down', uniform: !done, walk: !done, flip: false, cls: done ? '' : 'walker' })}
  </svg>`;
}
