/**
 * Vigas de borde para voladizos — visible con la capa estructura activa.
 */
import * as THREE from 'three';

const BEAM_PROFILE = {
  wood_frame: { h: 0.22, w: 0.14, color: 0x8b6914 },
  steel_framed: { h: 0.18, w: 0.12, color: 0x64748b },
  masonry: { h: 0.28, w: 0.18, color: 0x78716c },
  concrete: { h: 0.32, w: 0.22, color: 0x52525b },
};

export class CantileverBeamBuilder {
  build(recinto, analysis, { wallHeight = 2.4, matTypeKey = 'steel_framed' } = {}) {
    const group = new THREE.Group();
    group.name = `cantilever-beams-${recinto.id}`;
    group.userData.recintoId = recinto.id;
    group.userData.piso = recinto.piso || 1;
    group.userData.layerTags = ['structure'];

    const profile = BEAM_PROFILE[matTypeKey] || BEAM_PROFILE.steel_framed;
    const piso = recinto.piso || 1;
    const slabY = (piso - 1) * wallHeight + 0.02;
    const beamCenterY = slabY - profile.h / 2 - 0.01;

    for (const edge of analysis.beams || []) {
      const length = Math.max(0.5, edge.spanM);
      const depth = Math.max(0.08, edge.depthM);
      const geom =
        edge.axis === 'z'
          ? new THREE.BoxGeometry(profile.w, profile.h, length)
          : new THREE.BoxGeometry(length, profile.h, profile.w);

      const mat = new THREE.MeshStandardMaterial({
        color: profile.color,
        roughness: 0.72,
        metalness: matTypeKey === 'steel_framed' ? 0.35 : 0.08,
      });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.layerTags = ['structure'];
      mesh.userData.cantileverEdge = edge.side;

      mesh.position.set(edge.centerX, beamCenterY, edge.centerZ);
      group.add(mesh);

      // Refuerzo transversal corto bajo el voladizo (viga secundaria)
      if (depth >= 0.35) {
        const stubLen = Math.min(depth, 1.2);
        const stubGeom =
          edge.axis === 'z'
            ? new THREE.BoxGeometry(stubLen, profile.h * 0.85, profile.w * 1.1)
            : new THREE.BoxGeometry(profile.w * 1.1, profile.h * 0.85, stubLen);

        const stub = new THREE.Mesh(stubGeom, mat.clone());
        stub.castShadow = true;
        stub.userData.layerTags = ['structure'];

        if (edge.side === 'west') {
          stub.position.set(recinto.coords.x - stubLen / 2, beamCenterY, edge.centerZ);
        } else if (edge.side === 'east') {
          stub.position.set(
            recinto.coords.x + recinto.dimensions.w + stubLen / 2,
            beamCenterY,
            edge.centerZ,
          );
        } else if (edge.side === 'south') {
          stub.position.set(edge.centerX, beamCenterY, recinto.coords.z - stubLen / 2);
        } else {
          stub.position.set(
            edge.centerX,
            beamCenterY,
            recinto.coords.z + recinto.dimensions.l + stubLen / 2,
          );
        }

        group.add(stub);
      }
    }

    return group;
  }
}
