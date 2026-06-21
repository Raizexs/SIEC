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
    presetLayouts: "Layouts prearmados",
    presetRecintoSummary: "{m2} m² · {count} recintos · {floors}",
    presetOneFloor: "1 piso",
    presetManyFloors: "{count} pisos",
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
    wsPreparing: "Preparando workspace",
    wsLoadingEditor: "Estamos cargando el editor, el contexto del proyecto y las herramientas de estimación.",
    wsNewEstimate: "Nueva estimación",
    wsUnavailable: "Workspace no disponible",
    wsCantOpen: "No se pudo abrir el editor",
    wsBackDashboard: "Volver al dashboard",
    wsNewEstimateConfirm: "¿Estás seguro que deseas iniciar una nueva estimación? Se perderá el diseño actual no guardado.",
    wsPdfGenerating: "Generando PDF...",
    wsPdfExported: "PDF exportado correctamente",
    wsPdfFailed: "No se pudo exportar el PDF",
    wsUnsavedConfirm: "Tienes cambios sin guardar. ¿Deseas continuar?",
    budgetCategoryEnable: "Habilitar categoría",
    budgetCategoryDisable: "Deshabilitar categoría",
    billingPlanFree: "Plan Free",
    billingPlanCurrent: "Plan actual",
    billingActiveProject: "1 proyecto activo",
    billingSavedProject: "1 guardado",
    billingWatermark: "PDF con marca de agua",
    billingExports: "3 exportaciones por sesión",
    billingFeatures: "Todas las funciones de estimación",
    roomDefaultName: "Recinto",
    roomHallwayName: "Pasillo",
    corridorDragHint: "Arrastra para dibujar un pasillo",
    materialLockedReason: "Tu plan actual no incluye este material. Mejora tu plan para desbloquearlo.",
    limitExportsReached: "Límite de exportaciones alcanzado",
    limitViewPlans: "Ver planes",
    limitPaymentFailed: "No se pudo iniciar el pago.",
    limitPaymentUnavailable: "Pagos no disponibles",
    limitPlanReached: "Límite de tu plan alcanzado",
    limitUpgrade: "Mejorar plan",
    limitMaterialLocked: "Material no disponible en tu plan actual",
    canvasNoRooms: "Aún no hay recintos. Usa el editor 2D para dibujar habitaciones.",
    sceneNoWebGL: "Tu navegador no soporta WebGL o los gráficos 3D no están disponibles. Intenta actualizar tu navegador.",
    sceneInitializing: "Preparando vista 3D...",
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
    designBudgetCtaTitle: "Recintos listos para cotizar",
    designBudgetCtaHint:
      "{count} recinto(s) marcados con $ · {m2} m² seleccionados. Continúa al presupuesto detallado.",
    designBudgetCtaBtn: "Ir a presupuesto",
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
    tourSidebarPresetsTitle: "Layouts prearmados",
    tourSidebarPresetsDesc:
      "Parte rápido con Departamento (2 pisos), Casa (2 pisos) o Edificio Planta (4 pisos). Puedes editarlos después en el plano 2D.",
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
      "Mover, medir y —en Pro+— el modo desarrollador para ajustes rápidos en 3D. Valida siempre las medidas en el inspector 2D.",
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
      "Empieza en Configurar o elige un layout prearmado, diseña en 2D, marca con $ los espacios a cotizar y valida en 3D antes de exportar.",
    tourProgressText: "{{current}} de {{total}}",
    tourKeyboardHint: "Usa ← → para navegar · Esc para cerrar",
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
    blueprintExportBtn: "Plano 2D",
    blueprintExportEmpty: "Agregue recintos antes de exportar el plano.",
    blueprintExportSuccess: "Plano PDF descargado.",
    blueprintExportFailed: "No se pudo generar el plano.",
    floor: "Piso",
    inspectorEyebrow: "Inspector",
    inspectorTitle: "Propiedades",
    inspectorRecintoTitle: "Recinto seleccionado",
    recintoColor2dLabel: "Color en plano 2D",
    recintoColor2dDefault: "Por tipo",
    recintoColor2dHint: "Solo afecta la vista 2D. El modelo 3D mantiene el material estructural.",
    recintoMaterialLabel: "Material estructural",
    nameLabel: "Nombre",
    heightM: "Alto (m)",
    projectWallHeightLabel: "Altura (m)",
    projectWallHeightHint:
      "Afecta la vista 3D, el presupuesto y todos los recintos. Rango {min}–{max} m.",
    upperFloorSupportHint:
      "Piso superior: apóyese en el piso inferior. Voladizos hasta el límite del material se refuerzan con vigas (capa Estructura).",
    upperFloorSupportHintEmpty:
      "Este piso no tiene recintos debajo. Clone el piso anterior o baje de nivel antes de agregar espacios.",
    upperFloorSupportRequired:
      "No puede agregar recintos aquí: el piso inferior está vacío.",
    upperFloorPlacementFailed:
      "No hay espacio con apoyo estructural para este recinto en el piso actual.",
    roomNamePlaceholder: "Ej. Baño 1",
    resizeLockedHint:
      "Layout bloqueado en 2D y 3D. Use el candado en la barra superior para mover o redimensionar recintos.",
    resizeUnlockedHint:
      "Recintos editables. Active el candado para evitar movimientos accidentales en 2D y 3D.",
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
    toolNavigate: "Navegar",
    toolScale: "Escalar",
    toolDeveloperMode: "Modo desarrollador",
    developerModeDisclaimer:
      "Modo desarrollador (Pro+): el escalado 3D no representa medidas constructivas reales ni reemplaza el inspector 2D. Confirme dimensiones en planta antes de presupuestar o exportar.",
    inspector2dPrecisionHint:
      "Use el inspector 2D para medidas precisas. En 3D (Pro+) el modo desarrollador permite ajustes visuales rápidos, no dimensiones oficiales.",
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
    shortcutHelp: "Mostrar atajos de teclado",
    shortcutTerms: "Ir a términos de servicio",
    railTerms: "Términos",
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
    materialHybridHint: "Mixto madera + metalcon · Montaje flexible",
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
    savingProject: "Guardando proyecto…",
    saveLayoutError: "No se pudo guardar el proyecto. Intenta de nuevo.",
    defaultProjectName: "Proyecto SIEC",
    layoutSavedLocalOnly: "Guardado localmente. Inicia sesión para sincronizar en la nube.",
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
    hybridFrame: "Híbrido madera + metalcon",
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

    manualStep1Title: "Configurar terreno y material",
    manualStep1Desc:
      "Defina dimensiones del terreno, material por defecto y opcionalmente un layout prearmado.",
    manualStep2Title: "Layouts y recintos",
    manualStep2Desc:
      "Use layouts prearmados o añada recintos manualmente. Marque con $ los que entren al presupuesto.",
    manualStep3Title: "Editor 2D",
    manualStep3Desc:
      "Arrastre, redimensione y asigne material por recinto en el inspector. Consulte la leyenda de colores.",
    manualStep4Title: "Vista 3D",
    manualStep4Desc:
      "Visualice capas, exporte vistas planta/fachada y use el inspector en pantalla completa (Pro+ escala).",
    manualStep5Title: "Presupuesto",
    manualStep5Desc:
      "Genere el desglose con contingencia e IVA según preferencias. Soporta materiales distintos por recinto.",
    manualStep6Title: "Exportar propuesta",
    manualStep6Desc:
      "Descargue PDF premium con vista 3D compuesta, normativa y condiciones comerciales.",
    manualEyebrow: "Guía del workspace",
    manualTitle: "Manual de usuario",
    manualSubtitle: "Flujo de trabajo desde terreno hasta propuesta PDF.",
    manualShortcutsTitle: "Atajos de teclado",
    manualShortcutDelete: "Eliminar recinto",
    manualShortcutUndo: "Deshacer acción",
    manualShortcutRedo: "Rehacer acción",
    manualShortcutZoom: "Zoom 2D / 3D",
    manualShortcutPan: "Desplazar vista 2D",
    manualShortcutRotate: "Rotar cámara 3D",
    manualKeyRightClick: "Clic der.",
    manualKeyLeftClick: "Clic izq.",
    manualKeyDrag: "Arrastrar",
    manualStepLabel: "Paso {n}",
    manualClose: "Cerrar manual",

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
    presetLayouts: "Preset layouts",
    presetRecintoSummary: "{m2} m² · {count} rooms · {floors}",
    presetOneFloor: "1 floor",
    presetManyFloors: "{count} floors",
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
    wsPreparing: "Preparing workspace",
    wsLoadingEditor: "Loading the editor, project context and estimation tools.",
    wsNewEstimate: "New estimate",
    wsUnavailable: "Workspace unavailable",
    wsCantOpen: "Could not open editor",
    wsBackDashboard: "Back to dashboard",
    wsNewEstimateConfirm: "Are you sure you want to start a new estimate? Your current unsaved design will be lost.",
    wsPdfGenerating: "Generating PDF...",
    wsPdfExported: "PDF exported successfully",
    wsPdfFailed: "Could not export PDF",
    wsUnsavedConfirm: "You have unsaved changes. Do you want to continue?",
    budgetCategoryEnable: "Enable category",
    budgetCategoryDisable: "Disable category",
    billingPlanFree: "Free Plan",
    billingPlanCurrent: "Current plan",
    billingActiveProject: "1 active project",
    billingSavedProject: "1 saved",
    billingWatermark: "Watermarked PDF",
    billingExports: "3 exports per session",
    billingFeatures: "All estimation features",
    roomDefaultName: "Room",
    roomHallwayName: "Hallway",
    corridorDragHint: "Drag to draw a corridor",
    materialLockedReason: "Your current plan does not include this material. Upgrade to unlock.",
    limitExportsReached: "Export limit reached",
    limitViewPlans: "View plans",
    limitPaymentFailed: "Could not initiate payment.",
    limitPaymentUnavailable: "Payments unavailable",
    limitPlanReached: "Your plan limit reached",
    limitUpgrade: "Upgrade plan",
    limitMaterialLocked: "Material unavailable on your current plan",
    canvasNoRooms: "No rooms yet. Use the 2D editor to draw rooms.",
    sceneNoWebGL: "Your browser does not support WebGL or 3D graphics are unavailable. Try updating your browser.",
    sceneInitializing: "Preparing 3D view...",
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
    designBudgetCtaTitle: "Rooms ready to quote",
    designBudgetCtaHint:
      "{count} room(s) marked with $ · {m2} m² selected. Continue to the detailed budget.",
    designBudgetCtaBtn: "Go to budget",
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
    tourSidebarPresetsTitle: "Preset layouts",
    tourSidebarPresetsDesc:
      "Start quickly with Apartment (2 floors), House (2 floors), or Building Plate (4 floors). You can edit them later on the 2D plan.",
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
      "Move, measure, and —on Pro+— developer mode for quick 3D tweaks. Always validate dimensions in the 2D inspector.",
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
      "Start in Configure or pick a preset layout, design in 2D, mark rooms with $ to budget, and validate in 3D before exporting.",
    tourProgressText: "{{current}} of {{total}}",
    tourKeyboardHint: "Use ← → to navigate · Esc to close",
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
    blueprintExportBtn: "2D blueprint",
    blueprintExportEmpty: "Add rooms before exporting the blueprint.",
    blueprintExportSuccess: "Blueprint PDF downloaded.",
    blueprintExportFailed: "Could not generate the blueprint.",
    floor: "Floor",
    inspectorEyebrow: "Inspector",
    inspectorTitle: "Properties",
    inspectorRecintoTitle: "Selected room",
    recintoColor2dLabel: "2D plan color",
    recintoColor2dDefault: "By type",
    recintoColor2dHint: "Affects the 2D view only. The 3D model keeps the structural material.",
    recintoMaterialLabel: "Structural material",
    nameLabel: "Name",
    heightM: "Height (m)",
    projectWallHeightLabel: "Height (m)",
    projectWallHeightHint:
      "Affects the 3D view, budget, and all rooms. Range {min}–{max} m.",
    upperFloorSupportHint:
      "Upper floor: rest on the floor below. Cantilevers within material limits are reinforced with beams (Structure layer).",
    upperFloorSupportHintEmpty:
      "This floor has no rooms below. Clone the previous floor or go down a level before adding spaces.",
    upperFloorSupportRequired:
      "Cannot add rooms here: the floor below is empty.",
    upperFloorPlacementFailed:
      "No structurally supported space for this room on the current floor.",
    roomNamePlaceholder: "e.g. Bathroom 1",
    resizeLockedHint:
      "Layout locked in 2D and 3D. Use the lock in the top toolbar to move or resize rooms.",
    resizeUnlockedHint:
      "Rooms are editable. Lock from the toolbar to prevent accidental moves in 2D and 3D.",
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
    toolNavigate: "Navigate",
    toolScale: "Scale",
    toolDeveloperMode: "Developer mode",
    developerModeDisclaimer:
      "Developer mode (Pro+): 3D scaling does not represent real construction dimensions and does not replace the 2D inspector. Confirm dimensions on the floor plan before budgeting or exporting.",
    inspector2dPrecisionHint:
      "Use the 2D inspector for precise dimensions. In 3D (Pro+), developer mode allows quick visual tweaks, not official measurements.",
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
    shortcutHelp: "Show keyboard shortcuts",
    shortcutTerms: "Open terms of service",
    railTerms: "Terms",
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
    materialHybridHint: "Wood + steel mix · Flexible assembly",
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
    savingProject: "Saving project…",
    saveLayoutError: "Could not save the project. Please try again.",
    defaultProjectName: "SIEC Project",
    layoutSavedLocalOnly: "Saved locally. Sign in to sync to the cloud.",
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
    hybridFrame: "Hybrid wood + steel frame",
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

    manualStep1Title: "Configure site and material",
    manualStep1Desc:
      "Set terrain dimensions, default material, and optionally a preset layout.",
    manualStep2Title: "Layouts and rooms",
    manualStep2Desc:
      "Use preset layouts or add rooms manually. Toggle $ for budget inclusion.",
    manualStep3Title: "2D editor",
    manualStep3Desc:
      "Drag, resize, and set per-room material in the inspector. See the color legend.",
    manualStep4Title: "3D view",
    manualStep4Desc:
      "Toggle layers, export plan/elevation views, inspector in fullscreen (Pro+ scale).",
    manualStep5Title: "Budget",
    manualStep5Desc:
      "Generate breakdown with contingency and VAT. Supports mixed materials per room.",
    manualStep6Title: "Export proposal",
    manualStep6Desc:
      "Download premium PDF with composite 3D view, compliance notes, and terms.",
    manualEyebrow: "Workspace guide",
    manualTitle: "User manual",
    manualSubtitle: "Workflow from site setup to PDF proposal.",
    manualShortcutsTitle: "Keyboard shortcuts",
    manualShortcutDelete: "Delete room",
    manualShortcutUndo: "Undo action",
    manualShortcutRedo: "Redo action",
    manualShortcutZoom: "Zoom 2D / 3D",
    manualShortcutPan: "Pan 2D view",
    manualShortcutRotate: "Rotate 3D camera",
    manualKeyRightClick: "Right click",
    manualKeyLeftClick: "Left click",
    manualKeyDrag: "Drag",
    manualStepLabel: "Step {n}",
    manualClose: "Close manual",

    // Materials Panel
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
