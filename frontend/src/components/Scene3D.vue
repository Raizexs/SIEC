<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { storeToRefs } from "pinia";
import { useTopologyComputed } from "../composables/useTopologyComputed";
import { useRecintosStore } from "../stores/recintos";
import { useConstructionLayersStore } from "../stores/constructionLayers";
import {
  createLayerVisibilityState,
  isLayerMeshVisible,
} from "../utils/layerVisibilityEngine";

const containerRef = ref(null);
const rootRef = ref(null);
const isFullScreen = ref(false);
const topology = useTopologyComputed();
const recintosStore = useRecintosStore();
const layersStore = useConstructionLayersStore();
const { constructionModeEnabled, layerVisibility } = storeToRefs(layersStore);

let renderer;
let scene;
let camera;
let controls;
let frameId;

const wallMeshes = new Map();
const roomMeshes = new Map();
let buildingGroup;
let wallsGroup;
let roomsGroup;
let cameraFitted = false;
let resizeObserver;

const WALL_HEIGHT = 2.4;

const getRoomColor = (tipo, isBudgeted) => {
  if (isBudgeted) return "#ef4444";
  if (tipo === "habitacion") return "#3b82f6";
  if (tipo === "banio") return "#14b8a6";
  return "#f59e0b";
};

const getWallColor = (wall, selectedForBudget) => {
  if (wall.recintosAdyacentes.some((id) => selectedForBudget.has(id))) {
    return "#ef4444";
  }
  return wall.tipo === "interior" ? "#60a5fa" : "#93c5fd";
};

const getCurrentLayerState = () =>
  createLayerVisibilityState(
    constructionModeEnabled.value,
    layerVisibility.value,
  );

const isMeshVisible = (mesh, layerState = getCurrentLayerState()) =>
  isLayerMeshVisible(mesh.userData.layerTags, layerState);

const syncMeshVisibility = () => {
  const layerState = getCurrentLayerState();

  for (const mesh of wallMeshes.values()) {
    mesh.visible = isMeshVisible(mesh, layerState);
  }

  for (const mesh of roomMeshes.values()) {
    mesh.visible = isMeshVisible(mesh, layerState);
  }
};

const toMeshTransform = (wall) => {
  const { start, end } = wall.segmento;
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const length = Math.hypot(dx, dz);

  const centerX = (start.x + end.x) / 2;
  const centerZ = (start.z + end.z) / 2;
  const angle = Math.atan2(dz, dx);

  return {
    centerX,
    centerZ,
    angle,
    length,
  };
};

