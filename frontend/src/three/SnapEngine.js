/**
 * SnapEngine — quantizes coordinates and dimensions to a grid step.
 * 0 disables snapping. Used by both 2D editor and 3D drag/transform handlers.
 */
export class SnapEngine {
  constructor(step = 0.25) {
    this.step = step;
  }

  setStep(step) {
    this.step = step ?? 0;
  }

  snap(value) {
    if (!this.step || this.step <= 0) return value;
    return Math.round(value / this.step) * this.step;
  }

  snapVec(vec) {
    if (!this.step) return vec;
    vec.x = this.snap(vec.x);
    vec.y = this.snap(vec.y);
    vec.z = this.snap(vec.z);
    return vec;
  }
}

export const STEP_PRESETS = [
  { id: 0, label: "Off", step: 0 },
  { id: 10, label: "10 cm", step: 0.1 },
  { id: 25, label: "25 cm", step: 0.25 },
  { id: 50, label: "50 cm", step: 0.5 },
];
