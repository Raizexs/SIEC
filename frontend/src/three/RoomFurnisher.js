/**
 * Amueblado procedural por tipo de recinto, con colocación validada
 * (sin bloquear puertas ni zonas de circulación).
 */
import * as THREE from "three";

const EPS = 0.06;

const PALETTES = {
  habitacion: { primary: "#94a3b8", accent: "#f59e0b", wood: "#a16207" },
  banio: { primary: "#e2e8f0", accent: "#0891b2", wood: "#cbd5e1" },
  comun: { primary: "#475569", accent: "#10b981", wood: "#92400e" },
  areaComun: { primary: "#475569", accent: "#10b981", wood: "#92400e" },
  pasillo: { primary: "#475569", accent: "#0ea5e9", wood: "#0f172a" },
};

class PlacementPlanner {
  constructor(w, l, doors) {
    this.w = w;
    this.l = l;
    this.doors = doors;
    this.doorZones = doors.map((d) => this._doorZone(d));
    this.occupied = [];
  }

  _doorZone(d) {
    const depth = d.neighborPasillo ? 1.55 : 1.2;
    const along = d.width / 2 + (d.neighborPasillo ? 0.85 : 0.6);

    if (d.side === "west") {
      return { minX: -this.w / 2 - 0.05, maxX: -this.w / 2 + depth, minZ: d.localZ - along, maxZ: d.localZ + along };
    }
    if (d.side === "east") {
      return { minX: this.w / 2 - depth, maxX: this.w / 2 + 0.05, minZ: d.localZ - along, maxZ: d.localZ + along };
    }
    if (d.side === "south") {
      return { minX: d.localX - along, maxX: d.localX + along, minZ: -this.l / 2 - 0.05, maxZ: -this.l / 2 + depth };
    }
    return { minX: d.localX - along, maxX: d.localX + along, minZ: this.l / 2 - depth, maxZ: this.l / 2 + 0.05 };
  }

  _footprint(localX, localZ, halfW, halfD) {
    return { minX: localX - halfW, maxX: localX + halfW, minZ: localZ - halfD, maxZ: localZ + halfD };
  }

  _overlaps(a, b) {
    return a.minX < b.maxX - EPS && a.maxX > b.minX + EPS && a.minZ < b.maxZ - EPS && a.maxZ > b.minZ + EPS;
  }

  blocksDoor(localX, localZ, halfW, halfD) {
    const fp = this._footprint(localX, localZ, halfW, halfD);
    return this.doorZones.some((zone) => this._overlaps(fp, zone));
  }

  canPlace(localX, localZ, halfW, halfD) {
    const fp = this._footprint(localX, localZ, halfW, halfD);
    if (fp.minX < -this.w / 2 + 0.12 || fp.maxX > this.w / 2 - 0.12) return false;
    if (fp.minZ < -this.l / 2 + 0.12 || fp.maxZ > this.l / 2 - 0.12) return false;
    if (this.blocksDoor(localX, localZ, halfW, halfD)) return false;
    if (this.occupied.some((o) => this._overlaps(fp, o))) return false;
    return true;
  }

  commit(localX, localZ, halfW, halfD) {
    this.occupied.push(this._footprint(localX, localZ, halfW, halfD));
  }

  pickBest(candidates, halfW, halfD) {
    let best = null;
    let bestScore = -Infinity;
    for (const c of candidates) {
      if (!this.canPlace(c.x, c.z, halfW, halfD)) continue;
      let score = 0;
      for (const d of this.doors) {
        score += Math.hypot(c.x - d.localX, c.z - d.localZ) * (d.neighborPasillo ? 5 : 2);
      }
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
    return best;
  }
}

export class RoomFurnisher {
  constructor(group) {
    this.group = group;
    this.byRoom = new Map();
  }

  furnish(recinto, layout = {}) {
    this.clearRoom(recinto.id);

    const { dimensions, coords, tipo, piso = 1 } = recinto;
    const w = dimensions.w;
    const l = dimensions.l;
    if (w < 1 || l < 1) return;

    const ctx = this._buildContext(
      recinto,
      layout.walls || [],
      layout.openings || new Map(),
      layout.recintos || [],
    );

    if (this._isCirculationSpace(tipo, w, l, ctx)) {
      return;
    }

    const group = new THREE.Group();
    group.name = `furniture-${recinto.id}`;
    group.userData.roomId = recinto.id;
    group.userData.layerTags = ["interior"];

    const palette = PALETTES[tipo] || PALETTES.comun;
    const planner = new PlacementPlanner(w, l, ctx.doors);

    const builders = {
      habitacion: () => this._buildBedroom(group, w, l, palette, planner, ctx),
      banio: () => this._buildBathroom(group, w, l, palette, planner, ctx),
      comun: () => this._buildLiving(group, w, l, palette, planner, ctx),
      areaComun: () => this._buildLiving(group, w, l, palette, planner, ctx),
    };
    (builders[tipo] || builders.comun)();

    const baseY = (piso - 1) * 2.4 + 0.04;
    group.position.set(coords.x + w / 2, baseY, coords.z + l / 2);
    this.group.add(group);
    this.byRoom.set(recinto.id, group);
  }

