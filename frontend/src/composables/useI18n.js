import { ref, nextTick } from "vue";
import {
  pageTranslationsEs,
  pageTranslationsEn,
} from "../i18n/pageTranslations.js";

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
    noSavedLayouts: "Sin diseños guardados",
    saveLayoutEmptyHint: "Guarda una estimación para verla aquí.",
    layoutUntitled: "Layout sin nombre",
    loadLayoutAria: "Cargar layout",
    deleteLayoutAria: "Eliminar layout",
    sidebarWorkspace: "Workspace",
    expandPanel: "Expandir panel contextual",
    collapsePanel: "Colapsar panel",
    changeLanguage: "Cambiar idioma",
    tutorial: "Tutorial",
    manual: "Manual",
    savedCountLabel: "Guardados",
    autoSaveActive: "Auto-guardado Activo",
    newEstimate: "Nueva Estimación",

    // TopNav
    estimationConfigurator: "Configurador de Estimación",
    editModeActive: "Modo edición · Auto-save activo",
    share: "Compartir",
    shareProject: "Compartir proyecto",
    roleEngineer: "Ingeniero Civil",
    roleContractor: "Constructor",
    roleClient: "Cliente / Mandante",
    roleAdmin: "Administrador",

    // Workspace
    workspaceActive: "Workspace activo",
    workspaceTitle: "Simulación constructiva inteligente",
    workspaceSubtitle:
      "Configura el terreno, edita recintos, visualiza el modelo 3D y genera presupuesto desde una única experiencia.",
    addRecintosTitle: "Agregar recintos",
    addRecintosBadge: "Paso clave",
    addRecintosHint:
      "Usa «Añadir Recinto» en el editor 2D para crear espacios con medidas exactas y luego seleccionarlos para presupuestar.",
    addRoom: "Añadir recinto",
    terrainMeasures: "Medidas del terreno",
    terrainMeasuresHint: "Ajusta ancho y largo en metros",

    // Editor 2D
    spatialEditor: "Editor espacial",
    editor2DTitle: "Editor 2D",
    addRoomBtn: "Añadir recinto",
    addRoomTitle: "Añadir recinto con medidas",
    resizeLock: "Redimensionar",
    resizeLocked: "Bloqueado",
    unlockResize: "Desbloquear redimensionado",
    lockResize: "Bloquear redimensionado",
    corridors: "Pasillos",
    corridorsOn: "Desactivar modo pasillos",
    corridorsOff: "Detectar pasillos automáticamente",
    floor: "Piso",
    inspectorEyebrow: "Inspector",
    inspectorTitle: "Propiedades",
    nameLabel: "Nombre",
    heightM: "Alto (m)",
    roomNamePlaceholder: "Ej. Baño 1",
    resizeLockedHint:
      "Redimensionado bloqueado. Desbloquéalo desde la barra superior para editar ancho y largo.",
    closeInspectorAria: "Cerrar inspector",
    addRoomModalEyebrow: "Nuevo espacio",
    addRoomModalDesc: "Define nombre y dimensiones iniciales.",
    dimensionsLabel: "Medidas",
    widthShort: "Ancho",
    lengthShort: "Largo",
    heightShort: "Alto",
    roomAreaLabel: "Área: {area} m²",
    createRoomBtn: "Crear recinto",
    fullscreen: "Pantalla completa",
    exitFullscreen: "Salir",
    terrainBounds: "Límites del terreno · {w}m × {h}m",
    terrainBoundsCompact: "{w}×{h} m",
    terrainFreeArea: "{area} m² libres",

    // Scene 3D
    renderer: "Renderizador",
    scene3DTitle: "Vista 3D en tiempo real",
    liveRender: "Live render",
    toolMove: "Mover",
    toolScale: "Escalar",
    toolMeasure: "Medir",
    measureHint: "Medir: clic en 2 puntos",
    cloneFloor: "Clonar",
    export: "Exportar",
    exportGltf: "GLTF / GLB (3D)",
    exportObj: "OBJ (CAD)",
    exportIfc: "IFC (BIM)",
    exportPng: "Imagen 4K",
    centerCamera: "Centrar cámara",
    shortcutPalette: "Abrir paleta de comandos",
    shortcutHelp: "Mostrar atajos",
    shortcutDashboard: "Ir al Dashboard",
    shortcutWorkspace: "Ir al Workspace",
    shortcutSettings: "Ir a Configuración",
    shortcutSave: "Guardar versión actual",
    shortcutEsc: "Cerrar / cancelar acción",
    shortcutDelete: "Eliminar recinto activo",
    shortcutFullscreen: "Pantalla completa",
    shortcutMeasure: "Herramienta medir",
    shortcutWalkthrough: "Modo walkthrough",
    shortcutsTitle: "Atajos de teclado",
    shortcutsSubtitle: "Acciones rápidas para navegar y trabajar más fluido.",
    shortcutsEscHint: "para cerrar.",
    shortcutsGotIt: "Entendido",
    generalSpecs: "Especificaciones Generales",
    materials: "Materiales",
    logistics: "Logística",
    localCache: "Caché Local",

    // Configuration Panel
    step01: "Especificaciones técnicas",
    projectGeometry: "Geometría del Proyecto",
    projectGeometryDesc:
      "Define las dimensiones del terreno y la materialidad estructural del proyecto.",
    widthM: "Ancho (m)",
    lengthM: "Largo (m)",
    structuralMaterialSelectHint:
      "Selecciona la base constructiva para estimar comportamiento y costo.",
    currentMaterial: "Material actual",
    heavyLogisticsBadge: "Requiere logística pesada",
    materialWoodHint: "Económico · Liviano · Apto sismo",
    materialSteelHint: "Industrial · Rápido montaje",
    materialMasonryHint: "Tradicional · Buena térmica",
    materialConcreteHint: "Robustez máxima · Logística pesada",
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
    generateModel: "Generar Modelo 3D",
    generateBudget: "Generar Presupuesto Detallado",
    layoutSaved: "Layout guardado exitosamente",
    layoutSavedDetail: "El diseño quedó guardado correctamente.",
    noDate: "Sin fecha",
    themeDark: "Oscuro",
    themeLight: "Claro",
    themeSwitchToLight: "Cambiar a modo claro",
    themeSwitchToDark: "Cambiar a modo oscuro",
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
    spatialBudgetTitle: "Presupuesto espacial",
    step02: 'Métricas',
    metricsPanelSubtitle: 'Seguimiento del área construida frente al terreno.',
    terrainStatusSafe: "ESPACIO DISPONIBLE",
    terrainStatusWarning: "ESPACIO LIMITADO",
    terrainStatusDanger: "SIN ESPACIO DISPONIBLE",
    terrainStatusUnknown: "Sin estado",
    tokenBudget: 'Ocupación del terreno',
    terrainOccupancySubtitle: 'Comparación entre superficie del terreno y recintos dibujados.',
    freeAreaLabel: 'Área libre',
    metricsHeroHint: 'Metros cuadrados del terreno que aún no ocupan recintos.',
    available: 'Disponible',
    terrainDimensions: 'Dimensiones',
    used: 'Usado',
    total: 'Total',
    occupancyLabel: 'Ocupación',

    // Status messages
    safeSpace: "Espacio OK",
    limitedSpace: "Espacio limitado",
    noSpace: "Sin espacio",
    tokensFree: "m² libres",
    tokensExcess: "m² en exceso",

    // Actions
    save: "Guardar",
    cancel: "Cancelar",
    delete: "Eliminar",
    load: "Cargar",

    // Footer
    footer: "2026 SIEC - V0.3",
    workspaceFooterLine:
      "SIEC Workspace · Simulación, diseño y presupuesto constructivo",
    draftsSynced: "Borradores Sincronizados",
    privacyPolicy: "Política de Privacidad",
    termsOfService: "Términos de Servicio",
    supportPortal: "Portal de Soporte",

    // Save Dialog
    saveLayoutTitle: "Guardar Layout",
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
    ...pageTranslationsEs,
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
    noSavedLayouts: "No saved designs",
    saveLayoutEmptyHint: "Save an estimate to see it here.",
    layoutUntitled: "Untitled layout",
    loadLayoutAria: "Load layout",
    deleteLayoutAria: "Delete layout",
    sidebarWorkspace: "Workspace",
    expandPanel: "Expand side panel",
    collapsePanel: "Collapse panel",
    changeLanguage: "Change language",
    tutorial: "Tutorial",
    manual: "Manual",
    savedCountLabel: "Saved",
    autoSaveActive: "Auto-save Active",
    newEstimate: "New Estimate",

    // TopNav
    estimationConfigurator: "Estimation Configurator",
    editModeActive: "Edit mode · Auto-save on",
    share: "Share",
    shareProject: "Share project",
    roleEngineer: "Civil Engineer",
    roleContractor: "Contractor",
    roleClient: "Client",
    roleAdmin: "Administrator",

    // Workspace
    workspaceActive: "Active workspace",
    workspaceTitle: "Intelligent construction simulation",
    workspaceSubtitle:
      "Configure terrain, edit rooms, view the 3D model, and generate budget from one experience.",
    addRecintosTitle: "Add rooms",
    addRecintosBadge: "Key step",
    addRecintosHint:
      "Use «Add room» in the 2D editor to create spaces with exact dimensions, then select them to budget.",
    addRoom: "Add room",
    terrainMeasures: "Terrain dimensions",
    terrainMeasuresHint: "Adjust width and length in meters",

    // Editor 2D
    spatialEditor: "Spatial editor",
    editor2DTitle: "2D Editor",
    addRoomBtn: "Add room",
    addRoomTitle: "Add room with dimensions",
    resizeLock: "Resize",
    resizeLocked: "Locked",
    unlockResize: "Unlock resizing",
    lockResize: "Lock resizing",
    corridors: "Corridors",
    corridorsOn: "Disable corridor mode",
    corridorsOff: "Detect corridors automatically",
    floor: "Floor",
    inspectorEyebrow: "Inspector",
    inspectorTitle: "Properties",
    nameLabel: "Name",
    heightM: "Height (m)",
    roomNamePlaceholder: "e.g. Bathroom 1",
    resizeLockedHint:
      "Resizing locked. Unlock it from the top toolbar to edit width and length.",
    closeInspectorAria: "Close inspector",
    addRoomModalEyebrow: "New space",
    addRoomModalDesc: "Set the name and initial dimensions.",
    dimensionsLabel: "Dimensions",
    widthShort: "Width",
    lengthShort: "Length",
    heightShort: "Height",
    roomAreaLabel: "Area: {area} m²",
    createRoomBtn: "Create room",
    fullscreen: "Fullscreen",
    exitFullscreen: "Exit",
    terrainBounds: "Terrain limits · {w}m × {h}m",
    terrainBoundsCompact: "{w}×{h} m",
    terrainFreeArea: "{area} m² free",

    // Scene 3D
    renderer: "Renderer",
    scene3DTitle: "Real-time 3D view",
    liveRender: "Live render",
    toolMove: "Move",
    toolScale: "Scale",
    toolMeasure: "Measure",
    measureHint: "Measure: click 2 points",
    cloneFloor: "Clone",
    export: "Export",
    exportGltf: "GLTF / GLB (3D)",
    exportObj: "OBJ (CAD)",
    exportIfc: "IFC (BIM)",
    exportPng: "4K Image",
    centerCamera: "Center camera",
    shortcutPalette: "Open command palette",
    shortcutHelp: "Show shortcuts",
    shortcutDashboard: "Go to Dashboard",
    shortcutWorkspace: "Go to Workspace",
    shortcutSettings: "Go to Settings",
    shortcutSave: "Save current version",
    shortcutEsc: "Close / cancel action",
    shortcutDelete: "Delete active room",
    shortcutFullscreen: "Fullscreen",
    shortcutMeasure: "Measure tool",
    shortcutWalkthrough: "Walkthrough mode",
    shortcutsTitle: "Keyboard shortcuts",
    shortcutsSubtitle: "Quick actions to navigate and work faster.",
    shortcutsEscHint: "to close.",
    shortcutsGotIt: "Got it",
    generalSpecs: "General Specs",
    materials: "Materials",
    logistics: "Logistics",
    localCache: "Local Cache",

    // Configuration Panel
    step01: "Technical specs",
    projectGeometry: "Project Geometry",
    projectGeometryDesc:
      "Define terrain dimensions and the project's structural material system.",
    widthM: "Width (m)",
    lengthM: "Length (m)",
    structuralMaterialSelectHint:
      "Select the structural base to estimate behavior and cost.",
    currentMaterial: "Current material",
    heavyLogisticsBadge: "Requires heavy logistics",
    materialWoodHint: "Economical · Lightweight · Seismic-friendly",
    materialSteelHint: "Industrial · Fast assembly",
    materialMasonryHint: "Traditional · Good thermal mass",
    materialConcreteHint: "Maximum strength · Heavy logistics",
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
    generateModel: "Generate 3D Model",
    generateBudget: "Generate Detailed Budget",
    layoutSaved: "Layout successfully saved",
    layoutSavedDetail: "Your design was saved successfully.",
    noDate: "No date",
    themeDark: "Dark",
    themeLight: "Light",
    themeSwitchToLight: "Switch to light mode",
    themeSwitchToDark: "Switch to dark mode",
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
    spatialBudgetTitle: "Spatial budget",
    step02: 'Metrics',
    metricsPanelSubtitle: 'Built area vs. total terrain footprint.',
    terrainStatusSafe: "SPACE AVAILABLE",
    terrainStatusWarning: "LIMITED SPACE",
    terrainStatusDanger: "NO SPACE AVAILABLE",
    terrainStatusUnknown: "Unknown",
    tokenBudget: 'Terrain occupancy',
    terrainOccupancySubtitle: 'Terrain surface compared to drawn rooms.',
    freeAreaLabel: 'Free area',
    metricsHeroHint: 'Square meters of terrain not yet used by rooms.',
    available: 'Available',
    terrainDimensions: 'Dimensions',
    used: 'Used',
    total: 'Total',
    occupancyLabel: 'Occupancy',

    // Status messages
    safeSpace: "Space OK",
    limitedSpace: "Limited space",
    noSpace: "No space",
    tokensFree: "m² free",
    tokensExcess: "m² excess",

    // Actions
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    load: "Load",

    // Footer
    footer: "2026 SIEC - V0.3",
    workspaceFooterLine:
      "SIEC Workspace · Simulation, design, and construction budgeting",
    draftsSynced: "Drafts Synchronized",
    privacyPolicy: "Privacy Policy",
    termsOfService: "Terms of Service",
    supportPortal: "Support Portal",

    // Save Dialog
    saveLayoutTitle: "Save Layout",
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
    ...pageTranslationsEn,
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

  const captureScrollPositions = () => {
    if (typeof document === "undefined") return [];

    const snapshots = [
      { top: window.scrollY, left: window.scrollX, isWindow: true },
    ];

    document.querySelectorAll("[data-workspace-scroll]").forEach((el) => {
      snapshots.push({
        el,
        top: el.scrollTop,
        left: el.scrollLeft,
      });
    });

    return snapshots;
  };

  const restoreScrollPositions = (snapshots) => {
    if (!snapshots?.length) return;

    snapshots.forEach((snap) => {
      if (snap.isWindow) {
        window.scrollTo(snap.left, snap.top);
        return;
      }
      if (snap.el) {
        snap.el.scrollTop = snap.top;
        snap.el.scrollLeft = snap.left;
      }
    });
  };

  const setLanguage = (lang) => {
    if (!translations[lang]) return;

    const scrollSnapshots = captureScrollPositions();
    currentLanguage.value = lang;
    localStorage.setItem("siec_language", lang);

    const restore = () => restoreScrollPositions(scrollSnapshots);

    nextTick(() => {
      restore();
      requestAnimationFrame(restore);
    });
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
