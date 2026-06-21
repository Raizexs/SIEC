import ExcelJS from 'exceljs';
import {
  formatClp,
  formatExportDate,
  formatNumber,
  normalizeDesglose,
} from './budgetExportShared.js';

/** Colores ARGB alineados con SIEC (navy / orange / emerald). */
const XL = {
  navy: 'FF0F172A',
  navyMid: 'FF1E293B',
  orange: 'FFF97316',
  orangeSoft: 'FFFFF7ED',
  emerald: 'FF059669',
  emeraldSoft: 'FFECFDF5',
  white: 'FFFFFFFF',
  muted: 'FF64748B',
  stripe: 'FFF8FAFC',
  border: 'FFCBD5E1',
};

const CSV_SEP = ';';

const thinBorder = {
  top: { style: 'thin', color: { argb: XL.border } },
  left: { style: 'thin', color: { argb: XL.border } },
  bottom: { style: 'thin', color: { argb: XL.border } },
  right: { style: 'thin', color: { argb: XL.border } },
};

const getBusinessTitle = (payload) =>
  (payload.businessName && String(payload.businessName).trim()) ||
  'SIEC — Inteligencia Constructiva';

const buildFinancialLines = (payload) => {
  const lines = [{ label: 'Subtotal motor', amount: payload.motorTotal }];

  if (payload.contingencyPct > 0) {
    lines.push({
      label: `Contingencia (${payload.contingencyPct}%)`,
      amount: payload.deltaContingencia,
    });
    lines.push({
      label: 'Subtotal con contingencia',
      amount: payload.subtotalConContingencia,
    });
  }

  if (payload.includeTax && payload.montoIva > 0) {
    lines.push({ label: 'IVA referencial (19%)', amount: payload.montoIva });
  }

  lines.push({
    label: 'Total estimado',
    amount: payload.totalPreferido ?? payload.motorTotal,
    highlight: true,
  });

  return lines;
};

const buildMetaPairs = (payload) => [
  ['Empresa / emisor', getBusinessTitle(payload)],
  ['Proyecto', payload.projectName || 'Sin título'],
  ['Fecha de exportación', formatExportDate(payload.fechaExportacion)],
  ['Superficie calculada', `${formatNumber(payload.m2Totales, 0)} m²`],
  ['Material estructural', payload.materialNombre || '—'],
  ['Precios de mercado al', formatExportDate(payload.fechaPrecios)],
];

const escapeCsvCell = (value) => {
  const str = value == null ? '' : String(value);

  if (/[";\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
};

const csvLine = (cells) => cells.map(escapeCsvCell).join(CSV_SEP);

const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

/**
 * CSV estructurado para usuario final (Excel Chile abre bien con `;` y BOM).
 * @param {Record<string, unknown>} payload
 * @param {(name: string, ext: string) => string} buildFilename
 */
export const exportBudgetCSV = (payload, buildFilename) => {
  const lines = [];
  const desglose = normalizeDesglose(payload.desglose);

  lines.push(csvLine(['SIEC — Presupuesto detallado']));
  lines.push(csvLine(['Documento generado por SIEC Cloud']));
  lines.push('');

  lines.push(csvLine(['INFORMACIÓN DEL PROYECTO']));
  for (const [label, value] of buildMetaPairs(payload)) {
    lines.push(csvLine([label, value]));
  }

  lines.push('');
  lines.push(csvLine(['RESUMEN FINANCIERO (CLP)']));
  lines.push(csvLine(['Concepto', 'Monto']));
  for (const row of buildFinancialLines(payload)) {
    lines.push(
      csvLine([
        row.label,
        row.highlight
          ? payload.totalFormatted || formatClp(row.amount)
          : formatClp(row.amount),
      ]),
    );
  }

  lines.push('');
  lines.push(csvLine(['DESGLOSE DE INSUMOS']));
  lines.push(
    csvLine([
      'Categoría',
      'Insumo',
      'Cantidad',
      'Unidad',
      'Precio unitario (CLP)',
      'Subtotal (CLP)',
    ]),
  );

  for (const cat of desglose) {
    for (const item of cat.items || []) {
      lines.push(
        csvLine([
          cat.categoria,
          item.insumo || '—',
          formatNumber(item.cantidad),
          item.unidad || '—',
          formatClp(item.precio_unitario),
          formatClp(item.subtotal),
        ]),
      );
    }

    lines.push(
      csvLine([
        cat.categoria,
        `— Subtotal ${cat.categoria} —`,
        '',
        '',
        '',
        formatClp(cat.subtotal_categoria),
      ]),
    );
  }

  const grandTotal = desglose.reduce((s, cat) => s + (cat.subtotal_categoria || 0), 0);
  lines.push('');
  lines.push(csvLine(['', '', '', '', 'TOTAL GENERAL', formatClp(grandTotal)]));

  lines.push('');
  lines.push(
    csvLine([
      'Nota',
      'Valores referenciales en CLP según disponibilidad de precios de mercado. Sujeto a validación técnica y comercial.',
    ]),
  );

  if (payload.reportFooter?.trim()) {
    lines.push(csvLine(['Pie de informe', payload.reportFooter.trim()]));
  }

  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], {
    type: 'text/csv;charset=utf-8',
  });

  triggerDownload(blob, buildFilename(payload.projectName, 'csv'));
};

