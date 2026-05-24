/**
 * SceneExporter — provides multiple export formats from the Scene3D buildingGroup.
 *
 *   - GLTF/GLB: standard 3D viewers, Blender, Cinema 4D.
 *   - OBJ:      AutoCAD, SketchUp, legacy pipelines.
 *   - IFC:      BIM-grade interchange (Revit, ArchiCAD) — emits a minimal
 *               IFC4 schema with IfcSlab + IfcWallStandardCase. The full
 *               binding (web-ifc-three) is heavy; this lightweight emitter
 *               covers the common case for housing estimations.
 *   - PNG (HD): renders the current camera view at user-defined resolution.
 *
 * All methods return a Blob; the caller decides whether to download or upload.
 */
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { OBJExporter } from "three/examples/jsm/exporters/OBJExporter.js";
import * as THREE from "three";

export class SceneExporter {
  constructor({ buildingGroup, scene, camera, renderer }) {
    this.buildingGroup = buildingGroup;
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
  }

  exportGLTF(options = {}) {
    return new Promise((resolve, reject) => {
      const exporter = new GLTFExporter();
      exporter.parse(
        this.buildingGroup,
        (gltf) => {
          if (gltf instanceof ArrayBuffer) {
            resolve(new Blob([gltf], { type: "model/gltf-binary" }));
          } else {
            const json = JSON.stringify(gltf, null, 2);
            resolve(new Blob([json], { type: "model/gltf+json" }));
          }
        },
        (err) => reject(err),
        { binary: options.binary !== false, embedImages: true, ...options },
      );
    });
  }

  exportOBJ() {
    const exporter = new OBJExporter();
    const text = exporter.parse(this.buildingGroup);
    return new Blob([text], { type: "text/plain" });
  }

  /**
   * Minimal IFC4 emitter — produces a textual IFC of slabs + walls based on
   * userData.wallId / roomId tags from WallBuilder + RoomFurnisher.
   */
  exportIFC({ projectName = "SIEC Project" } = {}) {
    const now = new Date();
    const stamp = now.toISOString().slice(0, 19);
    const lines = [
      "ISO-10303-21;",
      "HEADER;",
      `FILE_DESCRIPTION(('SIEC export'),'2;1');`,
      `FILE_NAME('${projectName}.ifc','${stamp}',('SIEC'),('SIEC'),'IFC4','SIEC','');`,
      `FILE_SCHEMA(('IFC4'));`,
      "ENDSEC;",
      "DATA;",
      "#1=IFCPROJECT('GUID0001',$,'SIEC Project',$,$,$,$,(#10),#5);",
      "#5=IFCUNITASSIGNMENT((#6,#7));",
      "#6=IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.);",
      "#7=IFCSIUNIT(*,.PLANEANGLEUNIT.,$,.RADIAN.);",
      "#10=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.0E-5,#11,$);",
      "#11=IFCAXIS2PLACEMENT3D(#12,$,$);",
      "#12=IFCCARTESIANPOINT((0.,0.,0.));",
    ];

    let id = 100;
    this.buildingGroup.traverse((obj) => {
      if (!obj.isMesh) return;
      const wallId = obj.userData?.wallId;
      const roomId = obj.userData?.roomId;
      if (wallId) {
        const pos = obj.position;
        lines.push(
          `#${id++}=IFCWALLSTANDARDCASE('${wallId}',$,'Wall ${wallId}',$,$,#11,$,$,'WALL');`,
          `#${id++}=IFCCARTESIANPOINT((${pos.x.toFixed(4)},${pos.z.toFixed(4)},${pos.y.toFixed(4)}));`,
        );
      } else if (roomId) {
        const pos = obj.position;
        lines.push(
          `#${id++}=IFCSLAB('${roomId}',$,'Slab ${roomId}',$,$,#11,$,$,'FLOOR');`,
          `#${id++}=IFCCARTESIANPOINT((${pos.x.toFixed(4)},${pos.z.toFixed(4)},${pos.y.toFixed(4)}));`,
        );
      }
    });

    lines.push("ENDSEC;", "END-ISO-10303-21;");
    return new Blob([lines.join("\n")], { type: "application/x-step" });
  }

  /**
   * Renders the current scene at a custom resolution (e.g. 4K) and returns a
   * PNG Blob. Restores original size after capture.
   */
  async exportImage({ width = 3840, height = 2160 } = {}) {
    const originalSize = new THREE.Vector2();
    this.renderer.getSize(originalSize);
    const originalPixelRatio = this.renderer.getPixelRatio();
    const targetCanvas = this.renderer.domElement;

    this.renderer.setPixelRatio(1);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera);

    const blob = await new Promise((resolve) =>
      targetCanvas.toBlob((b) => resolve(b), "image/png", 1.0),
    );

