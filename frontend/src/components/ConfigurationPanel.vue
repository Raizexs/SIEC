<script setup>
import { computed } from "vue";
import { useI18n } from "../composables/useI18n";
import {
  Trees,
  Grid2x2,
  Building,
  Hammer,
  Layers,
  AlertTriangle,
  Check,
  Lock,
  Sparkles,
} from "lucide-vue-next";

const { t } = useI18n();

const props = defineProps({
  formData: { type: Object, required: true },
  allowedMaterialIds: { type: Array, default: () => [1, 2, 3, 4] },
  /** Plan Free: no mostrar tarjetas bloqueadas (solo Madera seleccionable). */
  hideLockedMaterials: { type: Boolean, default: false },
});

const emit = defineEmits(["update:formData"]);

const TERRAIN_MIN = 2;
const TERRAIN_MAX = 50;
const TERRAIN_STEP = 0.5;

const updateFormData = (field, value) => {
  let next = value;

  if (field === "terrenoAncho" || field === "terrenoLargo") {
    const n = Number(value);
    const clamped = Number.isFinite(n) ? n : TERRAIN_MIN;
    next = Math.min(
      TERRAIN_MAX,
      Math.max(TERRAIN_MIN, Math.round(clamped / TERRAIN_STEP) * TERRAIN_STEP),
    );
  }

  emit("update:formData", { [field]: next });
};

const terrainWidth = computed(() =>
  Math.min(TERRAIN_MAX, Math.max(TERRAIN_MIN, Number(props.formData.terrenoAncho) || TERRAIN_MIN)),
);
const terrainLength = computed(() =>
  Math.min(TERRAIN_MAX, Math.max(TERRAIN_MIN, Number(props.formData.terrenoLargo) || TERRAIN_MIN)),
);
const terrainArea = computed(() => terrainWidth.value * terrainLength.value);

const widthSliderProgress = computed(() =>
  ((terrainWidth.value - TERRAIN_MIN) / (TERRAIN_MAX - TERRAIN_MIN)) * 100,
);
const lengthSliderProgress = computed(() =>
  ((terrainLength.value - TERRAIN_MIN) / (TERRAIN_MAX - TERRAIN_MIN)) * 100,
);

const previewAspect = computed(() => {
  const max = Math.max(terrainWidth.value, terrainLength.value, 1);
  return {
    widthPct: (terrainWidth.value / max) * 100,
    heightPct: (terrainLength.value / max) * 100,
  };
});

const materials = computed(() => [
  { id: 1, label: t("woodFrame"), icon: Trees, hint: t("materialWoodHint") },
  {
    id: 2,
    label: t("steelFramed"),
    icon: Grid2x2,
    hint: t("materialSteelHint"),
  },
  { id: 3, label: t("masonry"), icon: Hammer, hint: t("materialMasonryHint") },
  {
    id: 4,
    label: t("concrete"),
    icon: Building,
    hint: t("materialConcreteHint"),
  },
  {
    id: 5,
    label: t("hybridFrame"),
    icon: Layers,
    hint: t("materialHybridHint"),
  },
]);

const isMaterialAllowed = (id) => props.allowedMaterialIds.includes(Number(id));

const selectableMaterials = computed(() =>
  materials.value.filter((m) => isMaterialAllowed(m.id)),
);

const lockedMaterials = computed(() =>
  materials.value.filter((m) => !isMaterialAllowed(m.id)),
);

const selectMaterial = (id) => {
  if (!isMaterialAllowed(id)) return;
  updateFormData("materialEstructuralId", id);
};

const goUpgrade = () => {
  window.location.href = "/settings?tab=billing";
};

</script>

