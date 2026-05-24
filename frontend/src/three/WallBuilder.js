import logger from '../utils/logger.js';
/**
 * WallBuilder — turns wall topology into 3D meshes with REAL openings (doors,
 * windows) using CSG (Constructive Solid Geometry) via three-bvh-csg.
 *
 * Falls back to plain box geometry if CSG is unavailable or disabled (perf).
 *
 * Multi-layer mode: each wall becomes a Group with separate child meshes per
 * construction layer (structure, insulation, interior, facade, installations).
 */
import * as THREE from "three";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";

const csgEvaluator = new Evaluator();
csgEvaluator.useGroups = false;

const WALL_HEIGHT = 2.4;
const STUD_SPACING = 0.4;
const STUD_WIDTH = 0.045;
const STUD_DEPTH = 0.09;
const PLATE_HEIGHT = 0.09;
const INTERIOR_PANEL_THICKNESS = 0.012;
const FACADE_PANEL_THICKNESS = 0.02;
const INSULATION_THICKNESS_FACTOR = 0.6;
const PIPE_RADIUS = 0.015;
const PIPE_HEIGHT_AGUA_FRIA = 0.35;
const PIPE_HEIGHT_AGUA_CALIENTE = 0.55;
const PIPE_HEIGHT_DESAGUE = 0.15;

const ROOM_TYPES_WITH_WATER = new Set(["banio"]);

