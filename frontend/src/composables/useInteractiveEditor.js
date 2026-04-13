import { computed, ref } from 'vue'
import { useRecintosStore } from '../stores/recintos'

const GRID_STEP = 0.5
const EPS = 1e-6

function snap(value) {
  return Math.round(value / GRID_STEP) * GRID_STEP
}

function overlaps(a, b) {
  return a.x < b.x + b.w - EPS && a.x + a.w > b.x + EPS && a.z < b.z + b.l - EPS && a.z + a.l > b.z + EPS
}

export function useInteractiveEditor() {
  const store = useRecintosStore()
  const selectedRecintoId = ref(null)
  const activeMode = ref(null)
  const dragOffset = ref({ x: 0, z: 0 })

  const minAreaByTipo = computed(() => ({
    habitacion: store.TOKEN_COSTS.habitacion,
    banio: store.TOKEN_COSTS.banio,
    areaComun: store.TOKEN_COSTS.areaComun
  }))

  const selectedRecinto = computed(() => {
    return store.recintos.find((r) => r.id === selectedRecintoId.value) || null
  })

  const getTotalAreaExcept = (id) => {
    return store.recintos.reduce((sum, r) => {
      if (r.id === id) return sum
      return sum + (r.dimensions.w * r.dimensions.l)
    }, 0)
  }

  const hasCollision = (id, candidate) => {
    return store.recintos.some((r) => {
      if (r.id === id) return false
      const other = {
        x: r.coords.x,
        z: r.coords.z,
        w: r.dimensions.w,
        l: r.dimensions.l
      }
      return overlaps(candidate, other)
    })
  }

  const beginDrag = (id, pointerWorld) => {
    const room = store.recintos.find((r) => r.id === id)
    if (!room) return

    selectedRecintoId.value = id
    activeMode.value = 'drag'
    dragOffset.value = {
      x: pointerWorld.x - room.coords.x,
      z: pointerWorld.z - room.coords.z
    }
  }

  const dragTo = (pointerWorld) => {
    if (activeMode.value !== 'drag' || !selectedRecinto.value) return

    const room = selectedRecinto.value
    const nextX = snap(pointerWorld.x - dragOffset.value.x)
    const nextZ = snap(pointerWorld.z - dragOffset.value.z)

    const candidate = {
      x: nextX,
      z: nextZ,
      w: room.dimensions.w,
      l: room.dimensions.l
    }

    if (hasCollision(room.id, candidate)) {
      return
    }

    store.updateRecinto(room.id, { x: nextX, z: nextZ })
  }

  const beginResize = (id) => {
    selectedRecintoId.value = id
    activeMode.value = 'resize'
  }

  const resizeTo = (pointerWorld) => {
    if (activeMode.value !== 'resize' || !selectedRecinto.value) return

    const room = selectedRecinto.value
    const minArea = minAreaByTipo.value[room.tipo] || 1

    let nextW = Math.max(GRID_STEP, snap(pointerWorld.x - room.coords.x))
    let nextL = Math.max(GRID_STEP, snap(pointerWorld.z - room.coords.z))

    // Tope minimo: area del recinto no puede bajar de su costo token.
    if (nextW * nextL < minArea) {
      const minSide = Math.sqrt(minArea)
      nextW = Math.max(nextW, snap(minSide))
      nextL = Math.max(nextL, snap(minArea / Math.max(nextW, GRID_STEP)))
      if (nextW * nextL < minArea) {
        nextL = snap(minArea / Math.max(nextW, GRID_STEP))
      }
    }

    // Tope maximo: suma areas no supera m2Totales.
    const areaWithoutRoom = getTotalAreaExcept(room.id)
    const allowedForRoom = store.configMetadata.m2Totales - areaWithoutRoom
    if (nextW * nextL > allowedForRoom) {
      const ratio = nextW / Math.max(nextL, GRID_STEP)
      nextL = Math.sqrt(allowedForRoom / Math.max(ratio, EPS))
      nextW = ratio * nextL
      nextW = Math.max(GRID_STEP, snap(nextW))
      nextL = Math.max(GRID_STEP, snap(nextL))
    }

    const candidate = {
      x: room.coords.x,
      z: room.coords.z,
      w: nextW,
      l: nextL
    }

    if (hasCollision(room.id, candidate)) {
      return
    }

    store.updateRecinto(room.id, { w: nextW, l: nextL })
  }

  const endInteraction = () => {
    activeMode.value = null
  }

  return {
    GRID_STEP,
    selectedRecintoId,
    selectedRecinto,
    activeMode,
    beginDrag,
    dragTo,
    beginResize,
    resizeTo,
    endInteraction
  }
}