<template>
  <section class="configure-panel grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start lg:gap-5">
    <!-- Geometría y medidas -->
    <article
      class="configure-card lg:col-span-5"
    >
      <header class="configure-card__header">
        <div>
          <h3 class="configure-card__title">
            {{ t("terrainMeasures") }}
          </h3>
          <p class="configure-card__subtitle">
            {{ t("terrainMeasuresHint") }}
          </p>
        </div>
      </header>

      <div class="configure-card__body space-y-5">
        <div class="space-y-2">
          <div class="flex items-center justify-between gap-2">
            <label class="configure-label mb-0">
              {{ t("widthM") }}
            </label>
            <span class="configure-slider-value">{{ terrainWidth.toFixed(1) }} m</span>
          </div>
          <input
            type="range"
            class="configure-range w-full"
            :min="TERRAIN_MIN"
            :max="TERRAIN_MAX"
            :step="TERRAIN_STEP"
            :value="terrainWidth"
            :style="{ '--range-progress': `${widthSliderProgress}%` }"
            @input="updateFormData('terrenoAncho', $event.target.value)"
          />
          <div class="configure-range-ticks">
            <span>{{ TERRAIN_MIN }} m</span>
            <span>{{ TERRAIN_MAX }} m</span>
          </div>
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between gap-2">
            <label class="configure-label mb-0">
              {{ t("lengthM") }}
            </label>
            <span class="configure-slider-value">{{ terrainLength.toFixed(1) }} m</span>
          </div>
          <input
            type="range"
            class="configure-range w-full"
            :min="TERRAIN_MIN"
            :max="TERRAIN_MAX"
            :step="TERRAIN_STEP"
            :value="terrainLength"
            :style="{ '--range-progress': `${lengthSliderProgress}%` }"
            @input="updateFormData('terrenoLargo', $event.target.value)"
          />
          <div class="configure-range-ticks">
            <span>{{ TERRAIN_MIN }} m</span>
            <span>{{ TERRAIN_MAX }} m</span>
          </div>
        </div>

        <div class="configure-summary">
          <div
            class="configure-preview"
            aria-hidden="true"
          >
            <div
              class="configure-preview__plot"
              :style="{
                width: `${previewAspect.widthPct}%`,
                height: `${previewAspect.heightPct}%`,
              }"
            />
          </div>

          <div class="min-w-0 flex-1">
            <p class="configure-summary__label">
              {{ t("terrainTotalArea") }}
            </p>
            <p class="configure-summary__value">
              {{ terrainArea.toFixed(1) }}
              <span class="configure-summary__unit">m²</span>
            </p>
            <p class="configure-summary__meta">
              {{ t("terrainDimensionsSummary", { w: terrainWidth.toFixed(1), l: terrainLength.toFixed(1) }) }}
            </p>
          </div>
        </div>
      </div>
    </article>

    <!-- Matriz de material estructural -->
    <article
      class="configure-card lg:col-span-7"
    >
      <header class="configure-card__header">
        <div>
          <h3 class="configure-card__title">
            {{ t("structuralMaterial") }}
          </h3>
          <p class="configure-card__subtitle">
            {{ t("structuralMaterialSelectHint") }}
          </p>
        </div>
      </header>

      <div class="configure-card__body">
        <div
          class="grid gap-2.5"
          :class="
            selectableMaterials.length === 1
              ? 'grid-cols-1'
              : 'grid-cols-1 sm:grid-cols-2'
          "
        >
          <button
            v-for="m in selectableMaterials"
            :key="m.id"
            type="button"
            class="configure-material"
            :class="
              formData.materialEstructuralId === m.id
                ? 'configure-material--active'
                : ''
            "
            @click="selectMaterial(m.id)"
          >
            <div class="flex items-start justify-between gap-2">
              <div
                class="configure-material__icon"
                :class="
                  formData.materialEstructuralId === m.id
                    ? 'configure-material__icon--active'
                    : ''
                "
              >
                <component :is="m.icon" class="h-4 w-4" :stroke-width="1.9" />
              </div>

              <div
                v-if="formData.materialEstructuralId === m.id"
                class="configure-material__check"
              >
                <Check class="h-3 w-3" :stroke-width="3" />
              </div>
            </div>

            <div class="mt-2.5">
              <p
                class="configure-material__label"
                :class="
                  formData.materialEstructuralId === m.id
                    ? 'text-orange-900 dark:text-orange-100'
                    : 'text-slate-950 dark:text-slate-100'
                "
              >
                {{ m.label }}
              </p>
              <p class="configure-material__hint">
                {{ m.hint }}
              </p>
            </div>
          </button>
        </div>

        <div
          v-if="hideLockedMaterials && lockedMaterials.length > 0"
          class="configure-upgrade mt-3"
        >
          <div class="flex items-start gap-2.5">
            <div class="configure-upgrade__icon">
              <Lock class="h-3.5 w-3.5" :stroke-width="2.2" />
            </div>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {{ t("planMaterialFreeOnlyTitle") }}
              </p>
              <p class="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {{ t("planMaterialFreeOnlyHint") }}
              </p>
            </div>
          </div>
          <button
            type="button"
            class="configure-upgrade__cta"
            @click="goUpgrade"
          >
            <Sparkles class="h-3.5 w-3.5" :stroke-width="2.2" />
            {{ t("planUpgradeCta") }}
          </button>
        </div>

        <div
          v-else-if="lockedMaterials.length > 0"
          class="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2"
        >
          <div
            v-for="m in lockedMaterials"
            :key="`locked-${m.id}`"
            class="configure-material configure-material--locked"
            aria-disabled="true"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="configure-material__icon">
                <component :is="m.icon" class="h-4 w-4" :stroke-width="1.9" />
              </div>
              <Lock class="h-3.5 w-3.5 text-slate-400" :stroke-width="2.2" />
            </div>
            <p class="mt-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300">
              {{ m.label }}
            </p>
            <p class="mt-0.5 text-[11px] font-medium text-slate-400">
              {{ t("planMaterialLocked") }}
            </p>
          </div>
        </div>

        <p
          v-if="formData.materialEstructuralId === 4 && isMaterialAllowed(4)"
          class="configure-logistics-note mt-3"
        >
          <AlertTriangle class="h-3.5 w-3.5 shrink-0" :stroke-width="2.4" />
          {{ t("heavyLogisticsBadge") }}
        </p>
      </div>
    </article>
  </section>
