import logger from '../utils/logger.js';
import { ref, computed, watch } from "vue";
import {
  calculateTokensUsedByType,
  calculateTotalTokensUsed,
  calculateTotalTokens,
  calculateAvailableTokens,
  calculateUsagePercentage,
  getStatus,
  generateStatusDescription,
  validateTokensForAddition as validateTokensForAdditionMath,
  DEFAULT_COSTS,
  MAX_M2,
} from "../utils/tokenMath";

export function useTokenCounter() {
  const m2Totales = ref(120);
  const habitacionesSimples = ref(1);
  const habitacionesDobles = ref(0);
  const habitacionesTriples = ref(0);
  const banios = ref(1);
  const areasComunes = ref(0);
  const costs = ref({ ...DEFAULT_COSTS });

  // Watch para validar límite de m²
  watch(m2Totales, (newValue) => {
    if (newValue > MAX_M2) {
      logger.warn(`M² excede el límite máximo de ${MAX_M2}`);
    }
  });

  const tokensUsadosPorTipo = computed(() => {
    const counts = {
      habitacionesSimples: habitacionesSimples.value,
      habitacionesDobles: habitacionesDobles.value,
      habitacionesTriples: habitacionesTriples.value,
      banios: banios.value,
      areasComunes: areasComunes.value,
    };
    return calculateTokensUsedByType(counts, costs.value);
  });

  const tokensUsados = computed(() => {
    return calculateTotalTokensUsed(tokensUsadosPorTipo.value);
  });

  // Tokens totales basados en m² (1 token cada 10 m²)
  const tokensTotales = computed(() => {
    return calculateTotalTokens(m2Totales.value);
  });

  // Tokens disponibles (libres) = total - usados
  const tokensDisponibles = computed(() => {
    return calculateAvailableTokens(tokensTotales.value, tokensUsados.value);
  });

  const porcentajeUsado = computed(() => {
    return calculateUsagePercentage(tokensUsados.value, tokensTotales.value);
  });

  const estado = computed(() => {
    return getStatus(tokensUsados.value, tokensTotales.value);
  });

  const descripcionEstado = computed(() => {
    return generateStatusDescription(
      estado.value,
      tokensDisponibles.value,
      tokensUsados.value,
      tokensTotales.value,
    );
  });

  function validateTokensForAddition(requiredTokens) {
    return validateTokensForAdditionMath(
      requiredTokens,
      tokensDisponibles.value,
    );
  }

  return {
    m2Totales,
    habitacionesSimples,
    habitacionesDobles,
    habitacionesTriples,
    banios,
    areasComunes,
    costs,
    tokensUsados,
    tokensTotales,
    tokensDisponibles,
    porcentajeUsado,
    estado,
    descripcionEstado,
    tokensUsadosPorTipo,
    validateTokensForAddition,
    MAX_M2,
  };
}
