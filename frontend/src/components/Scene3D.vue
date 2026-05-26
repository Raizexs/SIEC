<script setup>
import logger from '../utils/logger.js';
/**
 * Scene3D — refactored to use modular three/ classes:
 *   - SceneManager: renderer, camera, controls, post-FX
 *   - WallBuilder: walls with CSG-cut openings
 *   - DoorWindowSystem: puertas/ventanas según tipo de recinto y layout
 *   - RoomFurnisher: procedural furniture per room type
 *   - LightingRig: day/night cycle (SunCalc)
 *   - Walkthrough: first-person navigation
 *   - MeasureTool, SectionTool, SceneExporter
 *
 * Backwards-compatible with existing Scene3D consumers in EditorShell.vue.
 */
import { onBeforeUnmount, onMounted, ref, watch, nextTick } from 'vue';
import * as THREE from 'three';
import { DragControls } from 'three/examples/jsm/controls/DragControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { storeToRefs } from 'pinia';
import gsap from 'gsap';

import { useTopologyComputed } from '../composables/useTopologyComputed';
import { useRecintosStore } from '../stores/recintos';
import { useConstructionLayersStore } from '../stores/constructionLayers';
import { useI18n } from '../composables/useI18n';

import PropertiesSidebar from './PropertiesSidebar.vue';
import MetalconAlertModal from './MetalconAlertModal.vue';
import MiniMap2D from './MiniMap2D.vue';

import {
  createLayerVisibilityState,
  isLayerMeshVisible,
} from '../utils/layerVisibilityEngine';

import MaterialLibrary from '../utils/MaterialLibrary.js';
import {
  MIN_ROOM_DIM as SPATIAL_MIN_ROOM_DIM,
  MOVE_OVERFLOW_MARGIN,
  OVERLAP_EPS as SPATIAL_OVERLAP_EPS,
  clampNumber as clampSpatialNumber,
  clampRectToTerrain,
  normalizeTerrain,
  normalizeRoomRect,
  roomOverlapsAny as spatialRoomOverlapsAny,
} from '../composables/useSpatialConstraints.js';

import { SceneManager } from '../three/SceneManager.js';
import { WallBuilder } from '../three/WallBuilder.js';
import { DoorWindowSystem } from '../three/DoorWindowSystem.js';
import { RoomFurnisher } from '../three/RoomFurnisher.js';
import { LightingRig } from '../three/LightingRig.js';
import { Walkthrough } from '../three/Walkthrough.js';
import { MeasureTool } from '../three/MeasureTool.js';
import { SectionTool } from '../three/SectionTool.js';
import { SceneExporter } from '../three/SceneExporter.js';

const props = defineProps({
  materialEstructuralId: { type: Number, default: 4 },
  /** Deben venir desde el mismo estado usado por RoomEditor2D (EditorShell). */
  terrenoAncho: { type: Number, default: 15 },
  terrenoLargo: { type: Number, default: 7 },
  /** Alineado con preferencias de producto: mostrar minimapa 2D en la escena. */
  showMinimap: { type: Boolean, default: true },
});

const containerRef = ref(null);
const rootRef = ref(null);
const headerRef = ref(null);

const isFullScreen = ref(false);
const currentTool = ref('move'); // move | scale | measure
const isWalkthrough = ref(false);
const showFurniture = ref(true);
const sectionEnabled = ref(false);
const sectionHeight = ref(1.2);
const timeOfDay = ref(13);
const cameraInfo = ref({ x: 0, z: 0, yaw: 0 });
const exportMenuOpen = ref(false);
const showLayersMenu = ref(false);
const exportFormat = ref(null);

const { t } = useI18n();

const exportFormats = computed(() => [
  { id: 'gltf', label: t('exportGltf'), icon: 'view_in_ar' },
  { id: 'obj', label: t('exportObj'), icon: 'category' },
  { id: 'ifc', label: t('exportIfc'), icon: 'architecture' },
  { id: 'png', label: t('exportPng'), icon: 'image' },
]);
const topology = useTopologyComputed();
const recintosStore = useRecintosStore();
const layersStore = useConstructionLayersStore();

const { constructionModeEnabled, layerVisibility } = storeToRefs(layersStore);

const metalconValidator = recintosStore.metalconValidator;

let sceneManager = null;
let wallBuilder = null;
let furnisher = null;
/** Aperturas (puertas/ventanas) del último sync de muros. */
let lastWallOpenings = new Map();
let lightingRig = null;
let walkthrough = null;
let measureTool = null;
let sectionTool = null;
let dragControls = null;
let transformControl = null;
let transformHelper = null;
let resizeObserver = null;
let onDocumentClick = null;

let isManipulating = false;
let savedScrollY = 0;

let stopSceneWatcher = null;
let stopLayerWatcher = null;
let stopActiveRoomWatcher = null;

const wallMeshes = new Map();
const roomMeshes = new Map();
const matLib = new MaterialLibrary();

const WALL_HEIGHT = 2.4;
const ROOM_MIN_SIZE = SPATIAL_MIN_ROOM_DIM;
const COLLISION_EPSILON = Math.max(0.03, SPATIAL_OVERLAP_EPS);

const MAT_TYPE_MAP = {
  1: 'wood_frame',
  2: 'steel_framed',
  3: 'masonry',
  4: 'concrete',
};

const LAYER_PRIORITY = [
  'structure',
  'facade',
  'insulation',
  'installations',
  'interior',
];

const FLOOR_MAT_MAP = {
  habitacion: 'wood_frame',
  banio: 'masonry',
  comun: 'wood_frame',
  areaComun: 'wood_frame',
  pasillo: 'steel_framed',
};

const getCurrentLayerState = () =>
  createLayerVisibilityState(constructionModeEnabled.value, layerVisibility.value);

const isMeshVisible = (mesh, layerState = getCurrentLayerState()) =>
  isLayerMeshVisible(mesh.userData.layerTags, layerState);

const disposeGroupRecursive = (group) => {
  if (!group) return;
  const children = [...group.children];
  for (const child of children) {
    if (child.children && child.children.length > 0) {
      disposeGroupRecursive(child);
    }
    child.geometry?.dispose();
    if (Array.isArray(child.material)) {
      child.material.forEach((m) => m?.dispose?.());
    } else {
      child.material?.dispose?.();
    }
    group.remove(child);
  }
};

