/**
 * SCRUM-46: Algoritmo de Extracción y Fusión de Muros
 * 
 * Capa 2 de la arquitectura HU02:
 * Convierte rectángulos bidimensionales (recintos) de Capa 1
 * en segmentos de línea 3D (muros) con clasificación interior/exterior
 * 
 * Matemática Core:
 * - Detecta alineaciones de aristas entre recintos
 * - Fusiona aristas colineales adyacentes en muros únicos
 * - Clasifica como "interior" si ambos lados tienen recintos; "exterior" si no
 */

/**
 * Estructura de un muro resultado:
 * {
 *   id: string (UUID),
 *   segmento: { start: {x, z}, end: {x, z} },
 *   tipo: 'interior' | 'exterior',
 *   thickness: number (grosor = 0.15m por defecto),
 *   recintosAdyacentes: [id1, id2] (solo para interiores)
 * }
 */

/**
 * Estructura de recintos entrada (viene de Capa 1):
 * {
 *   id: string,
 *   tipo: 'habitacion' | 'banio' | 'areaComun',
 *   coords: { x, z },
 *   dimensions: { w, l }
 * }
 * 
 * Nota: coords es la esquina inferior-izquierda (origin)
 * El rectángulo ocupa: x ∈ [coords.x, coords.x+w], z ∈ [coords.z, coords.z+l]
 */

const WALL_THICKNESS = 0.15; // metros (estándar construcción)
const EPSILON = 0.01; // tolerancia para comparar floats (1cm)

/**
 * Extrae las 4 aristas de un rectángulo
 * Cada arista es un segmento parametrizado como [start, end]
 * Ordenadas: [arriba, derecha, abajo, izquierda]
 */
function extractRecintoEdges(recinto) {
  const { coords, dimensions } = recinto;
  const { x, z } = coords;
  const { w, l } = dimensions;

  return [
    // Arriba (norte)
    { start: { x, z: z + l }, end: { x: x + w, z: z + l }, side: 'top' },
    // Derecha (este)
    { start: { x: x + w, z: z + l }, end: { x: x + w, z }, side: 'right' },
    // Abajo (sur)
    { start: { x: x + w, z }, end: { x, z }, side: 'bottom' },
    // Izquierda (oeste)
    { start: { x, z }, end: { x, z: z + l }, side: 'left' }
  ];
}

/**
 * Verifica si dos segmentos son colineales (están en la misma línea recta)
 * y comparten un punto extremo (tocándose en los bordes)
 */
function areSegmentsAdjacent(seg1, seg2) {
  const ep1Start = seg1.start;
  const ep1End = seg1.end;
  const ep2Start = seg2.start;
  const ep2End = seg2.end;

  // Verificar colinealidad en X
  const sameX = Math.abs(ep1Start.x - ep1End.x) < EPSILON && 
                Math.abs(ep2Start.x - ep2End.x) < EPSILON &&
                Math.abs(ep1Start.x - ep2Start.x) < EPSILON;

  // Verificar colinealidad en Z
  const sameZ = Math.abs(ep1Start.z - ep1End.z) < EPSILON && 
                Math.abs(ep2Start.z - ep2End.z) < EPSILON &&
                Math.abs(ep1Start.z - ep2Start.z) < EPSILON;

  if (!sameX && !sameZ) return false; // No colineales

  // Verificar que se tocan en un extremo (no se solapan, solo conectan)
  const touches = 
    (distPoint(ep1End, ep2Start) < EPSILON) || // ep1.end == ep2.start
    (distPoint(ep1Start, ep2End) < EPSILON);   // ep1.start == ep2.end

  return touches;
}

/**
 * Distancia euclidiana entre dos puntos 2D
 */
function distPoint(p1, p2) {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.z - p2.z) ** 2);
}

/**
 * Fusiona segmentos adyacentes colineales en uno solo
 * Retorna el segmento extendido que engloba a ambos
 */
function mergeAdjacentSegments(seg1, seg2) {
  // Si seg1.end == seg2.start, fusionamos seg1→seg2
  if (distPoint(seg1.end, seg2.start) < EPSILON) {
    return {
      start: seg1.start,
      end: seg2.end
    };
  }

  // Si seg1.start == seg2.end, fusionamos seg2→seg1
  if (distPoint(seg1.start, seg2.end) < EPSILON) {
    return {
      start: seg2.start,
      end: seg1.end
    };
  }

  // Fallback: retornar seg1 sin modificar (no debería suceder si areSegmentsAdjacent funcionó)
  return seg1;
}

