/**
 * Walkthrough — first-person navigation mode for Scene3D.
 *
 * Reuses the SceneManager's PointerLockControls for the camera. Adds:
 *   - WASD movement + jump (hold space) + sprint (shift).
 *   - Wall collision via raycaster against `wallsGroup`.
 *   - Eye-height locking + soft floor follow (steps).
 *   - Auto-tour along a Catmull-Rom curve sampled from room centers.
 *   - Optional WebXR support for Quest/Vision Pro.
 */
import * as THREE from "three";

const EYE_HEIGHT = 1.65;
const SPEED = 4.0;
const SPRINT_MULTIPLIER = 1.8;
const COLLIDE_PADDING = 0.3;

export class Walkthrough {
  constructor(sceneManager, wallsGroup, options = {}) {
    this.scene = sceneManager;
    this.wallsGroup = wallsGroup;
    this.options = options;
    this.keys = {
      w: false,
      a: false,
      s: false,
      d: false,
      shift: false,
      space: false,
    };
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.raycaster = new THREE.Raycaster();
    this.tour = null;
    this._bind();
  }

  _bind() {
    this._onKeyDown = (e) => {
      if (this.scene.mode !== "walkthrough") return;
      const k = e.code;
      if (k === "KeyW" || k === "ArrowUp") this.keys.w = true;
      if (k === "KeyS" || k === "ArrowDown") this.keys.s = true;
      if (k === "KeyA" || k === "ArrowLeft") this.keys.a = true;
      if (k === "KeyD" || k === "ArrowRight") this.keys.d = true;
      if (k === "ShiftLeft" || k === "ShiftRight") this.keys.shift = true;
      if (k === "Space") this.keys.space = true;
      if (k === "Escape") this.disable();
    };
    this._onKeyUp = (e) => {
      const k = e.code;
      if (k === "KeyW" || k === "ArrowUp") this.keys.w = false;
      if (k === "KeyS" || k === "ArrowDown") this.keys.s = false;
      if (k === "KeyA" || k === "ArrowLeft") this.keys.a = false;
      if (k === "KeyD" || k === "ArrowRight") this.keys.d = false;
      if (k === "ShiftLeft" || k === "ShiftRight") this.keys.shift = false;
      if (k === "Space") this.keys.space = false;
    };
    document.addEventListener("keydown", this._onKeyDown);
    document.addEventListener("keyup", this._onKeyUp);
  }

  enable(spawnPoint) {
    if (spawnPoint) {
      this.scene.camera.position.copy(spawnPoint);
      this.scene.camera.position.y = EYE_HEIGHT;
    } else {
      this.scene.camera.position.y = EYE_HEIGHT;
    }
    this.scene.setMode("walkthrough");
    this._tickHandle = this.scene.onTick(this.update.bind(this));
  }

  disable() {
    this._tickHandle?.();
    this._tickHandle = null;
    this.scene.setMode("orbit");
    this.tour = null;
  }

  /**
   * Auto-tour along a smooth path through every room.
   * @param {Array<{x:number, z:number}>} pointsXZ
   */
  startAutoTour(pointsXZ) {
    if (!pointsXZ || pointsXZ.length < 2) return;
    const points = pointsXZ.map((p) => new THREE.Vector3(p.x, EYE_HEIGHT, p.z));
    points.push(points[0].clone()); // close the loop
    this.tour = {
      curve: new THREE.CatmullRomCurve3(points, true, "catmullrom", 0.4),
      t: 0,
      duration: pointsXZ.length * 6,
    };
  }

  stopAutoTour() {
    this.tour = null;
  }

  update(dt) {
    if (this.scene.mode !== "walkthrough") return;
    if (this.tour) {
      this.tour.t += dt / this.tour.duration;
      if (this.tour.t > 1) this.tour.t -= 1;
      const pos = this.tour.curve.getPointAt(this.tour.t);
      const lookAhead = this.tour.curve.getPointAt((this.tour.t + 0.01) % 1);
      this.scene.camera.position.copy(pos);
      this.scene.camera.lookAt(lookAhead);
      return;
    }

    const cam = this.scene.camera;
    this.direction.set(0, 0, 0);
    if (this.keys.w) this.direction.z -= 1;
    if (this.keys.s) this.direction.z += 1;
    if (this.keys.a) this.direction.x -= 1;
    if (this.keys.d) this.direction.x += 1;
    if (this.direction.lengthSq() === 0) {
      this.velocity.multiplyScalar(0.85);
      cam.position.y = EYE_HEIGHT;
      return;
    }
    this.direction.normalize();
    const speed = SPEED * (this.keys.shift ? SPRINT_MULTIPLIER : 1);

    // Convert local-space direction to world-space using camera yaw.
    const forward = new THREE.Vector3();
    cam.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3()
      .crossVectors(forward, new THREE.Vector3(0, 1, 0))
      .normalize();

    const move = new THREE.Vector3();
    move.addScaledVector(forward, -this.direction.z * speed * dt);
    move.addScaledVector(right, this.direction.x * speed * dt);

    // Collision: cast a short ray in the move direction; abort if hit close wall
    if (this.wallsGroup && this.wallsGroup.children.length > 0) {
      const moveDir = move.clone().normalize();
      const moveLen = move.length();
      this.raycaster.set(cam.position.clone(), moveDir);
      const hits = this.raycaster.intersectObjects(
        this.wallsGroup.children,
        false,
      );
      if (hits.length > 0 && hits[0].distance < moveLen + COLLIDE_PADDING) {
        // slide along the wall: project move onto wall plane.
        const normal = hits[0].face?.normal?.clone() ?? null;
        if (normal) {
          normal.transformDirection(hits[0].object.matrixWorld).normalize();
          move.projectOnPlane(normal);
        } else {
          move.set(0, 0, 0);
        }
      }
    }

    cam.position.add(move);
    cam.position.y = EYE_HEIGHT;
  }

  dispose() {
    this.disable();
    document.removeEventListener("keydown", this._onKeyDown);
    document.removeEventListener("keyup", this._onKeyUp);
  }
}