    this.renderer.setPixelRatio(originalPixelRatio);
    this.renderer.setSize(originalSize.x, originalSize.y, false);
    this.camera.aspect = originalSize.x / originalSize.y;
    this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera);
    if (!blob) throw new Error("No se pudo generar la imagen PNG.");
    return blob;
  }

  /** Convenience helper for the UI. */
  static download(blob, filename) {
    if (!blob) throw new Error(`No se pudo exportar ${filename}.`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  /**
   * Generates a standalone HTML file with an interactive 3D viewer
   * embedding the building group as GLTF binary (base64).
   */
  async exportHTML() {
    const glbBlob = await this.exportGLTF({ binary: true });
    const arrayBuffer = await glbBlob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let base64 = "";
    for (let i = 0; i < bytes.length; i++) {
      base64 += String.fromCharCode(bytes[i]);
    }
    const b64 = btoa(base64);

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SIEC — Visor 3D</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{overflow:hidden;background:#0b1220;font-family:system-ui,sans-serif}
  canvas{display:block}
  #toolbar{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:10;
    display:flex;gap:8px;padding:8px 16px;border-radius:999px;
    background:rgba(15,23,42,0.85);backdrop-filter:blur(12px);
    border:1px solid rgba(148,163,184,0.2);color:#e2e8f0;font-size:12px;font-weight:600}
  #toolbar button{background:rgba(255,255,255,0.08);border:none;color:#e2e8f0;
    padding:6px 14px;border-radius:999px;cursor:pointer;font-size:11px;font-weight:600;
    transition:all 0.2s;display:flex;align-items:center;gap:6px}
  #toolbar button:hover{background:rgba(255,255,255,0.16)}
  #toolbar button.active{background:#f97316;color:#fff}
  .sep{width:1px;background:rgba(148,163,184,0.3);margin:0 4px}
</style>
</head>
<body>
<div id="toolbar">
  <span>SIEC Visor</span><span class="sep"></span>
  <button id="btn-fit" title="Centrar">◎</button>
  <button id="btn-top" title="Vista superior">⬆</button>
  <button id="btn-front" title="Vista frontal">⬛</button>
  <span class="sep"></span>
  <span id="info">Cargando...</span>
</div>
<script type="importmap">
{"imports":{
  "three":"https://unpkg.com/three@0.183.0/build/three.module.js",
  "three/addons/":"https://unpkg.com/three@0.183.0/examples/jsm/"
}}
</script>
<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0b1220');
scene.fog = new THREE.Fog('#0b1220', 30, 120);

const cam = new THREE.PerspectiveCamera(55, innerWidth/innerHeight, 0.1, 2000);
cam.position.set(10, 14, 10);

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(cam, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0,1.2,0);

scene.add(new THREE.AmbientLight('#404060', 1.5));
const sun = new THREE.DirectionalLight('#ffeedd', 3);
sun.position.set(15, 22, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 80;
sun.shadow.camera.left = -20; sun.shadow.camera.right = 20;
sun.shadow.camera.top = 20; sun.shadow.camera.bottom = -20;
scene.add(sun);

const hemi = new THREE.HemisphereLight('#8899cc','#334455',0.6);
scene.add(hemi);

const grid = new THREE.GridHelper(200,200,'#22d3ee','#1e293b');
grid.material.opacity = 0.12; grid.material.transparent = true;
scene.add(grid);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200,200),
  new THREE.MeshStandardMaterial({color:'#0f172a',roughness:0.9})
);
ground.rotation.x = -Math.PI/2; ground.position.y = -0.01;
ground.receiveShadow = true; scene.add(ground);

const binary = Uint8Array.from(atob('${b64}'), c => c.charCodeAt(0));
new GLTFLoader().parse(binary.buffer, '', (gltf) => {
  scene.add(gltf.scene);
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const c = box.getCenter(new THREE.Vector3());
  const s = box.getSize(new THREE.Vector3());
  const d = Math.max(s.x,s.y,s.z) / 2 / Math.tan(cam.fov*Math.PI/360) * 1.6;
  cam.position.set(c.x+d*0.7, Math.max(d,8), c.z+d*0.7);
  controls.target.copy(c); controls.update();
  document.getElementById('info').textContent = 'Listo';
});

document.getElementById('btn-fit').onclick = () => {
  const box = new THREE.Box3().setFromObject(scene);
  if(box.isEmpty())return;
  const c=box.getCenter(new THREE.Vector3()),s=box.getSize(new THREE.Vector3());
  const d=Math.max(s.x,s.y,s.z)/2/Math.tan(cam.fov*Math.PI/360)*1.6;
  cam.position.set(c.x+d*0.7,Math.max(d,8),c.z+d*0.7);
  controls.target.copy(c); controls.update();
};
document.getElementById('btn-top').onclick = () => {
  const t=controls.target.clone(); cam.position.set(t.x,t.y+15,t.z+0.01); controls.update();
};
document.getElementById('btn-front').onclick = () => {
  const t=controls.target.clone(); cam.position.set(t.x,t.y+1.6,t.z+12); controls.update();
};

function anim(){requestAnimationFrame(anim);controls.update();renderer.render(scene,cam)}
anim();
addEventListener('resize',()=>{cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
</script>
</body>
</html>`;

    return new Blob([html], { type: "text/html" });
  }
}
