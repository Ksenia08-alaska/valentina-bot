// Наш рыжий котик — детальная прорисовка по стадиям роста и позы для сценария.
// gingerSVG({ stage: 0..6, mood, pose: 'sit'|'walk'|'stand'|'eat'|'play'|'scratch'|'groom'|'sleep' })

const C = {
  main: '#F3A867', hi: '#FBC897', light: '#FFEEDD', shade: '#D9823F', stripe: '#DD8545',
  ear: '#F6B9B4', nose: '#E98A99', eye: '#2C2230', line: '#C77437',
};
// пропорции по стадиям: голова, тело (полуширина/полувысота), лапы, хвост, уши, глаза, пушистость, общий масштаб
const P = [
  { hr: 34, bw: 24, bh: 17, lg: 9, tl: 18, ear: .74, eye: .2, fluff: 0, s: .6 },
  { hr: 33, bw: 28, bh: 19, lg: 12, tl: 26, ear: .84, eye: .19, fluff: 0, s: .68 },
  { hr: 32, bw: 32, bh: 20, lg: 16, tl: 34, ear: .95, eye: .175, fluff: 0, s: .76 },
  { hr: 30, bw: 36, bh: 20, lg: 22, tl: 42, ear: 1.12, eye: .16, fluff: .1, s: .84 },
  { hr: 31, bw: 40, bh: 23, lg: 21, tl: 46, ear: 1.05, eye: .15, fluff: .35, s: .9 },
  { hr: 33, bw: 44, bh: 27, lg: 20, tl: 48, ear: 1, eye: .145, fluff: .7, s: .96 },
  { hr: 35, bw: 47, bh: 30, lg: 20, tl: 50, ear: 1, eye: .145, fluff: 1, s: 1 },
];
const G = 92;
let UID = 0;
const f = (n) => Math.round(n * 10) / 10;

function defs(id) {
  return `<defs>
    <radialGradient id="${id}b" cx=".4" cy=".3" r=".85"><stop offset="0" stop-color="${C.hi}"/><stop offset=".6" stop-color="${C.main}"/><stop offset="1" stop-color="${C.shade}"/></radialGradient>
    <radialGradient id="${id}l" cx=".5" cy=".3" r=".75"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="${C.light}"/></radialGradient>
    <radialGradient id="${id}k" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FF8FAA" stop-opacity=".6"/><stop offset="1" stop-color="#FF8FAA" stop-opacity="0"/></radialGradient>
    <linearGradient id="${id}e" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A2030"/><stop offset="1" stop-color="#5A4064"/></linearGradient>
  </defs>`;
}
const E = `stroke="${C.line}" stroke-opacity=".35" stroke-width="1.4"`;
const ell = (cx, cy, rx, ry, fill, extra = '') => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}" ${extra}/>`;
const tri = (a, b, c, fill, r = 8, extra = '') => `<path d="M${f(a[0])},${f(a[1])} L${f(b[0])},${f(b[1])} L${f(c[0])},${f(c[1])}Z" fill="${fill}" stroke="${fill}" stroke-width="${r}" stroke-linejoin="round" ${extra}/>`;

