import logger from '../utils/logger.js';
import { defineStore } from "pinia";
import { ref, watch } from "vue";
import { useRecintosStore } from "./recintos";
import { debounce } from "../utils/schedule.js";

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
        logger.info("Workspace cargado con éxito.");
      } catch (e) {
        logger.error("Error al cargar workspace:", e);
      }
    }
  };

  const persistWorkspace = () => {
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

  const debouncedPersistWorkspace = debounce(persistWorkspace, 400);

  const saveWorkspace = () => {
    debouncedPersistWorkspace.flush();
  };

  const queueWorkspaceSave = () => {
    debouncedPersistWorkspace();
  };

  // Limpiar workspace para nueva estimación
  const resetWorkspace = () => {
    recintosStore.recintos = [];
    recintosStore.currentFloor = 1;
    activePresetName.value = "Proyecto Sin Título";
    saveWorkspace();
  };

  // Auto-guardado: Vigilar cambios en recintos y piso
  watch(
    () => [
      recintosStore.recintos.length,
      recintosStore.currentFloor,
      recintosStore.recintos
        .map((r) =>
          `${r.id}:${r.coords?.x},${r.coords?.z},${r.dimensions?.w},${r.dimensions?.l},${r.piso}`,
        )
        .join("|"),
    ],
    () => {
      queueWorkspaceSave();
    },
  );

  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", () => {
      debouncedPersistWorkspace.flush();
    });
  }

  return {
    activePresetName,
    isSaving,
    loadWorkspace,
    saveWorkspace,
    resetWorkspace,
  };
});
