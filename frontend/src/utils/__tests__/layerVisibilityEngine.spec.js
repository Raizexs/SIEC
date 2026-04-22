import { describe, expect, it } from "vitest";
import {
  createLayerVisibilityState,
  isLayerMeshVisible,
} from "../layerVisibilityEngine";

describe("layerVisibilityEngine", () => {
  it("shows any mesh when construction mode is disabled", () => {
    const state = createLayerVisibilityState(false, {
      structure: false,
      facade: false,
    });

    expect(isLayerMeshVisible(["structure"], state)).toBe(true);
    expect(isLayerMeshVisible(["facade"], state)).toBe(true);
  });

  it("keeps untagged meshes visible in construction mode", () => {
    const state = createLayerVisibilityState(true, {
      structure: true,
      facade: false,
    });

    expect(isLayerMeshVisible([], state)).toBe(true);
    expect(isLayerMeshVisible(undefined, state)).toBe(true);
  });

  it("shows meshes when at least one tag is active", () => {
    const state = createLayerVisibilityState(true, {
      structure: true,
      facade: false,
      installations: false,
    });

    expect(isLayerMeshVisible(["facade", "structure"], state)).toBe(true);
  });

  it("hides meshes when none of their tags are active", () => {
    const state = createLayerVisibilityState(true, {
      structure: false,
      facade: false,
      installations: true,
    });

    expect(isLayerMeshVisible(["facade", "structure"], state)).toBe(false);
  });
});
