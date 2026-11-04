// DevCity : moteur isométrique pixel art. Aucune dépendance.
import { PLOT_SIZE, GRID, STRIDE, GROUNDS } from './rules.js';
import { drawTile, drawBuilding, drawDecor, drawPerson } from './draw.js';

const TW = 16, TH = 8;            // taille d'une tuile en pixels "art"
const SCALE = 3;                  // agrandissement pixel art
const N = GRID * STRIDE + 1;      // tuiles par côté du monde

const canvas = document.getElementById('world');
const ctx = canvas.getContext('2d');
const where = document.getElementById('where');
const dialog = document.getElementById('dialog');

const ground = new Array(N * N).fill('road');
const solid = new Uint8Array(N * N);
const things = [];                // éléments à trier en profondeur
const npcs = [];
const plotAt = new Array(N * N).fill(null);

const player = { x: 4.5, y: 4.5, color: '#3b6fd8', skin: '#8a5a3b', target: null };
const keys = new Set();
let talk = null;

const idx = (x, y) => y * N + x;
const inside = (x, y) => x >= 0 && y >= 0 && x < N && y < N;

async function load() {
  const list = await fetch('plots/index.json').then(r => r.json());
  for (const login of list) {
    try {
      const plot = await fetch(`plots/${login}/plot.json`).then(r => r.json());
      addPlot(login, plot);
    } catch (e) { console.warn('Parcelle ignorée', login, e); }
  }
  // l'avatar démarre sur la route devant la première parcelle
  player.x = 0.5; player.y = 4.5;
}

function addPlot(login, p) {
  const ox = 1 + p.slot.x * STRIDE, oy = 1 + p.slot.y * STRIDE;
  const info = { login, name: p.name };
  for (let y = 0; y < PLOT_SIZE; y++) for (let x = 0; x < PLOT_SIZE; x++) {
    ground[idx(ox + x, oy + y)] = p.ground;
    plotAt[idx(ox + x, oy + y)] = info;
  }
  for (const b of p.buildings || []) {
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) solid[idx(ox + b.x + x, oy + b.y + y)] = 1;
    things.push({ depth: ox + b.x + b.w + oy + b.y + b.h, draw: o => drawBuilding(o, b, ox + b.x, oy + b.y) });
  }
  for (const d of p.decor || []) {
    solid[idx(ox + d.x, oy + d.y)] = 1;
    things.push({ depth: ox + d.x + oy + d.y + 1, draw: o => drawDecor(o, d, ox + d.x, oy + d.y) });
  }
  for (const n of p.npcs || []) {
    const npc = { ...n, x: ox + n.x + 0.5, y: oy + n.y + 0.5, line: 0 };
    solid[idx(ox + n.x, oy + n.y)] = 1;
    npcs.push(npc);
  }
}

function blocked(x, y) {
  const tx = Math.floor(x), ty = Math.floor(y);
  return !inside(tx, ty) || solid[idx(tx, ty)];
}

