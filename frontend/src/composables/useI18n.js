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
    generateModel: "Generar Modelo 3D",
    generateBudget: "Generar Presupuesto Detallado",
    layoutSaved: "Layout guardado exitosamente",
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
    step02: 'Métricas',
    metricsPanelSubtitle: 'Seguimiento del área construida frente al terreno.',
    tokenBudget: 'Ocupación del terreno',
    terrainOccupancySubtitle: 'Comparación entre superficie del terreno y recintos dibujados.',
    freeAreaLabel: 'Área libre',
    metricsHeroHint: 'Metros cuadrados del terreno que aún no ocupan recintos.',
    available: 'Disponible',
    terrainDimensions: 'Dimensiones',
    used: 'Usado',
    total: 'Total',

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

    // EditorShell
    workspaceActive: 'Workspace activo',
    smartConstructionSim: 'Simulación constructiva inteligente',
    workspaceDescription: 'Configura el terreno, edita recintos, visualiza el modelo 3D y genera presupuesto desde una única experiencia.',
    tokensAvailable: '{count} tokens disponibles',
    workspaceFooter: 'SIEC Workspace · Simulación, diseño y presupuesto constructivo',

    // RoomEditor2D
    spatialEditor: 'Editor espacial',
    editor2D: 'Editor 2D',
    freeM2: '{area} m² libres',
    areaUsage: '{used} / {total} m²',
    floorLabel: 'Piso {n}',
    addRoom: 'Añadir recinto',
    locked: 'Bloqueado',
    resize: 'Redimensionar',
    fullscreen: 'Pantalla completa',
    exitFullscreen: 'Salir',
    terrainBounds: 'Límites del terreno · {w}m × {h}m',
    freeArea: '{area} m² libres',
    clickCorridor: 'Clic → pasillo aquí',
    noCorridorSpace: 'Sin espacios ≥ 0.8m disponibles para pasillo',
    inspector: 'Inspector',
    properties: 'Propiedades',
    name: 'Nombre',
    width: 'Ancho (m)',
    length: 'Largo (m)',
    height: 'Alto (m)',
    newSpace: 'Nuevo espacio',
    addRoomTitle: 'Añadir recinto',
    addRoomDesc: 'Define nombre y dimensiones iniciales.',
    cancel: 'Cancelar',
    createRoom: 'Crear recinto',
    measures: 'Medidas',
    area: 'Área: {area} m²',
    resizeLocked: 'Redimensionado bloqueado. Desbloquéalo desde la barra superior para editar ancho y largo.',
    noRoomsBreakdown: 'Sin recintos modelados',

    // Scene3D
    renderer: 'Renderizador',
    realtime3D: 'Vista 3D en tiempo real',
    liveRender: 'Live render',
    move: 'Mover',
    scale: 'Escalar',
    measure: 'Medir',
    clone: 'Clonar',
    snapOff: 'Snap desactivado',
    snapActive: 'Snap activo',
    measureHint: 'Medir: clic en 2 puntos',
    hideFurniture: 'Ocultar muebles',
    showFurniture: 'Mostrar muebles',
    section: 'Sección / Corte',
    walkthrough: 'Walkthrough',
    autoTour: 'Tour automático',
    export: 'Exportar',
    centerCamera: 'Centrar cámara',
    addCorridor: 'Añadir pasillo',

    // TopNavBar
    editMode: 'Modo edición · Auto-save activo',
    profile: 'Perfil',
    recentHistory: 'Historial reciente',
    noRecentExports: 'No hay exportaciones recientes',
    exports: 'Exportaciones',
    saved: 'Guardados',
    logout: 'Cerrar sesión',
    share: 'Compartir',
    exporting: 'Exportando…',

    // Sidebar
    noSavedLayouts: 'Sin diseños guardados',
    saveLayoutHint: 'Guarda una estimación para verla aquí.',
    tutorial: 'Tutorial',
    manual: 'Manual',
    layoutUnnamed: 'Layout sin nombre',
    dateFormat: 'Sin fecha',

    // KeyboardShortcuts
    keyboardShortcuts: 'Atajos de teclado',
    shortcutsDesc: 'Acciones rápidas para navegar y trabajar más fluido.',
    closeShortcuts: 'Cerrar atajos de teclado',
    pressEsc: 'Presiona Esc para cerrar.',
    gotIt: 'Entendido',

    // Footer
    footer: "2026 SIEC - V0.3",
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
    generateModel: "Generate 3D Model",
    generateBudget: "Generate Detailed Budget",
    layoutSaved: "Layout successfully saved",
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
    step02: 'Metrics',
    metricsPanelSubtitle: 'Built area vs. total terrain footprint.',
    tokenBudget: 'Terrain occupancy',
    terrainOccupancySubtitle: 'Terrain surface compared to drawn rooms.',
    freeAreaLabel: 'Free area',
    metricsHeroHint: 'Square meters of terrain not yet used by rooms.',
    available: 'Available',
    terrainDimensions: 'Dimensions',
    used: 'Used',
    total: 'Total',

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

    // EditorShell
    workspaceActive: 'Active Workspace',
    smartConstructionSim: 'Smart Construction Simulation',
    workspaceDescription: 'Configure terrain, edit rooms, visualize the 3D model and generate budget from a single experience.',
    tokensAvailable: '{count} tokens available',
    workspaceFooter: 'SIEC Workspace · Simulation, design and construction budget',

    // RoomEditor2D
    spatialEditor: 'Spatial Editor',
    editor2D: '2D Editor',
    freeM2: '{area} m² free',
    areaUsage: '{used} / {total} m²',
    floorLabel: 'Floor {n}',
    addRoom: 'Add Room',
    locked: 'Locked',
    resize: 'Resize',
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit',
    terrainBounds: 'Terrain bounds · {w}m × {h}m',
    freeArea: '{area} m² free',
    clickCorridor: 'Click → corridor here',
    noCorridorSpace: 'No spaces ≥ 0.8m available for corridor',
    inspector: 'Inspector',
    properties: 'Properties',
    name: 'Name',
    width: 'Width (m)',
    length: 'Length (m)',
    height: 'Height (m)',
    newSpace: 'New Space',
    addRoomTitle: 'Add Room',
    addRoomDesc: 'Set name and initial dimensions.',
    cancel: 'Cancel',
    createRoom: 'Create Room',
    measures: 'Measures',
    area: 'Area: {area} m²',
    resizeLocked: 'Resize locked. Unlock it from the top bar to edit width and length.',
    noRoomsBreakdown: 'No rooms modeled',

    // Scene3D
    renderer: 'Renderer',
    realtime3D: 'Real-time 3D View',
    liveRender: 'Live render',
    move: 'Move',
    scale: 'Scale',
    measure: 'Measure',
    clone: 'Clone',
    snapOff: 'Snap off',
    snapActive: 'Snap active',
    measureHint: 'Measure: click 2 points',
    hideFurniture: 'Hide furniture',
    showFurniture: 'Show furniture',
    section: 'Section / Cut',
    walkthrough: 'Walkthrough',
    autoTour: 'Auto tour',
    export: 'Export',
    centerCamera: 'Center camera',
    addCorridor: 'Add corridor',

    // TopNavBar
    editMode: 'Edit mode · Auto-save active',
    profile: 'Profile',
    recentHistory: 'Recent History',
    noRecentExports: 'No recent exports',
    exports: 'Exports',
    saved: 'Saved',
    logout: 'Logout',
    share: 'Share',
    exporting: 'Exporting…',

    // Sidebar
    noSavedLayouts: 'No saved layouts',
    saveLayoutHint: 'Save an estimate to see it here.',
    tutorial: 'Tutorial',
    manual: 'Manual',
    layoutUnnamed: 'Unnamed layout',
    dateFormat: 'No date',

    // KeyboardShortcuts
    keyboardShortcuts: 'Keyboard Shortcuts',
    shortcutsDesc: 'Quick actions to navigate and work more fluidly.',
    closeShortcuts: 'Close keyboard shortcuts',
    pressEsc: 'Press Esc to close.',
    gotIt: 'Got it',

    // Footer
    footer: "2026 SIEC - V0.3",
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
