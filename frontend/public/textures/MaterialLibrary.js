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

    let colorMap, roughness, metalness, colorSpace;

    switch (type) {
      case 'wood_frame':
        if (part === 'exterior_wall') {
          colorMap = this._generateSidingWood();
          roughness = 0.7;
          metalness = 0.0;
        } else if (part === 'interior_wall') {
          colorMap = this._generateSolidColor('#F8F3EC'); // yeso blanco hueso
          roughness = 0.85;
          metalness = 0.0;
        } else if (part === 'floor') {
          colorMap = this._generateWoodPlanks('#C8A882', '#B3946E', 7); // madera clara
          roughness = 0.65;
          metalness = 0.0;
        }
        break;

      case 'steel_framed':
        if (part === 'exterior_wall') {
          colorMap = this._generateSolidColor('#BCC6CC'); // fibrocemento gris azulado liso
          roughness = 0.55;
          metalness = 0.1;
        } else if (part === 'interior_wall') {
          colorMap = this._generateSolidColor('#EEF2F5'); // blanco humo mate
          roughness = 0.9;
          metalness = 0.0;
        } else if (part === 'floor') {
          colorMap = this._generateSolidColor('#C0C0C0'); // gris cálido neutro liso
          roughness = 0.5;
          metalness = 0.1;
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
          colorMap = this._generateConcreteRaw();
          roughness = 0.75;
          metalness = 0.0;
        } else if (part === 'interior_wall') {
          colorMap = this._generateSolidColor('#B0B0B0'); // gris claro pintado
          roughness = 0.65;
          metalness = 0.0;
        } else if (part === 'floor') {
          colorMap = this._generateSolidColor('#525252'); // gris oscuro pulido
          roughness = 0.25;
          metalness = 0.15;
        }
        break;

      case 'error':
        colorMap = this._generateSolidColor('#CC2222'); // rojo opaco
        roughness = 0.95;
        metalness = 0.0;
        break;

      default:
        colorMap = this._generateSolidColor('#FF00FF'); // magenta de fallback
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
    } else if (part === 'exterior_wall' && (type === 'masonry' || type === 'wood_frame')) {
      texture.repeat.set(1, 1);
    } else {
      texture.repeat.set(1, 1);
    }

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: roughness,
      metalness: metalness,
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

  /**
   * Color sólido (paredes lisas, radier, etc.)
   */
  _generateSolidColor(hex) {
    const canvas = this._createCanvas();
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = hex;
    ctx.fillRect(0, 0, this.resolution, this.resolution);
    return canvas;
  }

  /**
   * Siding de madera horizontal (líneas sutiles)
   */
  _generateSidingWood() {
    const canvas = this._createCanvas();
    const ctx = canvas.getContext('2d');
    const baseColor = '#C0966C';
    const lineColor = '#B0855A';
    const plankHeight = this.resolution / 16;

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, this.resolution, this.resolution);

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.5;
    for (let y = 0; y <= this.resolution; y += plankHeight) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.resolution, y);
      ctx.stroke();
    }

    // Añadir variación mínima de tono aleatoria por tablón
    for (let y = 0; y < this.resolution; y += plankHeight) {
      const variance = (Math.random() - 0.5) * 8;
      ctx.fillStyle = `rgba(${Math.floor(variance)}, ${Math.floor(variance)}, ${Math.floor(variance)}, 0.05)`;
      ctx.fillRect(0, y, this.resolution, plankHeight);
    }

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

    // Dibujar líneas de separación entre tablones
    ctx.strokeStyle = '#A08060';
    ctx.lineWidth = 1.2;
    for (let x = 0; x <= this.resolution; x += plankWidth) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.resolution);
      ctx.stroke();
    }

    // Añadir vetas muy sutiles (líneas onduladas verticales)
    ctx.strokeStyle = darkHex;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < plankCount * 4; i++) {
      const x = Math.random() * this.resolution;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      for (let y = 0; y < this.resolution; y += 20) {
        ctx.lineTo(x + (Math.random() - 0.5) * 4, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    return canvas;
  }

  /**
   * Patrón de ladrillo a la vista con mortero muy sutil
   */
  _generateBrickPattern() {
    const canvas = this._createCanvas();
    const ctx = canvas.getContext('2d');
    const brickColor = '#B84532'; // terracota
    const mortarColor = '#C8BEB4'; // mortero claro

    // Fondo mortero
    ctx.fillStyle = mortarColor;
    ctx.fillRect(0, 0, this.resolution, this.resolution);

    const brickWidth = this.resolution / 6;
    const brickHeight = brickWidth * 0.4;
    const mortarThickness = brickWidth * 0.08;

    ctx.fillStyle = brickColor;
    for (let row = 0; row < this.resolution / brickHeight + 1; row++) {
      const offsetX = (row % 2) * (brickWidth / 2); // trabado
      for (let col = -1; col < this.resolution / brickWidth + 2; col++) {
        const x = col * brickWidth + offsetX - brickWidth / 2;
        const y = row * brickHeight;
        ctx.fillRect(x + mortarThickness, y + mortarThickness, brickWidth - mortarThickness * 2, brickHeight - mortarThickness * 2);
      }
    }

    // Ligerísima variación tonal por ladrillo
    for (let row = 0; row < this.resolution / brickHeight + 1; row++) {
      const offsetX = (row % 2) * (brickWidth / 2);
      for (let col = -1; col < this.resolution / brickWidth + 2; col++) {
        const x = col * brickWidth + offsetX - brickWidth / 2;
        const y = row * brickHeight;
        const tone = Math.random() * 15;
        ctx.fillStyle = `rgba(${tone}, ${-tone * 0.5}, ${-tone * 0.5}, 0.1)`;
        ctx.fillRect(x + mortarThickness, y + mortarThickness, brickWidth - mortarThickness * 2, brickHeight - mortarThickness * 2);
      }
    }

    return canvas;
  }

  /**
   * Estuco con textura granulada apenas visible
   */
  _generateStucco() {
    const canvas = this._createCanvas();
    const ctx = canvas.getContext('2d');
    const baseColor = '#F2EFE9'; // blanco roto

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, this.resolution, this.resolution);

    // Granulado extremadamente sutil
    const imageData = ctx.getImageData(0, 0, this.resolution, this.resolution);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 8; // ±4 en cada canal
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
    ctx.putImageData(imageData, 0, 0);

    return canvas;
  }

  /**
   * Cuadrícula sutil para cerámica/porcelanato
   */
  _generateTileGrid(fillHex, lineHex, lineAlpha) {
    const canvas = this._createCanvas();
    const ctx = canvas.getContext('2d');
    const tileSize = this.resolution / 4;

    ctx.fillStyle = fillHex;
    ctx.fillRect(0, 0, this.resolution, this.resolution);

    ctx.strokeStyle = lineHex;
    ctx.lineWidth = 1.2;
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
    return canvas;
  }

  /**
   * Hormigón visto con poros sutiles (puntitos de moldaje)
   */
  _generateConcreteRaw() {
    const canvas = this._createCanvas();
    const ctx = canvas.getContext('2d');
    const baseColor = '#6B6B6B';

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, this.resolution, this.resolution);

    // Pequeñas imperfecciones (puntos oscuros y claros)
    for (let i = 0; i < 600; i++) {
      const x = Math.random() * this.resolution;
      const y = Math.random() * this.resolution;
      const radius = Math.random() * 2.5 + 0.5;
      const shade = Math.random() > 0.5 ? '#585858' : '#7E7E7E';
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Líneas de moldaje muy sutiles (horizontales)
    ctx.strokeStyle = '#5A5A5A';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.15;
    for (let y = 0; y < this.resolution; y += this.resolution / 12) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.resolution, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

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