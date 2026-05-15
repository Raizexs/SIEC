/**
 * PresentationMode — fullscreen cinematic camera tour with smooth easing.
 *
 * Drives the SceneManager camera along a pre-computed Catmull-Rom path that
 * orbits and dives between rooms. Designed for client meetings.
 *
 * Usage:
 *   const presenter = new PresentationMode(sceneManager, recintos);
 *   presenter.start();           // automatic loop
 *   presenter.stop();
 */
import * as THREE from "three";

export class PresentationMode {
  constructor(sceneManager, recintos) {
    this.scene = sceneManager;
    this.recintos = recintos;
    this.active = false;
    this.t = 0;
    this.duration = 0;
    this.path = null;
    this.lookPath = null;
    this._tickHandle = null;
    this._buildPath();
  }

  _buildPath() {
    if (!this.recintos || this.recintos.length === 0) return;

    const cameraPoints = [];
    const lookPoints = [];

    // Establishing wide shot
    let minX = Infinity,
      minZ = Infinity,
      maxX = -Infinity,
      maxZ = -Infinity;
    for (const r of this.recintos) {
      minX = Math.min(minX, r.coords.x);
      minZ = Math.min(minZ, r.coords.z);
      maxX = Math.max(maxX, r.coords.x + r.dimensions.w);
      maxZ = Math.max(maxZ, r.coords.z + r.dimensions.l);
    }
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const radius = Math.max(maxX - minX, maxZ - minZ) * 1.4;

    // 1. Wide aerial circle
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      cameraPoints.push(
        new THREE.Vector3(
          cx + Math.cos(a) * radius,
          radius * 0.7,
          cz + Math.sin(a) * radius,
        ),
      );
      lookPoints.push(new THREE.Vector3(cx, 1, cz));
    }

    // 2. Per-room close-ups
    for (const r of this.recintos.filter((r) => (r.piso || 1) === 1)) {
      const rx = r.coords.x + r.dimensions.w / 2;
      const rz = r.coords.z + r.dimensions.l / 2;
      cameraPoints.push(new THREE.Vector3(rx + 4, 3, rz + 4));
      lookPoints.push(new THREE.Vector3(rx, 1.2, rz));
    }

    // 3. Final hero shot
    cameraPoints.push(new THREE.Vector3(cx + radius, radius, cz - radius));
    lookPoints.push(new THREE.Vector3(cx, 0, cz));
    this.path = new THREE.CatmullRomCurve3(
      cameraPoints,
      true,
      "catmullrom",
      0.4,
    );
    this.lookPath = new THREE.CatmullRomCurve3(
      lookPoints,
      true,
      "catmullrom",
      0.4,
    );
    this.duration = cameraPoints.length * 4;
  }

  start() {
    if (!this.path || this.active) return;
    this.active = true;
    this.t = 0;
    this.scene.orbit.enabled = false;
    this._tickHandle = this.scene.onTick((dt) => this._update(dt));
  }

  stop() {
    if (!this.active) return;
    this.active = false;
    this._tickHandle?.();
    this._tickHandle = null;
    this.scene.orbit.enabled = true;
  }

  _update(dt) {
    if (!this.path) return;
    this.t += dt / this.duration;
    if (this.t > 1) this.t -= 1;
    const camPos = this.path.getPointAt(this.t);
    const lookAt = this.lookPath.getPointAt(this.t);
    this.scene.camera.position.copy(camPos);
    this.scene.camera.lookAt(lookAt);
  }
}
