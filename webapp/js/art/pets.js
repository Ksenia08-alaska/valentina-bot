// Рисованные питомцы (чистый SVG, без стикеров и эмодзи).
// petSVG(species, {stage: 0..6, mood: 'happy'|'love'|'sleep'|'hungry'|'sad'|'dirty'|'tired'|'eat'})

const PAL = {
  cat_ginger:  { main: '#F7A24E', dark: '#B8621F', belly: '#FFE9CF', mark: '#E37E2C', nose: '#F27A8A', inner: '#FFC2C7' },
  cat_gray:    { main: '#AEB6C8', dark: '#646C82', belly: '#F1F2F7', mark: '#8A93A8', nose: '#E98597', inner: '#F6C6D0' },
  cat_white:   { main: '#FFFFFF', dark: '#B59AA6', belly: '#FFF7F2', mark: '#F5B871', nose: '#F28AA0', inner: '#FFD0DA' },
  dog_corgi:   { main: '#F3A65E', dark: '#B0652A', belly: '#FFF7EC', mark: '#E58C42', nose: '#4A3530', inner: '#FFC9B5' },
  dog_samoyed: { main: '#FFFFFF', dark: '#B4A49A', belly: '#FFF9F2', mark: '#F1E6DA', nose: '#3F3434', inner: '#FFD3D3' },
  hamster:     { main: '#F5C27E', dark: '#B37A35', belly: '#FFF6E6', mark: '#EAA85A', nose: '#F28A9A', inner: '#FFC8C8' },
  raccoon:     { main: '#A4A6B4', dark: '#5D5F6F', belly: '#F2F2F6', mark: '#4C4E5C', nose: '#33333D', inner: '#E8D3DA' },
  parrot:      { main: '#7ED37F', dark: '#3E8B4C', belly: '#E9F98E', mark: '#4BB0E8', nose: '#F49B3C', inner: '#FFE36E' },
  turtle:      { main: '#9ED57C', dark: '#4E8A3A', belly: '#F4E7B8', mark: '#5FA357', nose: '#E58897', inner: '#C79A62' },
};

const INK = '#3B2B33';
const W = 3.2; // толщина контура

const f = (n) => Math.round(n * 10) / 10;

