<script setup>
import { onBeforeUnmount, onMounted, ref, watch, defineProps } from "vue";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { DragControls } from "three/examples/jsm/controls/DragControls.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { storeToRefs } from "pinia";
import { useTopologyComputed } from "../composables/useTopologyComputed";
import { useRecintosStore } from "../stores/recintos";
import { useConstructionLayersStore } from "../stores/constructionLayers";
import PropertiesSidebar from "./PropertiesSidebar.vue";
import {
  createLayerVisibilityState,
  isLayerMeshVisible,
} from "../utils/layerVisibilityEngine";

const containerRef = ref(null);
const rootRef     = ref(null);
const headerRef   = ref(null);   // ← referencia al header para medir su altura
const isFullScreen = ref(false);

const topology     = useTopologyComputed();
const recintosStore = useRecintosStore();
const layersStore  = useConstructionLayersStore();
const { constructionModeEnabled, layerVisibility } = storeToRefs(layersStore);

const props = defineProps({
  materialEstructuralId: { type: Number, default: 4 }
});

let renderer, scene, camera, controls, dragControls, frameId;
const wallMeshes = new Map();
const roomMeshes = new Map();
let buildingGroup, wallsGroup, roomsGroup;
let cameraFitted = false;
let resizeObserver;

// Mapa para gestionar animaciones de rebote (click/dragstart)
const bouncingMeshes = new Map();

const WALL_HEIGHT = 2.4;

// ── Texturas ─────────────────────────────────────────────────────────────────
// Se asignan DIRECTAMENTE al material (comportamiento rápido anterior).
// wrapS/wrapT se configura en el callback onLoad del TextureLoader.
// No usamos .clone() porque no funciona bien con texturas no cargadas.
const textureLoader = new THREE.TextureLoader();

const loadTex = (url) => {
  const t = textureLoader.load(url, (tex) => {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
  });
  return t;
};

const materialsPBR = {
  1: {
    map:          'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/plywood/plywood_diff_1k.jpg',
    normalMap:    'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/plywood/plywood_nor_gl_1k.jpg',
    roughnessMap: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/plywood/plywood_rough_1k.jpg',
  },
  2: {
    map:          'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/corrugated_iron_02/corrugated_iron_02_diff_1k.jpg',
    normalMap:    'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/corrugated_iron_02/corrugated_iron_02_nor_gl_1k.jpg',
    roughnessMap: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/corrugated_iron_02/corrugated_iron_02_rough_1k.jpg',
  },
  3: {
    map:          'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/castle_wall_slates/castle_wall_slates_diff_1k.jpg',
    normalMap:    'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/castle_wall_slates/castle_wall_slates_nor_gl_1k.jpg',
    roughnessMap: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/castle_wall_slates/castle_wall_slates_rough_1k.jpg',
  },
  4: {
    map:          'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/concrete_wall_004/concrete_wall_004_diff_1k.jpg',
    normalMap:    'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/concrete_wall_004/concrete_wall_004_nor_gl_1k.jpg',
    roughnessMap: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/concrete_wall_004/concrete_wall_004_rough_1k.jpg',
  },
};

const floorPBR = {
  habitacion: {
    map:          'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/wood_cabinet_worn_long/wood_cabinet_worn_long_diff_1k.jpg',
    normalMap:    'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/wood_cabinet_worn_long/wood_cabinet_worn_long_nor_gl_1k.jpg',
    roughnessMap: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/wood_cabinet_worn_long/wood_cabinet_worn_long_rough_1k.jpg',
  },
  banio: {
    map:          'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/large_floor_tiles_02/large_floor_tiles_02_diff_1k.jpg',
    normalMap:    'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/large_floor_tiles_02/large_floor_tiles_02_nor_gl_1k.jpg',
    roughnessMap: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/large_floor_tiles_02/large_floor_tiles_02_rough_1k.jpg',
  },
  comun: {
    map:          'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/smooth_concrete_floor/smooth_concrete_floor_diff_1k.jpg',
    normalMap:    'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/smooth_concrete_floor/smooth_concrete_floor_nor_gl_1k.jpg',
    roughnessMap: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/smooth_concrete_floor/smooth_concrete_floor_rough_1k.jpg',
  },
  pasillo: {
    map:          'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/laminate_floor_02/laminate_floor_02_diff_1k.jpg',
    normalMap:    'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/laminate_floor_02/laminate_floor_02_nor_gl_1k.jpg',
    roughnessMap: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/laminate_floor_02/laminate_floor_02_rough_1k.jpg',
  },
};

