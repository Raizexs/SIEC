/**
 * DoorWindowSystem — auto-generates door/window placements for each room.
 *
 * Heuristics (no external CAD input needed):
 *   - The recinto closest to the perimeter gets the front door (ground floor only).
 *   - Each interior room gets one door on its inward-facing wall (closest neighbor).
 *   - Walls of `tipo === 'exterior'` and area > threshold get a window proportional
 *     to the wall length.
 *
 * Output: { wallId: [{ type, center, width, height, sillHeight }] } — fed to
 * WallBuilder during mesh construction.
 */

const DOOR_DEFAULTS = { width: 0.9, height: 2.05, sillHeight: 0 };
const WINDOW_DEFAULTS = { width: 1.4, height: 1.2, sillHeight: 1.0 };
const FRONT_DOOR = { width: 1.1, height: 2.1, sillHeight: 0 };

export class DoorWindowSystem {
  /**
   * @param {Array} walls       — wall topology (id, segmento, tipo, piso)
   * @param {Array} recintos    — Pinia store recintos
   * @returns {Map<string, Array>}  wallId → openings[]
   */
  static generate(walls, recintos) {
    const result = new Map();
    if (!Array.isArray(walls) || walls.length === 0) return result;

    const groundWalls = walls.filter((w) => (w.piso || 1) === 1);
    const exteriorWalls = groundWalls.filter((w) => w.tipo === "exterior");

    // 1. Front door: pick the longest exterior wall on the ground floor.
    const frontDoorWall = exteriorWalls.sort(
      (a, b) => this._length(b) - this._length(a),
    )[0];
    if (frontDoorWall) {
      result.set(frontDoorWall.id, [
        {
          id: `door-front-${frontDoorWall.id}`,
          wall_id: frontDoorWall.id,
          type: "door",
          center: 0.5,
          ...FRONT_DOOR,
        },
      ]);
    }

    // 2. Windows on remaining exterior walls long enough.
    for (const w of exteriorWalls) {
      if (w === frontDoorWall) continue;
      const len = this._length(w);
      if (len < 1.5) continue;
      const numWindows = Math.max(1, Math.floor(len / 3));
      const list = result.get(w.id) || [];
      for (let i = 0; i < numWindows; i++) {
        const center = (i + 1) / (numWindows + 1);
        const width = Math.min(
          WINDOW_DEFAULTS.width,
          len / (numWindows + 1) - 0.3,
        );
        if (width < 0.6) continue;
        list.push({
          id: `win-${w.id}-${i}`,
          wall_id: w.id,
          type: "window",
          center,
          width,
          height: WINDOW_DEFAULTS.height,
          sillHeight: WINDOW_DEFAULTS.sillHeight,
        });
      }
      if (list.length) result.set(w.id, list);
    }

    // 3. One door per interior wall connecting two recintos (heuristic: every
    // interior wall gets a single door at midpoint).
    const interiorWalls = walls.filter((w) => w.tipo === "interior");
    for (const w of interiorWalls) {
      const len = this._length(w);
      if (len < 1.0) continue;
      const list = result.get(w.id) || [];
      list.push({
        id: `door-${w.id}`,
        wall_id: w.id,
        type: "door",
        center: 0.5,
        ...DOOR_DEFAULTS,
      });
      result.set(w.id, list);
    }

    return result;
  }
  
  static _length(wall) {
    const { start, end } = wall.segmento;
    return Math.hypot(end.x - start.x, end.z - start.z);
  }
}
