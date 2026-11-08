// Мини-игры: «Вкусняшки» (ловить еду) и «Пары» (мемори).
import { petSVG } from './art/pets.js';
import { foodSVG, icon } from './art/icons.js';
import { haptic } from './tg.js';
import { $, $$ } from './ui.js';

function svgImage(svg) {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.includes('xmlns') ? svg : svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"'));
  });
}

const CLOUD = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M16 46a10 10 0 0 1 0-20 14 14 0 0 1 27-4 11 11 0 0 1 5 24z" fill="#9AA3B8" stroke="#3B2B33" stroke-width="2.4" stroke-linejoin="round"/><path d="M22 50l-3 8M32 50l-3 8M42 50l-3 8" stroke="#6FA8DC" stroke-width="3" stroke-linecap="round"/><path d="M24 36q3-3 6 0M36 36q3-3 6 0" fill="none" stroke="#3B2B33" stroke-width="2.2" stroke-linecap="round"/></svg>`;
const STAR = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M32 6l7.6 15.4 17 2.5-12.3 12 2.9 16.9L32 44.8 16.8 52.8l2.9-16.9-12.3-12 17-2.5z" fill="#FFD25E" stroke="#3B2B33" stroke-width="2.6" stroke-linejoin="round"/></svg>`;

export async function catchGame(root, { species, stage, foods, fav, onEnd }) {
  root.innerHTML = `<canvas class="game-cv"></canvas>
    <p class="muted tiny" style="text-align:center;margin-top:10px">Води пальцем по экрану — лови вкусняшки и звёздочки, уворачивайся от тучек</p>`;
  const cv = $('canvas', root);
  const W = Math.min(root.clientWidth || 360, 520);
  const H = Math.round(Math.min(window.innerHeight * 0.62, W * 1.35));
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = W * dpr; cv.height = H * dpr; cv.style.height = H + 'px';
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);

  const [petImg, cloud, star, ...foodImgs] = await Promise.all([
    svgImage(petSVG(species, { stage: Math.max(stage, 2), mood: 'eat' })),
    svgImage(CLOUD), svgImage(STAR),
    ...foods.map((f) => svgImage(foodSVG(f, 64))),
  ]);
  const pet = { x: W / 2, w: 96 };
  const items = [];
  let score = 0, t0 = performance.now(), last = t0, spawnT = 0, running = true, flash = 0, combo = 0;
  const DURATION = 30000;
  const pops = [];

  const move = (e) => {
    const r = cv.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    pet.x = Math.max(pet.w / 2, Math.min(W - pet.w / 2, x));
    if (e.cancelable) e.preventDefault();
  };
  cv.addEventListener('pointermove', move);
  cv.addEventListener('touchmove', move, { passive: false });
  cv.addEventListener('pointerdown', move);

  function spawn(el) {
    const prog = el / DURATION;
    const r = Math.random();
    let kind = 'food', img = foodImgs[Math.floor(Math.random() * foodImgs.length)], fi = foodImgs.indexOf(img);
    if (r < 0.18 + prog * 0.12) { kind = 'cloud'; img = cloud; } else if (r > 0.94) { kind = 'star'; img = star; }
    items.push({ x: 24 + Math.random() * (W - 48), y: -30, v: 140 + Math.random() * 80 + prog * 200, s: 44, kind, img, fav: kind === 'food' && foods[fi] === fav, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 3 });
  }

  function frame(t) {
    if (!running) return;
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    const el = t - t0;
    spawnT -= dt;
    if (spawnT <= 0) { spawn(el); spawnT = Math.max(0.32, 0.8 - el / DURATION * 0.45); }
    ctx.clearRect(0, 0, W, H);
    // земля
    ctx.fillStyle = 'rgba(0,0,0,.05)';
    ctx.beginPath(); ctx.ellipse(pet.x, H - 10, 46, 8, 0, 0, Math.PI * 2); ctx.fill();
    const py = H - 104;
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.y += it.v * dt; it.rot += it.vr * dt;
      ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(it.kind === 'food' ? it.rot : 0);
      if (it.img) ctx.drawImage(it.img, -it.s / 2, -it.s / 2, it.s, it.s);
      ctx.restore();
      if (it.y > py + 20 && it.y < py + 80 && Math.abs(it.x - pet.x) < pet.w / 2) {
        items.splice(i, 1);
        if (it.kind === 'cloud') { score = Math.max(0, score - 3); flash = 0.4; combo = 0; haptic.err(); pops.push({ x: it.x, y: py, txt: '-3', c: '#7E8CF7', t: 0 }); }
        else { combo++; const add = it.kind === 'star' ? 5 : it.fav ? 3 : 1; const bonus = combo >= 5 ? 1 : 0; score += add + bonus; haptic.tap(); pops.push({ x: it.x, y: py, txt: '+' + (add + bonus), c: '#FF5C8A', t: 0 }); }
        continue;
      }
      if (it.y > H + 40) { items.splice(i, 1); if (it.kind !== 'cloud') combo = 0; }
    }
    if (petImg) ctx.drawImage(petImg, pet.x - 60, py - 14, 120, 126);
    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i]; p.t += dt;
      ctx.globalAlpha = Math.max(0, 1 - p.t / 0.8);
      ctx.fillStyle = p.c; ctx.font = '900 24px Nunito, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(p.txt, p.x, p.y - p.t * 70);
      ctx.globalAlpha = 1;
      if (p.t > 0.8) pops.splice(i, 1);
    }
    if (flash > 0) { ctx.fillStyle = `rgba(126,140,247,${flash * 0.5})`; ctx.fillRect(0, 0, W, H); flash -= dt; }
    // HUD
    const left = Math.max(0, DURATION - el);
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    roundRect(ctx, 12, 12, W - 24, 10, 5); ctx.fill();
    const g = ctx.createLinearGradient(12, 0, W - 12, 0); g.addColorStop(0, '#FF9A76'); g.addColorStop(1, '#FF5C8A');
    ctx.fillStyle = g; roundRect(ctx, 12, 12, (W - 24) * (left / DURATION), 10, 5); ctx.fill();
    ctx.fillStyle = '#3B2B33'; ctx.font = '900 30px Comfortaa, Nunito, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(score, 18, 58);
    if (combo >= 5) { ctx.font = '800 14px Nunito, sans-serif'; ctx.fillStyle = '#FF5C8A'; ctx.fillText('комбо ×' + combo, 18, 78); }
    if (left <= 0) { running = false; onEnd(score); return; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame((t) => { t0 = t; last = t; frame(t); });
  return () => { running = false; };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

export function memoryGame(root, { onEnd }) {
  const ids = ['fish', 'apple', 'strawberry', 'cookie', 'cheese', 'grapes', 'carrot', 'bone'];
  const pick = ids.sort(() => Math.random() - 0.5).slice(0, 6);
  const deck = [...pick, ...pick].sort(() => Math.random() - 0.5);
  root.innerHTML = `<div class="row" style="justify-content:space-between;margin-bottom:12px"><span class="chip gray" id="mv">Ходов: 0</span><span class="chip" id="pr">Пар: 0 / 6</span></div>
    <div class="mem">${deck.map((f, i) => `<button class="mcard" data-i="${i}" data-f="${f}"><div class="back">${icon('heart')}</div><div class="front">${foodSVG(f, 54)}</div></button>`).join('')}</div>`;
  let open = [], moves = 0, pairs = 0, lock = false;
  $$('.mcard', root).forEach((c) => {
    c.onclick = () => {
      if (lock || c.classList.contains('open') || c.classList.contains('done')) return;
      haptic.tap();
      c.classList.add('open');
      open.push(c);
      if (open.length === 2) {
        moves++;
        $('#mv', root).textContent = 'Ходов: ' + moves;
        const [a, b] = open;
        if (a.dataset.f === b.dataset.f) {
          a.classList.add('done'); b.classList.add('done'); open = []; pairs++;
          $('#pr', root).textContent = `Пар: ${pairs} / 6`;
          haptic.ok();
          if (pairs === 6) setTimeout(() => onEnd(moves), 600);
        } else {
          lock = true;
          setTimeout(() => { a.classList.remove('open'); b.classList.remove('open'); open = []; lock = false; }, 800);
        }
      }
    };
  });
  return () => {};
}
