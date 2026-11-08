// Портреты для «Мы сейчас»: наши лица с выражением под выбранное чувство.
let N = 0;
const SK = '#F8DCCD', SK2 = '#EBC1AD', INK = '#4A2F3A';

function exprFor(emotion) {
  return ({
    happy: 'happy', love: 'love', miss: 'miss', calm: 'calm', tender: 'tender', inspired: 'inspired',
    tired: 'tired', sad: 'sad', anxious: 'anxious', angry: 'angry',
  })[emotion] || 'soft';
}

function features(kind, cx, cy, level) {
  const ex = 8, L = cx - ex, R = cx + ex, my = cy + 12;
  const dot = (x) => `<ellipse cx="${x}" cy="${cy}" rx="2.3" ry="2.7" fill="${INK}"/><circle cx="${x + .8}" cy="${cy - 1}" r=".8" fill="#fff"/>`;
  const arcUp = (x) => `<path d="M${x - 3.4},${cy + 1} q3.4,-4 6.8,0" stroke="${INK}" stroke-width="1.9" fill="none" stroke-linecap="round"/>`;
  const arcDown = (x) => `<path d="M${x - 3.4},${cy - .5} q3.4,3 6.8,0" stroke="${INK}" stroke-width="1.9" fill="none" stroke-linecap="round"/>`;
  const heart = (x) => `<path transform="translate(${x},${cy}) scale(.32)" d="M0,8 C-11,0 -11,-9 -5,-10 C-2,-10.5 0,-8 0,-6 C0,-8 2,-10.5 5,-10 C11,-9 11,0 0,8Z" fill="#F0627F"/>`;
  const brows = (inner) => `<path d="M${L - 4},${cy - 6 + (inner > 0 ? 0 : 2)} L${L + 3},${cy - 6 + (inner > 0 ? 2.5 : -1.5)} M${R + 4},${cy - 6 + (inner > 0 ? 0 : 2)} L${R - 3},${cy - 6 + (inner > 0 ? 2.5 : -1.5)}" stroke="${INK}" stroke-width="1.7" stroke-linecap="round"/>`;
  const smile = (w = 4, h = 3) => `<path d="M${cx - w},${my} q${w},${h} ${w * 2},0" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  const frown = (w = 3.5) => `<path d="M${cx - w},${my + 2} q${w},-3 ${w * 2},0" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  const open = `<path d="M${cx - 4.5},${my - 1} q4.5,6 9,0z" fill="#B44A63"/>`;
  const blushO = Math.min(.75, .25 + level / 160) + (kind === 'tender' || kind === 'love' ? .15 : 0);
  let f = `<ellipse cx="${cx - 12}" cy="${cy + 7}" rx="4.5" ry="2.6" fill="#F28CA6" opacity="${blushO}"/><ellipse cx="${cx + 12}" cy="${cy + 7}" rx="4.5" ry="2.6" fill="#F28CA6" opacity="${blushO}"/>`;
  switch (kind) {
    case 'happy': f += arcUp(L) + arcUp(R) + open; break;
    case 'love': f += heart(L) + heart(R) + smile(4.5, 3.5); break;
    case 'miss': f += arcDown(L) + arcDown(R) + brows(1) + `<path d="M${cx - 3},${my + 1} q3,1.6 6,0" stroke="${INK}" stroke-width="1.7" fill="none" stroke-linecap="round"/>`; break;
    case 'calm': f += arcDown(L) + arcDown(R) + smile(3.5, 2.4); break;
    case 'tender': f += arcDown(L) + arcDown(R) + smile(3, 2.6); break;
    case 'inspired': f += dot(L) + dot(R) + open + `<path transform="translate(${cx + 19},${cy - 15}) scale(.5)" d="M0,-9 L2.6,-2.8 L9,-2.8 L3.8,1.2 L5.8,7.6 L0,3.6 L-5.8,7.6 L-3.8,1.2 L-9,-2.8 L-2.6,-2.8Z" fill="#F6C860"/>`; break;
    case 'tired': f += `<path d="M${L - 3.4},${cy} h6.8 M${R - 3.4},${cy} h6.8" stroke="${INK}" stroke-width="1.9" stroke-linecap="round"/>` + `<path d="M${cx - 3},${my + 1} h6" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>`; break;
    case 'sad': f += dot(L) + dot(R) + brows(1) + frown() + `<path d="M${R + 3},${cy + 4} q1.6,3 0,5 q-1.6,-2 0,-5z" fill="#8FC4F0"/>`; break;
    case 'anxious': f += dot(L) + dot(R) + brows(1) + `<path d="M${cx - 5},${my + 1} q1.6,-2 3.3,0 q1.6,2 3.3,0 q1.6,-2 3.3,0" stroke="${INK}" stroke-width="1.6" fill="none" stroke-linecap="round"/>` + `<path d="M${cx + 16},${cy - 10} q2,3.5 0,5.5 q-2,-2 0,-5.5z" fill="#8FC4F0"/>`; break;
    case 'angry': f += dot(L) + dot(R) + brows(-1) + frown(4); break;
    default: f += dot(L) + dot(R) + smile(3.5, 2.6);
  }
  return f;
}