const styleTitleRow = (sheet, rowNum, text, colSpan = 6) => {
  sheet.mergeCells(rowNum, 1, rowNum, colSpan);
  const cell = sheet.getCell(rowNum, 1);
  cell.value = text;
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL.navy } };
  cell.font = { bold: true, size: 14, color: { argb: XL.white } };
  cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(rowNum).height = 28;
};

const styleSectionLabel = (sheet, rowNum, text, colSpan = 6) => {
  sheet.mergeCells(rowNum, 1, rowNum, colSpan);
  const cell = sheet.getCell(rowNum, 1);
  cell.value = text;
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL.orangeSoft } };
  cell.font = { bold: true, size: 10, color: { argb: XL.navy } };
  cell.border = thinBorder;
  sheet.getRow(rowNum).height = 20;
};

const styleKeyValue = (sheet, rowNum, label, value) => {
  const labelCell = sheet.getCell(rowNum, 1);
  const valueCell = sheet.getCell(rowNum, 2);
  labelCell.value = label;
  valueCell.value = value;
  labelCell.font = { bold: true, size: 9, color: { argb: XL.muted } };
  valueCell.font = { size: 10, color: { argb: XL.navy } };
  labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL.stripe } };
  valueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL.white } };
  labelCell.border = thinBorder;
  valueCell.border = thinBorder;
  sheet.mergeCells(rowNum, 2, rowNum, 4);
};

const buildResumenSheet = (workbook, payload) => {
  const sheet = workbook.addWorksheet('Resumen', {
    views: [{ showGridLines: false }],
    properties: { defaultRowHeight: 18 },
  });

  sheet.columns = [
    { width: 28 },
    { width: 22 },
    { width: 14 },
    { width: 14 },
    { width: 16 },
    { width: 16 },
  ];

  let r = 1;
  styleTitleRow(sheet, r, getBusinessTitle(payload));
  r += 1;

  sheet.mergeCells(r, 1, r, 6);
  const subtitle = sheet.getCell(r, 1);
  subtitle.value = 'Presupuesto detallado · SIEC Cloud';
  subtitle.font = { size: 9, italic: true, color: { argb: XL.muted } };
  r += 2;

  styleSectionLabel(sheet, r, 'Información del proyecto');
  r += 1;

  for (const [label, value] of buildMetaPairs(payload)) {
    styleKeyValue(sheet, r, label, value);
    r += 1;
  }

  r += 1;
  styleSectionLabel(sheet, r, 'Resumen financiero (CLP)');
  r += 1;

  const finHeader = sheet.getRow(r);
  finHeader.values = ['Concepto', 'Monto (CLP)', '', '', '', ''];
  finHeader.eachCell((cell, col) => {
    if (col <= 2) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL.navyMid } };
      cell.font = { bold: true, color: { argb: XL.white }, size: 9 };
      cell.border = thinBorder;
    }
  });
  sheet.mergeCells(r, 2, r, 4);
  r += 1;

  for (const line of buildFinancialLines(payload)) {
    const row = sheet.getRow(r);
    row.values = [line.label, line.amount ?? null, '', '', '', ''];
    sheet.mergeCells(r, 2, r, 4);

    const amountCell = sheet.getCell(r, 2);
    if (line.amount != null && Number.isFinite(Number(line.amount))) {
      amountCell.numFmt = '"$"#,##0';
      amountCell.value = Number(line.amount);
    } else {
      amountCell.value = 'N/D';
    }

    row.eachCell((cell, col) => {
      if (col > 2) return;
      cell.border = thinBorder;
      cell.font = { size: 10, color: { argb: XL.navy } };

      if (line.highlight) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL.emeraldSoft } };
        cell.font = { bold: true, size: 11, color: { argb: XL.emerald } };
      } else if (r % 2 === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL.stripe } };
      }
    });

    if (line.highlight && payload.totalFormatted) {
      amountCell.value = payload.totalFormatted;
      amountCell.numFmt = '@';
    }

    r += 1;
  }

  r += 1;
  sheet.mergeCells(r, 1, r + 1, 6);
  const note = sheet.getCell(r, 1);
  note.value =
    'Nota: montos referenciales en CLP según motor de insumos y precios de mercado. No constituye oferta comercial vinculante.';
  note.font = { size: 8, italic: true, color: { argb: XL.muted } };
  note.alignment = { wrapText: true, vertical: 'top' };
  sheet.getRow(r).height = 32;

  if (payload.reportFooter?.trim()) {
    r += 2;
    sheet.mergeCells(r, 1, r, 6);
    const foot = sheet.getCell(r, 1);
    foot.value = payload.reportFooter.trim();
    foot.font = { size: 8, color: { argb: XL.muted } };
    foot.alignment = { wrapText: true };
  }
};

