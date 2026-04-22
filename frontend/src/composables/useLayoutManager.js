import { ref, computed } from "vue";

// Material costs in Chilean Pesos (CLP) per m² - Updated November 2024
export const MATERIAL_COSTS = {
  1: 850, // Wood Frame
  2: 1100, // Steel Frame
  3: 950, // Masonry
  4: 1200, // Concrete
};

// Singleton state for layouts
const savedLayouts = ref(
  JSON.parse(localStorage.getItem("siec_saved_layouts") || "[]"),
);

// Preset configurations
const presets = ref([
  {
    id: 1,
    name: "Casa Pequeña",
    nameEn: "Small House",
    m2Totales: 80,
    materialEstructuralId: 1,
    habitacionesSimples: 2,
    habitacionesDobles: 0,
    habitacionesTriples: 0,
    banios: 1,
    areasComunes: 1,
  },
  {
    id: 2,
    name: "Casa Familiar",
    nameEn: "Family House",
    m2Totales: 120,
    materialEstructuralId: 4,
    habitacionesSimples: 2,
    habitacionesDobles: 1,
    habitacionesTriples: 0,
    banios: 2,
    areasComunes: 1,
  },
  {
    id: 3,
    name: "Casa Grande",
    nameEn: "Large House",
    m2Totales: 200,
    materialEstructuralId: 2,
    habitacionesSimples: 1,
    habitacionesDobles: 2,
    habitacionesTriples: 1,
    banios: 3,
    areasComunes: 2,
  },
  {
    id: 4,
    name: "Casa de Lujo",
    nameEn: "Luxury House",
    m2Totales: 350,
    materialEstructuralId: 4,
    habitacionesSimples: 0,
    habitacionesDobles: 3,
    habitacionesTriples: 2,
    banios: 4,
    areasComunes: 3,
  },
]);

export function useLayoutManager() {
  // Save a new layout
  const saveLayout = (name, layoutData) => {
    const newLayout = {
      id: Date.now(),
      name: name,
      createdAt: new Date().toISOString(),
      ...layoutData,
    };

    savedLayouts.value.push(newLayout);
    localStorage.setItem(
      "siec_saved_layouts",
      JSON.stringify(savedLayouts.value),
    );

    return newLayout;
  };

  // Delete a layout
  const deleteLayout = (layoutId) => {
    const index = savedLayouts.value.findIndex(
      (layout) => layout.id === layoutId,
    );
    if (index > -1) {
      savedLayouts.value.splice(index, 1);
      localStorage.setItem(
        "siec_saved_layouts",
        JSON.stringify(savedLayouts.value),
      );
    }
  };

  // Calculate cost based on m² and material
  const calculateCost = (m2, materialId) => {
    const materialCost = MATERIAL_COSTS[materialId] || MATERIAL_COSTS[4];
    return m2 * materialCost;
  };

  // Get material name by ID
  const getMaterialName = (materialId) => {
    const materials = {
      1: "Wood Frame",
      2: "Metalcom (Light Steel)",
      3: "Masonry",
      4: "Ferrocement",
    };
    return materials[materialId] || "Unknown";
  };

  // Computed properties
  const recentLayouts = computed(() => {
    return savedLayouts.value
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
  });

  return {
    // State
    savedLayouts,
    presets,

    // Methods
    saveLayout,
    deleteLayout,
    calculateCost,
    getMaterialName,

    // Computed
    recentLayouts,

    // Constants
    MATERIAL_COSTS,
  };
}
