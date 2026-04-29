# Prompt de Correcciones MVP — Sprint Final SIEC

> **Contexto para el modelo ejecutor:** Eres un ingeniero senior de frontend Vue 3 + Three.js trabajando en SIEC, una plataforma de inteligencia constructiva chilena. El proyecto usa Vue 3 (Composition API), Pinia, Three.js para el renderizado 3D, SVG para el editor 2D, y TailwindCSS. La entrega del sprint es MAÑANA. Debes ejecutar las correcciones en el orden de prioridad indicado, asegurándote de no romper funcionalidad existente. Cada cambio debe compilar correctamente antes de avanzar al siguiente.

---

## Estado Actual del Proyecto (Diagnóstico)

### Arquitectura de Componentes
```
App.vue
├── Sidebar.vue (presets, layouts guardados, dark mode, idioma)
├── TopNavBar.vue (botón "Guardar", botón "Exportar PDF", perfil)
├── ConfigurationPanel.vue (m² totales, material estructural)
├── MetricsPanel.vue (espacio disponible/usado, barra de progreso)
├── LayerSelectionPanel.vue (capas constructivas, toggle modo construcción)
├── RoomEditor2D.vue (editor SVG: drag, resize, añadir recintos con medidas)
├── Scene3D.vue (Three.js: mover, escalar, pisos, pasillo, propiedades)
│   └── PropertiesSidebar.vue (panel lateral de propiedades del recinto activo)
├── BudgetBreakdownPanel.vue (presupuesto detallado desde backend API)
├── SaveLayoutDialog.vue (modal para nombrar layout guardado)
└── LoginOverlay.vue (overlay de autenticación mock)
```

### Estado de los Stores
- **recintos.js (Pinia):** Gestiona array de recintos con coords (x,z), dimensions (w,l,h), tipo, piso, stackId. Soporta pisos 1-3, clonación por stack, pasillos.
- **useLayoutManager.js:** Guarda/carga layouts en sessionStorage. Límite de 5 layouts ya implementado.
- **useInteractiveEditor.js:** Drag/resize con collision detection y snap grid (0.1m). Enforces MINVU minimums.
- **useTopologyExtractor/Computed:** Extrae paredes desde recintos para el modelo 3D.

### Funcionalidades Existentes
- ✅ Creación de recintos con medidas (modal en RoomEditor2D) 
- ✅ Drag & drop en 2D y 3D con collision detection
- ✅ Resize en 2D (con lock toggle) y 3D (TransformControls)
- ✅ Selector de pisos (1-3) con clonación de recintos al piso actual
- ✅ Modo construcción con capas (estructura, fachada, interior, aislación, instalaciones)
- ✅ Guardar/cargar layouts con topología 3D
- ✅ Límite de 5 simulaciones guardadas (ya implementado)
- ✅ Toast de confirmación al guardar layout
- ✅ Dark mode, i18n ES/EN
- ✅ Texturas PBR en paredes y pisos (Polyhaven)
- ⚠️ Exportar PDF existe pero usa datos mock/incorrectos
- ⚠️ Pasillos se crean como rectángulos simples (sin detección automática)
- ⚠️ Tutorial (driver.js) existe pero desactualizado
- ❌ Botón "Exportar PDF" en TopNavBar no genera datos reales del presupuesto
- ❌ No hay separación clara entre "Guardar Layout" y "Generar Presupuesto"

---

## CORRECCIONES POR PRIORIDAD

---

### PRIORIDAD 1 ★★★ — Creación y Edición de Pasillos (Auto-Detección)

**Archivo principal:** `RoomEditor2D.vue`, `recintos.js`
**Archivos secundarios:** `Scene3D.vue`, `useInteractiveEditor.js`

**Requisito funcional:**
Implementar un sistema de pasillos inteligente que detecte automáticamente los espacios vacíos entre recintos dentro del "budget rectangle" (área delimitada del terreno) y permita construirlos con un solo clic.

