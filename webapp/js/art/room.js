// Предметы в комнате питомца (нарисованные, не кнопки).

export const bowlSVG = (food = '') => `<svg viewBox="0 0 80 50" width="64" height="40" aria-hidden="true">
  <ellipse cx="40" cy="44" rx="30" ry="4" fill="#000" opacity=".18"/>
  <path d="M8,22 Q40,26 72,22 L66,40 Q40,46 14,40Z" fill="#F2A1B5"/>
  <path d="M8,22 Q40,26 72,22 L70,28 Q40,33 10,28Z" fill="#E68FA5"/>
  <ellipse cx="40" cy="22" rx="32" ry="6" fill="#F7BACB"/>
  <ellipse cx="40" cy="22" rx="27" ry="4" fill="#5A3A44"/>
  ${food}
  <g transform="translate(40,34) scale(.5)" fill="#FFF3F6"><ellipse cx="0" cy="3" rx="5" ry="4"/><circle cx="-6" cy="-3" r="2"/><circle cx="-2" cy="-6" r="2"/><circle cx="2" cy="-6" r="2"/><circle cx="6" cy="-3" r="2"/></g>
</svg>`;

export const ballSVG = () => `<svg viewBox="0 0 60 60" width="44" height="44" aria-hidden="true">
  <ellipse cx="30" cy="55" rx="18" ry="3.5" fill="#000" opacity=".18"/>
  <circle cx="30" cy="32" r="20" fill="#CDB4EC"/>
  <path d="M14,24 Q30,36 46,22 M12,34 Q30,46 48,32 M18,46 Q30,20 42,14 M22,13 Q34,30 48,44" stroke="#A58BD0" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M48,40 Q58,46 54,56 Q52,60 46,58" stroke="#A58BD0" stroke-width="2" fill="none" stroke-linecap="round"/>
  <ellipse cx="23" cy="24" rx="6" ry="4" fill="#fff" opacity=".35"/>
</svg>`;

export const tubSVG = () => `<svg viewBox="0 0 90 60" width="70" height="46" aria-hidden="true">
  <ellipse cx="45" cy="56" rx="34" ry="4" fill="#000" opacity=".18"/>
  <path d="M10,24 L80,24 Q80,52 45,52 Q10,52 10,24Z" fill="#EAF3FB"/>
  <path d="M10,24 L80,24 Q80,32 76,36 Q45,40 14,36 Q10,32 10,24Z" fill="#D6E6F5"/>
  <rect x="6" y="20" width="78" height="7" rx="3.5" fill="#FFFFFF"/>
  <circle cx="26" cy="16" r="7" fill="#fff" opacity=".9"/><circle cx="36" cy="12" r="5" fill="#fff" opacity=".8"/><circle cx="54" cy="15" r="8" fill="#fff" opacity=".9"/><circle cx="64" cy="10" r="4" fill="#fff" opacity=".7"/>
  <circle cx="26" cy="16" r="7" fill="none" stroke="#BFD9F2" stroke-width="1"/><circle cx="54" cy="15" r="8" fill="none" stroke="#BFD9F2" stroke-width="1"/>
  <path d="M22,52 l-3,6 M68,52 l3,6" stroke="#C9B08F" stroke-width="3" stroke-linecap="round"/>
</svg>`;

export const bedSVG = () => `<svg viewBox="0 0 120 56" width="104" height="48" aria-hidden="true">
  <ellipse cx="60" cy="50" rx="52" ry="5" fill="#000" opacity=".2"/>
  <ellipse cx="60" cy="34" rx="54" ry="18" fill="#8F7BB8"/>
  <ellipse cx="60" cy="30" rx="50" ry="15" fill="#B39DEB"/>
  <ellipse cx="60" cy="31" rx="38" ry="10" fill="#CDB9F2"/>
  <path d="M30,30 q30,8 60,0" stroke="#E2D6FA" stroke-width="2" fill="none" opacity=".7"/>
</svg>`;

export const postSVG = () => `<svg viewBox="0 0 60 130" width="46" height="100" aria-hidden="true">
  <ellipse cx="30" cy="124" rx="26" ry="5" fill="#000" opacity=".2"/>
  <rect x="4" y="112" width="52" height="12" rx="5" fill="#B39DEB"/>
  <rect x="20" y="22" width="20" height="92" rx="3" fill="#D8B48C"/>
  ${Array.from({ length: 14 }, (_, i) => `<path d="M20,${28 + i * 6} L40,${31 + i * 6}" stroke="#B8946B" stroke-width="1.6"/>`).join('')}
  <rect x="6" y="12" width="48" height="12" rx="5" fill="#B39DEB"/>
  <circle cx="44" cy="34" r="5" fill="#F2A1B5"/><path d="M44,24 L44,30" stroke="#F2A1B5" stroke-width="1.6"/>
</svg>`;

export const giftSVG = () => `<svg viewBox="0 0 60 60" width="42" height="42" aria-hidden="true">
  <ellipse cx="30" cy="56" rx="20" ry="3" fill="#000" opacity=".2"/>
  <rect x="10" y="26" width="40" height="28" rx="4" fill="#F2A1B5"/>
  <rect x="6" y="18" width="48" height="11" rx="4" fill="#F7BACB"/>
  <rect x="26" y="18" width="8" height="36" fill="#F1CF8E"/>
  <path d="M30,18 C22,6 10,10 16,18Z M30,18 C38,6 50,10 44,18Z" fill="#F1CF8E"/>
</svg>`;

export function petIconsBar(stats) {
  const R = 15, C = 2 * Math.PI * R;
  const meta = [['food', '#F1CF8E', 'Сытость'], ['joy', '#F2A1B5', 'Радость'], ['energy', '#CDB4EC', 'Энергия'], ['clean', '#8FC4F0', 'Чистота']];
  return meta.map(([k, col, t]) => {
    const v = Math.round(stats[k]);
    return `<div class="ring-stat ${v < 30 ? 'low' : ''}"><svg viewBox="0 0 40 40" width="44" height="44">
      <circle cx="20" cy="20" r="${R}" fill="none" stroke="currentColor" stroke-opacity=".12" stroke-width="4"/>
      <circle cx="20" cy="20" r="${R}" fill="none" stroke="${col}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${(C * v / 100).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 20 20)"/>
      <text x="20" y="24" text-anchor="middle" font-size="11" font-weight="800" fill="currentColor">${v}</text></svg><span>${t}</span></div>`;
  }).join('');
}