function ell(cx, cy, rx, ry, fill, stroke, extra = '') {
  return `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${W}"` : ''} ${extra}/>`;
}

// пушистый круг (самоед, хвосты)
function fluffy(cx, cy, rx, ry, n, fill, stroke, extra = '') {
  let d = '';
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  const br = (Math.PI * (rx + ry) / n) * 0.62;
  d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 1; i <= n; i++) {
    const p = pts[i % n];
    d += ` A${f(br)},${f(br)} 0 0 1 ${f(p[0])},${f(p[1])}`;
  }
  return `<path d="${d}Z" fill="${fill}" stroke="${stroke}" stroke-width="${W}" stroke-linejoin="round" ${extra}/>`;
}

// ---------- лицо ----------
function eyes(mood, hx, hy, hr, big, c) {
  const ex = hr * 0.4, ey = hy + hr * 0.08, er = hr * (big ? 0.155 : 0.13);
  const L = hx - ex, R = hx + ex;
  const closed = (x) => `<path d="M${f(x - er)},${f(ey)} q${f(er)},${f(er * 0.9)} ${f(er * 2)},0" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/>`;
  const happy = (x) => `<path d="M${f(x - er)},${f(ey + er * 0.3)} q${f(er)},${f(-er * 1.5)} ${f(er * 2)},0" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>`;
  const open = (x) => `<g class="pet-eye"><ellipse cx="${f(x)}" cy="${f(ey)}" rx="${f(er)}" ry="${f(er * 1.12)}" fill="${INK}"/>`
    + `<circle cx="${f(x + er * 0.35)}" cy="${f(ey - er * 0.42)}" r="${f(er * 0.42)}" fill="#fff"/>`
    + `<circle cx="${f(x - er * 0.4)}" cy="${f(ey + er * 0.45)}" r="${f(er * 0.18)}" fill="#fff"/></g>`;
  const half = (x) => `<g><ellipse cx="${f(x)}" cy="${f(ey + er * 0.2)}" rx="${f(er)}" ry="${f(er * 0.7)}" fill="${INK}"/>`
    + `<path d="M${f(x - er * 1.25)},${f(ey - er * 0.25)} h${f(er * 2.5)}" stroke="${c.main === '#FFFFFF' ? c.dark : c.main}" stroke-width="${f(er * 1.1)}" stroke-linecap="round"/>`
    + `<circle cx="${f(x + er * 0.3)}" cy="${f(ey + er * 0.25)}" r="${f(er * 0.3)}" fill="#fff"/></g>`;
  const heart = (x) => `<path transform="translate(${f(x)},${f(ey)}) scale(${f(er / 9)})" d="M0,6 C-9,0 -10,-8 -4.5,-9 C-1.5,-9.5 0,-7 0,-5 C0,-7 1.5,-9.5 4.5,-9 C10,-8 9,0 0,6Z" fill="#F2557A"/>`;
  let out;
  switch (mood) {
    case 'sleep': out = closed(L) + closed(R); break;
    case 'love': out = heart(L) + heart(R); break;
    case 'eat': case 'play': out = happy(L) + happy(R); break;
    case 'tired': out = half(L) + half(R); break;
    default: out = open(L) + open(R);
  }
  if (mood === 'sad' || mood === 'hungry') {
    // грустные бровки
    out += `<path d="M${f(L - er * 1.1)},${f(ey - er * 1.45)} l${f(er * 1.7)},${f(-er * 0.6)}" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`
      + `<path d="M${f(R + er * 1.1)},${f(ey - er * 1.45)} l${f(-er * 1.7)},${f(-er * 0.6)}" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`;
  }
  if (mood === 'sad') {
    out += `<path class="pet-tear" d="M${f(R + er * 0.9)},${f(ey + er)} q${f(er * 0.6)},${f(er * 1.2)} 0,${f(er * 1.6)} q${f(-er * 0.6)},${f(-er * 0.4)} 0,${f(-er * 1.6)}Z" fill="#8FD0FF"/>`;
  }
  return out;
}

function cheeks(hx, hy, hr) {
  return ell(hx - hr * 0.66, hy + hr * 0.36, hr * 0.17, hr * 0.1, '#FF8FA8', null, 'opacity=".55"')
    + ell(hx + hr * 0.66, hy + hr * 0.36, hr * 0.17, hr * 0.1, '#FF8FA8', null, 'opacity=".55"');
}

function mouth(kind, mood, hx, hy, hr, c) {
  const ny = hy + hr * 0.3, my = ny + hr * 0.12;
  const s = hr * 0.13;
  let out = '';
  // нос
  if (kind === 'dog') {
    out += `<ellipse cx="${f(hx)}" cy="${f(ny)}" rx="${f(hr * 0.13)}" ry="${f(hr * 0.09)}" fill="${c.nose}"/><ellipse cx="${f(hx - hr * 0.04)}" cy="${f(ny - hr * 0.03)}" rx="${f(hr * 0.04)}" ry="${f(hr * 0.025)}" fill="#fff" opacity=".7"/>`;
  } else {
    out += `<path d="M${f(hx - s * 0.75)},${f(ny - s * 0.35)} h${f(s * 1.5)} q0,${f(s * 0.5)} ${f(-s * 0.75)},${f(s * 0.9)} q${f(-s * 0.75)},${f(-s * 0.4)} ${f(-s * 0.75)},${f(-s * 0.9)}Z" fill="${c.nose}"/>`;
  }
  if (mood === 'hungry' || mood === 'eat') {
    out += `<ellipse cx="${f(hx)}" cy="${f(my + s * 0.8)}" rx="${f(s * 0.85)}" ry="${f(s * (mood === 'eat' ? 0.6 : 0.95))}" fill="#8A3B4A" stroke="${INK}" stroke-width="2"/>`;
    if (mood === 'eat') out += `<ellipse cx="${f(hx)}" cy="${f(my + s * 1.05)}" rx="${f(s * 0.5)}" ry="${f(s * 0.3)}" fill="#FF8FA8"/>`;
    return out;
  }
  if (mood === 'sad' || mood === 'tired') {
    out += `<path d="M${f(hx - s)},${f(my + s * 1.1)} q${f(s)},${f(-s * 0.9)} ${f(s * 2)},0" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`;
    return out;
  }
  // «w»-ротик
  out += `<path d="M${f(hx - s * 1.4)},${f(my)} q${f(s * 0.7)},${f(s * 0.9)} ${f(s * 1.4)},0 q${f(s * 0.7)},${f(s * 0.9)} ${f(s * 1.4)},0" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (kind === 'dog' && mood !== 'sleep') {
    out += `<path class="pet-tongue" d="M${f(hx - s * 0.55)},${f(my + s * 0.3)} v${f(s * 0.7)} a${f(s * 0.55)},${f(s * 0.55)} 0 0 0 ${f(s * 1.1)},0 v${f(-s * 0.7)}Z" fill="#FF7E95" stroke="${INK}" stroke-width="2"/>`;
  }
  return out;
}