// Pre-cargar todas las texturas al iniciar (asignación directa = rápida)
const loadedTextures = {};
Object.keys(materialsPBR).forEach(id => {
  const u = materialsPBR[id];
  loadedTextures[id] = { map: loadTex(u.map), normalMap: loadTex(u.normalMap), roughnessMap: loadTex(u.roughnessMap) };
});

const loadedFloorTextures = {};
Object.keys(floorPBR).forEach(tipo => {
  const u = floorPBR[tipo];
  loadedFloorTextures[tipo] = { map: loadTex(u.map), normalMap: loadTex(u.normalMap), roughnessMap: loadTex(u.roughnessMap) };
});

// ── Color helpers ─────────────────────────────────────────────────────────────
const getRoomColor = (tipo, isBudgeted) => {
  if (isBudgeted) return "#ef4444";
  if (tipo === "habitacion") return "#3b82f6";
  if (tipo === "banio") return "#14b8a6";
  if (tipo === "pasillo") return "#64748b";
  return "#f59e0b";
};

const getWallColor = (wall, selectedForBudget) => {
  if (wall.recintosAdyacentes.some(id => selectedForBudget.has(id))) return "#ef4444";
  return wall.tipo === "interior" ? "#60a5fa" : "#93c5fd";
};

const getCurrentLayerState = () =>
  createLayerVisibilityState(constructionModeEnabled.value, layerVisibility.value);

const isMeshVisible = (mesh, ls = getCurrentLayerState()) =>
  isLayerMeshVisible(mesh.userData.layerTags, ls);

const syncMeshVisibility = () => {
  const ls = getCurrentLayerState();
  for (const m of wallMeshes.values()) m.visible = isMeshVisible(m, ls);
  for (const m of roomMeshes.values()) m.visible = isMeshVisible(m, ls);
};

const toMeshTransform = (wall) => {
  const { start, end } = wall.segmento;
  const dx = end.x - start.x, dz = end.z - start.z;
  return {
    centerX: (start.x + end.x) / 2,
    centerZ: (start.z + end.z) / 2,
    angle:   Math.atan2(dz, dx),
    length:  Math.hypot(dx, dz),
  };
};