const setChildLayerVisible = (child, visible, animate = false) => {
  if (!child) return;

  // Kill any active GSAP animations on this child's materials
  gsap.killTweensOf(child.material);

  const setVis = (v) => {
    child.visible = v;
    if (child.material && typeof child.material === 'object') {
      child.material.transparent = !v;
      child.material.opacity = v ? 1 : 0;
    }
  };

  if (!animate) {
    setVis(visible);
    return;
  }

  if (visible) {
    child.visible = true;
    if (child.material && typeof child.material === 'object' && !Array.isArray(child.material)) {
      child.material.transparent = true;
      child.material.opacity = 0;
      child.material.needsUpdate = true;
      gsap.to(child.material, {
        opacity: 1,
        duration: 0.35,
        ease: 'power2.out',
        onComplete: () => {
          if (child.material) {
            child.material.transparent = false;
            child.material.opacity = 1;
            child.material.needsUpdate = true;
          }
        },
      });
    }
  } else {
    if (child.material && typeof child.material === 'object' && !Array.isArray(child.material)) {
      child.material.transparent = true;
      child.material.needsUpdate = true;
      gsap.to(child.material, {
        opacity: 0,
        duration: 0.25,
        ease: 'power2.in',
        onComplete: () => {
          child.visible = false;
          if (child.material) {
            child.material.transparent = false;
            child.material.opacity = 1;
            child.material.needsUpdate = true;
          }
        },
      });
    } else {
      child.visible = false;
    }
  }
};

/**
 * Update visibility of all wall layer children based on current layer state.
 * Called when layer toggles change, without rebuilding walls.
 */
const applyLayerVisibility = (animate = true) => {
  if (!sceneManager) return;

  const layerState = getCurrentLayerState();

  for (const [id, group] of wallMeshes.entries()) {
    if (!group || !group.children) continue;

    const wallPiso = group.userData?.piso || 1;
    const floorVisible = wallPiso <= recintosStore.currentFloor;

    for (const child of group.children) {
      if (!child.userData?.layerTags) {
        child.visible = floorVisible;
        continue;
      }

      const layerVisible = isLayerMeshVisible(child.userData.layerTags, layerState);
      const targetVisible = layerVisible && floorVisible;

      if (child.visible !== targetVisible) {
        setChildLayerVisible(child, targetVisible, animate);
      }
    }
  }

};


// ── Spatial authority: same terrain rules as Editor 2D ───────────────────────
// 3D is a view/editor, not a separate source of truth. Every transform is
// normalized against the same terrain limits and collision rules used in 2D.
const terrainRect = () => normalizeTerrain({ w: props.terrenoAncho, h: props.terrenoLargo });

const meshToRoomRect = (mesh) => {
  if (!mesh?.userData?.roomId) return null;

  const width = Math.max(ROOM_MIN_SIZE, Number(mesh.scale.x) || ROOM_MIN_SIZE);
  const length = Math.max(ROOM_MIN_SIZE, Number(mesh.scale.z) || ROOM_MIN_SIZE);

  return normalizeRoomRect({
    id: mesh.userData.roomId,
    piso: mesh.userData.piso || 1,
    x: mesh.position.x - width / 2,
    z: mesh.position.z - length / 2,
    w: width,
    l: length,
  });
};

const roomRectToMesh = (mesh, rect) => {
  if (!mesh || !rect) return;

  mesh.scale.x = Math.max(ROOM_MIN_SIZE, Number(rect.w) || ROOM_MIN_SIZE);
  mesh.scale.z = Math.max(ROOM_MIN_SIZE, Number(rect.l) || ROOM_MIN_SIZE);
  mesh.scale.y = 1;

  mesh.position.x = rect.x + mesh.scale.x / 2;
  mesh.position.z = rect.z + mesh.scale.z / 2;
  mesh.position.y = 0.04 + ((mesh.userData.piso || 1) - 1) * WALL_HEIGHT;
  mesh.updateMatrixWorld(true);
};

const snapRectOrigin = (rect) => rect;

const clampMeshToTerrain = (mesh) => {
  const rect = meshToRoomRect(mesh);
  if (!rect) return null;

  const clamped = clampRectToTerrain(rect, terrainRect(), MOVE_OVERFLOW_MARGIN);
  roomRectToMesh(mesh, clamped);
  return clamped;
};

const clampMeshScaleToTerrain = (mesh) => {
  const rect = meshToRoomRect(mesh);
  if (!rect) return null;

  const terrain = terrainRect();
  const safeW = clampSpatialNumber(rect.w, ROOM_MIN_SIZE, terrain.w);
  const safeL = clampSpatialNumber(rect.l, ROOM_MIN_SIZE, terrain.h);

  const clamped = clampRectToTerrain(
    { ...rect, w: safeW, l: safeL },
    terrain,
    MOVE_OVERFLOW_MARGIN,
  );

  roomRectToMesh(mesh, clamped);
  return clamped;
};

const hasStoreCollision = (mesh) => {
  const rect = meshToRoomRect(mesh);
  if (!rect) return false;

  return spatialRoomOverlapsAny(rect, recintosStore.recintos);
};

const normalizeRoomMesh = (object) => {
  if (!object) return null;

  if (object.userData?.roomId) {
    return object;
  }

  if (object.parent?.userData?.roomId) {
    return object.parent;
  }

  return null;
};

const rememberValidTransform = (mesh) => {
  if (!mesh) return;

  mesh.userData.prevPosition = mesh.position.clone();
  mesh.userData.prevScale = mesh.scale.clone();
};

const restoreValidTransform = (mesh) => {
  if (!mesh) return;

  if (mesh.userData.prevPosition) {
    mesh.position.copy(mesh.userData.prevPosition);
  }

  if (mesh.userData.prevScale) {
    mesh.scale.copy(mesh.userData.prevScale);
  }

  mesh.updateMatrixWorld(true);
};

const getRoomBox = (mesh) => {
  mesh.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(mesh);
  box.expandByScalar(-COLLISION_EPSILON);

  return box;
};

const hasRoomCollision = (mesh) => {
  if (!sceneManager || !mesh) return false;

  const box = getRoomBox(mesh);

  for (const other of sceneManager.roomsGroup.children) {
    if (!other) continue;
    if (other === mesh) continue;
    if (!other.visible) continue;

    const sameRoom = other.userData.roomId === mesh.userData.roomId;

    if (sameRoom) continue;

    const sameFloor =
      (other.userData.piso || 1) === (mesh.userData.piso || 1);

    if (!sameFloor) continue;

    const otherBox = getRoomBox(other);

    if (box.intersectsBox(otherBox)) {
      return true;
    }
  }

  return false;
};

const validateMetalcon = () => {
  if (!metalconValidator?.validarDesdeStore) return;

  metalconValidator.validarDesdeStore(
    props.materialEstructuralId,
    recintosStore.recintos,
  );
};