// ---------- аксессуары по стадиям ----------
function accessories(stage, hx, hy, hr, bx, bTop, brx) {
  let out = '';
  const neckY = bTop + 6;
  if (stage === 0) {
    // соска
    const y = hy + hr * 0.52;
    out += `<circle cx="${f(hx)}" cy="${f(y + 9)}" r="8" fill="none" stroke="#7FC8F8" stroke-width="3.4"/>`
      + `<ellipse cx="${f(hx)}" cy="${f(y)}" rx="${f(hr * 0.24)}" ry="${f(hr * 0.12)}" fill="#BDE3FF" stroke="${INK}" stroke-width="2.4"/>`;
  }
  if (stage === 1) {
    // бантик на ушке
    const x = hx + hr * 0.55, y = hy - hr * 0.72;
    out += `<g transform="translate(${f(x)},${f(y)}) rotate(20)"><path d="M0,0 L-13,-8 Q-16,0 -13,8Z M0,0 L13,-8 Q16,0 13,8Z" fill="#FF8FB1" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/><circle r="4.2" fill="#FF6F9A" stroke="${INK}" stroke-width="2"/></g>`;
  }
  if (stage === 2) {
    // банданка
    out += `<path d="M${f(bx - brx * 0.75)},${f(neckY - 4)} Q${f(bx)},${f(neckY + 8)} ${f(bx + brx * 0.75)},${f(neckY - 4)} L${f(bx)},${f(neckY + 24)}Z" fill="#6EC6FF" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`
      + `<circle cx="${f(bx - 6)}" cy="${f(neckY + 6)}" r="2" fill="#fff"/><circle cx="${f(bx + 7)}" cy="${f(neckY + 4)}" r="2" fill="#fff"/><circle cx="${f(bx)}" cy="${f(neckY + 14)}" r="2" fill="#fff"/>`;
  }
  if (stage === 3) {
    // шарфик в полоску
    out += `<path d="M${f(bx - brx * 0.82)},${f(neckY - 6)} Q${f(bx)},${f(neckY + 10)} ${f(bx + brx * 0.82)},${f(neckY - 6)} l2,9 Q${f(bx)},${f(neckY + 20)} ${f(bx - brx * 0.82 - 2)},${f(neckY + 3)}Z" fill="#FF7A8A" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`
      + `<path d="M${f(bx + brx * 0.35)},${f(neckY + 6)} l6,26 l12,-3 l-6,-24Z" fill="#FF7A8A" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`
      + `<path d="M${f(bx + brx * 0.35 + 3)},${f(neckY + 16)} l12,-3 M${f(bx + brx * 0.35 + 5)},${f(neckY + 24)} l12,-3" stroke="#fff" stroke-width="3"/>`;
  }
  if (stage >= 4) {
    // ошейник с сердечком
    out += `<path d="M${f(bx - brx * 0.72)},${f(neckY - 3)} Q${f(bx)},${f(neckY + 9)} ${f(bx + brx * 0.72)},${f(neckY - 3)}" fill="none" stroke="#E2475F" stroke-width="7" stroke-linecap="round"/>`
      + `<path transform="translate(${f(bx)},${f(neckY + 12)}) scale(.95)" d="M0,8 C-11,0 -11,-9 -5,-10 C-2,-10.5 0,-8 0,-6 C0,-8 2,-10.5 5,-10 C11,-9 11,0 0,8Z" fill="#FFD25E" stroke="${INK}" stroke-width="2.2"/>`;
  }
  if (stage === 5) {
    // венок из цветов
    for (let i = -2; i <= 2; i++) {
      const a = (-90 + i * 24) * Math.PI / 180;
      const x = hx + Math.cos(a) * hr * 0.98, y = hy + Math.sin(a) * hr * 0.98;
      const col = ['#FF8FB1', '#FFD25E', '#B79CFF', '#FFD25E', '#FF8FB1'][i + 2];
      out += `<g transform="translate(${f(x)},${f(y)})">${[0, 72, 144, 216, 288].map(r => `<ellipse transform="rotate(${r}) translate(0,-5)" rx="3.6" ry="5" fill="${col}" stroke="${INK}" stroke-width="1.4"/>`).join('')}<circle r="2.8" fill="#fff" stroke="${INK}" stroke-width="1.2"/></g>`;
    }
  }
  if (stage === 6) {
    // корона
    const y = hy - hr * 0.95;
    out += `<g transform="translate(${f(hx)},${f(y)}) rotate(-8)"><path d="M-17,6 L-20,-12 L-9,-3 L0,-17 L9,-3 L20,-12 L17,6Z" fill="#FFD25E" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`
      + `<circle cx="0" cy="-1" r="3" fill="#FF6F9A"/><circle cx="-11" cy="1" r="2.2" fill="#6EC6FF"/><circle cx="11" cy="1" r="2.2" fill="#6EC6FF"/></g>`;
  }
  return out;
}

