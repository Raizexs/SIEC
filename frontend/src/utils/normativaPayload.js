/**
 * Payload compartido para POST /api/validar-normativa.
 */
export function buildNormativaPayload({
  recintos = [],
  m2Totales = 0,
  materialEstructuralId = 1,
  alturaMuroM = 2.4,
}) {
  const walls = recintos.map((r) => ({
    id: r.id,
    tipo: r.tipo,
    piso: r.piso || 1,
    material_id: r.materialEstructuralId ?? materialEstructuralId,
    height_m: r.dimensions?.h ?? alturaMuroM,
    area_m2: (r.dimensions?.w ?? 0) * (r.dimensions?.l ?? 0),
    x_m: r.coords?.x ?? 0,
    z_m: r.coords?.z ?? 0,
    width_m: r.dimensions?.w ?? 0,
    length_m: r.dimensions?.l ?? 0,
  }));

  return {
    m2_totales: m2Totales,
    material_estructural_id: materialEstructuralId,
    altura_muro_m: alturaMuroM,
    recintos: walls,
    muros: [],
  };
}

export function normInjectionLabel(item) {
  return item?.normativa || item?.norma || item?.codigo || "Normativa";
}

export function normInjectionText(item) {
  return (
    item?.mensaje ||
    item?.descripcion ||
    item?.sugerencia ||
    ""
  );
}

export function normAlertCode(alert) {
  return alert?.code || alert?.codigo || "ALERTA";
}

export function normAlertMessage(alert) {
  return alert?.message || alert?.mensaje || "";
}
