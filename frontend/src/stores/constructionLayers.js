import { defineStore } from "pinia";
import { computed, ref } from "vue";

const defaultLayerVisibility = () => ({
  facade: true,
  insulation: true,
  installations: true,
  interior: true,
  structure: true,
});

export const useConstructionLayersStore = defineStore(
  "constructionLayers",
  () => {
    const constructionModeEnabled = ref(false);
    const layerVisibility = ref(defaultLayerVisibility());
    const selectedLayerId = ref(null);

    const layers = [
      {
        id: "facade",
        labelKey: "facadeLayer",
        icon: "account_tree",
      },
      {
        id: "insulation",
        labelKey: "insulationLayer",
        icon: "ac_unit",
      },
      {
        id: "installations",
        labelKey: "installationsLayer",
        icon: "electrical_services",
      },
      {
        id: "interior",
        labelKey: "interiorLayer",
        icon: "home",
      },
      {
        id: "structure",
        labelKey: "structureLayer",
        icon: "foundation",
      },
    ];

    const visibleLayerIds = computed(() =>
      layers.filter((layer) => layerVisibility.value[layer.id]).map((layer) => layer.id),
    );

    const activeLayerCount = computed(() => visibleLayerIds.value.length);

    const toggleConstructionMode = () => {
      constructionModeEnabled.value = !constructionModeEnabled.value;
    };

    const setConstructionMode = (value) => {
      constructionModeEnabled.value = Boolean(value);
    };

    const toggleLayer = (layerId) => {
      if (!(layerId in layerVisibility.value)) return;
      layerVisibility.value = {
        ...layerVisibility.value,
        [layerId]: !layerVisibility.value[layerId],
      };
      if (
        !layerVisibility.value[layerId] &&
        selectedLayerId.value === layerId
      ) {
        selectedLayerId.value = null;
      }
    };

    const setLayerVisibility = (layerId, value) => {
      if (!(layerId in layerVisibility.value)) return;
      layerVisibility.value = {
        ...layerVisibility.value,
        [layerId]: Boolean(value),
      };
    };

    const resetLayers = () => {
      layerVisibility.value = defaultLayerVisibility();
      constructionModeEnabled.value = false;
      selectedLayerId.value = null;
    };

    const setSelectedLayer = (layerId) => {
      if (!layerId || !(layerId in layerVisibility.value)) {
        selectedLayerId.value = null;
        return;
      }
      selectedLayerId.value = layerId;
      if (!layerVisibility.value[layerId]) {
        setLayerVisibility(layerId, true);
      }
    };

    return {
      constructionModeEnabled,
      layerVisibility,
      selectedLayerId,
      layers,
      visibleLayerIds,
      activeLayerCount,
      toggleConstructionMode,
      setConstructionMode,
      toggleLayer,
      setLayerVisibility,
      setSelectedLayer,
      resetLayers,
    };
  },
);