watch(
  () => [
    props.materialEstructuralId,
    recintosStore.recintos.map((recinto) => recinto.piso),
  ],
  validateMetalcon,
  { deep: true },
);

const initScene = () => {
  if (!containerRef.value) return;

  sceneManager = new SceneManager(containerRef.value, {
    enablePostFX: true,
    enableShadows: true,
  });

  // Camera boundaries — evita que el usuario se aleje o se acerque demasiado.
if (sceneManager.orbit) {
  sceneManager.orbit.minDistance = 6;
  sceneManager.orbit.maxDistance = 45;

  // Evita que la cámara se vaya bajo el suelo o demasiado vertical.
  sceneManager.orbit.minPolarAngle = Math.PI * 0.12;
  sceneManager.orbit.maxPolarAngle = Math.PI * 0.48;

  // Suavizado premium.
  sceneManager.orbit.enableDamping = true;
  sceneManager.orbit.dampingFactor = 0.08;

  // Limita velocidad de zoom para que no se sienta brusco.
  sceneManager.orbit.zoomSpeed = 0.75;
  sceneManager.orbit.rotateSpeed = 0.65;
  sceneManager.orbit.panSpeed = 0.55;

  sceneManager.orbit.update();
}

  lightingRig = new LightingRig(sceneManager.scene, {
    renderer: sceneManager.renderer,
  });

  lightingRig.setTimeOfDay(timeOfDay.value);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({
      color: '#0f172a',
      roughness: 0.9,
    }),
  );

  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.005;
  ground.receiveShadow = true;
  ground.raycast = () => {};

  sceneManager.scene.add(ground);

  const grid = new THREE.GridHelper(200, 200, '#22d3ee', '#1e293b');
  grid.material.opacity = 0.15;
  grid.material.transparent = true;

  sceneManager.scene.add(grid);

  wallBuilder = new WallBuilder(matLib);
  furnisher = new RoomFurnisher(sceneManager.furnitureGroup);
  walkthrough = new Walkthrough(sceneManager, sceneManager.wallsGroup);

  measureTool = new MeasureTool(
    sceneManager.scene,
    sceneManager.camera,
    sceneManager.renderer.domElement,
  );

  sectionTool = new SectionTool(
    sceneManager.renderer,
    sceneManager.scene,
    'y',
  );

  setupDragAndTransformControls();

  sceneManager.onTick(() => {
    if (!sceneManager?.camera) return;

    cameraInfo.value.x = sceneManager.camera.position.x;
    cameraInfo.value.z = sceneManager.camera.position.z;

    const dir = new THREE.Vector3();
    sceneManager.camera.getWorldDirection(dir);

    cameraInfo.value.yaw = Math.atan2(dir.x, dir.z);
  });

  sceneManager.start();

  sceneManager.renderer.domElement.setAttribute('data-siec-scene-canvas', '');
};

const updateRoomStoreFromMesh = (mesh) => {
  commitMeshRectToStore(mesh, { positionOnly: false });
};

/** Normaliza mesh → rect (snap + límites terreno) y opcionalmente persiste en Pinia. */
const commitMeshRectToStore = (mesh, { positionOnly = false, persist = true } = {}) => {
  let rect = meshToRoomRect(mesh);
  if (!rect) return null;

  rect = snapRectOrigin(rect);
  rect = clampRectToTerrain(rect, terrainRect(), MOVE_OVERFLOW_MARGIN);
  roomRectToMesh(mesh, rect);

  if (persist) {
    if (positionOnly) {
      recintosStore.updateRecinto(mesh.userData.roomId, {
        coords: {
          x: parseFloat(rect.x.toFixed(3)),
          z: parseFloat(rect.z.toFixed(3)),
        },
      });
    } else {
      recintosStore.updateRecinto(mesh.userData.roomId, {
        dimensions: {
          w: parseFloat(rect.w.toFixed(3)),
          l: parseFloat(rect.l.toFixed(3)),
        },
        coords: {
          x: parseFloat(rect.x.toFixed(3)),
          z: parseFloat(rect.z.toFixed(3)),
        },
      });
    }
  }

  return rect;
};

const updateRoomPositionStoreFromMesh = (mesh) => {
  commitMeshRectToStore(mesh, { positionOnly: true });
};

const setupDragAndTransformControls = () => {
  if (!sceneManager) return;

  dragControls = new DragControls(
    sceneManager.roomsGroup.children,
    sceneManager.camera,
    sceneManager.renderer.domElement,
  );

  sceneManager.renderer.domElement.addEventListener(
    'pointerdown',
    (event) => {
      if (!dragControls) return;

      if (event.button !== 0) {
        dragControls.enabled = false;
        return;
      }

      dragControls.enabled = currentTool.value === 'move';
    },
    { capture: true },
  );

  sceneManager.renderer.domElement.addEventListener('pointerup', () => {
    if (dragControls && currentTool.value === 'move') {
      dragControls.enabled = true;
    }
  });

  dragControls.addEventListener('dragstart', (event) => {
    if (!sceneManager) return;

    const mesh = normalizeRoomMesh(event.object);

    if (!mesh) return;

    sceneManager.orbit.enabled = false;
    isManipulating = true;

    rememberValidTransform(mesh);
    recintosStore.setActiveRecinto(mesh.userData.roomId);
  });

  dragControls.addEventListener('drag', (event) => {
    if (!sceneManager) return;

    const mesh = normalizeRoomMesh(event.object);

    if (!mesh) return;

    const rect = commitMeshRectToStore(mesh, { positionOnly: true, persist: false });
    if (!rect) return;

    if (hasRoomCollision(mesh) || hasStoreCollision(mesh)) {
      restoreValidTransform(mesh);
      return;
    }

    rememberValidTransform(mesh);
    recintosStore.updateRecinto(mesh.userData.roomId, {
      coords: {
        x: parseFloat(rect.x.toFixed(3)),
        z: parseFloat(rect.z.toFixed(3)),
      },
    });
  });

  dragControls.addEventListener('dragend', (event) => {
    if (sceneManager?.orbit) {
      sceneManager.orbit.enabled = true;
    }

    isManipulating = false;

    const mesh = normalizeRoomMesh(event.object);

    if (mesh) {
      clampMeshToTerrain(mesh);

      if (hasRoomCollision(mesh) || hasStoreCollision(mesh)) {
        restoreValidTransform(mesh);
      }

      updateRoomPositionStoreFromMesh(mesh);
      rememberValidTransform(mesh);
      recintosStore.saveHistoryState?.();
    }
  });

  transformControl = new TransformControls(
    sceneManager.camera,
    sceneManager.renderer.domElement,
  );

  transformControl.setMode('scale');
  transformControl.showY = false;
  transformControl.enabled = false;
  transformControl.visible = false;

  transformControl.addEventListener('dragging-changed', (event) => {
    if (sceneManager?.orbit) {
      sceneManager.orbit.enabled = !event.value;
    }

    isManipulating = event.value;

    const mesh = transformControl.object;

    if (!mesh?.userData?.roomId) return;

    if (event.value) {
      rememberValidTransform(mesh);
    } else {
      clampMeshScaleToTerrain(mesh);

      if (hasRoomCollision(mesh) || hasStoreCollision(mesh)) {
        restoreValidTransform(mesh);
      }

      updateRoomStoreFromMesh(mesh);
      rememberValidTransform(mesh);
      recintosStore.saveHistoryState?.();
    }
  });

  transformControl.addEventListener('change', () => {
    if (!transformControl) return;

    const mesh = transformControl.object;

    if (!mesh || !transformControl.dragging) return;
    if (!mesh.userData.roomId) return;

    mesh.scale.x = Math.max(ROOM_MIN_SIZE, mesh.scale.x);
    mesh.scale.z = Math.max(ROOM_MIN_SIZE, mesh.scale.z);
    mesh.scale.y = 1;

    clampMeshScaleToTerrain(mesh);

    if (hasRoomCollision(mesh) || hasStoreCollision(mesh)) {
      restoreValidTransform(mesh);
      return;
    }

    rememberValidTransform(mesh);
    updateRoomStoreFromMesh(mesh);
  });

  transformHelper =
    typeof transformControl.getHelper === 'function'
      ? transformControl.getHelper()
      : transformControl;

  sceneManager.scene.add(transformHelper);
};

