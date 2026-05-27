import { computed, ref, unref } from 'vue'
import { useRecintosStore } from '../stores/recintos'
import {
  MIN_ROOM_DIM,
  resolveRoomDragPosition,
  resolveRoomResize,
  terrainFromEditor,
} from './useSpatialConstraints.js'

const DEFAULT_FINE_STEP = 0.1

/**
 * @param {{ snapStep?: import('vue').Ref<number> | number | import('vue').ComputedRef<number> }} [opts]
 */
export function useInteractiveEditor(opts = {}) {
  const store = useRecintosStore()
  const snapStepSource = opts.snapStep ?? ref(DEFAULT_FINE_STEP)

  const snap = (value) => {
    const step = Number(unref(snapStepSource))
    const s = Number.isFinite(step) && step > 0 ? step : DEFAULT_FINE_STEP
    return Math.round(value / s) * s
  }

  const selectedRecintoId = ref(null)
  const activeMode = ref(null)
  const dragOffset = ref({ x: 0, z: 0 })

  const minAreaByTipo = computed(() => ({
    habitacion: 7.0,
    banio: 2.5,
    areaComun: 9.4,
  }))

  const minSideByTipo = computed(() => ({
    habitacion: 2.2,
    banio: 1.1,
    areaComun: 2.1,
  }))

  const selectedRecinto = computed(() => {
    return store.recintos.find((r) => r.id === selectedRecintoId.value) || null
  })

  const terrainFromBudget = (budgetRect) =>
    terrainFromEditor(budgetRect?.w, budgetRect?.h)

  const currentSnapStep = () => {
    const step = Number(unref(snapStepSource))
    return Number.isFinite(step) && step > 0 ? step : 0
  }

  // ── Drag ──────────────────────────────────────────────────────────────
  const beginDrag = (id, pointerWorld) => {
    const room = store.recintos.find((r) => r.id === id)
    if (!room) return

    selectedRecintoId.value = id
    activeMode.value = 'drag'
    dragOffset.value = {
      x: pointerWorld.x - room.coords.x,
      z: pointerWorld.z - room.coords.z,
    }
  }

  const computeDragPosition = (pointerWorld, budgetRect) => {
    if (activeMode.value !== 'drag' || !selectedRecinto.value) return null

    const room = selectedRecinto.value
    const terrain = terrainFromBudget(budgetRect)
    const { xLines, zLines } = getSnapLines(store.currentFloor, room.id, budgetRect)

    const rawX = pointerWorld.x - dragOffset.value.x
    const rawZ = pointerWorld.z - dragOffset.value.z
    const edgeX = snapEdge(rawX, room.dimensions.w, xLines)
    const edgeZ = snapEdge(rawZ, room.dimensions.l, zLines)

    const resolved = resolveRoomDragPosition(
      room,
      edgeX,
      edgeZ,
      terrain,
      store.recintos,
      { snapStep: currentSnapStep() },
    )

    if (!resolved) return null

    return {
      x: Number(resolved.x.toFixed(3)),
      z: Number(resolved.z.toFixed(3)),
    }
  }

  const dragTo = (pointerWorld, budgetRect) => {
    const coords = computeDragPosition(pointerWorld, budgetRect)
    if (!coords || !selectedRecinto.value) return

    store.updateRecinto(selectedRecinto.value.id, { coords })
  }

  // ── Resize ────────────────────────────────────────────────────────────
  const beginResize = (id) => {
    selectedRecintoId.value = id
    activeMode.value = 'resize'
  }

  const computeResizeDimensions = (pointerWorld, budgetRect) => {
    if (activeMode.value !== 'resize' || !selectedRecinto.value) return null

    const room = selectedRecinto.value
    const terrain = terrainFromBudget(budgetRect)
    const minArea = minAreaByTipo.value[room.tipo] || 2
    const minSide = minSideByTipo.value[room.tipo] || 1.0

    let rawW = Math.max(minSide, pointerWorld.x - room.coords.x)
    let rawL = Math.max(minSide, pointerWorld.z - room.coords.z)
    const { xLines, zLines } = getSnapLines(store.currentFloor, room.id, budgetRect)

    let nextW = Math.max(minSide, snapSize(room.coords.x, rawW, xLines))
    let nextL = Math.max(minSide, snapSize(room.coords.z, rawL, zLines))

    if (nextW * nextL < minArea) {
      if (nextW < nextL) {
        nextW = Math.max(minSide, snap(minArea / nextL))
      } else {
        nextL = Math.max(minSide, snap(minArea / nextW))
      }
    }

    const resolved = resolveRoomResize(
      room,
      nextW,
      nextL,
      terrain,
      store.recintos,
      { snapStep: currentSnapStep() },
    )

    if (!resolved) return null

    return {
      w: Number(resolved.w.toFixed(3)),
      l: Number(resolved.l.toFixed(3)),
    }
  }

  const resizeTo = (pointerWorld, budgetRect) => {
    const dims = computeResizeDimensions(pointerWorld, budgetRect)
    if (!dims || !selectedRecinto.value) return

    store.updateRecinto(selectedRecinto.value.id, { dimensions: dims })
  }

  // ── Snap Logic (Soft Snap) ────────────────────────────────────────────
  const getSnapLines = (currentFloor, currentRoomId, budgetRect) => {
    const xLines = [0, budgetRect.w]
    const zLines = [0, budgetRect.h]

    store.recintos.forEach((r) => {
      if (r.id === currentRoomId || (r.piso || 1) !== currentFloor) return
      xLines.push(r.coords.x, r.coords.x + r.dimensions.w)
      zLines.push(r.coords.z, r.coords.z + r.dimensions.l)
    })

    return { xLines, zLines }
  }

  const snapEdge = (rawPos, size, lines, threshold = 0.25) => {
    let bestPos = rawPos
    let minDiff = threshold

    for (const line of lines) {
      const diffStart = Math.abs(rawPos - line)
      if (diffStart < minDiff) {
        minDiff = diffStart
        bestPos = line
      }
      const diffEnd = Math.abs(rawPos + size - line)
      if (diffEnd < minDiff) {
        minDiff = diffEnd
        bestPos = line - size
      }
    }
    return snap(bestPos)
  }

  const snapSize = (rawStart, rawSize, lines, threshold = 0.25) => {
    let bestSize = rawSize
    let minDiff = threshold
    for (const line of lines) {
      const diffEnd = Math.abs(rawStart + rawSize - line)
      if (diffEnd < minDiff) {
        minDiff = diffEnd
        bestSize = line - rawStart
      }
    }
    return snap(bestSize)
  }

  const endInteraction = () => {
    activeMode.value = null
  }

  return {
    GRID_STEP: DEFAULT_FINE_STEP,
    selectedRecintoId,
    selectedRecinto,
    activeMode,
    beginDrag,
    computeDragPosition,
    dragTo,
    beginResize,
    computeResizeDimensions,
    resizeTo,
    endInteraction,
  }
}