// ---------- общий «пушистик» (коты, собаки, енот, хомяк) ----------
function furry(species, stage, mood) {
  const c = PAL[species];
  const t = stage / 6;
  const isHamster = species === 'hamster';
  const kind = species.startsWith('dog') ? 'dog' : 'cat';
  const G = 92; // земля
  const hr = isHamster ? 0 : 47 - 8 * t;
  const brx = isHamster ? 50 + 10 * t : 31 + 14 * t;
  const bry = isHamster ? 44 + 8 * t : 27 + 15 * t;
  const bx = 0, by = G - bry;
  const bTop = by - bry;
  const hx = 0, hy = isHamster ? by - bry * 0.18 : bTop - hr * 0.42;
  const fluff = species === 'dog_samoyed';
  let back = '', bodyS = '', front = '';

  // --- хвост ---
  const tb = `class="pet-tail" style="transform-origin:${f(bx + brx * 0.7)}px ${f(G - 10)}px"`;
  if (species.startsWith('cat')) {
    const p = `M${f(brx * 0.7)},${f(G - 10)} C${f(brx + 30)},${f(G - 6)} ${f(brx + 36)},${f(by - 30)} ${f(brx + 16)},${f(by - 44)}`;
    back += `<g ${tb}><path d="${p}" fill="none" stroke="${c.dark}" stroke-width="19" stroke-linecap="round"/><path d="${p}" fill="none" stroke="${c.main}" stroke-width="12.5" stroke-linecap="round"/>`;
    if (species !== 'cat_white') back += `<path d="M${f(brx + 24)},${f(G - 22)} l9,-3 M${f(brx + 27)},${f(by - 12)} l10,1" stroke="${c.mark}" stroke-width="5" stroke-linecap="round"/>`;
    back += `</g>`;
  } else if (species === 'dog_corgi') {
    back += `<g ${tb}>${fluffy(brx * 0.92, G - 22, 13, 11, 7, c.main, c.dark)}</g>`;
  } else if (species === 'dog_samoyed') {
    back += `<g ${tb}>${fluffy(brx * 0.8, by - bry * 0.35, 20, 18, 9, c.main, c.dark)}${fluffy(brx * 0.8, by - bry * 0.35, 10, 9, 6, c.mark, 'none')}</g>`;
  } else if (species === 'raccoon') {
    back += `<g ${tb}><g transform="translate(${f(brx * 0.9)},${f(G - 24)}) rotate(-40)">`
      + `<ellipse cx="0" cy="-22" rx="15" ry="30" fill="${c.main}" stroke="${c.dark}" stroke-width="${W}"/>`
      + `<path d="M-14,-30 Q0,-24 14,-30 M-14.5,-15 Q0,-9 14.5,-15 M-12,0 Q0,6 12,0" stroke="${c.mark}" stroke-width="6.5" fill="none"/>`
      + `<ellipse cx="0" cy="-47" rx="8" ry="6" fill="${c.mark}"/></g></g>`;
  }

  // --- задние лапки ---
  if (!isHamster) {
    back += ell(bx - brx * 0.78, G - 9, 15 + 3 * t, 10, c.main, c.dark) + ell(bx + brx * 0.78, G - 9, 15 + 3 * t, 10, c.main, c.dark);
  } else {
    back += ell(bx - brx * 0.55, G - 3, 12, 7, c.nose, c.dark) + ell(bx + brx * 0.55, G - 3, 12, 7, c.nose, c.dark);
  }

  // --- тело ---
  bodyS += fluff ? fluffy(bx, by, brx + 4, bry + 2, 13, c.main, c.dark) : ell(bx, by, brx, bry, c.main, c.dark);
  bodyS += ell(bx, by + bry * 0.18, brx * 0.6, bry * 0.66, c.belly, null);
  if (species === 'cat_ginger' || species === 'cat_gray') {
    bodyS += `<path d="M${f(-brx * 0.98)},${f(by - 6)} q8,2 12,-2 M${f(-brx * 0.96)},${f(by + 8)} q8,2 12,-2 M${f(brx * 0.98)},${f(by - 6)} q-8,2 -12,-2 M${f(brx * 0.96)},${f(by + 8)} q-8,2 -12,-2" stroke="${c.mark}" stroke-width="4.5" stroke-linecap="round" fill="none"/>`;
  }
  // передние лапки
  const pw = isHamster ? 8 : 10 + 2 * t;
  const pY = isHamster ? by + 2 : G - 6;
  const pX = isHamster ? brx * 0.28 : brx * 0.36;
  front += ell(bx - pX, pY, pw, pw * 0.78, isHamster ? c.nose : c.main, c.dark) + ell(bx + pX, pY, pw, pw * 0.78, isHamster ? c.nose : c.main, c.dark);
  if (!isHamster) front += `<path d="M${f(bx - pX - 3)},${f(pY + 2)} v4 M${f(bx - pX + 3)},${f(pY + 2)} v4 M${f(bx + pX - 3)},${f(pY + 2)} v4 M${f(bx + pX + 3)},${f(pY + 2)} v4" stroke="${c.dark}" stroke-width="2" stroke-linecap="round"/>`;

  // --- голова ---
  let head = '';
  const H = isHamster ? brx * 0.62 : hr; // «радиус лица» для черт
  if (!isHamster) {
    // уши
    const ear = (side) => {
      const s = side;
      if (kind === 'cat' || species === 'raccoon') {
        const tall = species === 'raccoon' ? 0.95 : 1.12;
        const o = `M${f(hx + s * hr * 0.92)},${f(hy - hr * 0.2)} L${f(hx + s * hr * 0.78)},${f(hy - hr * tall - 0.2 * hr)} L${f(hx + s * hr * 0.16)},${f(hy - hr * 0.84)}Z`;
        const i = `M${f(hx + s * hr * 0.78)},${f(hy - hr * 0.42)} L${f(hx + s * hr * 0.72)},${f(hy - hr * tall)} L${f(hx + s * hr * 0.36)},${f(hy - hr * 0.8)}Z`;
        return `<g class="pet-ear" style="transform-origin:${f(hx + s * hr * 0.55)}px ${f(hy - hr * 0.55)}px"><path d="${o}" fill="${c.main}" stroke="${c.dark}" stroke-width="${W}" stroke-linejoin="round"/><path d="${i}" fill="${species === 'raccoon' ? c.mark : c.inner}" stroke-linejoin="round"/></g>`;
      }
      if (species === 'dog_corgi') {
        const o = `M${f(hx + s * hr * 0.95)},${f(hy - hr * 0.1)} Q${f(hx + s * hr * 1.25)},${f(hy - hr * 1.2)} ${f(hx + s * hr * 0.85)},${f(hy - hr * 1.5)} Q${f(hx + s * hr * 0.45)},${f(hy - hr * 1.05)} ${f(hx + s * hr * 0.2)},${f(hy - hr * 0.86)}Z`;
        const i = `M${f(hx + s * hr * 0.82)},${f(hy - hr * 0.42)} Q${f(hx + s * hr * 1.02)},${f(hy - hr * 1.1)} ${f(hx + s * hr * 0.83)},${f(hy - hr * 1.28)} Q${f(hx + s * hr * 0.55)},${f(hy - hr * 0.98)} ${f(hx + s * hr * 0.4)},${f(hy - hr * 0.8)}Z`;
        return `<g class="pet-ear" style="transform-origin:${f(hx + s * hr * 0.6)}px ${f(hy - hr * 0.7)}px"><path d="${o}" fill="${c.main}" stroke="${c.dark}" stroke-width="${W}" stroke-linejoin="round"/><path d="${i}" fill="${c.inner}"/></g>`;
      }
      // самоед — маленькие пушистые треугольнички
      const o = `M${f(hx + s * hr * 0.88)},${f(hy - hr * 0.3)} Q${f(hx + s * hr * 0.9)},${f(hy - hr * 1.0)} ${f(hx + s * hr * 0.66)},${f(hy - hr * 1.18)} Q${f(hx + s * hr * 0.35)},${f(hy - hr * 0.95)} ${f(hx + s * hr * 0.2)},${f(hy - hr * 0.85)}Z`;
      return `<g class="pet-ear" style="transform-origin:${f(hx + s * hr * 0.6)}px ${f(hy - hr * 0.7)}px"><path d="${o}" fill="${c.main}" stroke="${c.dark}" stroke-width="${W}" stroke-linejoin="round"/><path d="M${f(hx + s * hr * 0.7)},${f(hy - hr * 0.55)} Q${f(hx + s * hr * 0.72)},${f(hy - hr * 0.95)} ${f(hx + s * hr * 0.62)},${f(hy - hr * 1.0)} Q${f(hx + s * hr * 0.45)},${f(hy - hr * 0.85)} ${f(hx + s * hr * 0.38)},${f(hy - hr * 0.78)}Z" fill="${c.inner}"/></g>`;
    };
    head += ear(-1) + ear(1);
    head += fluff ? fluffy(hx, hy, hr * 1.03, hr * 0.94, 14, c.main, c.dark) : ell(hx, hy, hr, hr * 0.9, c.main, c.dark);
    // мордочка/отметины
    if (species === 'dog_corgi') {
      head += `<path d="M${f(hx - hr * 0.12)},${f(hy - hr * 0.88)} Q${f(hx)},${f(hy - hr * 0.2)} ${f(hx - hr * 0.62)},${f(hy + hr * 0.62)} Q${f(hx)},${f(hy + hr * 0.95)} ${f(hx + hr * 0.62)},${f(hy + hr * 0.62)} Q${f(hx)},${f(hy - hr * 0.2)} ${f(hx + hr * 0.12)},${f(hy - hr * 0.88)}Z" fill="${c.belly}"/>`;
    } else if (species === 'raccoon') {
      head += `<path d="M${f(hx - hr * 0.95)},${f(hy + hr * 0.05)} Q${f(hx - hr * 0.6)},${f(hy - hr * 0.42)} ${f(hx - hr * 0.1)},${f(hy - hr * 0.08)} Q${f(hx)},${f(hy + hr * 0.02)} ${f(hx + hr * 0.1)},${f(hy - hr * 0.08)} Q${f(hx + hr * 0.6)},${f(hy - hr * 0.42)} ${f(hx + hr * 0.95)},${f(hy + hr * 0.05)} Q${f(hx + hr * 0.6)},${f(hy + hr * 0.45)} ${f(hx + hr * 0.15)},${f(hy + hr * 0.2)} L${f(hx - hr * 0.15)},${f(hy + hr * 0.2)} Q${f(hx - hr * 0.6)},${f(hy + hr * 0.45)} ${f(hx - hr * 0.95)},${f(hy + hr * 0.05)}Z" fill="${c.mark}"/>`
        + ell(hx, hy + hr * 0.42, hr * 0.38, hr * 0.27, c.belly, null)
        + `<path d="M${f(hx - hr * 0.5)},${f(hy - hr * 0.55)} q${f(hr * 0.2)},${f(-hr * 0.12)} ${f(hr * 0.35)},0 M${f(hx + hr * 0.5)},${f(hy - hr * 0.55)} q${f(-hr * 0.2)},${f(-hr * 0.12)} ${f(-hr * 0.35)},0" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none"/>`;
    } else {
      head += ell(hx, hy + hr * 0.42, hr * 0.42, hr * 0.28, c.belly, null);
    }
    if (species === 'cat_ginger' || species === 'cat_gray') {
      head += `<path d="M${f(hx)},${f(hy - hr * 0.86)} v${f(hr * 0.3)} M${f(hx - hr * 0.24)},${f(hy - hr * 0.82)} v${f(hr * 0.22)} M${f(hx + hr * 0.24)},${f(hy - hr * 0.82)} v${f(hr * 0.22)}" stroke="${c.mark}" stroke-width="5" stroke-linecap="round"/>`;
    }
    if (species === 'cat_white') {
      head += `<path d="M${f(hx + hr * 0.25)},${f(hy - hr * 0.86)} Q${f(hx + hr * 0.95)},${f(hy - hr * 0.75)} ${f(hx + hr * 0.92)},${f(hy - hr * 0.15)} Q${f(hx + hr * 0.5)},${f(hy - hr * 0.35)} ${f(hx + hr * 0.25)},${f(hy - hr * 0.86)}Z" fill="${c.mark}" opacity=".9"/>`;
    }
    if (kind === 'cat') {
      // усики
      head += `<path d="M${f(hx - hr * 0.55)},${f(hy + hr * 0.36)} l${f(-hr * 0.5)},${f(-hr * 0.08)} M${f(hx - hr * 0.55)},${f(hy + hr * 0.47)} l${f(-hr * 0.48)},${f(hr * 0.07)} M${f(hx + hr * 0.55)},${f(hy + hr * 0.36)} l${f(hr * 0.5)},${f(-hr * 0.08)} M${f(hx + hr * 0.55)},${f(hy + hr * 0.47)} l${f(hr * 0.48)},${f(hr * 0.07)}" stroke="${c.dark}" stroke-width="1.8" stroke-linecap="round" opacity=".7"/>`;
    }
  } else {
    // хомяк: уши-кружки на «теле-голове»
    const er = 10 + 2 * t;
    head = '';
    back += ell(bx - brx * 0.55, bTop + 10, er, er, c.main, c.dark) + ell(bx + brx * 0.55, bTop + 10, er, er, c.main, c.dark)
      + ell(bx - brx * 0.55, bTop + 11, er * 0.55, er * 0.55, c.inner, null) + ell(bx + brx * 0.55, bTop + 11, er * 0.55, er * 0.55, c.inner, null);
    // щёчки-мешочки (надуваются, когда ест)
    const pf = mood === 'eat' ? 1.3 : 1;
    bodyS += ell(hx - H * 0.62, hy + H * 0.38, H * 0.32 * pf, H * 0.25 * pf, c.belly, null) + ell(hx + H * 0.62, hy + H * 0.38, H * 0.32 * pf, H * 0.25 * pf, c.belly, null);
    bodyS += `<path d="M${f(hx - H * 0.2)},${f(bTop + 3)} q${f(H * 0.2)},${f(H * 0.25)} ${f(H * 0.4)},0" stroke="${c.mark}" stroke-width="5" stroke-linecap="round" fill="none"/>`;
  }
  const face = `<g class="pet-face">${eyes(mood, hx, hy, H, stage <= 2, c)}${cheeks(hx, hy, H)}${mouth(kind, mood, hx, hy, H, c)}</g>`;
  const acc = accessories(stage, hx, isHamster ? hy - H * 0.15 : hy, isHamster ? H * 1.05 : hr, bx, isHamster ? hy + H * 0.78 : bTop, isHamster ? brx * 0.62 : brx);
  return `<g class="pet-back">${back}</g><g class="pet-body">${bodyS}${front}</g><g class="pet-head" style="transform-origin:${f(hx)}px ${f(hy + H * 0.8)}px">${head}${face}${acc}</g>`;
}

