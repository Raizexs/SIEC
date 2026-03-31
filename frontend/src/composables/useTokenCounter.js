import { ref, computed } from 'vue';

const DEFAULT_COSTS = {
  habitacion: 9,
  banio: 4,
  area_comun: 12
};

const STATUS_THRESHOLDS = {
  safe: 0.70,
  warning: 0.90,
  danger: 1.0
};

const STATUS_COLORS = {
  safe: '#7ab87a',
  warning: '#e88a40',
  danger: '#e84040'
};

export function useTokenCounter() {
  const m2Totales = ref(0);
  const habitaciones = ref(0);
  const banios = ref(0);
  const areasComunes = ref(0);
  const costs = ref({ ...DEFAULT_COSTS });

  const tokensUsadosPorTipo = computed(() => {
    return {
      habitaciones: habitaciones.value * costs.value.habitacion,
      banios: banios.value * costs.value.banio,
      areasComunes: areasComunes.value * costs.value.area_comun
    };
  });

  const tokensUsados = computed(() => {
    return tokensUsadosPorTipo.value.habitaciones + 
           tokensUsadosPorTipo.value.banios + 
           tokensUsadosPorTipo.value.areasComunes;
  });

  const tokensDisponibles = computed(() => {
    return Math.max(0, m2Totales.value - tokensUsados.value);
  });

  const porcentajeUsado = computed(() => {
    if (m2Totales.value === 0) return 0;
    return Math.min((tokensUsados.value / m2Totales.value) * 100, 100);
  });

  const estado = computed(() => {
    const ratio = porcentajeUsado.value / 100;
    if (ratio <= STATUS_THRESHOLDS.safe) return 'safe';
    if (ratio <= STATUS_THRESHOLDS.warning) return 'warning';
    return 'danger';
  });

  const descripcionEstado = computed(() => {
    const status = estado.value;
    let message = '';
    let subtitle = '';

    if (status === 'safe') {
      message = '✅ Espacio disponible';
      subtitle = `${tokensDisponibles.value} tokens libres`;
    } else if (status === 'warning') {
      message = '⚠️ Espacio limitado';
      subtitle = `${tokensDisponibles.value} tokens libres`;
    } else {
      message = '❌ Sin espacio disponible';
      subtitle = `Exceso de ${tokensUsados.value - m2Totales.value} tokens`;
    }

    return {
      message,
      subtitle,
      color: STATUS_COLORS[status]
    };
  });

  function validateTokensForAddition(requiredTokens) {
    if (tokensDisponibles.value >= requiredTokens) {
      return { canAdd: true, reason: `Saldo suficiente: ${tokensDisponibles.value} tokens disponibles` };
    }
    return { canAdd: false, reason: `Saldo insuficiente. Necesita ${requiredTokens} tokens, disponibles: ${tokensDisponibles.value}` };
  }

  return {
    m2Totales,
    habitaciones,
    banios,
    areasComunes,
    costs,
    tokensUsados,
    tokensDisponibles,
    porcentajeUsado,
    estado,
    descripcionEstado,
    tokensUsadosPorTipo,
    validateTokensForAddition
  };
}
