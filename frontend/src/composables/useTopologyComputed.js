/**
 * SCRUM-46: Composable Vue para extraer topología reactivamente
 * 
 * Proporciona un interface Vue para que otros componentes
 * (SCRUM-47, SCRUM-48) consuman la topología de muros
 */

import { computed } from 'vue'
import { useRecintosStore } from '../stores/recintos'
import {
  extractTopologyFromRecintos,
  calculateWallLengthTotal,
  filterWallsByType
} from './useTopologyExtractor'

export function useTopologyComputed() {
  const recintosStore = useRecintosStore()

  /**
   * computed: Siempre recalcula automáticamente cuando recintos cambian
   * GARANTÍA: Matemáticamente ultrarrápido (sin destruir/recrear escena OpenGL)
   */
  const walls = computed(() => {
    if (recintosStore.recintos.length === 0) return [];
    return extractTopologyFromRecintos(recintosStore.recintos);
  })

  const interiorWalls = computed(() => filterWallsByType(walls.value, 'interior'))
  const exteriorWalls = computed(() => filterWallsByType(walls.value, 'exterior'))

  const totalWallLength = computed(() => calculateWallLengthTotal(walls.value))

  const topologyStats = computed(() => ({
    totalWalls: walls.value.length,
    interiorCount: interiorWalls.value.length,
    exteriorCount: exteriorWalls.value.length,
    totalLength: totalWallLength.value.toFixed(2),
    estimatedVolume: (totalWallLength.value * 2.4 * 0.15).toFixed(3) // altura 2.4m, grosor 0.15m
  }))

  return {
    walls,
    interiorWalls,
    exteriorWalls,
    totalWallLength,
    topologyStats
  }
}
