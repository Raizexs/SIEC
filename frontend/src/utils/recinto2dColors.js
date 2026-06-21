import { roomFillColor, roomStrokeColor } from './roomTypeColors.js';

/** Paleta rápida para personalizar recintos en el plano 2D. */
export const RECINTO_2D_COLOR_PRESETS = [
  '#22d3ee',
  '#38bdf8',
  '#0ea5e9',
  '#10b981',
  '#34d399',
  '#a78bfa',
  '#c084fc',
  '#f472b6',
  '#fb7185',
  '#fbbf24',
  '#fb923c',
  '#94a3b8',
];

export const resolveRecintoFill2d = (recinto) => {
  if (recinto?.color2d) return recinto.color2d;
  return roomFillColor(recinto?.tipo);
};

export const resolveRecintoStroke2d = (recinto) => {
  if (recinto?.color2d) return recinto.color2d;
  return roomStrokeColor(recinto?.tipo);
};
