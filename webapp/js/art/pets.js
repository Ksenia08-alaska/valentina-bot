// Питомцы в мягком современном стиле (чистый SVG, без стикеров и эмодзи).
// petSVG(species, {stage: 0..6, mood: 'happy'|'love'|'sleep'|'hungry'|'sad'|'dirty'|'tired'|'eat'|'play'})

const PAL = {
  cat_ginger:  { main: '#F4B07A', shade: '#D98A55', light: '#FFF1E4', mark: '#E39360', inner: '#F8C6C6', nose: '#E9899A' },
  cat_gray:    { main: '#B9BFCD', shade: '#8F96A8', light: '#F3F4F8', mark: '#9AA1B3', inner: '#F2C9D2', nose: '#DE8D9E' },
  cat_white:   { main: '#FBF7F4', shade: '#DCCFD1', light: '#FFFFFF', mark: '#F0C38F', inner: '#F8CFD8', nose: '#EC97A8' },
  dog_corgi:   { main: '#F0B27E', shade: '#D18C57', light: '#FFF6EC', mark: '#E89D63', inner: '#F6C9B8', nose: '#4A3A3E' },
  dog_samoyed: { main: '#FBF8F5', shade: '#D9D0CB', light: '#FFFFFF', mark: '#EFE6DE', inner: '#F6D2D4', nose: '#4A3A3E' },
  hamster:     { main: '#F2C48E', shade: '#D9A266', light: '#FFF6E8', mark: '#E6AE72', inner: '#F6C3C3', nose: '#E9899A' },
  raccoon:     { main: '#B3B4C0', shade: '#878897', light: '#F4F4F7', mark: '#5F6070', inner: '#E9D3DA', nose: '#3E3D48' },
  parrot:      { main: '#9FDCA0', shade: '#6BB27A', light: '#F2F7C4', mark: '#8FC8EE', inner: '#FFE08A', nose: '#F2B27A' },
  turtle:      { main: '#B4DE9B', shade: '#83B86C', light: '#F6EBC6', mark: '#8CC07B', inner: '#6FA868', nose: '#E58897' },
};

const EYE = '#2C2230';
let UID = 0;
const f = (n) => Math.round(n * 10) / 10;

function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

function defs(id, c) {
  return `<defs>
    <radialGradient id="${id}b" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="${mix(c.main, '#FFFFFF', .45)}"/><stop offset=".6" stop-color="${c.main}"/><stop offset="1" stop-color="${c.shade}"/></radialGradient>
    <radialGradient id="${id}l" cx=".5" cy=".35" r=".7"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="${c.light}"/></radialGradient>
    <radialGradient id="${id}k" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FF8FAA" stop-opacity=".6"/><stop offset="1" stop-color="#FF8FAA" stop-opacity="0"/></radialGradient>
    <linearGradient id="${id}e" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A2030"/><stop offset="1" stop-color="#4E3D58"/></linearGradient>
  </defs>`;
}

const edge = (c) => `stroke="${c.shade}" stroke-opacity=".35" stroke-width="1.5"`;
function ell(cx, cy, rx, ry, fill, extra = '') {
  return `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}" ${extra}/>`;
}
// пушистый контур (самоед)
function fluffy(cx, cy, rx, ry, n, fill, extra = '') {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  const br = (Math.PI * (rx + ry) / n) * 0.58;
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 1; i <= n; i++) { const p = pts[i % n]; d += ` A${f(br)},${f(br)} 0 0 1 ${f(p[0])},${f(p[1])}`; }
  return `<path d="${d}Z" fill="${fill}" ${extra}/>`;
}
// треугольник со скруглёнными углами
function softTri(p1, p2, p3, fill, r = 7, extra = '') {
  const d = `M${f(p1[0])},${f(p1[1])} L${f(p2[0])},${f(p2[1])} L${f(p3[0])},${f(p3[1])}Z`;
  return `<path d="${d}" fill="${fill}" stroke="${fill}" stroke-width="${r}" stroke-linejoin="round" ${extra}/>`;
}