// ---------- голова ----------
function head(id, p, cx, cy, mood, side = false, stage = 0) {
  const r = p.hr, o = side ? r * 0.2 : 0; // смещение черт при повороте
  const sick = mood === 'sick';
  const earDrop = sick ? 22 : 0;
  const ear = (sd) => {
    const k = p.ear * (side && sd < 0 ? 0.9 : 1);
    const bx = cx + sd * r * 0.55 + o * 0.4, by = cy - r * 0.62;
    const g = `transform="rotate(${sd * earDrop} ${f(bx)} ${f(by)})"`;
    return `<g class="pet-ear" ${g} style="transform-origin:${f(bx)}px ${f(by)}px">`
      + tri([cx + sd * r * 0.18 + o * 0.4, cy - r * 0.74], [cx + sd * r * 0.74 + o * 0.4, cy - r * (0.74 + 0.48 * k)], [cx + sd * r * 0.92 + o * 0.4, cy - r * 0.2], C.main, 9)
      + tri([cx + sd * r * 0.36 + o * 0.4, cy - r * 0.7], [cx + sd * r * 0.7 + o * 0.4, cy - r * (0.7 + 0.34 * k)], [cx + sd * r * 0.8 + o * 0.4, cy - r * 0.36], C.ear, 5, 'opacity=".9"')
      + (p.fluff > .3 ? `<path d="M${f(cx + sd * r * 0.62 + o * .4)},${f(cy - r * 0.62)} l${f(sd * 3)},${f(-6)} M${f(cx + sd * r * 0.7 + o * .4)},${f(cy - r * 0.6)} l${f(sd * 4)},${f(-4)}" stroke="${C.light}" stroke-width="1.6" stroke-linecap="round"/>` : '')
      + '</g>';
  };
  let h = ear(-1) + ear(1);
  // щёки-пушок (сильнее у взрослых)
  const cf = 0.12 + p.fluff * 0.12;
  h += `<path d="M${f(cx - r * .95)},${f(cy + r * .15)} l${f(-r * cf)},${f(r * .12)} l${f(r * cf * 1.2)},${f(r * .05)} l${f(-r * cf * .7)},${f(r * .14)} l${f(r * cf * 1.4)},${f(-r * .02)}Z" fill="${C.main}"/>`
    + `<path d="M${f(cx + r * .95)},${f(cy + r * .15)} l${f(r * cf)},${f(r * .12)} l${f(-r * cf * 1.2)},${f(r * .05)} l${f(r * cf * .7)},${f(r * .14)} l${f(-r * cf * 1.4)},${f(-r * .02)}Z" fill="${C.main}"/>`;
  h += ell(cx, cy, r, r * .88, `url(#${id}b)`, E);
  // полоски на лбу
  h += `<path d="M${f(cx + o * .5)},${f(cy - r * .84)} v${f(r * .26)} M${f(cx - r * .22 + o * .5)},${f(cy - r * .8)} v${f(r * .18)} M${f(cx + r * .22 + o * .5)},${f(cy - r * .8)} v${f(r * .18)}" stroke="${C.stripe}" stroke-width="${f(3.2 + r * .02)}" stroke-linecap="round" opacity=".8"/>`;
  h += `<path d="M${f(cx - r * .98)},${f(cy - r * .05)} q${f(r * .14)},${f(r * .02)} ${f(r * .22)},${f(-r * .08)} M${f(cx + r * .98)},${f(cy - r * .05)} q${f(-r * .14)},${f(r * .02)} ${f(-r * .22)},${f(-r * .08)}" stroke="${C.stripe}" stroke-width="2.8" stroke-linecap="round" fill="none" opacity=".7"/>`;
  // мордочка
  h += ell(cx + o, cy + r * .42, r * .4, r * .28, `url(#${id}l)`);
  // глаза
  const ex = r * .38, ey = cy + r * .1, rx = r * p.eye * (sick ? .85 : 1), ry = rx * 1.2;
  const L = cx - ex + o, R = cx + ex + o;
  const arc = (x, up) => `<path d="M${f(x - rx)},${f(ey + (up ? rx * .3 : 0))} q${f(rx)},${f(up ? -rx * 1.4 : rx * .9)} ${f(rx * 2)},0" fill="none" stroke="${C.eye}" stroke-width="2.6" stroke-linecap="round"/>`;
  const open = (x) => `<g class="pet-eye"><ellipse cx="${f(x)}" cy="${f(ey)}" rx="${f(rx)}" ry="${f(ry)}" fill="url(#${id}e)"/>`
    + `<ellipse cx="${f(x)}" cy="${f(ey + ry * .1)}" rx="${f(rx * .45)}" ry="${f(ry * .7)}" fill="#1A1220" opacity=".55"/>`
    + `<ellipse cx="${f(x + rx * .32)}" cy="${f(ey - ry * .36)}" rx="${f(rx * .4)}" ry="${f(rx * .36)}" fill="#fff"/><circle cx="${f(x - rx * .36)}" cy="${f(ey + ry * .42)}" r="${f(rx * .16)}" fill="#fff" opacity=".85"/></g>`;
  const half = (x) => `<g><ellipse cx="${f(x)}" cy="${f(ey + ry * .3)}" rx="${f(rx)}" ry="${f(ry * .55)}" fill="url(#${id}e)"/><path d="M${f(x - rx * 1.1)},${f(ey)} q${f(rx * 1.1)},${f(ry * .3)} ${f(rx * 2.2)},0" stroke="${C.eye}" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="${f(x + rx * .3)}" cy="${f(ey + ry * .2)}" r="${f(rx * .22)}" fill="#fff"/></g>`;
  const heartE = (x) => `<path transform="translate(${f(x)},${f(ey)}) scale(${f(rx / 8)})" d="M0,6 C-9,0 -10,-8 -4.5,-9 C-1.5,-9.5 0,-7 0,-5 C0,-7 1.5,-9.5 4.5,-9 C10,-8 9,0 0,6Z" fill="#F2768F"/>`;
  let eyes;
  if (mood === 'sleep' || mood === 'groom') eyes = arc(L, false) + arc(R, false);
  else if (mood === 'love') eyes = heartE(L) + heartE(R);
  else if (mood === 'eat' || mood === 'play') eyes = arc(L, true) + arc(R, true);
  else if (mood === 'tired' || sick) eyes = half(L) + half(R);
  else eyes = open(L) + open(R);
  if (mood === 'sad' || mood === 'hungry' || sick) {
    eyes += `<path d="M${f(L - rx)},${f(ey - ry * 1.5)} q${f(rx)},${f(-ry * .5)} ${f(rx * 1.8)},${f(-ry * .2)} M${f(R + rx)},${f(ey - ry * 1.5)} q${f(-rx)},${f(-ry * .5)} ${f(-rx * 1.8)},${f(-ry * .2)}" stroke="${C.eye}" stroke-opacity=".7" stroke-width="1.9" fill="none" stroke-linecap="round"/>`;
  }
  h += `<g class="pet-face">${eyes}`;
  // румянец
  if (!sick) h += ell(cx - r * .62 + o, cy + r * .38, r * .2, r * .12, `url(#${id}k)`) + ell(cx + r * .62 + o, cy + r * .38, r * .2, r * .12, `url(#${id}k)`);
  else h += ell(cx - r * .6 + o, cy + r * .38, r * .18, r * .1, '#9FC3E8', 'opacity=".45"') + ell(cx + r * .6 + o, cy + r * .38, r * .18, r * .1, '#9FC3E8', 'opacity=".45"');
  // нос и рот
  const ny = cy + r * .32, ns = r * .075, nx = cx + o;
  h += `<path d="M${f(nx - ns)},${f(ny - ns * .5)} Q${f(nx)},${f(ny - ns * .9)} ${f(nx + ns)},${f(ny - ns * .5)} Q${f(nx + ns * .6)},${f(ny + ns * .8)} ${f(nx)},${f(ny + ns * .9)} Q${f(nx - ns * .6)},${f(ny + ns * .8)} ${f(nx - ns)},${f(ny - ns * .5)}Z" fill="${C.nose}"/>`;
  const my = cy + r * .44, ms = r * .1;
  if (mood === 'eat' || mood === 'hungry') h += `<ellipse cx="${f(nx)}" cy="${f(my + ms * .6)}" rx="${f(ms * .7)}" ry="${f(ms * .6)}" fill="#9B4A5E"/><ellipse cx="${f(nx)}" cy="${f(my + ms * .9)}" rx="${f(ms * .42)}" ry="${f(ms * .26)}" fill="#F48FA6"/>`;
  else if (mood === 'groom') h += `<path d="M${f(nx - ms * .4)},${f(my + ms * .2)} q${f(ms * .4)},${f(ms * 1.4)} ${f(ms * .8)},0" fill="#F48FA6"/>`;
  else if (mood === 'sad' || sick || mood === 'tired') h += `<path d="M${f(nx - ms * .8)},${f(my + ms * .9)} q${f(ms * .8)},${f(-ms * .7)} ${f(ms * 1.6)},0" fill="none" stroke="${C.line}" stroke-width="1.9" stroke-linecap="round"/>`;
  else h += `<path d="M${f(nx - ms * 1.3)},${f(my)} q${f(ms * .65)},${f(ms * .8)} ${f(ms * 1.3)},0 q${f(ms * .65)},${f(ms * .8)} ${f(ms * 1.3)},0" fill="none" stroke="${C.line}" stroke-width="1.9" stroke-linecap="round"/>`;
  // градусник, если болеет
  if (sick) h += `<g transform="translate(${f(nx + ms * 1.2)},${f(my + ms * .4)}) rotate(28)"><rect x="0" y="-1.6" width="${f(r * .5)}" height="3.2" rx="1.6" fill="#FFFFFF" stroke="#C9D3E2" stroke-width=".8"/><circle cx="${f(r * .5)}" cy="0" r="2.4" fill="#E8676B"/></g>`;
  // усы
  const wl = r * (.42 + p.fluff * .1);
  h += `<path d="M${f(nx - r * .3)},${f(cy + r * .4)} l${f(-wl)},${f(-r * .07)} M${f(nx - r * .3)},${f(cy + r * .5)} l${f(-wl)},${f(r * .06)} M${f(nx + r * .3)},${f(cy + r * .4)} l${f(wl)},${f(-r * .07)} M${f(nx + r * .3)},${f(cy + r * .5)} l${f(wl)},${f(r * .06)}" stroke="#FFF6EC" stroke-width="1.2" stroke-linecap="round" opacity=".75"/>`;
  h += '</g>';
  // аксессуары на голове
  if (stage === 2) h += bow(cx + r * .62 + o * .4, cy - r * .86, .8);
  if (stage === 6) h += `<g transform="translate(${f(cx + r * .1 + o * .3)},${f(cy - r * .9)}) rotate(-6)"><path d="M-14,5 L-16,-8 L-7,-2 L0,-13 L7,-2 L16,-8 L14,5Z" fill="#F1CF8E" stroke="#D9A85A" stroke-width="1.5" stroke-linejoin="round"/><circle cy="-1" r="2.4" fill="#F2A1B5"/></g>`;
  return h;
}