**Especificación detallada:**

1. **Botón "Pasillos" en la toolbar del RoomEditor2D:**
   - Añadir un botón toggle junto a "Añadir Recinto" y "Redimensionar" en el header del editor 2D.
   - Ícono: `add_road`. Estilo: mismo patrón que `.add-recinto-btn` y `.lock-toggle-btn`.
   - Cuando está activo, el botón debe tener un estado visual diferenciado (borde cyan/teal, fondo teal/10).

2. **Algoritmo de detección de zonas de pasillo:**
   - Cuando el modo "Pasillos" está activo, el sistema debe calcular en tiempo real (computed) las zonas vacías dentro del `budgetRect` que se encuentran **entre** dos o más recintos.
   - **Criterio de ancho mínimo:** Solo se deben resaltar como zonas válidas de pasillo aquellas cuyo ancho mínimo en cualquier dirección sea ≥ 0.8 metros.
   - El cálculo debe considerar únicamente los recintos del piso actual (`currentFloor`).
   - **Algoritmo sugerido (escaneo por franjas):**
     ```
     1. Obtener todos los recintos del piso actual.
     2. Recopilar todos los bordes verticales (x) y horizontales (z) de los recintos + los bordes del budgetRect.
     3. Crear una grilla de "celdas" definida por estas coordenadas.
     4. Marcar cada celda como "ocupada" si intersecta con un recinto.
     5. Las celdas vacías adyacentes que forman una región contigua son candidatas a pasillo.
     6. Filtrar regiones cuya dimensión mínima (ancho o alto) sea < 0.8m.
     7. Las regiones resultantes son las zonas de pasillo válidas.
     ```
   - Para cada zona válida, generar un rectángulo SVG con:
     - `fill="rgba(100,200,220,0.15)"` (teal translúcido)
     - `stroke="rgba(100,200,220,0.5)"` con `stroke-dasharray="4 3"`
     - Un label centrado: "Pasillo" con el área en m²
     - `cursor: pointer` y un efecto hover que aumente el fill a `0.3`.

3. **Creación del pasillo al hacer clic:**
   - Al hacer clic en una zona de pasillo resaltada, se debe crear un recinto de tipo `"pasillo"` con las coordenadas y dimensiones exactas de esa zona.
   - El pasillo creado debe comportarse igual que cualquier otro recinto: arrastrable, redimensionable, eliminable, cotizable (togglable con `$`).
   - Tras la creación, la zona resaltada debe desaparecer (ya no es un espacio vacío).

4. **Integración con el modelo 3D (Scene3D.vue):**
   - Los pasillos ya tienen color asignado (`#64748b` en `getRoomColor`) y textura de piso (`laminate_floor_02`).
   - Verificar que los pasillos creados por este método se rendericen correctamente en 3D con paredes.

5. **Integración con la matriz 2D de cotización (BudgetBreakdownPanel):**
   - Los pasillos deben poder ser seleccionados para presupuesto con el toggle `$` al igual que los recintos.
   - El `BudgetBreakdownPanel` ya funciona por m² seleccionados, por lo que esto debería funcionar sin cambios adicionales.

**Notas de implementación:**
- El `addRecinto()` del store ya soporta tipo `"pasillo"` y acepta dimensiones custom.
- El `addPasillo()` actual coloca un pasillo genérico al final — **no usar este método** para la auto-detección; en su lugar, llamar a `addRecinto('pasillo', 'Pasillo', w, l, 2.4)` con las coordenadas calculadas, y luego hacer `updateRecinto(id, { coords: { x, z } })` para posicionarlo exactamente.

---

### PRIORIDAD 2 ★★★ — Soporte Completo para Múltiples Pisos

**Archivo principal:** `recintos.js`, `Scene3D.vue`, `RoomEditor2D.vue`

