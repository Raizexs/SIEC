/**
 * Blueprint generator — produces a print-ready architectural plan PDF with:
 *   - Title block (project name, m², material, date, scale).
 *   - Scaled drawing of recintos with hatching by tipo.
 *   - Dimension lines (cotas) with arrowheads.
 *   - Door/window symbols.
 *   - Optional branded header (company logo).
 *
 * Uses jsPDF (already in dependencies). Produces vector output so plans can
 * be printed at any size without quality loss.
 */
import jsPDF from "jspdf";

const COLORS = {
  habitacion: "#22d3ee",
  banio: "#0ea5e9",
  comun: "#10b981",
  areaComun: "#10b981",
  pasillo: "#94a3b8",
};

export function generateBlueprintPDF({
  recintos,
  projectName = "SIEC Project",
  material = "Hormigón",
  m2 = 0,
  brandLogoDataUrl = null,
}) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // ── Title block ───────────────────────────────────────────────────────────
  const titleHeight = 28;
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, titleHeight, "F");
  doc.setTextColor(226, 232, 240);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("SIEC · Plano Arquitectónico", 12, 14);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Proyecto: ${projectName}`, 12, 22);
  doc.text(
    `Material: ${material}  ·  Total: ${m2} m²  ·  Escala: 1:50  ·  ${new Date().toLocaleDateString()}`,
    12,
    26,
  );

  if (brandLogoDataUrl) {
    try {
      doc.addImage(brandLogoDataUrl, "PNG", W - 50, 4, 38, 20);
    } catch {}
  }

  // ── Drawing area ──────────────────────────────────────────────────────────
  const padding = 20;
  const drawX = padding;
  const drawY = titleHeight + padding;
  const drawW = W - padding * 2;
  const drawH = H - titleHeight - padding * 2 - 20;

  if (!recintos || recintos.length === 0) {
    doc.setTextColor(148, 163, 184);
    doc.setFont("helvetica", "italic");
    doc.text("Sin recintos en este proyecto.", drawX + 10, drawY + 20);
    return doc;
  }

  let minX = Infinity,
    minZ = Infinity,
    maxX = -Infinity,
    maxZ = -Infinity;
  for (const r of recintos) {
    minX = Math.min(minX, r.coords.x);
    minZ = Math.min(minZ, r.coords.z);
    maxX = Math.max(maxX, r.coords.x + r.dimensions.w);
    maxZ = Math.max(maxZ, r.coords.z + r.dimensions.l);
  }
  const margin = 1;
  minX -= margin;
  minZ -= margin;
  maxX += margin;
  maxZ += margin;
  const dx = maxX - minX;
  const dz = maxZ - minZ;
  const scale = Math.min(drawW / dx, drawH / dz);
  const ox = drawX + (drawW - dx * scale) / 2 - minX * scale;
  const oy = drawY + (drawH - dz * scale) / 2 - minZ * scale;

  // Grid
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.1);
  for (let x = Math.floor(minX); x <= maxX; x++) {
    const px = ox + x * scale;
    doc.line(px, drawY, px, drawY + drawH);
  }
  for (let z = Math.floor(minZ); z <= maxZ; z++) {
    const py = oy + z * scale;
    doc.line(drawX, py, drawX + drawW, py);
  }

  // Recintos
  for (const r of recintos.filter((r) => (r.piso || 1) === 1)) {
    const x = ox + r.coords.x * scale;
    const y = oy + r.coords.z * scale;
    const w = r.dimensions.w * scale;
    const h = r.dimensions.l * scale;
    const color = COLORS[r.tipo] || "#475569";
    doc.setFillColor(...hexToRgb(color, 0.18));
    doc.setDrawColor(...hexToRgb(color, 1));
    doc.setLineWidth(0.6);
    doc.rect(x, y, w, h, "FD");

    // Label
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text(`${r.tipo}`, x + 1.5, y + 4);
    doc.setFont("helvetica", "normal");
    doc.text(
      `${r.dimensions.w.toFixed(2)}×${r.dimensions.l.toFixed(2)} m`,
      x + 1.5,
      y + 7.5,
    );
    doc.text(
      `${(r.dimensions.w * r.dimensions.l).toFixed(1)} m²`,
      x + 1.5,
      y + 11,
    );

    // Door symbol (heuristic: south side)
    const doorX = x + w / 2;
    doc.setDrawColor(40, 40, 40);
    doc.setLineWidth(0.3);
    doc.line(doorX - 4, y + h, doorX + 4, y + h);
    doc.line(doorX - 4, y + h, doorX, y + h - 5);
  }

  // Dimension lines (overall)
  drawDimensionLine(
    doc,
    ox,
    oy + dz * scale + 6,
    ox + dx * scale,
    oy + dz * scale + 6,
    `${dx.toFixed(2)} m`,
  );
  drawDimensionLine(
    doc,
    ox + dx * scale + 6,
    oy,
    ox + dx * scale + 6,
    oy + dz * scale,
    `${dz.toFixed(2)} m`,
    true,
  );

  // Legend
  doc.setFillColor(15, 23, 42);
  doc.setTextColor(226, 232, 240);
  doc.rect(0, H - 14, W, 14, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  let lx = 12;
  doc.text("LEYENDA:", lx, H - 5);
  lx += 24;
  for (const [tipo, color] of Object.entries(COLORS)) {
    doc.setFillColor(...hexToRgb(color, 1));
    doc.rect(lx, H - 9, 4, 4, "F");
    doc.setTextColor(226, 232, 240);
    doc.text(tipo, lx + 6, H - 5);
    lx += 30;
  }
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text(
    "Generado automáticamente por SIEC. Plano referencial — no para construcción.",
    W - 100,
    H - 5,
  );
  return doc;
}

export function downloadBlueprint(args, filename = "siec-plano.pdf") {
  const doc = generateBlueprintPDF(args);
  doc.save(filename);
}

function drawDimensionLine(doc, x1, y1, x2, y2, label, vertical = false) {
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.4);
  doc.line(x1, y1, x2, y2);
  // Arrowheads
  if (vertical) {
    doc.line(x1, y1, x1 - 1.5, y1 + 1.5);
    doc.line(x1, y1, x1 + 1.5, y1 + 1.5);
    doc.line(x2, y2, x2 - 1.5, y2 - 1.5);
    doc.line(x2, y2, x2 + 1.5, y2 - 1.5);
  } else {
    doc.line(x1, y1, x1 + 1.5, y1 - 1.5);
    doc.line(x1, y1, x1 + 1.5, y1 + 1.5);
    doc.line(x2, y2, x2 - 1.5, y2 - 1.5);
    doc.line(x2, y2, x2 - 1.5, y2 + 1.5);
  }
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  if (vertical) doc.text(label, x1 + 2, (y1 + y2) / 2);
  else doc.text(label, (x1 + x2) / 2 - 8, y1 - 1.5);
}

function hexToRgb(hex, alpha = 1) {
  const m = hex.replace("#", "");
  const r = parseInt(m.substring(0, 2), 16);
  const g = parseInt(m.substring(2, 4), 16);
  const b = parseInt(m.substring(4, 6), 16);
  return [r, g, b];
}