/**
 * @typedef {{ id: string, segmento: { start: {x,z}, end: {x,z} }, thickness: number, tipo: 'interior'|'exterior', piso: number, recintosAdyacentes?: string[] }} WallTopology
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
   * (Legacy mode — used when construction mode is OFF for performance.)
   * @param {WallTopology} wall
   * @param {Opening[]} openings
   * @param {object} matCfg
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

    this.cache.set(cacheKey, mesh);
    return mesh;
  }

  /**
   * Multi-layer wall: returns a Group with separate child meshes per
   * construction layer, each independently toggleable via layerTags.
   *
   * @param {WallTopology} wall
   * @param {Opening[]} openings
   * @param {object} matCfg — { matTypeKey, wallPart }
   * @param {Map<string,object>} recintoById — mapping recintoId → recinto data
   * @returns {THREE.Group}
   */
  buildMultiLayerWall(wall, openings, matCfg, recintoById) {
    const group = new THREE.Group();
    group.userData.wallId = wall.id;
    group.name = `ml-wall-${wall.id}`;
    const length = this._wallLength(wall);
    const thickness = wall.thickness;
    const isExterior = wall.tipo === "exterior";
    const matType = matCfg.matTypeKey;

    // 1. Structure — stud frame
    const structure = this._buildStudFrame(length, thickness, matType, openings);
    structure.userData.layerTags = ["structure"];
    structure.name = "ml-layer-structure";
    group.add(structure);

    // 2. Insulation — only exterior walls
    if (isExterior) {
      const insulation = this._buildInsulationLayer(length, thickness);
      insulation.userData.layerTags = ["insulation"];
      insulation.name = "ml-layer-insulation";
      group.add(insulation);
    }

    // 3. Interior drywall panel (thin veneer, no CSG needed — openings visible via stud frame)
    const interiorPanel = this._buildPanelLayer(
      length, thickness, INTERIOR_PANEL_THICKNESS,
      thickness / 2 - INTERIOR_PANEL_THICKNESS / 2,
      matType, "interior",
    );
    interiorPanel.userData.layerTags = ["interior"];
    interiorPanel.name = "ml-layer-interior";
    group.add(interiorPanel);

    // 4. Facade panel — only exterior walls
    if (isExterior) {
      const facadePanel = this._buildPanelLayer(
        length, thickness, FACADE_PANEL_THICKNESS,
        -(thickness / 2 - FACADE_PANEL_THICKNESS / 2),
        matType, "facade",
      );
      facadePanel.userData.layerTags = ["facade"];
      facadePanel.name = "ml-layer-facade";
      group.add(facadePanel);
    }

    // 5. Installations — pipes for walls adjacent to bathrooms
    const needsWater = this._wallNeedsWaterPipes(wall, recintoById);
    if (needsWater) {
      const pipes = this._buildWaterPipes(length, thickness);
      pipes.userData.layerTags = ["installations"];
      pipes.name = "ml-layer-installations";
      group.add(pipes);
    }

    return group;
  }

  // ── Multi-layer helper builders ───────────────────────────────────────

  /**
   * Generates a stud frame skeleton: bottom plate, top plate, vertical studs.
   * Skips studs that fall within door/window opening zones.
   */
  _buildStudFrame(length, thickness, matType, openings = []) {
    const material = this.materialLibrary.getLayerMaterial(matType, "structure");
    const group = new THREE.Group();

    const studColor = matType === "steel_framed" ? "#B0B8C0" : "#D4B896";
    const hy = WALL_HEIGHT / 2;

    const openingZones = openings.map((op) => {
      const center = (op.center ?? 0.5) * length - length / 2;
      const width = op.width || (op.type === "door" ? 0.9 : 1.2);
      const height = op.height || (op.type === "door" ? 2.05 : 1.2);
      const sill = op.type === "door" ? 0 : (op.sillHeight ?? 1.0);
      return { type: op.type, xMin: center - width / 2, xMax: center + width / 2, yMin: sill - hy, yMax: sill + height - hy };
    });

    const plateMat = new THREE.MeshStandardMaterial({
      color: studColor,
      roughness: 0.7,
      metalness: matType === "steel_framed" ? 0.3 : 0.0,
    });

    // Bottom plate (at floor level)
    const bottomPlate = new THREE.Mesh(
      new THREE.BoxGeometry(length, PLATE_HEIGHT, STUD_DEPTH),
      plateMat.clone(),
    );
    bottomPlate.position.set(0, -hy + PLATE_HEIGHT / 2, 0);
    bottomPlate.castShadow = true;
    bottomPlate.receiveShadow = true;
    group.add(bottomPlate);

    // Top plate (doble solera superior)
    const topPlate = new THREE.Mesh(
      new THREE.BoxGeometry(length, PLATE_HEIGHT, STUD_DEPTH),
      plateMat.clone(),
    );
    topPlate.position.set(0, hy - PLATE_HEIGHT / 2, 0);
    topPlate.castShadow = true;
    topPlate.receiveShadow = true;
    group.add(topPlate);

    const topPlate2 = new THREE.Mesh(
      new THREE.BoxGeometry(length, PLATE_HEIGHT, STUD_DEPTH),
      plateMat.clone(),
    );
    topPlate2.position.set(0, hy - PLATE_HEIGHT * 1.5, 0);
    topPlate2.castShadow = true;
    topPlate2.receiveShadow = true;
    group.add(topPlate2);

    // Vertical studs every STUD_SPACING, skipping opening zones
    const numStuds = Math.floor(length / STUD_SPACING) + 1;
    for (let i = 0; i < numStuds; i++) {
      const x = -length / 2 + i * STUD_SPACING;

      const inDoorZone = openingZones.some(
        (z) => z.type === "door" && x >= z.xMin + STUD_WIDTH && x <= z.xMax - STUD_WIDTH,
      );

      if (inDoorZone) continue;

      const windowZone = openingZones.find(
        (z) => z.type === "window" && x >= z.xMin + STUD_WIDTH && x <= z.xMax - STUD_WIDTH,
      );

      if (windowZone) {
        // Stud above window (from window top to top plate)
        const aboveH = hy - windowZone.yMax;
        if (aboveH > 0.01) {
          const aboveStud = new THREE.Mesh(
            new THREE.BoxGeometry(STUD_WIDTH, aboveH, STUD_DEPTH),
            plateMat.clone(),
          );
          aboveStud.position.set(x, windowZone.yMax + aboveH / 2, 0);
          aboveStud.castShadow = true;
          group.add(aboveStud);
        }

        // Stud below window sill (from bottom plate to window sill)
        const belowH = windowZone.yMin - (-hy + PLATE_HEIGHT);
        if (belowH > 0.01) {
          const belowStud = new THREE.Mesh(
            new THREE.BoxGeometry(STUD_WIDTH, belowH, STUD_DEPTH),
            plateMat.clone(),
          );
          belowStud.position.set(x, -hy + PLATE_HEIGHT + belowH / 2, 0);
          belowStud.castShadow = true;
          group.add(belowStud);
        }
        continue;
      }

      // Normal full-height stud centered
      const stud = new THREE.Mesh(
        new THREE.BoxGeometry(STUD_WIDTH, WALL_HEIGHT, STUD_DEPTH),
        plateMat.clone(),
      );
      stud.position.set(x, 0, 0);
      stud.castShadow = true;
      stud.receiveShadow = true;
      group.add(stud);
    }

    return group;
  }

  /**
   * Insulation layer — slightly recessed fill between studs
   */
  _buildInsulationLayer(length, thickness) {
    const inset = STUD_DEPTH * 0.2;
    const insulWidth = STUD_DEPTH - inset * 2;
    const geom = new THREE.BoxGeometry(length, WALL_HEIGHT, insulWidth);
    const material = this.materialLibrary.getLayerMaterial("wood_frame", "insulation");
    if (material.map) {
      material.map.repeat.set(Math.max(1, length / 3), Math.max(1, WALL_HEIGHT / 3));
    }
    const mesh = new THREE.Mesh(geom, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  /**
   * Panel layer (interior drywall or exterior facade) — thin box.
   * No CSG cutouts needed; stud frame visually indicates openings.
   */
  _buildPanelLayer(length, thickness, panelThickness, zOffset, matType, layer) {
    const geom = new THREE.BoxGeometry(length, WALL_HEIGHT, panelThickness);
    const material = this.materialLibrary.getLayerMaterial(matType, layer);
    if (material.map) {
      material.map.repeat.set(Math.max(1, length / 2.5), Math.max(1, WALL_HEIGHT / 2.5));
    }
    const mesh = new THREE.Mesh(geom, material);
    mesh.position.set(0, 0, zOffset);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  /**
   * Water pipes (copper color) running along the wall.
   * Only for walls adjacent to bathrooms.
   */
  _buildWaterPipes(length, thickness) {
    const group = new THREE.Group();
    const hy = WALL_HEIGHT / 2;
    const matAguaFria = new THREE.MeshStandardMaterial({
      color: 0x4488cc,
      roughness: 0.3,
      metalness: 0.6,
    });
    const matAguaCaliente = new THREE.MeshStandardMaterial({
      color: 0xcc5533,
      roughness: 0.3,
      metalness: 0.6,
    });
    const matDesague = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.4,
      metalness: 0.5,
    });

    const pipeGeom = new THREE.CylinderGeometry(PIPE_RADIUS, PIPE_RADIUS, length, 8);
    const descagueGeom = new THREE.CylinderGeometry(PIPE_RADIUS * 1.8, PIPE_RADIUS * 1.8, length, 8);

    // Agua fría (relative to group center)
    const aguaFria = new THREE.Mesh(pipeGeom, matAguaFria);
    aguaFria.rotation.z = Math.PI / 2;
    aguaFria.position.set(0, PIPE_HEIGHT_AGUA_FRIA - hy, thickness * 0.35);
    aguaFria.castShadow = true;
    group.add(aguaFria);

    // Agua caliente
    const aguaCaliente = new THREE.Mesh(pipeGeom, matAguaCaliente);
    aguaCaliente.rotation.z = Math.PI / 2;
    aguaCaliente.position.set(0, PIPE_HEIGHT_AGUA_CALIENTE - hy, thickness * 0.35);
    aguaCaliente.castShadow = true;
    group.add(aguaCaliente);

    // Desagüe
    const desague = new THREE.Mesh(descagueGeom, matDesague);
    desague.rotation.z = Math.PI / 2;
    desague.position.set(0, PIPE_HEIGHT_DESAGUE - hy, thickness * 0.38);
    desague.castShadow = true;
    group.add(desague);

    return group;
  }

  /**
   * Determines if a wall should have water pipes based on adjacent room types.
   * @param {WallTopology} wall
   * @param {Map<string,object>} recintoById
   * @returns {boolean}
   */
  _wallNeedsWaterPipes(wall, recintoById) {
    if (!recintoById || recintoById.size === 0) return false;
    const adj = wall.recintosAdyacentes || [];
    if (adj.length === 0) return false;
    return adj.some((id) => {
      const r = recintoById.get(id);
      return r && ROOM_TYPES_WITH_WATER.has(r.tipo);
    });
  }

  // ── Positioning ──────────────────────────────────────────────────────

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
    if (mesh.userData) {
      mesh.userData.length = length;
    }
  }

  // ── Internal helpers ─────────────────────────────────────────────────

  _buildOpeningBrush(op, wallLength, thickness) {
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