const buildDesgloseSheet = (workbook, payload) => {
  const sheet = workbook.addWorksheet('Desglose', {
    views: [{ state: 'frozen', ySplit: 3, showGridLines: false }],
  });

  sheet.columns = [
    { width: 22 },
    { width: 38 },
    { width: 12 },
    { width: 10 },
    { width: 18 },
    { width: 18 },
  ];

  sheet.mergeCells(1, 1, 1, 6);
  const title = sheet.getCell(1, 1);
  title.value = 'Desglose de insumos por categoría';
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL.navy } };
  title.font = { bold: true, size: 12, color: { argb: XL.white } };
  sheet.getRow(1).height = 24;

  const headers = [
    'Categoría',
    'Insumo',
    'Cantidad',
    'Unidad',
    'Precio unitario (CLP)',
    'Subtotal (CLP)',
  ];
  const headerRow = sheet.getRow(3);
  headerRow.values = headers;
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL.navyMid } };
    cell.font = { bold: true, size: 9, color: { argb: XL.white } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = thinBorder;
  });

  let r = 4;
  const desglose = normalizeDesglose(payload.desglose);

  for (const cat of desglose) {
    sheet.mergeCells(r, 1, r, 6);
    const band = sheet.getCell(r, 1);
    band.value = `${cat.categoria} · Subtotal: ${formatClp(cat.subtotal_categoria)}`;
    band.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL.orangeSoft } };
    band.font = { bold: true, size: 10, color: { argb: XL.navy } };
    band.border = thinBorder;
    sheet.getRow(r).height = 20;
    r += 1;

    let stripe = false;
    for (const item of cat.items || []) {
      const row = sheet.getRow(r);
      row.values = [
        cat.categoria,
        item.insumo || '—',
        item.cantidad != null ? Number(item.cantidad) : null,
        item.unidad || '—',
        item.precio_unitario != null ? Number(item.precio_unitario) : null,
        item.subtotal != null ? Number(item.subtotal) : null,
      ];

      row.eachCell((cell, col) => {
        cell.border = thinBorder;
        cell.font = { size: 9, color: { argb: XL.navy } };

        if (stripe) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL.stripe } };
        }

        if (col === 3) {
          cell.numFmt = '#,##0.##';
          cell.alignment = { horizontal: 'right' };
        }
        if (col === 5 || col === 6) {
          cell.numFmt = '"$"#,##0';
          cell.alignment = { horizontal: 'right' };
          if (col === 6) cell.font = { ...cell.font, bold: true };
        }
      });

      stripe = !stripe;
      r += 1;
    }
  }

  if (desglose.length === 0) {
    sheet.mergeCells(r, 1, r, 6);
    const empty = sheet.getCell(r, 1);
    empty.value =
      'No hay insumos en el desglose. Verifica recintos seleccionados y material estructural.';
    empty.font = { italic: true, color: { argb: XL.muted } };
    empty.alignment = { horizontal: 'center' };
    return;
  }

  r += 1;
  const totalSub = desglose.reduce((s, cat) => s + (cat.subtotal_categoria || 0), 0);
  sheet.mergeCells(r, 1, r, 5);
  const totalLabel = sheet.getCell(r, 1);
  totalLabel.value = 'TOTAL GENERAL';
  totalLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL.navy } };
  totalLabel.font = { bold: true, size: 12, color: { argb: XL.white } };
  totalLabel.border = thinBorder;
  totalLabel.alignment = { horizontal: 'right' };
  const totalVal = sheet.getCell(r, 6);
  totalVal.value = totalSub;
  totalVal.numFmt = '"$"#,##0';
  totalVal.font = { bold: true, size: 12, color: { argb: XL.white } };
  totalVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL.navy } };
  totalVal.border = thinBorder;
  totalVal.alignment = { horizontal: 'right' };
  sheet.getRow(r).height = 24;
};

/**
 * @param {Record<string, unknown>} payload
 * @param {(name: string, ext: string) => string} buildFilename
 */
export const exportBudgetExcel = async (payload, buildFilename) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SIEC Cloud';
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.properties.date1904 = false;

  buildResumenSheet(workbook, payload);
  buildDesgloseSheet(workbook, payload);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  triggerDownload(blob, buildFilename(payload.projectName, 'xlsx'));
};
