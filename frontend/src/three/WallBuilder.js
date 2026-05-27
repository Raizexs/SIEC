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
const STRUCTURE_INSET = 0.045; // inset for U-channel placement at top/bottom plates

// Modular cladding panels
const PANEL_GAP      = 0.005;   // 5 mm visible joint between sheets
const DRYWALL_WIDTH  = 1.20;    // Volcanita / yeso-cartón (ancho)
const DRYWALL_HEIGHT = 2.40;    // Volcanita / yeso-cartón (alto)
const OSB_WIDTH      = 1.22;    // OSB / terciado estructural (ancho)
const OSB_HEIGHT     = 2.44;    // OSB / terciado estructural (alto)
// Anti Z-Fighting
const ZFIGHT_EPSILON = 0.001;   // offset mínimo para separar capas coplanares

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

    if (matCfg.matTypeKey === "steel_framed") {
      mesh.add(this._buildMetalconStudFrame(length, wall.thickness));
    }

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

    // El extractor de topología normaliza los segmentos canónicamente
    // (izquierda→derecha, abajo→arriba), por lo que para ~50 % de los muros
    // el eje local +Z apunta hacia el EXTERIOR del recinto en lugar del interior.
    // Calculamos el signo correcto comparando la dirección local +Z con el
    // vector "centro del muro → centro del recinto adyacente".
    const layerSign = this._layerSignForWall(wall, recintoById);

    // Offsets anti Z-Fighting: el panel arranca justo en la cara del pie derecho.
    const interiorFaceZ = layerSign  * (STUD_DEPTH / 2 + INTERIOR_PANEL_THICKNESS / 2 + ZFIGHT_EPSILON);
    const facadeFaceZ   = -layerSign * (STUD_DEPTH / 2 + FACADE_PANEL_THICKNESS / 2 + ZFIGHT_EPSILON);

    // 1. Structure — stud frame with diagonal bracing
    const { group: structure, studXs } = this._buildStudFrame(length, matType, openings);
    structure.userData.layerTags = ["structure"];
    structure.name = "ml-layer-structure";
    group.add(structure);

    // Paneles de relleno para vanos de ventana — solo se muestran cuando
    // la capa estructura está aislada (sin fachada ni interior), para que
    // el entramado se vea completo sin huecos de ventana.
    const windowFills = this._buildWindowFills(length, openings, matType);
    windowFills.userData.layerTags = ["structure"];
    windowFills.name = "ml-layer-structure-solid";
    windowFills.visible = false;
    group.add(windowFills);

    // 2. Insulation — omitida del render MVP visual (capa invisible por defecto)
    void studXs; // studXs se preserva por compatibilidad futura

    // 3. Interior drywall — planchas modulares pegadas a la cara interior
    const interiorPanel = this._buildPlanchaLayer(length, interiorFaceZ, matType, "interior", INTERIOR_PANEL_THICKNESS, openings);
    interiorPanel.userData.layerTags = ["interior"];
    interiorPanel.name = "ml-layer-interior";
    group.add(interiorPanel);

    // 4. Facade — planchas OSB pegadas a la cara exterior (sólo muros exteriores)
    if (isExterior) {
      const facadePanel = this._buildFacadeLayer(length, facadeFaceZ, matType, openings);
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

    // 6. Door/window frames and glass panes in each opening
    if (openings.length > 0) {
      const framesGroup = this._buildOpeningFrames(openings, length, isExterior);
      framesGroup.userData.layerTags = ["facade", "interior"];
      framesGroup.name = "ml-layer-frames";
      group.add(framesGroup);
    }

    return group;
  }

  _buildOpeningFrames(openings, wallLength, isExterior) {
    const group = new THREE.Group();
    const hy = WALL_HEIGHT / 2;
    const totalDepth = STUD_DEPTH + FACADE_PANEL_THICKNESS + INTERIOR_PANEL_THICKNESS;

    const frameMat = new THREE.MeshStandardMaterial({ color: "#D4C4A8", roughness: 0.6, metalness: 0.0 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: "#a8d8ea",
      roughness: 0.05,
      metalness: 0.1,
      transparent: true,
      opacity: 0.35,
    });

    for (const op of openings) {
      const cx = (op.center ?? 0.5) * wallLength - wallLength / 2;
      const width = op.width || (op.type === "door" ? 0.9 : 1.2);
      const height = op.height || (op.type === "door" ? 2.05 : 1.2);
      const sill = op.type === "door" ? 0 : (op.sillHeight ?? 1.0);
      const localY = sill + height / 2 - hy;
      const frameT = 0.05;

      // Jambs (left and right verticals)
      for (const side of [-1, 1]) {
        const jamb = new THREE.Mesh(
          new THREE.BoxGeometry(frameT, height, totalDepth),
          frameMat.clone(),
        );
        jamb.position.set(cx + side * (width / 2 + frameT / 2), localY, 0);
        jamb.castShadow = true;
        group.add(jamb);
      }

      // Header (top horizontal)
      const header = new THREE.Mesh(
        new THREE.BoxGeometry(width + frameT * 2, frameT, totalDepth),
        frameMat.clone(),
      );
      header.position.set(cx, sill + height - hy + frameT / 2, 0);
      header.castShadow = true;
      group.add(header);

      // Sill (bottom horizontal, windows only)
      if (op.type === "window") {
        const sillMesh = new THREE.Mesh(
          new THREE.BoxGeometry(width + frameT * 2, frameT, totalDepth),
          frameMat.clone(),
        );
        sillMesh.position.set(cx, sill - hy - frameT / 2, 0);
        sillMesh.castShadow = true;
        group.add(sillMesh);

        // Glass pane (exterior walls only)
        if (isExterior) {
          const glass = new THREE.Mesh(
            new THREE.BoxGeometry(width - frameT, height - frameT * 2, 0.006),
            glassMat.clone(),
          );
          glass.position.set(cx, localY, 0);
          group.add(glass);
        }
      }
    }

    return group;
  }

  // ── Builders ──────────────────────────────────────────────────────────

  /**
   * Genera el esqueleto de entramado ligero conforme a norma NCh:
   *   • Solera inferior continua
   *   • Doble solera superior superpuesta
   *   • Pie derechos a 40 cm eje a eje, anclados en ambos extremos del muro
   *   • Cadenetas (noggins) horizontales a 1.22 m del piso — coinciden con
   *     el borde superior de las planchas de revestimiento
   *   • Riostras diagonales que nacen y mueren en nodos estructurales reales
   *     (esquina superior ↔ base opuesta), sin quedar "flotando"
   */
  _buildStudFrame(length, matType, openings = []) {
    const group = new THREE.Group();
    const hy = WALL_HEIGHT / 2;

    const isMetal = matType === "steel_framed";
    const woodBase = isMetal ? "#9CA3AF" : "#C4956A";
    const woodDark = isMetal ? "#6B7280" : "#A07850";

    const openingZones = openings.map((op) => {
      const center = (op.center ?? 0.5) * length - length / 2;
      const width  = op.width  || (op.type === "door" ? 0.9  : 1.2);
      const height = op.height || (op.type === "door" ? 2.05 : 1.2);
      const sill   = op.type === "door" ? 0 : (op.sillHeight ?? 1.0);
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

    // ── Solera inferior (segmentada en puertas) ───────────────────────
    const plateY = -hy + PLATE_HEIGHT / 2;
    const doorZones = openingZones
      .filter((z) => z.type === "door")
      .sort((a, b) => a.xMin - b.xMin);
    const bottomBreaks = new Set([-length / 2, length / 2]);
    for (const dz of doorZones) {
      bottomBreaks.add(dz.xMin);
      bottomBreaks.add(dz.xMax);
    }
    const sortedBreaks = [...bottomBreaks].sort((a, b) => a - b);
    for (let i = 0; i < sortedBreaks.length - 1; i++) {
      const x1 = sortedBreaks[i];
      const x2 = sortedBreaks[i + 1];
      const segW = x2 - x1;
      if (segW < 0.001) continue;
      const midX = (x1 + x2) / 2;
      const inDoor = doorZones.some((dz) => midX > dz.xMin && midX < dz.xMax);
      if (inDoor) continue;
      const seg = new THREE.Mesh(
        new THREE.BoxGeometry(segW, PLATE_HEIGHT, PLATE_WIDTH),
        plateMat.clone(),
      );
      seg.position.set(midX, plateY, 0);
      seg.castShadow = true; seg.receiveShadow = true;
      group.add(seg);
    }

    // ── Doble solera superior ─────────────────────────────────────────
    // tp1 = plato superior (toca la losa / cubierta)
    // tp2 = plato inferior de la doble solera (sobre los pie derechos)
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

    // ── Geometría de los pie derechos ─────────────────────────────────
    // Altura real del pie derecho: entre cara superior de solera inferior y
    // cara inferior del segundo plato de la doble solera.
    const studBottom  = -hy + PLATE_HEIGHT;          // cara superior solera inferior
    const studTop     =  hy - 2 * PLATE_HEIGHT;      // cara inferior del plato tp2
    const studHeight  = studTop - studBottom;
    const studCenterY = (studBottom + studTop) / 2;

    // ── Posiciones de pie derechos: 40 cm eje a eje ───────────────────
    // Siempre incluye un pie derecho en cada extremo del muro.
    const firstX = -length / 2 + STUD_WIDTH / 2;
    const lastX  =  length / 2 - STUD_WIDTH / 2;
    const studXs = [firstX];
    let sx = firstX + STUD_SPACING;
    while (sx < lastX - STUD_SPACING * 0.1) {
      studXs.push(sx);
      sx += STUD_SPACING;
    }
    if (length > STUD_WIDTH * 2 + 0.01) studXs.push(lastX);

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
        // Tramo sobre la ventana (entre dintel y solera superior)
        const aboveH = studTop - winZone.yMax;
        if (aboveH > 0.01) {
          const s = new THREE.Mesh(
            new THREE.BoxGeometry(STUD_WIDTH, aboveH, STUD_DEPTH),
            studMat.clone(),
          );
          s.position.set(x, winZone.yMax + aboveH / 2, 0);
          s.castShadow = true; group.add(s);
        }
        // Tramo bajo la ventana (entre solera inferior y alféizar)
        const belowH = winZone.yMin - studBottom;
        if (belowH > 0.01) {
          const s = new THREE.Mesh(
            new THREE.BoxGeometry(STUD_WIDTH, belowH, STUD_DEPTH),
            studMat.clone(),
          );
          s.position.set(x, studBottom + belowH / 2, 0);
          s.castShadow = true; group.add(s);
        }
        continue;
      }

      // Pie derecho completo — altura exacta entre ambas soleras
      const stud = new THREE.Mesh(
        new THREE.BoxGeometry(STUD_WIDTH, studHeight, STUD_DEPTH),
        studMat.clone(),
      );
      stud.position.set(x, studCenterY, 0);
      stud.castShadow = true; stud.receiveShadow = true;
      group.add(stud);
    }

    // ── Cadenetas a 1.22 m del piso ──────────────────────────────────
    // Coinciden con el borde horizontal de las planchas de revestimiento,
    // evitan el pandeo de los pie derechos y rigidizan el sistema.
    const nogginY   = -hy + 1.22;
    const nogginMat = new THREE.MeshStandardMaterial({
      color: woodBase,
      roughness: 0.65,
      metalness: isMetal ? 0.3 : 0.0,
    });

    for (let i = 0; i < studXs.length - 1; i++) {
      const nx1 = studXs[i]     + STUD_WIDTH / 2;
      const nx2 = studXs[i + 1] - STUD_WIDTH / 2;
      const nw  = nx2 - nx1;
      if (nw < 0.01) continue;

      // Omitir si la cadeneta solapa una apertura (usa el ancho total del vano)
      const blocked = openingZones.some(
        (z) => z.xMin < nx2 && z.xMax > nx1
            && z.yMin <= nogginY + PLATE_HEIGHT / 2
            && z.yMax >= nogginY - PLATE_HEIGHT / 2,
      );
      if (blocked) continue;

      const noggin = new THREE.Mesh(
        new THREE.BoxGeometry(nw, PLATE_HEIGHT, STUD_DEPTH),
        nogginMat.clone(),
      );
      noggin.position.set((nx1 + nx2) / 2, nogginY, 0);
      noggin.castShadow = true;
      group.add(noggin);
    }

    // ── Riostras diagonales ───────────────────────────────────────────
    // Cada riostra nace en un nodo de esquina de la trama (unión solera /
    // pie derecho extremo) y desciende en ángulo ~55° hasta la solera
    // opuesta cruzando los pie derechos intermedios.
    // Se añade una desde cada extremo del muro (una "V" abierta).
    const braceMat = new THREE.MeshStandardMaterial({
      color: woodBase,
      roughness: 0.6,
      metalness: isMetal ? 0.3 : 0.0,
    });

    // Span horizontal de 3 vanos (3 × 40 cm = 1.2 m) → ángulo ≈ 60.6°
    const BRACE_SPAN = STUD_SPACING * 3;
    const braceLen   = Math.hypot(BRACE_SPAN, studHeight);
    const diagAngle  = Math.atan2(studHeight, BRACE_SPAN);

    const addBrace = (centerX, rotZ) => {
      const bx1 = centerX - BRACE_SPAN / 2;
      const bx2 = centerX + BRACE_SPAN / 2;
      const inOpening = openingZones.some((z) => z.xMin < bx2 && z.xMax > bx1);
      if (inOpening) return;
      const brace = new THREE.Mesh(
        new THREE.BoxGeometry(braceLen, STUD_WIDTH * 0.7, STUD_DEPTH * 0.35),
        braceMat.clone(),
      );
      brace.position.set(centerX, studCenterY, 0);
      brace.rotation.z = rotZ;
      brace.castShadow = true;
      group.add(brace);
    };

    // Riostra izquierda: desciende de esquina sup-izq → inf-der
    if (length >= BRACE_SPAN + STUD_WIDTH) {
      addBrace(firstX + BRACE_SPAN / 2, -diagAngle);
    }
    // Riostra derecha: desciende de esquina sup-der → inf-izq (espejada)
    if (length >= BRACE_SPAN * 2 + STUD_WIDTH * 2 + 0.05) {
      addBrace(lastX - BRACE_SPAN / 2, diagAngle);
    }

    return { group, studXs };
  }

  /**
   * Paneles de relleno para vanos de ventana. Cuando la capa estructura se
   * muestra aislada, estos paneles tapan los huecos de ventana para que el
   * entramado se vea completo (sin construir un segundo frame entero).
   */
  _buildWindowFills(length, openings, matType) {
    const group = new THREE.Group();
    if (!openings || openings.length === 0) return group;

    const hy = WALL_HEIGHT / 2;
    const isMetal = matType === "steel_framed";
    const woodDark = isMetal ? "#6B7280" : "#A07850";

    const fillMat = new THREE.MeshStandardMaterial({
      color: woodDark,
      roughness: 0.7,
      metalness: isMetal ? 0.25 : 0.0,
    });

    for (const op of openings) {
      if (op.type !== "window") continue;
      const cx = (op.center ?? 0.5) * length - length / 2;
      const w = op.width || 1.2;
      const h = op.height || 1.2;
      const sill = op.sillHeight ?? 1.0;

      const localY = sill + h / 2 - hy;
      const fill = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, STUD_DEPTH),
        fillMat.clone(),
      );
      fill.position.set(cx, localY, 0);
      fill.castShadow = true;
      fill.receiveShadow = true;
      group.add(fill);
    }

    return group;
  }

  /**
   * Insulation as individual batts between each pair of studs.
   */
  _buildInsulationBatts(length, studXs, openings = []) {
    const group = new THREE.Group();
    const hy = WALL_HEIGHT / 2;
    // Center the batt in the cavity between facade inner face and interior panel inner face
    // so it doesn't poke through either panel when viewed from the wall sides.
    const cavityOuter = -STUD_DEPTH / 2 + FACADE_PANEL_THICKNESS / 2; // facade inner face
    const cavityInner =  STUD_DEPTH / 2 - INTERIOR_PANEL_THICKNESS / 2; // interior inner face
    const battZ = (cavityOuter + cavityInner) / 2;
    const battDepth = (cavityInner - cavityOuter) * 0.92;

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
      batt.position.set(bayX + bayW / 2, 0, battZ);
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
          b.position.set(bayX + bayW / 2, -hy + PLATE_HEIGHT + belowH / 2, battZ);
          b.castShadow = true; group.add(b);
        }
        const aboveH = WALL_HEIGHT - winZone.yMax;
        if (aboveH > 0.02) {
          const b = new THREE.Mesh(
            new THREE.BoxGeometry(bayW, aboveH, battDepth),
            insulMat.clone(),
          );
          b.position.set(bayX + bayW / 2, hy - aboveH / 2, battZ);
          b.castShadow = true; group.add(b);
        }
      }
    }

    return group;
  }

  /**
   * Capa de revestimiento interior (yeso-cartón / Volcanita).
   * Planchas modulares de DRYWALL_WIDTH × DRYWALL_HEIGHT con junta visible
   * de PANEL_GAP entre cada unidad. Las juntas verticales coinciden con los
   * pie derechos (DRYWALL_WIDTH = 3 × STUD_SPACING = 1.20 m).
   * La capa se posiciona pegada a la cara interior del entramado (faceZ ya
   * viene desplazado para evitar Z-Fighting).
   */
  _buildPlanchaLayer(length, faceZ, matType, layer, panelThickness, openings = []) {
    const group = new THREE.Group();
    const hy = WALL_HEIGHT / 2;
    const mat = this.materialLibrary.getLayerMaterial(matType, layer);

    const isInterior = layer === "interior";
    const panelW = isInterior ? DRYWALL_WIDTH  : OSB_WIDTH;
    const panelH = isInterior ? DRYWALL_HEIGHT : OSB_HEIGHT;

    const opZones = openings.map((op) => {
      const center = (op.center ?? 0.5) * length - length / 2;
      const width  = op.width  || (op.type === "door" ? 0.9  : 1.2);
      const height = op.height || (op.type === "door" ? 2.05 : 1.2);
      const sill   = op.type === "door" ? 0 : (op.sillHeight ?? 1.0);
      return {
        xMin: center - width / 2,
        xMax: center + width / 2,
        yMin: sill - hy,
        yMax: sill + height - hy,
      };
    });

    const addPanel = (x1, x2, y1, y2) => {
      const w = x2 - x1;
      const h = y2 - y1;
      if (w < 0.01 || h < 0.01) return;
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, panelThickness),
        mat.clone(),
      );
      panel.position.set((x1 + x2) / 2, (y1 + y2) / 2, faceZ);
      panel.castShadow = true;
      panel.receiveShadow = true;
      group.add(panel);
    };

    // Columnas de planchas (eje X): paso = panelW + PANEL_GAP
    const columns = [];
    let cx = -length / 2;
    while (cx < length / 2 - 0.001) {
      const cEnd = Math.min(cx + panelW, length / 2);
      if (cEnd - cx > 0.01) columns.push({ x1: cx, x2: cEnd });
      cx = cEnd + PANEL_GAP;
    }

    // Filas de planchas (eje Y): paso = panelH + PANEL_GAP
    const rows = [];
    let ry = -hy;
    while (ry < hy - 0.001) {
      const rEnd = Math.min(ry + panelH, hy);
      if (rEnd - ry > 0.01) rows.push({ y1: ry, y2: rEnd });
      ry = rEnd + PANEL_GAP;
    }

    for (const col of columns) {
      for (const row of rows) {
        // ¿Esta celda cruza alguna apertura?
        const op = opZones.find(
          (z) => z.xMin < col.x2 && z.xMax > col.x1
              && z.yMin < row.y2 && z.yMax > row.y1,
        );

        if (!op) {
          addPanel(col.x1, col.x2, row.y1, row.y2);
          continue;
        }

        // Renderizar los cuatro trozos alrededor de la apertura
        const ox1 = Math.max(col.x1, op.xMin);
        const ox2 = Math.min(col.x2, op.xMax);
        const oy1 = Math.max(row.y1, op.yMin);
        const oy2 = Math.min(row.y2, op.yMax);

        addPanel(col.x1, col.x2, row.y1, oy1);  // bajo la apertura
        addPanel(col.x1, col.x2, oy2, row.y2);  // sobre la apertura
        addPanel(col.x1, ox1,    oy1, oy2);      // izquierda
        addPanel(ox2,    col.x2, oy1, oy2);      // derecha
      }
    }

    return group;
  }

  /**
   * Capa de revestimiento exterior.
   * • Mampostería / hormigón → paneles continuos con textura de la biblioteca.
   * • Entramado madera / metalcon → planchas OSB 1.22 × 2.44 m a color
   *   madera cruda (#D2B48C, roughness 0.9) con junta visible de 5 mm.
   *   El offset faceZ ya viene correctamente calculado para evitar Z-Fighting.
   */
  _buildFacadeLayer(length, faceZ, matType, openings = []) {
    const group = new THREE.Group();
    const mat = this.materialLibrary.getLayerMaterial(matType, "facade");
    const hy = WALL_HEIGHT / 2;

    const opZones = openings.map((op) => {
      const center = (op.center ?? 0.5) * length - length / 2;
      const width  = op.width  || (op.type === "door" ? 0.9  : 1.2);
      const height = op.height || (op.type === "door" ? 2.05 : 1.2);
      const sill   = op.type === "door" ? 0 : (op.sillHeight ?? 1.0);
      return {
        xMin: center - width / 2,
        xMax: center + width / 2,
        yMin: sill - hy,
        yMax: sill + height - hy,
      };
    });

    const fullXMin = -length / 2;
    const fullXMax = length / 2;
    const xBreaks = new Set([fullXMin, fullXMax]);
    for (const op of opZones) {
      if (op.xMin > fullXMin && op.xMin < fullXMax) xBreaks.add(op.xMin);
      if (op.xMax > fullXMin && op.xMax < fullXMax) xBreaks.add(op.xMax);
    }
    const sortedX = [...xBreaks].sort((a, b) => a - b);

    if (matType === "masonry" || matType === "concrete") {
      // Paneles continuos cortados por aperturas
      for (let i = 0; i < sortedX.length - 1; i++) {
        const x1 = sortedX[i];
        const x2 = sortedX[i + 1];
        const midX = (x1 + x2) / 2;
        const op = opZones.find((z) => z.xMin <= midX && z.xMax >= midX);
        const w = x2 - x1;

        if (!op) {
          const panel = new THREE.Mesh(
            new THREE.BoxGeometry(w, WALL_HEIGHT, FACADE_PANEL_THICKNESS),
            mat.clone(),
          );
          panel.position.set(midX, 0, faceZ);
          panel.castShadow = true; panel.receiveShadow = true;
          group.add(panel);
        } else {
          if (op.yMin > -hy) {
            const h = op.yMin + hy;
            const panel = new THREE.Mesh(
              new THREE.BoxGeometry(w, h, FACADE_PANEL_THICKNESS),
              mat.clone(),
            );
            panel.position.set(midX, -hy + h / 2, faceZ);
            panel.castShadow = true; panel.receiveShadow = true;
            group.add(panel);
          }
          if (op.yMax < hy) {
            const h = hy - op.yMax;
            const panel = new THREE.Mesh(
              new THREE.BoxGeometry(w, h, FACADE_PANEL_THICKNESS),
              mat.clone(),
            );
            panel.position.set(midX, op.yMax + h / 2, faceZ);
            panel.castShadow = true; panel.receiveShadow = true;
            group.add(panel);
          }
        }
      }
    } else {
      // Entramado madera / metalcon: OSB 1.22 × 2.44 m con junta visible
      const osbMat = new THREE.MeshStandardMaterial({
        color: "#D2B48C",
        roughness: 0.9,
        metalness: 0.0,
      });

      const addOSB = (x1, x2, y1, y2) => {
        const w = x2 - x1;
        const h = y2 - y1;
        if (w < 0.01 || h < 0.01) return;
        const panel = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, FACADE_PANEL_THICKNESS),
          osbMat.clone(),
        );
        panel.position.set((x1 + x2) / 2, (y1 + y2) / 2, faceZ);
        panel.castShadow = true; panel.receiveShadow = true;
        group.add(panel);
      };

      // Columnas de OSB (eje X)
      const columns = [];
      let cx = fullXMin;
      while (cx < fullXMax - 0.001) {
        const cEnd = Math.min(cx + OSB_WIDTH, fullXMax);
        if (cEnd - cx > 0.01) columns.push({ x1: cx, x2: cEnd });
        cx = cEnd + PANEL_GAP;
      }

      // Filas de OSB (eje Y)
      const rows = [];
      let ry = -hy;
      while (ry < hy - 0.001) {
        const rEnd = Math.min(ry + OSB_HEIGHT, hy);
        if (rEnd - ry > 0.01) rows.push({ y1: ry, y2: rEnd });
        ry = rEnd + PANEL_GAP;
      }

      for (const col of columns) {
        for (const row of rows) {
          const op = opZones.find(
            (z) => z.xMin < col.x2 && z.xMax > col.x1
                && z.yMin < row.y2 && z.yMax > row.y1,
          );

          if (!op) {
            addOSB(col.x1, col.x2, row.y1, row.y2);
            continue;
          }

          // Cuatro trozos alrededor de la apertura
          const ox1 = Math.max(col.x1, op.xMin);
          const ox2 = Math.min(col.x2, op.xMax);
          const oy1 = Math.max(row.y1, op.yMin);
          const oy2 = Math.min(row.y2, op.yMax);

          addOSB(col.x1, col.x2, row.y1, oy1);
          addOSB(col.x1, col.x2, oy2,    row.y2);
          addOSB(col.x1, ox1,    oy1,    oy2);
          addOSB(ox2,    col.x2, oy1,    oy2);
        }
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

  // ── Layer-sign resolver ───────────────────────────────────────────────

  /**
   * Determina si el eje local +Z del muro ya posicionado apunta hacia el
   * interior del recinto (+1) o hacia afuera (-1).
   *
   * El extractor de topología normaliza todos los segmentos al orden
   * canónico (x-menor primero, luego z-menor), lo que significa que para
   * los muros izquierdo y superior de un recinto rectangular el eje local +Z
   * queda invertido. Este método corrige ese signo para que los paneles
   * interiores/fachada siempre se coloquen en el lado correcto.
   *
   * Matemática: con rotation.y = -angle, la dirección local +Z en coordenadas
   * mundiales es (-sin(angle), 0, cos(angle)).  Si el producto punto de ese
   * vector con el vector "centro muro → centro recinto" es positivo, +Z apunta
   * hacia adentro del recinto (sign = +1). Si es negativo, está invertido
   * (sign = -1).
   */
  _layerSignForWall(wall, recintoById) {
    const recintoId = wall.recintosAdyacentes?.[0];
    if (!recintoId || !recintoById) return 1;
    const recinto = recintoById.get(recintoId);
    if (!recinto) return 1;

    const { start, end } = wall.segmento;
    const angle = Math.atan2(end.z - start.z, end.x - start.x);

    // Local +Z en coordenadas mundiales después de rotation.y = -angle
    const localPlusZx = -Math.sin(angle);
    const localPlusZz =  Math.cos(angle);

    // Vector "centro del muro → centro del recinto adyacente"
    const wallCx = (start.x + end.x) / 2;
    const wallCz = (start.z + end.z) / 2;
    const roomCx = recinto.coords.x + recinto.dimensions.w / 2;
    const roomCz = recinto.coords.z + recinto.dimensions.l / 2;

    const dot = (roomCx - wallCx) * localPlusZx + (roomCz - wallCz) * localPlusZz;
    return dot >= 0 ? 1 : -1;
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

  _buildMetalconStudFrame(length, thickness) {
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
