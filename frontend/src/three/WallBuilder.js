import logger from '../utils/logger.js';
/**
 * WallBuilder — turns wall topology into 3D meshes with REAL openings (doors,
 * windows) using CSG (Constructive Solid Geometry) via three-bvh-csg.
 *
 * Falls back to plain box geometry if CSG is unavailable or disabled (perf).
 */
import * as THREE from "three";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";

const csgEvaluator = new Evaluator();
csgEvaluator.useGroups = false;

const WALL_HEIGHT = 2.4;
const STUD_SPACING = 0.4;
const STRUCTURE_INSET = 0.045;

/**
 * @typedef {{ id: string, segmento: { start: {x,z}, end: {x,z} }, thickness: number, tipo: 'interior'|'exterior', piso: number }} WallTopology
 * @typedef {{ id: string, wall_id: string, type: 'door'|'window', center: number, width: number, height: number, sillHeight?: number }} Opening
 */

export class WallBuilder {
  constructor(materialLibrary) {
    this.materialLibrary = materialLibrary;
    this.cache = new Map();
    this.useCSG = true;
  }

  setCSGEnabled(enabled) {
    this.useCSG = enabled;
    this.cache.clear();
  }

  /**
   * Build a single wall mesh, optionally with carved openings.
   * @param {WallTopology} wall
   * @param {Opening[]} openings  — openings whose wall_id === wall.id
   * @param {object} matCfg       — { matTypeKey: 'concrete'|'wood_frame'..., wallPart: 'interior_wall'|'exterior_wall' }
   * @returns {THREE.Mesh}
   */
  buildWall(wall, openings, matCfg) {
    const length = this._wallLength(wall);
    const cacheKey = this._cacheKey(wall, openings, matCfg, length);
    let cached = this.cache.get(cacheKey);
    if (cached) return cached.clone();

    const baseGeom = new THREE.BoxGeometry(length, WALL_HEIGHT, wall.thickness);
    let geometry = baseGeom;

    if (this.useCSG && openings.length > 0) {
      try {
        const wallBrush = new Brush(baseGeom);
        wallBrush.updateMatrixWorld();
        let result = wallBrush;
        for (const op of openings) {
          const cutBrush = this._buildOpeningBrush(op, length, wall.thickness);
          result = csgEvaluator.evaluate(result, cutBrush, SUBTRACTION);
        }
        geometry = result.geometry;
      } catch (e) {
        logger.warn("[WallBuilder] CSG failed, falling back to plain wall", e);
        geometry = baseGeom;
      }
    }

    const material = this.materialLibrary.getMaterial(
      matCfg.matTypeKey,
      matCfg.wallPart,
    );
    if (material.map) {
      const rx = Math.max(1, length / 2.5);
      const ry = Math.max(1, WALL_HEIGHT / 2.5);
      material.map.repeat.set(rx, ry);
    }
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.wallId = wall.id;
    mesh.userData.layerTags =
      wall.tipo === "interior"
        ? ["structure", "interior", "installations"]
        : ["structure", "facade", "insulation"];

    if (matCfg.matTypeKey === "steel_framed") {
      mesh.add(this._buildStudFrame(length, wall.thickness));
    }

    this.cache.set(cacheKey, mesh);
    return mesh;
  }

  positionWall(mesh, wall) {
    const length = this._wallLength(wall);
    const { start, end } = wall.segmento;
    const cx = (start.x + end.x) / 2;
    const cz = (start.z + end.z) / 2;
    const angle = Math.atan2(end.z - start.z, end.x - start.x);
    const piso = wall.piso || 1;
    mesh.position.set(cx, WALL_HEIGHT / 2 + (piso - 1) * WALL_HEIGHT, cz);
    mesh.rotation.set(0, -angle, 0);
    mesh.scale.set(1, 1, 1);
    mesh.userData.length = length;
  }

