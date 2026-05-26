const MATERIAL_ES = {
  1: "Madera",
  2: "Metalcon",
  3: "Albañilería",
  4: "Hormigón",
};
const MATERIAL_EN = {
  1: "Wood frame",
  2: "Steel frame",
  3: "Masonry",
  4: "Concrete",
};

export function portfolioMaterialName(id, lang = "es") {
  const map = lang === "en" ? MATERIAL_EN : MATERIAL_ES;
  if (id == null || id === 0) {
    return lang === "en" ? "No material" : "Sin material";
  }
  return map[id] || (lang === "en" ? "No material" : "Sin material");
}

export function portfolioUntitled(lang = "es") {
  return lang === "en" ? "Untitled" : "Sin título";
}

/**
 * @param {'es'|'en'} lang
 */
export function getPortfolioCopy(lang = "es") {
  const en = lang === "en";
  const locale = en ? "en-US" : "es-CL";
  const fmt = (n) => Math.round(n).toLocaleString(locale);

  return {
    locale,
    materialName: (id) => portfolioMaterialName(id, lang),
    untitled: portfolioUntitled(lang),

    riskMixedSource: {
      title: en ? "Mixed data source" : "Fuente de datos mixta",
      detail: en
        ? "Showing local projects because the backend did not respond correctly. Metrics may not reflect the remote portfolio."
        : "Se muestran proyectos locales porque el backend no respondió correctamente. Las métricas pueden no reflejar el portafolio remoto.",
    },
    riskNoCost: (n) =>
      en ? `${n} project(s) without estimated cost` : `${n} proyecto(s) sin costo estimado`,
    riskNoM2: (n) =>
      en ? `${n} project(s) without m²` : `${n} proyecto(s) sin m²`,
    riskNoM2Detail: en
      ? "Without area you cannot compute cost per m² or weight materials by surface."
      : "Sin superficie no se puede calcular costo por m² ni ponderar materialidad por área.",
    riskNoMaterial: (n) =>
      en
        ? `${n} project(s) without declared material`
        : `${n} proyecto(s) sin materialidad declarada`,
    riskNoMaterialDetail: en
      ? "Assign structural material to compare costs and risks by system."
      : "Asigna material estructural para comparar costos y riesgos por sistema.",
    riskMonochrome: {
      title: en ? "Monochrome portfolio" : "Portafolio monocromático",
      detail: (mat) =>
        en
          ? `All projects use ${mat}. Consider diversifying systems to compare scenarios.`
          : `Todos los proyectos usan ${mat}. Evalúa diversificar sistemas para comparar escenarios.`,
    },
    riskHighConcentration: {
      title: en ? "High material concentration" : "Alta concentración de materialidad",
      detail: (pct, mat) =>
        en
          ? `${pct}% of projects are ${mat}.`
          : `${pct}% de los proyectos son ${mat}.`,
    },
    riskSurfaceConcentration: {
      title: en ? "Surface concentrated in one system" : "Superficie concentrada en un sistema",
      detail: (pct, mat) =>
        en
          ? `${pct}% of m² correspond to ${mat}.`
          : `${pct}% de los m² corresponden a ${mat}.`,
    },
    riskOutlierCost: (name) =>
      en ? `Atypical cost/m²: ${name}` : `Costo/m² atípico: ${name}`,
    riskOutlierDetail: (cpm, median) =>
      en
        ? `${fmt(cpm)} CLP/m² vs portfolio median ${fmt(median)} CLP/m².`
        : `${fmt(cpm)} CLP/m² vs mediana ${fmt(median)} CLP/m².`,
    andMore: (n) => (en ? `and ${n} more` : `y ${n} más`),

    insightDataQuality: (parts) =>
      en
        ? `Data quality: ${parts}. Complete estimates for more accurate readings.`
        : `Calidad de datos: ${parts}. Completa estimaciones para lecturas más precisas.`,
    insightNoCost: (n) => (en ? `${n} without cost` : `${n} sin costo`),
    insightNoM2: (n) => (en ? `${n} without m²` : `${n} sin m²`),
    insightShared: (pct, shared, total) =>
      en
        ? `${pct}% of projects are shared (${shared} of ${total}).`
        : `${pct}% de los proyectos están compartidos (${shared} de ${total}).`,
    insightDominant: (mat, count, pct) =>
      en
        ? `Dominant material: ${mat} (${count} project(s), ${pct}%).`
        : `Material dominante: ${mat} (${count} proyecto(s), ${pct}%).`,
    insightAvgAbove: (avg, pct) =>
      en
        ? `Weighted average cost (${fmt(avg)} CLP/m²) exceeds portfolio median by ~${pct}%.`
        : `El costo promedio ponderado (${fmt(avg)} CLP/m²) supera la mediana del portafolio en ~${pct}%.`,
    insightAvgBelow: (pct) =>
      en
        ? `Weighted average cost is ~${pct}% below portfolio median.`
        : `El costo promedio ponderado está ~${pct}% por debajo de la mediana del portafolio.`,
    insightAvgAligned: (avg, median) =>
      en
        ? `Average cost/m² (${fmt(avg)} CLP/m²) aligned with median (${fmt(median)} CLP/m²).`
        : `Costo/m² promedio (${fmt(avg)} CLP/m²) alineado con la mediana (${fmt(median)} CLP/m²).`,
    insightEmptyPortfolio: en
      ? "No projects in the portfolio yet. Create an estimate to enable metrics and risks."
      : "Aún no hay proyectos en el portafolio. Crea una estimación para activar métricas y riesgos.",
  };
}