**Estado actual:**
- El selector de pisos (1-3) existe en Scene3D.vue.
- `cloneToCurrentFloor()` en recintos.js permite clonar un recinto del piso inferior al actual.
- La visibilidad ya filtra por `piso <= currentFloor`.
- **Problema:** Solo se puede clonar un recinto a la vez. No hay forma de crear un piso completo, ni de tener layouts independientes por piso.

**Correcciones necesarias:**

1. **Botón "Clonar Piso Completo" en Scene3D.vue:**
   - Junto al selector de pisos (+/-), añadir un botón "Clonar Piso" que duplique **todos** los recintos del piso actual al piso siguiente.
   - Debe respetar el límite de 3 pisos.
   - Usar un loop que llame a `cloneToCurrentFloor()` para cada recinto del piso actual (previo `setFloor(currentFloor + 1)`).
   - Agregar un `confirm()` antes de ejecutar si ya hay recintos en el piso destino.

2. **Creación de recintos independientes por piso:**
   - El `addRecinto()` ya usa `currentFloor.value` para asignar el piso. Verificar que funcione correctamente cuando el usuario navega a piso 2 o 3 y crea recintos nuevos.
   - El editor 2D (`RoomEditor2D.vue`) debe filtrar los recintos mostrados por `currentFloor` (actualmente muestra todos).

3. **Indicador visual de piso en el editor 2D:**
   - Añadir una badge en el header del RoomEditor2D que muestre el piso actual.
   - Los recintos de pisos inferiores deben verse como sombras/ghost (opacity 0.15, sin interacción) para dar contexto.

4. **Verificación 3D:**
   - `syncRooms` y `syncWalls` ya filtran por `piso <= currentFloor`. Verificar que las paredes se generen correctamente cuando hay recintos en múltiples pisos con posiciones/tamaños diferentes.
   - Las paredes de pisos superiores deben apilarse a `WALL_HEIGHT * (piso - 1)` de offset Y.

---

### PRIORIDAD 3 ★★ — Exportación de Presupuesto Funcional (PDF)

**Archivo principal:** `frontend/src/utils/pdfGenerator.js`
**Archivos secundarios:** `App.vue`, `TopNavBar.vue`

**Estado actual:**
- `pdfGenerator.js` existe y genera un PDF con jsPDF + jsPDF-AutoTable.
- Captura el canvas 3D y crea una tabla de recintos.
- **Problema:** La sección "Resumen Financiero" usa `costs.value.structural`, `costs.value.rooms`, etc., que vienen de `useTokenCounter` — un composable de tokens/m², **no de precios reales de mercado**.
- El presupuesto real viene de `BudgetBreakdownPanel.vue` que llama al backend (`/api/simulacion/...`).

**Correcciones necesarias:**

1. **Integrar datos reales del BudgetBreakdownPanel en el PDF:**
   - Modificar `generateCommercialPDF` para que acepte un parámetro adicional `budgetData` (el desglose real del backend).
   - Si `budgetData` está disponible (usuario generó presupuesto), incluir la tabla por categorías con insumo, cantidad, precio unitario, subtotal.
   - Si no está disponible, mostrar la estimación por m² × costo/m² como fallback con una nota "Estimación preliminar — genere el presupuesto detallado para datos precisos".

2. **Mejorar la estructura del PDF:**
   - **Página 1:** Cabecera SIEC, datos del proyecto (nombre, fecha, m², material, pisos), captura 3D.
   - **Página 2:** Tabla de recintos (ya existente) + resumen de área por tipo.
   - **Página 3:** Presupuesto detallado por categoría (si `budgetData` existe) con subtotales y total final.
   - **Pie de página en cada página:** "SIEC — Inteligencia Constructiva | Cotización generada el [fecha]".

3. **Flujo de exportación:**
   - En `App.vue`, modificar `handleExportPDF` para que primero verifique si hay datos de presupuesto disponibles.
   - Si el usuario no ha generado presupuesto, mostrar un `confirm()` preguntando si desea exportar solo el diseño o generar presupuesto primero.
   - Pasar `budgetData` al generador si existe.

