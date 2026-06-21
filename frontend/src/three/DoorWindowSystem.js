/**
 * DoorWindowSystem — coloca puertas y ventanas según el layout real.
 *
 * Reglas:
 *   - Una puerta de acceso en fachada (muro exterior más largo con recinto habitable).
 *   - Ventanas solo en muros exteriores de habitaciones/baños/áreas comunes (no pasillos),
 *     como máximo 1–2 por muro según longitud.
 *   - Puertas interiores solo donde hace falta circulación (recinto ↔ pasillo, baño, etc.),
 *     nunca entre dos pasillos ni en todos los muros a la vez.
 */

const DOOR_DEFAULTS = { width: 0.9, height: 2.05, sillHeight: 0 };
const WINDOW_DEFAULTS = { width: 1.4, height: 1.2, sillHeight: 1.0 };
const FRONT_DOOR = { width: 1.1, height: 2.1, sillHeight: 0 };

const CLOSED_ROOM_TYPES = new Set(["habitacion", "banio", "areaComun"]);
const MIN_DOOR_WALL_LEN = 1.0;
const MIN_WINDOW_WALL_LEN = 3.2;
const MIN_ROOM_AREA_FOR_WINDOW = 10;
const MAX_WINDOW_WALL_RATIO = 0.38;

export class DoorWindowSystem {
  /**
   * @param {Array} walls       — topología (id, segmento, tipo, recintosAdyacentes, piso)
   * @param {Array} recintos    — recintos del store
   * @returns {Map<string, Array>}  wallId → openings[]
   */
  static generate(walls, recintos) {
    const result = new Map();
    if (!Array.isArray(walls) || walls.length === 0) return result;

    const recintoById = new Map(
      (recintos || []).map((r) => [r.id, r]),
    );

    const floors = [...new Set(walls.map((w) => w.piso || 1))].sort(
      (a, b) => a - b,
    );

    for (const floor of floors) {
      const floorWalls = walls.filter((w) => (w.piso || 1) === floor);
      const exteriorWalls = floorWalls.filter((w) => w.tipo === "exterior");
      const interiorWalls = floorWalls.filter((w) => w.tipo === "interior");

      const closedOnFloor = (recintos || []).filter(
        (r) => (r.piso || 1) === floor && this._isClosedRoom(r),
      );

      const frontDoorWall =
        floor === 1
          ? this._pickFrontDoorWall(exteriorWalls, recintoById)
          : null;

      if (frontDoorWall) {
        this._pushOpening(result, frontDoorWall.id, {
          id: `door-front-${frontDoorWall.id}`,
          wall_id: frontDoorWall.id,
          type: "door",
          center: 0.5,
          ...FRONT_DOOR,
        });
      }

    // 2. Ventanas contextuales: máx. 1 por recinto habitable, solo fachada útil
    const windowsPerRoom = new Map();
    const exteriorCandidates = exteriorWalls
      .filter((wall) => wall !== frontDoorWall)
      .map((wall) => ({
        wall,
        room: this._primaryRoomOnExteriorWall(wall, recintoById),
        len: this._length(wall),
        score: this._scoreExteriorWindowWall(wall, recintoById, frontDoorWall),
      }))
      .filter((c) => c.room && this._roomWantsWindow(c.room, c.wall, recintoById))
      .sort((a, b) => b.score - a.score);

    for (const { wall, room, len } of exteriorCandidates) {
      if ((windowsPerRoom.get(room.id) || 0) >= 1) continue;
      if (len < MIN_WINDOW_WALL_LEN) continue;

      const width = Math.min(WINDOW_DEFAULTS.width, len - 0.8, len * MAX_WINDOW_WALL_RATIO);
      if (width < 0.7) continue;

      this._pushOpening(result, wall.id, {
        id: `win-${wall.id}`,
        wall_id: wall.id,
        type: "window",
        center: 0.5,
        width,
        height: WINDOW_DEFAULTS.height,
        sillHeight: WINDOW_DEFAULTS.sillHeight,
      });
      windowsPerRoom.set(room.id, 1);
    }

    // 3. Puertas interiores contextuales (máx. una conexión útil por recinto cerrado)
    const wallsWithDoor = new Set(
      frontDoorWall ? [frontDoorWall.id] : [],
    );
    const roomHasInteriorDoor = new Map();

    const roomPriority = (r) => {
      if (r.tipo === "banio") return 0;
      if (r.tipo === "habitacion") return 1;
      return 2;
    };

    const sortedRooms = [...closedOnFloor].sort(
      (a, b) => roomPriority(a) - roomPriority(b),
    );

    for (const room of sortedRooms) {
      if (roomHasInteriorDoor.get(room.id)) continue;

      const candidates = interiorWalls
        .filter(
          (w) =>
            w.recintosAdyacentes?.includes(room.id) &&
            !wallsWithDoor.has(w.id) &&
            this._length(w) >= MIN_DOOR_WALL_LEN,
        )
        .map((w) => ({
          w,
          score: this._scoreInteriorDoorWall(w, room, recintoById),
        }))
        .filter((c) => c.score > 0)
        .sort((a, b) => b.score - a.score);

      const best = candidates[0];
      if (!best) continue;

      this._placeInteriorDoor(result, best.w, wallsWithDoor);
      this._markInteriorDoorRooms(
        best.w,
        recintoById,
        roomHasInteriorDoor,
      );
    }

    // 4. Respaldo: habitación aislada sin pasillo — una puerta con vecino habitable
    for (const room of sortedRooms) {
      if (roomHasInteriorDoor.get(room.id)) continue;

      const fallback = interiorWalls
        .filter(
          (w) =>
            w.recintosAdyacentes?.includes(room.id) &&
            !wallsWithDoor.has(w.id) &&
            this._length(w) >= MIN_DOOR_WALL_LEN &&
            !this._isPasilloPasilloWall(w, recintoById),
        )
        .map((w) => ({
          w,
          score: this._scoreFallbackDoorWall(w, room, recintoById),
        }))
        .filter((c) => c.score > 0)
        .sort((a, b) => b.score - a.score)[0];

      if (!fallback) continue;

      this._placeInteriorDoor(result, fallback.w, wallsWithDoor);
      this._markInteriorDoorRooms(
        fallback.w,
        recintoById,
        roomHasInteriorDoor,
      );
    }
    }

    return result;
  }