// ---------- лицо ----------
function eyes(id, mood, hx, hy, hr, big) {
  const ex = hr * 0.4, ey = hy + hr * 0.14, rx = hr * (big ? 0.15 : 0.135), ry = rx * 1.18;
  const L = hx - ex, R = hx + ex;
  const arc = (x, up) => `<path d="M${f(x - rx * 1.05)},${f(ey + (up ? rx * 0.3 : 0))} q${f(rx * 1.05)},${f(up ? -rx * 1.4 : rx * 0.9)} ${f(rx * 2.1)},0" fill="none" stroke="${EYE}" stroke-width="2.6" stroke-linecap="round"/>`;
  const open = (x) => `<g class="pet-eye"><ellipse cx="${f(x)}" cy="${f(ey)}" rx="${f(rx)}" ry="${f(ry)}" fill="url(#${id}e)"/>`
    + `<ellipse cx="${f(x + rx * 0.3)}" cy="${f(ey - ry * 0.38)}" rx="${f(rx * 0.42)}" ry="${f(rx * 0.38)}" fill="#fff"/>`
    + `<circle cx="${f(x - rx * 0.38)}" cy="${f(ey + ry * 0.42)}" r="${f(rx * 0.17)}" fill="#fff" opacity=".85"/></g>`;
  const heavy = (x) => `<g><ellipse cx="${f(x)}" cy="${f(ey + ry * 0.25)}" rx="${f(rx)}" ry="${f(ry * 0.62)}" fill="url(#${id}e)"/><path d="M${f(x - rx * 1.1)},${f(ey - ry * 0.1)} q${f(rx * 1.1)},${f(ry * 0.25)} ${f(rx * 2.2)},0" stroke="${EYE}" stroke-width="2.2" fill="none" stroke-linecap="round"/><circle cx="${f(x + rx * 0.3)}" cy="${f(ey + ry * 0.2)}" r="${f(rx * 0.25)}" fill="#fff"/></g>`;
  const heart = (x) => `<path transform="translate(${f(x)},${f(ey)}) scale(${f(rx / 8)})" d="M0,6 C-9,0 -10,-8 -4.5,-9 C-1.5,-9.5 0,-7 0,-5 C0,-7 1.5,-9.5 4.5,-9 C10,-8 9,0 0,6Z" fill="#F2768F"/>`;
  let out;
  switch (mood) {
    case 'sleep': out = arc(L, false) + arc(R, false); break;
    case 'love': out = heart(L) + heart(R); break;
    case 'eat': case 'play': out = arc(L, true) + arc(R, true); break;
    case 'tired': out = heavy(L) + heavy(R); break;
    default: out = open(L) + open(R);
  }
  if (mood === 'sad' || mood === 'hungry') {
    out += `<path d="M${f(L - rx)},${f(ey - ry * 1.5)} q${f(rx)},${f(-ry * 0.5)} ${f(rx * 1.8)},${f(-ry * 0.2)}" stroke="${EYE}" stroke-opacity=".7" stroke-width="2" fill="none" stroke-linecap="round"/>`
      + `<path d="M${f(R + rx)},${f(ey - ry * 1.5)} q${f(-rx)},${f(-ry * 0.5)} ${f(-rx * 1.8)},${f(-ry * 0.2)}" stroke="${EYE}" stroke-opacity=".7" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  }
  if (mood === 'sad') out += `<path class="pet-tear" d="M${f(R + rx * 0.6)},${f(ey + ry)} q${f(rx * 0.5)},${f(ry)} 0,${f(ry * 1.3)} q${f(-rx * 0.5)},${f(-ry * 0.3)} 0,${f(-ry * 1.3)}Z" fill="#9FD6FF"/>`;
  return out;
}

function nose(c, kind, hx, hy, hr) {
  const ny = hy + hr * 0.36;
  if (kind === 'dog') {
    return `<ellipse cx="${f(hx)}" cy="${f(ny)}" rx="${f(hr * 0.12)}" ry="${f(hr * 0.085)}" fill="${c.nose}"/><ellipse cx="${f(hx - hr * 0.03)}" cy="${f(ny - hr * 0.03)}" rx="${f(hr * 0.04)}" ry="${f(hr * 0.022)}" fill="#fff" opacity=".6"/>`;
  }
  const s = hr * 0.075;
  return `<path d="M${f(hx - s)},${f(ny - s * 0.5)} Q${f(hx)},${f(ny - s * 0.9)} ${f(hx + s)},${f(ny - s * 0.5)} Q${f(hx + s * 0.6)},${f(ny + s * 0.8)} ${f(hx)},${f(ny + s * 0.9)} Q${f(hx - s * 0.6)},${f(ny + s * 0.8)} ${f(hx - s)},${f(ny - s * 0.5)}Z" fill="${c.nose}"/>`;
}

function mouth(c, kind, mood, hx, hy, hr) {
  const my = hy + hr * 0.47, s = hr * 0.11;
  const col = mix(c.shade, EYE, .5);
  if (mood === 'hungry' || mood === 'eat') {
    return `<ellipse cx="${f(hx)}" cy="${f(my + s * 0.6)}" rx="${f(s * 0.75)}" ry="${f(s * (mood === 'eat' ? 0.55 : 0.85))}" fill="#9B4A5E"/>`
      + `<ellipse cx="${f(hx)}" cy="${f(my + s * 0.95)}" rx="${f(s * 0.45)}" ry="${f(s * 0.28)}" fill="#F48FA6"/>`;
  }
  if (mood === 'sad' || mood === 'tired') {
    return `<path d="M${f(hx - s * 0.8)},${f(my + s * 0.9)} q${f(s * 0.8)},${f(-s * 0.7)} ${f(s * 1.6)},0" fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round"/>`;
  }
  let out = `<path d="M${f(hx - s * 1.3)},${f(my)} q${f(s * 0.65)},${f(s * 0.8)} ${f(s * 1.3)},0 q${f(s * 0.65)},${f(s * 0.8)} ${f(s * 1.3)},0" fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (kind === 'dog' && mood !== 'sleep') {
    out += `<path class="pet-tongue" d="M${f(hx - s * 0.5)},${f(my + s * 0.35)} v${f(s * 0.5)} a${f(s * 0.5)},${f(s * 0.5)} 0 0 0 ${f(s)},0 v${f(-s * 0.5)}Z" fill="#F48FA6"/>`;
  }
  return out;
}

function blush(id, hx, hy, hr) {
  return ell(hx - hr * 0.64, hy + hr * 0.4, hr * 0.2, hr * 0.13, `url(#${id}k)`) + ell(hx + hr * 0.64, hy + hr * 0.4, hr * 0.2, hr * 0.13, `url(#${id}k)`);
}

// ---------- аккуратные аксессуары по стадиям ----------
function bowAt(x, y, s = 1, rot = 0, col = '#F2A1B5') {
  return `<g transform="translate(${f(x)},${f(y)}) rotate(${rot}) scale(${s})"><path d="M0,0 C-6,-8 -14,-6 -13,0 C-14,6 -6,8 0,0Z" fill="${col}"/><path d="M0,0 C6,-8 14,-6 13,0 C14,6 6,8 0,0Z" fill="${col}"/><circle r="3.2" fill="${mix(col, '#B04A6A', .35)}"/></g>`;
}
function collar(hx, y, w, col, tag) {
  if (y < -500) return '';
  let out = `<path d="M${f(hx - w)},${f(y - 4)} Q${f(hx)},${f(y + 5)} ${f(hx + w)},${f(y - 4)}" fill="none" stroke="${col}" stroke-width="4.5" stroke-linecap="round"/>`;
  if (tag === 'bow') out += bowAt(hx, y + 1, 0.7, 0, col);
  if (tag === 'heart') out += `<path transform="translate(${f(hx)},${f(y + 7)}) scale(.62)" d="M0,8 C-11,0 -11,-9 -5,-10 C-2,-10.5 0,-8 0,-6 C0,-8 2,-10.5 5,-10 C11,-9 11,0 0,8Z" fill="#F1CF8E"/>`;
  return out;
}
function accessories(stage, hx, hy, hr, neckY, neckW, earX, earY, noCollar = false) {
  let out = '';
  if (noCollar) {
    if (stage >= 2 && stage <= 4) out += bowAt(earX, earY, 0.85, 20, stage === 4 ? '#C9B3EA' : '#F2A1B5');
    if (stage < 5) return out;
    neckY = -999;
  }
  if (stage === 2) out += bowAt(earX, earY, 0.85, 20);
  if (stage === 3) out += collar(hx, neckY, neckW, '#F2A1B5', 'bow');
  if (stage === 4) out += collar(hx, neckY, neckW, '#E68FA5', 'heart') + bowAt(earX, earY, 0.75, 20, '#C9B3EA');
  if (stage === 5) {
    out += collar(hx, neckY, neckW, '#E68FA5', 'heart');
    for (let i = -2; i <= 2; i++) {
      const a = (-90 + i * 22) * Math.PI / 180;
      const x = hx + Math.cos(a) * hr * 0.92, y = hy - hr * 0.08 + Math.sin(a) * hr * 0.9;
      const col = ['#F7C6D3', '#FFF3D6', '#D9C8F2', '#FFF3D6', '#F7C6D3'][i + 2];
      out += `<g transform="translate(${f(x)},${f(y)})">${[0, 72, 144, 216, 288].map((r) => `<ellipse transform="rotate(${r}) translate(0,-4.2)" rx="3" ry="4.2" fill="${col}"/>`).join('')}<circle r="2.3" fill="#F1CF8E"/></g>`;
    }
  }
  if (stage === 6) {
    out += collar(hx, neckY, neckW, '#E68FA5', 'heart');
    const y = hy - hr * 0.9;
    out += `<g transform="translate(${f(hx + hr * 0.12)},${f(y)}) rotate(-6)"><path d="M-15,5 L-17,-9 L-8,-2 L0,-14 L8,-2 L17,-9 L15,5Z" fill="#F1CF8E" stroke="#D9A85A" stroke-width="1.6" stroke-linejoin="round"/><circle cy="-1" r="2.6" fill="#F2A1B5"/><circle cx="-10" cy="1.5" r="1.8" fill="#C9B3EA"/><circle cx="10" cy="1.5" r="1.8" fill="#C9B3EA"/></g>`;
  }
  return out;
}

// ---------- пушистики: коты, собаки, енот, хомяк ----------
function furry(id, species, stage, mood) {
  const c = PAL[species];
  const t = stage / 6;
  const isHam = species === 'hamster';
  const kind = species.startsWith('dog') ? 'dog' : 'cat';
  const fluff = species === 'dog_samoyed';
  const G = 92;
  const hr = 46 - 8 * t;
  const brx = isHam ? 52 + 8 * t : 29 + 14 * t, bry = isHam ? 46 + 6 * t : 26 + 15 * t;
  const by = G - bry, bTop = by - bry;
  const hx = 0, hy = isHam ? by - bry * 0.12 : bTop - hr * 0.4;
  const H = isHam ? brx * 0.62 : hr;
  const E = edge(c);
  let back = '', body = '', head = '';

  // хвост
  const tailO = `class="pet-tail" style="transform-origin:${f(brx * 0.7)}px ${f(G - 10)}px"`;
  if (species.startsWith('cat')) {
    const p = `M${f(brx * 0.6)},${f(G - 8)} C${f(brx + 28)},${f(G - 4)} ${f(brx + 34)},${f(by - 26)} ${f(brx + 14)},${f(by - 42)}`;
    back += `<g ${tailO}><path d="${p}" fill="none" stroke="${c.shade}" stroke-width="14" stroke-linecap="round" opacity=".55"/><path d="${p}" fill="none" stroke="${c.main}" stroke-width="11" stroke-linecap="round"/>`;
    if (species !== 'cat_white') back += `<path d="M${f(brx + 22)},${f(G - 20)} l7,-2 M${f(brx + 26)},${f(by - 12)} l8,1" stroke="${c.mark}" stroke-width="4" stroke-linecap="round" opacity=".8"/>`;
    back += '</g>';
  } else if (species === 'dog_corgi') {
    back += `<g ${tailO}>${fluffy(brx * 0.9, G - 22, 12, 10, 7, `url(#${id}b)`)}</g>`;
  } else if (fluff) {
    back += `<g ${tailO}>${fluffy(brx * 0.78, by - bry * 0.35, 19, 17, 9, `url(#${id}b)`, E)}</g>`;
  } else if (species === 'raccoon') {
    back += `<g ${tailO}><g transform="translate(${f(brx * 0.88)},${f(G - 22)}) rotate(-38)"><ellipse cx="0" cy="-22" rx="14" ry="29" fill="url(#${id}b)"/><path d="M-13,-31 Q0,-25 13,-31 M-14,-16 Q0,-10 14,-16 M-11,-1 Q0,5 11,-1" stroke="${c.mark}" stroke-width="6" fill="none" stroke-linecap="round" opacity=".85"/><ellipse cx="0" cy="-46" rx="7" ry="5.5" fill="${c.mark}"/></g></g>`;
  }
  // задние лапки
  if (!isHam) back += ell(-brx * 0.76, G - 8, 14 + 3 * t, 9.5, `url(#${id}b)`, E) + ell(brx * 0.76, G - 8, 14 + 3 * t, 9.5, `url(#${id}b)`, E);
  else back += ell(-brx * 0.5, G - 3, 11, 6.5, c.nose) + ell(brx * 0.5, G - 3, 11, 6.5, c.nose);

  // тело
  body += fluff ? fluffy(0, by, brx + 4, bry + 2, 13, `url(#${id}b)`, E) : ell(0, by, brx, bry, `url(#${id}b)`, E);
  body += ell(0, by + bry * 0.16, brx * 0.58, bry * 0.66, `url(#${id}l)`, 'opacity=".95"');
  if (species === 'cat_ginger' || species === 'cat_gray') {
    body += `<path d="M${f(-brx * 0.95)},${f(by - 6)} q7,2 11,-2 M${f(-brx * 0.93)},${f(by + 8)} q7,2 11,-2 M${f(brx * 0.95)},${f(by - 6)} q-7,2 -11,-2 M${f(brx * 0.93)},${f(by + 8)} q-7,2 -11,-2" stroke="${c.mark}" stroke-width="3.6" stroke-linecap="round" fill="none" opacity=".75"/>`;
  }
  // передние лапки
  const pw = isHam ? 7.5 : 9.5 + 2 * t, pY = isHam ? by + 4 : G - 5, pX = isHam ? brx * 0.26 : brx * 0.36;
  const pawFill = isHam ? c.nose : `url(#${id}l)`;
  body += ell(-pX, pY, pw, pw * 0.78, pawFill, isHam ? '' : E) + ell(pX, pY, pw, pw * 0.78, pawFill, isHam ? '' : E);

  // голова
  let earX = hx + hr * 0.62, earY = hy - hr * 0.86;
  if (!isHam) {
    const ear = (sd) => {
      const o = `class="pet-ear" style="transform-origin:${f(hx + sd * hr * 0.55)}px ${f(hy - hr * 0.55)}px"`;
      if (kind === 'cat' || species === 'raccoon') {
        const tall = species === 'raccoon' ? 1.02 : 1.16;
        return `<g ${o}>${softTri([hx + sd * hr * 0.2, hy - hr * 0.72], [hx + sd * hr * 0.76, hy - hr * tall], [hx + sd * hr * 0.9, hy - hr * 0.22], c.main, 9)}`
          + `${softTri([hx + sd * hr * 0.38, hy - hr * 0.7], [hx + sd * hr * 0.72, hy - hr * (tall - 0.14)], [hx + sd * hr * 0.78, hy - hr * 0.38], species === 'raccoon' ? c.mark : c.inner, 5, 'opacity=".9"')}</g>`;
      }
      if (species === 'dog_corgi') {
        return `<g ${o}>${softTri([hx + sd * hr * 0.16, hy - hr * 0.72], [hx + sd * hr * 0.86, hy - hr * 1.38], [hx + sd * hr * 0.94, hy - hr * 0.16], c.main, 10)}`
          + `${softTri([hx + sd * hr * 0.36, hy - hr * 0.66], [hx + sd * hr * 0.82, hy - hr * 1.18], [hx + sd * hr * 0.82, hy - hr * 0.36], c.inner, 6, 'opacity=".9"')}</g>`;
      }
      return `<g ${o}>${softTri([hx + sd * hr * 0.24, hy - hr * 0.78], [hx + sd * hr * 0.7, hy - hr * 1.1], [hx + sd * hr * 0.88, hy - hr * 0.36], c.main, 10)}`
        + `${softTri([hx + sd * hr * 0.42, hy - hr * 0.74], [hx + sd * hr * 0.66, hy - hr * 0.96], [hx + sd * hr * 0.76, hy - hr * 0.5], c.inner, 4, 'opacity=".85"')}</g>`;
    };
    head += ear(-1) + ear(1);
    head += fluff ? fluffy(hx, hy, hr * 1.02, hr * 0.92, 15, `url(#${id}b)`, E) : ell(hx, hy, hr, hr * 0.88, `url(#${id}b)`, E);
    // щёчки-пушок у котов
    if (kind === 'cat' && species !== 'raccoon') {
      head += `<path d="M${f(hx - hr * 0.92)},${f(hy + hr * 0.2)} l${f(-hr * 0.12)},${f(hr * 0.12)} l${f(hr * 0.16)},${f(hr * 0.04)} l${f(-hr * 0.08)},${f(hr * 0.14)} l${f(hr * 0.2)},${f(-hr * 0.02)}Z" fill="${c.main}"/>`
        + `<path d="M${f(hx + hr * 0.92)},${f(hy + hr * 0.2)} l${f(hr * 0.12)},${f(hr * 0.12)} l${f(-hr * 0.16)},${f(hr * 0.04)} l${f(hr * 0.08)},${f(hr * 0.14)} l${f(-hr * 0.2)},${f(-hr * 0.02)}Z" fill="${c.main}"/>`;
    }
    if (species === 'dog_corgi') {
      head += `<path d="M${f(hx - hr * 0.1)},${f(hy - hr * 0.86)} Q${f(hx)},${f(hy - hr * 0.2)} ${f(hx - hr * 0.6)},${f(hy + hr * 0.62)} Q${f(hx)},${f(hy + hr * 0.92)} ${f(hx + hr * 0.6)},${f(hy + hr * 0.62)} Q${f(hx)},${f(hy - hr * 0.2)} ${f(hx + hr * 0.1)},${f(hy - hr * 0.86)}Z" fill="url(#${id}l)"/>`;
    } else if (species === 'raccoon') {
      head += ell(hx - hr * 0.4, hy + hr * 0.12, hr * 0.32, hr * 0.26, c.mark, `transform="rotate(-12 ${f(hx - hr * 0.4)} ${f(hy + hr * 0.12)})" opacity=".92"`)
        + ell(hx + hr * 0.4, hy + hr * 0.12, hr * 0.32, hr * 0.26, c.mark, `transform="rotate(12 ${f(hx + hr * 0.4)} ${f(hy + hr * 0.12)})" opacity=".92"`)
        + ell(hx, hy + hr * 0.46, hr * 0.36, hr * 0.26, `url(#${id}l)`)
        + `<path d="M${f(hx)},${f(hy - hr * 0.8)} L${f(hx)},${f(hy - hr * 0.1)}" stroke="${c.shade}" stroke-width="6" stroke-linecap="round" opacity=".4"/>`;
    } else {
      head += ell(hx, hy + hr * 0.44, hr * 0.4, hr * 0.27, `url(#${id}l)`);
    }
    if (species === 'cat_ginger' || species === 'cat_gray') {
      head += `<path d="M${f(hx)},${f(hy - hr * 0.84)} v${f(hr * 0.26)} M${f(hx - hr * 0.22)},${f(hy - hr * 0.8)} v${f(hr * 0.18)} M${f(hx + hr * 0.22)},${f(hy - hr * 0.8)} v${f(hr * 0.18)}" stroke="${c.mark}" stroke-width="4" stroke-linecap="round" opacity=".75"/>`;
    }
    if (species === 'cat_white') {
      head += `<path d="M${f(hx + hr * 0.22)},${f(hy - hr * 0.84)} Q${f(hx + hr * 0.92)},${f(hy - hr * 0.72)} ${f(hx + hr * 0.9)},${f(hy - hr * 0.12)} Q${f(hx + hr * 0.5)},${f(hy - hr * 0.32)} ${f(hx + hr * 0.22)},${f(hy - hr * 0.84)}Z" fill="${c.mark}" opacity=".75"/>`;
    }
    if (kind === 'cat') {
      head += `<path d="M${f(hx - hr * 0.56)},${f(hy + hr * 0.4)} l${f(-hr * 0.42)},${f(-hr * 0.06)} M${f(hx - hr * 0.56)},${f(hy + hr * 0.5)} l${f(-hr * 0.4)},${f(hr * 0.06)} M${f(hx + hr * 0.56)},${f(hy + hr * 0.4)} l${f(hr * 0.42)},${f(-hr * 0.06)} M${f(hx + hr * 0.56)},${f(hy + hr * 0.5)} l${f(hr * 0.4)},${f(hr * 0.06)}" stroke="${mix(c.shade, '#FFFFFF', .2)}" stroke-width="1.3" stroke-linecap="round" opacity=".55"/>`;
    }
  } else {
    const er = 10 + 2 * t;
    back += ell(-brx * 0.52, bTop + 11, er, er, `url(#${id}b)`, E) + ell(brx * 0.52, bTop + 11, er, er, `url(#${id}b)`, E)
      + ell(-brx * 0.52, bTop + 12, er * 0.55, er * 0.55, c.inner) + ell(brx * 0.52, bTop + 12, er * 0.55, er * 0.55, c.inner);
    const pf = mood === 'eat' ? 1.3 : 1;
    body += ell(hx, hy + H * 0.42, H * 0.62, H * 0.4, `url(#${id}l)`);
    body += ell(hx - H * 0.62, hy + H * 0.4, H * 0.3 * pf, H * 0.24 * pf, `url(#${id}l)`) + ell(hx + H * 0.62, hy + H * 0.4, H * 0.3 * pf, H * 0.24 * pf, `url(#${id}l)`);
    body += `<path d="M${f(hx - H * 0.16)},${f(bTop + 4)} q${f(H * 0.16)},${f(H * 0.2)} ${f(H * 0.32)},0" stroke="${c.mark}" stroke-width="4" stroke-linecap="round" fill="none" opacity=".7"/>`;
    earX = hx + brx * 0.52; earY = bTop + 6;
  }
  const face = `<g class="pet-face">${eyes(id, mood, hx, hy, H, stage <= 2)}${blush(id, hx, hy, H)}${nose(c, kind, hx, hy, H)}${mouth(c, kind, mood, hx, hy, H)}</g>`;
  const neckY = isHam ? hy + H * 0.92 : hy + hr * 0.84;
  const neckW = isHam ? H * 0.55 : hr * 0.5;
  const acc = accessories(stage, hx, isHam ? hy - H * 0.2 : hy, isHam ? H * 1.1 : hr, neckY, neckW, earX, earY, isHam);
  return `<g class="pet-back">${back}</g><g class="pet-body">${body}</g><g class="pet-head" style="transform-origin:${f(hx)}px ${f(hy + H * 0.8)}px">${head}${face}${acc}</g>`;
}

// ---------- попугай ----------
function parrot(id, stage, mood) {
  const c = PAL.parrot;
  const t = stage / 6;
  const G = 92;
  const hr = 37 - 4 * t, brx = 29 + 8 * t, bry = 35 + 10 * t;
  const by = G - 12 - bry, hy = by - bry - hr * 0.35 + 14;
  const E = edge(c);
  let s = '';
  s += `<rect x="-60" y="${G - 12}" width="120" height="9" rx="4.5" fill="#D8B48C"/><rect x="-60" y="${G - 12}" width="120" height="3" rx="1.5" fill="#E9CDAA"/>`;
  s += `<g class="pet-tail" style="transform-origin:0px ${f(by + bry * 0.6)}px"><path d="M-8,${f(by + bry * 0.6)} Q-14,${f(G + 14)} -12,${f(G + 26)} Q-2,${f(G + 18)} 4,${f(G + 28)} Q10,${f(G + 12)} 10,${f(by + bry * 0.6)}Z" fill="${c.mark}"/></g>`;
  s += ell(0, by, brx, bry, `url(#${id}b)`, E) + ell(0, by + bry * 0.24, brx * 0.6, bry * 0.62, `url(#${id}l)`);
  const wing = (sd) => `<g class="pet-wing-${sd < 0 ? 'l' : 'r'}" style="transform-origin:${f(sd * brx * 0.8)}px ${f(by - bry * 0.4)}px"><path d="M${f(sd * brx * 0.85)},${f(by - bry * 0.5)} Q${f(sd * brx * 1.3)},${f(by + bry * 0.2)} ${f(sd * brx * 0.5)},${f(by + bry * 0.85)} Q${f(sd * brx * 0.45)},${f(by)} ${f(sd * brx * 0.85)},${f(by - bry * 0.5)}Z" fill="${c.shade}" opacity=".85"/><path d="M${f(sd * brx * 0.8)},${f(by)} q${f(sd * 6)},8 ${f(sd * 2)},18" stroke="${c.light}" stroke-width="2" fill="none" opacity=".5"/></g>`;
  s += wing(-1) + wing(1);
  s += `<path d="M-10,${f(G - 18)} v7 M-14,${f(G - 11)} h8 M10,${f(G - 18)} v7 M6,${f(G - 11)} h8" stroke="#E9A06A" stroke-width="3.5" stroke-linecap="round"/>`;
  let h = '';
  h += `<path d="M-4,${f(hy - hr * 0.88)} q-4,-14 5,-17 q-1,8 4,9 q2,-9 9,-7 q-5,5 -3,14" fill="${c.inner}"/>`;
  h += ell(0, hy, hr, hr * 0.95, `url(#${id}b)`, E) + ell(0, hy + hr * 0.45, hr * 0.62, hr * 0.42, `url(#${id}l)`);
  h += `<g class="pet-face">${eyes(id, mood, 0, hy - hr * 0.12, hr * 1.05, stage <= 2)}${blush(id, 0, hy, hr)}</g>`;
  const open = mood === 'hungry' || mood === 'eat' || mood === 'play';
  h += `<path d="M-7,${f(hy + hr * 0.16)} Q0,${f(hy + hr * 0.06)} 7,${f(hy + hr * 0.16)} Q6,${f(hy + hr * 0.52)} 0,${f(hy + hr * 0.6)} Q-6,${f(hy + hr * 0.52)} -7,${f(hy + hr * 0.16)}Z" fill="${c.nose}"/>`;
  if (open) h += `<path d="M-5,${f(hy + hr * 0.6)} Q0,${f(hy + hr * 0.86)} 5,${f(hy + hr * 0.6)}" fill="#E08A4E"/>`;
  h += accessories(stage, 0, hy, hr, hy + hr * 0.86, hr * 0.5, hr * 0.62, hy - hr * 0.8);
  return `<g class="pet-body">${s}</g><g class="pet-head" style="transform-origin:0px ${f(hy + hr * 0.8)}px">${h}</g>`;
}

// ---------- черепашка ----------
function turtle(id, stage, mood) {
  const c = PAL.turtle;
  const t = stage / 6;
  const G = 92;
  const srx = 46 + 12 * t, sry = 33 + 8 * t, sy = G - 18;
  const hr = 29 - 2 * t, hx = 0, hy = sy - sry * 0.32 - hr * 0.2 - 6;
  const E = edge(c);
  let s = '';
  s += ell(-srx * 0.68, G - 8, 12, 9, `url(#${id}b)`, E) + ell(srx * 0.68, G - 8, 12, 9, `url(#${id}b)`, E);
  s += `<g class="pet-tail" style="transform-origin:${f(srx * 0.9)}px ${f(sy + 8)}px"><path d="M${f(srx * 0.85)},${f(sy + 6)} q13,2 15,-6 q-5,12 -15,12Z" fill="${c.main}"/></g>`;
  s += `<path d="M${f(-srx)},${f(sy + 8)} Q${f(-srx)},${f(sy - sry * 1.15)} 0,${f(sy - sry * 1.15)} Q${f(srx)},${f(sy - sry * 1.15)} ${f(srx)},${f(sy + 8)}Z" fill="url(#${id}s)"/>`;
  const hex = (x, y, r) => `<path d="M${f(x - r)},${f(y)} L${f(x - r / 2)},${f(y - r * 0.85)} L${f(x + r / 2)},${f(y - r * 0.85)} L${f(x + r)},${f(y)} L${f(x + r / 2)},${f(y + r * 0.85)} L${f(x - r / 2)},${f(y + r * 0.85)}Z" fill="${c.light}" opacity=".28" stroke="${c.light}" stroke-opacity=".5" stroke-width="1.5" stroke-linejoin="round"/>`;
  s += hex(0, sy - sry * 0.5, 12 + 3 * t) + hex(-srx * 0.52, sy - sry * 0.2, 9 + 2 * t) + hex(srx * 0.52, sy - sry * 0.2, 9 + 2 * t);
  s += `<rect x="${f(-srx - 2)}" y="${f(sy + 2)}" width="${f(srx * 2 + 4)}" height="11" rx="5.5" fill="${c.light}"/>`;
  let h = '';
  h += ell(hx, hy + hr * 0.24, hr * 0.52, hr * 0.68, `url(#${id}b)`);
  h += ell(hx, hy, hr, hr * 0.86, `url(#${id}b)`, E);
  h += `<g class="pet-face">${eyes(id, mood, hx, hy, hr * 1.05, true)}${blush(id, hx, hy, hr)}${mouth(c, 'cat', mood, hx, hy, hr)}</g>`;
  h += accessories(stage, hx, hy, hr, hy + hr * 0.84, hr * 0.48, hx + hr * 0.6, hy - hr * 0.72, true);
  const shell = `<defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(c.mark, '#FFFFFF', .2)}"/><stop offset="1" stop-color="${c.inner}"/></linearGradient></defs>`;
  return `${shell}<g class="pet-body">${s}</g><g class="pet-head" style="transform-origin:${f(hx)}px ${f(hy + hr)}px">${h}</g>`;
}

function overlays(mood) {
  if (mood !== 'dirty') return '';
  return `<g class="pet-dirt" opacity=".55"><ellipse cx="-24" cy="62" rx="8" ry="5" fill="#A8836A"/><ellipse cx="22" cy="40" rx="6" ry="4" fill="#A8836A"/><ellipse cx="28" cy="-34" rx="5" ry="3.5" fill="#A8836A"/></g>`
    + `<g class="pet-fly"><circle r="2.6" fill="#3B2B33"/><ellipse cx="-3" cy="-3.5" rx="3" ry="2" fill="#fff" opacity=".8"/><ellipse cx="3" cy="-3.5" rx="3" ry="2" fill="#fff" opacity=".8"/></g>`;
}

export function petSVG(species, { stage = 0, mood = 'happy', cls = '', size } = {}) {
  const id = 'p' + (++UID);
  const c = PAL[species] || PAL.cat_ginger;
  let inner;
  if (species === 'parrot') inner = parrot(id, stage, mood);
  else if (species === 'turtle') inner = turtle(id, stage, mood);
  else inner = furry(id, species, stage, mood);
  const sc = 0.74 + 0.26 * (stage / 6);
  const sz = size ? ` width="${size}" height="${size}"` : '';
  return `<svg class="pet-svg mood-${mood} ${cls}" viewBox="-100 -110 200 210"${sz} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${defs(id, c)}`
    + `<ellipse class="pet-shadow" cx="0" cy="95" rx="${f(58 * sc)}" ry="7" fill="#000" opacity=".14"/>`
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
