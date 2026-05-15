/**
 * RoomFurnisher — populates each recinto with procedural furniture meshes
 * grouped under `furnitureGroup` so they can be toggled / hidden cheaply.
 *
 * Why procedural and not GLTF? Three reasons:
 *   1. Zero asset download / no CDN dependency.
 *   2. Lights up in the timeline of a student project without sourcing models.
 *   3. Stylized look complements the architectural feel.
 *
 * GLTF loading is supported via `loadCustomGLTF()` for future expansion.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const gltfLoader = new GLTFLoader();
const PALETTES = {
  habitacion: { primary: "#94a3b8", accent: "#f59e0b", wood: "#a16207" },
  banio: { primary: "#e2e8f0", accent: "#0891b2", wood: "#cbd5e1" },
  comun: { primary: "#475569", accent: "#10b981", wood: "#92400e" },
  areaComun: { primary: "#475569", accent: "#10b981", wood: "#92400e" },
  pasillo: { primary: "#475569", accent: "#0ea5e9", wood: "#0f172a" },
};

export class RoomFurnisher {
  constructor(group) {
    this.group = group;
    this.byRoom = new Map(); // roomId → THREE.Group
  }

  furnish(recinto) {
    this.clearRoom(recinto.id);
    const { dimensions, coords, tipo, piso = 1 } = recinto;
    const w = dimensions.w;
    const l = dimensions.l;
    if (w < 1 || l < 1) return;

    const group = new THREE.Group();
    group.name = `furniture-${recinto.id}`;
    group.userData.roomId = recinto.id;
    const palette = PALETTES[tipo] || PALETTES.comun;

    const builders = {
      habitacion: () => this._buildBedroom(group, w, l, palette),
      banio: () => this._buildBathroom(group, w, l, palette),
      comun: () => this._buildLiving(group, w, l, palette),
      areaComun: () => this._buildLiving(group, w, l, palette),
      pasillo: () => this._buildHallway(group, w, l, palette),
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

  /** Optional GLTF loader for advanced scenes. */
  async loadCustomGLTF(url, roomId, options = {}) {
    const gltf = await gltfLoader.loadAsync(url);
    const node = gltf.scene;
    node.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    if (options.position) node.position.set(...options.position);
    if (options.rotationY != null) node.rotation.y = options.rotationY;
    if (options.scale) node.scale.setScalar(options.scale);
    const target = this.byRoom.get(roomId) || this._ensureRoomGroup(roomId);
    target.add(node);
    return node;
  }

  _ensureRoomGroup(roomId) {
    let group = this.byRoom.get(roomId);
    if (group) return group;
    group = new THREE.Group();
    group.userData.roomId = roomId;
    this.group.add(group);
    this.byRoom.set(roomId, group);
    return group;
  }

  _box(w, h, d, color, opts = {}) {
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: opts.roughness ?? 0.7,
      metalness: opts.metalness ?? 0.05,
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  _cylinder(r, h, color) {
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.4,
      metalness: 0.1,
    });
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  _buildBedroom(group, w, l, p) {
    // Bed
    const bed = this._box(1.4, 0.5, 1.9, p.wood);
    bed.position.set(-w / 2 + 1.0, 0.25, 0);
    group.add(bed);
    const mattress = this._box(1.35, 0.2, 1.85, "#f8fafc");
    mattress.position.copy(bed.position);
    mattress.position.y = 0.6;
    group.add(mattress);
    // Pillow
    const pillow = this._box(1.2, 0.1, 0.4, p.primary);
    pillow.position.set(bed.position.x, 0.75, -0.65);
    group.add(pillow);
    // Bedside table
    const table = this._box(0.4, 0.5, 0.4, p.wood);
    table.position.set(bed.position.x, 0.25, 1.1);
    group.add(table);
    // Lamp
    const lamp = this._cylinder(0.08, 0.4, p.accent);
    lamp.position.set(table.position.x, 0.7, table.position.z);
    group.add(lamp);
    // Closet
    if (w > 3) {
      const closet = this._box(0.6, 2.0, Math.min(1.6, l - 0.5), p.wood);
      closet.position.set(w / 2 - 0.4, 1.0, 0);
      group.add(closet);
    }
  }

  _buildBathroom(group, w, l, p) {
    // Toilet
    const toilet = this._box(0.4, 0.4, 0.6, p.primary);
    toilet.position.set(-w / 2 + 0.3, 0.2, l / 2 - 0.4);
    group.add(toilet);
    const tank = this._box(0.35, 0.5, 0.18, p.primary);
    tank.position.set(toilet.position.x, 0.65, toilet.position.z + 0.21);
    group.add(tank);
    // Sink
    const sink = this._box(0.55, 0.85, 0.4, p.wood);
    sink.position.set(w / 2 - 0.3, 0.42, l / 2 - 0.3);
    group.add(sink);
    const basin = this._box(0.5, 0.1, 0.35, p.primary);
    basin.position.set(sink.position.x, 0.9, sink.position.z);
    group.add(basin);
    // Shower
    if (w > 1.6 && l > 1.6) {
      const shower = this._box(
        Math.min(0.9, w / 2),
        2.0,
        Math.min(0.9, l / 2),
        p.accent,
        { metalness: 0.4 },
      );
      shower.material.opacity = 0.35;
      shower.material.transparent = true;
      shower.position.set(-w / 2 + 0.5, 1.0, -l / 2 + 0.5);
      group.add(shower);
    }
  }

  _buildLiving(group, w, l, p) {
    // Sofa
    const sofa = this._box(Math.min(2.2, w * 0.7), 0.5, 0.9, p.primary);
    sofa.position.set(0, 0.25, -l / 2 + 0.6);
    group.add(sofa);
    const back = this._box(
      sofa.geometry.parameters.width,
      0.6,
      0.18,
      p.primary,
    );
    back.position.set(0, 0.7, sofa.position.z - 0.36);
    group.add(back);
    // Coffee table
    const coffee = this._box(0.9, 0.35, 0.5, p.wood);
    coffee.position.set(0, 0.175, sofa.position.z + 0.9);
    group.add(coffee);
    // TV
    const tvStand = this._box(1.6, 0.45, 0.4, p.wood);
    tvStand.position.set(0, 0.225, l / 2 - 0.3);
    group.add(tvStand);
    const tv = this._box(1.4, 0.8, 0.05, "#0f172a");
    tv.position.set(0, 0.95, tvStand.position.z);
    group.add(tv);
    // Rug
    const rug = this._box(2.5, 0.02, 1.6, p.accent);
    rug.position.set(0, 0.01, 0);
    rug.material.opacity = 0.9;
    rug.material.transparent = true;
    group.add(rug);
  }

  _buildHallway(group, w, l, p) {
    // Subtle floor strip + ceiling lights only.
    const strip = this._box(
      Math.min(0.8, w - 0.2),
      0.02,
      Math.min(l - 0.4, 6),
      p.accent,
    );
    strip.position.set(0, 0.01, 0);
    strip.material.opacity = 0.7;
    strip.material.transparent = true;
    group.add(strip);
  }

  _disposeGroup(group) {
    group.traverse((child) => {
      if (child.isMesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material))
          child.material.forEach((m) => m.dispose?.());
        else child.material?.dispose?.();
      }
    });
  }
}