</template>

<style scoped>
.configure-panel {
  animation: configure-fade-in 0.35s ease-out;
}

@keyframes configure-fade-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.configure-card {
  overflow: hidden;
  border-radius: 1.25rem;
  border: 1px solid rgb(226 232 240 / 0.9);
  background: rgb(255 255 255 / 0.88);
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
  backdrop-filter: blur(12px);
}

.dark .configure-card {
  border-color: rgb(30 41 59 / 0.9);
  background: rgb(2 6 23 / 0.82);
}

.configure-card__header {
  border-bottom: 1px solid rgb(226 232 240 / 0.8);
  padding: 1rem 1.15rem 0.9rem;
}

.dark .configure-card__header {
  border-bottom-color: rgb(30 41 59 / 0.85);
}

.configure-card__title {
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: rgb(15 23 42);
}

.dark .configure-card__title {
  color: rgb(248 250 252);
}

.configure-card__subtitle {
  margin-top: 0.2rem;
  font-size: 0.78rem;
  font-weight: 500;
  line-height: 1.45;
  color: rgb(100 116 139);
}

.dark .configure-card__subtitle {
  color: rgb(148 163 184);
}

.configure-card__body {
  padding: 1rem 1.15rem 1.15rem;
}

.configure-label {
  display: block;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: rgb(71 85 105);
}

.dark .configure-label {
  color: rgb(203 213 225);
}

.configure-input {
  height: 3rem;
  width: 100%;
  border-radius: 0.85rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(255 255 255);
  padding-inline: 0.85rem;
  text-align: center;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 1.35rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: rgb(15 23 42);
  outline: none;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.configure-slider-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.95rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: rgb(234 88 12);
}

.dark .configure-slider-value {
  color: rgb(251 146 60);
}

.configure-range {
  -webkit-appearance: none;
  appearance: none;
  height: 0.45rem;
  border-radius: 9999px;
  background: linear-gradient(
    to right,
    rgb(249 115 22) 0%,
    rgb(249 115 22) var(--range-progress, 0%),
    rgb(226 232 240) var(--range-progress, 0%),
    rgb(226 232 240) 100%
  );
  outline: none;
  cursor: pointer;
}

.dark .configure-range {
  background: linear-gradient(
    to right,
    rgb(249 115 22) 0%,
    rgb(249 115 22) var(--range-progress, 0%),
    rgb(30 41 59) var(--range-progress, 0%),
    rgb(30 41 59) 100%
  );
}

.configure-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  height: 1.15rem;
  width: 1.15rem;
  border-radius: 9999px;
  border: 2px solid rgb(255 255 255);
  background: rgb(249 115 22);
  box-shadow: 0 2px 8px rgb(249 115 22 / 0.35);
  cursor: grab;
}

.configure-range::-moz-range-thumb {
  height: 1.15rem;
  width: 1.15rem;
  border-radius: 9999px;
  border: 2px solid rgb(255 255 255);
  background: rgb(249 115 22);
  box-shadow: 0 2px 8px rgb(249 115 22 / 0.35);
  cursor: grab;
}

.configure-range-ticks {
  display: flex;
  justify-content: space-between;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: rgb(148 163 184);
}

.dark .configure-range-ticks {
  color: rgb(100 116 139);
}

.configure-input:focus {
  border-color: rgb(251 146 60);
  box-shadow: 0 0 0 4px rgb(249 115 22 / 0.1);
}

.dark .configure-input {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
  color: rgb(248 250 252);
}

.dark .configure-input:focus {
  border-color: rgb(249 115 22);
  box-shadow: 0 0 0 4px rgb(249 115 22 / 0.14);
}

.configure-summary {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  border-radius: 0.95rem;
  border: 1px solid rgb(226 232 240 / 0.9);
  background: rgb(248 250 252 / 0.85);
  padding: 0.75rem 0.85rem;
}

.dark .configure-summary {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42 / 0.55);
}

