import * as THREE from 'three';

/**
 * Genera texturas procedurales profesionales para materialidades de construcción.
 *
 * Uso:
 *   const matLib = new MaterialLibrary();
 *   const wallMaterial = matLib.getMaterial('wood_frame', 'exterior_wall');
 *   mesh.material = wallMaterial;
 */
class MaterialLibrary {
  constructor() {
    // Tamaño base de las texturas generadas
    this.resolution = 512;
    // Cache para no regenerar las mismas texturas
    this.cache = {};
  }

  /**
   * Obtiene un MeshStandardMaterial para la combinación materialidad + parte.
   * @param {string} type - 'wood_frame', 'steel_framed', 'masonry', 'concrete', 'error'
   * @param {string} part - 'exterior_wall', 'interior_wall', 'floor'
   * @returns {THREE.MeshStandardMaterial}
   */
  getMaterial(type, part) {
    const key = `${type}_${part}`;
    if (this.cache[key]) return this.cache[key].clone();

    let colorMap, roughness, metalness;

    switch (type) {
      case 'wood_frame':
        if (part === 'exterior_wall') {
          colorMap = this._generateSidingWood();
          roughness = 0.7;
          metalness = 0.0;
        } else if (part === 'interior_wall') {
          colorMap = this._generatePlasterWall('#F8F3EC');
          roughness = 0.85;
          metalness = 0.0;
        } else if (part === 'floor') {
          colorMap = this._generateWoodPlanks('#C8A882', '#B3946E', 7);
          roughness = 0.65;
          metalness = 0.0;
        }
        break;

      case 'steel_framed':
        if (part === 'exterior_wall') {
          colorMap = this._generateVinylSiding();
          roughness = 0.5;
          metalness = 0.05;
        } else if (part === 'interior_wall') {
          colorMap = this._generatePlasterWall('#EEF2F5');
          roughness = 0.9;
          metalness = 0.0;
        } else if (part === 'floor') {
          colorMap = this._generateTileGrid('#D6D0C8', '#C4BEB6', 0.4);
          roughness = 0.5;
          metalness = 0.05;
        }
        break;

      case 'masonry':
        if (part === 'exterior_wall') {
          colorMap = this._generateBrickPattern();
          roughness = 0.8;
          metalness = 0.0;
        } else if (part === 'interior_wall') {
          colorMap = this._generateStucco();
          roughness = 0.9;
          metalness = 0.0;
        } else if (part === 'floor') {
          colorMap = this._generateTileGrid('#E8D5B7', '#D4C0A5', 0.5);
          roughness = 0.4;
          metalness = 0.05;
        }
        break;

      case 'concrete':
        if (part === 'exterior_wall') {
          colorMap = this._generateFerrocementPanels();
          roughness = 0.7;
          metalness = 0.0;
        } else if (part === 'interior_wall') {
          colorMap = this._generatePlasterWall('#D0D0D0');
          roughness = 0.65;
          metalness = 0.0;
        } else if (part === 'floor') {
          colorMap = this._generateTileGrid('#B8B2AC', '#A8A29E', 0.35);
          roughness = 0.35;
          metalness = 0.1;
        }
        break;

      case 'error':
        colorMap = this._generateSolidColor('#CC2222');
        roughness = 0.95;
        metalness = 0.0;
        break;

      default:
        colorMap = this._generateSolidColor('#FF00FF');
        roughness = 0.5;
        metalness = 0.0;
    }

    // Convertir canvas a textura de Three.js
    const texture = new THREE.CanvasTexture(colorMap);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;

    // Ajustar repetición según tipo de elemento
    if (part === 'floor') {
      texture.repeat.set(2, 2);
    } else {
      texture.repeat.set(1, 1);
    }

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness,
      metalness,
    });

    this.cache[key] = material;
    return material.clone();
  }

  /* ---------- Métodos privados de generación ---------- */

  _createCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = this.resolution;
    canvas.height = this.resolution;
    return canvas;
  }

  /** Hex → {r,g,b} 0–255 */
  _hexToRGB(hex) {
    const v = parseInt(hex.replace('#', ''), 16);
    return { r: (v >> 16) & 0xFF, g: (v >> 8) & 0xFF, b: v & 0xFF };
  }

  /** Subtle pixel noise over entire canvas */
  _applyNoise(ctx, intensity = 6) {
    const imageData = ctx.getImageData(0, 0, this.resolution, this.resolution);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * intensity;
      d[i]     = Math.min(255, Math.max(0, d[i]     + n));
      d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n));
      d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + n));
    }
    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Color sólido (fallback)
   */
  _generateSolidColor(hex) {
    const canvas = this._createCanvas();
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = hex;
    ctx.fillRect(0, 0, this.resolution, this.resolution);
    return canvas;
  }

  /**
   * Plaster / painted wall — solid base + subtle noise for realism
   */
  _generatePlasterWall(hex) {
    const canvas = this._createCanvas();
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = hex;
    ctx.fillRect(0, 0, this.resolution, this.resolution);
    this._applyNoise(ctx, 6);
    return canvas;
  }

  /**
   * Siding de madera horizontal (líneas sutiles) — Wood Frame exterior
   */
  _generateSidingWood() {
    const canvas = this._createCanvas();
    const ctx = canvas.getContext('2d');
    const baseColor = '#C0966C';
    const lineColor = '#B0855A';
    const plankHeight = this.resolution / 16;

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, this.resolution, this.resolution);

    // Variación de tono por tablón
    for (let y = 0; y < this.resolution; y += plankHeight) {
      const hueShift = (Math.random() - 0.5) * 15;
      const rgb = this._hexToRGB(baseColor);
      ctx.fillStyle = `rgb(${rgb.r + hueShift}, ${rgb.g + hueShift * 0.7}, ${rgb.b + hueShift * 0.4})`;
      ctx.fillRect(0, y, this.resolution, plankHeight);
    }

    // Junta entre tablones (línea oscura + highlight)
    for (let y = 0; y <= this.resolution; y += plankHeight) {
      // Shadow line
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.resolution, y);
      ctx.stroke();
      // Highlight line just below
      ctx.strokeStyle = 'rgba(255, 240, 220, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y + 2);
      ctx.lineTo(this.resolution, y + 2);
      ctx.stroke();
    }

    // Subtle wood grain
    ctx.strokeStyle = '#A07850';
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.12;
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * this.resolution;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      for (let y = 0; y < this.resolution; y += 15) {
        ctx.lineTo(x + (Math.random() - 0.5) * 3, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    this._applyNoise(ctx, 4);
    return canvas;
  }

  /**
   * Vinyl horizontal siding — Metalcon/Steel Framed exterior
   * Typical plastic clapboard panels with shadow lap lines
   */
  _generateVinylSiding() {
    const canvas = this._createCanvas();
    const ctx = canvas.getContext('2d');
    const res = this.resolution;

    // Base color — typical warm off-white/cream vinyl
    const baseColor = '#E8E2D8';
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, res, res);

    const panelHeight = res / 12; // ~12 horizontal panels

    for (let y = 0; y < res; y += panelHeight) {
      // Slight color variation per panel
      const rgb = this._hexToRGB(baseColor);
      const shift = (Math.random() - 0.5) * 6;
      ctx.fillStyle = `rgb(${rgb.r + shift}, ${rgb.g + shift}, ${rgb.b + shift})`;
      ctx.fillRect(0, y, res, panelHeight);

      // Shadow at top of each panel (overlap shadow from panel above)
      const grad = ctx.createLinearGradient(0, y, 0, y + 6);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.12)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, y, res, 6);

      // Bright edge at bottom of each panel (light catch)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(0, y + panelHeight - 2, res, 2);

      // Sharp joint line
      ctx.strokeStyle = '#C5BFB5';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(res, y);
      ctx.stroke();
    }

    // Vertical panel joints (every ~4 panels width for realism)
    const jointSpacing = res / 3;
    for (let x = jointSpacing; x < res; x += jointSpacing) {
      ctx.strokeStyle = '#C8C2B8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, res);
      ctx.stroke();
      // Small shadow next to joint
      ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
      ctx.fillRect(x + 1, 0, 3, res);
    }

    this._applyNoise(ctx, 3);
    return canvas;
  }

  /**
   * Tablones de madera para suelo (vetas verticales finas)
   */
  _generateWoodPlanks(lightHex, darkHex, plankCount) {
    const canvas = this._createCanvas();
    const ctx = canvas.getContext('2d');
    const plankWidth = this.resolution / plankCount;

    ctx.fillStyle = lightHex;
    ctx.fillRect(0, 0, this.resolution, this.resolution);

    // Color variation per plank
    for (let i = 0; i < plankCount; i++) {
      const x = i * plankWidth;
      const rgb = this._hexToRGB(lightHex);
      const shift = (Math.random() - 0.5) * 12;
      ctx.fillStyle = `rgb(${rgb.r + shift}, ${rgb.g + shift * 0.8}, ${rgb.b + shift * 0.5})`;
      ctx.fillRect(x, 0, plankWidth, this.resolution);
    }

    // Separación entre tablones
    ctx.strokeStyle = '#A08060';
    ctx.lineWidth = 1.5;
    for (let x = 0; x <= this.resolution; x += plankWidth) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.resolution);
      ctx.stroke();
    }

    // Vetas onduladas
    ctx.strokeStyle = darkHex;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.2;
    for (let i = 0; i < plankCount * 5; i++) {
      const x = Math.random() * this.resolution;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      for (let y = 0; y < this.resolution; y += 12) {
        ctx.lineTo(x + (Math.random() - 0.5) * 5, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    this._applyNoise(ctx, 4);
    return canvas;
  }

  /**
   * Patrón de ladrillo a la vista con mortero (Masonry exterior)
   */
  _generateBrickPattern() {
    const canvas = this._createCanvas();
    const ctx = canvas.getContext('2d');
    const brickColor = '#B84532';
    const mortarColor = '#C8BEB4';

    ctx.fillStyle = mortarColor;
    ctx.fillRect(0, 0, this.resolution, this.resolution);

    const brickWidth = this.resolution / 6;
    const brickHeight = brickWidth * 0.4;
    const mortarThickness = brickWidth * 0.08;

    for (let row = 0; row < this.resolution / brickHeight + 1; row++) {
      const offsetX = (row % 2) * (brickWidth / 2);
      for (let col = -1; col < this.resolution / brickWidth + 2; col++) {
        const x = col * brickWidth + offsetX - brickWidth / 2;
        const y = row * brickHeight;
        // Color variation per brick
        const rgb = this._hexToRGB(brickColor);
        const shift = (Math.random() - 0.5) * 20;
        ctx.fillStyle = `rgb(${rgb.r + shift}, ${rgb.g + shift * 0.5}, ${rgb.b + shift * 0.3})`;
        ctx.fillRect(
          x + mortarThickness,
          y + mortarThickness,
          brickWidth - mortarThickness * 2,
          brickHeight - mortarThickness * 2
        );
      }
    }

    this._applyNoise(ctx, 5);
    return canvas;
  }

  /**
   * Estuco con textura granulada (Masonry interior)
   */
  _generateStucco() {
    const canvas = this._createCanvas();
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#F2EFE9';
    ctx.fillRect(0, 0, this.resolution, this.resolution);
    this._applyNoise(ctx, 10);
    return canvas;
  }

  /**
   * Cuadrícula sutil para cerámica/porcelanato — unified warm tones
   */
  _generateTileGrid(fillHex, lineHex, lineAlpha) {
    const canvas = this._createCanvas();
    const ctx = canvas.getContext('2d');
    const tileSize = this.resolution / 4;

    ctx.fillStyle = fillHex;
    ctx.fillRect(0, 0, this.resolution, this.resolution);

    // Slight color variation per tile
    for (let tx = 0; tx < this.resolution; tx += tileSize) {
      for (let ty = 0; ty < this.resolution; ty += tileSize) {
        const rgb = this._hexToRGB(fillHex);
        const shift = (Math.random() - 0.5) * 8;
        ctx.fillStyle = `rgb(${rgb.r + shift}, ${rgb.g + shift}, ${rgb.b + shift})`;
        ctx.fillRect(tx + 1, ty + 1, tileSize - 2, tileSize - 2);
      }
    }

    // Grid lines (grout)
    ctx.strokeStyle = lineHex;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = lineAlpha;

    for (let x = 0; x <= this.resolution; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.resolution);
      ctx.stroke();
    }
    for (let y = 0; y <= this.resolution; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.resolution, y);
      ctx.stroke();
    }

    ctx.globalAlpha = 1.0;
    this._applyNoise(ctx, 4);
    return canvas;
  }

  /**
   * Ferrocement panels — visible rectangular panel grid with
   * joint lines, subtle bolt marks, and fine surface pores
   */
  _generateFerrocementPanels() {
    const canvas = this._createCanvas();
    const ctx = canvas.getContext('2d');
    const res = this.resolution;
    const baseColor = '#8A8A8A';

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, res, res);

    // Panel grid — 3 columns × 4 rows of rectangular panels
    const panelW = res / 3;
    const panelH = res / 4;
    const jointWidth = 3;

    for (let px = 0; px < 3; px++) {
      for (let py = 0; py < 4; py++) {
        const x = px * panelW;
        const y = py * panelH;

        // Slight color variation per panel
        const rgb = this._hexToRGB(baseColor);
        const shift = (Math.random() - 0.5) * 10;
        ctx.fillStyle = `rgb(${rgb.r + shift}, ${rgb.g + shift}, ${rgb.b + shift})`;
        ctx.fillRect(x + jointWidth, y + jointWidth, panelW - jointWidth * 2, panelH - jointWidth * 2);
      }
    }

    // Joint lines (dark recessed grooves)
    ctx.strokeStyle = '#5E5E5E';
    ctx.lineWidth = jointWidth;
    for (let x = panelW; x < res; x += panelW) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, res);
      ctx.stroke();
    }
    for (let y = panelH; y < res; y += panelH) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(res, y);
      ctx.stroke();
    }

    // Highlight edge on right/bottom of joints (bevel effect)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let x = panelW; x < res; x += panelW) {
      ctx.beginPath();
      ctx.moveTo(x + jointWidth / 2 + 1, 0);
      ctx.lineTo(x + jointWidth / 2 + 1, res);
      ctx.stroke();
    }
    for (let y = panelH; y < res; y += panelH) {
      ctx.beginPath();
      ctx.moveTo(0, y + jointWidth / 2 + 1);
      ctx.lineTo(res, y + jointWidth / 2 + 1);
      ctx.stroke();
    }

    // Bolt marks at panel intersections
    ctx.fillStyle = '#6A6A6A';
    for (let px = 0; px <= 3; px++) {
      for (let py = 0; py <= 4; py++) {
        const cx = px * panelW;
        const cy = py * panelH;
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();
        // Highlight ring
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }

    // Surface pores (small random dots)
    for (let i = 0; i < 400; i++) {
      const x = Math.random() * res;
      const y = Math.random() * res;
      const radius = Math.random() * 1.5 + 0.3;
      ctx.fillStyle = Math.random() > 0.5 ? '#7A7A7A' : '#959595';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    this._applyNoise(ctx, 5);
    return canvas;
  }

  /**
   * Devuelve un material específico para una capa constructiva.
   * Usado por WallBuilder para generar meshes por capa.
   * @param {'wood_frame'|'steel_framed'|'masonry'|'concrete'} type
   * @param {'structure'|'insulation'|'interior'|'facade'|'installations'} layer
   * @returns {THREE.MeshStandardMaterial|THREE.MeshPhongMaterial}
   */
  getLayerMaterial(type, layer) {
    const key = `layer_${type}_${layer}`;
    if (this.cache[key]) return this.cache[key].clone();

    let material;

    if (layer === 'structure') {
      const map = this._generateStudFrame(type);
      const texture = this._textureFromCanvas(map);
      texture.repeat.set(1, 1);
      material = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.7,
        metalness: 0.0,
      });
    } else if (layer === 'insulation') {
      const map = this._generateInsulation();
      const texture = this._textureFromCanvas(map);
      texture.repeat.set(2, 1);
      material = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.9,
        metalness: 0.0,
      });
    } else if (layer === 'interior') {
      let map;
      if (type === 'wood_frame') {
        map = this._generatePlasterWall('#F8F3EC');
      } else if (type === 'steel_framed') {
        map = this._generatePlasterWall('#EEF2F5');
      } else if (type === 'masonry') {
        map = this._generateStucco();
      } else {
        map = this._generatePlasterWall('#D0D0D0');
      }
      const texture = this._textureFromCanvas(map);
      material = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.85,
        metalness: 0.0,
      });
    } else if (layer === 'facade') {
      let map;
      if (type === 'wood_frame') {
        map = this._generateSidingWood();
      } else if (type === 'steel_framed') {
        map = this._generateVinylSiding();
      } else if (type === 'masonry') {
        map = this._generateBrickPattern();
      } else {
        map = this._generateFerrocementPanels();
      }
      const texture = this._textureFromCanvas(map);
      texture.repeat.set(1, 1);
      material = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.6,
        metalness: 0.0,
      });
    } else if (layer === 'installations') {
      material = new THREE.MeshStandardMaterial({
        color: 0xcc6633,
        roughness: 0.3,
        metalness: 0.7,
      });
    }

    if (!material) {
      material = new THREE.MeshStandardMaterial({
        color: 0xff00ff,
        roughness: 0.5,
        metalness: 0.0,
      });
    }

    this.cache[key] = material;
    return material.clone();
  }

  /** Convierte un canvas en textura Three.js con settings estándar */
  _textureFromCanvas(canvas) {
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    return texture;
  }

  /**
   * Textura de madera pálida para esqueleto estructural (vigas/studs)
   */
  _generateStudFrame(type) {
    const canvas = this._createCanvas();
    const ctx = canvas.getContext('2d');
    const res = this.resolution;

    const baseColor = type === 'steel_framed' ? '#B0B8C0' : '#D4B896';
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, res, res);

    // Vetas verticales
    ctx.strokeStyle = type === 'steel_framed' ? '#9098A0' : '#B89870';
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < 25; i++) {
      const x = Math.random() * res;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      for (let y = 0; y < res; y += 10) {
        ctx.lineTo(x + (Math.random() - 0.5) * 4, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    if (type !== 'steel_framed') {
      // Nudos de madera
      ctx.fillStyle = '#9E7C5A';
      for (let i = 0; i < 8; i++) {
        const nx = Math.random() * res;
        const ny = Math.random() * res;
        ctx.beginPath();
        ctx.ellipse(nx, ny, 3 + Math.random() * 5, 2 + Math.random() * 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    this._applyNoise(ctx, 4);
    return canvas;
  }

  /**
   * Aislación: fibra de vidrio amarilla/rosada con textura fibrosa
   */
  _generateInsulation() {
    const canvas = this._createCanvas();
    const ctx = canvas.getContext('2d');
    const res = this.resolution;

    ctx.fillStyle = '#F5D76E';
    ctx.fillRect(0, 0, res, res);

    // Bandas horizontales de variación
    for (let y = 0; y < res; y += res / 8) {
      const rgb = this._hexToRGB('#F5D76E');
      const shift = (Math.random() - 0.5) * 12;
      ctx.fillStyle = `rgb(${rgb.r + shift}, ${rgb.g + shift}, ${rgb.b + shift * 0.5})`;
      ctx.fillRect(0, y, res, res / 8);
    }

    // Textura fibrosa
    ctx.strokeStyle = 'rgba(200, 170, 80, 0.3)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * res;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      const amp = 2 + Math.random() * 4;
      for (let y = 0; y < res; y += 4) {
        ctx.lineTo(x + (Math.random() - 0.5) * amp, y);
      }
      ctx.stroke();
    }

    this._applyNoise(ctx, 3);
    return canvas;
  }

  /**
   * Limpiar caché si es necesario regenerar
   */
  clearCache() {
    this.cache = {};
  }
}

export default MaterialLibrary;
