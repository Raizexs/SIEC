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
    icon: 'forest',
    label: 'Madera',
    description: 'Wood frame',
    experimental: false,
  },
  {
    id: 2,
    icon: 'view_column',
    label: 'Metalcon',
    description: 'Steel framed',
    experimental: false,
  },
  {
    id: 3,
    icon: 'layers',
    label: 'Albañilería',
    description: 'Mampostería',
    experimental: true,
  },
  {
    id: 4,
    icon: 'foundation',
    label: 'H. Armado',
    description: 'Concreto',
    experimental: true,
  },
];

const isSelected = (id) => Number(props.modelValue) === id;
</script>

<template>
  <div class="space-y-2">
    <label
      class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"
    >
      <span
        class="flex h-6 w-6 items-center justify-center rounded-lg border border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
      >
        <span class="material-symbols-outlined text-[15px]">foundation</span>
      </span>
      Material estructural
    </label>

    <div class="grid grid-cols-2 gap-2">
      <button
        v-for="mat in materials"
        :key="mat.id"
        type="button"
        class="relative flex flex-col items-start gap-1 rounded-2xl border px-3 py-2.5 text-left transition-all duration-200 active:scale-[0.98]"
        :class="isSelected(mat.id)
          ? 'border-orange-300 bg-orange-50 shadow-sm shadow-orange-500/10 dark:border-orange-800/70 dark:bg-orange-950/30'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-800/60'"
        @click="emit('update:modelValue', mat.id)"
      >
        <!-- Experimental badge -->
        <span
          v-if="mat.experimental"
          class="absolute right-2 top-2 flex items-center gap-0.5 rounded-full border border-amber-300/60 bg-amber-50 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-600 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-400"
          title="Funcionalidad experimental — puede presentar diferencias visuales"
        >
          <span class="material-symbols-outlined text-[10px]">science</span>
          Beta
        </span>

        <div class="flex items-center gap-2">
          <span
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-[16px]"
            :class="isSelected(mat.id)
              ? 'text-orange-600 dark:text-orange-400'
              : 'text-slate-400 dark:text-slate-500'"
          >
            <span class="material-symbols-outlined text-[17px]">{{ mat.icon }}</span>
          </span>
          <div class="min-w-0">
            <p
              class="text-[11px] font-black leading-tight"
              :class="isSelected(mat.id)
                ? 'text-orange-700 dark:text-orange-300'
                : 'text-slate-700 dark:text-slate-200'"
            >
              {{ mat.label }}
            </p>
            <p class="text-[9px] font-medium text-slate-400 dark:text-slate-500">
              {{ mat.description }}
            </p>
          </div>
        </div>
      </button>
    </div>
  </div>
</template>