function bow(x, y, s = 1) {
  return `<g transform="translate(${f(x)},${f(y)}) rotate(18) scale(${s})"><path d="M0,0 C-6,-8 -14,-6 -13,0 C-14,6 -6,8 0,0Z" fill="#F2A1B5"/><path d="M0,0 C6,-8 14,-6 13,0 C14,6 6,8 0,0Z" fill="#F2A1B5"/><circle r="3" fill="#D97A93"/></g>`;
}
function collar(x, y, w, rot = 0) {
  return `<g transform="rotate(${rot} ${f(x)} ${f(y)})"><path d="M${f(x - w)},${f(y - 3)} Q${f(x)},${f(y + 5)} ${f(x + w)},${f(y - 3)}" fill="none" stroke="#E68FA5" stroke-width="4.2" stroke-linecap="round"/>`
    + `<path transform="translate(${f(x)},${f(y + 7)}) scale(.55)" d="M0,8 C-11,0 -11,-9 -5,-10 C-2,-10.5 0,-8 0,-6 C0,-8 2,-10.5 5,-10 C11,-9 11,0 0,8Z" fill="#F1CF8E"/></g>`;
}
function stripesTail(d, w) {
  return `<path d="${d}" fill="none" stroke="${C.shade}" stroke-width="${w + 3}" stroke-linecap="round" opacity=".45"/>`
    + `<path d="${d}" fill="none" stroke="${C.main}" stroke-width="${w}" stroke-linecap="round"/>`
    + `<path d="${d}" fill="none" stroke="${C.stripe}" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="3 9" opacity=".8"/>`;
}

