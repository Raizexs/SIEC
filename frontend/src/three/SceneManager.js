/**
 * SceneManager — encapsulates the Three.js renderer, scene, cameras, controls
 * and post-processing pipeline. Designed to be instantiated by Scene3D.vue and
 * disposed cleanly on unmount.
 *
 * Responsibilities:
 *   - Renderer + camera lifecycle (perspective + ortho mini-map).
 *   - Orbit controls + drag controls + transform controls wiring.
 *   - Animation loop with optional walkthrough mode (PointerLockControls).
 *   - Resize handling + fullscreen support.
 *   - Composer for post-processing (SSAO, bloom, DOF, FXAA, outline).
 *
 * Heavy CSG/furniture/lighting concerns live in WallBuilder, RoomFurnisher,
 * DoorWindowSystem, and LightingRig respectively.
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  SSAOEffect,
  BloomEffect,
  FXAAEffect,
  OutlineEffect,
  BlendFunction,
  NormalPass,
} from "postprocessing";

export class SceneManager {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      enablePostFX: true,
      enableShadows: true,
      pixelRatio: Math.min(window.devicePixelRatio, 2),
      ...options,
    };
    this.mode = "orbit"; // orbit | walkthrough
    this._setup();
  }

  _setup() {
    const w = Math.max(1, this.container.clientWidth || 0);
    const h = Math.max(1, this.container.clientHeight || 0);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#0b1220");

    this.camera = new THREE.PerspectiveCamera(
      60,
      w / Math.max(h, 1),
      0.1,
      3000,
    );
    this.camera.position.set(12, 16, 12);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(this.options.pixelRatio);
    this.renderer.shadowMap.enabled = this.options.enableShadows;
    this.renderer.shadowMap.type = THREE.VSMShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.08;
    this.orbit.target.set(0, 0, 0);
    this.orbit.maxPolarAngle = Math.PI / 2 - 0.02;

    this.walk = new PointerLockControls(this.camera, this.renderer.domElement);

    this.buildingGroup = new THREE.Group();
    this.buildingGroup.name = "building-root";
    this.wallsGroup = new THREE.Group();
    this.wallsGroup.name = "walls";
    this.roomsGroup = new THREE.Group();
    this.roomsGroup.name = "rooms";
    this.furnitureGroup = new THREE.Group();
    this.furnitureGroup.name = "furniture";
    this.cantileverBeamsGroup = new THREE.Group();
    this.cantileverBeamsGroup.name = "cantilever-beams";
    this.openingsGroup = new THREE.Group();
    this.openingsGroup.name = "openings";
    this.roofGroup = new THREE.Group();
    this.roofGroup.name = "roof";
    this.buildingGroup.add(
      this.wallsGroup,
      this.roomsGroup,
      this.cantileverBeamsGroup,
      this.furnitureGroup,
      this.openingsGroup,
      this.roofGroup,
    );
    this.scene.add(this.buildingGroup);

    if (this.options.enablePostFX) {
      this._setupPostFX();
    }

    this.clock = new THREE.Clock();
    this.frameId = null;
    this.tickCallbacks = new Set();
  }

  _setupPostFX() {
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    const normalPass = new NormalPass(this.scene, this.camera);
    this.composer.addPass(normalPass);

    this.ssao = new SSAOEffect(this.camera, normalPass.texture, {
      blendFunction: BlendFunction.MULTIPLY,
      samples: 16,
      rings: 4,
      distanceThreshold: 0.6,
      distanceFalloff: 0.1,
      rangeThreshold: 0.015,
      rangeFalloff: 0.01,
      luminanceInfluence: 0.6,
      radius: 12,
      intensity: 1.4,
      bias: 0.025,
    });

    this.bloom = new BloomEffect({
      blendFunction: BlendFunction.ADD,
      luminanceThreshold: 0.85,
      luminanceSmoothing: 0.4,
      intensity: 0.4,
    });

    this.outline = new OutlineEffect(this.scene, this.camera, {
      blendFunction: BlendFunction.SCREEN,
      visibleEdgeColor: 0x22d3ee,
      hiddenEdgeColor: 0x0ea5e9,
      edgeStrength: 4,
      pulseSpeed: 0.2,
      blur: false,
      xRay: true,
    });

    this.fxaa = new FXAAEffect();

    this.composer.addPass(new EffectPass(this.camera, this.ssao));
    this.composer.addPass(new EffectPass(this.camera, this.bloom));
    this.composer.addPass(new EffectPass(this.camera, this.outline));
    this.composer.addPass(new EffectPass(this.camera, this.fxaa));
  }

  setOutlineSelection(meshes) {
    if (!this.outline) return;
    this.outline.selection.clear();
    for (const m of meshes) this.outline.selection.add(m);
  }

  setMode(mode) {
    if (mode === this.mode) return;
    this.mode = mode;
    if (mode === "walkthrough") {
      this.orbit.enabled = false;
      this.walk.lock();
    } else {
      this.walk.unlock();
      this.orbit.enabled = true;
    }
  }

  setPostFXEnabled(enabled) {
    this.options.enablePostFX = enabled;
  }

  onTick(fn) {
    this.tickCallbacks.add(fn);
    return () => this.tickCallbacks.delete(fn);
  }

  start() {
    if (this.frameId) return;
    const loop = () => {
      this.frameId = requestAnimationFrame(loop);
      const cw = this.container?.clientWidth ?? 0;
      const ch = this.container?.clientHeight ?? 0;
      if (cw < 1 || ch < 1) return;

      const dt = this.clock.getDelta();
      if (this.mode === "orbit") this.orbit.update();
      for (const fn of this.tickCallbacks) fn(dt);
      if (this.options.enablePostFX && this.composer) {
        this.composer.render(dt);
      } else {
        this.renderer.render(this.scene, this.camera);
      }
    };
    loop();
  }

  stop() {
    if (this.frameId) cancelAnimationFrame(this.frameId);
    this.frameId = null;
  }

  resize() {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.composer?.setSize(w, h);
  }

  fitTo(box) {
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraZ *= 1.6;
    this.camera.position.set(
      center.x + cameraZ * 0.7,
      Math.max(cameraZ, 8),
      center.z + cameraZ * 0.7,
    );
    this.orbit.target.copy(center);
    this.orbit.update();
  }

  dispose() {
    this.stop();
    this.tickCallbacks.clear();
    this.orbit?.dispose();
    if (this.walk) this.walk.disconnect();
    this.composer?.dispose();
    this.renderer?.dispose();
    this.renderer?.domElement?.parentNode?.removeChild(
      this.renderer.domElement,
    );
    this.scene = null;
  }
}
