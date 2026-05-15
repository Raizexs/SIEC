/**
 * Agregaciones de portafolio para la vista Analítica (sin LLM).
 * Exporta funciones puras para tests y un composable ligero para Vue.
 *
 * TODO: Enriquecer riesgos con alertas persistidas en project.payload (Ley 21725,
 * Metalcon, logística) cuando el workspace las guarde al guardar.
 */

import { computed, unref } from "vue";

/** @typedef {'warn'|'info'} RiskSeverity */

export const CONCENTRATION_RATIO = 0.6;
export const OUTLIER_FACTOR = 1.5;
export const MIN_PROJECTS_FOR_OUTLIERS = 3;
export const TOP_LIMIT = 8;
export const MAX_INSIGHTS = 4;
export const MATERIAL_BAR_CLASS = {
  0: "bg-slate-400",
  1: "bg-amber-600",
  2: "bg-slate-600",
  3: "bg-stone-500",
  4: "bg-slate-800",
};

export function materialName(id) {
  switch (id) {
    case 1:
      return "Madera";
    case 2:
      return "Metalcon";
    case 3:
      return "Albañilería";
    case 4:
      return "Hormigón";
    default:
      return "Sin material";
  }
}

/**
 * @param {unknown} raw
 * @returns {number}
 */
function parseDateMs(raw) {
  if (raw == null) return 0;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : 0;
}

/**
 * @param {Record<string, unknown>} raw
 * @param {number} [index]
 */
export function normalizePortfolioItem(raw, index = 0) {
  const m2 = Number(raw.m2_totales ?? raw.m2Totales ?? 0) || 0;
  const ec = raw.estimated_cost;
  const estimatedCost =
    ec != null && ec !== "" ? Number(ec) : null;
  const materialIdRaw = raw.material_id ?? raw.materialEstructuralId;
  const materialId =
    materialIdRaw != null && materialIdRaw !== ""
      ? Number(materialIdRaw)
      : null;

  return {
    id: raw.id ?? raw.name ?? `row-${index}`,
    name: String(raw.name || raw.nombre || "Sin título"),
    m2,
    estimatedCost: Number.isFinite(estimatedCost) ? estimatedCost : null,
    materialId: Number.isFinite(materialId) ? materialId : null,
    shared: Boolean(raw.shared),
    updatedAtMs: parseDateMs(raw.updated_at ?? raw.updatedAt ?? raw.created_at ?? raw.createdAt),
    raw,
  };
}

/**
 * @param {number[]} sorted
 */