// ---------- сидит (анфас) ----------
function sit(id, p, stage, mood, groom = false) {
  const bw = p.bw * .78, bh = p.bh * 1.9 + p.lg * .6;
  const by = G - bh * .55;
  const top = by - bh * .55;
  const hx = 0, hy = top - p.hr * .5;
  const tw = 7 + stage * .9 + p.fluff * 4;
  let s = '';
  // хвост обвивает лапки
  const td = `M${f(bw * .7)},${f(G - 8)} C${f(bw + p.tl * .5)},${f(G - 2)} ${f(bw + p.tl * .2)},${f(G - p.tl * .8)} ${f(bw * .5 + p.tl * .3)},${f(G - p.tl * 1.05)}`;
  s += `<g class="pet-tail" style="transform-origin:${f(bw * .7)}px ${f(G - 8)}px">${stripesTail(td, tw)}</g>`;
  // задние лапы
  s += ell(-bw * .82, G - 9, 13 + stage * 1.2, 9.5, `url(#${id}b)`, E) + ell(bw * .82, G - 9, 13 + stage * 1.2, 9.5, `url(#${id}b)`, E);
  // тело
  s += `<g class="pet-body">${ell(0, by, bw, bh * .58, `url(#${id}b)`, E)}`;
  s += ell(0, by - bh * .08, bw * .5, bh * .3, `url(#${id}l)`);
  if (p.fluff > .3) {
    let bib = '';
    const n = 5, w = bw * .62;
    for (let i = 0; i < n; i++) { const x = -w + (2 * w / (n - 1)) * i; bib += `<circle cx="${f(x)}" cy="${f(top + 8 + Math.abs(x) * .15)}" r="${f(5 + p.fluff * 3)}" fill="#FFFFFF" opacity=".95"/>`; }
    s += bib;
  }
  s += `<path d="M${f(-bw * .92)},${f(by - 4)} q7,2 11,-2 M${f(-bw * .9)},${f(by + 9)} q7,2 11,-2 M${f(bw * .92)},${f(by - 4)} q-7,2 -11,-2 M${f(bw * .9)},${f(by + 9)} q-7,2 -11,-2" stroke="${C.stripe}" stroke-width="3.4" stroke-linecap="round" fill="none" opacity=".75"/>`;
  // передние лапки
  const lw = 7 + stage * .5, lx = bw * .3;
  const leg = (x, raised) => {
    if (raised) {
      return `<g class="groom-paw" style="transform-origin:${f(x)}px ${f(top + 10)}px"><rect x="${f(x - lw / 2)}" y="${f(top - p.lg * .2)}" width="${f(lw)}" height="${f(p.lg + 14)}" rx="${f(lw / 2)}" fill="${C.main}" transform="rotate(-150 ${f(x)} ${f(top + 10)})"/>`
        + `<ellipse cx="${f(x + 2)}" cy="${f(hy + p.hr * .55)}" rx="${f(lw * .8)}" ry="${f(lw * .65)}" fill="${C.light}"/></g>`;
    }
    const ly = by + bh * .05;
    return `<rect x="${f(x - lw / 2)}" y="${f(ly)}" width="${f(lw)}" height="${f(G - ly - 4)}" rx="${f(lw / 2)}" fill="url(#${id}b)" ${E}/>`
      + `<path d="M${f(x - lw / 2 + 1)},${f(ly + (G - ly) * .45)} h${f(lw - 2)}" stroke="${C.stripe}" stroke-width="2.2" stroke-linecap="round" opacity=".7"/>`
      + ell(x, G - 4, lw * .82, lw * .58, `url(#${id}l)`, E)
      + `<path d="M${f(x - 2.2)},${f(G - 3)} v3 M${f(x + 2.2)},${f(G - 3)} v3" stroke="${C.line}" stroke-width="1.2" stroke-linecap="round" opacity=".5"/>`;
  };
  s += leg(-lx, false) + leg(lx, groom);
  s += '</g>';
  // ошейник
  if (stage >= 3) s += collar(0, top + 4, p.hr * .48);
  const cloud = mood === 'sick' ? `<g class="sick-cloud" transform="translate(${f(hx + p.hr * .95)},${f(hy - p.hr * 1.15)})"><ellipse cx="0" cy="0" rx="13" ry="7.5" fill="#9AA6BC"/><ellipse cx="-8" cy="2" rx="8.5" ry="6" fill="#9AA6BC"/><ellipse cx="8" cy="2" rx="8.5" ry="6" fill="#9AA6BC"/><path d="M-6,10 l-2,6 M2,10 l-2,6 M10,10 l-2,6" stroke="#8FC4F0" stroke-width="2" stroke-linecap="round"/></g>` : '';
  return `${s}<g class="pet-head" style="transform-origin:${f(hx)}px ${f(hy + p.hr * .8)}px">${head(id, p, hx, hy, groom ? 'groom' : mood, false, stage)}</g>${cloud}`;
}

// ---------- сбоку (идёт / стоит / ест / играет / точит когти) ----------
function side(id, p, stage, mood, pose, headRot = 0) {
  const bw = p.bw, bh = p.bh, lg = p.lg + 6;
  const cy = G - lg - bh * .7;
  const lw = 7 + stage * .55;
  const tw = 6 + stage * .9 + p.fluff * 4;
  let s = '';
  // хвост
  const td = `M${f(-bw * .9)},${f(cy - bh * .3)} C${f(-bw - p.tl * .5)},${f(cy - bh * .5)} ${f(-bw - p.tl * .55)},${f(cy - bh - p.tl * .6)} ${f(-bw - p.tl * .2)},${f(cy - bh - p.tl * .85)}`;
  s += `<g class="pet-tail" style="transform-origin:${f(-bw * .9)}px ${f(cy - bh * .3)}px">${stripesTail(td, tw)}</g>`;
  const scratch = pose === 'scratch';
  const legEl = (x, far, cls) => {
    const col = far ? C.shade : `url(#${id}b)`;
    const front = x > 0;
    if (scratch && front) {
      return `<g transform="rotate(${far ? -58 : -72} ${f(x)} ${f(cy + bh * .2)})"><g class="scratch-paw ${far ? 'b' : ''}" style="transform-origin:${f(x)}px ${f(cy + bh * .2)}px">`
        + `<rect x="${f(x - lw / 2)}" y="${f(cy + bh * .2)}" width="${f(lw)}" height="${f(lg + 6)}" rx="${f(lw / 2)}" fill="${col}" ${far ? 'opacity=".9"' : E}/>`
        + ell(x, cy + bh * .2 + lg + 6, lw * .8, lw * .6, far ? C.shade : C.light) + '</g></g>';
    }
    return `<g class="${cls}" style="transform-origin:${f(x)}px ${f(cy + bh * .3)}px">`
      + `<rect x="${f(x - lw / 2)}" y="${f(cy + bh * .2)}" width="${f(lw)}" height="${f(G - cy - bh * .2 - 2)}" rx="${f(lw / 2)}" fill="${col}" ${far ? 'opacity=".9"' : E}/>`
      + ell(x + 2, G - 3, lw * .8, lw * .55, far ? C.shade : C.light, far ? 'opacity=".9"' : E) + '</g>';
  };
  // дальние лапы
  s += legEl(-bw * .5, true, 'lg-b') + legEl(bw * .58, true, 'lg-a');
  // тело
  s += `<g class="pet-body"><path d="M${f(-bw)},${f(cy)} C${f(-bw)},${f(cy - bh * 1.15)} ${f(bw)},${f(cy - bh * 1.2)} ${f(bw)},${f(cy - bh * .1)} C${f(bw)},${f(cy + bh * .9)} ${f(-bw)},${f(cy + bh * .9)} ${f(-bw)},${f(cy)}Z" fill="url(#${id}b)" ${E}/>`;
  s += ell(bw * .1, cy + bh * .45, bw * .65, bh * .35, `url(#${id}l)`, 'opacity=".95"');
  s += `<path d="M${f(-bw * .5)},${f(cy - bh * .95)} q4,8 1,14 M${f(-bw * .1)},${f(cy - bh * 1.05)} q4,9 1,15 M${f(bw * .3)},${f(cy - bh * 1)} q4,8 1,14" stroke="${C.stripe}" stroke-width="3.6" stroke-linecap="round" fill="none" opacity=".75"/>`;
  if (p.fluff > .3) s += `<path d="M${f(bw * .75)},${f(cy - bh * .6)} q6,8 2,16 q5,4 1,10" stroke="#FFFFFF" stroke-width="${f(6 + p.fluff * 4)}" stroke-linecap="round" fill="none" opacity=".9"/>`;
  s += '</g>';
  // ближние лапы
  s += legEl(-bw * .62, false, 'lg-a') + legEl(bw * .46, false, 'lg-b');
  // голова
  let hx = bw * .95, hy = cy - bh - p.hr * .35;
  let tr = headRot ? `rotate(${headRot} ${f(hx)} ${f(hy)})` : '';
  if (pose === 'eat') { hx = bw * .98; hy = cy - p.hr * .05; tr = `rotate(10 ${f(hx)} ${f(hy)})`; }
  const col = stage >= 3 ? collar(hx - p.hr * .2, hy + p.hr * .78, p.hr * .42, -20) : '';
  return `${s}${col}<g transform="${tr}"><g class="pet-head" style="transform-origin:${f(hx)}px ${f(hy + p.hr * .8)}px">${head(id, p, hx, hy, pose === 'eat' ? 'eat' : pose === 'play' || pose === 'scratch' ? 'play' : mood, true, stage)}</g></g>`;
}

// ---------- спит клубочком ----------
function sleep(id, p, stage) {
  const bw = p.bw * 1.15, bh = p.bh * .95;
  const cy = G - bh;
  const tw = 6 + stage * .9 + p.fluff * 4;
  let s = `<g class="pet-body">${ell(0, cy, bw, bh, `url(#${id}b)`, E)}`;
  s += `<path d="M${f(-bw * .5)},${f(cy - bh * .9)} q4,7 1,12 M${f(-bw * .1)},${f(cy - bh)} q4,8 1,13 M${f(bw * .3)},${f(cy - bh * .9)} q4,7 1,12" stroke="${C.stripe}" stroke-width="3.4" stroke-linecap="round" fill="none" opacity=".75"/>`;
  s += '</g>';
  // хвост вдоль переда
  s += stripesTail(`M${f(-bw * .95)},${f(cy + bh * .3)} C${f(-bw * .6)},${f(G + 2)} ${f(bw * .4)},${f(G + 2)} ${f(bw * .75)},${f(G - 6)}`, tw);
  const hx = bw * .55, hy = cy - bh * .1;
  const r = p.hr * .9;
  return `${s}<g class="pet-head" style="transform-origin:${f(hx)}px ${f(hy + r)}px">${head(id, { ...p, hr: r }, hx, hy, 'sleep', false, stage)}</g>`
    + ell(hx - r * .2, G - 4, 9, 5, C.light, E);
}

export function gingerSVG({ stage = 0, mood = 'happy', pose = 'sit', size, cls = '' } = {}) {
  const id = 'gc' + (++UID);
  const p = P[Math.max(0, Math.min(6, stage))];
  let inner;
  if (pose === 'sleep' || mood === 'sleep') inner = sleep(id, p, stage);
  else if (pose === 'walk' || pose === 'stand' || pose === 'eat' || pose === 'play') inner = `<g transform="translate(${f(-p.bw * .3 - p.hr * .25)},0)">${side(id, p, stage, mood, pose)}</g>`;
  else if (pose === 'scratch') {
    const hip = [-p.bw * .6, G - 4];
    inner = `<g transform="translate(${f(-p.bw * .2)},0) rotate(-14 ${f(hip[0])} ${f(hip[1])})">${side(id, p, stage, mood, 'scratch', 8)}</g>`;
  } else inner = sit(id, p, stage, mood, pose === 'groom');
  const sz = size ? ` width="${size}" height="${size}"` : '';
  return `<svg class="pet-svg ginger pose-${pose} mood-${mood} ${cls}" viewBox="-100 -110 200 210"${sz} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${defs(id)}`
    + `<ellipse class="pet-shadow" cx="0" cy="95" rx="${f(58 * p.s)}" ry="7" fill="#000" opacity=".16"/>`
    + `<g class="pet-root" transform="translate(0,95) scale(${p.s}) translate(0,-95)">${inner}</g>`

    + '</svg>';
}