const ensureScene = () => {
  scene = new THREE.Scene();
  scene.background = new THREE.Color("#0b1220");
  scene.fog = new THREE.FogExp2("#0b1220", 0.015);

  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight;

  camera = new THREE.PerspectiveCamera(
    60,
    width / Math.max(height, 1),
    0.1,
    3000,
  );
  camera.position.set(12, 16, 12);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  containerRef.value.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 0, 0);

  buildingGroup = new THREE.Group();
  buildingGroup.name = "building-root";
  wallsGroup = new THREE.Group();
  wallsGroup.name = "walls-group";
  roomsGroup = new THREE.Group();
  roomsGroup.name = "rooms-group";
  buildingGroup.add(wallsGroup);
  buildingGroup.add(roomsGroup);
  scene.add(buildingGroup);

  const ambient = new THREE.AmbientLight("#ffffff", 0.45);
  scene.add(ambient);

  const dir = new THREE.DirectionalLight("#ffffff", 1.2);
  dir.position.set(15, 25, 10);
  dir.castShadow = true;
  dir.shadow.mapSize.width = 2048;
  dir.shadow.mapSize.height = 2048;
  dir.shadow.camera.near = 0.5;
  dir.shadow.camera.far = 100;
  dir.shadow.camera.left = -25;
  dir.shadow.camera.right = 25;
  dir.shadow.camera.top = 25;
  dir.shadow.camera.bottom = -25;
  dir.shadow.bias = -0.001;
  scene.add(dir);

  const floorGeo = new THREE.PlaneGeometry(200, 200);
  const floorMat = new THREE.MeshStandardMaterial({
    color: "#0a111c",
    roughness: 0.8,
    metalness: 0.1,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.005;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(200, 200, "#3b82f6", "#1e293b");
  grid.position.y = 0;
  grid.material.opacity = 0.25;
  grid.material.transparent = true;
  scene.add(grid);
};

const syncWalls = (walls, selectedForBudget) => {
  const incomingIds = new Set(walls.map((w) => w.id));

  // remove stale meshes
  for (const [id, mesh] of wallMeshes.entries()) {
    if (!incomingIds.has(id)) {
      wallsGroup.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
      wallMeshes.delete(id);
    }
  }

  // upsert meshes
  walls.forEach((wall) => {
    const transform = toMeshTransform(wall);

    let mesh = wallMeshes.get(wall.id);
    if (!mesh) {
      const geometry = new THREE.BoxGeometry(1, WALL_HEIGHT, wall.thickness);
      const material = new THREE.MeshStandardMaterial({
        color: getWallColor(wall, selectedForBudget),
        roughness: 0.55,
        metalness: 0.1,
      });
      mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.layerTags =
        wall.tipo === "interior"
          ? ["structure", "interior", "installations"]
          : ["structure", "facade", "insulation"];
      wallsGroup.add(mesh);
      wallMeshes.set(wall.id, mesh);
    }

    mesh.material.color.set(getWallColor(wall, selectedForBudget));
    mesh.scale.set(transform.length, 1, 1);
    mesh.position.set(transform.centerX, WALL_HEIGHT / 2, transform.centerZ);
    mesh.rotation.set(0, -transform.angle, 0);
    mesh.visible = isMeshVisible(mesh);
  });

  if (!cameraFitted && walls.length > 0) {
    fitCameraToWalls(walls);
    cameraFitted = true;
  }
};

const syncRooms = (recintos, selectedForBudget) => {
  const incomingIds = new Set(recintos.map((r) => r.id));

  for (const [id, mesh] of roomMeshes.entries()) {
    if (!incomingIds.has(id)) {
      roomsGroup.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
      roomMeshes.delete(id);
    }
  }

  recintos.forEach((recinto) => {
    let mesh = roomMeshes.get(recinto.id);

    if (!mesh) {
      const geometry = new THREE.BoxGeometry(1, 0.08, 1);
      const material = new THREE.MeshStandardMaterial({
        color: getRoomColor(recinto.tipo, selectedForBudget.has(recinto.id)),
        roughness: 0.8,
        metalness: 0.05,
        transparent: true,
        opacity: 0.82,
      });
      mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.layerTags =
        recinto.tipo === "banio" ? ["interior", "installations"] : ["interior"];
      roomsGroup.add(mesh);
      roomMeshes.set(recinto.id, mesh);
    }

    mesh.material.color.set(
      getRoomColor(recinto.tipo, selectedForBudget.has(recinto.id)),
    );
    mesh.scale.set(recinto.dimensions.w, 1, recinto.dimensions.l);
    mesh.position.set(
      recinto.coords.x + recinto.dimensions.w / 2,
      0.04,
      recinto.coords.z + recinto.dimensions.l / 2,
    );
    mesh.visible = isMeshVisible(mesh);
  });
};

const fitCameraToWalls = (walls) => {
  let minX = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;

  walls.forEach((w) => {
    minX = Math.min(minX, w.segmento.start.x, w.segmento.end.x);
    maxX = Math.max(maxX, w.segmento.start.x, w.segmento.end.x);
    minZ = Math.min(minZ, w.segmento.start.z, w.segmento.end.z);
    maxZ = Math.max(maxZ, w.segmento.start.z, w.segmento.end.z);
  });

  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const extent = Math.max(maxX - minX, maxZ - minZ);
  const distance = Math.max(extent * 1.4, 8);

  camera.position.set(cx + distance * 0.8, distance, cz + distance * 0.8);
  controls.target.set(cx, 0, cz);
  controls.update();
};

const onResize = () => {
  if (!renderer || !camera || !containerRef.value) return;
  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight;
  if (width === 0 || height === 0) return;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
};

let savedScrollY = 0;

const toggleFullScreen = async () => {
  if (!document.fullscreenElement) {
    savedScrollY = window.scrollY;
    if (rootRef.value?.requestFullscreen) {
      await rootRef.value.requestFullscreen().catch(err => console.error(err));
    }
  } else {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
    }
  }
};