// ── Scene init ────────────────────────────────────────────────────────────────
const ensureScene = () => {
  scene = new THREE.Scene();
  scene.background = new THREE.Color("#0b1220");
  scene.fog = new THREE.FogExp2("#0b1220", 0.015);

  new HDRLoader().load(
    'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/belfast_farmhouse_1k.hdr',
    (tex) => { tex.mapping = THREE.EquirectangularReflectionMapping; scene.environment = tex; }
  );

  const w = containerRef.value.clientWidth;
  const h = containerRef.value.clientHeight;

  camera = new THREE.PerspectiveCamera(60, w / Math.max(h, 1), 0.1, 3000);
  camera.position.set(12, 16, 12);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  containerRef.value.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 0, 0);

  buildingGroup = new THREE.Group(); buildingGroup.name = "building-root";
  wallsGroup    = new THREE.Group(); wallsGroup.name = "walls-group";
  roomsGroup    = new THREE.Group(); roomsGroup.name = "rooms-group";
  buildingGroup.add(wallsGroup, roomsGroup);
  scene.add(buildingGroup);

  scene.add(new THREE.AmbientLight("#ffffff", 0.45));

  const dir = new THREE.DirectionalLight("#ffffff", 1.2);
  dir.position.set(15, 25, 10);
  dir.castShadow = true;
  Object.assign(dir.shadow.mapSize, { width: 2048, height: 2048 });
  Object.assign(dir.shadow.camera, { near: 0.5, far: 100, left: -25, right: 25, top: 25, bottom: -25 });
  dir.shadow.bias = -0.001;
  scene.add(dir);

  const grassMap = textureLoader.load('https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/aerial_grass_rock/aerial_grass_rock_diff_1k.jpg', (tex) => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(40, 40);
  });
  const grassNormal = textureLoader.load('https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/aerial_grass_rock/aerial_grass_rock_nor_gl_1k.jpg', (tex) => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(40, 40);
  });

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ 
      color: "#888888", 
      map: grassMap,
      normalMap: grassNormal,
      roughness: 0.9, 
      metalness: 0.0 
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.005;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(200, 200, "#ffffff", "#ffffff");
  grid.material.opacity = 0.15;
  grid.material.transparent = true;
  scene.add(grid);

  // ── Drag Controls ─────────────────────────────────────────────────────────
  dragControls = new DragControls(roomsGroup.children, camera, renderer.domElement);
  
  dragControls.addEventListener('hoveron', (event) => {
    if (containerRef.value) containerRef.value.style.cursor = 'grab';
  });
  
  dragControls.addEventListener('hoveroff', (event) => {
    if (containerRef.value) containerRef.value.style.cursor = 'auto';
  });
  
  dragControls.addEventListener('dragstart', (event) => {
    controls.enabled = false;
    if (containerRef.value) containerRef.value.style.cursor = 'grabbing';
    const mesh = event.object;
    recintosStore.setActiveRecinto(mesh.userData.roomId);

    // Activar animación de rebote
    bouncingMeshes.set(mesh.uuid, {
      roomId: mesh.userData.roomId,
      baseY: 0.04,
      time: 0
    });
  });
  
  dragControls.addEventListener('drag', (event) => {
    event.object.position.y = 0.04; // Lock to floor
  });
  
  dragControls.addEventListener('dragend', (event) => {
    controls.enabled = true;
    if (containerRef.value) containerRef.value.style.cursor = 'grab';
    const mesh = event.object;
    // Calc coordinates from center
    const newX = mesh.position.x - mesh.scale.x / 2;
    const newZ = mesh.position.z - mesh.scale.z / 2;
    recintosStore.updateRecinto(mesh.userData.roomId, { x: newX, z: newZ });
  });
};

// ── syncWalls ─────────────────────────────────────────────────────────────────
const syncWalls = (walls, selectedForBudget) => {
  const incomingIds = new Set(walls.map(w => w.id));
  for (const [id, mesh] of wallMeshes.entries()) {
    if (!incomingIds.has(id)) {
      wallsGroup.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
      wallMeshes.delete(id);
    }
  }

  walls.forEach(wall => {
    const tf = toMeshTransform(wall);
    let mesh = wallMeshes.get(wall.id);

    if (!mesh) {
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, WALL_HEIGHT, wall.thickness),
        new THREE.MeshStandardMaterial({ color: getWallColor(wall, selectedForBudget), roughness: 0.8, metalness: 0.1 })
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.layerTags = wall.tipo === "interior"
        ? ["structure", "interior", "installations"]
        : ["structure", "facade", "insulation"];
      wallsGroup.add(mesh);
      wallMeshes.set(wall.id, mesh);
    }

    // Asignar texturas PBR directamente (rápido — aparecen en cuanto llegan)
    if (wall.tipo !== "interior") {
      const pbr = loadedTextures[props.materialEstructuralId] || loadedTextures[4];
      if (mesh.material.userData.matId !== props.materialEstructuralId) {
        const rx = Math.max(1, tf.length / 2.5);
        const ry = Math.max(1, WALL_HEIGHT / 2.5);
        mesh.material.map          = pbr.map;
        mesh.material.normalMap    = pbr.normalMap;
        mesh.material.roughnessMap = pbr.roughnessMap;
        mesh.material.map.repeat.set(rx, ry);
        mesh.material.normalMap.repeat.set(rx, ry);
        mesh.material.roughnessMap.repeat.set(rx, ry);
        mesh.material.userData.matId = props.materialEstructuralId;
        mesh.material.needsUpdate = true;
      }
      mesh.material.color.set(
        wall.recintosAdyacentes.some(id => selectedForBudget.has(id)) ? "#ef4444" : "#ffffff"
      );
    } else {
      mesh.material.color.set(getWallColor(wall, selectedForBudget));
    }

    const isGhost = selectedForBudget.size > 0 && !wall.recintosAdyacentes.some(id => selectedForBudget.has(id));
    mesh.castShadow = !isGhost;
    mesh.receiveShadow = !isGhost;
    mesh.material.transparent = isGhost;
    mesh.material.opacity = isGhost ? 0.15 : 1.0;
    mesh.material.depthWrite = !isGhost;

    mesh.scale.set(tf.length, 1, 1);
    mesh.position.set(tf.centerX, WALL_HEIGHT / 2, tf.centerZ);
    mesh.rotation.set(0, -tf.angle, 0);
    mesh.visible = isMeshVisible(mesh);
  });

  if (!cameraFitted && walls.length > 0) {
    fitCameraToWalls(walls);
    cameraFitted = true;
  }
};

