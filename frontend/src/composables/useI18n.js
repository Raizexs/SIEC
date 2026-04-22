import { ref, computed } from "vue";

// Estado global singleton fuera del composable
const currentLanguage = ref(localStorage.getItem("siec_language") || "es");

const translations = {
  es: {
    // Sidebar
    siec: "SIEC",
    constructionIntelligence: "Inteligencia en Construcción",
    dashboard: "Tablero",
    projects: "Proyectos",
    metrics: "Métricas",
    settings: "Configuración",
    recentPresets: "Presets Recientes",
    savedLayouts: "Layouts Guardados",
    autoSaveActive: "Auto-guardado Activo",
    newEstimate: "Nueva Estimación",

    // TopNav
    estimationConfigurator: "Configurador de Estimación",
    generalSpecs: "Especificaciones Generales",
    materials: "Materiales",
    logistics: "Logística",
    localCache: "Caché Local",

    // Configuration Panel
    step01: "Paso 1 / Especificaciones Técnicas",
    projectGeometry: "Geometría del Proyecto",
    totalBuiltArea: "Área Total Construida (m²)",
    simpleRooms: "Habitaciones Simples",
    doubleRooms: "Habitaciones Dobles",
    tripleSuites: "Triples/Suites",
    bathrooms: "Baños",
    commonAreas: "Áreas Comunes",
    structuralMaterial: "Matriz de Material Estructural",
    materialNote:
      "Diferentes materiales afectan la eficiencia de costos y los cálculos de velocidad de construcción.",
    saveGenerate: "Guardar y Generar Layout",
    saving: "Guardando Configuración...",

    // Materials
    woodFrame: "Estructura de Madera",
    steelFramed: "Acero Galvanizado",
    masonry: "Mampostería Portante",
    concrete: "Ferrocemento",
    heavyLogisticsTitle: "Requisitos Logísticos Pesados.",
    heavyLogisticsMessage:
      "El Ferrocemento requiere maquinaria pesada para carga, descarga y montaje. En obras menores esto puede aumentar costos logísticos y tiempos de ejecución.",
    quoteWithLightMaterials: "Cotizar con Materiales Ligeros",
    dismissLogisticsAlert: "Descartar y Continuar",

    // Metrics Panel
    estimatedCost: "Costo Total Estimado del Proyecto",
    budgetConfidence: "Confianza del Presupuesto",
    costPerM2: "Costo por m²",
    tokenBudget: "Espacio Disponible",
    available: "Disponible",
    used: "Usado",
    total: "Total",
    materialIntelligence: "Inteligencia de Materiales",
    liveProjection: "Proyección en Vivo",
    ironReinforcements: "Hierro y Refuerzos",
    tonsEstimated: "Toneladas Estimadas",
    readyMixCement: "Cemento Premezclado",
    required: "Requerido",
    finishingGlass: "Acabados y Vidrio",
    customSpecs: "Especificaciones Arquitectónicas Personalizadas",
    highVolatility: "Alta Volatilidad",
    stable: "Estable",
    premium: "Premium",
    exportCSV: "Exportar CSV Detallado",
    generateFinal: "Generar Cálculo Final",
    lockedFor24h: "Bloqueado por 24 horas solamente",
    optimizerInsight: "Insight del Optimizador",
    optimizationNote:
      "La configuración actual usa {material}. Optimizar la distribución de habitaciones podría reducir costos hasta en $12,000.",

    // Status messages
    safeSpace: "Espacio OK",
    limitedSpace: "⚠️ Espacio limitado",
    noSpace: "❌ Sin espacio",
    tokensFree: "m² libres",
    tokensExcess: "m² en exceso",

    // Actions
    save: "Guardar",
    cancel: "Cancelar",
    delete: "Eliminar",
    load: "Cargar",

    // Footer
    footer: "2026 SIEC - V0.3",
    draftsSynced: "Borradores Sincronizados",
    privacyPolicy: "Política de Privacidad",
    termsOfService: "Términos de Servicio",
    supportPortal: "Portal de Soporte",

    // Save Dialog
    saveLayoutTitle: "💾 Guardar Layout",
    layoutNameLabel: "Nombre del Layout",
    layoutNamePlaceholder: "Ej: Casa Familiar 3 Pisos",

    // Additional translations
    editor2D: "Editor de Layout 2D",
    visualization3D: "Visualización 3D",
    stepLayers: "Paso 2 / Modo Construcción",
    layerSelection: "Selección de Capas",
    layerSelectionHelp:
      "Activa el modo y alterna la visibilidad de cada capa para explorar el sistema interno del volumen 3D.",
    constructionMode: "Modo Construcción",
    facadeLayer: "Fachada",
    insulationLayer: "Aislación",
    installationsLayer: "Instalaciones",
    interiorLayer: "Interior",
    structureLayer: "Estructura",
    layerVisible: "Visible",
    layerHidden: "Oculta",
    layersVisible: "{count} capas activas",
    allLayersVisible: "Todas las capas activas",

    // Materials Panel
    selectedMaterial: "Material Seleccionado",
    estimatedTotal: "Total Estimado",
    updatePrices: "Actualizar Precios",
    exportSpecs: "Exportar Specs",
    durability: "Durabilidad",
    speed: "Velocidad",
    costEfficiency: "Eficiencia",
    pricePerM2: "Precio/m²",
    marketInsights: "Análisis de Mercado",
    averagePrice: "Precio Promedio",
    priceVariation: "Variación",
    lastUpdate: "Última Actualización",
  },
  en: {
    // Sidebar
    siec: "SIEC",
    constructionIntelligence: "Construction Intelligence",
    dashboard: "Dashboard",
    projects: "Projects",
    metrics: "Metrics",
    settings: "Settings",
    recentPresets: "Recent Presets",
    savedLayouts: "Saved Layouts",
    autoSaveActive: "Auto-save Active",
    newEstimate: "New Estimate",

    // TopNav
    estimationConfigurator: "Estimation Configurator",
    generalSpecs: "General Specs",
    materials: "Materials",
    logistics: "Logistics",
    localCache: "Local Cache",

    // Configuration Panel
    step01: "Step 1 / Technical Specs",
    projectGeometry: "Project Geometry",
    totalBuiltArea: "Total Built Area (m²)",
    simpleRooms: "Simple Rooms",
    doubleRooms: "Double Rooms",
    tripleSuites: "Triple/Suites",
    bathrooms: "Bathrooms",
    commonAreas: "Common Areas",
    structuralMaterial: "Structural Material Matrix",
    materialNote:
      "Different materials affect cost efficiency and construction speed calculations.",
    saveGenerate: "Save & Generate Layout",
    saving: "Saving Configuration...",

    // Materials
    woodFrame: "Wood Frame Structure",
    steelFramed: "Galvanized Steel",
    masonry: "Load-Bearing Masonry",
    concrete: "Ferrocement",
    heavyLogisticsTitle: "Heavy Logistics Requirements.",
    heavyLogisticsMessage:
      "Ferrocement requires heavy machinery for loading, unloading, and assembly. In small projects this can increase logistics costs and execution time.",
    quoteWithLightMaterials: "Quote with Lightweight Materials",
    dismissLogisticsAlert: "Dismiss and Continue",

    // Metrics Panel
    estimatedCost: "Estimated Total Project Cost",
    budgetConfidence: "Budget Confidence",
    costPerM2: "Cost per m²",
    tokenBudget: "Available Space",
    available: "Available",
    used: "Used",
    total: "Total",
    materialIntelligence: "Material Intelligence",
    liveProjection: "Live Projection",
    ironReinforcements: "Iron & Reinforcements",
    tonsEstimated: "Tons Estimated",
    readyMixCement: "Ready-Mix Cement",
    required: "Required",
    finishingGlass: "Finishing & Glass",
    customSpecs: "Custom Architectural Specs",
    highVolatility: "High Volatility",
    stable: "Stable",
    premium: "Premium",
    exportCSV: "Export Detailed CSV",
    generateFinal: "Generate Final Calculation",
    lockedFor24h: "Locked for 24 hours only",
    optimizerInsight: "Optimizer Insight",
    optimizationNote:
      "Current configuration uses {material}. Optimizing room distribution could reduce costs by up to $12,000.",

    // Status messages
    safeSpace: "Space OK",
    limitedSpace: "⚠️ Limited space",
    noSpace: "❌ No space",
    tokensFree: "m² free",
    tokensExcess: "m² excess",

    // Actions
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    load: "Load",

    // Footer
    footer: "2026 SIEC - V0.3",
    draftsSynced: "Drafts Synchronized",
    privacyPolicy: "Privacy Policy",
    termsOfService: "Terms of Service",
    supportPortal: "Support Portal",

    // Save Dialog
    saveLayoutTitle: "💾 Save Layout",
    layoutNameLabel: "Layout Name",
    layoutNamePlaceholder: "e.g., Family House 3 Floors",

    // Additional translations
    editor2D: "2D Room Layout Editor",
    visualization3D: "3D Visualization",
    stepLayers: "Step 2 / Construction Mode",
    layerSelection: "Layer Selection",
    layerSelectionHelp:
      "Enable the mode and switch each layer on or off to explore the internal 3D volume system.",
    constructionMode: "Construction Mode",
    facadeLayer: "Facade",
    insulationLayer: "Insulation",
    installationsLayer: "Installations",
    interiorLayer: "Interior",
    structureLayer: "Structure",
    layerVisible: "Visible",
    layerHidden: "Hidden",
    layersVisible: "{count} layers active",
    allLayersVisible: "All layers active",

    // Materials Panel
    selectedMaterial: "Selected Material",
    estimatedTotal: "Estimated Total",
    updatePrices: "Update Prices",
    exportSpecs: "Export Specs",
    durability: "Durability",
    speed: "Speed",
    costEfficiency: "Efficiency",
    pricePerM2: "Price/m²",
    marketInsights: "Market Insights",
    averagePrice: "Average Price",
    priceVariation: "Variation",
    lastUpdate: "Last Update",
  },
};

export function useI18n() {
  // Función de traducción que se recalcula cuando cambia el idioma
  const t = (key, params = {}) => {
    const lang = currentLanguage.value;
    let text = translations[lang]?.[key] || key;

    // Replace parameters
    Object.keys(params).forEach((param) => {
      text = text.replace(`{${param}}`, params[param]);
    });

    return text;
  };

  const setLanguage = (lang) => {
    if (translations[lang]) {
      currentLanguage.value = lang;
      localStorage.setItem("siec_language", lang);
      // Force a micro-task to ensure reactivity propagates
      setTimeout(() => {}, 0);
    }
  };

  const toggleLanguage = () => {
    setLanguage(currentLanguage.value === "es" ? "en" : "es");
  };

  return {
    t,
    currentLanguage,
    setLanguage,
    toggleLanguage,
  };
}