const handleFullscreenChange = () => {
  const isEntering = !!document.fullscreenElement;
  isFullScreen.value = isEntering;
  
  if (!isEntering) {
    setTimeout(() => {
      window.scrollTo({ top: savedScrollY, behavior: 'instant' });
    }, 10);
  }
};

const animate = () => {
  frameId = requestAnimationFrame(animate);
  if (controls) controls.update();
  if (renderer && scene && camera) renderer.render(scene, camera);
};

onMounted(() => {
  ensureScene();
  watch(
    [
      () => topology.walls.value,
      () => recintosStore.recintos,
      () => Array.from(recintosStore.selectedForBudget).sort(),
    ],
    ([walls, recintos, selectedIds]) => {
      const selectedSet = new Set(selectedIds);
      if (scene) syncWalls(walls, selectedSet);
      if (scene) syncRooms(recintos, selectedSet);
    },
    { deep: true, immediate: true },
  );

  watch(
    [constructionModeEnabled, layerVisibility],
    () => {
      syncMeshVisibility();
    },
    { deep: true, immediate: true },
  );

  document.addEventListener('fullscreenchange', handleFullscreenChange);

  resizeObserver = new ResizeObserver(() => {
    onResize();
  });
  
  if (containerRef.value) {
    resizeObserver.observe(containerRef.value);
  }

  animate();
});

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
  if (resizeObserver) resizeObserver.disconnect();
  
  if (frameId) cancelAnimationFrame(frameId);

  for (const mesh of wallMeshes.values()) {
    wallsGroup.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  }
  wallMeshes.clear();

  for (const mesh of roomMeshes.values()) {
    roomsGroup.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  }
  roomMeshes.clear();

  if (scene && buildingGroup) {
    scene.remove(buildingGroup);
  }

  if (renderer) {
    renderer.dispose();
    if (renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
  }
});
</script>

<template>
  <div ref="rootRef" class="w-full bg-slate-900 rounded-xl border border-primary/30 p-4 flex flex-col shadow-2xl transition-all duration-300" :class="isFullScreen ? 'h-screen border-none rounded-none' : ''">
    <div class="flex justify-between items-center mb-4 shrink-0">
      <h3 class="text-white font-semibold flex items-center gap-2">
        <span class="material-symbols-outlined text-primary text-sm">view_in_ar</span>
        Renderizador Volumétrico
      </h3>
      <button @click="toggleFullScreen" class="text-slate-400 hover:text-white transition-colors flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 shadow-sm">
        <span class="material-symbols-outlined text-[18px]">{{ isFullScreen ? 'fullscreen_exit' : 'fullscreen' }}</span>
        <span class="text-xs font-bold uppercase tracking-wider">{{ isFullScreen ? 'Salir de Pantalla Completa' : 'Pantalla Completa' }}</span>
      </button>
    </div>
    <div
      ref="containerRef"
      class="w-full rounded-lg overflow-hidden"
      :class="isFullScreen ? 'flex-1 h-full' : 'h-[500px]'"
    />
  </div>
</template>

<style scoped>
/* Scene3D - using Tailwind classes */
</style>
