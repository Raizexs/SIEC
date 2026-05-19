import logger from '../utils/logger.js';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { useRecintosStore } from '../stores/recintos';
import { useTokenCounter } from '../composables/useTokenCounter';
import { mergePreferences, defaultProductPreferences } from '../composables/useProductPreferences';

/**
 * @param {HTMLCanvasElement | null | undefined} canvasElement
 * @param {string} [projectName]
 * @param {{ export?: Record<string, unknown> }} [options]
 */
export const generateCommercialPDF = async (canvasElement, projectName, options = {}) => {
  const exportPrefs = mergePreferences(defaultProductPreferences(), {
    export: options.export || {},
  }).export;

  const doc = new jsPDF();
  const recintosStore = useRecintosStore();
  const { costs, m2Totales } = useTokenCounter();

  const headerTitle = (exportPrefs.businessName && String(exportPrefs.businessName).trim())
    ? String(exportPrefs.businessName).trim()
    : 'SIEC - Inteligencia Constructiva';

  // ── 1. Cabecera y Datos ──
  doc.setFontSize(22);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text(headerTitle, 14, 20);

  doc.setFontSize(12);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text('Cotización Comercial de Diseño Estructural', 14, 28);
  doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 34);
  doc.text(`Proyecto: ${projectName || 'Sin Título'}`, 14, 40);

  if (exportPrefs.includeLogo) {
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text('Logo: opción activada (asset de marca no incluido en esta build).', 14, 46);
  }

  // ── 2. Resumen Arquitectónico ──
  let y = exportPrefs.includeLogo ? 56 : 52;
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text('Resumen del Proyecto', 14, y);

  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  y += 8;
  doc.text(`Área Total Estimada: ${m2Totales.value.toFixed(2)} m²`, 14, y);
  y += 6;
  doc.text(`Cantidad de Pisos: ${recintosStore.currentFloor}`, 14, y);
  y += 6;
  doc.text(`Total de Recintos: ${recintosStore.recintos.length}`, 14, y);

  // ── 3. Captura del Canvas 3D ──
  if (exportPrefs.includeSnapshots !== false && canvasElement) {
    try {
      const dataUrl = canvasElement.toDataURL('image/jpeg', 0.8);
      const imgProps = doc.getImageProperties(dataUrl);
      const pdfWidth = doc.internal.pageSize.getWidth() - 28;
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      y += 12;
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text('Vista del modelo', 14, y);
      y += 6;

      if (y + pdfHeight > doc.internal.pageSize.getHeight() - 24) {
        doc.addPage();
        y = 20;
      }

      doc.addImage(dataUrl, 'JPEG', 14, y, pdfWidth, pdfHeight);
    } catch (e) {
      logger.warn('No se pudo capturar el canvas 3D', e);
    }
  }

  // ── 4. Tabla de Recintos (Nueva Página) ──
  if (exportPrefs.includeMaterialsBreakdown !== false) {
    doc.addPage();
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text('Desglose Estructural', 14, 20);

    const tableData = recintosStore.recintos.map((r) => {
      const area = r.dimensions.w * r.dimensions.l;
      return [
        r.tipo.toUpperCase(),
        r.piso,
        `${r.dimensions.w.toFixed(2)}m x ${r.dimensions.l.toFixed(2)}m`,
        `${area.toFixed(2)} m²`,
      ];
    });

    doc.autoTable({
      startY: 28,
      head: [['Tipo de Recinto', 'Piso', 'Dimensiones (X-Z)', 'Área (m²)']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] }, // Emerald-500
      styles: { font: 'helvetica', fontSize: 9 },
    });
  }

  // ── 5. Presupuesto Final ──
  if (exportPrefs.includeUnitPrices !== false) {
    doc.addPage();
    let fy = 20;

    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text('Resumen Financiero (Tokens/CLP)', 14, fy);

    doc.setFontSize(11);
    fy += 10;
    doc.text(`Costo Estructural: $ ${costs.value.structural.toLocaleString()}`, 14, fy);
    fy += 7;
    doc.text(`Costo por Habitaciones: $ ${costs.value.rooms.toLocaleString()}`, 14, fy);
    fy += 7;
    doc.text(`Costo por Áreas Húmedas/Comunes: $ ${costs.value.wetAreas.toLocaleString()}`, 14, fy);

    doc.setFontSize(16);
    doc.setTextColor(16, 185, 129); // Emerald-500
    fy += 12;
    doc.text(`Costo Total Estimado: $ ${costs.value.total.toLocaleString()}`, 14, fy);
  }

  const footer = exportPrefs.reportFooter?.trim();
  if (footer) {
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const split = doc.splitTextToSize(footer, doc.internal.pageSize.getWidth() - 28);
    const blockH = split.length * 4.2;
    let footY = doc.internal.pageSize.getHeight() - 18 - blockH;
    if (footY < 14) {
      doc.addPage();
      footY = 20;
    }
    doc.text(split, 14, footY);
  }

  doc.save(`SIEC_Cotizacion_${projectName ? projectName.replace(/\s+/g, '_') : 'Proyecto'}.pdf`);
};
