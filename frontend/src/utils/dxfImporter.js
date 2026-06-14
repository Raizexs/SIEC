/**
 * dxfImporter — minimal DXF parser that extracts LINE and LWPOLYLINE entities
 * from a small subset of AutoCAD/Revit/QCAD exports and turns them into
 * recintos (rectangular bounding boxes from polylines).
 *
 * This isn't a full DXF library — it covers the 90% case for residential plans
 * where rooms are drawn as closed polylines on a single layer. For complex
 * files, advise users to clean up before import.
 */

export function parseDXF(text) {
  const lines = text.split(/\r?\n/);
  const entities = [];
  let current = null;
  for (let i = 0; i < lines.length; i++) {
    const code = lines[i]?.trim();
    const value = lines[i + 1]?.trim();
    if (code === "0") {
      if (current && current.type) entities.push(current);
      current = { type: value, vertices: [] };
      i++;
    } else if (current) {
      const num = Number(code);
      if (num === 10) current._x = parseFloat(value);
      if (num === 20) {
        current._y = parseFloat(value);
        if (current._x !== undefined && current._y !== undefined) {
          current.vertices.push({ x: current._x, y: current._y });
          current._x = undefined;
          current._y = undefined;
        }
      }
      if (num === 8) current.layer = value;
      i++;
    }
  }
  if (current && current.type) entities.push(current);
  return entities;
}

export function dxfToRecintos(text, { startId = 1, defaultTipo = 'comun' } = {}) {
  const entities = parseDXF(text);
  const polylines = entities.filter(
    (e) => e.type === "LWPOLYLINE" || e.type === "POLYLINE",
  );

  const recintos = [];
  let id = startId;
  for (const poly of polylines) {
    if (poly.vertices.length < 4) continue;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const v of poly.vertices) {
      minX = Math.min(minX, v.x);
      minY = Math.min(minY, v.y);
      maxX = Math.max(maxX, v.x);
      maxY = Math.max(maxY, v.y);
    }
    const w = maxX - minX;
    const l = maxY - minY;
    if (w < 0.5 || l < 0.5) continue;

    let tipo = defaultTipo;
    const layer = (poly.layer || "").toLowerCase();
    if (layer.includes("bath") || layer.includes("bañ")) tipo = "banio";
    else if (layer.includes("bed") || layer.includes("habit"))
      tipo = "habitacion";
    else if (layer.includes("hall") || layer.includes("pasill"))
      tipo = "pasillo";

    recintos.push({
      id: `dxf-${id++}`,
      tipo,
      piso: 1,
      coords: { x: minX, z: minY },
      dimensions: { w, l },
      origen: "dxf",
    });
  }
  return recintos;
}
