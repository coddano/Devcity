// Génère plots/index.json (liste des parcelles) pour le moteur.
import { readdirSync, existsSync, writeFileSync } from 'node:fs';
const list = readdirSync('plots', { withFileTypes: true })
  .filter(d => d.isDirectory() && existsSync(`plots/${d.name}/plot.json`))
  .map(d => d.name).sort();
writeFileSync('plots/index.json', JSON.stringify(list, null, 2) + '\n');
console.log(`${list.length} parcelle(s) indexée(s)`);