// ── syncRooms ─────────────────────────────────────────────────────────────────
const syncRooms = (recintos, selectedForBudget) => {
  const incomingIds = new Set(recintos.map(r => r.id));
  for (const [id, mesh] of roomMeshes.entries()) {
    if (!incomingIds.has(id)) {
      roomsGroup.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
      roomMeshes.delete(id);
    }
  }

  recintos.forEach(recinto => {
    let mesh = roomMeshes.get(recinto.id);

    if (!mesh) {
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 0.08, 1),
        new THREE.MeshStandardMaterial({ color: getRoomColor(recinto.tipo, selectedForBudget.has(recinto.id)), roughness: 0.8, metalness: 0.05 })
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.layerTags = recinto.tipo === "banio" ? ["interior", "installations"] : ["interior"];
      mesh.userData.roomId = recinto.id;
      roomsGroup.add(mesh);
      roomMeshes.set(recinto.id, mesh);
    }

    // Texturas de piso — asignación directa
    if (mesh.material.userData.roomType !== recinto.tipo) {
      const fp = loadedFloorTextures[recinto.tipo] || loadedFloorTextures['comun'];
      const rx = Math.max(1, recinto.dimensions.w / 2);
      const rz = Math.max(1, recinto.dimensions.l / 2);
      mesh.material.map          = fp.map;
      mesh.material.normalMap    = fp.normalMap;
      mesh.material.roughnessMap = fp.roughnessMap;
      mesh.material.map.repeat.set(rx, rz);
      mesh.material.normalMap.repeat.set(rx, rz);
      mesh.material.roughnessMap.repeat.set(rx, rz);
      mesh.material.userData.roomType = recinto.tipo;
      mesh.material.needsUpdate = true;
    }

    mesh.material.color.set(
      selectedForBudget.has(recinto.id) ? "#ef4444" : (mesh.material.map ? "#ffffff" : getRoomColor(recinto.tipo, false))
    );

    const isGhost = selectedForBudget.size > 0 && !selectedForBudget.has(recinto.id);
    mesh.castShadow = !isGhost;
    mesh.receiveShadow = !isGhost;
    mesh.material.transparent = isGhost;
    mesh.material.opacity = isGhost ? 0.15 : 1.0;
    mesh.material.depthWrite = !isGhost;

    mesh.scale.set(recinto.dimensions.w, 1, recinto.dimensions.l);
    // Solo actualizar posición si no está siendo arrastrado por el usuario
    // (O si se confía en que dragend actualizará correctamente y el watcher dispara)
    mesh.position.set(recinto.coords.x + recinto.dimensions.w / 2, 0.04, recinto.coords.z + recinto.dimensions.l / 2);
    mesh.visible = isMeshVisible(mesh);

    // Highlight for active recinto
    const isActive = recinto.id === recintosStore.activeRecintoId;
    mesh.material.emissive.setHex(isActive ? 0x2563eb : 0x000000);
    mesh.material.emissiveIntensity = isActive ? 0.4 : 0;
  });
};

