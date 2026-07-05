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

import { onMounted, onBeforeUnmount, onActivated, onDeactivated, ref, watch } from 'vue';
import * as THREE from 'three';
import { prefersReducedMotion } from '../../design/motionTokens';

const props = defineProps({
  compact: { type: Boolean, default: false },
  hero: { type: Boolean, default: false },
  autoStart: { type: Boolean, default: true },
  paused: { type: Boolean, default: false },
  embedded: { type: Boolean, default: false },
});

const containerRef = ref(null);

let renderer;
let scene;
let camera;
let frameId = null;
let houseGroup;
let resizeObserver;
let intersectionObserver;
let orbitAngle = 0;
let isVisible = true;
const ORBIT_CENTER = new THREE.Vector3(0, 1.6, 0);

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

const getOrbitRadius = () => {
  if (props.hero) return 11.5;
  if (props.compact) return 14;
  return 22;
};

const getCameraHeight = () => {
  if (props.hero) return 6.8;
  if (props.compact) return 8.5;
  return 10.5;
};

const setup = () => {
  if (!containerRef.value || renderer) return;

  const width = containerRef.value.clientWidth || window.innerWidth;
  const height = containerRef.value.clientHeight || window.innerHeight;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(props.hero ? '#0b1220' : '#020617');
  scene.fog = props.hero
    ? null
    : new THREE.FogExp2('#020617', props.compact ? 0.024 : 0.019);

  camera = new THREE.PerspectiveCamera(
    props.hero ? 48 : 42,
    width / Math.max(height, 1),
    0.1,
    220,
  );
  const initialRadius = getOrbitRadius();
  camera.position.set(initialRadius, getCameraHeight(), initialRadius);
  camera.lookAt(ORBIT_CENTER);

  renderer = new THREE.WebGLRenderer({
    antialias: !props.compact || props.hero,
    alpha: props.hero,
    powerPreference: props.compact || props.hero ? 'default' : 'high-performance',
  });

  renderer.setSize(width, height);
  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, props.hero ? 1.5 : props.compact ? 1.25 : 2),
  );
  renderer.shadowMap.enabled = !props.compact && !props.hero;
  if (!props.compact) {
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = props.hero ? 1.22 : 1.08;

  containerRef.value.appendChild(renderer.domElement);

  const ambient = new THREE.HemisphereLight('#e2e8f0', '#0f172a', props.hero ? 0.82 : 0.58);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight('#fff7ed', props.hero ? 1.55 : 1.28);
  sun.position.set(props.hero ? 10 : 18, props.hero ? 16 : 24, props.hero ? 8 : 12);
  if (!props.compact) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(1536, 1536);
    sun.shadow.camera.left = -28;
    sun.shadow.camera.right = 28;
    sun.shadow.camera.top = 28;
    sun.shadow.camera.bottom = -28;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 80;
  }
  scene.add(sun);

  const orangeAccent = new THREE.PointLight('#fb923c', props.hero ? 2.4 : 1.8, props.hero ? 24 : 36);
  orangeAccent.position.set(-4, props.hero ? 4 : 5.5, -4);
  scene.add(orangeAccent);

  const blueFill = new THREE.PointLight('#38bdf8', props.hero ? 0.7 : 0.45, props.hero ? 28 : 42);
  blueFill.position.set(10, 4, 10);
  scene.add(blueFill);

  if (!props.hero) {
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
  } else {
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(14, 48),
      new THREE.MeshStandardMaterial({
        color: '#1e293b',
        roughness: 0.88,
        metalness: 0.05,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    scene.add(ground);
  }

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

  startRenderLoop();
};

const renderFrame = () => {
  if (!renderer || !camera || !scene || props.paused || !isVisible) return;

  if (!prefersReducedMotion()) {
    orbitAngle += props.compact ? 0.0011 : 0.00135;
  }

  const orbitRadius = getOrbitRadius();
  camera.position.x = ORBIT_CENTER.x + Math.cos(orbitAngle) * orbitRadius;
  camera.position.z = ORBIT_CENTER.z + Math.sin(orbitAngle) * orbitRadius;
  camera.position.y = getCameraHeight() + Math.sin(orbitAngle * 0.75) * (props.hero ? 0.8 : 1.6);
  camera.lookAt(ORBIT_CENTER);

  if (houseGroup && !prefersReducedMotion()) {
    houseGroup.rotation.y = Math.sin(orbitAngle * 0.35) * 0.015;
  }

  renderer.render(scene, camera);
};

const startRenderLoop = () => {
  if (frameId != null) return;

  const tick = () => {
    frameId = requestAnimationFrame(tick);
    renderFrame();
  };

  tick();
};

const stopRenderLoop = () => {
  if (frameId != null) {
    cancelAnimationFrame(frameId);
    frameId = null;
  }
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

const teardown = () => {
  stopRenderLoop();
  window.removeEventListener('resize', onResize);
  resizeObserver?.disconnect();
  resizeObserver = null;
  intersectionObserver?.disconnect();
  intersectionObserver = null;

  disposeObject(scene);

  renderer?.dispose();

  if (renderer?.domElement?.parentNode) {
    renderer.domElement.parentNode.removeChild(renderer.domElement);
  }

  renderer = null;
  scene = null;
  camera = null;
  houseGroup = null;
};

const ensureStarted = () => {
  if (!renderer) setup();
  else onResize();
  if (!props.paused && isVisible) startRenderLoop();
};

const bindVisibilityObserver = () => {
  if (!props.autoStart || typeof IntersectionObserver === 'undefined' || !containerRef.value) {
    return;
  }

  intersectionObserver = new IntersectionObserver(
    (entries) => {
      isVisible = entries.some((entry) => entry.isIntersecting);
      if (isVisible) {
        ensureStarted();
      } else {
        stopRenderLoop();
      }
    },
    { rootMargin: '80px', threshold: 0.08 },
  );

  intersectionObserver.observe(containerRef.value);
};

watch(
  () => props.paused,
  (paused) => {
    if (paused) stopRenderLoop();
    else if (isVisible) startRenderLoop();
  },
);

onMounted(() => {
  if (props.autoStart) {
    ensureStarted();
  } else {
    bindVisibilityObserver();
  }

  if (typeof ResizeObserver !== 'undefined' && containerRef.value) {
    resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(containerRef.value);
  }

  window.addEventListener('resize', onResize);
});

onActivated(() => {
  onResize();
  if (renderer) {
    if (!props.paused && isVisible) startRenderLoop();
  } else if (props.autoStart) {
    ensureStarted();
  }
});

onDeactivated(() => {
  stopRenderLoop();
});

onBeforeUnmount(() => {
  teardown();
});
</script>

<template>
  <div
    ref="containerRef"
    class="auth-scene-3d"
    :class="{
      'auth-scene-3d--embedded': embedded,
      'auth-scene-3d--hero': hero,
    }"
    :aria-hidden="embedded ? undefined : 'true'"
  >
    <!-- Premium atmospheric overlays (hidden in hero embed for clarity) -->
    <template v-if="!hero">
      <div class="auth-scene-vignette"></div>
      <div class="auth-scene-grid"></div>
      <div class="auth-scene-glow auth-scene-glow-orange"></div>
      <div class="auth-scene-glow auth-scene-glow-slate"></div>
    </template>
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

.auth-scene-3d--embedded {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 180px;
  border-radius: 0.75rem;
}

.auth-scene-3d--hero {
  background: linear-gradient(180deg, #0f172a 0%, #0b1220 100%);
}

.auth-scene-3d--hero.auth-scene-3d--embedded {
  min-height: 100%;
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