// ---------- попугай ----------
function parrot(stage, mood) {
  const c = PAL.parrot;
  const t = stage / 6;
  const G = 92;
  const hr = 38 - 4 * t, brx = 30 + 8 * t, bry = 36 + 10 * t;
  const by = G - 12 - bry, hy = by - bry - hr * 0.35 + 14;
  let s = '';
  // жёрдочка
  s += `<rect x="-62" y="${G - 12}" width="124" height="10" rx="5" fill="#C9935D" stroke="#7A4E2D" stroke-width="${W}"/>`;
  // хвост
  s += `<g class="pet-tail" style="transform-origin:0px ${f(by + bry * 0.6)}px"><path d="M-8,${f(by + bry * 0.6)} L-16,${f(G + 26)} L-2,${f(G + 22)} L8,${f(G + 28)} L10,${f(by + bry * 0.6)}Z" fill="${c.mark}" stroke="${c.dark}" stroke-width="${W}" stroke-linejoin="round"/></g>`;
  // тело
  s += ell(0, by, brx, bry, c.main, c.dark) + ell(0, by + bry * 0.25, brx * 0.62, bry * 0.62, c.belly, null);
  // крылья
  s += `<g class="pet-wing-l" style="transform-origin:${f(-brx * 0.8)}px ${f(by - bry * 0.4)}px"><path d="M${f(-brx * 0.85)},${f(by - bry * 0.5)} Q${f(-brx * 1.35)},${f(by + bry * 0.2)} ${f(-brx * 0.5)},${f(by + bry * 0.85)} Q${f(-brx * 0.45)},${f(by)} ${f(-brx * 0.85)},${f(by - bry * 0.5)}Z" fill="#5CB86A" stroke="${c.dark}" stroke-width="${W}" stroke-linejoin="round"/></g>`
    + `<g class="pet-wing-r" style="transform-origin:${f(brx * 0.8)}px ${f(by - bry * 0.4)}px"><path d="M${f(brx * 0.85)},${f(by - bry * 0.5)} Q${f(brx * 1.35)},${f(by + bry * 0.2)} ${f(brx * 0.5)},${f(by + bry * 0.85)} Q${f(brx * 0.45)},${f(by)} ${f(brx * 0.85)},${f(by - bry * 0.5)}Z" fill="#5CB86A" stroke="${c.dark}" stroke-width="${W}" stroke-linejoin="round"/></g>`;
  // лапки
  s += `<path d="M-10,${f(G - 18)} v8 M-14,${f(G - 10)} h8 M10,${f(G - 18)} v8 M6,${f(G - 10)} h8" stroke="#E58A3A" stroke-width="4" stroke-linecap="round"/>`;
  // голова
  let h = '';
  h += `<path d="M-6,${f(hy - hr * 0.9)} q-4,-14 6,-18 q-2,8 4,10 q2,-10 10,-8 q-6,6 -4,16" fill="${c.inner}" stroke="${c.dark}" stroke-width="2.6" stroke-linejoin="round"/>`; // хохолок
  h += ell(0, hy, hr, hr * 0.95, '#A6E37C', c.dark);
  h += ell(0, hy + hr * 0.45, hr * 0.62, hr * 0.42, c.belly, null);
  h += `<g class="pet-face">${eyes(mood, 0, hy - hr * 0.1, hr * 1.05, stage <= 2, c)}${cheeks(0, hy, hr)}</g>`;
  // клюв
  const open = mood === 'hungry' || mood === 'eat' || mood === 'play';
  h += `<path d="M-8,${f(hy + hr * 0.18)} Q0,${f(hy + hr * 0.08)} 8,${f(hy + hr * 0.18)} Q7,${f(hy + hr * 0.55)} 0,${f(hy + hr * 0.62)} Q-7,${f(hy + hr * 0.55)} -8,${f(hy + hr * 0.18)}Z" fill="${c.nose}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`;
  if (open) h += `<path d="M-6,${f(hy + hr * 0.62)} Q0,${f(hy + hr * 0.9)} 6,${f(hy + hr * 0.62)}" fill="#E07A2E" stroke="${INK}" stroke-width="2.2"/>`;
  h += accessories(stage, 0, hy, hr, 0, by - bry, brx);
  return `<g class="pet-body">${s}</g><g class="pet-head" style="transform-origin:0px ${f(hy + hr * 0.8)}px">${h}</g>`;
}