const syncWalls = () => {
  if (!sceneManager || !wallBuilder) return;

  const walls = topology.walls.value;
  const openings = DoorWindowSystem.generate(walls, recintosStore.recintos);
  lastWallOpenings = openings;

  const incomingIds = new Set(walls.map((wall) => wall.id));

  for (const [id, group] of wallMeshes.entries()) {
    if (!incomingIds.has(id)) {
      sceneManager.wallsGroup.remove(group);
      disposeGroupRecursive(group);
      wallMeshes.delete(id);
    }
  }

  const recintoById = new Map(
    recintosStore.recintos.map((r) => [r.id, r]),
  );

  const matTypeKey = MAT_TYPE_MAP[props.materialEstructuralId] || 'concrete';

  for (const wall of walls) {
    const ops = openings.get(wall.id) || [];
    const wallPart = wall.tipo === 'interior' ? 'interior_wall' : 'exterior_wall';

    let group = wallMeshes.get(wall.id);

    if (group) {
      sceneManager.wallsGroup.remove(group);
      disposeGroupRecursive(group);
    }

    group = wallBuilder.buildMultiLayerWall(wall, ops, {
      matTypeKey,
      wallPart,
    }, recintoById);

    group.userData.piso = wall.piso || 1;
    wallBuilder.positionWall(group, wall);

    sceneManager.wallsGroup.add(group);
    wallMeshes.set(wall.id, group);
  }

  applyLayerVisibility(false);
};

const syncRooms = () => {
  if (!sceneManager || !furnisher || !lightingRig) return;

  const recintos = recintosStore.recintos;
  const incomingIds = new Set(recintos.map((recinto) => recinto.id));

  for (const [id, mesh] of roomMeshes.entries()) {
    if (!incomingIds.has(id)) {
      sceneManager.roomsGroup.remove(mesh);
      mesh.geometry?.dispose();
      mesh.material?.dispose?.();
      roomMeshes.delete(id);
      furnisher.clearRoom(id);
    }
  }

  for (const recinto of recintos) {
    let mesh = roomMeshes.get(recinto.id);

    if (!mesh) {
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 0.08, 1),
        new THREE.MeshStandardMaterial({
          color: '#ffffff',
          roughness: 0.8,
          metalness: 0.05,
        }),
      );

      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.layerTags = [];
      mesh.userData.roomId = recinto.id;
      mesh.userData.piso = recinto.piso || 1;
      mesh.userData.prevPosition = mesh.position.clone();
      mesh.userData.prevScale = mesh.scale.clone();

      sceneManager.roomsGroup.add(mesh);
      roomMeshes.set(recinto.id, mesh);
    }

    const floorMatType = FLOOR_MAT_MAP[recinto.tipo] || 'wood_frame';
    const cacheKey = `${floorMatType}_floor_${recinto.tipo}`;

    if (mesh.material.userData.floorCacheKey !== cacheKey) {
      mesh.material.dispose();

      mesh.material = matLib.getMaterial(floorMatType, 'floor');
      mesh.material.userData.floorCacheKey = cacheKey;

      if (mesh.material.map) {
        mesh.material.map.repeat.set(
          Math.max(1, recinto.dimensions.w / 2),
          Math.max(1, recinto.dimensions.l / 2),
        );
      }
    }

    const selectedForBudget = recintosStore.selectedForBudget.has(recinto.id);

    mesh.material.color.set(selectedForBudget ? '#f5c842' : '#ffffff');
    mesh.material.transparent = false;
    mesh.material.opacity = 1.0;

    const piso = recinto.piso || 1;
    const isCurrentlyActive =
      isManipulating && recinto.id === recintosStore.activeRecintoId;

    if (!isCurrentlyActive) {
      mesh.scale.set(
        Math.max(ROOM_MIN_SIZE, recinto.dimensions.w),
        1,
        Math.max(ROOM_MIN_SIZE, recinto.dimensions.l),
      );

      mesh.position.set(
        recinto.coords.x + recinto.dimensions.w / 2,
        0.04 + (piso - 1) * WALL_HEIGHT,
        recinto.coords.z + recinto.dimensions.l / 2,
      );

      mesh.userData.prevPosition = mesh.position.clone();
      mesh.userData.prevScale = mesh.scale.clone();
    }

    mesh.userData.piso = piso;

    mesh.visible = piso <= recintosStore.currentFloor;

    mesh.material.emissive.setHex(
      recinto.id === recintosStore.activeRecintoId ? 0x2563eb : 0x000000,
    );

    mesh.material.emissiveIntensity =
      recinto.id === recintosStore.activeRecintoId ? 0.4 : 0;

    if (showFurniture.value && piso <= recintosStore.currentFloor) {
      furnisher.furnish(recinto, {
        walls: topology.walls.value,
        openings: lastWallOpenings,
        recintos,
      });
    } else {
      furnisher.clearRoom(recinto.id);
    }
  }

  furnisher.setVisible(showFurniture.value);

  if (sceneManager.outline) {
    const active =
      recintosStore.activeRecintoId && roomMeshes.has(recintosStore.activeRecintoId)
        ? roomMeshes.get(recintosStore.activeRecintoId)
        : null;

    sceneManager.setOutlineSelection(active ? [active] : []);
  }

  lightingRig.setupInteriorLights(recintos);
};