// who: 'girl' | 'boy'; mood: {emotion, color, level}
export function portrait(who, mood, size = 120) {
  const id = 'pf' + (++N);
  const col = (mood && mood.color) || '#8A8A94';
  const level = mood ? mood.level : 0;
  const kind = mood ? exprFor(mood.emotion) : 'soft';
  const C = 2 * Math.PI * 54;
  const girl = who === 'girl';
  const cx = 60, cy = 58;
  const bust = girl ? `
    <path d="M60,26 C40,26 38,46 39,64 C38,84 36,100 34,120 L86,120 C84,100 82,84 81,64 C82,46 80,26 60,26Z" fill="url(#${id}h)"/>
    <path d="M26,120 C28,100 40,92 60,92 C80,92 92,100 94,120Z" fill="#F4E9DE"/>
    <path d="M50,94 Q60,99 70,94" stroke="#E0CDB9" stroke-width="2.5" fill="none"/>
    <path d="M55,78 L65,78 L65.5,92 L54.5,92Z" fill="${SK2}"/>
    <path d="M60,32 C71,32 78,40 78,53 C78,66 70,76 60,77 C50,76 42,66 42,53 C42,40 49,32 60,32Z" fill="${SK}"/>
    ${features(kind, cx, cy, level)}
    <path d="M60,29 C46,29 38,38 38,54 C37,66 38,76 39,86 Q42,88 44,84 C44,70 43,58 46,48 Q52,37 60,33Z" fill="url(#${id}hf)"/>
    <path d="M60,29 C74,29 82,38 82,54 C83,66 82,76 81,86 Q78,88 76,84 C76,70 77,58 74,48 Q68,37 60,33Z" fill="url(#${id}hf)"/>
    <path d="M55,32 Q46,40 44,56 M65,32 Q74,40 76,56" stroke="#EED4AC" stroke-width="1.2" fill="none" opacity=".8"/>`
    : `
    <path d="M22,120 C24,98 38,90 60,90 C82,90 96,98 98,120Z" fill="#34303B"/>
    <path d="M46,92 Q60,104 74,92" stroke="#46424F" stroke-width="3" fill="none"/>
    <path d="M56,98 v12 M64,98 v12" stroke="#E9E4EC" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M54,76 L66,76 L66.5,92 L53.5,92Z" fill="${SK2}"/>
    <ellipse cx="40.5" cy="56" rx="3.6" ry="5.4" fill="${SK2}"/><ellipse cx="79.5" cy="56" rx="3.6" ry="5.4" fill="${SK2}"/>
    <path d="M60,32 C72,32 79,41 79,54 C79,67 72,76 60,77 C48,76 41,67 41,54 C41,41 48,32 60,32Z" fill="${SK}"/>
    ${features(kind, cx, cy, level)}
    <path d="M40,53 C38,36 47,24 61,24 C74,24 82,35 80,53 Q78,45 74,42 Q68,44 63,40 Q56,44 50,40 Q44,43 42,47 Q41,50 40,53Z" fill="url(#${id}hb)"/>
    <path d="M50,28 Q60,25 70,30" stroke="#A9744F" stroke-width="1.3" fill="none" opacity=".75"/>`;
  return `<svg viewBox="0 0 120 120" width="${size}" height="${size}" class="portrait" aria-hidden="true">
    <defs>
      <clipPath id="${id}c"><circle cx="60" cy="60" r="48"/></clipPath>
      <linearGradient id="${id}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#DDB98B"/><stop offset="1" stop-color="#B48A59"/></linearGradient>
      <linearGradient id="${id}hf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E3C394"/><stop offset="1" stop-color="#C29A68"/></linearGradient>
      <linearGradient id="${id}hb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8A5A3B"/><stop offset="1" stop-color="#5C3825"/></linearGradient>
    </defs>
    <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" stroke-opacity=".1" stroke-width="6"/>
    <circle cx="60" cy="60" r="54" fill="none" stroke="${col}" stroke-width="6" stroke-linecap="round"
      stroke-dasharray="${(C * level / 100).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 60 60)" class="ring"/>
    <circle cx="60" cy="60" r="48" fill="${col}" fill-opacity=".16"/>
    <g clip-path="url(#${id}c)">${bust}</g>
  </svg>`;
}