function update(dt) {
  if (talk) return;
  let dx = 0, dy = 0;
  if (keys.has('ArrowUp') || keys.has('z') || keys.has('w')) { dx -= 1; dy -= 1; }
  if (keys.has('ArrowDown') || keys.has('s')) { dx += 1; dy += 1; }
  if (keys.has('ArrowLeft') || keys.has('q') || keys.has('a')) { dx -= 1; dy += 1; }
  if (keys.has('ArrowRight') || keys.has('d')) { dx += 1; dy -= 1; }
  if (dx || dy) player.target = null;
  else if (player.target) {
    dx = player.target.x - player.x; dy = player.target.y - player.y;
    if (Math.hypot(dx, dy) < 0.1) { player.target = null; dx = dy = 0; }
  }
  const len = Math.hypot(dx, dy);
  if (!len) return;
  const sp = 4 * dt / len;
  const nx = player.x + dx * sp, ny = player.y + dy * sp;
  if (!blocked(nx, player.y)) player.x = nx;
  if (!blocked(player.x, ny)) player.y = ny;
  const here = plotAt[idx(Math.floor(player.x), Math.floor(player.y))];
  where.innerHTML = here
    ? `${esc(here.name)} · par <a href="https://github.com/${here.login}" target="_blank" rel="noopener">@${here.login}</a>`
    : 'Rue principale';
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function nearestNpc() {
  let best = null, bd = 1.6;
  for (const n of npcs) {
    const d = Math.hypot(n.x - player.x, n.y - player.y);
    if (d < bd) { bd = d; best = n; }
  }
  return best;
}

function speak() {
  if (talk) {
    talk.line++;
    if (talk.line >= talk.dialogue.length) { talk.line = 0; talk = null; dialog.hidden = true; return; }
  } else {
    talk = nearestNpc();
    if (!talk) return;
  }
  document.getElementById('dialog-name').textContent = talk.name;
  document.getElementById('dialog-text').textContent = talk.dialogue[talk.line];
  dialog.hidden = false;
}

// ---------- rendu ----------
let W = 0, H = 0, camX = 0, camY = 0;
const off = document.createElement('canvas');
const o = off.getContext('2d');

function resize() {
  canvas.width = innerWidth; canvas.height = innerHeight;
  W = off.width = Math.ceil(innerWidth / SCALE);
  H = off.height = Math.ceil(innerHeight / SCALE);
}

const toScreen = (x, y) => [(x - y) * TW / 2, (x + y) * TH / 2];

function render() {
  [camX, camY] = toScreen(player.x, player.y);
  o.setTransform(1, 0, 0, 1, Math.round(W / 2 - camX), Math.round(H / 2 - camY));
  o.fillStyle = '#1b1410';
  o.fillRect(camX - W, camY - H, W * 2, H * 2);

  const r = Math.ceil(Math.max(W / TW, H / TH)) + 2;
  const cx = Math.floor(player.x), cy = Math.floor(player.y);
  for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
    if (!inside(x, y)) continue;
    drawTile(o, GROUNDS[ground[idx(x, y)]] || GROUNDS.road, x, y);
  }

  const list = things.slice();
  for (const n of npcs) list.push({ depth: n.x + n.y, draw: c => drawPerson(c, n.x, n.y, n.color, n.skin) });
  list.push({ depth: player.x + player.y, draw: c => drawPerson(c, player.x, player.y, player.color, player.skin, true) });
  list.sort((a, b) => a.depth - b.depth);
  for (const t of list) t.draw(o);

  const n = nearestNpc();
  if (n && !talk) {
    const [sx, sy] = toScreen(n.x, n.y);
    o.fillStyle = '#ffd27a'; o.font = '8px monospace'; o.textAlign = 'center';
    o.fillText('E', sx, sy - 22);
  }

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(off, 0, 0, W * SCALE, H * SCALE);
}

let last = performance.now();
function loop(t) {
  update(Math.min(0.05, (t - last) / 1000)); last = t;
  render();
  requestAnimationFrame(loop);
}

addEventListener('resize', resize);
addEventListener('keydown', e => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (k === 'e' || k === ' ' || k === 'Enter') { speak(); e.preventDefault(); return; }
  keys.add(k);
});
addEventListener('keyup', e => keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key));
canvas.addEventListener('click', e => {
  if (talk) return speak();
  const sx = e.clientX / SCALE - W / 2 + camX, sy = e.clientY / SCALE - H / 2 + camY;
  const x = (sx / (TW / 2) + sy / (TH / 2)) / 2, y = (sy / (TH / 2) - sx / (TW / 2)) / 2;
  const n = npcs.find(n => Math.hypot(n.x - x, n.y - y) < 0.8);
  if (n && Math.hypot(n.x - player.x, n.y - player.y) < 1.6) return speak();
  player.target = { x, y };
});
dialog.addEventListener('click', speak);

resize();
load().then(() => requestAnimationFrame(loop));