const computeSceneBounds = () => {
  const box = new THREE.Box3();

  for (const mesh of wallMeshes.values()) {
    box.expandByObject(mesh);
  }

  for (const mesh of roomMeshes.values()) {
    box.expandByObject(mesh);
  }

  if (box.isEmpty() && sceneManager?.buildingGroup) {
    box.setFromObject(sceneManager.buildingGroup);
  }

  return box;
};

const centerCamera = () => {
  if (!sceneManager) return;

  const box = computeSceneBounds();
  if (!box.isEmpty()) {
    sceneManager.fitTo(box);
  }
};

const renderSceneFrame = () => {
  if (!sceneManager) return;

  if (sceneManager.mode === 'orbit') {
    sceneManager.orbit.update();
  }

  if (sceneManager.options.enablePostFX && sceneManager.composer) {
    sceneManager.composer.render(0);
  } else {
    sceneManager.renderer.render(sceneManager.scene, sceneManager.camera);
  }
};

const captureSceneDataUrl = () => {
  try {
    const canvas = sceneManager?.renderer?.domElement;
    if (!canvas) return null;
    return canvas.toDataURL('image/jpeg', 0.9);
  } catch {
    return null;
  }
};

const inferLayerFromObject = (object) => {
  const tags = object?.userData?.layerTags;

  if (!Array.isArray(tags) || tags.length === 0) return null;

  for (const layer of LAYER_PRIORITY) {
    if (tags.includes(layer)) return layer;
  }

  return tags[0] || null;
};

const handleCloneFloor = () => {
  const result = recintosStore.cloneEntireFloor();

  if (result !== 'conflict') return;

  const target = recintosStore.currentFloor + 1;

  const confirmed = window.confirm(
    `El Piso ${target} ya tiene recintos. ¿Continuar?`,
  );

  if (!confirmed) return;

  recintosStore.recintos
    .filter((recinto) => (recinto.piso || 1) === target)
    .map((recinto) => recinto.id)
    .forEach((id) => recintosStore.deleteRecinto(id));

  recintosStore.cloneEntireFloor();
};

const toggleWalkthrough = () => {
  if (!walkthrough) return;

  if (isWalkthrough.value) {
    walkthrough.disable();
    isWalkthrough.value = false;
    return;
  }

  const firstRoom = recintosStore.recintos[0];

  const spawn = firstRoom
    ? new THREE.Vector3(
        firstRoom.coords.x + firstRoom.dimensions.w / 2,
        1.65,
        firstRoom.coords.z + firstRoom.dimensions.l / 2,
      )
    : new THREE.Vector3(0, 1.65, 0);

  walkthrough.enable(spawn);
  isWalkthrough.value = true;
};

const startAutoTour = () => {
  if (!walkthrough) return;

  const points = recintosStore.recintos.map((recinto) => ({
    x: recinto.coords.x + recinto.dimensions.w / 2,
    z: recinto.coords.z + recinto.dimensions.l / 2,
  }));

  if (points.length < 2) return;

  walkthrough.enable();
  isWalkthrough.value = true;
  walkthrough.startAutoTour(points);
};

const toggleSection = () => {
  sectionEnabled.value = !sectionEnabled.value;
  sectionTool?.setEnabled(sectionEnabled.value);
};

watch(sectionHeight, (height) => {
  sectionTool?.setHeight(height);
});

watch(currentTool, (tool, previousTool) => {
  if (!sceneManager) return;

  if (previousTool === 'measure') {
    measureTool?.disable();
  }

  if (tool === 'measure') {
    if (dragControls) dragControls.enabled = false;

    transformControl?.detach();
    measureTool?.enable();
    return;
  }

  if (tool === 'move') {
    measureTool?.disable();

    if (dragControls) {
      dragControls.enabled = true;
    }

    if (transformControl) {
      transformControl.enabled = false;
      transformControl.visible = false;
      transformControl.detach();
    }

    return;
  }

  if (tool === 'scale') {
    measureTool?.disable();

    if (dragControls) {
      dragControls.enabled = false;
    }

    if (transformControl) {
      transformControl.enabled = true;
      transformControl.visible = true;

      const id = recintosStore.activeRecintoId;

      if (id && roomMeshes.has(id)) {
        const mesh = roomMeshes.get(id);

        rememberValidTransform(mesh);
        transformControl.attach(mesh);
      }
    }
  }
});

watch(timeOfDay, (hour) => {
  lightingRig?.setTimeOfDay(hour);
});

watch(
  () => [props.terrenoAncho, props.terrenoLargo],
  () => {
    for (const mesh of roomMeshes.values()) {
      clampMeshScaleToTerrain(mesh);
      updateRoomStoreFromMesh(mesh);
      rememberValidTransform(mesh);
    }

    recintosStore.saveHistoryState?.();
  },
);


const handleExport = async (format) => {
  if (!sceneManager) return;

  const exporter = new SceneExporter({
    buildingGroup: sceneManager.buildingGroup,
    scene: sceneManager.scene,
    camera: sceneManager.camera,
    renderer: sceneManager.renderer,
  });

  exportFormat.value = format;

  try {
    if (format === 'html') {
      const blob = await exporter.exportHTML();
      SceneExporter.download(blob, 'siec-modelo-3d.html');
    } else if (format === 'png') {
      const blob = await exporter.exportImage({
        width: 3840,
        height: 2160,
      });
      SceneExporter.download(blob, 'siec-render-4k.png');
    }
  } finally {
    exportFormat.value = null;
    exportMenuOpen.value = false;
  }
};

const onResize = () => {
  sceneManager?.resize();
};

const toggleFullScreen = async () => {
  if (typeof document === 'undefined') return;

  if (!document.fullscreenElement) {
    savedScrollY = window.scrollY;

    try {
      await rootRef.value?.requestFullscreen?.();
    } catch (error) {
      logger.error('No se pudo activar pantalla completa:', error);
    }

    return;
  }

  try {
    await document.exitFullscreen?.();
  } catch (error) {
    logger.error('No se pudo salir de pantalla completa:', error);
  }
};

const applyFullscreenLayout = () => {
  if (!containerRef.value) return;

  const headerHeight = headerRef.value ? headerRef.value.offsetHeight : 0;
  const padding = 16;

  containerRef.value.style.height = `${window.innerHeight - headerHeight - padding * 2}px`;
  containerRef.value.style.width = '100%';

  onResize();
};

