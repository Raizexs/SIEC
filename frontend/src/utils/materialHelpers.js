export const MATERIAL_OPTIONS = [
  { id: 1, label: 'Madera', matKey: 'wood_frame' },
  { id: 2, label: 'Metalcon', matKey: 'steel_framed' },
  { id: 3, label: 'Albañilería', matKey: 'masonry' },
  { id: 4, label: 'Hormigón armado', matKey: 'concrete' },
  { id: 5, label: 'Híbrido', matKey: 'hybrid_frame' },
];

export const MAT_TYPE_MAP = Object.fromEntries(
  MATERIAL_OPTIONS.map((m) => [m.id, m.matKey]),
);

export function resolveRecintoMaterial(recinto, projectMaterialId = 1) {
  const id = Number(recinto?.materialEstructuralId);
  if (Number.isFinite(id) && id >= 1 && id <= 5) return id;
  const fallback = Number(projectMaterialId);
  return Number.isFinite(fallback) && fallback >= 1 && fallback <= 5
    ? fallback
    : 1;
}

export function resolveMatTypeKey(materialId) {
  return MAT_TYPE_MAP[materialId] || 'concrete';
}

export function materialLabel(materialId) {
  return MATERIAL_OPTIONS.find((m) => m.id === Number(materialId))?.label ?? 'Material';
}

/** Muro compartido: material del recinto de mayor área; empate → mayor ID estructural. */
export function resolveWallMaterialId(wall, recintoById, projectMaterialId) {
  const ids = wall?.recintosAdyacentes || [];
  const adjacent = ids.map((id) => recintoById.get(id)).filter(Boolean);
  if (!adjacent.length) {
    return resolveRecintoMaterial(null, projectMaterialId);
  }

  const ranked = [...adjacent].sort((a, b) => {
    const areaA = (a.dimensions?.w ?? 0) * (a.dimensions?.l ?? 0);
    const areaB = (b.dimensions?.w ?? 0) * (b.dimensions?.l ?? 0);
    if (Math.abs(areaB - areaA) > 0.01) return areaB - areaA;
    return (
      resolveRecintoMaterial(b, projectMaterialId) -
      resolveRecintoMaterial(a, projectMaterialId)
    );
  });

  return resolveRecintoMaterial(ranked[0], projectMaterialId);
}
