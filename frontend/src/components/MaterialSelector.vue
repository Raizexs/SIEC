<script setup>
const props = defineProps({
  modelValue: {
    type: [String, Number],
    required: true,
  },
});

const emit = defineEmits(["update:modelValue"]);

const materials = [
  { id: 1, name: "Wood Frame Structure" },
  { id: 2, name: "Structural Steel Framed" },
  { id: 3, name: "Load-Bearing Masonry" },
  { id: 4, name: "Reinforced Concrete (Grade 40)" },
];

const handleChange = (event) => {
  emit("update:modelValue", Number(event.target.value));
};
</script>

<template>
  <div class="relative">
    <select
      :value="modelValue"
      @change="handleChange"
      class="w-full bg-surface-container-highest p-4 rounded-xl border-none text-primary font-manrope font-semibold appearance-none focus:ring-2 focus:ring-primary/20"
      required
    >
      <option
        v-for="material in materials"
        :key="material.id"
        :value="material.id"
      >
        {{ material.name }}
      </option>
    </select>
    <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
      <span class="material-symbols-outlined text-slate-400">unfold_more</span>
    </div>
  </div>
</template>
