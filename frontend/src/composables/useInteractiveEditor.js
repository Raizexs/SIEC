import { computed, ref } from 'vue'
import { useRecintosStore } from '../stores/recintos'

const GRID_STEP = 0.1   // Fine-grained snap for fluid feel
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
    habitacion: 7.0,  // minimum 7.0 m² (MINVU DS49)
    banio: 2.5,       // minimum 2.5 m² (MINVU DS49)
    areaComun: 9.4    // minimum 9.4 m² (MINVU DS49 Estar-Comedor)
  }))

  const minSideByTipo = computed(() => ({
    habitacion: 2.2,  // width minimum 2.2m (220cm MINVU)
    banio: 1.1,       // width minimum 1.1m (110cm MINVU)
    areaComun: 2.1    // width minimum 2.1m (210cm MINVU)
  }))

  const selectedRecinto = computed(() => {
    return store.recintos.find((r) => r.id === selectedRecintoId.value) || null
  })

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

  // ── Drag ──────────────────────────────────────────────────────────────
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
      // Try sliding along X only
      const slideX = { ...candidate, z: room.coords.z }
      if (!hasCollision(room.id, slideX)) {
        store.updateRecinto(room.id, { x: nextX })
        return
      }
      // Try sliding along Z only
      const slideZ = { ...candidate, x: room.coords.x }
      if (!hasCollision(room.id, slideZ)) {
        store.updateRecinto(room.id, { z: nextZ })
        return
      }
      // Both blocked — don't move
      return
    }

    store.updateRecinto(room.id, { x: nextX, z: nextZ })
  }

  // ── Resize ────────────────────────────────────────────────────────────
  const beginResize = (id) => {
    selectedRecintoId.value = id
    activeMode.value = 'resize'
  }

  const resizeTo = (pointerWorld) => {
    if (activeMode.value !== 'resize' || !selectedRecinto.value) return

    const room = selectedRecinto.value
    const minArea = minAreaByTipo.value[room.tipo] || 2
    const minSide = minSideByTipo.value[room.tipo] || 1.0

    let nextW = Math.max(minSide, snap(pointerWorld.x - room.coords.x))
    let nextL = Math.max(minSide, snap(pointerWorld.z - room.coords.z))

    // Enforce minimum area
    if (nextW * nextL < minArea) {
      if (nextW < nextL) {
        nextW = Math.max(minSide, snap(minArea / nextL))
      } else {
        nextL = Math.max(minSide, snap(minArea / nextW))
      }
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

  // ── End ───────────────────────────────────────────────────────────────
  const endInteraction = () => {
    activeMode.value = null
    // Don't clear selectedRecintoId — keeps it highlighted
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