const restoreNormalLayout = () => {
  if (!containerRef.value) return;

  containerRef.value.style.height = '';
  containerRef.value.style.width = '';

  onResize();
};

const handleFullscreenChange = () => {
  const entering = !!document.fullscreenElement;

  isFullScreen.value = entering;

  setTimeout(() => {
    if (entering) {
      applyFullscreenLayout();
      return;
    }

    restoreNormalLayout();

    window.scrollTo({
      top: savedScrollY,
      behavior: 'auto',
    });
  }, 80);
};

const handleCanvasPointerDown = (event) => {
  if (!sceneManager) return;
  if (event.button !== 0) return;
  if (transformControl && transformControl.axis !== null) return;

  const rect = sceneManager.renderer.domElement.getBoundingClientRect();

  const mouse = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
  );

  const raycaster = new THREE.Raycaster();

  raycaster.setFromCamera(mouse, sceneManager.camera);

  const intersects = raycaster.intersectObjects(
    [
      ...sceneManager.roomsGroup.children,
      ...sceneManager.wallsGroup.children,
    ],
    true,
  );

  if (intersects.length > 0) {
    let object = intersects[0].object;

    const roomMesh = normalizeRoomMesh(object);

    if (roomMesh) {
      object = roomMesh;
      recintosStore.setActiveRecinto(object.userData.roomId);
    }

    const layerTarget = object.parent?.userData?.layerTags
      ? object.parent
      : object;

    const inferredLayer = inferLayerFromObject(layerTarget);

    if (inferredLayer) {
      layersStore.setSelectedLayer(inferredLayer);
    }

    return;
  }

  recintosStore.clearActiveRecinto();
  layersStore.setSelectedLayer(null);
};

const handleSceneCaptureRequest = (event) => {
  const complete = event?.detail?.complete;

  if (typeof complete !== 'function') return;

  if (!sceneManager?.renderer || !sceneManager?.scene || !sceneManager?.camera) {
    complete(null);
    return;
  }

  const saved = {
    position: sceneManager.camera.position.clone(),
    target: sceneManager.orbit.target.clone(),
  };

  centerCamera();

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      renderSceneFrame();
      const dataUrl = captureSceneDataUrl();

      sceneManager.camera.position.copy(saved.position);
      sceneManager.orbit.target.copy(saved.target);
      sceneManager.orbit.update();
      renderSceneFrame();

      complete(dataUrl);
    });
  });
};

onMounted(() => {
  initScene();

  if (!sceneManager || !containerRef.value) return;

  onDocumentClick = (event) => {
    if (!event.target.closest?.('.scene3d-export-menu')) {
      exportMenuOpen.value = false;
    }
    if (!event.target.closest?.('.scene3d-layers-menu')) {
      showLayersMenu.value = false;
    }
  };

  document.addEventListener('click', onDocumentClick);
  document.addEventListener('fullscreenchange', handleFullscreenChange);

  sceneManager.renderer.domElement.addEventListener(
    'pointerdown',
    handleCanvasPointerDown,
  );

  stopSceneWatcher = watch(
    [
      () => topology.walls.value,
      () => recintosStore.recintos,
      () => Array.from(recintosStore.selectedForBudget).sort(),
      () => recintosStore.activeRecintoId,
      () => recintosStore.currentFloor,
      () => props.materialEstructuralId,
      () => showFurniture.value,
    ],
    () => {
      if (!sceneManager) return;

      syncWalls();
      syncRooms();
    },
    {
      deep: true,
      immediate: true,
    },
  );

  stopLayerWatcher = watch(
    [() => constructionModeEnabled.value, () => layerVisibility.value],
    () => {
      applyLayerVisibility(true);
    },
    { deep: true },
  );

  stopActiveRoomWatcher = watch(
    () => recintosStore.activeRecintoId,
    (id) => {
      if (!transformControl) return;

      if (currentTool.value === 'scale' && id && roomMeshes.has(id)) {
        const mesh = roomMeshes.get(id);

        rememberValidTransform(mesh);
        transformControl.attach(mesh);
      } else {
        transformControl.detach();
      }
    },
  );

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(containerRef.value);
  }

  window.addEventListener('resize', onResize);
  window.addEventListener('siec:capture-scene', handleSceneCaptureRequest);
});

onBeforeUnmount(() => {
  stopSceneWatcher?.();
  stopLayerWatcher?.();
  stopActiveRoomWatcher?.();

  document.removeEventListener('fullscreenchange', handleFullscreenChange);
  window.removeEventListener('siec:capture-scene', handleSceneCaptureRequest);

  if (onDocumentClick) {
    document.removeEventListener('click', onDocumentClick);
  }

  if (sceneManager?.renderer?.domElement) {
    sceneManager.renderer.domElement.removeEventListener(
      'pointerdown',
      handleCanvasPointerDown,
    );
  }

  window.removeEventListener('resize', onResize);

  resizeObserver?.disconnect();

  measureTool?.disable();
  walkthrough?.dispose();
  furnisher?.clearAll();
  wallBuilder?.clearCache();
  lightingRig?.dispose();
  dragControls?.dispose();

  if (transformControl) {
    transformControl.detach();
    transformControl.dispose?.();
  }

  for (const group of wallMeshes.values()) {
    disposeGroupRecursive(group);
  }

  for (const mesh of roomMeshes.values()) {
    mesh.geometry?.dispose();
    mesh.material?.dispose?.();
  }

  wallMeshes.clear();
  roomMeshes.clear();

  sceneManager?.dispose();
});
</script>