const fitCameraToWalls = (walls) => {
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  walls.forEach(w => {
    minX = Math.min(minX, w.segmento.start.x, w.segmento.end.x);
    maxX = Math.max(maxX, w.segmento.start.x, w.segmento.end.x);
    minZ = Math.min(minZ, w.segmento.start.z, w.segmento.end.z);
    maxZ = Math.max(maxZ, w.segmento.start.z, w.segmento.end.z);
  });
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
  const d  = Math.max((maxX - minX), (maxZ - minZ)) * 1.4;
  camera.position.set(cx + d * 0.8, Math.max(d, 8), cz + d * 0.8);
  controls.target.set(cx, 0, cz);
  controls.update();
};

// ── Resize ────────────────────────────────────────────────────────────────────
// SIEMPRE leemos de containerRef — las dimensiones se gestionan por JS, no por CSS.
const onResize = () => {
  if (!renderer || !camera || !containerRef.value) return;
  const w = containerRef.value.clientWidth;
  const h = containerRef.value.clientHeight;
  if (w === 0 || h === 0) return;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
};

// ── Fullscreen ────────────────────────────────────────────────────────────────
let savedScrollY = 0;

const toggleFullScreen = async () => {
  if (!document.fullscreenElement) {
    savedScrollY = window.scrollY;
    await rootRef.value?.requestFullscreen?.().catch(console.error);
  } else {
    await document.exitFullscreen?.();
  }
};

const applyFullscreenLayout = () => {
  if (!containerRef.value) return;
  const headerH = headerRef.value ? headerRef.value.offsetHeight : 0;
  const padding  = 16; // 1rem de padding en rootRef
  containerRef.value.style.height = `${window.innerHeight - headerH - padding * 2}px`;
  containerRef.value.style.width  = '100%';
  onResize();
};

const restoreNormalLayout = () => {
  if (!containerRef.value) return;
  containerRef.value.style.height = '';
  containerRef.value.style.width  = '';
  onResize();
};

const handleFullscreenChange = () => {
  const entering = !!document.fullscreenElement;
  isFullScreen.value = entering;

  // Esperar a que el browser haya terminado la transición antes de recalcular
  setTimeout(() => {
    if (entering) {
      applyFullscreenLayout();
    } else {
      restoreNormalLayout();
      window.scrollTo({ top: savedScrollY, behavior: 'instant' });
    }
  }, 100);
};

// ── Animate ───────────────────────────────────────────────────────────────────
const animate = () => {
  frameId = requestAnimationFrame(animate);
  controls?.update();
  
  // Procesar animaciones de rebote
  if (bouncingMeshes.size > 0) {
    for (const [uuid, state] of bouncingMeshes.entries()) {
      state.time += 0.2; // Velocidad de animación
      const mesh = roomMeshes.get(state.roomId);
      if (mesh) {
        // Medio seno para un rebote rápido hacia arriba y abajo
        mesh.position.y = state.baseY + Math.sin(state.time) * 0.15;
        if (state.time > Math.PI) {
          mesh.position.y = state.baseY;
          bouncingMeshes.delete(uuid);
        }
      } else {
        bouncingMeshes.delete(uuid);
      }
    }
  }

  if (renderer && scene && camera) renderer.render(scene, camera);
};

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(() => {
  ensureScene();

  // Click handler para limpiar selección si hace clic fuera
  renderer.domElement.addEventListener('pointerdown', (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(roomsGroup.children);
    if (intersects.length === 0) {
      recintosStore.clearActiveRecinto();
    }
  });

  const handleKeyDown = (e) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && recintosStore.activeRecintoId) {
      recintosStore.deleteRecinto(recintosStore.activeRecintoId);
    }
  };
  window.addEventListener('keydown', handleKeyDown);

  // Guardar referencia para remover el listener luego
  renderer.domElement._handleKeyDown = handleKeyDown;

  watch(
    [
      () => topology.walls.value,
      () => recintosStore.recintos,
      () => Array.from(recintosStore.selectedForBudget).sort(),
      () => recintosStore.activeRecintoId
    ],
    ([walls, recintos, selectedIds, activeId]) => {
      const sel = new Set(selectedIds);
      if (scene) syncWalls(walls, sel);
      if (scene) syncRooms(recintos, sel);
    },
    { deep: true, immediate: true }
  );

  watch([constructionModeEnabled, layerVisibility], () => { if (scene) syncMeshVisibility(); }, { deep: true, immediate: true });

  watch(() => props.materialEstructuralId, () => {
    if (scene) syncWalls(topology.walls.value, recintosStore.selectedForBudget);
  });

  document.addEventListener('fullscreenchange', handleFullscreenChange);

  // ResizeObserver solo en containerRef — onResize siempre lee de él
  resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(containerRef.value);

  window.addEventListener('resize', onResize);
  animate();
});

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
  window.removeEventListener('resize', onResize);
  if (renderer && renderer.domElement._handleKeyDown) {
    window.removeEventListener('keydown', renderer.domElement._handleKeyDown);
  }
  resizeObserver?.disconnect();
  cancelAnimationFrame(frameId);

  if (dragControls) {
    dragControls.dispose();
  }

  for (const m of wallMeshes.values()) { wallsGroup.remove(m); m.geometry.dispose(); m.material.dispose(); }
  for (const m of roomMeshes.values()) { roomsGroup.remove(m); m.geometry.dispose(); m.material.dispose(); }
  wallMeshes.clear();
  roomMeshes.clear();

  if (scene && buildingGroup) scene.remove(buildingGroup);
  if (renderer) { renderer.dispose(); renderer.domElement?.parentNode?.removeChild(renderer.domElement); }
});
</script>

