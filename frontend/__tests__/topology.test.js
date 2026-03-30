import { describe, it, expect } from 'vitest'
import {
  extractTopologyFromRecintos,
  calculateWallLengthTotal,
  filterWallsByType,
  getWallInfo
} from '../src/composables/useTopologyExtractor'

describe('SCRUM-46: extractor de topologia', () => {
  it('genera 4 muros exteriores para un recinto aislado', () => {
    const recintos = [
      { id: 'r1', tipo: 'habitacion', coords: { x: 0, z: 0 }, dimensions: { w: 3, l: 3 } }
    ]

    const walls = extractTopologyFromRecintos(recintos)
    expect(walls).toHaveLength(4)
    expect(walls.every((w) => w.tipo === 'exterior')).toBe(true)
    expect(calculateWallLengthTotal(walls)).toBeCloseTo(12, 3)
  })

  it('detecta muro interior cuando dos recintos comparten arista completa', () => {
    const recintos = [
      { id: 'a', tipo: 'habitacion', coords: { x: 0, z: 0 }, dimensions: { w: 3, l: 3 } },
      { id: 'b', tipo: 'habitacion', coords: { x: 3, z: 0 }, dimensions: { w: 3, l: 3 } }
    ]

    const walls = extractTopologyFromRecintos(recintos)
    const interior = filterWallsByType(walls, 'interior')

    expect(interior.length).toBe(1)
    expect(interior[0].recintosAdyacentes.sort()).toEqual(['a', 'b'])
  })

  it('mantiene muros exteriores en uniones parciales', () => {
    const recintos = [
      { id: 'a', tipo: 'habitacion', coords: { x: 0, z: 0 }, dimensions: { w: 3, l: 3 } },
      { id: 'b', tipo: 'banio', coords: { x: 3, z: 0 }, dimensions: { w: 2, l: 2 } }
    ]

    const walls = extractTopologyFromRecintos(recintos)
    const interior = filterWallsByType(walls, 'interior')
    const exterior = filterWallsByType(walls, 'exterior')

    expect(interior.length).toBe(0)
    expect(exterior.length).toBeGreaterThan(0)
  })

  it('retorna ids estables para la misma entrada', () => {
    const recintos = [
      { id: 'r1', tipo: 'habitacion', coords: { x: 0, z: 0 }, dimensions: { w: 4, l: 2 } }
    ]

    const first = extractTopologyFromRecintos(recintos).map((w) => w.id).sort()
    const second = extractTopologyFromRecintos(recintos).map((w) => w.id).sort()
    expect(first).toEqual(second)
  })

  it('entrega estructura util para reporte', () => {
    const recintos = [
      { id: 'r1', tipo: 'habitacion', coords: { x: 0, z: 0 }, dimensions: { w: 4, l: 5 } }
    ]

    const walls = extractTopologyFromRecintos(recintos)
    const info = getWallInfo(walls[0])

    expect(info).toHaveProperty('id')
    expect(info).toHaveProperty('tipo')
    expect(info).toHaveProperty('longitud')
    expect(info).toHaveProperty('volumenAproximado')
    expect(info).toHaveProperty('recintosRelacionados')
  })
})
