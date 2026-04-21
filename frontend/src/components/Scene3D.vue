<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useTopologyComputed } from "../composables/useTopologyComputed";
import { useRecintosStore } from "../stores/recintos";

const containerRef = ref(null);
const topology = useTopologyComputed();
const store = useRecintosStore();

let renderer;
let scene;
let camera;
let controls;
let frameId;

const wallMeshes = new Map();
let cameraFitted = false;

const WALL_HEIGHT = 2.4;

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

  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight;

  camera = new THREE.PerspectiveCamera(
    60,
    width / Math.max(height, 1),
    0.1,
    3000,
  );
  camera.position.set(12, 16, 12);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  containerRef.value.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 0, 0);

  const ambient = new THREE.AmbientLight("#ffffff", 0.6);
  scene.add(ambient);

  const dir = new THREE.DirectionalLight("#ffffff", 0.8);
  dir.position.set(10, 20, 8);
  scene.add(dir);

  const floorGeo = new THREE.PlaneGeometry(200, 200);
  const floorMat = new THREE.MeshStandardMaterial({
    color: "#1f2937",
    roughness: 0.9,
    metalness: 0.05,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.005;
  scene.add(floor);

  const grid = new THREE.GridHelper(200, 200, "#475569", "#334155");
  grid.position.y = 0;
  scene.add(grid);
};

const syncWalls = (walls) => {
  const incomingIds = new Set(walls.map((w) => w.id));

  // remove stale meshes
  for (const [id, mesh] of wallMeshes.entries()) {
    if (!incomingIds.has(id)) {
      scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
      wallMeshes.delete(id);
    }
  }

  // upsert meshes
  walls.forEach((wall) => {
    const transform = toMeshTransform(wall);
    const isBudgeted = wall.recintosAdyacentes.every(id => store.selectedForBudget.has(id));
    const targetColor = isBudgeted ? "#ef4444" : "#60a5fa"; // Red if budgeted, blue otherwise

    let mesh = wallMeshes.get(wall.id);
    if (!mesh) {
      const geometry = new THREE.BoxGeometry(1, WALL_HEIGHT, wall.thickness);
      const material = new THREE.MeshStandardMaterial({
        color: targetColor,
        roughness: 0.55,
        metalness: 0.1,
      });
      mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      wallMeshes.set(wall.id, mesh);
    } else {
      mesh.material.color.set(targetColor);
    }

    // Shrink budgeted walls slightly to avoid Z-fighting and let blue predominate
    const scaleFactor = isBudgeted ? 0.99 : 1.0;
    mesh.scale.set(transform.length, scaleFactor, scaleFactor);
    mesh.position.set(transform.centerX, (WALL_HEIGHT * scaleFactor) / 2, transform.centerZ);
    mesh.rotation.set(0, -transform.angle, 0);
  });

  if (!cameraFitted && walls.length > 0) {
    fitCameraToWalls(walls);
    cameraFitted = true;
  }
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
  renderer.setSize(width, height);
  camera.aspect = width / Math.max(height, 1);
  camera.updateProjectionMatrix();
};

const animate = () => {
  frameId = requestAnimationFrame(animate);
  if (controls) controls.update();
  if (renderer && scene && camera) renderer.render(scene, camera);
};

onMounted(() => {
  ensureScene();
  watch(
    () => [topology.walls.value, Array.from(store.selectedForBudget)],
    ([walls]) => {
      if (scene) syncWalls(walls);
    },
    { deep: true, immediate: true },
  );

  window.addEventListener("resize", onResize);
  animate();
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", onResize);
  if (frameId) cancelAnimationFrame(frameId);

  for (const mesh of wallMeshes.values()) {
    scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  }
  wallMeshes.clear();

  if (renderer) {
    renderer.dispose();
    if (renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
  }
});
</script>

<template>
  <div class="w-full">
    <div class="bg-slate-900 rounded-xl border border-primary/30 p-4">
      <h3 class="text-white font-semibold mb-4">Renderizador Volumétrico</h3>
      <div ref="containerRef" class="w-full h-[500px] rounded-lg overflow-hidden" />
    </div>
  </div>
</template>

<style scoped>
/* Scene3D - using Tailwind classes */
</style>