4. **Garantizar que `preserveDrawingBuffer: true` esté en el renderer:**
   - En `Scene3D.vue` línea 174, verificar que el `WebGLRenderer` tenga `preserveDrawingBuffer: true` para que `canvasElement.toDataURL()` funcione correctamente.
   - Actualmente NO lo tiene — esto causa que la captura del canvas 3D sea una imagen negra.

---

### PRIORIDAD 4 ★★ — Rediseño de UI/UX del Flujo de Presupuesto

**Archivos:** `TopNavBar.vue`, `App.vue`, `BudgetBreakdownPanel.vue`, `MetricsPanel.vue`

**Correcciones necesarias:**

1. **Separar "Guardar Layout" de "Generar Presupuesto":**
   - **TopNavBar.vue:** El botón "Guardar" (save icon) se queda para guardar layouts — esto ya funciona correctamente.
   - **TopNavBar.vue:** Eliminar el botón "Exportar PDF" del nav bar superior. Este botón aparece demasiado temprano en el flujo; el usuario aún no ha generado un presupuesto.
   - **BudgetBreakdownPanel.vue:** Añadir el botón "Exportar PDF" DENTRO del panel de presupuesto, solo visible después de que el usuario haya generado el presupuesto. Esto crea un flujo lógico: Diseñar → Seleccionar recintos ($) → Generar Presupuesto → Exportar PDF.

2. **Renombrar el botón de presupuesto:**
   - En `BudgetBreakdownPanel.vue` línea 118, el botón dice `generateBudget` (traducido). Cambiarlo a: **"Calcular Presupuesto Real"** (ES) / **"Calculate Real Budget"** (EN) para distinguirlo de la estimación de tokens.
   - Agregar un subtítulo bajo el botón: "Consulta los precios de mercado actualizados vía scraper".

3. **Rediseñar el MetricsPanel (mostrador de precios):**
   - **Problema actual:** El MetricsPanel muestra m² disponibles/usados y una barra de progreso. No muestra precios de manera intuitiva.
   - **Solución:** Debajo de la barra de espacio, añadir una card compacta que muestre:
     - Costo estimado por m² según el material seleccionado (los valores ya están en MATERIAL_COST_PER_M2 dentro de MetricsPanel.vue).
     - Estimación total = m² usados × costo/m².
     - Una nota "Estimación preliminar" con un link/botón que scrollee hasta el BudgetBreakdownPanel.
   - Eliminar la sección `materials` (líneas 102-136) que muestra datos hardcodeados de "Hierro y Refuerzos", "Cemento Premezclado", etc. — estos son datos falsos que confunden al usuario.

4. **Feedback visual al guardar layout:**
   - Ya existe un toast en `App.vue` (líneas 428-433) con transición y estilo esmeralda.
   - Verificar que funciona correctamente y es visible sobre todos los demás elementos (z-index 50 ya está).
   - Duración actual: 3 segundos — es correcta.

5. **Reubicar el BudgetBreakdownPanel:**
   - Actualmente aparece con `v-if="recintosStore.selectedM2 > 0"` (cuando hay recintos con $ activado).
   - Mantener esta condición, pero añadir un indicador en el RoomEditor2D o Scene3D que le diga al usuario: "Selecciona recintos con $ para habilitar el presupuesto" cuando no hay ninguno seleccionado.

---

### PRIORIDAD 5 ★ — Visualización de Materiales por Habitación (Texturas)

**Archivo principal:** `Scene3D.vue`

**Estado actual:**
- Las paredes exteriores ya tienen texturas PBR según el material estructural seleccionado (madera, acero, mampostería, hormigón).
- Los pisos ya tienen texturas diferentes por tipo de recinto (madera para habitaciones, tiles para baños, concreto para áreas comunes, laminado para pasillos).
- Las paredes interiores son azules planas (`#60a5fa`).