<template>
  <section
    ref="rootRef"
    class="scene3d-root relative overflow-visible rounded-3xl border border-slate-200/90 bg-white/85 p-4 shadow-2xl shadow-slate-950/10 backdrop-blur-xl transition-all duration-300 dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/35"
    :class="isFullScreen ? 'fullscreen-active' : 'normal-mode'"
  >
    <PropertiesSidebar />

    <!-- Top accent -->
    <div
      class="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-400 via-orange-500 to-slate-900 dark:to-orange-300"
    ></div>

    <!-- Header -->
    <header
      ref="headerRef"
      class="relative z-20 mb-4 flex shrink-0 flex-col gap-4 rounded-3xl border border-slate-200/90 bg-slate-50/80 p-4 shadow-sm backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-900/60"
    >
      <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <!-- Left: identity + core controls -->
        <div class="min-w-0 space-y-3">
          <div class="flex flex-wrap items-center gap-3">
            <div class="flex items-center gap-3">
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
              >
                <span class="material-symbols-outlined text-[22px]">
                  view_in_ar
                </span>
              </div>

              <div>
                <p
                  class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
                >
                  {{ t('renderer') }}
                </p>

                <h3 class="mt-0.5 text-base font-black tracking-tight text-slate-950 dark:text-slate-100">
                  {{ t('realtime3D') }}
                </h3>
              </div>
            </div>

            <span
              class="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-tight text-emerald-700 shadow-sm dark:border-emerald-900/70 dark:bg-emerald-950/25 dark:text-emerald-300"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              {{ t('liveRender') }}
            </span>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <!-- Tool selector -->
            <div
              class="inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-950"
            >
              <button
                v-for="tool in [
                  { id: 'move', icon: 'pan_tool', label: t('toolMove') },
                  { id: 'scale', icon: 'open_in_full', label: t('toolScale') },
                  { id: 'measure', icon: 'straighten', label: t('toolMeasure') },
                ]"
                :key="tool.id"
                type="button"
                class="inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] transition-all duration-200 active:scale-[0.98]"
                :class="
                  currentTool === tool.id
                    ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20 dark:bg-orange-400 dark:text-orange-950'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                "
                :title="tool.label"
                @click="currentTool = tool.id"
              >
                <span class="material-symbols-outlined text-[15px]">
                  {{ tool.icon }}
                </span>
                {{ tool.label }}
              </button>
            </div>

            <!-- Floor selector -->
            <div
              class="inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-950"
            >
              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                :disabled="recintosStore.currentFloor <= 1"
                @click="recintosStore.setFloor(recintosStore.currentFloor - 1)"
              >
                -
              </button>

              <span
                class="rounded-xl border border-orange-200 bg-orange-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
              >
                {{ t('floor') }} {{ recintosStore.currentFloor }}
              </span>

              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                :disabled="recintosStore.currentFloor >= 3"
                @click="recintosStore.setFloor(recintosStore.currentFloor + 1)"
              >
                +
              </button>
          </div>

          <!-- Layers dropdown moved to right side -->

          </div>
        </div>

        <!-- Right: layers + view controls -->
        <div class="flex flex-wrap items-center gap-2 xl:justify-end">
          <!-- Layers dropdown -->
          <div class="relative scene3d-layers-menu">
            <button
              type="button"
              class="toolbar-btn is-active"
              @click.stop="showLayersMenu = !showLayersMenu"
            >
              <span class="material-symbols-outlined text-[17px]">layers</span>
              Capas
            </button>
            <Transition name="export-menu">
              <div
                v-if="showLayersMenu"
                class="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 p-3 shadow-2xl shadow-slate-950/15 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/95 dark:shadow-black/40"
              >
                <div class="space-y-1">
                  <label
                    v-for="layer in layersStore.layers"
                    :key="layer.id"
                    class="flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900"
                  >
                    <span class="flex items-center gap-2.5">
                      <span class="material-symbols-outlined text-[16px] text-slate-500 dark:text-slate-400">{{ layer.icon }}</span>
                      <span class="text-xs font-semibold" :class="layerVisibility[layer.id] ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'">{{ t(layer.labelKey) }}</span>
                    </span>
                    <span
                      class="relative inline-flex h-5 w-9 items-center rounded-full border transition-colors duration-300"
                      :class="layerVisibility[layer.id] ? 'border-emerald-400 bg-emerald-500 shadow-sm shadow-emerald-500/20' : 'border-slate-300 bg-slate-200 dark:border-slate-700 dark:bg-slate-800'"
                    >
                      <span class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-300" :class="layerVisibility[layer.id] ? 'translate-x-4' : 'translate-x-0.5'" />
                    </span>
                    <input :checked="layerVisibility[layer.id]" type="checkbox" class="sr-only" @change="layersStore.toggleLayer(layer.id)" />
                  </label>
                </div>
                <div class="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  {{ layersStore.activeLayerCount }} de 3 capas activas
                </div>
              </div>
            </Transition>
          </div>

          <button
            type="button"
            class="icon-action"
            :title="showFurniture ? 'Ocultar muebles' : 'Mostrar muebles'"
            @click="showFurniture = !showFurniture"
          >
            <span class="material-symbols-outlined text-[18px]">{{ showFurniture ? 'chair' : 'chair_alt' }}</span>
          </button>

          <!-- Export dropdown -->
          <div class="relative scene3d-export-menu">
            <button type="button" class="toolbar-btn" @click.stop="exportMenuOpen = !exportMenuOpen">
              <span class="material-symbols-outlined text-[17px]">download</span>
              Exportar
            </button>
            <Transition name="export-menu">
              <div
                v-if="exportMenuOpen"
                class="export-menu-panel absolute right-0 top-full z-[100] mt-2 min-w-[14rem] w-56 rounded-3xl border border-orange-200/90 bg-white p-2 shadow-2xl shadow-orange-500/15 dark:border-orange-800/80 dark:bg-slate-950 dark:shadow-black/50"
                role="menu"
              >
                <button
                  v-for="fmt in [
                    { id: 'png', label: 'Imagen PNG', icon: 'image' },
                    { id: 'html', label: 'Visor HTML', icon: 'language' },
                  ]"
                  :key="fmt.id"
                  type="button"
                  class="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-xs font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-100"
                  @click="handleExport(fmt.id)"
                >
                  <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300">
                    <span class="material-symbols-outlined text-[16px]">{{ fmt.icon }}</span>
                  </span>
                  <span class="min-w-0 flex-1">{{ fmt.label }}</span>
                  <span v-if="exportFormat === fmt.id" class="material-symbols-outlined animate-spin text-[15px] text-orange-500">progress_activity</span>
                </button>
              </div>
            </Transition>
          </div>

          <button
            type="button"
            class="icon-action"
            :class="isWalkthrough ? 'is-active' : ''"
            title="Walkthrough"
            @click="toggleWalkthrough"
          >
            <span class="material-symbols-outlined text-[18px]">{{ isWalkthrough ? 'directions_run' : 'directions_walk' }}</span>
          </button>

          <button
            type="button"
            class="icon-action"
            title="Centrar cámara"
            @click="centerCamera"
          >
            <span class="material-symbols-outlined text-[18px]">my_location</span>
          </button>

          <button
            type="button"
            class="icon-action"
            title="Pantalla completa"
            @click="toggleFullScreen"
          >
            <span class="material-symbols-outlined text-[18px]">{{ isFullScreen ? 'fullscreen_exit' : 'fullscreen' }}</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Canvas shell -->
    <div
      ref="containerRef"
      class="scene3d-canvas relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 shadow-inner dark:border-slate-800"
    >
      <MiniMap2D
        :visible="showMinimap"
        :recintos="recintosStore.recintos"
        :camera-pos="cameraInfo"
      />

      <transition name="fade">
        <div
          v-if="isWalkthrough"
          class="absolute left-1/2 top-4 z-30 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-full border border-emerald-200 bg-white/90 px-4 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-700 shadow-xl shadow-slate-950/10 backdrop-blur-xl dark:border-emerald-900/70 dark:bg-slate-950/90 dark:text-slate-200 dark:shadow-black/30"
        >
          <span class="text-emerald-600 dark:text-emerald-300">WASD</span>
          Mover
          <span class="text-slate-300 dark:text-slate-700">·</span>
          <span class="text-emerald-600 dark:text-emerald-300">Mouse</span>
          Mirar
          <span class="text-slate-300 dark:text-slate-700">·</span>
          <span class="text-emerald-600 dark:text-emerald-300">Shift</span>
          Correr
          <span class="text-slate-300 dark:text-slate-700">·</span>
          <span class="text-red-500 dark:text-red-300">Esc</span>
          Salir
        </div>
      </transition>
    </div>

    <MetalconAlertModal
      :show="metalconValidator.showModal"
      :excepcion="metalconValidator.detalleExcepcion"
      @close="metalconValidator.cerrarModal()"
    />
  </section>
