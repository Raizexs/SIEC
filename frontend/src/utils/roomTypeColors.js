/** Paleta compartida 2D / minimapa / blueprint / leyenda. */
export const ROOM_TYPE_COLORS = {
  habitacion: { fill: '#3b82f6', stroke: '#1d4ed8', label: 'Habitación' },
  banio: { fill: '#06b6d4', stroke: '#0e7490', label: 'Baño' },
  areaComun: { fill: '#8b5cf6', stroke: '#6d28d9', label: 'Área común' },
  comun: { fill: '#8b5cf6', stroke: '#6d28d9', label: 'Área común' },
  pasillo: { fill: '#14b8a6', stroke: '#0f766e', label: 'Pasillo' },
};

export const MATERIAL_EDGE_COLORS = {
  1: '#b45309',
  2: '#64748b',
  3: '#dc2626',
  4: '#475569',
  5: '#7c3aed',
};

export function roomFillColor(tipo) {
  return ROOM_TYPE_COLORS[tipo]?.fill ?? ROOM_TYPE_COLORS.habitacion.fill;
}

export function roomStrokeColor(tipo) {
  return ROOM_TYPE_COLORS[tipo]?.stroke ?? ROOM_TYPE_COLORS.habitacion.stroke;
}

export function roomTypeLabel(tipo) {
  return ROOM_TYPE_COLORS[tipo]?.label ?? 'Recinto';
}