<template>
  <div
    ref="rootRef"
    class="scene3d-root relative"
    :class="isFullScreen ? 'fullscreen-active' : 'normal-mode'"
  >
    <PropertiesSidebar />
    
    <button
      @click="recintosStore.addPasillo()"
      class="absolute bottom-6 left-6 z-40 bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-600 rounded-full px-5 py-3 shadow-xl flex items-center gap-2 font-bold text-sm transition-transform hover:scale-105 active:scale-95 backdrop-blur-md"
    >
      <span class="material-symbols-outlined text-[18px]">add_road</span>
      Añadir Pasillo
    </button>

    <div ref="headerRef" class="flex justify-between items-center mb-4 shrink-0">
      <h3 class="text-white font-semibold flex items-center gap-2">
        <span class="material-symbols-outlined text-primary text-sm">view_in_ar</span>
        Renderizador Volumétrico
      </h3>
      <button
        @click="toggleFullScreen"
        class="text-slate-400 hover:text-white transition-colors flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 shadow-sm"
      >
        <span class="material-symbols-outlined text-[18px]">
          {{ isFullScreen ? 'fullscreen_exit' : 'fullscreen' }}
        </span>
        <span class="text-xs font-bold uppercase tracking-wider">
          {{ isFullScreen ? 'Salir de Pantalla Completa' : 'Pantalla Completa' }}
        </span>
      </button>
    </div>

    <div ref="containerRef" class="scene3d-canvas" />
  </div>
</template>

<style scoped>
/* ── Modo Normal ─────────────────────────────────────────────────────────────── */
.scene3d-root.normal-mode {
  width: 100%;
  background: #0b1220;
  border-radius: 0.75rem;
  border: 1px solid rgba(99, 102, 241, 0.3);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.scene3d-root.normal-mode .scene3d-canvas {
  width: 100%;
  height: 500px;
  border-radius: 0.5rem;
  overflow: hidden;
  background: #0b1220;
}
</style>

<!-- Global: :fullscreen no puede ir en <style scoped> (Vue añade [data-v-xxx]) -->
<style>
.scene3d-root:fullscreen,
.scene3d-root:-webkit-full-screen {
  background: #0b1220 !important;
  border-radius: 0 !important;
  border: none !important;
  padding: 1rem !important;
  display: flex !important;
  flex-direction: column !important;
  box-shadow: none !important;
  /* width/height los gestiona el browser automáticamente en fullscreen */
}

/* El canvas en fullscreen se dimensiona por JS (applyFullscreenLayout) */
.scene3d-root:fullscreen .scene3d-canvas,
.scene3d-root:-webkit-full-screen .scene3d-canvas {
  border-radius: 0.5rem !important;
  overflow: hidden !important;
  background: #0b1220 !important;
}
</style>
