<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: [String, Number],
    required: true,
  },
});

const emit = defineEmits(['update:modelValue']);

const materials = [
  {
    id: 1,
    name: 'Wood Frame Structure',
    label: 'Madera',
  },
  {
    id: 2,
    name: 'Structural Steel Framed',
    label: 'Acero estructural',
  },
  {
    id: 3,
    name: 'Load-Bearing Masonry',
    label: 'Albañilería',
  },
  {
    id: 4,
    name: 'Reinforced Concrete (Grade 40)',
    label: 'Hormigón armado',
  },
];

const selectedMaterial = computed(() =>
  materials.find((material) => material.id === Number(props.modelValue)),
);

const handleChange = (event) => {
  emit('update:modelValue', Number(event.target.value));
};
</script>

<template>
  <div class="space-y-2">
    <label
      class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"
    >
      <span
        class="flex h-6 w-6 items-center justify-center rounded-lg border border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
      >
        <span class="material-symbols-outlined text-[15px]">
          foundation
        </span>
      </span>
      Material estructural
    </label>

    <div class="relative">
      <div
        class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 dark:text-slate-500"
      >
        <span class="material-symbols-outlined text-[20px]">
          construction
        </span>
      </div>

      <select
        :value="modelValue"
        required
        class="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-white pl-11 pr-12 text-sm font-bold text-slate-950 shadow-sm outline-none transition-all duration-200 hover:border-slate-300 focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-700 dark:focus:border-orange-500 dark:focus:ring-orange-500/15"
        @change="handleChange"
      >
        <option
          v-for="material in materials"
          :key="material.id"
          :value="material.id"
        >
          {{ material.name }}
        </option>
      </select>

      <div
        class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 dark:text-slate-500"
      >
        <span class="material-symbols-outlined text-[21px]">
          unfold_more
        </span>
      </div>
    </div>

    <p
      v-if="selectedMaterial"
      class="text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400"
    >
      Seleccionado:
      <span class="font-bold text-slate-700 dark:text-slate-200">
        {{ selectedMaterial.label }}
      </span>
    </p>
  </div>
</template>