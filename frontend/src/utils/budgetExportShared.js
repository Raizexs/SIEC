import logger from '../utils/logger.js';

export const MATERIAL_NAMES = {
  1: 'Estructura de madera',
  2: 'Acero galvanizado',
  3: 'Mampostería',
  4: 'Hormigón armado',
  5: 'Híbrido madera + metalcon',
};

export const formatClp = (value) => {
  if (value == null || !Number.isFinite(Number(value))) return 'N/D';

  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Number(value));
};

export const formatNumber = (value, maxFractionDigits = 2) => {
  if (value == null || !Number.isFinite(Number(value))) return 'N/D';

  return Number(value).toLocaleString('es-CL', {
    maximumFractionDigits: maxFractionDigits,
  });
};

export const formatExportDate = (dateString) => {
  if (!dateString) return '—';

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return String(dateString);

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

export const getMaterialLabel = (materialId) =>
  MATERIAL_NAMES[materialId] || `Material #${materialId}`;

export const buildBudgetFilename = (projectName, extension) => {
  const base = (projectName || 'Proyecto')
    .replace(/\s+/g, '_')
    .replace(/[^\w.-]/g, '');

  const stamp = new Date().toISOString().slice(0, 10);

  return `SIEC_Presupuesto_${base}_${stamp}.${extension}`;
};

export const normalizeDesglose = (desglose) => {
  if (!Array.isArray(desglose)) return [];

  try {
    return JSON.parse(JSON.stringify(desglose));
  } catch (err) {
    logger.error('[budgetExportShared] Error al clonar desglose con JSON:', err);
    return desglose.map((cat) => ({
      categoria: cat.categoria,
      subtotal_categoria: cat.subtotal_categoria,
      items: (cat.items || []).map((item) => ({ ...item })),
    }));
  }
};

export const flattenDesgloseRows = (desglose = []) => {
  const rows = [];

  for (const cat of normalizeDesglose(desglose)) {
    for (const item of cat.items || []) {
      rows.push({
        categoria: cat.categoria,
        insumo: item.insumo,
        cantidad: item.cantidad,
        unidad: item.unidad,
        precio_unitario: item.precio_unitario,
        subtotal: item.subtotal,
        subtotal_categoria: cat.subtotal_categoria,
      });
    }
  }

  return rows;
};