  clearRoom(roomId) {
    const existing = this.byRoom.get(roomId);
    if (!existing) return;
    this._disposeGroup(existing);
    this.group.remove(existing);
    this.byRoom.delete(roomId);
  }

  clearAll() {
    for (const id of [...this.byRoom.keys()]) this.clearRoom(id);
  }

  setVisible(visible) {
    this.group.visible = visible;
  }

  _isCirculationSpace(tipo, w, l, ctx) {
    if (tipo === "pasillo") return true;
    const pasilloDoors = ctx.doors.filter((d) => d.neighborPasillo).length;
    if (pasilloDoors >= 2) return true;
    if (Math.min(w, l) < 2.2 && pasilloDoors >= 1) return true;
    return false;
  }

  _box(w, h, d, color, opts = {}) {
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: opts.roughness ?? 0.7,
      metalness: opts.metalness ?? 0.05,
      transparent: opts.transparent ?? false,
      opacity: opts.opacity ?? 1,
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  _cylinder(r, h, color) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.1 });
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  _place(group, planner, mesh, x, y, z, halfW, halfD) {
    if (!planner.canPlace(x, z, halfW, halfD)) return false;
    mesh.position.set(x, y, z);
    group.add(mesh);
    planner.commit(x, z, halfW, halfD);
    return true;
  }

  _buildBedroom(group, w, l, p, planner, ctx) {
    const bedW = Math.min(1.4, w - 0.55);
    const bedD = Math.min(1.9, l - 0.55);
    if (bedW < 0.95 || bedD < 1.1) return;

    const halfW = bedW / 2;
    const halfD = bedD / 2;
    const anchor = planner.pickBest(
      [
        { x: -w / 2 + halfW + 0.22, z: -l / 2 + halfD + 0.22 },
        { x: w / 2 - halfW - 0.22, z: -l / 2 + halfD + 0.22 },
        { x: -w / 2 + halfW + 0.22, z: l / 2 - halfD - 0.22 },
        { x: w / 2 - halfW - 0.22, z: l / 2 - halfD - 0.22 },
      ],
      halfW,
      halfD,
    );
    if (!anchor) return;

    const bed = this._box(bedW, 0.5, bedD, p.wood);
    if (!this._place(group, planner, bed, anchor.x, 0.25, anchor.z, halfW, halfD)) return;

    const mattress = this._box(bedW - 0.05, 0.2, bedD - 0.05, "#f8fafc");
    mattress.position.set(anchor.x, 0.6, anchor.z);
    group.add(mattress);

    const pillow = this._box(Math.min(1.2, bedW - 0.2), 0.1, 0.4, p.primary);
    pillow.position.set(anchor.x, 0.75, anchor.z - bedD / 2 + 0.28);
    group.add(pillow);

    const tableHalf = 0.22;
    const tableSpot = planner.pickBest(
      [
        { x: anchor.x, z: anchor.z + bedD / 2 + tableHalf + 0.12 },
        { x: anchor.x - bedW / 2 - tableHalf - 0.1, z: anchor.z },
      ],
      tableHalf,
      tableHalf,
    );
    if (tableSpot) {
      const table = this._box(0.4, 0.5, 0.4, p.wood);
      if (this._place(group, planner, table, tableSpot.x, 0.25, tableSpot.z, tableHalf, tableHalf)) {
        const lamp = this._cylinder(0.08, 0.4, p.accent);
        lamp.position.set(tableSpot.x, 0.7, tableSpot.z);
        group.add(lamp);
      }
    }

    if (w > 2.8) {
      const closetHalfW = 0.32;
      const closetHalfD = Math.min(0.8, (l - 0.5) / 2);
      const closetSpot = planner.pickBest(
        [
          { x: ctx.pasilloSides.has("east") ? -w / 2 + closetHalfW + 0.2 : w / 2 - closetHalfW - 0.2, z: 0 },
          { x: 0, z: ctx.pasilloSides.has("north") ? -l / 2 + closetHalfD + 0.2 : l / 2 - closetHalfD - 0.2 },
        ],
        closetHalfW,
        closetHalfD,
      );
      if (closetSpot) {
        const closet = this._box(closetHalfW * 2, 2.0, closetHalfD * 2, p.wood);
        this._place(group, planner, closet, closetSpot.x, 1.0, closetSpot.z, closetHalfW, closetHalfD);
      }
    }
  }

