import { ref, computed, watch } from "vue";

const DEFAULT_COSTS = {
  habitacionSimple: 5,
  habitacionDoble: 8,
  habitacionTriple: 12,
  banio: 4,
  area_comun: 12,
};

const MAX_M2 = 2500; // Límite máximo de m²

const STATUS_THRESHOLDS = {
  safe: 0.7,
  warning: 0.9,
  danger: 1.0,
};

const STATUS_COLORS = {
  safe: "#7ab87a",
  warning: "#e88a40",
  danger: "#e84040",
};

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
      console.warn(`M² excede el límite máximo de ${MAX_M2}`);
      // Opcionalmente, podrías clampear el valor:
      // m2Totales.value = MAX_M2;
    }
  });

  const tokensUsadosPorTipo = computed(() => {
    return {
      habitacionesSimples:
        habitacionesSimples.value * costs.value.habitacionSimple,
      habitacionesDobles:
        habitacionesDobles.value * costs.value.habitacionDoble,
      habitacionesTriples:
        habitacionesTriples.value * costs.value.habitacionTriple,
      banios: banios.value * costs.value.banio,
      areasComunes: areasComunes.value * costs.value.area_comun,
    };
  });

  const tokensUsados = computed(() => {
    return (
      tokensUsadosPorTipo.value.habitacionesSimples +
      tokensUsadosPorTipo.value.habitacionesDobles +
      tokensUsadosPorTipo.value.habitacionesTriples +
      tokensUsadosPorTipo.value.banios +
      tokensUsadosPorTipo.value.areasComunes
    );
  });

  // Tokens totales basados en m² (1 token cada 10 m²)
  const tokensTotales = computed(() => {
    const clampedM2 = Math.min(m2Totales.value, MAX_M2);
    return Math.floor(clampedM2 / 10);
  });

  // Tokens disponibles (libres) = total - usados
  const tokensDisponibles = computed(() => {
    return Math.max(0, tokensTotales.value - tokensUsados.value);
  });

  const porcentajeUsado = computed(() => {
    if (tokensTotales.value === 0) return 0;
    return Math.min((tokensUsados.value / tokensTotales.value) * 100, 100);
  });

  const estado = computed(() => {
    const ratio = porcentajeUsado.value / 100;
    if (ratio <= STATUS_THRESHOLDS.safe) return "safe";
    if (ratio <= STATUS_THRESHOLDS.warning) return "warning";
    return "danger";
  });

  const descripcionEstado = computed(() => {
    const status = estado.value;
    let message = "";
    let subtitle = "";

    if (status === "safe") {
      message = "✅ Espacio disponible";
      subtitle = `${tokensDisponibles.value} tokens libres`;
    } else if (status === "warning") {
      message = "⚠️ Espacio limitado";
      subtitle = `${tokensDisponibles.value} tokens libres`;
    } else {
      message = "❌ Sin espacio disponible";
      subtitle = `Exceso de ${tokensUsados.value - tokensTotales.value} tokens`;
    }

    return {
      message,
      subtitle,
      color: STATUS_COLORS[status],
    };
  });

  function validateTokensForAddition(requiredTokens) {
    if (tokensDisponibles.value >= requiredTokens) {
      return {
        canAdd: true,
        reason: `Saldo suficiente: ${tokensDisponibles.value} tokens disponibles`,
      };
    }
    return {
      canAdd: false,
      reason: `Saldo insuficiente. Necesita ${requiredTokens} tokens, disponibles: ${tokensDisponibles.value}`,
    };
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
    MAX_M2, // Exportar el límite para usar en otros componentes
  };
}
