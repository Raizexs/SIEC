/**
 * Plano arquitectónico PDF — alineado al presupuesto SIEC.
 * Cotas exactas al contorno del layout, muros desde topología.
 */
import jsPDF from "jspdf";
import { extractTopologyFromRecintos } from "../composables/useTopologyExtractor.js";
import { roomTypeLabel } from "./roomTypeColors.js";
import { resolveRecintoFill2d } from "./recinto2dColors.js";

const WALL_THICKNESS = 0.15;
const DIM_OFFSET = 11;
const SHEET_PAD = 18;
const HEADER_H = 30;
const FOOTER_H = 7;

const SIEC = {
  ink: [15, 23, 42],
  ink2: [30, 41, 59],
  slate: [51, 65, 85],
  muted: [100, 116, 139],
  line: [226, 232, 240],
  paper: [255, 255, 255],
  orange: [249, 115, 22],
};

const hexToRgb = (hex, alpha = 1) => {
  const m = String(hex).replace("#", "");
  const r = parseInt(m.substring(0, 2), 16);
  const g = parseInt(m.substring(2, 4), 16);
  const b = parseInt(m.substring(4, 6), 16);
  if (alpha >= 1) return [r, g, b];
  return [
    Math.round(r * alpha + 255 * (1 - alpha)),
    Math.round(g * alpha + 255 * (1 - alpha)),
    Math.round(b * alpha + 255 * (1 - alpha)),
  ];
};

const computeLayoutBounds = (recintos) => {
  let minX = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;

  for (const r of recintos) {
    minX = Math.min(minX, r.coords.x);
    minZ = Math.min(minZ, r.coords.z);
    maxX = Math.max(maxX, r.coords.x + r.dimensions.w);
    maxZ = Math.max(maxZ, r.coords.z + r.dimensions.l);
  }

  return {
    minX,
    minZ,
    maxX,
    maxZ,
    width: maxX - minX,
    depth: maxZ - minZ,
  };
};

const drawDimArrow = (doc, x, y, angle) => {
  const len = 1.6;
  doc.line(x, y, x + Math.cos(angle + 2.6) * len, y + Math.sin(angle + 2.6) * len);
  doc.line(x, y, x + Math.cos(angle - 2.6) * len, y + Math.sin(angle - 2.6) * len);
};

const drawHorizontalDimension = (doc, x1, x2, y, label) => {
  const dimY = y + DIM_OFFSET;
  doc.setDrawColor(...SIEC.line);
  doc.setLineWidth(0.12);
  doc.line(x1, y, x1, dimY + 1);
  doc.line(x2, y, x2, dimY + 1);

  doc.setDrawColor(...SIEC.slate);
  doc.setLineWidth(0.3);
  doc.line(x1, dimY, x2, dimY);
  drawDimArrow(doc, x1, dimY, Math.PI);
  drawDimArrow(doc, x2, dimY, 0);

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...SIEC.ink);
  doc.text(label, (x1 + x2) / 2, dimY - 2, { align: "center" });
};

const drawVerticalDimension = (doc, y1, y2, x, label) => {
  const dimX = x + DIM_OFFSET;
  doc.setDrawColor(...SIEC.line);
  doc.setLineWidth(0.12);
  doc.line(x, y1, dimX + 1, y1);
  doc.line(x, y2, dimX + 1, y2);

  doc.setDrawColor(...SIEC.slate);
  doc.setLineWidth(0.3);
  doc.line(dimX, y1, dimX, y2);
  drawDimArrow(doc, dimX, y1, -Math.PI / 2);
  drawDimArrow(doc, dimX, y2, Math.PI / 2);

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...SIEC.ink);
  doc.text(label, dimX + 2.5, (y1 + y2) / 2, { align: "left", angle: 90 });
};