  _buildBathroom(group, w, l, p, planner, ctx) {
    const toiletHalfW = 0.22;
    const toiletHalfD = 0.32;
    const toiletSpot = planner.pickBest(
      [
        { x: -w / 2 + toiletHalfW + 0.18, z: l / 2 - toiletHalfD - 0.18 },
        { x: w / 2 - toiletHalfW - 0.18, z: l / 2 - toiletHalfD - 0.18 },
        { x: -w / 2 + toiletHalfW + 0.18, z: -l / 2 + toiletHalfD + 0.18 },
      ],
      toiletHalfW,
      toiletHalfD,
    );
    if (toiletSpot) {
      const toilet = this._box(0.4, 0.4, 0.6, p.primary);
      if (this._place(group, planner, toilet, toiletSpot.x, 0.2, toiletSpot.z, toiletHalfW, toiletHalfD)) {
        const tank = this._box(0.35, 0.5, 0.18, p.primary);
        tank.position.set(toiletSpot.x, 0.65, toiletSpot.z + 0.21);
        group.add(tank);
      }
    }

    const sinkHalfW = 0.3;
    const sinkHalfD = 0.22;
    const sinkSpot = planner.pickBest(
      [
        { x: w / 2 - sinkHalfW - 0.18, z: l / 2 - sinkHalfD - 0.18 },
        { x: -w / 2 + sinkHalfW + 0.18, z: -l / 2 + sinkHalfD + 0.18 },
        { x: 0, z: ctx.pasilloSides.has("north") ? l / 2 - sinkHalfD - 0.2 : -l / 2 + sinkHalfD + 0.2 },
      ],
      sinkHalfW,
      sinkHalfD,
    );
    if (sinkSpot) {
      const sink = this._box(0.55, 0.85, 0.4, p.wood);
      if (this._place(group, planner, sink, sinkSpot.x, 0.42, sinkSpot.z, sinkHalfW, sinkHalfD)) {
        const basin = this._box(0.5, 0.1, 0.35, p.primary);
        basin.position.set(sinkSpot.x, 0.9, sinkSpot.z);
        group.add(basin);
      }
    }

    if (w > 1.6 && l > 1.6) {
      const shW = Math.min(0.45, w / 2 - 0.35);
      const shD = Math.min(0.45, l / 2 - 0.35);
      const showerSpot = planner.pickBest(
        [
          { x: -w / 2 + shW + 0.15, z: -l / 2 + shD + 0.15 },
          { x: w / 2 - shW - 0.15, z: -l / 2 + shD + 0.15 },
        ],
        shW,
        shD,
      );
      if (showerSpot) {
        const shower = this._box(shW * 2, 2.0, shD * 2, p.accent, { metalness: 0.4, transparent: true, opacity: 0.35 });
        this._place(group, planner, shower, showerSpot.x, 1.0, showerSpot.z, shW, shD);
      }
    }
  }

