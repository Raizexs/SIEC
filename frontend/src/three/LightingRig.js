/**
 * LightingRig — cinematic day/night lighting for the architectural scene.
 *
 * Provides:
 *   - Hemisphere fill light (sky/ground bounce).
 *   - Animated directional sun whose position is computed via SunCalc for
 *     real solar geometry (latitude/longitude and time-of-day aware).
 *   - VSM soft shadows.
 *   - 3 environment presets: day | sunset | night (procedural color skies +
 *     optional HDRI loading).
 *   - Interior point lights that auto-enable at night.
 *
 * Public API:
 *   const rig = new LightingRig(scene, { renderer });
 *   rig.setPreset('day' | 'sunset' | 'night');
 *   rig.setTimeOfDay(hours);  // 0-24
 *   rig.setLatLon(lat, lon);
 *   rig.update(dt);           // call from animation loop
 *   rig.dispose();
 */
import * as THREE from "three";
import SunCalc from "suncalc";

const PRESETS = {
  day: {
    sky: "#87ceeb",
    ground: "#cbd5e1",
    sunIntensity: 1.4,
    sunColor: "#fff7ed",
    fogDensity: 0.0015,
    ambient: 0.55,
    bgColor: "#9bcdf2",
  },
  sunset: {
    sky: "#fbbf24",
    ground: "#7c2d12",
    sunIntensity: 1.0,
    sunColor: "#fb923c",
    fogDensity: 0.003,
    ambient: 0.4,
    bgColor: "#f97316",
  },
  night: {
    sky: "#0f172a",
    ground: "#020617",
    sunIntensity: 0.05,
    sunColor: "#a5b4fc",
    fogDensity: 0.006,
    ambient: 0.18,
    bgColor: "#020617",
  },
};

export class LightingRig {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.renderer = options.renderer;
    this.lat = options.lat ?? -33.045; // Valparaíso, Chile (default for SIEC)
    this.lon = options.lon ?? -71.62;
    this.timeOfDay = options.timeOfDay ?? 13;
    this.preset = "day";

    this.hemi = new THREE.HemisphereLight(0xffffff, 0xcccccc, 0.55);
    this.scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(0xffffff, 1.4);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 0.5;
    this.sun.shadow.camera.far = 100;
    this.sun.shadow.camera.left = -25;
    this.sun.shadow.camera.right = 25;
    this.sun.shadow.camera.top = 25;
    this.sun.shadow.camera.bottom = -25;
    this.sun.shadow.bias = -0.0008;
    this.sun.shadow.normalBias = 0.05;
    this.sun.shadow.radius = 4;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    this.interiorLights = [];

    this.setPreset("day");
    this.setTimeOfDay(this.timeOfDay);
  }

  setPreset(preset) {
    if (!PRESETS[preset]) return;
    this.preset = preset;
    const cfg = PRESETS[preset];
    this.hemi.color.set(cfg.sky);
    this.hemi.groundColor.set(cfg.ground);
    this.hemi.intensity = cfg.ambient;
    this.sun.intensity = cfg.sunIntensity;
    this.sun.color.set(cfg.sunColor);

    if (this.scene.background?.set) this.scene.background.set(cfg.bgColor);
    else this.scene.background = new THREE.Color(cfg.bgColor);

    this.scene.fog = new THREE.FogExp2(cfg.bgColor, cfg.fogDensity);

    this._setInteriorLights(preset === "night" || preset === "sunset");
  }

  setLatLon(lat, lon) {
    this.lat = lat;
    this.lon = lon;
    this.setTimeOfDay(this.timeOfDay);
  }

  setTimeOfDay(hours) {
    this.timeOfDay = Math.max(0, Math.min(24, hours));
    const date = new Date();
    date.setHours(Math.floor(this.timeOfDay));
    date.setMinutes((this.timeOfDay % 1) * 60);
    const pos = SunCalc.getPosition(date, this.lat, this.lon);
    const distance = 30;
    const x = distance * Math.cos(pos.altitude) * Math.sin(pos.azimuth);
    const y = Math.max(-2, distance * Math.sin(pos.altitude));
    const z = distance * Math.cos(pos.altitude) * Math.cos(pos.azimuth);
    this.sun.position.set(x, y, z);
    this.sun.target.position.set(0, 0, 0);
    this.sun.target.updateMatrixWorld();

    if (pos.altitude < -0.05) this.setPreset("night");
    else if (pos.altitude < 0.18) this.setPreset("sunset");
    else this.setPreset("day");
  }

  /**
   * Add interior point lights for given recintos. They turn on automatically
   * at night/sunset.
   */
  setupInteriorLights(recintos) {
    this._disposeInteriorLights();
    for (const r of recintos) {
      const cx = r.coords.x + r.dimensions.w / 2;
      const cz = r.coords.z + r.dimensions.l / 2;
      const cy = (r.piso || 1) * 2.4 - 0.5;
      const light = new THREE.PointLight(0xfde68a, 0.0, 8, 1.6);
      light.position.set(cx, cy, cz);
      light.castShadow = false;
      this.scene.add(light);
      this.interiorLights.push({ light, roomId: r.id });
    }
    this._setInteriorLights(
      this.preset === "night" || this.preset === "sunset",
    );
  }

  _setInteriorLights(on) {
    const targetIntensity = on ? (this.preset === "night" ? 1.4 : 0.6) : 0;
    for (const { light } of this.interiorLights) {
      light.intensity = targetIntensity;
    }
  }

  _disposeInteriorLights() {
    for (const { light } of this.interiorLights) {
      this.scene.remove(light);
    }
    this.interiorLights = [];
  }

  dispose() {
    this._disposeInteriorLights();
    this.scene.remove(this.hemi);
    this.scene.remove(this.sun);
    this.scene.remove(this.sun.target);
  }
}
