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
}