.configure-preview {
  display: flex;
  height: 3.25rem;
  width: 3.25rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  border: 1px dashed rgb(251 146 60 / 0.45);
  background: rgb(255 247 237 / 0.65);
}

.dark .configure-preview {
  border-color: rgb(154 52 18 / 0.55);
  background: rgb(67 20 7 / 0.25);
}

.configure-preview__plot {
  border-radius: 0.35rem;
  border: 1.5px solid rgb(249 115 22);
  background: rgb(249 115 22 / 0.18);
  min-width: 28%;
  min-height: 28%;
}

.configure-summary__label {
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(100 116 139);
}

.dark .configure-summary__label {
  color: rgb(148 163 184);
}

.configure-summary__value {
  margin-top: 0.1rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 1.45rem;
  font-weight: 900;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  color: rgb(15 23 42);
}

.dark .configure-summary__value {
  color: rgb(248 250 252);
}

.configure-summary__unit {
  margin-left: 0.15rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: rgb(148 163 184);
}

.configure-summary__meta {
  margin-top: 0.25rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: rgb(100 116 139);
}

.dark .configure-summary__meta {
  color: rgb(148 163 184);
}

.configure-material {
  border-radius: 0.95rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(255 255 255);
  padding: 0.75rem 0.85rem;
  text-align: left;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
}

.configure-material:not(.configure-material--locked):hover {
  border-color: rgb(203 213 225);
  box-shadow: 0 6px 18px rgb(15 23 42 / 0.05);
  transform: translateY(-1px);
}

.configure-material--active {
  border-color: rgb(253 186 116);
  background: rgb(255 247 237 / 0.85);
  box-shadow: 0 8px 20px rgb(249 115 22 / 0.08);
}

.dark .configure-material {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42 / 0.72);
}

.dark .configure-material:not(.configure-material--locked):hover {
  border-color: rgb(51 65 85);
  box-shadow: 0 8px 20px rgb(0 0 0 / 0.22);
}

.dark .configure-material--active {
  border-color: rgb(154 52 18 / 0.75);
  background: rgb(67 20 7 / 0.28);
}

.configure-material--locked {
  border-style: dashed;
  opacity: 0.82;
}

.configure-material__icon {
  display: flex;
  height: 2rem;
  width: 2rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.65rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  color: rgb(100 116 139);
}

.configure-material__icon--active {
  border-color: rgb(254 215 170);
  background: rgb(255 255 255);
  color: rgb(234 88 12);
}

.dark .configure-material__icon {
  border-color: rgb(30 41 59);
  background: rgb(2 6 23);
  color: rgb(148 163 184);
}

.dark .configure-material__icon--active {
  border-color: rgb(154 52 18 / 0.7);
  background: rgb(67 20 7 / 0.45);
  color: rgb(253 186 116);
}

.configure-material__check {
  display: flex;
  height: 1.35rem;
  width: 1.35rem;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: rgb(249 115 22);
  color: white;
}

.dark .configure-material__check {
  background: rgb(251 146 60);
  color: rgb(67 20 7);
}

.configure-material__label {
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.configure-material__hint {
  margin-top: 0.15rem;
  font-size: 0.68rem;
  font-weight: 500;
  line-height: 1.4;
  color: rgb(100 116 139);
}

.dark .configure-material__hint {
  color: rgb(148 163 184);
}

.configure-upgrade {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border-radius: 0.95rem;
  border: 1px dashed rgb(203 213 225);
  background: rgb(248 250 252 / 0.75);
  padding: 0.75rem 0.85rem;
}

.dark .configure-upgrade {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42 / 0.45);
}

@media (min-width: 640px) {
  .configure-upgrade {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.configure-upgrade__icon {
  display: flex;
  height: 2rem;
  width: 2rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.65rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(255 255 255);
  color: rgb(100 116 139);
}

.dark .configure-upgrade__icon {
  border-color: rgb(51 65 85);
  background: rgb(2 6 23);
}

.configure-upgrade__cta {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border-radius: 0.75rem;
  background: rgb(249 115 22);
  padding: 0.45rem 0.85rem;
  font-size: 0.68rem;
  font-weight: 800;
  color: white;
  transition: background-color 0.18s ease;
}

.configure-upgrade__cta:hover {
  background: rgb(234 88 12);
}

.configure-logistics-note {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border-radius: 9999px;
  border: 1px solid rgb(254 215 170);
  background: rgb(255 247 237);
  padding: 0.35rem 0.65rem;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(194 65 12);
}

.dark .configure-logistics-note {
  border-color: rgb(154 52 18 / 0.65);
  background: rgb(67 20 7 / 0.35);
  color: rgb(253 186 116);
}
</style>