  _buildOpeningBrush(op, wallLength, thickness) {
    // Doors: full height starting at 0; Windows: float with sill height.
    const sill = op.type === "door" ? 0 : (op.sillHeight ?? 1.0);
    const cutHeight = op.height || (op.type === "door" ? 2.05 : 1.2);
    const cutWidth = op.width || (op.type === "door" ? 0.9 : 1.2);
    const localX = (op.center ?? 0.5) * wallLength - wallLength / 2;
    const localY = sill + cutHeight / 2 - WALL_HEIGHT / 2;
    const cutGeom = new THREE.BoxGeometry(cutWidth, cutHeight, thickness * 1.4);
    const brush = new Brush(cutGeom);
    brush.position.set(localX, localY, 0);
    brush.updateMatrixWorld();
    return brush;
  }

  _buildStudFrame(length, thickness) {
    const frame = new THREE.Group();
    frame.name = "metalcon-stud-frame";
    const structureMaterial = this.materialLibrary.getMaterial("steel_framed", "structure");

    frame.add(this._buildUChannel(length, thickness, structureMaterial, -WALL_HEIGHT / 2 + STRUCTURE_INSET));
    frame.add(this._buildUChannel(length, thickness, structureMaterial, WALL_HEIGHT / 2 - STRUCTURE_INSET, true));

    const studCount = Math.max(2, Math.ceil(length / STUD_SPACING));
    const availableLength = Math.max(length - 2 * STRUCTURE_INSET, 0.4);
    const gap = availableLength / studCount;

    for (let index = 0; index <= studCount; index++) {
      const x = -length / 2 + STRUCTURE_INSET + gap * index;
      frame.add(this._buildCStud(thickness, structureMaterial, x));
    }

    return frame;
  }

  _buildUChannel(length, thickness, material, yPosition, invert = false) {
    const group = new THREE.Group();
    const profileDepth = Math.max(0.045, Math.min(thickness * 0.8, 0.12));
    const flangeDepth = Math.max(0.02, profileDepth * 0.35);
    const webHeight = 0.035;
    const flangeOffset = profileDepth / 2 - flangeDepth / 2;
    const side = invert ? -1 : 1;

    const web = new THREE.Mesh(
      new THREE.BoxGeometry(length, webHeight, profileDepth),
      material.clone(),
    );
    web.position.set(0, yPosition, 0);
    group.add(web);

    const leftFlange = new THREE.Mesh(
      new THREE.BoxGeometry(length, 0.14, flangeDepth),
      material.clone(),
    );
    leftFlange.position.set(0, yPosition + side * 0.07, flangeOffset);
    group.add(leftFlange);

    const rightFlange = new THREE.Mesh(
      new THREE.BoxGeometry(length, 0.14, flangeDepth),
      material.clone(),
    );
    rightFlange.position.set(0, yPosition + side * 0.07, -flangeOffset);
    group.add(rightFlange);

    return group;
  }

  _buildCStud(thickness, material, xPosition) {
    const group = new THREE.Group();
    const profileDepth = Math.max(0.04, Math.min(thickness * 0.75, 0.11));
    const flangeDepth = Math.max(0.018, profileDepth * 0.32);
    const studHeight = WALL_HEIGHT - 0.16;
    const flangeOffset = profileDepth / 2 - flangeDepth / 2;

    const web = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, studHeight, profileDepth),
      material.clone(),
    );
    web.position.set(xPosition, 0, 0);
    group.add(web);

    const upperFlange = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, flangeDepth, profileDepth),
      material.clone(),
    );
    upperFlange.position.set(xPosition + 0.07, studHeight / 2 - 0.05, flangeOffset);
    group.add(upperFlange);

    const lowerFlange = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, flangeDepth, profileDepth),
      material.clone(),
    );
    lowerFlange.position.set(xPosition + 0.07, -studHeight / 2 + 0.05, flangeOffset);
    group.add(lowerFlange);

    return group;
  }

  _wallLength(wall) {
    const { start, end } = wall.segmento;
    return Math.hypot(end.x - start.x, end.z - start.z);
  }

  _cacheKey(wall, openings, matCfg, length) {
    const opsKey = openings
      .map((o) => `${o.type}@${o.center?.toFixed(2)}x${o.width}x${o.height}`)
      .join("|");
    return `${matCfg.matTypeKey}/${matCfg.wallPart}/${length.toFixed(2)}/${wall.thickness}/${opsKey}`;
  }

  clearCache() {
    for (const mesh of this.cache.values()) {
      mesh.geometry?.dispose();
    }
    this.cache.clear();
  }
}