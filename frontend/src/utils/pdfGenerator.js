import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { useRecintosStore } from '../stores/recintos';
import { useTokenCounter } from '../composables/useTokenCounter';
import { MATERIAL_COSTS } from '../composables/useLayoutManager';

export const generateCommercialPDF = async (canvasElement, projectName) => {
  const doc = new jsPDF();
  const recintosStore = useRecintosStore();
  const { costs, m2Totales } = useTokenCounter();

  // ── 1. Cabecera y Datos ──
  doc.setFontSize(22);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text("SIEC - Inteligencia Constructiva", 14, 20);
  
  doc.setFontSize(12);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text("Cotización Comercial de Diseño Estructural", 14, 28);
  doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 34);
  doc.text(`Proyecto: ${projectName || "Sin Título"}`, 14, 40);

  // ── 2. Resumen Arquitectónico ──
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text("Resumen del Proyecto", 14, 55);
  
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(`Área Total Estimada: ${m2Totales.value.toFixed(2)} m²`, 14, 63);
  doc.text(`Cantidad de Pisos: ${recintosStore.currentFloor}`, 14, 69);
  doc.text(`Total de Recintos: ${recintosStore.recintos.length}`, 14, 75);

  // ── 3. Captura del Canvas 3D ──
  if (canvasElement) {
    try {
      // Forzar un render para asegurar que el buffer no esté vacío (preserveDrawingBuffer)
      const dataUrl = canvasElement.toDataURL('image/jpeg', 0.8);
      // Calcular aspecto
      const imgProps = doc.getImageProperties(dataUrl);
      const pdfWidth = doc.internal.pageSize.getWidth() - 28;
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      doc.addImage(dataUrl, 'JPEG', 14, 85, pdfWidth, pdfHeight);
    } catch (e) {
      console.warn("No se pudo capturar el canvas 3D", e);
    }
  }

  // ── 4. Tabla de Recintos (Nueva Página) ──
  doc.addPage();
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text("Desglose Estructural", 14, 20);

  const tableData = recintosStore.recintos.map(r => {
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
    styles: { font: 'helvetica', fontSize: 9 }
  });

  // ── 5. Presupuesto Final ──
  const finalY = doc.lastAutoTable.finalY || 28;
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text("Resumen Financiero (Tokens/CLP)", 14, finalY + 15);

  doc.setFontSize(11);
  doc.text(`Costo Estructural: $ ${costs.value.structural.toLocaleString()}`, 14, finalY + 25);
  doc.text(`Costo por Habitaciones: $ ${costs.value.rooms.toLocaleString()}`, 14, finalY + 32);
  doc.text(`Costo por Áreas Húmedas/Comunes: $ ${costs.value.wetAreas.toLocaleString()}`, 14, finalY + 39);
  
  doc.setFontSize(16);
  doc.setTextColor(16, 185, 129); // Emerald-500
  doc.text(`Costo Total Estimado: $ ${costs.value.total.toLocaleString()}`, 14, finalY + 50);

  // Descargar
  doc.save(`SIEC_Cotizacion_${projectName ? projectName.replace(/\s+/g, '_') : 'Proyecto'}.pdf`);
};
