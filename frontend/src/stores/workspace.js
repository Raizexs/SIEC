import { defineStore } from "pinia";
import { ref, watch } from "vue";
import { useRecintosStore } from "./recintos";

export const useWorkspaceStore = defineStore("workspace", () => {
  const recintosStore = useRecintosStore();
  const activePresetName = ref("Proyecto Sin Título");
  const isSaving = ref(false);

  // Cargar desde LocalStorage
  const loadWorkspace = () => {
    const saved = localStorage.getItem("siec_workspace");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.recintos) recintosStore.recintos = data.recintos;
        if (data.currentFloor) recintosStore.currentFloor = data.currentFloor;
        if (data.activePresetName) activePresetName.value = data.activePresetName;
        console.log("Workspace cargado con éxito.");
      } catch (e) {
        console.error("Error al cargar workspace:", e);
      }
    }
  };

  // Guardar en LocalStorage
  const saveWorkspace = () => {
    isSaving.value = true;
    const data = {
      recintos: recintosStore.recintos,
      currentFloor: recintosStore.currentFloor,
      activePresetName: activePresetName.value,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem("siec_workspace", JSON.stringify(data));
    setTimeout(() => {
      isSaving.value = false;
    }, 500);
  };

  // Auto-guardado: Vigilar cambios en recintos y piso
  watch(
    () => [recintosStore.recintos, recintosStore.currentFloor],
    () => {
      saveWorkspace();
    },
    { deep: true }
  );

  return {
    activePresetName,
    isSaving,
    loadWorkspace,
    saveWorkspace,
  };
});
