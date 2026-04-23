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
    };

    return {
      constructionModeEnabled,
      layerVisibility,
      layers,
      visibleLayerIds,
      activeLayerCount,
      toggleConstructionMode,
      setConstructionMode,
      toggleLayer,
      setLayerVisibility,
      resetLayers,
    };
  },
);
