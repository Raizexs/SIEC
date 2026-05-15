/**
 * MeasureTool — click two points on the floor plane, draws a line with a
 * distance label in meters. Self-contained so it can be toggled on/off.
 */
import * as THREE from "three";

export class MeasureTool {
  constructor(scene, camera, domElement) {
    this.scene = scene;
    this.camera = camera;
    this.dom = domElement;
    this.points = [];
    this.markers = [];
    this.active = false;
    this.lineMaterial = new THREE.LineBasicMaterial({ color: 0x22d3ee, linewidth: 2, depthTest: false });
    this.dotGeometry = new THREE.SphereGeometry(0.08, 12, 12);
    this.dotMaterial = new THREE.MeshBasicMaterial({ color: 0x22d3ee, depthTest: false });
    this.line = null;
    this.label = null;
    this.raycaster = new THREE.Raycaster();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this._onClick = this._onClick.bind(this);
  }

  enable() {
    if (this.active) return;
    this.active = true;
    this.dom.style.cursor = 'crosshair';
    this.dom.addEventListener('pointerdown', this._onClick);
  }

  disable() {
    this.active = false;
    this.dom.style.cursor = '';
    this.dom.removeEventListener('pointerdown', this._onClick);
    this.clear();
  }

  clear() {
    for (const m of this.markers) {
      this.scene.remove(m);
      m.geometry?.dispose();
      m.material?.dispose();
    }
    this.markers = [];
    if (this.line) {
      this.scene.remove(this.line);
      this.line.geometry?.dispose();
      this.line = null;
    }
    if (this.label) {
      this.label.parentNode?.removeChild(this.label);
      this.label = null;
    }
    this.points = [];
  }

  _onClick(e) {
    if (e.button !== 0) return;
    const rect = this.dom.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(mouse, this.camera);
    const intersect = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.plane, intersect);
    
    if (!intersect) return;
    if (this.points.length === 2) {
      this.clear();
    }

    this.points.push(intersect.clone());
    const dot = new THREE.Mesh(this.dotGeometry, this.dotMaterial);
    dot.position.copy(intersect);
    this.scene.add(dot);
    this.markers.push(dot);
    
    if (this.points.length === 2) {
      const [a, b] = this.points;
      const geom = new THREE.BufferGeometry().setFromPoints([a, b]);
      this.line = new THREE.Line(geom, this.lineMaterial);
      this.scene.add(this.line);
      const dist = a.distanceTo(b);
      this._renderLabel(a, b, dist);
    }
  }

  _renderLabel(a, b, dist) {
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const screen = mid.clone().project(this.camera);
    const rect = this.dom.getBoundingClientRect();
    const x = (screen.x * 0.5 + 0.5) * rect.width;
    const y = (-screen.y * 0.5 + 0.5) * rect.height;
    const div = document.createElement('div');
    div.textContent = `${dist.toFixed(2)} m`;
    div.style.cssText = `
      position:absolute; left:${x}px; top:${y}px; transform:translate(-50%,-50%);
      background: rgba(34,211,238,0.9); color:#0b1220; padding:2px 8px;
      border-radius:6px; font:bold 11px monospace; pointer-events:none;
      box-shadow:0 4px 12px rgba(0,0,0,0.4);
    `;
    this.dom.parentNode.appendChild(div);
    this.label = div;
  }
}
