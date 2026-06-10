/** Etiqueta legible de cantidad de pisos (1 piso · 2 pisos · 3 pisos). */
export function formatFloorCountLabel(count, t) {
  const n = Math.max(1, Number(count) || 1);
  if (n === 1) return t('presetOneFloor');
  return t('presetManyFloors', { count: n });
}
