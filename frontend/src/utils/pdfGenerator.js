import logger from "../utils/logger.js";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useRecintosStore } from "../stores/recintos";
import { MATERIAL_COSTS } from "../composables/useLayoutManager.js";
import { formatClp, getMaterialLabel } from "./budgetExportShared.js";
import { captureSceneImage } from "../proposal/proposalSceneCapture.js";
import {
  mergePreferences,
  defaultProductPreferences,
} from "../composables/useProductPreferences";

const BRAND = {
  ink: [15, 23, 42], // slate-950
  navy: [16, 42, 67],
  slate: [51, 65, 85],
  muted: [100, 116, 139],
  softMuted: [148, 163, 184],
  line: [226, 232, 240],
  rail: [248, 250, 252],
  railDark: [241, 245, 249],
  orange: [249, 115, 22],
  orangeSoft: [255, 247, 237],
  amber: [245, 158, 11],
  emerald: [5, 150, 105],
  white: [255, 255, 255],
  red: [220, 38, 38],
};

const PAGE = {
  width: 210,
  height: 297,
  marginX: 14,
  marginTop: 16,
  marginBottom: 18,
};

const formatNumber = (value, digits = 1) => {
  const n = Number(value);

  if (!Number.isFinite(n)) return "0";

  return n.toLocaleString("es-CL", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};

const sanitizeFilename = (value) => {
  return String(value || "Proyecto")
    .trim()
    .replace(/[^\w\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
};

const sumRecintosArea = (recintos) =>
  recintos.reduce((sum, recinto) => {
    const w = recinto.dimensions?.w ?? 0;
    const l = recinto.dimensions?.l ?? 0;

    return sum + w * l;
  }, 0);

const TABLE_THEME = {
  theme: "plain",
  margin: { left: PAGE.marginX, right: PAGE.marginX },
  styles: {
    font: "helvetica",
    fontSize: 8.2,
    cellPadding: 2.4,
    textColor: BRAND.slate,
    lineColor: BRAND.line,
    lineWidth: 0.15,
    valign: "middle",
  },
  headStyles: {
    fillColor: BRAND.ink,
    textColor: BRAND.white,
    fontStyle: "bold",
    fontSize: 7.2,
    cellPadding: 2.8,
  },
  alternateRowStyles: {
    fillColor: BRAND.rail,
  },
};

const addPageBackground = (doc) => {
  doc.setFillColor(...BRAND.white);
  doc.rect(0, 0, PAGE.width, PAGE.height, "F");

  // Soft top layer
  doc.setFillColor(...BRAND.rail);
  doc.rect(0, 0, PAGE.width, 38, "F");

  // Accent line
  doc.setFillColor(...BRAND.orange);
  doc.rect(0, 0, PAGE.width, 1.4, "F");
};

const addFooter = (doc, pageLabel, businessName) => {
  const footerY = PAGE.height - 13;

  doc.setFillColor(...BRAND.ink);
  doc.rect(0, footerY, PAGE.width, 13, "F");

  doc.setFillColor(...BRAND.orange);
  doc.rect(0, footerY, PAGE.width, 1.2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.8);
  doc.setTextColor(...BRAND.white);
  doc.text(String(businessName || "SIEC"), PAGE.marginX, footerY + 7.8, {
    maxWidth: 118,
  });

  doc.setFontSize(7);
  doc.setTextColor(253, 186, 116);
  doc.text(
    String(pageLabel || "").toUpperCase(),
    PAGE.width - PAGE.marginX,
    footerY + 7.8,
    {
      align: "right",
    },
  );
};

const addPageHeader = (doc, title, subtitle, pageLabel, businessName) => {
  addPageBackground(doc);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...BRAND.orange);
  doc.text("SIEC · COTIZACIÓN COMERCIAL", PAGE.marginX, 12);

  doc.setFontSize(18);
  doc.setTextColor(...BRAND.ink);
  doc.text(title, PAGE.marginX, 24, {
    maxWidth: 130,
  });

  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...BRAND.muted);
    doc.text(subtitle, PAGE.marginX, 31, {
      maxWidth: 150,
    });
  }

  addFooter(doc, pageLabel, businessName);
};