</template>

<style scoped>
.scene3d-root.normal-mode {
  width: 100%;
  display: flex;
  flex-direction: column;
}

.scene3d-root.normal-mode .scene3d-canvas {
  width: 100%;
  height: 560px;
  position: relative;
}

.toolbar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  height: 2.5rem;
  border-radius: 1rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 0 0.85rem;
  color: rgb(71 85 105);
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background-color 0.18s ease,
    color 0.18s ease,
    box-shadow 0.18s ease;
}

.toolbar-btn:hover {
  transform: translateY(-1px);
  border-color: rgb(203 213 225);
  background: rgb(248 250 252);
  color: rgb(15 23 42);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
}

.toolbar-btn:active {
  transform: scale(0.98);
}

.dark .toolbar-btn {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
  color: rgb(203 213 225);
}

.dark .toolbar-btn:hover {
  border-color: rgb(51 65 85);
  background: rgb(30 41 59);
  color: rgb(248 250 252);
}

.toolbar-btn-export {
  cursor: pointer;
  border-color: rgb(253 186 116);
  background: linear-gradient(135deg, rgb(255 247 237), rgb(255 255 255));
  color: rgb(194 65 12);
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.06),
    0 4px 14px rgba(249, 115, 22, 0.14);
}

.toolbar-btn-export:hover,
.toolbar-btn-export.is-open {
  border-color: rgb(249 115 22);
  background: rgb(255 247 237);
  color: rgb(154 52 18);
  box-shadow:
    0 4px 12px rgba(15, 23, 42, 0.08),
    0 10px 24px rgba(249, 115, 22, 0.22);
}

.dark .toolbar-btn-export {
  border-color: rgba(251, 146, 60, 0.55);
  background: linear-gradient(135deg, rgba(67, 20, 7, 0.45), rgba(15, 23, 42, 0.95));
  color: rgb(253 186 116);
}

.dark .toolbar-btn-export:hover,
.dark .toolbar-btn-export.is-open {
  border-color: rgb(251 146 60);
  background: rgba(67, 20, 7, 0.55);
  color: rgb(254 215 170);
}

.export-menu-item {
  border: 1px solid transparent;
}

.export-menu-panel {
  pointer-events: auto;
}

.icon-action {
  display: inline-flex;
  height: 2.5rem;
  width: 2.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 1rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  color: rgb(71 85 105);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background-color 0.18s ease,
    color 0.18s ease,
    box-shadow 0.18s ease;
}

.icon-action:hover {
  transform: translateY(-1px);
  border-color: rgb(203 213 225);
  background: rgb(248 250 252);
  color: rgb(15 23 42);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
}

.icon-action:active {
  transform: scale(0.98);
}

.icon-action.is-active {
  border-color: rgb(254 215 170);
  background: rgb(255 247 237);
  color: rgb(194 65 12);
}

.dark .icon-action {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
  color: rgb(203 213 225);
}

.dark .icon-action:hover {
  border-color: rgb(51 65 85);
  background: rgb(30 41 59);
  color: rgb(248 250 252);
}

.dark .icon-action.is-active {
  border-color: rgba(154, 52, 18, 0.7);
  background: rgba(67, 20, 7, 0.32);
  color: rgb(253 186 116);
}

/* Premium range input */
.premium-range {
  height: 0.45rem;
  cursor: pointer;
  appearance: none;
  border-radius: 9999px;
  background: linear-gradient(
    to right,
    rgb(249 115 22),
    rgb(251 146 60)
  );
  outline: none;
}

.premium-range::-webkit-slider-thumb {
  height: 1rem;
  width: 1rem;
  appearance: none;
  border: 3px solid white;
  border-radius: 9999px;
  background: rgb(249 115 22);
  box-shadow:
    0 8px 20px rgba(15, 23, 42, 0.18),
    0 0 0 4px rgba(249, 115, 22, 0.12);
}

.premium-range::-moz-range-thumb {
  height: 1rem;
  width: 1rem;
  border: 3px solid white;
  border-radius: 9999px;
  background: rgb(249 115 22);
  box-shadow:
    0 8px 20px rgba(15, 23, 42, 0.18),
    0 0 0 4px rgba(249, 115, 22, 0.12);
}

.dark .premium-range::-webkit-slider-thumb {
  border-color: rgb(15 23 42);
  background: rgb(251 146 60);
}

.dark .premium-range::-moz-range-thumb {
  border-color: rgb(15 23 42);
  background: rgb(251 146 60);
}

.export-menu-enter-active,
.export-menu-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.export-menu-enter-from,
.export-menu-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

<style>
.scene3d-root:fullscreen,
.scene3d-root:-webkit-full-screen {
  width: 100vw !important;
  height: 100vh !important;
  border-radius: 0 !important;
  border: none !important;
  padding: 1rem !important;
  display: flex !important;
  flex-direction: column !important;
  background:
    radial-gradient(circle at top left, rgba(249, 115, 22, 0.08), transparent 28%),
    #020617 !important;
  box-shadow: none !important;
}

.scene3d-root:fullscreen .scene3d-canvas,
.scene3d-root:-webkit-full-screen .scene3d-canvas {
  flex: 1 1 auto;
  width: 100% !important;
  min-height: 0;
  border-radius: 1.5rem !important;
  overflow: hidden !important;
  background: #020617 !important;
}
</style>