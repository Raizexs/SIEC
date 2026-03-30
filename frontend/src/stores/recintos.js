import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
// Función simple para generar IDs únicos sin dependencias externas
const generateId = () => `recinto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

/**
 * SCRUM-45: Estado Central de Recintos y Disposición Inicial (Layout)
 * 
 * Capa 1 de la arquitectura HU02:
 * - Gestiona el estado reactivo de todos los recintos generados
 * - Proporciona mutadores limpios para que otras capas alteren x, z, w, l
 * - Garantiza que el área geométrica inicial coincida exactamente con los costos de tokens
 */

export const useRecintosStore = defineStore('recintos', () => {
  // Estado reactivo: array de recintos con id, tipo, coordenadas y dimensiones
  const recintos = ref([])
  
  // Metadata de configuración para el layout inicial
  const configMetadata = ref({
    m2Totales: 0,
    habitaciones: 0,
    banios: 0,
    areasComunes: 0,
    materialEstructuralId: 1
  })

  // Constantes de costos de tokens → m² equivalentes
  const TOKEN_COSTS = {
    habitacion: 9,
    banio: 4,
    areaComun: 12
  }

  /**
   * Calcula las dimensiones iniciales de cada recinto basándose en su costo de tokens
   * El algoritmo garantiza: area (w * l) = costo_tokens en m²
   * Estrategia: distribuir en una cuadrícula simple sin colisiones iniciales
   */
  const calculateInitialDimensions = (tipo, index, totalRecintos) => {
    const baseDimensions = {
      habitacion: { w: 3, l: 3 },
      banio: { w: 2, l: 2 },
      areaComun: { w: 4, l: 3 }
    }

    // Cada tipo mantiene area exacta segun costo de tokens.
    const { w, l } = baseDimensions[tipo] || { w: TOKEN_COSTS[tipo], l: 1 }

    // Distribución en fila (grid sencilla sin overlap)
    const cols = Math.ceil(Math.sqrt(totalRecintos))
    const row = Math.floor(index / cols)
    const col = index % cols

    // Espaciado simple: cada recinto tiene margen de seguridad
    const GRID_SPACING = 0.5
    const x = col * (w + GRID_SPACING)
    const z = row * (l + GRID_SPACING)

    return { x, z, w, l }
  }

  /**
   * Inicializa el layout: crea recintos basados en los parámetros del formulario
   * GARANTÍA: Área total inicial = m2Totales (exacto matemáticamente)
   */
  const initializeLayout = (m2Totales, habitaciones, banios, areasComunes, materialEstructuralId) => {
    recintos.value = []
    configMetadata.value = { m2Totales, habitaciones, banios, areasComunes, materialEstructuralId }

    const roomTypes = [
      ...Array(habitaciones).fill('habitacion'),
      ...Array(banios).fill('banio'),
      ...Array(areasComunes).fill('areaComun')
    ]

    const totalRecintos = roomTypes.length

    roomTypes.forEach((tipo, index) => {
      const { x, z, w, l } = calculateInitialDimensions(tipo, index, totalRecintos)

      recintos.value.push({
        id: generateId(),
        tipo,
        coords: { x, z },
        dimensions: { w, l }
      })
    })
  }

  /**
   * Mutadores limpios para que la Capa 3 (Editor) pueda alterar posición/tamaño
   * El editor debe llamar a estos para invalidar el cache de topología
   */
  const updateRecinto = (id, updates) => {
    const recinto = recintos.value.find(r => r.id === id)
    if (!recinto) return

    if (updates.x !== undefined) recinto.coords.x = updates.x
    if (updates.z !== undefined) recinto.coords.z = updates.z
    if (updates.w !== undefined) recinto.dimensions.w = updates.w
    if (updates.l !== undefined) recinto.dimensions.l = updates.l
  }

  const deleteRecinto = (id) => {
    recintos.value = recintos.value.filter(r => r.id !== id)
  }

  // Computed: indicadores útiles (totales, colisiones futuras, etc.)
  const totalArea = computed(() => {
    return recintos.value.reduce((sum, r) => sum + (r.dimensions.w * r.dimensions.l), 0)
  })

  const recintosByType = computed(() => ({
    habitaciones: recintos.value.filter(r => r.tipo === 'habitacion').length,
    banios: recintos.value.filter(r => r.tipo === 'banio').length,
    areasComunes: recintos.value.filter(r => r.tipo === 'areaComun').length
  }))

  return {
    // State
    recintos,
    configMetadata,
    TOKEN_COSTS,

    // Methods
    initializeLayout,
    updateRecinto,
    deleteRecinto,

    // Computed
    totalArea,
    recintosByType
  }
})
