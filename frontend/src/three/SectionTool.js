/**
 * SectionTool — clipping plane controlled by an offset, lets the user "cut"
 * the building along Y to peek inside without removing geometry.
 */
import * as THREE from "three";

export class SectionTool {
  constructor(renderer, scene, axis = "y") {
    this.renderer = renderer;
    this.scene = scene;
    this.axis = axis;
    this.enabled = false;
    this.height = 1.2;
    this.plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), this.height);
    this.helper = new THREE.PlaneHelper(this.plane, 30, 0x22d3ee);
    this.helper.visible = false;
    this.scene.add(this.helper);
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    this.helper.visible = enabled;
    this.renderer.localClippingEnabled = enabled;
    this._applyClipping(enabled ? [this.plane] : []);
  }

  setHeight(h) {
    this.height = h;
    this.plane.constant = h;
  }

  _applyClipping(planes) {
    this.scene.traverse((obj) => {
      if (obj.isMesh && obj.material) {
        const mats = Array.isArray(obj.material)
          ? obj.material
          : [obj.material];
        for (const m of mats) {
          m.clippingPlanes = planes;
          m.clipShadows = true;
          m.needsUpdate = true;
        }
      }
    });
  }

  dispose() {
    this.scene.remove(this.helper);
  }
}
