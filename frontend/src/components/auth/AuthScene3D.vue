<script setup>
/**
 * AuthScene3D — looping camera-orbit render used behind auth screens.
 *
 * Premium language:
 * - Cinematic architectural massing.
 * - Slate/orange brand atmosphere.
 * - Soft shadows, fog and subtle emissive accents.
 * - Proper Three.js cleanup before unmount.
 */

import { onMounted, onBeforeUnmount, ref } from 'vue';
import * as THREE from 'three';

const containerRef = ref(null);

let renderer;
let scene;
let camera;
let frameId;
let houseGroup;
let resizeObserver;

const HOUSE = [
  {
    x: 0,
    z: 0,
    w: 6,
    d: 6,
    h: 3,
    color: '#e2e8f0',
    roughness: 0.72,
    metalness: 0.08,
  },
  {
    x: 6.15,
    z: 0,
    w: 4.2,
    d: 6,
    h: 3.25,
    color: '#cbd5e1',
    roughness: 0.76,
    metalness: 0.1,
  },
  {
    x: 0,
    z: 6.15,
    w: 10.35,
    d: 4.1,
    h: 3,
    color: '#94a3b8',
    roughness: 0.78,
    metalness: 0.12,
  },
  {
    x: -0.2,
    z: -0.2,
    w: 10.75,
    d: 10.75,
    h: 0.16,
    color: '#1e293b',
    roughness: 0.86,
    metalness: 0.08,
  },
  {
    x: -1.15,
    z: -1.1,
    w: 12.4,
    d: 0.7,
    h: 1.1,
    color: '#334155',
    roughness: 0.82,
    metalness: 0.12,
  },
  {
    x: -1.15,
    z: 10.55,
    w: 12.4,
    d: 0.7,
    h: 0.9,
    color: '#283a55',
    roughness: 0.82,
    metalness: 0.12,
  },
];

const addBuildingBlock = (block) => {
  const geometry = new THREE.BoxGeometry(block.w, block.h, block.d);

  const material = new THREE.MeshStandardMaterial({
    color: block.color,
    roughness: block.roughness,
    metalness: block.metalness,
  });

  const mesh = new THREE.Mesh(geometry, material);

  mesh.position.set(
    block.x + block.w / 2,
    block.h / 2,
    block.z + block.d / 2,
  );

  mesh.castShadow = true;
  mesh.receiveShadow = true;

  houseGroup.add(mesh);

  const edgeGeometry = new THREE.EdgesGeometry(geometry);

  const edgeMaterial = new THREE.LineBasicMaterial({
    color: '#fb923c',
    transparent: true,
    opacity: 0.34,
  });

  const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);

  edges.position.copy(mesh.position);

  houseGroup.add(edges);
};

const addWarmWindow = ({ x, y, z, w = 1.1, h = 0.75, rotationY = 0 }) => {
  const geometry = new THREE.PlaneGeometry(w, h);

  const material = new THREE.MeshBasicMaterial({
    color: '#fed7aa',
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
  });

  const windowMesh = new THREE.Mesh(geometry, material);

  windowMesh.position.set(x, y, z);
  windowMesh.rotation.y = rotationY;

  houseGroup.add(windowMesh);
};

const setup = () => {
  if (!containerRef.value) return;

  const width = containerRef.value.clientWidth || window.innerWidth;
  const height = containerRef.value.clientHeight || window.innerHeight;

  scene = new THREE.Scene();
  scene.background = new THREE.Color('#020617');
  scene.fog = new THREE.FogExp2('#020617', 0.019);

  camera = new THREE.PerspectiveCamera(42, width / Math.max(height, 1), 0.1, 220);
  camera.position.set(18, 12, 18);
  camera.lookAt(5, 1.4, 5);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });

  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  containerRef.value.appendChild(renderer.domElement);

  const ambient = new THREE.HemisphereLight('#dbeafe', '#020617', 0.58);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight('#fff1d6', 1.28);
  sun.position.set(18, 24, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1536, 1536);
  sun.shadow.camera.left = -28;
  sun.shadow.camera.right = 28;
  sun.shadow.camera.top = 28;
  sun.shadow.camera.bottom = -28;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 80;
  scene.add(sun);

  const orangeAccent = new THREE.PointLight('#fb923c', 1.8, 36);
  orangeAccent.position.set(-6, 5.5, -5);
  scene.add(orangeAccent);

  const blueFill = new THREE.PointLight('#38bdf8', 0.45, 42);
  blueFill.position.set(18, 5, 18);
  scene.add(blueFill);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 90),
    new THREE.MeshStandardMaterial({
      color: '#0f172a',
      roughness: 0.95,
      metalness: 0.08,
    }),
  );

  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new THREE.GridHelper(90, 45, '#334155', '#1e293b');
  grid.material.opacity = 0.28;
  grid.material.transparent = true;
  scene.add(grid);

  houseGroup = new THREE.Group();

  HOUSE.forEach(addBuildingBlock);

  // Warm architectural window accents.
  addWarmWindow({ x: 2.1, y: 1.65, z: -0.03, w: 1.2, h: 0.7 });
  addWarmWindow({ x: 4.2, y: 1.65, z: -0.03, w: 1.2, h: 0.7 });
  addWarmWindow({ x: 7.6, y: 1.75, z: -0.03, w: 1.3, h: 0.75 });
  addWarmWindow({ x: 10.38, y: 1.65, z: 2.2, w: 1.2, h: 0.72, rotationY: Math.PI / 2 });
  addWarmWindow({ x: 10.38, y: 1.65, z: 4.1, w: 1.2, h: 0.72, rotationY: Math.PI / 2 });

  // Center model around origin visually.
  houseGroup.position.set(-5.2, 0, -5.2);
  scene.add(houseGroup);

  const center = new THREE.Vector3(0, 1.7, 0);
  let angle = 0;
  const radius = 22;

  const animate = () => {
    frameId = requestAnimationFrame(animate);

    angle += 0.00135;

    camera.position.x = center.x + Math.cos(angle) * radius;
    camera.position.z = center.z + Math.sin(angle) * radius;
    camera.position.y = 10.5 + Math.sin(angle * 0.75) * 1.6;

    camera.lookAt(center);

    if (houseGroup) {
      houseGroup.rotation.y = Math.sin(angle * 0.35) * 0.015;
    }

    renderer.render(scene, camera);
  };

  animate();
};

