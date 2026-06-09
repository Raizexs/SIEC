import { ref, nextTick } from "vue";
import {
  pageTranslationsEs,
  pageTranslationsEn,
} from "../i18n/pageTranslations.js";

function readStoredLanguage() {
  if (typeof globalThis.localStorage === "undefined") return "es";
  try {
    return globalThis.localStorage.getItem("siec_language") || "es";
  } catch {
    return "es";
  }
}

function writeStoredLanguage(lang) {
  if (typeof globalThis.localStorage === "undefined") return;
  try {
    globalThis.localStorage.setItem("siec_language", lang);
  } catch {
    /* private mode / SSR */
  }
}

// Estado global singleton fuera del composable
const currentLanguage = ref(readStoredLanguage());

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
      "Configura el terreno, diseña en 2D con vista 3D al lado y cotiza con el icono de precio sin salir del plano.",
    wsStepConfigure: "Configurar",
    wsStepDesign: "Diseñar",
    wsStepBudget: "Presupuesto",
    wsStepExport: "Exportar",
    wsNext: "Siguiente paso",
    wsPrev: "Paso anterior",
    wsOpenBudgetPanel: "Ver presupuesto · {m2} m²",
    wsCloseBudgetPanel: "Cerrar presupuesto",
    budgetSelectWithIconHint:
      "Marca recintos con el icono de precio en el plano 2D (no uses solo «Añadir recinto»).",
    budgetStepEmptyTitle: "Selecciona recintos para presupuestar",
    budgetStepEmptyHint:
      "En el paso Diseñar, activa el icono de precio en cada recinto que quieras incluir. Solo esos espacios se calcularán y podrás exportar el presupuesto.",
    budgetStepGoDesign: "Ir a diseñar",
    exportStepEmptyTitle: "Presupuesto requerido para exportar",
    exportStepEmptyHint:
      "Primero marca recintos con el icono de precio en Diseñar, genera el presupuesto en el paso Presupuesto y luego podrás exportar aquí.",
    exportStepGoBudget: "Ir a presupuesto",
    flowGuideTitle: "¿Qué hacer ahora?",
    flowGuideDismiss: "Ocultar guía",
    flowHintConfigure: "Define el terreno y el material. Luego avanza a diseñar recintos.",
    flowHintDesign:
      "Diseña en 2D y revisa el 3D al lado. Usa el icono de precio en cada recinto que quieras cotizar; luego ve a Presupuesto.",
    flowHintBudget:
      "Calcula el presupuesto aquí: verás el total, el desglose y al final podrás ir al paso Exportar.",
    flowHintExport: "Descarga PDF, Excel o CSV del presupuesto ya calculado.",
    tourWelcomeTitle: "Bienvenido a SIEC",
    tourWelcomeDesc:
      "Este recorrido sigue el flujo actual del workspace: Configurar → Diseñar → Presupuesto → Exportar. Puedes saltarlo cuando quieras.",
    tourStepperTitle: "Flujo en 4 pasos",
    tourStepperDesc:
      "Usa la barra superior para moverte entre configuración, diseño 2D/3D, presupuesto y exportación. Los pasos completados quedan marcados.",
    tourConfigureTitle: "Configurar terreno",
    tourConfigureDesc:
      "Define ancho, largo, material estructural y parámetros del proyecto. Todo lo que diseñes y presupuestes parte de aquí.",
    tourMetricsTitle: "Ocupación del terreno",
    tourMetricsDesc:
      "En Diseñar ves cuántos m² usas y cuánto queda libre. Si te pasas del límite, SIEC te avisa antes de cotizar mal.",
    tourEditorToolsTitle: "Herramientas 2D",
    tourEditorToolsDesc:
      "Añade recintos, dibuja pasillos y bloquea el redimensionado si lo necesitas. El selector de piso aplica a todo el plano.",
    tourEditorActionsTitle: "Vista ampliada 2D",
    tourEditorActionsDesc:
      "Pantalla completa para trabajar cómodo en plantas grandes. Ideal en portátiles o presentaciones.",
    tourEditorCanvasTitle: "Plano 2D",
    tourEditorCanvasDesc:
      "Arrastra recintos para ubicarlos, redimensiona desde la esquina y pulsa el icono $ en cada recinto que quieras incluir en el presupuesto.",
    tourSceneToolsTitle: "Herramientas 3D",
    tourSceneToolsDesc:
      "Mover, escalar y medir en la vista 3D. El modelo se actualiza en vivo mientras editas el plano.",
    tourSceneActionsTitle: "Capas y exportación 3D",
    tourSceneActionsDesc:
      "Capas constructivas, muebles, exportar imagen/HTML, recorrido a pie y centrar cámara. Complementa la validación del diseño.",
    tourBudgetTitle: "Presupuesto",
    tourBudgetDesc:
      "Solo se cotizan los recintos marcados con $ en el plano 2D. Revisa partidas, totales y ajustes antes de exportar.",
    tourExportTitle: "Exportar",
    tourExportDesc:
      "Genera PDF o Excel con el desglose constructivo. Necesitas recintos presupuestados y el cálculo hecho en el paso anterior.",
    tourDoneTitle: "Listo para diseñar",
    tourDoneDesc:
      "Empieza en Configurar, pasa a Diseñar y marca con $ los espacios a cotizar. El 3D te ayuda a validar proporciones en tiempo real.",
    tourBtnNext: "Siguiente",
    tourBtnPrev: "Atrás",
    tourBtnDone: "Entendido",
    layersBtn: "Capas",
    showFurniture: "Mostrar muebles",
    hideFurniture: "Ocultar muebles",
    walkthrough: "Recorrido 3D",
    metricsBarUsed: "Ocupado",
    metricsBarFree: "Libre",
    metricsBarTokens: "Tokens",
    planMaterialLocked: "Disponible en Pro o Pro+",
    planMaterialFreeOnlyTitle: "Solo Madera en plan Free",
    planMaterialFreeOnlyHint:
      "Metalcom, albañilería y hormigón armado requieren Pro o Pro+. No se pueden seleccionar ni usar en cotizaciones.",
    planUpgradeCta: "Mejorar plan",
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
      "Define la base constructiva del proyecto antes de diseñar.",
    terrainTotalArea: "Superficie total",
    terrainDimensionsSummary: "{w} × {l} m",
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
    concrete: "Hormigón armado",
    heavyLogisticsTitle: "Requisitos logísticos pesados",
    heavyLogisticsMessage:
      "El hormigón armado requiere maquinaria pesada para carga, descarga y montaje. En obras menores esto puede aumentar costos logísticos y tiempos de ejecución.",
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
    freeM2: "{area} m² libres",
    areaUsage: "{used} / {total} m² usados",

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
      "Set up terrain, design in 2D with 3D beside you, and quote with the price icon without leaving the plan.",
    wsStepConfigure: "Configure",
    wsStepDesign: "Design",
    wsStepBudget: "Budget",
    wsStepExport: "Export",
    wsNext: "Next step",
    wsPrev: "Previous step",
    wsOpenBudgetPanel: "View budget · {m2} m²",
    wsCloseBudgetPanel: "Close budget",
    budgetSelectWithIconHint:
      "Mark rooms with the price icon on the 2D plan (not only «Add room»).",
    budgetStepEmptyTitle: "Select rooms to budget",
    budgetStepEmptyHint:
      "In the Design step, turn on the price icon on each room to include. Only those spaces will be calculated and can be exported.",
    budgetStepGoDesign: "Go to design",
    exportStepEmptyTitle: "Budget required to export",
    exportStepEmptyHint:
      "First mark rooms with the price icon in Design, generate the budget in the Budget step, then export here.",
    exportStepGoBudget: "Go to budget",
    flowGuideTitle: "What to do now",
    flowGuideDismiss: "Hide guide",
    flowHintConfigure: "Set terrain and material, then move on to design rooms.",
    flowHintDesign:
      "Design in 2D and review 3D side by side. Use the price icon on each room to quote; then go to Budget.",
    flowHintBudget:
      "Calculate the budget here: you'll see the total, breakdown, and can continue to the Export step at the end.",
    flowHintExport: "Download PDF, Excel, or CSV for the calculated budget.",
    tourWelcomeTitle: "Welcome to SIEC",
    tourWelcomeDesc:
      "This tour follows the current workspace flow: Configure → Design → Budget → Export. You can close it anytime.",
    tourStepperTitle: "4-step flow",
    tourStepperDesc:
      "Use the top bar to move between setup, 2D/3D design, budget, and export. Completed steps stay marked.",
    tourConfigureTitle: "Configure terrain",
    tourConfigureDesc:
      "Set width, length, structural material, and project parameters. Everything you design and budget starts here.",
    tourMetricsTitle: "Terrain usage",
    tourMetricsDesc:
      "On Design you see used vs free m². SIEC warns you before you overfill the plot or budget incorrectly.",
    tourEditorToolsTitle: "2D tools",
    tourEditorToolsDesc:
      "Add rooms, draw corridors, and lock resize when needed. The floor selector applies to the whole plan.",
    tourEditorActionsTitle: "2D fullscreen",
    tourEditorActionsDesc:
      "Fullscreen mode for large layouts—especially helpful on laptops or when presenting.",
    tourEditorCanvasTitle: "2D plan",
    tourEditorCanvasDesc:
      "Drag rooms into place, resize from the corner, and tap the $ icon on each room you want in the budget.",
    tourSceneToolsTitle: "3D tools",
    tourSceneToolsDesc:
      "Move, scale, and measure in 3D. The model updates live as you edit the floor plan.",
    tourSceneActionsTitle: "3D layers & export",
    tourSceneActionsDesc:
      "Construction layers, furniture, image/HTML export, walkthrough, and camera center—validate your design in 3D.",
    tourBudgetTitle: "Budget",
    tourBudgetDesc:
      "Only rooms marked with $ on the 2D plan are quoted. Review line items and totals before exporting.",
    tourExportTitle: "Export",
    tourExportDesc:
      "Generate PDF or Excel with the construction breakdown. You need budgeted rooms and a completed calculation.",
    tourDoneTitle: "Ready to design",
    tourDoneDesc:
      "Start in Configure, move to Design, and mark rooms with $ to budget. Use 3D to check proportions in real time.",
    tourBtnNext: "Next",
    tourBtnPrev: "Back",
    tourBtnDone: "Got it",
    layersBtn: "Layers",
    showFurniture: "Show furniture",
    hideFurniture: "Hide furniture",
    walkthrough: "3D walkthrough",
    metricsBarUsed: "Used",
    metricsBarFree: "Free",
    metricsBarTokens: "Tokens",
    planMaterialLocked: "Available on Pro or Pro+",
    planMaterialFreeOnlyTitle: "Wood only on Free plan",
    planMaterialFreeOnlyHint:
      "Steel frame, masonry and reinforced concrete require Pro or Pro+. They cannot be selected or used in budgets.",
    planUpgradeCta: "Upgrade plan",
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
      "Set the project's structural base before designing.",
    terrainTotalArea: "Total area",
    terrainDimensionsSummary: "{w} × {l} m",
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
    concrete: "Reinforced concrete",
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
    freeM2: "{area} m² free",
    areaUsage: "{used} / {total} m² used",

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
    writeStoredLanguage(lang);

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
