<script setup>
import { ref } from 'vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    required: true
  }
})

const emit = defineEmits(['update:modelValue'])

const materials = [
  { id: 1, name: 'Madera' },
  { id: 2, name: 'Metalcom' },
  { id: 3, name: 'Albañilería' },
  { id: 4, name: 'Hormigón Armado' }
]

const handleChange = (event) => {
  emit('update:modelValue', event.target.value)
}
</script>

<template>
  <div class="material-selector">
    <label for="material-select" class="selector-label">Material Estructural Base</label>
    <div class="select-wrapper">
      <select 
        id="material-select"
        :value="modelValue"
        @change="handleChange"
        class="custom-select"
        required
      >
        <option v-for="material in materials" :key="material.id" :value="material.id">
          {{ material.name }}
        </option>
      </select>
      <div class="select-arrow"></div>
    </div>
  </div>
</template>

<style scoped>
.material-selector {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
}

.selector-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #64748b;
}

.select-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.custom-select {
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  color: #1e293b;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  appearance: none;
  cursor: pointer;
  transition: all 0.2s;
}

.custom-select:hover {
  border-color: #cbd5e1;
  background-color: #ffffff;
}

.custom-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
  background-color: #ffffff;
}

.select-arrow {
  position: absolute;
  right: 1.25rem;
  width: 10px;
  height: 6px;
  background-color: #64748b;
  clip-path: polygon(100% 0%, 0 0%, 50% 100%);
  pointer-events: none;
}
</style>
