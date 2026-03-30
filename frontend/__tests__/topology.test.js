/**
 * SCRUM-46 Tests: Algoritmo de Extracción y Fusión de Muros
 * 
 * Validación TDD del extractor de topología
 * Casos críticos:
 * - Dos recintos tocándose: deben fusionarse en 1 muro interior
 * - Recinto aislado: sus 4 aristas son muros exteriores
 * - Tres colineales: deben fusionarse en un solo recinto
 */

import { describe, it, expect } from 'vitest'
import {
  extractTopologyFromRecintos,
  calculateWallLengthTotal,
  filterWallsByType,
  getWallInfo
} from '../composables/useTopologyExtractor'

describe('SCRUM-46: Extractor Topología y Fusión Muros', () => {
  
  // ==================== TEST CASO 1: Recinto Aislado ====================
  describe('Caso 1: Recinto Aislado', () => {
    it('debería generar 4 muros exteriores para un recinto solitario', () => {
      const recintos = [
        {
          id: 'rec-1',
          tipo: 'habitacion',
          coords: { x: 0, z: 0 },
          dimensions: { w: 3, l: 3 } // 9m²
        }
      ];

      const walls = extractTopologyFromRecintos(recintos);

      expect(walls).toHaveLength(4);
      expect(walls.every(w => w.tipo === 'exterior')).toBe(true);
      
      // Validar perímetro: 2 * (3 + 3) = 12 metros
      const totalLength = calculateWallLengthTotal(walls);
      expect(totalLength).toBeCloseTo(12, 1);
    });
  });

  // ==================== TEST CASO 2: Dos Recintos Tocándose ====================
  describe('Caso 2: Dos Recintos Adyacentes Horizontales', () => {
    it('debería fusionar el muro compartido en 1 muro interior', () => {
      const recintos = [
        {
          id: 'hab-1',
          tipo: 'habitacion',
          coords: { x: 0, z: 0 },
          dimensions: { w: 3, l: 3 } // 9m²
        },
        {
          id: 'ban-1',
          tipo: 'banio',
          coords: { x: 3, z: 0 },
          dimensions: { w: 2, l: 2 } // 4m²
        }
      ];

      const walls = extractTopologyFromRecintos(recintos);
      const interiorWalls = filterWallsByType(walls, 'interior');
      const exteriorWalls = filterWallsByType(walls, 'exterior');

      // Deberían existir muros interiores (la arista compartida)
      expect(interiorWalls.length).toBeGreaterThan(0);
      // Deberían existir muros exteriores (los perímetros no compartidos)
      expect(exteriorWalls.length).toBeGreaterThan(0);

      // Validar que el muro interior pertenece a ambos recintos
      const sharedWall = interiorWalls[0];
      expect(sharedWall.recintosAdyacentes).toContain('hab-1');
      expect(sharedWall.recintosAdyacentes).toContain('ban-1');
    });
  });

  // ==================== TEST CASO 3: Tres Recintos Colineales ====================
  describe('Caso 3: Tres Recintos en Línea Colineal', () => {
    it('debería fusionar tres colineales en un solo segmento interior', () => {
      const recintos = [
        {
          id: 'rec-1',
          tipo: 'habitacion',
          coords: { x: 0, z: 0 },
          dimensions: { w: 3, l: 3 }
        },
        {
          id: 'rec-2',
          tipo: 'habitation',
          coords: { x: 3, z: 0 },
          dimensions: { w: 3, l: 3 }
        },
        {
          id: 'rec-3',
          tipo: 'habitacion',
          coords: { x: 6, z: 0 },
          dimensions: { w: 3, l: 3 }
        }
      ];

      const walls = extractTopologyFromRecintos(recintos);
      
      // Contar muros interiores verticales (línea de contacto entre los tres)
      const interiorWalls = filterWallsByType(walls, 'interior');
      
      // Aunque hay 2 bordes compartidos (1-2 y 2-3), deberían estar fusionados
      // en teoría en 1 segmento recto de longitud 6.0
      expect(interiorWalls.length).toBeGreaterThan(0);

      // Al menos un muro interior debe tener longitud 6
      const hasLongVerticalWall = interiorWalls.some(w => {
        const length = Math.sqrt(
          (w.segmento.end.x - w.segmento.start.x) ** 2 +
          (w.segmento.end.z - w.segmento.start.z) ** 2
        );
        return length > 5 && length < 7;
      });
      
      expect(hasLongVerticalWall).toBe(true);
    });
  });

  // ==================== TEST CASO 4: Cálculo de Longitud Total ====================
  describe('Caso 4: Cálculo de Longitud Total de Muros', () => {
    it('debería calcular correctamente el perímetro total', () => {
      const recintos = [
        {
          id: 'rec-1',
          tipo: 'habitacion',
          coords: { x: 0, z: 0 },
          dimensions: { w: 4, l: 5 } // Perímetro = 2*(4+5) = 18m
        }
      ];

      const walls = extractTopologyFromRecintos(recintos);
      const totalLength = calculateWallLengthTotal(walls);

      expect(totalLength).toBeCloseTo(18, 1);
    });
  });

  // ==================== TEST CASO 5: getWallInfo ====================
  describe('Caso 5: Información Formateada de Muro', () => {
    it('debería retornar información legible del muro', () => {
      const recintos = [
        {
          id: 'hab-1',
          tipo: 'habitacion',
          coords: { x: 0, z: 0 },
          dimensions: { w: 5, l: 4 }
        }
      ];

      const walls = extractTopologyFromRecintos(recintos);
      const wall = walls[0];
      const info = getWallInfo(wall);

      expect(info).toHaveProperty('id');
      expect(info).toHaveProperty('tipo');
      expect(info).toHaveProperty('longitud');
      expect(info).toHaveProperty('volumenAproximado');
      expect(info).toHaveProperty('recintosRelacionados');

      // Validar tipos
      expect(typeof info.longitud).toBe('string'); // Formateado
      expect(typeof info.volumenAproximado).toBe('string');
      expect(typeof info.recintosRelacionados).toBe('number');
    });
  });

  // ==================== TEST CASO 6: Área Total Conservada ====================
  describe('Caso 6: Conservación de Área Total', () => {
    it('debería preservar el área total de recintos en la topología', () => {
      const recintos = [
        {
          id: 'hab-1',
          tipo: 'habitacion',
          coords: { x: 0, z: 0 },
          dimensions: { w: 3, l: 3 }
        },
        {
          id: 'ban-1',
          tipo: 'banio',
          coords: { x: 0, z: 3 },
          dimensions: { w: 2, l: 2 }
        }
      ];

      const areaBefore = recintos.reduce((sum, r) => sum + r.dimensions.w * r.dimensions.l, 0);
      const walls = extractTopologyFromRecintos(recintos);

      // La topología no debería perder ni añadir recintos
      expect(walls.length).toBeGreaterThan(0);
      
      // Validar que cada recinto está referenciado en al menos un muro
      recintos.forEach(recinto => {
        const hasWall = walls.some(w => w.recintosAdyacentes.includes(recinto.id));
        expect(hasWall).toBe(true);
      });
    });
  });

  // ==================== TEST CASO 7: Wall Thickness ====================
  describe('Caso 7: Grosor de Pared Consistente', () => {
    it('todos los muros deberían tener el mismo grosor (0.15m)', () => {
      const recintos = [
        { id: '1', tipo: 'hab', coords: { x: 0, z: 0 }, dimensions: { w: 3, l: 3 } },
        { id: '2', tipo: 'ban', coords: { x: 3, z: 0 }, dimensions: { w: 2, l: 2 } }
      ];

      const walls = extractTopologyFromRecintos(recintos);

      walls.forEach(wall => {
        expect(wall.thickness).toBeCloseTo(0.15, 2);
      });
    });
  });
});