// ---------- черепашка ----------
function turtle(stage, mood) {
  const c = PAL.turtle;
  const t = stage / 6;
  const G = 92;
  const srx = 48 + 12 * t, sry = 34 + 8 * t;
  const sy = G - 18;
  const hr = 30 - 2 * t;
  const hx = 0, hy = sy - sry * 0.3 - hr * 0.2 - 6;
  let s = '';
  // лапки
  s += ell(-srx * 0.68, G - 8, 13, 10, c.main, c.dark) + ell(srx * 0.68, G - 8, 13, 10, c.main, c.dark);
  s += `<g class="pet-tail" style="transform-origin:${f(srx * 0.9)}px ${f(sy + 8)}px"><path d="M${f(srx * 0.85)},${f(sy + 6)} q14,2 16,-6 q-6,12 -16,12Z" fill="${c.main}" stroke="${c.dark}" stroke-width="${W}" stroke-linejoin="round"/></g>`;
  // панцирь
  s += `<path d="M${f(-srx)},${f(sy + 8)} Q${f(-srx)},${f(sy - sry * 1.15)} 0,${f(sy - sry * 1.15)} Q${f(srx)},${f(sy - sry * 1.15)} ${f(srx)},${f(sy + 8)}Z" fill="${c.mark}" stroke="${c.dark}" stroke-width="${W}" stroke-linejoin="round"/>`;
  // узор панциря
  const hx6 = (x, y, r) => `<path d="M${f(x - r)},${f(y)} L${f(x - r / 2)},${f(y - r * 0.85)} L${f(x + r / 2)},${f(y - r * 0.85)} L${f(x + r)},${f(y)} L${f(x + r / 2)},${f(y + r * 0.85)} L${f(x - r / 2)},${f(y + r * 0.85)}Z" fill="${c.main}" stroke="${c.dark}" stroke-width="2.2" stroke-linejoin="round" opacity=".95"/>`;
  s += hx6(0, sy - sry * 0.5, 13 + 3 * t) + hx6(-srx * 0.52, sy - sry * 0.2, 10 + 2 * t) + hx6(srx * 0.52, sy - sry * 0.2, 10 + 2 * t);
  s += `<rect x="${f(-srx - 3)}" y="${f(sy + 2)}" width="${f(srx * 2 + 6)}" height="12" rx="6" fill="${c.belly}" stroke="${c.dark}" stroke-width="${W}"/>`;
  // голова (выглядывает вперёд, чуть сверху)
  let h = '';
  h += ell(hx, hy + hr * 0.2, hr * 0.55, hr * 0.7, c.main, c.dark);
  h += ell(hx, hy, hr, hr * 0.85, c.main, c.dark);
  h += `<g class="pet-face">${eyes(mood, hx, hy, hr * 1.05, true, c)}${cheeks(hx, hy, hr)}${mouth('cat', mood, hx, hy, hr, { ...c, nose: c.dark })}</g>`;
  h += accessories(stage, hx, hy, hr, hx, hy + hr * 0.7, hr * 0.9);
  return `<g class="pet-body">${s}</g><g class="pet-head" style="transform-origin:${f(hx)}px ${f(hy + hr)}px">${h}</g>`;
}