function median(sorted) {
  if (!sorted.length) return 0;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * @param {ReturnType<typeof normalizePortfolioItem>[]} items
 * @param {{ hasFetchError?: boolean }} options
 */
export function computePortfolioAnalytics(itemsRaw, options = {}) {
  const { hasFetchError = false } = options;
  const items = (itemsRaw || []).map((r, idx) =>
    normalizePortfolioItem(/** @type {Record<string, unknown>} */ (r), idx),
  );
  const totalProjects = items.length;

  const withCostAndM2 = items.filter(
    (p) => p.m2 > 0 && p.estimatedCost != null && p.estimatedCost >= 0,
  );
  const qualifyingCount = withCostAndM2.length;
  const sumCostQualifying = withCostAndM2.reduce(
    (s, p) => s + (p.estimatedCost || 0),
    0,
  );
  const sumM2Qualifying = withCostAndM2.reduce((s, p) => s + p.m2, 0);
  const avgCostPerM2Qualifying =
    sumM2Qualifying > 0 ? Math.round(sumCostQualifying / sumM2Qualifying) : 0;

  const costPerM2Values = withCostAndM2.map(
    (p) => p.estimatedCost / p.m2,
  );
  const sortedCpm = [...costPerM2Values].sort((a, b) => a - b);
  const medianCostPerM2 = median(sortedCpm);

  /** @type {Map<number, { count: number, m2: number }>} */
  const byMaterial = new Map();
  for (const p of items) {
    const key = p.materialId != null ? p.materialId : 0;
    const cur = byMaterial.get(key) || { count: 0, m2: 0 };
    cur.count += 1;
    cur.m2 += p.m2;
    byMaterial.set(key, cur);
  }

  let dominantMaterialId = 0;
  let dominantCount = 0;
  let dominantM2 = 0;
  for (const [mid, agg] of byMaterial) {
    if (
      agg.count > dominantCount ||
      (agg.count === dominantCount && agg.m2 > dominantM2)
    ) {
      dominantMaterialId = mid;
      dominantCount = agg.count;
      dominantM2 = agg.m2;
    }
  }

  const sharedCount = items.filter((p) => p.shared).length;
  const collaborationRatio =
    totalProjects > 0 ? sharedCount / totalProjects : 0;

  const totalM2All = items.reduce((s, p) => s + p.m2, 0);

  /** @type {{ materialId: number, name: string, count: number, m2: number, countPct: number, m2Pct: number, barClass: string }[]} */
  const materialDistribution = [];
  for (const [mid, agg] of [...byMaterial.entries()].sort(
    (a, b) => b[1].m2 - a[1].m2 || b[1].count - a[1].count,
  )) {
    materialDistribution.push({
      materialId: mid,
      name: materialName(mid === 0 ? null : mid),
      count: agg.count,
      m2: agg.m2,
      countPct: totalProjects ? (agg.count / totalProjects) * 100 : 0,
      m2Pct: totalM2All ? (agg.m2 / totalM2All) * 100 : 0,
      barClass: MATERIAL_BAR_CLASS[mid] || MATERIAL_BAR_CLASS[0],
    });
  }

  const topByCost = [...items]
    .filter((p) => p.estimatedCost != null)
    .sort((a, b) => (b.estimatedCost || 0) - (a.estimatedCost || 0))
    .slice(0, TOP_LIMIT);

  /** @type {Map<number, { sum: number, m2: number, n: number }>} */
  const costByMat = new Map();
  for (const p of withCostAndM2) {
    const key = p.materialId != null ? p.materialId : 0;
    const cur = costByMat.get(key) || { sum: 0, m2: 0, n: 0 };
    cur.sum += p.estimatedCost || 0;
    cur.m2 += p.m2;
    cur.n += 1;
    costByMat.set(key, cur);
  }
  const avgCostByMaterial = [...costByMat.entries()]
    .map(([mid, v]) => ({
      materialId: mid,
      name: materialName(mid === 0 ? null : mid),
      avgCostPerM2: v.m2 > 0 ? Math.round(v.sum / v.m2) : 0,
      projectCount: v.n,
    }))
    .sort((a, b) => b.avgCostPerM2 - a.avgCostPerM2);

  const recentActivity = [...items]
    .sort((a, b) => b.updatedAtMs - a.updatedAtMs)
    .slice(0, TOP_LIMIT);

  /** @type {{ severity: RiskSeverity, title: string, detail: string, projectId?: string | number }[]} */
  const risks = [];

  if (hasFetchError) {
    risks.push({
      severity: "warn",
      title: "Fuente de datos mixta",
      detail:
        "Se muestran proyectos locales porque el backend no respondió correctamente. Las métricas pueden no reflejar el portafolio remoto.",
    });
  }

  const missingCost = items.filter((p) => p.estimatedCost == null);
  const missingM2 = items.filter((p) => p.m2 <= 0);
  const missingMaterial = items.filter((p) => p.materialId == null);

  if (missingCost.length) {
    risks.push({
      severity: "warn",
      title: `${missingCost.length} proyecto(s) sin costo estimado`,
      detail:
        missingCost.length <= 3
          ? missingCost.map((p) => p.name).join(" · ")
          : `${missingCost
              .slice(0, 3)
              .map((p) => p.name)
              .join(" · ")} y ${missingCost.length - 3} más`,
    });
  }
  if (missingM2.length) {
    risks.push({
      severity: "warn",
      title: `${missingM2.length} proyecto(s) sin m²`,
      detail: "Sin superficie no se puede calcular costo por m² ni ponderar materialidad por área.",
    });
  }
  if (missingMaterial.length) {
    risks.push({
      severity: "info",
      title: `${missingMaterial.length} proyecto(s) sin materialidad declarada`,
      detail: "Asigna material estructural para comparar costos y riesgos por sistema.",
    });
  }

  if (totalProjects > 0 && byMaterial.size === 1) {
    const onlyId = [...byMaterial.keys()][0];
    risks.push({
      severity: "info",
      title: "Portafolio monocromático",
      detail: `Todos los proyectos usan ${materialName(onlyId === 0 ? null : onlyId)}. Evalúa diversificar sistemas para comparar escenarios.`,
    });
  } else if (totalProjects > 0 && dominantCount / totalProjects >= CONCENTRATION_RATIO) {
    risks.push({
      severity: "info",
      title: "Alta concentración de materialidad",
      detail: `${Math.round((dominantCount / totalProjects) * 100)}% de los proyectos son ${materialName(dominantMaterialId === 0 ? null : dominantMaterialId)}.`,
    });
  } else if (totalM2All > 0 && dominantM2 / totalM2All >= CONCENTRATION_RATIO) {
    risks.push({
      severity: "info",
      title: "Superficie concentrada en un sistema",
      detail: `${Math.round((dominantM2 / totalM2All) * 100)}% de los m² corresponden a ${materialName(dominantMaterialId === 0 ? null : dominantMaterialId)}.`,
    });
  }

  if (withCostAndM2.length >= MIN_PROJECTS_FOR_OUTLIERS && medianCostPerM2 > 0) {
    const threshold = medianCostPerM2 * OUTLIER_FACTOR;
    for (const p of withCostAndM2) {
      const cpm = p.estimatedCost / p.m2;
      if (cpm > threshold) {
        risks.push({
          severity: "warn",
          title: `Costo/m² atípico: ${p.name}`,
          detail: `${Math.round(cpm).toLocaleString("es-CL")} CLP/m² vs mediana ${Math.round(medianCostPerM2).toLocaleString("es-CL")} CLP/m².`,
          projectId: p.id,
        });
      }
    }
  }

  const riskCount = risks.length;

  /** @type {string[]} */
  const insightCandidates = [];

  if (missingCost.length || missingM2.length) {
    const parts = [];
    if (missingCost.length) parts.push(`${missingCost.length} sin costo`);
    if (missingM2.length) parts.push(`${missingM2.length} sin m²`);
    insightCandidates.push(
      `Calidad de datos: ${parts.join(", ")}. Completa estimaciones para lecturas más precisas.`,
    );
  }

  if (totalProjects > 0) {
    insightCandidates.push(
      `${Math.round(collaborationRatio * 100)}% de los proyectos están compartidos (${sharedCount} de ${totalProjects}).`,
    );
  }

  if (dominantCount > 0 && totalProjects > 0) {
    insightCandidates.push(
      `Material dominante: ${materialName(dominantMaterialId === 0 ? null : dominantMaterialId)} (${dominantCount} proyecto(s), ${Math.round((dominantCount / totalProjects) * 100)}%).`,
    );
  }

  if (qualifyingCount > 0 && medianCostPerM2 > 0) {
    const diffPct =
      ((avgCostPerM2Qualifying - medianCostPerM2) / medianCostPerM2) * 100;
    if (Math.abs(diffPct) >= 5) {
      insightCandidates.push(
        diffPct > 0
          ? `El costo promedio ponderado (${avgCostPerM2Qualifying.toLocaleString("es-CL")} CLP/m²) supera la mediana del portafolio en ~${Math.round(Math.abs(diffPct))}%.`
          : `El costo promedio ponderado está ~${Math.round(Math.abs(diffPct))}% por debajo de la mediana del portafolio.`,
      );
    } else {
      insightCandidates.push(
        `Costo/m² promedio (${avgCostPerM2Qualifying.toLocaleString("es-CL")} CLP/m²) alineado con la mediana (${Math.round(medianCostPerM2).toLocaleString("es-CL")} CLP/m²).`,
      );
    }
  } else if (totalProjects === 0) {
    insightCandidates.push(
      "Aún no hay proyectos en el portafolio. Crea una estimación para activar métricas y riesgos.",
    );
  }

  const seen = new Set();
  const insights = [];
  for (const line of insightCandidates) {
    if (insights.length >= MAX_INSIGHTS) break;
    const key = line.slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    insights.push(line);
  }

  return {
    items,
    totalProjects,
    qualifyingCount,
    avgCostPerM2Qualifying,
    medianCostPerM2,
    dominantMaterial: {
      id: dominantMaterialId,
      name: materialName(dominantMaterialId === 0 ? null : dominantMaterialId),
      count: dominantCount,
      m2: dominantM2,
    },
    riskCount,
    collaborationRatio,
    sharedCount,
    risks,
    insights,
    materialDistribution,
    topByCost,
    avgCostByMaterial,
    recentActivity,
  };
}

/**
 * @param {import('vue').Ref<unknown[]> | import('vue').ComputedRef<unknown[]>} projectsRef
 * @param {import('vue').Ref<unknown[]> | import('vue').ComputedRef<unknown[]>} savedLayoutsRef
 * @param {import('vue').Ref<string | null> | import('vue').ComputedRef<string | null | undefined>} [fetchErrorRef]
 */
export function usePortfolioAnalytics(projectsRef, savedLayoutsRef, fetchErrorRef) {
  const analytics = computed(() => {
    const projects = unref(projectsRef);
    const saved = unref(savedLayoutsRef);
    const list = projects?.length ? projects : saved || [];
    const err = fetchErrorRef ? unref(fetchErrorRef) : null;
    return computePortfolioAnalytics(list, { hasFetchError: Boolean(err) });
  });

  return { analytics };
}
