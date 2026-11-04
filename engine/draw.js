// Primitives de dessin pixel art isométrique.
const TW = 16, TH = 8;
const P = (x, y) => [Math.round((x - y) * TW / 2), Math.round((x + y) * TH / 2)];

export function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(v * f))));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}

function poly(c, pts, fill) {
  c.fillStyle = fill; c.beginPath();
  pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
  c.closePath(); c.fill();
}

export function drawTile(c, [a, b], x, y) {
  const [tx, ty] = P(x, y);
  poly(c, [[tx, ty], [tx + 8, ty + 4], [tx, ty + 8], [tx - 8, ty + 4]], (x + y) % 2 ? a : b);
}

export function drawBuilding(c, b, x, y) {
  const z = b.height;
  const t = P(x, y), r = P(x + b.w, y), bt = P(x + b.w, y + b.h), l = P(x, y + b.h);
  const up = ([px, py]) => [px, py - z];
  poly(c, [l, bt, up(bt), up(l)], shade(b.color, 0.75));
  poly(c, [bt, r, up(r), up(bt)], shade(b.color, 0.95));
  // porte sur la façade gauche
  const mx = (l[0] + bt[0]) / 2, my = (l[1] + bt[1]) / 2;
  poly(c, [[mx - 2, my - 1], [mx + 2, my + 1], [mx + 2, my - 7], [mx - 2, my - 9]], '#3a2416');
  // fenêtre sur la façade droite
  if (z >= 14) {
    const wx = (bt[0] + r[0]) / 2, wy = (bt[1] + r[1]) / 2 - z / 2;
    poly(c, [[wx - 2, wy + 1], [wx + 2, wy - 1], [wx + 2, wy - 4], [wx - 2, wy - 2]], '#ffd27a');
  }
  const roof = b.roofColor || '#c99a4a';
  if (b.roof === 'flat') {
    poly(c, [up(t), up(r), up(bt), up(l)], shade(b.color, 1.15));
  } else if (b.roof === 'dome') {
    const cx = (t[0] + bt[0]) / 2, cy = (t[1] + bt[1]) / 2 - z;
    const rw = Math.abs(r[0] - l[0]) / 2;
    c.fillStyle = shade(roof, 0.85);
    c.beginPath(); c.ellipse(cx, cy, rw, rw * 0.5, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = roof;
    c.beginPath(); c.ellipse(cx, cy - 2, rw * 0.8, rw * 0.8, 0, Math.PI, 0); c.fill();
  } else { // thatch : toit pointu en paille
    const over = 3;
    const T = [t[0], t[1] - z - over], R = [r[0] + over, r[1] - z], B = [bt[0], bt[1] - z + over], L = [l[0] - over, l[1] - z];
    const apex = [(t[0] + bt[0]) / 2, (t[1] + bt[1]) / 2 - z - Math.max(10, (b.w + b.h) * 3)];
    poly(c, [T, R, apex], shade(roof, 0.9));
    poly(c, [T, L, apex], shade(roof, 0.8));
    poly(c, [L, B, apex], shade(roof, 0.95));
    poly(c, [B, R, apex], shade(roof, 1.1));
  }
}

export function drawDecor(c, d, x, y) {
  const [sx, sy] = P(x + 0.5, y + 0.5);
  const col = d.color;
  switch (d.type) {
    case 'palm':
      c.fillStyle = '#7a5530'; c.fillRect(sx - 1, sy - 20, 2, 20);
      c.fillStyle = col || '#3f8a3a';
      [[-7, -22], [3, -23], [-5, -25], [1, -19], [-8, -18], [4, -18]].forEach(([dx, dy]) => c.fillRect(sx + dx, sy + dy, 5, 2));
      break;
    case 'baobab':
      c.fillStyle = '#8c6a4c'; c.fillRect(sx - 3, sy - 16, 6, 16);
      c.fillStyle = col || '#5d8a3a';
      c.fillRect(sx - 9, sy - 24, 18, 7); c.fillRect(sx - 6, sy - 27, 12, 3);
      break;
    case 'well':
      c.fillStyle = '#8e887e'; c.fillRect(sx - 5, sy - 6, 10, 6);
      c.fillStyle = '#2c4a6a'; c.fillRect(sx - 3, sy - 6, 6, 2);
      c.fillStyle = '#6b4a2b'; c.fillRect(sx - 5, sy - 14, 1, 8); c.fillRect(sx + 4, sy - 14, 1, 8); c.fillRect(sx - 5, sy - 14, 10, 1);
      break;
    case 'pot':
      c.fillStyle = col || '#a0522d'; c.fillRect(sx - 3, sy - 6, 6, 6); c.fillRect(sx - 2, sy - 8, 4, 2);
      break;
    case 'fence':
      c.fillStyle = col || '#7a5530';
      for (let i = -6; i <= 6; i += 3) c.fillRect(sx + i, sy - 6 + i / 2, 1, 6);
      c.fillRect(sx - 6, sy - 4 - 3, 13, 1);
      break;
    case 'flowers':
      [[-3, -2, '#e04a6a'], [2, -3, '#ffd27a'], [0, 0, '#e07a3a'], [-1, -4, '#c04ad0']].forEach(([dx, dy, f]) => {
        c.fillStyle = '#3f7a2a'; c.fillRect(sx + dx, sy + dy, 1, 2);
        c.fillStyle = col || f; c.fillRect(sx + dx - 1, sy + dy - 2, 3, 2);
      });
      break;
    case 'drum':
      c.fillStyle = col || '#8a3a1a'; c.fillRect(sx - 3, sy - 9, 6, 9);
      c.fillStyle = '#e8d2a0'; c.fillRect(sx - 3, sy - 10, 6, 2);
      break;
  }
}

export function drawPerson(c, x, y, color, skin = '#6b4226', me = false) {
  const [sx, sy] = P(x, y);
  c.fillStyle = '#0005'; c.fillRect(sx - 3, sy - 1, 6, 2);
  c.fillStyle = color; c.fillRect(sx - 3, sy - 10, 6, 8);
  c.fillStyle = skin; c.fillRect(sx - 2, sy - 15, 4, 5);
  c.fillStyle = '#1a1a1a'; c.fillRect(sx - 2, sy - 16, 4, 1);
  c.fillStyle = shade(color, 0.6); c.fillRect(sx - 2, sy - 2, 1, 2); c.fillRect(sx + 1, sy - 2, 1, 2);
  if (me) { c.fillStyle = '#ffd27a'; c.fillRect(sx - 1, sy - 20, 2, 2); }
}
