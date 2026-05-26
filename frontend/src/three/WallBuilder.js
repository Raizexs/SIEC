import logger from '../utils/logger.js';
/**
 * WallBuilder — turns wall topology into 3D meshes with REAL openings (doors,
 * windows) using CSG (Constructive Solid Geometry) via three-bvh-csg.
 *
 * Multi-layer mode: each wall becomes a Group with separate child meshes per
 * construction layer (structure, insulation, interior, facade, installations).
 * Each layer is visually substantial and sits at the correct depth within the wall.
 */
import * as THREE from "three";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";

const csgEvaluator = new Evaluator();
csgEvaluator.useGroups = false;

const WALL_HEIGHT = 2.4;
const STUD_SPACING = 0.4;
const STUD_WIDTH = 0.041;       // 2x3 real = ~41x65mm
const STUD_DEPTH = 0.065;
const PLATE_WIDTH = 0.065;     // same depth as studs for visual consistency
const PLATE_HEIGHT = 0.09;
const INTERIOR_PANEL_THICKNESS = 0.012;
const FACADE_PANEL_THICKNESS = 0.02;
const PLANCHE_WIDTH = 1.22;     // standard drywall sheet
const PLANCHE_HEIGHT = 2.44;

const PIPE_RADIUS = 0.015;
const PIPE_HEIGHT_AGUA_FRIA = 0.35;
const PIPE_HEIGHT_AGUA_CALIENTE = 0.55;
const PIPE_HEIGHT_DESAGUE = 0.15;