**Mejora deseada:**
- Las paredes interiores podrían tener una textura de yeso/volcanita para mayor realismo.
- **Nota del usuario:** Necesita buscar los archivos de textura para proveerlos.

**Acción:**
- Preparar la infraestructura para texturas por habitación:
  - En `syncWalls`, si `wall.tipo === "interior"`, aplicar una textura genérica de pared interior (ej. `painted_plaster` de Polyhaven).
  - Mantener la coloración por tipo (azul habitación, teal baño, etc.) como tinte del `color` del material, combinado con la textura.
- El usuario proveerá texturas custom más adelante. El sistema debe soportar:
  - Texturas `.jpg` / `.png` para diffuse, normal, roughness.
  - Estas se cargarían con `TextureLoader.load()` igual que las actuales.

---

### PRIORIDAD 6 ★ — Actualización del Tutorial Interactivo

**Archivo principal:** `App.vue` (función `startTutorial`, líneas 302-341)

**Estado actual:**
- Usa `driver.js` con 4 pasos: bienvenida, ConfigurationPanel, MetricsPanel, "¡Todo listo!".
- **Problema:** Los pasos hacen referencia a flujos que ya no existen (como "Haz clic en 'Generar Modelo'") y no cubren el nuevo flujo de creación de recintos con medidas.

**Correcciones:**
- **HACER AL FINAL**, después de todas las demás correcciones, para que refleje el estado final del UI.
- Actualizar los pasos del tutorial para cubrir:
  1. Bienvenida a SIEC.
  2. ConfigurationPanel: definir m² y material.
  3. RoomEditor2D: "Aquí puedes crear recintos con medidas exactas usando el botón 'Añadir Recinto'."
  4. Editor 2D interacción: "Arrastra los recintos para reorganizar. Usa el handle de la esquina inferior derecha para redimensionar."
  5. Pasillos (si se implementó): "Activa el modo 'Pasillos' para detectar automáticamente las zonas de circulación."
  6. Scene3D: "Tu diseño se renderiza en 3D en tiempo real. Usa 'Mover' y 'Escalar' para ajustar."
  7. Presupuesto: "Selecciona recintos con $ en el editor 2D y genera el presupuesto detallado."
  8. Exportar: "Una vez generado el presupuesto, podrás exportarlo como PDF profesional."
- Añadir un checkbox "No mostrar de nuevo" que guarde la preferencia en `localStorage` bajo la key `siec_skip_tutorial`.
- En `onMounted` de `App.vue`, verificar si es la primera visita (no existe la key o es `false`) y lanzar el tutorial automáticamente.

---

## Notas Generales de Implementación

1. **No romper funcionalidad existente.** Cada corrección debe compilar y funcionar antes de pasar a la siguiente.
2. **Mantener la estética premium existente.** El proyecto usa un design system consistente con:
   - Colores: primary (indigo), emerald para éxito, red para peligro, slate para neutros.
   - Tipografía: `font-headline` (extrabold), `font-body`.
   - Componentes: bordes redondeados (`rounded-xl/2xl`), glassmorphism (`backdrop-blur-md/xl`), gradientes sutiles, micro-animaciones.
3. **i18n:** Todas las cadenas nuevas visibles al usuario deben añadirse en `useI18n.js` con traducciones ES/EN.
4. **Los archivos relevantes están en:**
   - Componentes: `frontend/src/components/`
   - Composables: `frontend/src/composables/`
   - Stores: `frontend/src/stores/`
   - Utils: `frontend/src/utils/`
5. **El backend FastAPI corre en `localhost:8000` en desarrollo.** Las rutas de presupuesto son:
   - `POST /api/simulacion/parametros` → crea simulación
   - `POST /api/simulacion/{id}/calcular-insumos` → calcula desglose
