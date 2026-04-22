/**
 * useRegulatoryValidator.js
 * Composable para validación de restricciones regulatorias MINVU
 * 
 * HU18: Implementación de Hard Constraints Regulatorios
 */

import { ref, computed } from 'vue';

export function useRegulatoryValidator() {
  const isLoading = ref(false);
  const error = ref(null);
  
  const validationResult = ref({
    status: null,
    violations: [],
    warnings: [],
    is_constructible: false,
    is_self_constructible: false,
    requires_loscat: false,
    max_stories_without_engineer: null,
  });

  const materialInfo = ref(null);
  const regulatoryLimits = ref(null);
  const zones = ref([]);

  /**
   * Valida un proyecto contra restricciones regulatorias
   * 
   * @param {Object} projectData - Datos del proyecto
   * @returns {Promise<Object>} Resultado de validación
   */
  async function validateProject(projectData) {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await fetch('http://localhost:8000/api/validate-regulatory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          m2_totales: projectData.m2_totales,
          material_estructural: projectData.material_estructural,
          num_stories: projectData.num_stories || 1,
          zona_climatica: projectData.zona_climatica || 'Central',
          is_complex: projectData.is_complex || false,
          has_engineer: projectData.has_engineer || false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error en validación: ${response.statusText}`);
      }

      const result = await response.json();
      validationResult.value = result;
      return result;
    } catch (err) {
      error.value = err.message;
      console.error('Error validating regulatory constraints:', err);
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Obtiene información regulatoria para un material
   * 
   * @param {string} material - Nombre del material
   * @returns {Promise<Object>} Información de restricciones
   */
  async function getMaterialInfo(material) {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await fetch(
        `http://localhost:8000/api/regulatory/material-info/${encodeURIComponent(material)}`
      );

      if (!response.ok) {
        throw new Error(`Material no encontrado: ${material}`);
      }

      const result = await response.json();
      materialInfo.value = result;
      return result;
    } catch (err) {
      error.value = err.message;
      console.error('Error fetching material info:', err);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Obtiene límites regulatorios globales
   * 
   * @returns {Promise<Object>} Límites de autoconstrucción, máximo m², etc.
   */
  async function getRegulatoryLimits() {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await fetch('http://localhost:8000/api/regulatory/limits');

      if (!response.ok) {
        throw new Error('Error fetching regulatory limits');
      }

      const result = await response.json();
      regulatoryLimits.value = result;
      return result;
    } catch (err) {
      error.value = err.message;
      console.error('Error fetching limits:', err);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Obtiene zonas frías que requieren LOSCAT
   * 
   * @returns {Promise<Object>} Información de zonas
   */
  async function getRegulatoryZones() {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await fetch('http://localhost:8000/api/regulatory/zones');

      if (!response.ok) {
        throw new Error('Error fetching zones');
      }

      const result = await response.json();
      zones.value = result.cold_zones || [];
      return result;
    } catch (err) {
      error.value = err.message;
      console.error('Error fetching zones:', err);
    } finally {
      isLoading.value = false;
    }
  }

  // Computadas para facilitar acceso a datos

  const isBlocked = computed(() => validationResult.value.status === 'blocked');

  const hasWarnings = computed(() => validationResult.value.warnings.length > 0);

  const isSelfConstructible = computed(
    () => validationResult.value.is_self_constructible
  );

  const isConstructible = computed(() => validationResult.value.is_constructible);

  const violations = computed(() => validationResult.value.violations || []);

  const warnings = computed(() => validationResult.value.warnings || []);

  /**
   * Obtiene mensaje amigable para el estado de validación
   */
  const statusMessage = computed(() => {
    const status = validationResult.value.status;

    switch (status) {
      case 'compliant':
        return '✅ Proyecto cumple con todas las restricciones regulatorias';
      case 'warning':
        return '⚠️ Proyecto tiene advertencias regulatorias';
      case 'blocked':
        return '❌ Proyecto no cumple restricciones regulatorias';
      default:
        return 'No validado';
    }
  });

  return {
    // State
    isLoading,
    error,
    validationResult,
    materialInfo,
    regulatoryLimits,
    zones,

    // Methods
    validateProject,
    getMaterialInfo,
    getRegulatoryLimits,
    getRegulatoryZones,

    // Computed
    isBlocked,
    hasWarnings,
    isSelfConstructible,
    isConstructible,
    violations,
    warnings,
    statusMessage,
  };
}