// ---------- грязь, сон и т.п. ----------
function overlays(mood) {
  let o = '';
  if (mood === 'dirty') {
    o += `<g class="pet-dirt" opacity=".75"><ellipse cx="-24" cy="62" rx="9" ry="6" fill="#A97C5B"/><ellipse cx="22" cy="40" rx="7" ry="5" fill="#A97C5B"/><ellipse cx="30" cy="-34" rx="6" ry="4" fill="#A97C5B"/></g>`
      + `<g class="pet-fly"><circle cx="0" cy="0" r="3" fill="${INK}"/><ellipse cx="-3" cy="-4" rx="3" ry="2" fill="#fff" opacity=".8"/><ellipse cx="3" cy="-4" rx="3" ry="2" fill="#fff" opacity=".8"/></g>`;
  }
  return o;
}

export function petSVG(species, { stage = 0, mood = 'happy', cls = '', size } = {}) {
  let inner;
  if (species === 'parrot') inner = parrot(stage, mood);
  else if (species === 'turtle') inner = turtle(stage, mood);
  else inner = furry(species, stage, mood);
  const sc = 0.72 + 0.28 * (stage / 6);
  const sz = size ? ` width="${size}" height="${size}"` : '';
  return `<svg class="pet-svg mood-${mood} ${cls}" viewBox="-100 -110 200 210"${sz} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`
    + `<ellipse class="pet-shadow" cx="0" cy="95" rx="${f(62 * sc)}" ry="8" fill="#000" opacity=".12"/>`
    + `<g class="pet-root" transform="translate(0,95) scale(${f(sc)}) translate(0,-95)">${inner}${overlays(mood)}</g></svg>`;
}

export const SPECIES_ORDER = ['cat_ginger', 'cat_gray', 'cat_white', 'dog_corgi', 'dog_samoyed', 'raccoon', 'hamster', 'parrot', 'turtle'];

export const SPECIES_INFO = {
  cat_ginger: 'Солнечный мурлыка. Обожает обнимашки и спать на тёплом.',
  cat_gray: 'Плюшевый и важный. Любит порядок и молочко.',
  cat_white: 'Нежное облачко с рыжим пятнышком. Немножко принцесса.',
  dog_corgi: 'Короткие лапки, огромное сердце. Вечный двигатель радости.',
  dog_samoyed: 'Белое облако-улыбака. Обнимается всем телом.',
  raccoon: 'Маленький бандит в маске. Полощет еду и ворует сердца.',
  hamster: 'Круглый пушистик. Набивает щёчки и бегает в колесе.',
  parrot: 'Болтушка! Повторяет то, что вы пишете друг другу.',
  turtle: 'Спокойная мудрость. Медленно, но навсегда.',
};