const onResize = () => {
  if (!renderer || !camera || !containerRef.value) return;

  const width = containerRef.value.clientWidth || window.innerWidth;
  const height = containerRef.value.clientHeight || window.innerHeight;

  renderer.setSize(width, height);
  camera.aspect = width / Math.max(height, 1);
  camera.updateProjectionMatrix();
};

const disposeObject = (object) => {
  if (!object) return;

  object.traverse((child) => {
    if (child.geometry) {
      child.geometry.dispose();
    }

    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach((material) => material.dispose?.());
      } else {
        child.material.dispose?.();
      }
    }
  });
};

onMounted(() => {
  setup();

  if (typeof ResizeObserver !== 'undefined' && containerRef.value) {
    resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(containerRef.value);
  }

  window.addEventListener('resize', onResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize);

  resizeObserver?.disconnect();

  if (frameId) {
    cancelAnimationFrame(frameId);
  }

  disposeObject(scene);

  renderer?.dispose();

  if (renderer?.domElement?.parentNode) {
    renderer.domElement.parentNode.removeChild(renderer.domElement);
  }

  renderer = null;
  scene = null;
  camera = null;
  houseGroup = null;
});
</script>

<template>
  <div
    ref="containerRef"
    class="auth-scene-3d"
    aria-hidden="true"
  >
    <!-- Premium atmospheric overlays -->
    <div class="auth-scene-vignette"></div>
    <div class="auth-scene-grid"></div>
    <div class="auth-scene-glow auth-scene-glow-orange"></div>
    <div class="auth-scene-glow auth-scene-glow-slate"></div>
  </div>
</template>

<style scoped>
.auth-scene-3d {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  background:
    radial-gradient(circle at 20% 20%, rgba(249, 115, 22, 0.16), transparent 30%),
    radial-gradient(circle at 80% 75%, rgba(148, 163, 184, 0.14), transparent 34%),
    #020617;
}

.auth-scene-3d :deep(canvas) {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100% !important;
  height: 100% !important;
}

.auth-scene-vignette {
  position: absolute;
  inset: 0;
  z-index: 4;
  background:
    radial-gradient(circle at center, transparent 28%, rgba(2, 6, 23, 0.42) 78%),
    linear-gradient(to right, rgba(2, 6, 23, 0.72), transparent 42%, rgba(2, 6, 23, 0.42));
}

.auth-scene-grid {
  position: absolute;
  inset: 0;
  z-index: 3;
  opacity: 0.16;
  background-image:
    linear-gradient(to right, rgba(148, 163, 184, 0.18) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(148, 163, 184, 0.18) 1px, transparent 1px);
  background-size: 36px 36px;
  mask-image: radial-gradient(circle at center, black, transparent 72%);
}

.auth-scene-glow {
  position: absolute;
  z-index: 2;
  border-radius: 9999px;
  filter: blur(70px);
  opacity: 0.45;
}

.auth-scene-glow-orange {
  left: -8rem;
  top: 12%;
  width: 22rem;
  height: 22rem;
  background: rgba(249, 115, 22, 0.32);
}

.auth-scene-glow-slate {
  right: -10rem;
  bottom: 8%;
  width: 26rem;
  height: 26rem;
  background: rgba(100, 116, 139, 0.28);
}
</style>