/**
 * Determina si dos recintos comparten una arista
 * Usado para clasificar muros como interior/exterior
 */
function doRecintosShareWall(recinto1, recinto2) {
  const edges1 = extractRecintoEdges(recinto1);
  const edges2 = extractRecintoEdges(recinto2);

  // Buscar una arista que sea adyacente con una del otro
  return edges1.some(e1 => edges2.some(e2 => areSegmentsAdjacent(e1, e2)));
}

/**
 * FUNCIÓN PRINCIPAL: Extrae topología completa desde array de recintos
 * 
 * Algoritmo:
 * 1. Extraer todas las aristas de todos los recintos
 * 2. Agrupar aristas colineales adyacentes y fusionarlas
 * 3. Para cada muro fusionado:
 *    a) Detectar si comparte espacio con otro recinto
 *    b) Si sí → interior; si no → exterior
 * 4. Retornar array de muros con metadata
 */
export function extractTopologyFromRecintos(recintosArray) {
  // Paso 1: Extraer todas las aristas etiquetadas con su recinto origen
  const allEdges = [];
  recintosArray.forEach(recinto => {
    const edges = extractRecintoEdges(recinto);
    edges.forEach(edge => {
      allEdges.push({
        ...edge,
        recintoId: recinto.id,
        recintoTipo: recinto.tipo
      });
    });
  });

  // Paso 2: Fusionar aristas adyacentes (algoritmo voraz)
  const mergedSegments = [];
  const used = new Set();

  allEdges.forEach((edge, idx) => {
    if (used.has(idx)) return; // Ya fusionado

    let currentSegment = { start: edge.start, end: edge.end };
    let recintoIds = new Set([edge.recintoId]);
    used.add(idx);

    // Buscar adyacentes e intentar fusionar iterativamente
    let merged = true;
    while (merged) {
      merged = false;
      for (let i = 0; i < allEdges.length; i++) {
        if (used.has(i)) continue;

        if (areSegmentsAdjacent(currentSegment, allEdges[i])) {
          currentSegment = mergeAdjacentSegments(currentSegment, allEdges[i]);
          recintoIds.add(allEdges[i].recintoId);
          used.add(i);
          merged = true;
          break; // Reintentar desde el inicio con el segmento actualizado
        }
      }
    }

    mergedSegments.push({
      segmento: currentSegment,
      recintosIds: Array.from(recintoIds)
    });
  });

  // Paso 3: Clasificar como interior/exterior y retornar
  const walls = mergedSegments.map((merged, idx) => ({
    id: `wall-${Date.now()}-${idx}`,
    segmento: merged.segmento,
    tipo: merged.recintosIds.length >= 2 ? 'interior' : 'exterior',
    thickness: WALL_THICKNESS,
    recintosAdyacentes: merged.recintosIds
  }));

  return walls;
}

/**
 * FUNCIÓN AUXILIAR: Calcula total de metros lineales de muros
 * Útil para estimaciones de presupuesto (Épica 2)
 */
export function calculateWallLengthTotal(walls) {
  return walls.reduce((sum, wall) => {
    const { start, end } = wall.segmento;
    const length = distPoint(start, end);
    return sum + length;
  }, 0);
}

/**
 * FUNCIÓN AUXILIAR: Filtra muros por tipo (interior/exterior)
 */
export function filterWallsByType(walls, tipo) {
  return walls.filter(w => w.tipo === tipo);
}

/**
 * FUNCIÓN AUXILIAR: Obtiene información de cada muro en formato legible
 */
export function getWallInfo(wall) {
  const { start, end } = wall.segmento;
  const length = distPoint(start, end);

  return {
    id: wall.id,
    tipo: wall.tipo,
    longitud: length.toFixed(2),
    volumenAproximado: (length * 2.4 * wall.thickness).toFixed(3), // altura estándar 2.4m
    recintosRelacionados: wall.recintosAdyacentes.length
  };
}