const roundedCard = (doc, x, y, w, h, options = {}) => {
  const { fill = BRAND.white, stroke = BRAND.line, radius = 4 } = options;

  doc.setFillColor(...fill);
  doc.setDrawColor(...stroke);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, w, h, radius, radius, "FD");
};

const metricCard = (doc, x, y, w, label, value, options = {}) => {
  const accent = options.accent === true;

  roundedCard(doc, x, y, w, 25, {
    fill: accent ? BRAND.orangeSoft : BRAND.white,
    stroke: accent ? [254, 215, 170] : BRAND.line,
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  doc.setTextColor(...(accent ? BRAND.orange : BRAND.muted));
  doc.text(String(label).toUpperCase(), x + 4, y + 7);

  doc.setFontSize(12);
  doc.setTextColor(...(accent ? [154, 52, 18] : BRAND.ink));
  doc.text(String(value), x + 4, y + 16.5, {
    maxWidth: w - 8,
  });
};

const addCover = (doc, payload) => {
  const {
    businessName,
    projectName,
    materialLabel,
    m2Terreno,
    areaRecintos,
    recintosCount,
    currentFloor,
    totalFormatted,
    exportPrefs,
  } = payload;

  doc.setFillColor(...BRAND.ink);
  doc.rect(0, 0, PAGE.width, PAGE.height, "F");

  // Premium visual layers
  doc.setFillColor(...BRAND.navy);
  doc.rect(0, 0, PAGE.width, 112, "F");

  doc.setFillColor(...BRAND.orange);
  doc.rect(0, 0, 4, PAGE.height, "F");

  doc.setFillColor(30, 41, 59);
  doc.rect(0, 112, PAGE.width, PAGE.height - 112, "F");

  doc.setFillColor(...BRAND.orange);
  doc.circle(184, 27, 21, "F");

  doc.setFillColor(251, 146, 60);
  doc.circle(188, 31, 13, "F");

  // Brand
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(PAGE.marginX, 18, 14, 14, 3, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...BRAND.orange);
  doc.text("S", PAGE.marginX + 5.2, 27.5);

  doc.setFontSize(11);
  doc.setTextColor(...BRAND.white);
  doc.text(businessName, PAGE.marginX + 19, 24, {
    maxWidth: 120,
  });

  doc.setFontSize(6.8);
  doc.setTextColor(...BRAND.softMuted);
  doc.text("INTELIGENCIA CONSTRUCTIVA", PAGE.marginX + 19, 29.5);

  doc.setDrawColor(253, 186, 116);
  doc.setFillColor(249, 115, 22);
  doc.roundedRect(150, 19, 42, 9, 4.5, 4.5, "FD");

  doc.setFontSize(6.4);
  doc.setTextColor(...BRAND.white);
  doc.text("RESUMEN RÁPIDO", 171, 25, {
    align: "center",
  });

  // Hero
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(253, 186, 116);
  doc.text("COTIZACIÓN COMERCIAL", PAGE.marginX, 72);

  doc.setFontSize(29);
  doc.setTextColor(...BRAND.white);
  doc.text(projectName, PAGE.marginX, 91, {
    maxWidth: 138,
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(203, 213, 225);
  doc.text(
    `Diseño estructural referencial · ${materialLabel}`,
    PAGE.marginX,
    104,
    {
      maxWidth: 142,
    },
  );

  // Total card
  roundedCard(doc, 130, 132, 62, 45, {
    fill: [15, 23, 42],
    stroke: [251, 146, 60],
    radius: 5,
  });

  doc.setFillColor(...BRAND.orange);
  doc.rect(130, 132, 2.2, 45, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  doc.setTextColor(253, 186, 116);
  doc.text("INVERSIÓN ESTIMADA", 136, 143);

  doc.setFontSize(15);
  doc.setTextColor(...BRAND.white);
  doc.text(totalFormatted, 136, 156, {
    maxWidth: 48,
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(203, 213, 225);
  doc.text(
    "Resumen por superficie. Use Propuesta premium para insumos y condiciones.",
    136,
    166,
    {
      maxWidth: 48,
    },
  );

  // Meta grid
  const metaY = 132;
  const metaX = PAGE.marginX;
  const metaW = 105;

  roundedCard(doc, metaX, metaY, metaW, 45, {
    fill: [248, 250, 252],
    stroke: [226, 232, 240],
    radius: 5,
  });

  const meta = [
    ["Fecha", new Date().toLocaleDateString("es-CL")],
    ["Terreno", `${formatNumber(m2Terreno, 1)} m²`],
    ["Recintos", String(recintosCount)],
    ["Pisos", String(currentFloor)],
  ];

  meta.forEach(([label, value], index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = metaX + 5 + col * 50;
    const y = metaY + 10 + row * 18;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...BRAND.muted);
    doc.text(label.toUpperCase(), x, y);

    doc.setFontSize(10);
    doc.setTextColor(...BRAND.ink);
    doc.text(value, x, y + 6);
  });

  // Lower summary
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...BRAND.white);
  doc.text("Documento resumido", PAGE.marginX, 207);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.6);
  doc.setTextColor(203, 213, 225);
  doc.text(
    [
      `Cotización rápida para ${projectName}: ${formatNumber(m2Terreno, 1)} m² de terreno y ${formatNumber(areaRecintos, 1)} m² modelados.`,
      "Para desglose de insumos, condiciones comerciales y firmas, exporte Propuesta premium desde el panel de presupuesto.",
    ],
    PAGE.marginX,
    218,
    {
      maxWidth: 165,
      lineHeightFactor: 1.45,
    },
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...BRAND.softMuted);
  doc.text(
    exportPrefs.reportFooter?.trim() ||
      "Documento generado automáticamente por SIEC.",
    PAGE.marginX,
    277,
    {
      maxWidth: 150,
    },
  );
};

const addSnapshotPage = (doc, payload) => {
  const { snapshotDataUrl, businessName } = payload;

  doc.addPage();
  addPageHeader(
    doc,
    "Vista del modelo",
    "Captura referencial del modelo 3D asociado a la estimación.",
    "Vista 3D",
    businessName,
  );

  if (!snapshotDataUrl) {
    roundedCard(doc, PAGE.marginX, 52, 182, 92, {
      fill: BRAND.rail,
      stroke: BRAND.line,
      radius: 5,
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...BRAND.muted);
    doc.text(
      "No hay captura disponible para este proyecto.",
      PAGE.width / 2,
      98,
      {
        align: "center",
      },
    );

    return;
  }

  try {
    const imgProps = doc.getImageProperties(snapshotDataUrl);
    const maxWidth = PAGE.width - PAGE.marginX * 2;
    const maxHeight = 170;

    let imageWidth = maxWidth;
    let imageHeight = (imgProps.height * imageWidth) / imgProps.width;

    if (imageHeight > maxHeight) {
      imageHeight = maxHeight;
      imageWidth = (imgProps.width * imageHeight) / imgProps.height;
    }

    const x = (PAGE.width - imageWidth) / 2;
    const y = 52;

    roundedCard(doc, PAGE.marginX, y - 5, maxWidth, imageHeight + 10, {
      fill: BRAND.white,
      stroke: BRAND.line,
      radius: 5,
    });

    doc.addImage(snapshotDataUrl, "JPEG", x, y, imageWidth, imageHeight);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...BRAND.muted);
    doc.text(
      "Imagen referencial generada desde el visor 3D. No reemplaza planos técnicos ni especificaciones constructivas.",
      PAGE.marginX,
      y + imageHeight + 16,
      {
        maxWidth,
      },
    );
  } catch (error) {
    logger.warn("No se pudo insertar captura 3D en el PDF", error);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...BRAND.red);
    doc.text("No se pudo insertar la captura 3D.", PAGE.marginX, 58);
  }
};

const addRoomsBreakdownPage = (doc, payload) => {
  const { recintos, businessName, totalFormatted, materialLabel, m2Terreno, areaRecintos, rate } = payload;

  doc.addPage();

  addPageHeader(
    doc,
    "Desglose estructural",
    "Detalle de recintos con áreas y resumen de inversión.",
    "Desglose",
    businessName,
  );

  metricCard(doc, PAGE.marginX, 46, 55, "Material", materialLabel);
  metricCard(
    doc,
    PAGE.marginX + 63,
    46,
    55,
    "Valor m²",
    formatClp(rate),
  );
  metricCard(doc, PAGE.marginX + 126, 46, 56, "Total", totalFormatted, {
    accent: true,
  });

  const tableData = recintos.map((recinto) => {
    const area = (recinto.dimensions?.w ?? 0) * (recinto.dimensions?.l ?? 0);

    return [
      String(recinto.nombre || recinto.tipo || "Recinto"),
      String(recinto.tipo || "recinto").toUpperCase(),
      String(recinto.piso ?? 1),
      `${formatNumber(recinto.dimensions?.w ?? 0, 2)} m × ${formatNumber(recinto.dimensions?.l ?? 0, 2)} m`,
      `${formatNumber(area, 2)} m²`,
    ];
  });

  autoTable(doc, {
    startY: 84,
    head: [["Nombre", "Tipo", "Piso", "Dimensiones", "Área"]],
    body: tableData.length
      ? tableData
      : [["—", "—", "—", "Sin recintos modelados", "0 m²"]],
    ...TABLE_THEME,
    columnStyles: {
      2: { halign: "center", cellWidth: 18 },
      4: { halign: "right", cellWidth: 24 },
    },
  });

  const noteY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 12 : 142;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.muted);
  doc.text(
    `Resumen: ${formatNumber(m2Terreno, 1)} m² terreno · ${formatNumber(areaRecintos, 1)} m² recintos · Total ${totalFormatted}`,
    PAGE.marginX,
    noteY,
    { maxWidth: PAGE.width - PAGE.marginX * 2 },
  );
};

const addFinancialPage = (doc, payload) => {
  const {
    businessName,
    materialLabel,
    m2Terreno,
    areaRecintos,
    rate,
    costoTerreno,
    costoRecintos,
    costoTotal,
    tokensUsados,
    tokensTotales,
    tokensDisponibles,
  } = payload;

  const totalFormatted = formatClp(costoTotal);

  doc.addPage();

  addPageHeader(
    doc,
    "Resumen por superficie",
    "Cotización rápida. Para insumos, IVA y condiciones use Propuesta premium.",
    "Resumen",
    businessName,
  );

  metricCard(doc, PAGE.marginX, 46, 55, "Material", materialLabel);
  metricCard(
    doc,
    PAGE.marginX + 63,
    46,
    55,
    "Valor m²",
    formatClp(rate),
  );
  metricCard(doc, PAGE.marginX + 126, 46, 56, "Total", totalFormatted, {
    accent: true,
  });

  autoTable(doc, {
    startY: 84,
    head: [["Concepto", "Base", "Monto"]],
    body: [
      [
        "Terreno",
        `${formatNumber(m2Terreno, 1)} m² × ${formatClp(rate)}`,
        formatClp(costoTerreno),
      ],
      [
        "Recintos modelados",
        `${formatNumber(areaRecintos, 1)} m² × ${formatClp(rate)}`,
        formatClp(costoRecintos),
      ],
      ["Total referencial", "Terreno + recintos", totalFormatted],
      [
        "Tokens de diseño",
        `${tokensUsados} / ${tokensTotales}`,
        `${tokensDisponibles} disp.`,
      ],
    ],
    ...TABLE_THEME,
    columnStyles: {
      2: { halign: "right", fontStyle: "bold" },
    },
    didParseCell: (data) => {
      const isTotal =
        data.section === "body" &&
        String(data.row.raw?.[0] || "") === "Total referencial";

      if (isTotal) {
        data.cell.styles.fillColor = BRAND.orangeSoft;
        data.cell.styles.textColor = [154, 52, 18];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  const noteY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : 142;

  roundedCard(doc, PAGE.marginX, noteY, PAGE.width - PAGE.marginX * 2, 28, {
    fill: BRAND.orangeSoft,
    stroke: [254, 215, 170],
    radius: 5,
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(154, 52, 18);
  doc.text(
    "¿Necesita desglose de insumos, contingencia, IVA, condiciones y firmas? Exporte Propuesta premium desde el panel de presupuesto.",
    PAGE.marginX + 5,
    noteY + 10,
    { maxWidth: PAGE.width - PAGE.marginX * 2 - 10, lineHeightFactor: 1.4 },
  );
};

const addReportFooterPage = (doc, payload) => {
  const { businessName, footer } = payload;

  if (!footer) return;

  doc.addPage();

  addPageHeader(
    doc,
    "Observaciones finales",
    "Notas comerciales y consideraciones anexas definidas para este reporte.",
    "Observaciones",
    businessName,
  );

  roundedCard(doc, PAGE.marginX, 50, PAGE.width - PAGE.marginX * 2, 70, {
    fill: [255, 251, 235],
    stroke: [253, 230, 138],
    radius: 5,
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(146, 64, 14);
  doc.text("Comentario del reporte", PAGE.marginX + 5, 60);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.6);
  doc.setTextColor(120, 53, 15);

  const split = doc.splitTextToSize(footer, PAGE.width - PAGE.marginX * 2 - 10);

  doc.text(split, PAGE.marginX + 5, 70, {
    lineHeightFactor: 1.45,
  });
};

/**
 * PDF comercial resumido (Exportar en barra superior).
 * Para insumos, condiciones y propuesta completa → Propuesta premium en presupuesto.
 *
 * @param {HTMLCanvasElement | null | undefined} canvasElement
 * @param {string} [projectName]
 * @param {{
 *   export?: Record<string, unknown>,
 *   snapshotDataUrl?: string | null,
 *   m2Totales?: number,
 *   materialEstructuralId?: number,
 *   tokensUsados?: number,
 *   tokensTotales?: number,
 *   tokensDisponibles?: number,
 * }} [options]
 */
export const generateCommercialPDF = async (
  canvasElement,
  projectName,
  options = {},
) => {
  const exportPrefs = mergePreferences(defaultProductPreferences(), {
    export: options.export || {},
  }).export;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const recintosStore = useRecintosStore();

  const m2Terreno = Number(
    options.m2Totales ?? recintosStore.configMetadata?.m2Totales ?? 0,
  );

  const materialId = Number(
    options.materialEstructuralId ??
      recintosStore.configMetadata?.materialEstructuralId ??
      4,
  );

  const rate = MATERIAL_COSTS[materialId] || MATERIAL_COSTS[4];
  const recintos = recintosStore.recintos || [];
  const areaRecintos = sumRecintosArea(recintos);
  const costoTerreno = m2Terreno * rate;
  const costoRecintos = areaRecintos * rate;
  const costoTotal = costoTerreno + costoRecintos;

  const businessName =
    exportPrefs.businessName && String(exportPrefs.businessName).trim()
      ? String(exportPrefs.businessName).trim()
      : "SIEC - Inteligencia Constructiva";

  const safeProjectName = projectName || "Proyecto sin título";
  const materialLabel = getMaterialLabel(materialId);

  let snapshotDataUrl = options.snapshotDataUrl ?? null;

  if (exportPrefs.includeSnapshots !== false && !snapshotDataUrl) {
    snapshotDataUrl = await captureSceneImage();
  }

  const payload = {
    businessName,
    projectName: safeProjectName,
    materialLabel,
    m2Terreno,
    areaRecintos,
    recintos,
    recintosCount: recintos.length,
    currentFloor: recintosStore.currentFloor || 1,
    rate,
    costoTerreno,
    costoRecintos,
    costoTotal,
    totalFormatted: formatClp(costoTotal),
    snapshotDataUrl,
    exportPrefs,
    tokensUsados: Number(options.tokensUsados ?? 0),
    tokensTotales: Number(options.tokensTotales ?? 0),
    tokensDisponibles: Number(options.tokensDisponibles ?? 0),
    footer: exportPrefs.reportFooter?.trim(),
  };

  addCover(doc, payload);
  addRoomsBreakdownPage(doc, payload);

  const safeName = sanitizeFilename(safeProjectName);

  doc.save(`SIEC_Cotizacion_${safeName}.pdf`);
};
