/**
 * thumbnailGenerator — produces a small PNG representing a project's layout.
 *
 * Renders an offscreen top-down view of the recintos using a simple 2D canvas,
 * keeping the dependency-free path. For richer thumbnails, use the SceneExporter
 * exportImage() method directly from Scene3D.
 */
const COLORS = {
  habitacion: "#22d3ee",
  banio: "#0ea5e9",
  comun: "#10b981",
  areaComun: "#10b981",
  pasillo: "#64748b",
};

export function generateLayoutThumbnail(recintos, options = {}) {
  const { width = 480, height = 270, bg = "#0b1220" } = options;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  if (!recintos || recintos.length === 0) {
    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Sin recintos", width / 2, height / 2);
    return canvas.toDataURL("image/png");
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
  const margin = 1.5;
  minX -= margin;
  minZ -= margin;
  maxX += margin;
  maxZ += margin;
  const dx = maxX - minX;
  const dz = maxZ - minZ;
  const scale = Math.min((width - 40) / dx, (height - 40) / dz);
  const offsetX = (width - dx * scale) / 2 - minX * scale;
  const offsetY = (height - dz * scale) / 2 - minZ * scale;

  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 0.5;
  for (let x = Math.floor(minX); x <= maxX; x++) {
    const px = offsetX + x * scale;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, height);
    ctx.stroke();
  }
  for (let z = Math.floor(minZ); z <= maxZ; z++) {
    const py = offsetY + z * scale;
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(width, py);
    ctx.stroke();
  }

  for (const r of recintos.filter((r) => (r.piso || 1) === 1)) {
    const x = offsetX + r.coords.x * scale;
    const y = offsetY + r.coords.z * scale;
    const w = r.dimensions.w * scale;
    const h = r.dimensions.l * scale;
    ctx.fillStyle = COLORS[r.tipo] || "#334155";
    ctx.globalAlpha = 0.45;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = COLORS[r.tipo] || "#334155";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);
  }

  return canvas.toDataURL("image/png");
}
