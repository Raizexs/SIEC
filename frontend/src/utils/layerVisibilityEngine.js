export const createLayerVisibilityState = (
  constructionModeEnabled,
  layerVisibility,
) => {
  const activeLayerIds = new Set();

  Object.entries(layerVisibility || {}).forEach(([layerId, isVisible]) => {
    if (isVisible) activeLayerIds.add(layerId);
  });

  return {
    constructionModeEnabled: Boolean(constructionModeEnabled),
    activeLayerIds,
  };
};

export const isLayerMeshVisible = (layerTags, layerState) => {
  if (!layerState?.constructionModeEnabled) return true;

  if (!Array.isArray(layerTags) || layerTags.length === 0) {
    return true;
  }

  return layerTags.some((layerId) => layerState.activeLayerIds.has(layerId));
};