  _buildLiving(group, w, l, p, planner, ctx) {
    const sofaW = Math.min(2.2, w * 0.7);
    const halfW = sofaW / 2;
    const halfD = 0.48;
    const sofaSpot = planner.pickBest(
      [
        { x: 0, z: ctx.pasilloSides.has("north") ? -l / 2 + halfD + 0.22 : l / 2 - halfD - 0.22 },
        { x: ctx.pasilloSides.has("east") ? -w / 2 + halfW + 0.25 : w / 2 - halfW - 0.25, z: 0 },
        { x: 0, z: 0 },
      ],
      halfW,
      halfD,
    );
    if (!sofaSpot) return;

    const sofa = this._box(sofaW, 0.5, 0.9, p.primary);
    if (!this._place(group, planner, sofa, sofaSpot.x, 0.25, sofaSpot.z, halfW, halfD)) return;

    const back = this._box(sofaW, 0.6, 0.18, p.primary);
    back.position.set(sofaSpot.x, 0.7, sofaSpot.z - 0.36);
    group.add(back);

    const coffeeHalfW = 0.48;
    const coffeeHalfD = 0.28;
    const coffeeZ = sofaSpot.z + (sofaSpot.z < 0 ? 0.95 : -0.95);
    const coffee = this._box(0.9, 0.35, 0.5, p.wood);
    this._place(group, planner, coffee, sofaSpot.x, 0.175, coffeeZ, coffeeHalfW, coffeeHalfD);

    const tvHalfW = 0.82;
    const tvHalfD = 0.24;
    const tvSpot = planner.pickBest(
      [
        { x: 0, z: ctx.pasilloSides.has("north") ? l / 2 - tvHalfD - 0.2 : -l / 2 + tvHalfD + 0.2 },
        { x: sofaSpot.x, z: -sofaSpot.z > 0 ? l / 2 - tvHalfD - 0.2 : -l / 2 + tvHalfD + 0.2 },
      ],
      tvHalfW,
      tvHalfD,
    );
    if (tvSpot) {
      const tvStand = this._box(1.6, 0.45, 0.4, p.wood);
      if (this._place(group, planner, tvStand, tvSpot.x, 0.225, tvSpot.z, tvHalfW, tvHalfD)) {
        const tv = this._box(1.4, 0.8, 0.05, "#0f172a");
        tv.position.set(tvSpot.x, 0.95, tvSpot.z);
        group.add(tv);
      }
    }

    const rugHalfW = Math.min(1.2, w / 2 - 0.2);
    const rugHalfD = Math.min(0.85, l / 2 - 0.2);
    const rugSpot = planner.pickBest([{ x: sofaSpot.x, z: 0 }], rugHalfW, rugHalfD);
    if (rugSpot) {
      const rug = this._box(rugHalfW * 2, 0.02, rugHalfD * 2, p.accent, { transparent: true, opacity: 0.9 });
      this._place(group, planner, rug, rugSpot.x, 0.01, rugSpot.z, rugHalfW, rugHalfD);
    }
  }

  _buildContext(recinto, walls, openingsMap, allRecintos) {
    const byId = new Map(allRecintos.map((r) => [r.id, r]));
    const { coords, dimensions } = recinto;
    const w = dimensions.w;
    const l = dimensions.l;
    const x0 = coords.x;
    const x1 = coords.x + w;
    const z0 = coords.z;
    const z1 = coords.z + l;
    const cx = coords.x + w / 2;
    const cz = coords.z + l / 2;

    const doors = [];
    const pasilloSides = new Set();

    for (const wall of walls) {
      if ((wall.piso || 1) !== (recinto.piso || 1)) continue;
      if (!wall.recintosAdyacentes?.includes(recinto.id)) continue;

      const neighbors = (wall.recintosAdyacentes || [])
        .filter((id) => id !== recinto.id)
        .map((id) => byId.get(id))
        .filter(Boolean);

      const touchesPasillo = neighbors.some((n) => n.tipo === "pasillo");
      const side = this._wallSide(wall.segmento, x0, x1, z0, z1);
      if (touchesPasillo && side) pasilloSides.add(side);

      for (const op of (openingsMap.get(wall.id) || []).filter((o) => o.type === "door")) {
        const door = this._doorLocal(wall, op, side, cx, cz, w, l);
        if (door) doors.push({ ...door, neighborPasillo: touchesPasillo });
      }
    }

    return { doors, pasilloSides };
  }

  _wallSide(seg, x0, x1, z0, z1) {
    const midX = (seg.start.x + seg.end.x) / 2;
    const midZ = (seg.start.z + seg.end.z) / 2;
    if (Math.abs(midX - x0) < EPS) return "west";
    if (Math.abs(midX - x1) < EPS) return "east";
    if (Math.abs(midZ - z0) < EPS) return "south";
    if (Math.abs(midZ - z1) < EPS) return "north";
    return null;
  }

  _doorLocal(wall, op, side, cx, cz, w, l) {
    if (!side) return null;
    const seg = wall.segmento;
    const isVertical = Math.abs(seg.start.x - seg.end.x) < EPS;
    const t = op.center ?? 0.5;
    const worldX = isVertical ? seg.start.x : seg.start.x + (seg.end.x - seg.start.x) * t;
    const worldZ = isVertical ? seg.start.z + (seg.end.z - seg.start.z) * t : seg.start.z;
    const width = op.width || 0.9;
    if (side === "west") return { side, localX: -w / 2, localZ: worldZ - cz, width };
    if (side === "east") return { side, localX: w / 2, localZ: worldZ - cz, width };
    if (side === "south") return { side, localX: worldX - cx, localZ: -l / 2, width };
    return { side, localX: worldX - cx, localZ: l / 2, width };
  }

  _disposeGroup(group) {
    group.traverse((child) => {
      if (child.isMesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose?.());
        else child.material?.dispose?.();
      }
    });
    group.clear();
  }
}
