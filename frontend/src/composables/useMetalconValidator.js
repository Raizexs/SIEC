/**
 * useMetalconValidator.js
 * Composable — Validador de Cruce: Insumo (Material) vs Altura (Pisos)
 * SCRUM-98 · HU18: Hard Constraints Regulatorios (MINVU)
 *
 * Responsabilidades:
 *   - Detectar si el material estructural es Metalcon (ID 2 = Acero Galvanizado).
 *   - Contar la cantidad de pisos activos en el modelo actual.
 *   - Lanzar excepción severa (estado bloqueante) si Metalcon > 3 pisos.
 *   - Bloquear la tramitación de renders constructivos cuando se supera el tope.
 *   - Exponer estado reactivo para que el modal y la UI reaccionen.
 *
 * Restricción normativa (MINVU):
 *   Un sistema estructural Metalcon (acero liviano galvanizado) sin proyecto
 *   de ingeniería visado no puede superar los 3 pisos de altura, ya que los
 *   esfuerzos gravitatorios y sísmicos exceden la capacidad de las secciones
 *   livianas de manera que el sistema se vuelve gravitatoriamente peligroso.
 */

import { ref, computed } from "vue";

// ─────────────────────────────────────────────────────────────────────────────
// Constantes regulatorias MINVU
// ─────────────────────────────────────────────────────────────────────────────

/** ID del material Metalcon/Acero Galvanizado en el sistema SIEC */
export const METALCON_MATERIAL_ID = 2;

/** Máximo de pisos permitidos para Metalcon sin ingeniero (MINVU) */
export const METALCON_MAX_PISOS = 3;

/** Código de excepción severa emitido por este validador */
export const CODIGO_EXCEPCION_METALCON = "MINVU-METALCON-PISOS-EXCEDE";

// ─────────────────────────────────────────────────────────────────────────────
// Estado singleton reactivo
// ─────────────────────────────────────────────────────────────────────────────
const showModal = ref(false);
const excepcionActiva = ref(false);
const detalleExcepcion = ref(null);
const pisosDetectados = ref(0);

// ─────────────────────────────────────────────────────────────────────────────
// Computed helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * true cuando el sistema está en estado de excepción severa bloqueante.
 * Mientras sea true, ningún render constructivo puede tramitarse.
 */
const esBloqueo = computed(() => excepcionActiva.value === true);

/**
 * Descripción legible del tope normativo para mostrar en UI.
 */
const descripcionNormativa = computed(
  () =>
    `Metalcon (Acero Galvanizado) sin proyecto de ingeniería: máximo ${METALCON_MAX_PISOS} pisos (MINVU).`
);

// ─────────────────────────────────────────────────────────────────────────────
// Función principal de validación
// ─────────────────────────────────────────────────────────────────────────────

/**
 * validarCruceInsumoAltura
 *
 * Evalúa si la combinación de material estructural y cantidad de pisos es
 * admisible según la normativa MINVU.
 *
 * @param {number} materialEstructuralId  - ID del material seleccionado
 * @param {number[]} pisosOcupados        - Array con los números de piso que
 *                                          tienen al menos un recinto activo
 *                                          (ej: [1, 2, 3, 4])
 * @returns {{ valido: boolean, excepcion: object|null }}
 *   - valido: true si la configuración es admisible
 *   - excepcion: objeto con detalles del bloqueo, o null si es válido
 */
function validarCruceInsumoAltura(materialEstructuralId, pisosOcupados) {
  const cantidadPisos = pisosOcupados.length;
  pisosDetectados.value = cantidadPisos;

  // Solo aplica la restricción al material Metalcon (ID 2)
  const esMetalcon = materialEstructuralId === METALCON_MATERIAL_ID;

  if (!esMetalcon || cantidadPisos <= METALCON_MAX_PISOS) {
    // Configuración válida: limpiar cualquier excepción previa
    excepcionActiva.value = false;
    detalleExcepcion.value = null;
    return { valido: true, excepcion: null };
  }

  // ── EXCEPCIÓN SEVERA ──────────────────────────────────────────────────────
  const excepcion = {
    codigo: CODIGO_EXCEPCION_METALCON,
    bloqueante: true,
    mensaje: "Configuración Inviable — Peligro Gravitatorio",
    detalle:
      `El modelo Metalcon (Acero Galvanizado) tiene ${cantidadPisos} pisos activos, ` +
      `superando el máximo de ${METALCON_MAX_PISOS} pisos permitidos sin proyecto ` +
      `de ingeniería visado (MINVU). Esta configuración es gravitatoriamente peligrosa ` +
      `y no puede tramitarse sin la intervención de un ingeniero estructural certificado.`,
    pisos_detectados: cantidadPisos,
    pisos_maximos: METALCON_MAX_PISOS,
    material_id: materialEstructuralId,
    material_nombre: "Metalcon — Acero Galvanizado",
    norma_referencia: "MINVU · Ordenanza General de Urbanismo y Construcciones",
    accion_requerida:
      "Reduce el modelo a máximo 3 pisos, o cambia el material estructural a uno " +
      "que admita más altura (Hormigón, Albañilería reforzada).",
  };

  excepcionActiva.value = true;
  detalleExcepcion.value = excepcion;
  showModal.value = true;

  return { valido: false, excepcion };
}

/**
 * Derivar pisos ocupados a partir del array de recintos del store.
 *
 * @param {Array} recintos - Array de objetos recinto con propiedad `piso`
 * @returns {number[]} - Números de piso únicos ordenados ascendentemente
 */
function derivarPisosOcupados(recintos) {
  const pisos = new Set(recintos.map((r) => r.piso));
  return [...pisos].sort((a, b) => a - b);
}

/**
 * Wrapper de conveniencia: recibe el store de recintos completo y el material.
 *
 * @param {number} materialEstructuralId
 * @param {Array}  recintos  - recintos.value del store
 * @returns {{ valido: boolean, excepcion: object|null }}
 */
function validarDesdeStore(materialEstructuralId, recintos) {
  const pisosOcupados = derivarPisosOcupados(recintos);
  return validarCruceInsumoAltura(materialEstructuralId, pisosOcupados);
}

// ─────────────────────────────────────────────────────────────────────────────
// Acciones de UI
// ─────────────────────────────────────────────────────────────────────────────

/** Cierra el modal pero MANTIENE el bloqueo activo */
function cerrarModal() {
  showModal.value = false;
}

/** Limpia completamente el estado de excepción (usar sólo al cambiar material o pisos) */
function resetear() {
  excepcionActiva.value = false;
  detalleExcepcion.value = null;
  showModal.value = false;
  pisosDetectados.value = 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Exportación del composable
// ─────────────────────────────────────────────────────────────────────────────
export function useMetalconValidator() {
  return {
    // Estado reactivo
    showModal,
    excepcionActiva,
    detalleExcepcion,
    pisosDetectados,

    // Computed
    esBloqueo,
    descripcionNormativa,

    // Métodos
    validarCruceInsumoAltura,
    validarDesdeStore,
    derivarPisosOcupados,
    cerrarModal,
    resetear,

    // Constantes expuestas
    METALCON_MATERIAL_ID,
    METALCON_MAX_PISOS,
    CODIGO_EXCEPCION_METALCON,
  };
}