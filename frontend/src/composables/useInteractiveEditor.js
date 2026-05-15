import { computed, ref, unref } from 'vue'
import { useRecintosStore } from '../stores/recintos'

const EPS = 1e-6

const DEFAULT_FINE_STEP = 0.1

function overlaps(a, b) {
  return a.x < b.x + b.w - EPS && a.x + a.w > b.x + EPS && a.z < b.z + b.l - EPS && a.z + a.l > b.z + EPS
}

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
    const sourceRoom = store.recintos.find(r => r.id === id);
    const sourcePiso = sourceRoom ? (sourceRoom.piso || 1) : store.currentFloor;

    return store.recintos.some((r) => {
      if (r.id === id) return false;
      if ((r.piso || 1) !== sourcePiso) return false;

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

  // ── Snap Logic (Soft Snap) ────────────────────────────────────────────
  // Returns lines to snap to (edges of other rooms on same floor + budget boundaries)
  const getSnapLines = (currentFloor, currentRoomId, budgetRect) => {
    const xLines = [0, budgetRect.w];
    const zLines = [0, budgetRect.h];

    store.recintos.forEach((r) => {
      if (r.id === currentRoomId || (r.piso || 1) !== currentFloor) return;
      xLines.push(r.coords.x, r.coords.x + r.dimensions.w);
      zLines.push(r.coords.z, r.coords.z + r.dimensions.l);
    });

    return { xLines, zLines };
  };

  // Helper to snap an edge (left/right or top/bottom) to interesting lines
  const snapEdge = (rawPos, size, lines, threshold = 0.25) => {
    let bestPos = rawPos;
    let minDiff = threshold;

    for (const line of lines) {
      // snap start edge (e.g. left or top)
      let diffStart = Math.abs(rawPos - line);
      if (diffStart < minDiff) {
        minDiff = diffStart;
        bestPos = line;
      }
      // snap end edge (e.g. right or bottom)
      let diffEnd = Math.abs((rawPos + size) - line);
      if (diffEnd < minDiff) {
        minDiff = diffEnd;
        bestPos = line - size;
      }
    }
    return snap(bestPos); // still align to 0.1 grid
  };

  const snapSize = (rawStart, rawSize, lines, threshold = 0.25) => {
    let bestSize = rawSize;
    let minDiff = threshold;
    for (const line of lines) {
      let diffEnd = Math.abs((rawStart + rawSize) - line);
      if (diffEnd < minDiff) {
        minDiff = diffEnd;
        bestSize = line - rawStart;
      }
    }
    return snap(bestSize);
  };


  // Override methods with smart snap
  const smartDragTo = (pointerWorld, budgetRect) => {
    if (activeMode.value !== 'drag' || !selectedRecinto.value) return;

    const room = selectedRecinto.value;
    let rawX = pointerWorld.x - dragOffset.value.x;
    let rawZ = pointerWorld.z - dragOffset.value.z;

    const { xLines, zLines } = getSnapLines(store.currentFloor, room.id, budgetRect);

    const nextX = snapEdge(rawX, room.dimensions.w, xLines);
    const nextZ = snapEdge(rawZ, room.dimensions.l, zLines);

    const candidate = { x: nextX, z: nextZ, w: room.dimensions.w, l: room.dimensions.l };

    if (hasCollision(room.id, candidate)) {
      const slideX = { ...candidate, z: room.coords.z };
      if (!hasCollision(room.id, slideX)) {
        store.updateRecinto(room.id, { x: nextX });
        return;
      }
      const slideZ = { ...candidate, x: room.coords.x };
      if (!hasCollision(room.id, slideZ)) {
        store.updateRecinto(room.id, { z: nextZ });
        return;
      }
      return;
    }
    store.updateRecinto(room.id, { x: nextX, z: nextZ });
  };

  const smartResizeTo = (pointerWorld, budgetRect) => {
    if (activeMode.value !== 'resize' || !selectedRecinto.value) return;

    const room = selectedRecinto.value;
    const minArea = minAreaByTipo.value[room.tipo] || 2;
    const minSide = minSideByTipo.value[room.tipo] || 1.0;

    let rawW = Math.max(minSide, pointerWorld.x - room.coords.x);
    let rawL = Math.max(minSide, pointerWorld.z - room.coords.z);

    const { xLines, zLines } = getSnapLines(store.currentFloor, room.id, budgetRect);

    let nextW = Math.max(minSide, snapSize(room.coords.x, rawW, xLines));
    let nextL = Math.max(minSide, snapSize(room.coords.z, rawL, zLines));

    if (nextW * nextL < minArea) {
      if (nextW < nextL) {
        nextW = Math.max(minSide, snap(minArea / nextL));
      } else {
        nextL = Math.max(minSide, snap(minArea / nextW));
      }
    }

    const candidate = { x: room.coords.x, z: room.coords.z, w: nextW, l: nextL };

    if (hasCollision(room.id, candidate)) return;

    store.updateRecinto(room.id, { w: nextW, l: nextL });
  };

  // ── End ───────────────────────────────────────────────────────────────
  const endInteraction = () => {
    activeMode.value = null
    // Don't clear selectedRecintoId — keeps it highlighted
  }

  return {
    GRID_STEP: DEFAULT_FINE_STEP,
    selectedRecintoId,
    selectedRecinto,
    activeMode,
    beginDrag,
    dragTo: smartDragTo,
    beginResize,
    resizeTo: smartResizeTo,
    endInteraction
  }
}
