// Règles communes au moteur et au validateur (CI).
export const PLOT_SIZE = 8;          // une parcelle = 8 x 8 tuiles
export const GRID = 10;              // la ville = 10 x 10 parcelles
export const STRIDE = PLOT_SIZE + 1; // 1 tuile de route entre parcelles

export const GROUNDS = {
  road:  ['#8b6a4a', '#80613f'],
  sand:  ['#e0b878', '#d6ac6a'],
  grass: ['#6fa64a', '#64993f'],
  earth: ['#b0663a', '#a35c33'],
  stone: ['#9a948a', '#8e887e'],
};

export const ROOFS = ['thatch', 'flat', 'dome'];
export const DECOR = ['palm', 'baobab', 'well', 'pot', 'fence', 'flowers', 'drum'];

export const LIMITS = {
  buildings: 4,
  decor: 24,
  npcs: 3,
  dialogueLines: 6,
  lineLength: 140,
  nameLength: 40,
  buildingHeight: [8, 40],
  fileBytes: 20000,
};
