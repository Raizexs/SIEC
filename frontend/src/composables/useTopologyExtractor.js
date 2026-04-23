const WALL_THICKNESS = 0.15
const EPS = 1e-6

function round(n) {
  return Math.round(n * 1000) / 1000
}

function pointKey(p) {
  return `${round(p.x)}:${round(p.z)}`
}

function normalizeSegment(start, end) {
  const a = { x: round(start.x), z: round(start.z) }
  const b = { x: round(end.x), z: round(end.z) }

  if (a.x < b.x || (a.x === b.x && a.z <= b.z)) {
    return { start: a, end: b }
  }
  return { start: b, end: a }
}

function segmentLength(seg) {
  return Math.hypot(seg.end.x - seg.start.x, seg.end.z - seg.start.z)
}

function segmentoKey(seg) {
  return `${pointKey(seg.start)}|${pointKey(seg.end)}`
}

function edgesFromRecinto(recinto) {
  const { x, z } = recinto.coords
  const { w, l } = recinto.dimensions

  const p1 = { x, z }
  const p2 = { x: x + w, z }
  const p3 = { x: x + w, z: z + l }
  const p4 = { x, z: z + l }

  return [
    normalizeSegment(p1, p2),
    normalizeSegment(p2, p3),
    normalizeSegment(p3, p4),
    normalizeSegment(p4, p1)
  ]
}

function axisAndConst(seg) {
  if (Math.abs(seg.start.x - seg.end.x) < EPS) {
    return { axis: 'z', c: seg.start.x }
  }
  return { axis: 'x', c: seg.start.z }
}

function rangeOnAxis(seg, axis) {
  if (axis === 'x') {
    return [Math.min(seg.start.x, seg.end.x), Math.max(seg.start.x, seg.end.x)]
  }
  return [Math.min(seg.start.z, seg.end.z), Math.max(seg.start.z, seg.end.z)]
}

function touchingOrOverlap(a1, a2, b1, b2) {
  return b1 <= a2 + EPS && a1 <= b2 + EPS
}

function mergeIfPossible(base, candidate) {
  if (base.tipo !== candidate.tipo) return null

  const infoA = axisAndConst(base.segmento)
  const infoB = axisAndConst(candidate.segmento)
  if (infoA.axis !== infoB.axis) return null
  if (Math.abs(infoA.c - infoB.c) > EPS) return null

  const [a1, a2] = rangeOnAxis(base.segmento, infoA.axis)
  const [b1, b2] = rangeOnAxis(candidate.segmento, infoA.axis)
  if (!touchingOrOverlap(a1, a2, b1, b2)) return null

  const min = Math.min(a1, b1)
  const max = Math.max(a2, b2)

  let mergedSegment
  if (infoA.axis === 'x') {
    mergedSegment = normalizeSegment({ x: min, z: infoA.c }, { x: max, z: infoA.c })
  } else {
    mergedSegment = normalizeSegment({ x: infoA.c, z: min }, { x: infoA.c, z: max })
  }

  const adj = Array.from(new Set([...base.recintosAdyacentes, ...candidate.recintosAdyacentes]))

  return {
    ...base,
    segmento: mergedSegment,
    recintosAdyacentes: adj
  }
}

function stableWallId(seg, tipo) {
  return `wall-${tipo}-${segmentoKey(seg)}`
}

export function extractTopologyFromRecintos(recintosArray) {
  const byFloor = new Map();
  recintosArray.forEach(r => {
    const p = r.piso || 1;
    if (!byFloor.has(p)) byFloor.set(p, []);
    byFloor.get(p).push(r);
  });

  const allMergedWalls = [];

  byFloor.forEach((floorRecintos, piso) => {
    const edgeMap = new Map()

    floorRecintos.forEach((recinto) => {
      edgesFromRecinto(recinto).forEach((edge) => {
        const key = segmentoKey(edge)
        const found = edgeMap.get(key)
        if (!found) {
          edgeMap.set(key, { segmento: edge, recintos: [recinto.id] })
        } else {
          found.recintos.push(recinto.id)
        }
      })
    })

    const rawWalls = []
    edgeMap.forEach((entry) => {
      const uniqueRecintos = Array.from(new Set(entry.recintos))
      const tipo = uniqueRecintos.length > 1 ? 'interior' : 'exterior'

      rawWalls.push({
        id: stableWallId(entry.segmento, tipo) + `-p${piso}`,
        segmento: entry.segmento,
        tipo,
        thickness: WALL_THICKNESS,
        recintosAdyacentes: uniqueRecintos,
        piso
      })
    })

    const merged = []
    rawWalls.forEach((wall) => {
      let mergedIntoExisting = false

      for (let i = 0; i < merged.length; i += 1) {
        const candidate = mergeIfPossible(merged[i], wall)
        if (candidate) {
          merged[i] = {
            ...candidate,
            id: stableWallId(candidate.segmento, candidate.tipo) + `-p${piso}`
          }
          mergedIntoExisting = true
          break
        }
      }

      if (!mergedIntoExisting) {
        merged.push(wall)
      }
    })

    allMergedWalls.push(...merged);
  });

  return allMergedWalls;
}

export function calculateWallLengthTotal(walls) {
  return walls.reduce((sum, wall) => sum + segmentLength(wall.segmento), 0)
}

export function filterWallsByType(walls, tipo) {
  return walls.filter((wall) => wall.tipo === tipo)
}

export function getWallInfo(wall) {
  const length = segmentLength(wall.segmento)
  return {
    id: wall.id,
    tipo: wall.tipo,
    longitud: length.toFixed(2),
    volumenAproximado: (length * 2.4 * wall.thickness).toFixed(3),
    recintosRelacionados: wall.recintosAdyacentes.length
  }
}