  static _isClosedRoom(r) {
    return r && CLOSED_ROOM_TYPES.has(r.tipo);
  }

  static _isPasillo(r) {
    return r?.tipo === "pasillo";
  }

  static _adjacentRooms(wall, recintoById) {
    return (wall.recintosAdyacentes || [])
      .map((id) => recintoById.get(id))
      .filter(Boolean);
  }

  static _isPasilloPasilloWall(wall, recintoById) {
    const adj = this._adjacentRooms(wall, recintoById);
    return adj.length === 2 && adj.every((r) => this._isPasillo(r));
  }

  static _primaryRoomOnExteriorWall(wall, recintoById) {
    const adj = this._adjacentRooms(wall, recintoById).filter((r) => this._isClosedRoom(r));
    if (adj.length === 0) return null;
    return adj.sort(
      (a, b) =>
        b.dimensions.w * b.dimensions.l - a.dimensions.w * a.dimensions.l,
    )[0];
  }

  static _roomWantsWindow(room, wall, recintoById) {
    if (!room || room.tipo === "pasillo") return false;
    const area = (room.dimensions?.w || 0) * (room.dimensions?.l || 0);
    if (area < MIN_ROOM_AREA_FOR_WINDOW) return false;

    const adj = this._adjacentRooms(wall, recintoById);
    if (adj.some((r) => r.tipo === "pasillo")) return false;

    if (room.tipo === "banio") {
      return this._length(wall) >= 4;
    }

    return room.tipo === "habitacion" || room.tipo === "areaComun";
  }

  static _scoreExteriorWindowWall(wall, recintoById, frontDoorWall) {
    const room = this._primaryRoomOnExteriorWall(wall, recintoById);
    if (!room) return 0;

    let score = this._length(wall);
    const area = room.dimensions.w * room.dimensions.l;
    score += area * 0.05;
    if (room.tipo === "habitacion") score += 20;
    if (room.tipo === "areaComun") score += 10;
    if (wall === frontDoorWall) score -= 100;
    return score;
  }

  static _pickFrontDoorWall(exteriorWalls, recintoById) {
    const scored = exteriorWalls
      .map((w) => {
        const adj = this._adjacentRooms(w, recintoById);
        const hasHabitacion = adj.some((r) => r.tipo === "habitacion");
        const hasAreaComun = adj.some((r) => r.tipo === "areaComun");
        const onlyPasillo = adj.length > 0 && adj.every((r) => this._isPasillo(r));

        let score = this._length(w);
        if (hasHabitacion) score += 50;
        if (hasAreaComun) score += 30;
        if (onlyPasillo) score -= 40;

        return { w, score };
      })
      .sort((a, b) => b.score - a.score);

    return scored[0]?.w ?? null;
  }

  static _scoreInteriorDoorWall(wall, room, recintoById) {
    if (this._isPasilloPasilloWall(wall, recintoById)) return 0;

    const others = this._adjacentRooms(wall, recintoById).filter(
      (r) => r.id !== room.id,
    );
    if (others.length === 0) return 0;

    const len = this._length(wall);
    let score = len;

    for (const other of others) {
      if (this._isPasillo(other)) score += 120;
      if (other.tipo === "banio" && room.tipo !== "banio") score += 90;
      if (room.tipo === "banio" && other.tipo !== "banio") score += 90;
      if (other.tipo === "areaComun") score += 45;
      if (other.tipo === "habitacion" && room.tipo === "habitacion") score += 12;
    }

    return score;
  }

  static _scoreFallbackDoorWall(wall, room, recintoById) {
    const others = this._adjacentRooms(wall, recintoById).filter(
      (r) => r.id !== room.id,
    );
    if (others.length === 0) return 0;

    const len = this._length(wall);
    let score = len;

    for (const other of others) {
      if (this._isClosedRoom(other)) score += 25;
    }

    return score;
  }

  static _placeInteriorDoor(result, wall, wallsWithDoor) {
    wallsWithDoor.add(wall.id);
    this._pushOpening(result, wall.id, {
      id: `door-${wall.id}`,
      wall_id: wall.id,
      type: "door",
      center: 0.5,
      ...DOOR_DEFAULTS,
    });
  }

  static _markInteriorDoorRooms(wall, recintoById, roomHasInteriorDoor) {
    for (const r of this._adjacentRooms(wall, recintoById)) {
      if (this._isClosedRoom(r)) {
        roomHasInteriorDoor.set(r.id, true);
      }
    }
  }

  static _pushOpening(result, wallId, opening) {
    const list = result.get(wallId) || [];
    list.push(opening);
    result.set(wallId, list);
  }

  static _length(wall) {
    const { start, end } = wall.segmento;
    return Math.hypot(end.x - start.x, end.z - start.z);
  }
}