const ROOM_TYPES_WITH_WATER = new Set(["banio"]);

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

    const material = this.materialLibrary.getMaterial(matCfg.matTypeKey, matCfg.wallPart);
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
   * Multi-layer wall: returns a Group where each child is a full construction
   * layer — visually substantial and independently toggleable.
   */
  buildMultiLayerWall(wall, openings, matCfg, recintoById) {
    const group = new THREE.Group();
    group.userData.wallId = wall.id;
    group.name = `ml-wall-${wall.id}`;
    const length = this._wallLength(wall);
    const isExterior = wall.tipo === "exterior";
    const matType = matCfg.matTypeKey;

    const faceZ = STUD_DEPTH / 2;  // inner/outer face of stud frame

    // 1. Structure — stud frame with diagonal bracing
    const { group: structure, studXs } = this._buildStudFrame(length, matType, openings);
    structure.userData.layerTags = ["structure"];
    structure.name = "ml-layer-structure";
    group.add(structure);

    // 2. Insulation — individual batts between studs (exterior only)
    if (isExterior) {
      const insulation = this._buildInsulationBatts(length, studXs, openings);
      insulation.userData.layerTags = ["insulation"];
      insulation.name = "ml-layer-insulation";
      group.add(insulation);
    }

    // 3. Interior drywall — planchas with seams, flush against inner stud face
    const interiorPanel = this._buildPlanchaLayer(length, faceZ, matType, "interior", INTERIOR_PANEL_THICKNESS);
    interiorPanel.userData.layerTags = ["interior"];
    interiorPanel.name = "ml-layer-interior";
    group.add(interiorPanel);

    // 4. Facade — flush against outer stud face (exterior only)
    if (isExterior) {
      const facadePanel = this._buildFacadeLayer(length, -faceZ, matType);
      facadePanel.userData.layerTags = ["facade"];
      facadePanel.name = "ml-layer-facade";
      group.add(facadePanel);
    }

    // 5. Installations — water pipes for bathroom walls
    const needsWater = this._wallNeedsWaterPipes(wall, recintoById);
    if (needsWater) {
      const pipes = this._buildWaterPipes(length);
      pipes.userData.layerTags = ["installations"];
      pipes.name = "ml-layer-installations";
      group.add(pipes);
    }

    return group;
  }

  // ── Builders ──────────────────────────────────────────────────────────

  _buildStudFrame(length, matType, openings = []) {
    const group = new THREE.Group();
    const hy = WALL_HEIGHT / 2;

    const isMetal = matType === "steel_framed";
    const woodBase = isMetal ? "#9CA3AF" : "#C4956A";
    const woodDark = isMetal ? "#6B7280" : "#A07850";

    const openingZones = openings.map((op) => {
      const center = (op.center ?? 0.5) * length - length / 2;
      const width = op.width || (op.type === "door" ? 0.9 : 1.2);
      const height = op.height || (op.type === "door" ? 2.05 : 1.2);
      const sill = op.type === "door" ? 0 : (op.sillHeight ?? 1.0);
      return {
        type: op.type,
        xMin: center - width / 2,
        xMax: center + width / 2,
        yMin: sill - hy,
        yMax: sill + height - hy,
      };
    });

    const plateMat = new THREE.MeshStandardMaterial({
      color: woodBase,
      roughness: 0.65,
      metalness: isMetal ? 0.3 : 0.0,
    });
    const studMat = new THREE.MeshStandardMaterial({
      color: woodDark,
      roughness: 0.7,
      metalness: isMetal ? 0.25 : 0.0,
    });

    // Bottom plate
    const bp = new THREE.Mesh(
      new THREE.BoxGeometry(length, PLATE_HEIGHT, PLATE_WIDTH),
      plateMat.clone(),
    );
    bp.position.set(0, -hy + PLATE_HEIGHT / 2, 0);
    bp.castShadow = true; bp.receiveShadow = true;
    group.add(bp);

    // Double top plate
    const tp1 = new THREE.Mesh(
      new THREE.BoxGeometry(length, PLATE_HEIGHT, PLATE_WIDTH),
      plateMat.clone(),
    );
    tp1.position.set(0, hy - PLATE_HEIGHT / 2, 0);
    tp1.castShadow = true; tp1.receiveShadow = true;
    group.add(tp1);

    const tp2 = new THREE.Mesh(
      new THREE.BoxGeometry(length, PLATE_HEIGHT, PLATE_WIDTH),
      plateMat.clone(),
    );
    tp2.position.set(0, hy - PLATE_HEIGHT * 1.5, 0);
    tp2.castShadow = true; tp2.receiveShadow = true;
    group.add(tp2);

    // Stud positions — inset first/last so they don't protrude past wall ends
    const studXs = [];
    const numStuds = Math.floor(length / STUD_SPACING) + 1;
    const startX = -length / 2 + STUD_WIDTH / 2;
    for (let i = 0; i < numStuds; i++) {
      const x = startX + i * STUD_SPACING;
      if (x > length / 2 - STUD_WIDTH / 2) break;
      studXs.push(x);
    }

    for (let i = 0; i < studXs.length; i++) {
      const x = studXs[i];

      const inDoor = openingZones.some(
        (z) => z.type === "door" && x >= z.xMin + STUD_WIDTH && x <= z.xMax - STUD_WIDTH,
      );
      if (inDoor) continue;

      const winZone = openingZones.find(
        (z) => z.type === "window" && x >= z.xMin + STUD_WIDTH && x <= z.xMax - STUD_WIDTH,
      );

      if (winZone) {
        const aboveH = hy - winZone.yMax;
        if (aboveH > 0.01) {
          const s = new THREE.Mesh(
            new THREE.BoxGeometry(STUD_WIDTH, aboveH, STUD_DEPTH),
            studMat.clone(),
          );
          s.position.set(x, winZone.yMax + aboveH / 2, 0);
          s.castShadow = true; group.add(s);
        }
        const belowH = winZone.yMin - (-hy + PLATE_HEIGHT);
        if (belowH > 0.01) {
          const s = new THREE.Mesh(
            new THREE.BoxGeometry(STUD_WIDTH, belowH, STUD_DEPTH),
            studMat.clone(),
          );
          s.position.set(x, -hy + PLATE_HEIGHT + belowH / 2, 0);
          s.castShadow = true; group.add(s);
        }
        continue;
      }

      const stud = new THREE.Mesh(
        new THREE.BoxGeometry(STUD_WIDTH, WALL_HEIGHT, STUD_DEPTH),
        studMat.clone(),
      );
      stud.position.set(x, 0, 0);
      stud.castShadow = true; stud.receiveShadow = true;
      group.add(stud);
    }

    // Diagonal bracing — every 4th bay
    const braceMat = new THREE.MeshStandardMaterial({
      color: woodBase,
      roughness: 0.6,
      metalness: isMetal ? 0.3 : 0.0,
    });

    for (let i = 0; i < studXs.length - 1; i++) {
      if (i % 4 !== 0) continue;

      const x1 = studXs[i];
      const x2 = studXs[i + 1];
      if (!x1 || !x2) continue;

      const midX = (x1 + x2) / 2;
      const bayWidth = x2 - x1;
      if (bayWidth < STUD_SPACING * 0.8) continue;

      const bayInOpening = openingZones.some(
        (z) => z.xMin < x2 && z.xMax > x1,
      );
      if (bayInOpening) continue;

      const diagLen = Math.hypot(bayWidth, WALL_HEIGHT) * 0.92;
      const diagAngle = Math.atan2(WALL_HEIGHT, bayWidth);

      const brace = new THREE.Mesh(
        new THREE.BoxGeometry(diagLen, STUD_WIDTH * 0.55, STUD_DEPTH * 0.3),
        braceMat.clone(),
      );
      brace.position.set(midX, 0, 0);
      brace.rotation.z = diagAngle;
      brace.castShadow = true;
      group.add(brace);
    }

    return { group, studXs };
  }

  /**
   * Insulation as individual batts between each pair of studs.
   */
  _buildInsulationBatts(length, studXs, openings = []) {
    const group = new THREE.Group();
    const hy = WALL_HEIGHT / 2;
    const battDepth = STUD_DEPTH * 0.85;

    const insulMat = new THREE.MeshStandardMaterial({
      color: "#F0A0B0",
      roughness: 0.92,
      metalness: 0.0,
    });

    const openingZones = openings.map((op) => {
      const center = (op.center ?? 0.5) * length - length / 2;
      const width = op.width || (op.type === "door" ? 0.9 : 1.2);
      const height = op.height || (op.type === "door" ? 2.05 : 1.2);
      const sill = op.type === "door" ? 0 : (op.sillHeight ?? 1.0);
      return {
        type: op.type,
        xMin: center - width / 2,
        xMax: center + width / 2,
        yMin: sill,
        yMax: sill + height,
      };
    });

    for (let i = 0; i < studXs.length - 1; i++) {
      const bayX = studXs[i] + STUD_WIDTH / 2;
      const bayW = studXs[i + 1] - STUD_WIDTH / 2 - bayX;

      const bayMid = bayX + bayW / 2;
      const inDoor = openingZones.some(
        (z) => z.type === "door" && z.xMin <= bayMid && z.xMax >= bayMid,
      );
      if (inDoor) continue;

      // Full bay batt
      const batt = new THREE.Mesh(
        new THREE.BoxGeometry(bayW, WALL_HEIGHT, battDepth),
        insulMat.clone(),
      );
      batt.position.set(bayX + bayW / 2, 0, 0);
      batt.castShadow = true; batt.receiveShadow = true;
      group.add(batt);

      // Window bays: split batt above and below window
      const winZone = openingZones.find(
        (z) => z.type === "window" && z.xMin <= bayMid && z.xMax >= bayMid,
      );
      if (winZone) {
        batt.visible = false;
        const belowH = winZone.yMin - PLATE_HEIGHT;
        if (belowH > 0.02) {
          const b = new THREE.Mesh(
            new THREE.BoxGeometry(bayW, belowH, battDepth),
            insulMat.clone(),
          );
          b.position.set(bayX + bayW / 2, -hy + PLATE_HEIGHT + belowH / 2, 0);
          b.castShadow = true; group.add(b);
        }
        const aboveH = WALL_HEIGHT - winZone.yMax;
        if (aboveH > 0.02) {
          const b = new THREE.Mesh(
            new THREE.BoxGeometry(bayW, aboveH, battDepth),
            insulMat.clone(),
          );
          b.position.set(bayX + bayW / 2, hy - aboveH / 2, 0);
          b.castShadow = true; group.add(b);
        }
      }
    }

    return group;
  }

  /**
   * Interior drywall — individual planchas (1.22m x 2.44m) with seams.
   * Flush against inner face of studs at z = faceZ.
   */
  _buildPlanchaLayer(length, faceZ, matType, layer, panelThickness) {
    const group = new THREE.Group();
    const hy = WALL_HEIGHT / 2;
    const mat = this.materialLibrary.getLayerMaterial(matType, layer);

    // Planchas are horizontal in standard construction (long side horizontal)
    const numPanels = Math.ceil(length / PLANCHE_WIDTH);
    const seamGap = 0.003;

    const seamMat = new THREE.MeshStandardMaterial({
      color: "#D0C8C0",
      roughness: 0.9,
      metalness: 0.0,
    });

    for (let i = 0; i < numPanels; i++) {
      const panelX = -length / 2 + i * PLANCHE_WIDTH;
      let panelW = PLANCHE_WIDTH;
      if (panelX + panelW > length / 2) {
        panelW = length / 2 - panelX;
      }
      if (panelW < 0.05) continue;

      // Main panel
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(panelW - seamGap, WALL_HEIGHT, panelThickness),
        mat.clone(),
      );
      panel.position.set(panelX + panelW / 2, 0, faceZ);
      panel.castShadow = true; panel.receiveShadow = true;
      group.add(panel);

      // Seam line between panels (joint compound)
      if (i < numPanels - 1) {
        const seamX = panelX + panelW;
        const seam = new THREE.Mesh(
          new THREE.BoxGeometry(seamGap * 2, WALL_HEIGHT, panelThickness * 1.1),
          seamMat.clone(),
        );
        seam.position.set(seamX, 0, faceZ);
        group.add(seam);
      }
    }

    // Horizontal seam at half height (plancha height is 2.44m, wall is 2.4m)
    const horizSeam = new THREE.Mesh(
      new THREE.BoxGeometry(length, seamGap * 2, panelThickness * 1.1),
      seamMat.clone(),
    );
    horizSeam.position.set(0, 0, faceZ);
    group.add(horizSeam);

    return group;
  }

  /**
   * Facade layer — flush against outer face of studs.
   * Shows material-specific finish (siding planks, brick, etc).
   */
  _buildFacadeLayer(length, faceZ, matType) {
    const group = new THREE.Group();
    const mat = this.materialLibrary.getLayerMaterial(matType, "facade");
    const plankH = 0.18;  // siding plank height
    const numPlanks = Math.ceil(WALL_HEIGHT / plankH);
    const hy = WALL_HEIGHT / 2;
    const shadowGap = 0.004;

    if (matType === "masonry" || matType === "concrete") {
      // Solid panel for masonry/concrete
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(length, WALL_HEIGHT, FACADE_PANEL_THICKNESS),
        mat.clone(),
      );
      panel.position.set(0, 0, faceZ);
      panel.castShadow = true; panel.receiveShadow = true;
      group.add(panel);
    } else {
      // Individual horizontal planks for wood/vinyl siding
      for (let i = 0; i < numPlanks; i++) {
        const y = -hy + i * plankH + plankH / 2;
        const plank = new THREE.Mesh(
          new THREE.BoxGeometry(length, plankH - shadowGap, FACADE_PANEL_THICKNESS),
          mat.clone(),
        );
        plank.position.set(0, y, faceZ);
        plank.castShadow = true; plank.receiveShadow = true;
        group.add(plank);
      }
    }

    return group;
  }

  _buildWaterPipes(length) {
    const group = new THREE.Group();
    const hy = WALL_HEIGHT / 2;

    const matAguaFria = new THREE.MeshStandardMaterial({
      color: 0x4488cc, roughness: 0.3, metalness: 0.6,
    });
    const matAguaCaliente = new THREE.MeshStandardMaterial({
      color: 0xcc5533, roughness: 0.3, metalness: 0.6,
    });
    const matDesague = new THREE.MeshStandardMaterial({
      color: 0x999999, roughness: 0.35, metalness: 0.5,
    });

    const pipeGeom = new THREE.CylinderGeometry(PIPE_RADIUS, PIPE_RADIUS, length, 8);
    const descagueGeom = new THREE.CylinderGeometry(PIPE_RADIUS * 1.8, PIPE_RADIUS * 1.8, length, 8);
    const pipeZ = STUD_DEPTH / 2 + INTERIOR_PANEL_THICKNESS + PIPE_RADIUS;

    const aguaFria = new THREE.Mesh(pipeGeom, matAguaFria);
    aguaFria.rotation.z = Math.PI / 2;
    aguaFria.position.set(0, PIPE_HEIGHT_AGUA_FRIA - hy, pipeZ);
    aguaFria.castShadow = true;
    group.add(aguaFria);

    const aguaCaliente = new THREE.Mesh(pipeGeom, matAguaCaliente);
    aguaCaliente.rotation.z = Math.PI / 2;
    aguaCaliente.position.set(0, PIPE_HEIGHT_AGUA_CALIENTE - hy, pipeZ);
    aguaCaliente.castShadow = true;
    group.add(aguaCaliente);

    const desague = new THREE.Mesh(descagueGeom, matDesague);
    desague.rotation.z = Math.PI / 2;
    desague.position.set(0, PIPE_HEIGHT_DESAGUE - hy, pipeZ + PIPE_RADIUS * 2);
    desague.castShadow = true;
    group.add(desague);

    return group;
  }

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
