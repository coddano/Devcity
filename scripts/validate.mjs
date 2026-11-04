// Validateur des parcelles. Usage : node scripts/validate.mjs
// En CI (PR), CHANGED_FILES et PR_AUTHOR limitent les changements au dossier du contributeur.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { PLOT_SIZE, GRID, GROUNDS, ROOFS, DECOR, LIMITS } from '../engine/rules.js';

const errors = [];
const err = (who, msg) => errors.push(`[${who}] ${msg}`);
const hex = v => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
const int = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
const text = (v, max) => typeof v === 'string' && v.length > 0 && v.length <= max && !/https?:|www\.|<|>/i.test(v);

const slots = new Map();
for (const d of readdirSync('plots', { withFileTypes: true })) {
  if (!d.isDirectory()) continue;
  const who = d.name, dir = `plots/${who}`;
  const files = readdirSync(dir);
  for (const f of files) if (f !== 'plot.json') err(who, `fichier non autorisé : ${f} (seul plot.json est accepté)`);
  if (!files.includes('plot.json')) { err(who, 'plot.json manquant'); continue; }
  if (statSync(`${dir}/plot.json`).size > LIMITS.fileBytes) err(who, `plot.json dépasse ${LIMITS.fileBytes} octets`);
  let p;
  try { p = JSON.parse(readFileSync(`${dir}/plot.json`, 'utf8')); } catch (e) { err(who, `JSON invalide : ${e.message}`); continue; }

  const allowed = new Set(['author', 'name', 'slot', 'ground', 'buildings', 'decor', 'npcs']);
  for (const k of Object.keys(p)) if (!allowed.has(k)) err(who, `clé inconnue : ${k}`);
  if (p.author !== who) err(who, `"author" doit valoir "${who}" (nom du dossier)`);
  if (!text(p.name, LIMITS.nameLength)) err(who, `"name" invalide (1 à ${LIMITS.nameLength} caractères, pas de lien)`);
  if (!GROUNDS[p.ground] || p.ground === 'road') err(who, `"ground" doit être : ${Object.keys(GROUNDS).filter(g => g !== 'road').join(', ')}`);
  if (!p.slot || !int(p.slot.x, 0, GRID - 1) || !int(p.slot.y, 0, GRID - 1)) err(who, `"slot" doit avoir x et y entre 0 et ${GRID - 1}`);
  else {
    const key = `${p.slot.x},${p.slot.y}`;
    if (slots.has(key)) err(who, `emplacement ${key} déjà pris par ${slots.get(key)}`);
    slots.set(key, who);
  }

  const used = new Set();
  const occupy = (x, y, what) => {
    const k = `${x},${y}`;
    if (used.has(k)) err(who, `${what} chevauche un autre élément en ${k}`);
    used.add(k);
  };
  const B = p.buildings || [], D = p.decor || [], N = p.npcs || [];
  if (B.length > LIMITS.buildings) err(who, `max ${LIMITS.buildings} bâtiments`);
  if (D.length > LIMITS.decor) err(who, `max ${LIMITS.decor} décors`);
  if (N.length > LIMITS.npcs) err(who, `max ${LIMITS.npcs} PNJ`);

  B.forEach((b, i) => {
    const w = `bâtiment ${i + 1}`;
    if (!int(b.w, 1, PLOT_SIZE) || !int(b.h, 1, PLOT_SIZE) || !int(b.x, 0, PLOT_SIZE - 1) || !int(b.y, 0, PLOT_SIZE - 1)
      || b.x + b.w > PLOT_SIZE || b.y + b.h > PLOT_SIZE) return err(who, `${w} sort de la parcelle`);
    if (!int(b.height, ...LIMITS.buildingHeight)) err(who, `${w} : height entre ${LIMITS.buildingHeight.join(' et ')}`);
    if (!hex(b.color)) err(who, `${w} : color doit être #rrggbb`);
    if (b.roofColor !== undefined && !hex(b.roofColor)) err(who, `${w} : roofColor doit être #rrggbb`);
    if (!ROOFS.includes(b.roof)) err(who, `${w} : roof doit être ${ROOFS.join(', ')}`);
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) occupy(b.x + x, b.y + y, w);
  });
  D.forEach((d, i) => {
    const w = `décor ${i + 1}`;
    if (!DECOR.includes(d.type)) err(who, `${w} : type doit être ${DECOR.join(', ')}`);
    if (!int(d.x, 0, PLOT_SIZE - 1) || !int(d.y, 0, PLOT_SIZE - 1)) return err(who, `${w} sort de la parcelle`);
    if (d.color !== undefined && !hex(d.color)) err(who, `${w} : color doit être #rrggbb`);
    occupy(d.x, d.y, w);
  });
  N.forEach((n, i) => {
    const w = `PNJ ${i + 1}`;
    if (!text(n.name, LIMITS.nameLength)) err(who, `${w} : name invalide`);
    if (!int(n.x, 0, PLOT_SIZE - 1) || !int(n.y, 0, PLOT_SIZE - 1)) return err(who, `${w} sort de la parcelle`);
    if (!hex(n.color) || (n.skin !== undefined && !hex(n.skin))) err(who, `${w} : color/skin doivent être #rrggbb`);
    if (!Array.isArray(n.dialogue) || !n.dialogue.length || n.dialogue.length > LIMITS.dialogueLines
      || !n.dialogue.every(l => text(l, LIMITS.lineLength))) err(who, `${w} : dialogue = 1 à ${LIMITS.dialogueLines} phrases de ${LIMITS.lineLength} caractères max, sans lien`);
    occupy(n.x, n.y, w);
  });
}

// En PR : un contributeur ne touche que plots/<son-login>/
if (process.env.PR_AUTHOR && process.env.CHANGED_FILES) {
  const me = process.env.PR_AUTHOR.toLowerCase();
  const isOwner = process.env.PR_AUTHOR_ASSOCIATION === 'OWNER';
  for (const f of process.env.CHANGED_FILES.split('\n').filter(Boolean)) {
    if (isOwner) break;
    if (!f.toLowerCase().startsWith(`plots/${me}/`)) err(me, `tu ne peux modifier que plots/${me}/ (fichier touché : ${f})`);
  }
}

if (errors.length) { console.error(errors.join('\n')); console.error(`\n${errors.length} erreur(s).`); process.exit(1); }
console.log(`OK : ${slots.size} parcelle(s) valide(s).`);