const drawTitleBlock = (doc, options) => {
  const { projectName, material, m2, brandLogoDataUrl, floor, totalFloors, scaleLabel } =
    options;
  const W = doc.internal.pageSize.getWidth();

  doc.setFillColor(...SIEC.ink);
  doc.rect(0, 0, W, HEADER_H, "F");
  doc.setFillColor(...SIEC.orange);
  doc.rect(0, HEADER_H - 1, W, 1, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("SIEC · Plano Arquitectónico", 14, 12);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(203, 213, 225);
  doc.text(`Proyecto: ${projectName}`, 14, 18);

  const meta = [
    material,
    `${m2} m² total`,
    `Piso ${floor}/${totalFloors}`,
    scaleLabel,
    new Date().toLocaleDateString(),
  ].join("   ·   ");
  doc.text(meta, 14, 24);

  if (brandLogoDataUrl) {
    try {
      doc.addImage(brandLogoDataUrl, "PNG", W - 50, 5, 36, 18);
    } catch {
      /* ignore */
    }
  }

  return HEADER_H;
};

const drawWallSegment = (doc, seg, ox, oy, scale, isExterior) => {
  const x1 = ox + seg.start.x * scale;
  const y1 = oy + seg.start.z * scale;
  const x2 = ox + seg.end.x * scale;
  const y2 = oy + seg.end.z * scale;
  const lw = Math.max(0.45, WALL_THICKNESS * scale);

  doc.setDrawColor(...(isExterior ? SIEC.ink : SIEC.ink2));
  doc.setLineWidth(lw);
  doc.setLineCap("square");
  doc.line(x1, y1, x2, y2);
};

const drawRoomFill = (doc, recinto, ox, oy, scale) => {
  const x = ox + recinto.coords.x * scale;
  const y = oy + recinto.coords.z * scale;
  const w = recinto.dimensions.w * scale;
  const h = recinto.dimensions.l * scale;
  const fill = resolveRecintoFill2d(recinto);
  const area = recinto.dimensions.w * recinto.dimensions.l;
  const label = recinto.nombre?.trim() || roomTypeLabel(recinto.tipo);
  const tipoLabel = roomTypeLabel(recinto.tipo);

  doc.setFillColor(...hexToRgb(fill, 0.14));
  doc.rect(x, y, w, h, "F");

  const cx = x + w / 2;
  const cy = y + h / 2;
  const fsTitle = Math.min(10, Math.max(6.5, Math.min(w, h) * 0.14));

  doc.setTextColor(...SIEC.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(fsTitle);
  doc.text(label, cx, cy - 3, { align: "center" });

  if (label !== tipoLabel) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(Math.max(5.5, fsTitle - 1.5));
    doc.setTextColor(...SIEC.muted);
    doc.text(tipoLabel, cx, cy + 0.5, { align: "center" });
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(Math.max(5.5, fsTitle - 2));
  doc.setTextColor(...SIEC.slate);
  doc.text(
    `${recinto.dimensions.w.toFixed(2)} × ${recinto.dimensions.l.toFixed(2)} m`,
    cx,
    cy + (label !== tipoLabel ? 4.5 : 2),
    { align: "center" },
  );

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...SIEC.orange);
  doc.text(`${area.toFixed(1)} m²`, cx, cy + (label !== tipoLabel ? 8 : 5.5), {
    align: "center",
  });
};

const drawDoorSymbols = (doc, recinto, ox, oy, scale) => {
  const x = ox + recinto.coords.x * scale;
  const y = oy + recinto.coords.z * scale;
  const w = recinto.dimensions.w * scale;
  const h = recinto.dimensions.l * scale;
  const doorW = Math.min(w * 0.2, 10);
  const doorX = x + w / 2 - doorW / 2;
  const doorY = y + h;

  doc.setDrawColor(...SIEC.ink);
  doc.setLineWidth(0.25);
  doc.line(doorX, doorY, doorX + doorW, doorY);
  doc.line(doorX, doorY, doorX + doorW * 0.65, doorY - doorW * 0.55);
};

const drawBlueprintFloor = (doc, floorRecintos, options) => {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  if (!floorRecintos?.length) {
    const headerH = drawTitleBlock(doc, {
      ...options,
      scaleLabel: "Escala 1:50",
    });
    doc.setFillColor(...SIEC.paper);
    doc.rect(0, headerH, W, H - headerH, "F");
    doc.setTextColor(...SIEC.muted);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.text(`Sin recintos en piso ${options.floor}.`, SHEET_PAD, headerH + 20);
    return;
  }

  const bounds = computeLayoutBounds(floorRecintos);
  const dimMargin = DIM_OFFSET + 6;
  const drawX = SHEET_PAD + dimMargin;
  const drawY = HEADER_H + SHEET_PAD;
  const drawW = W - SHEET_PAD * 2 - dimMargin * 2;
  const drawH = H - HEADER_H - SHEET_PAD * 2 - FOOTER_H - 12 - dimMargin;

  const scale = Math.min(drawW / bounds.width, drawH / bounds.depth);
  const scaleRatio = Math.max(1, Math.round(1000 / scale));

  const headerH = drawTitleBlock(doc, {
    ...options,
    scaleLabel: `Escala 1:${scaleRatio}`,
  });

  // Fondo limpio: solo blanco, sin caja ni grilla extra
  doc.setFillColor(...SIEC.paper);
  doc.rect(0, headerH, W, H - headerH, "F");

  const planW = bounds.width * scale;
  const planH = bounds.depth * scale;
  const ox = drawX + (drawW - planW) / 2 - bounds.minX * scale;
  const oy = drawY + (drawH - planH) / 2 - bounds.minZ * scale;

  const pxLeft = ox + bounds.minX * scale;
  const pxRight = ox + bounds.maxX * scale;
  const pyTop = oy + bounds.minZ * scale;
  const pyBottom = oy + bounds.maxZ * scale;

  for (const r of floorRecintos) {
    drawRoomFill(doc, r, ox, oy, scale);
  }

  const allWalls = extractTopologyFromRecintos(floorRecintos);
  for (const wall of allWalls) {
    drawWallSegment(doc, wall.segmento, ox, oy, scale, wall.tipo === "exterior");
  }

  for (const r of floorRecintos) {
    drawDoorSymbols(doc, r, ox, oy, scale);
  }

  drawHorizontalDimension(
    doc,
    pxLeft,
    pxRight,
    pyBottom,
    `${bounds.width.toFixed(2)} m`,
  );
  drawVerticalDimension(
    doc,
    pyTop,
    pyBottom,
    pxRight,
    `${bounds.depth.toFixed(2)} m`,
  );

  doc.setFillColor(...SIEC.ink);
  doc.rect(0, H - FOOTER_H, W, FOOTER_H, "F");
  doc.setFontSize(6);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(148, 163, 184);
  doc.text(
    "Generado por SIEC · Plano referencial — no apto para construcción",
    W / 2,
    H - 2.5,
    { align: "center" },
  );
};

export function generateBlueprintPDF({
  recintos,
  projectName = "SIEC Project",
  material = "Hormigón",
  m2 = 0,
  brandLogoDataUrl = null,
  floor = null,
}) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });

  if (!recintos?.length) {
    drawBlueprintFloor(doc, [], {
      projectName,
      material,
      m2,
      brandLogoDataUrl,
      floor: 1,
      totalFloors: 1,
      scaleLabel: "Escala 1:50",
    });
    return doc;
  }

  const allFloors = [...new Set(recintos.map((r) => r.piso || 1))].sort((a, b) => a - b);
  const floors = floor != null ? [floor] : allFloors.length ? allFloors : [1];

  floors.forEach((floorNumber, index) => {
    if (index > 0) doc.addPage();
    const floorRecintos = recintos.filter((r) => (r.piso || 1) === floorNumber);
    drawBlueprintFloor(doc, floorRecintos, {
      projectName,
      material,
      m2,
      brandLogoDataUrl,
      floor: floorNumber,
      totalFloors: floors.length,
      scaleLabel: "Escala automática",
    });
  });

  return doc;
}

export function downloadBlueprintPDF(options, filename = "siec-plano.pdf") {
  const doc = generateBlueprintPDF(options);
  doc.save(filename);
}

export const downloadBlueprint = downloadBlueprintPDF;
