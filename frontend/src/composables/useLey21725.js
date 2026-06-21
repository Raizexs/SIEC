/**
 * useLey21725.js
 * Composable para el Validador de Regularización — Ley 21.725 (Ley del Mono)
 * SCRUM-97
 *
 * Responsabilidades:
 *   - Mantener el estado reactivo del resultado de la validación.
 *   - Exponer `validar()` para llamar al endpoint backend.
 *   - Controlar la visibilidad del modal de alerta bloqueante.
 *   - Proveer `valorUF` con un valor predeterminado y actualizarlo opcionalmente.
 */

import { ref, computed } from "vue";

// ──────────────────────────────────────────────────────────────────────────────
// Constantes normativas (espejo del backend — para validación offline rápida)
// ──────────────────────────────────────────────────────────────────────────────
export const AREA_UMBRAL_MIN_M2 = 90;
export const AREA_UMBRAL_MAX_M2 = 140;
export const TASACION_LIMITE_UF = 520;

// Valor UF por defecto (se actualiza si el usuario lo ingresa o hay API externa)
const DEFAULT_VALOR_UF_CLP = 38500; // Valor referencial — actualizar según CMF

// ──────────────────────────────────────────────────────────────────────────────
// Estado singleton (compartido entre todos los componentes que usen el composable)
// ──────────────────────────────────────────────────────────────────────────────
const showModal = ref(false);
const isChecking = ref(false);
const resultado = ref(null); // ValidacionLeyMonoResponse | null
const valorUF = ref(DEFAULT_VALOR_UF_CLP);
const lastError = ref(null);

// ──────────────────────────────────────────────────────────────────────────────
// Computed helpers
// ──────────────────────────────────────────────────────────────────────────────

/** true si la validación detectó una infracción bloqueante */
const hayInfraccion = computed(
  () => resultado.value?.bloqueante === true
);

/** true si el área excede el umbral máximo (validación local inmediata) */
function excedeLimiteLocal(areaMet) {
  return areaMet > AREA_UMBRAL_MAX_M2;
}

// ──────────────────────────────────────────────────────────────────────────────
// API
// ──────────────────────────────────────────────────────────────────────────────
import { API_BASE_URL } from '../config/apiConfig.js';

const API_BASE = API_BASE_URL;

/**
 * Llama al endpoint /api/validar-ley-mono y actualiza el estado reactivo.
 *
 * @param {number} areaMet         - Área geométrica total en m²
 * @param {number|null} costoClp   - Costo total estimado en CLP (opcional)
 * @returns {Promise<object>}       - Respuesta de la API
 */
async function validar(areaMet, costoClp = null) {
  isChecking.value = true;
  lastError.value = null;

  try {
    const body = {
      area_m2: areaMet,
      valor_uf_actual: valorUF.value,
      ...(costoClp != null ? { costo_total_clp: costoClp } : {}),
    };

    const response = await fetch(`${API_BASE}/api/validar-ley-mono`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    resultado.value = data;

    if (data.bloqueante) {
      showModal.value = true;
    }

    return data;
  } catch (err) {
    lastError.value = err.message || "Error al conectar con el servidor";
    // Fallback: validación local básica si el backend no responde
    if (excedeLimiteLocal(areaMet)) {
      const fallback = {
        cumple_ley: false,
        bloqueante: true,
        codigo_infraccion: "LEY21725-AREA-EXCEDE",
        mensaje: "Infracción Ley 21.725",
        detalle: `El área (${areaMet} m²) supera el umbral máximo de ${AREA_UMBRAL_MAX_M2} m².`,
        area_m2: areaMet,
        tasacion_uf: null,
        umbral_min_m2: AREA_UMBRAL_MIN_M2,
        umbral_max_m2: AREA_UMBRAL_MAX_M2,
        limite_tasacion_uf: TASACION_LIMITE_UF,
      };
      resultado.value = fallback;
      showModal.value = true;
      return fallback;
    }
    throw err;
  } finally {
    isChecking.value = false;
  }
}

/** Cierra el modal (no desbloquea la acción — solo cierra la UI) */
function cerrarModal() {
  showModal.value = false;
}

/** Limpia el estado de validación */
function resetear() {
  resultado.value = null;
  showModal.value = false;
  lastError.value = null;
}

// ──────────────────────────────────────────────────────────────────────────────
export function useLey21725() {
  return {
    // Estado
    showModal,
    isChecking,
    resultado,
    valorUF,
    lastError,
    // Computed
    hayInfraccion,
    // Métodos
    validar,
    cerrarModal,
    resetear,
    excedeLimiteLocal,
    // Constantes expuestas
    AREA_UMBRAL_MIN_M2,
    AREA_UMBRAL_MAX_M2,
    TASACION_LIMITE_UF,
  };
}