# Contexto de Proyecto: Sistema Inteligente de Estimación de Costos (SIEC)

## 1. Visión General y Propuesta de Valor (Pivote B2C)
SIEC es una plataforma web orientada a la estimación de costos de construcción residencial y visualización paramétrica en 3D. 
**El Problema:** La planificación de una ampliación o mejora residencial es un proceso intimidante para el usuario no experto. 
**El Contexto:** Afecta directamente a propietarios de viviendas que desean construir por sí mismos o contratar a un particular ("a trato").
**El Impacto:** La ignorancia técnica provoca "parálisis por análisis" o vulnerabilidad a estafas por asimetría de información. Existen más de 1.2 millones de viviendas en déficit cualitativo en Chile que requieren ampliación.
**La Solución:** Un sistema interactivo que permite diseñar el espacio deseado en un lienzo 2D/3D (gamificado por tokens) y devuelve instantáneamente un cálculo realista en base a retail directo sin sumar leyes de constructoras corporativas.

## 2. Stack Tecnológico Decidido
* **Frontend:** Vue 3 (Composition API) + Vite + Pinia.
* **Motor 3D:** Three.js (WebGL nativo) integrado como componente Vue.
* **Backend:** FastAPI (Python 3.11) + SQLAlchemy ORM (Microservicios).
* **Scraper:** Servicio on Playwright + APScheduler.
* **Base de Datos:** PostgreSQL 15 (Dockerizado).
* **Orquestación:** Docker Compose v3.8.
* **Persistencia Local:** LocalStorage.

## 3. Lógicas de Negocio Críticas

### A. Sistema de Validación (Tokens)
* Regla estricta base de 1 token cada 10 m². Habitaciones cuestan valor fijo de token; previene superposición de espacios no métricos.

### B. Matriz de Rendimientos y Enfoque Real (PDF Ferrocemento)
* Todo el concepto inicial de cálculo se alimentará de una sola fuente validada de alto detalle: un **Documento PDF centrado en material de Ferrocemento**. Este nos ayuda a cerrar la métrica pura como MVP. De aquí sacaremos toda medición precisa sin usar estimadores ajenos al ecosistema como RSMeans. 

### C. Estrategia de Precios (Scraper)
* Scrapting periódico automático a las 3:00 AM desde plataformas B2C puras (Sodimac, Easy, Construmart). Descartando precios de desviaciones erráticas (>200% o <50%).

## 4. Estado de Desarrollo
* **Sprint 1 (✅ Completo):** Validación 3D básica, validación de modelos SQL, frontend base construido, orquestación inicial levantada.
* **Sprint 2 (✅ Completo):** Evaluación estelar en Demo frente a profesores reconociendo el gran impacto del problema real (B2C Pivot). Lograda carga funcional del Scraper Retail contra DB y validada SPA unificada. 
* *Nota: Debido a la redirección de proyecto B2C, consideramos todas las HUs previas (01 a 11) como Obsoletas/Terminadas.*
* **Sprint 3 (En Curso):** Concentración sobre Capas 3D educativas, modelado a contrato B2C local y uso estricto de matemática de PDF de caso Ferrocemento. 

## 5. Historias de Usuario Vigentes (Pivote y Sprint 3)

### Épica 1: Motor de Simulación y Parametrización
**HU12 - Evolución de Motor 3D mediante Capas Constructivas**
Como usuario, necesito ver mi modelo 3D desarrollarse etapa por etapa (capas estructurales, aislamiento, interiores) para comprender educativamente cómo será construida mi ampliación y qué áreas requieren particular cuidado en la instalación.

**HU13 - Alertas de Factibilidad Logística Constructiva en Interfaz**
Como propietario que planifica una construcción, necesito que la plataforma me alerte automáticamente si selecciono materiales pesados (ej. paneles de Ferrocemento de >100kg) para evitar errores críticos en caso de no contar con acceso para maquinaria en mi vivienda.

### Épica 2: Motor de Estimación y Costos
**HU14 - Módulo Presupuestario "A Trato"**
Como usuario autoconstructor, quiero que la interfaz me calcule la estimación de mano de obra modalidad "por obra vendida" en base al costo regional de un maestro particular, eliminando estrictamente recargos irreales para este rubro (29% AFP/Salud).

**HU15 - Matriz de Rendimiento Mínima Viable (Fuente PDF)**
Como motor de cálculo, necesito utilizar los coeficientes absolutos obtenidos desde el archivo PDF validado sobre el caso exclusivo de Ferrocemento para poblar la capa inicial obligatoria del MVP y garantizar matemática fidedigna que validará la lógica escalable del sistema.

### Épica 3: Integración de Datos de Mercado
**HU16 - Expansión de Catálogo Web Scraper para Alternativas Constructivas**
Como usuario que cotiza, deseo que el sistema también rastree opciones ligeras complementarias (ej. Metalcom/Madera) para contar de inmediato con repuestas a la advertencia del Ferrocemento si las condiciones logísticas me abruman.

### Épica 5: Innovación (AI)
**HU17 - Spike Técnico de Visión Computacional**
Como equipo de desarrollo general, necesitamos indagar y documentar qué modelos open-source pueden analizar la viabilidad del terreno por medio de fotos del patio o entorno que el usuario provea, pensando en escalabilidades de Sprints futuros.
