import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useRecintosStore } from "../recintos";

describe("recintos store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("allows adding and updating room coordinates on floor 1 without structural constraints", () => {
    const store = useRecintosStore();
    
    // Add a room on floor 1
    const id = store.addRecinto("habitacion", "Habitación 1", 3.0, 3.0, 2.4);
    expect(id).toBeDefined();

    // Verify it exists on floor 1
    const room = store.recintos.find((r) => r.id === id);
    expect(room).toBeDefined();
    expect(room.piso).toBe(1);

    // Update coordinates
    const updated = store.updateRecinto(id, { coords: { x: 5, z: 5 } });
    expect(updated).toBe(true);
    expect(room.coords.x).toBe(5);
    expect(room.coords.z).toBe(5);
  });

  it("validates structural support when updating coordinates and dimensions of a room on floor 2", () => {
    const store = useRecintosStore();

    // Add a support room on floor 1
    const supportId = store.addRecinto("habitacion", "Soporte Piso 1", 4.0, 4.0, 2.4);
    store.updateRecinto(supportId, { coords: { x: 0, z: 0 } });

    // Switch to floor 2
    store.setFloor(2);

    // Add a room on floor 2
    const id = store.addRecinto("habitacion", "Habitación Piso 2", 3.0, 3.0, 2.4);
    expect(id).toBeDefined();

    // Try to update to an unsupported position (e.g. x = 10, z = 10) - should fail because there is no support below
    const updatedFail = store.updateRecinto(id, {
      dimensions: { w: 3.0, l: 3.0, h: 2.4 },
      coords: { x: 10, z: 10 }
    });
    expect(updatedFail).toBe(false);

    // Try to update to a fully supported position (e.g. x = 0, z = 0) - should succeed
    const updatedSuccess = store.updateRecinto(id, {
      dimensions: { w: 3.0, l: 3.0, h: 2.4 },
      coords: { x: 0, z: 0 }
    });
    expect(updatedSuccess).toBe(true);

    const room = store.recintos.find((r) => r.id === id);
    expect(room.coords.x).toBe(0);
    expect(room.coords.z).toBe(0);
    expect(room.dimensions.w).toBe(3.0);
  });
});
