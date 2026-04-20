<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  m2Totales: { type: Number, required: true },
  materialEstructuralId: { type: Number, required: true }
});

const isLoading = ref(false);
const error = ref(null);
const desglose = ref([]);
const costoTotal = ref(null);
const fechaPrecios = ref(null);

const formatCurrency = (value) => {
  if (value == null) return "Precios de mercado no disponibles aún";
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
};

const formatCurrencyCell = (value) => {
  if (value == null) return "N/D";
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
};

const formatDate = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

let debounceTimer = null;

const fetchBudget = async () => {
  if (props.m2Totales <= 0) {
    desglose.value = [];
    costoTotal.value = null;
    fechaPrecios.value = null;
    return;
  }

  isLoading.value = true;
  error.value = null;

  try {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    // 1. Crear simulación temporal
    const simRes = await fetch(`${baseUrl}/api/simulacion/parametros`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        m2Totales: Math.round(props.m2Totales),
        materialEstructuralId: props.materialEstructuralId,
        habitaciones: 0, banios: 0, areasComunes: 0
      })
    });
    if (!simRes.ok) throw new Error("Error al crear simulación");
    const simData = await simRes.json();

    // 2. Calcular insumos
    const calcRes = await fetch(`${baseUrl}/api/simulacion/${simData.idSimulacion}/calcular-insumos`, {
      method: 'POST'
    });
    if (!calcRes.ok) throw new Error("Error al calcular insumos");
    const data = await calcRes.json();

    desglose.value = data.desglose || [];
    costoTotal.value = data.costo_total;
    fechaPrecios.value = data.fecha_precios;
  } catch (err) {
    error.value = err.message;
  } finally {
    isLoading.value = false;
  }
};

watch(() => [props.m2Totales, props.materialEstructuralId], () => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fetchBudget, 600);
}, { immediate: true });
</script>

<template>
  <div class="bg-surface dark:bg-[#151c27] border border-outline/20 p-6 rounded-2xl shadow-xl space-y-6">
    <h2 class="text-xl font-bold flex items-center gap-2">
      <span class="material-symbols-outlined text-primary">request_quote</span>
      Presupuesto Estimado
      <span class="text-sm font-normal text-slate-400 ml-auto">{{ Math.round(m2Totales) }} m² seleccionados</span>
    </h2>

    <div v-if="isLoading" class="flex justify-center p-10">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>

    <div v-else-if="error" class="p-4 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg flex items-center gap-3 text-sm">
      <span class="material-symbols-outlined">error</span>
      {{ error }}
    </div>

    <div v-else>
      <!-- Costo Total Card -->
      <div class="bg-gradient-to-br from-primary to-primary-container text-white p-5 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-3 shadow-lg shadow-primary/20">
        <div>
          <p class="text-xs opacity-80 uppercase tracking-widest font-bold mb-1">Costo Total Estimado</p>
          <div class="text-3xl md:text-4xl font-black tracking-tight" :class="costoTotal == null ? 'text-xl font-semibold opacity-90' : ''">
            {{ formatCurrency(costoTotal) }}
          </div>
        </div>
        <div v-if="fechaPrecios" class="text-[10px] bg-white/20 px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1 backdrop-blur-md border border-white/10">
          <span class="material-symbols-outlined text-[12px]">update</span>
          Precios al: {{ formatDate(fechaPrecios) }}
        </div>
      </div>

      <!-- Tabla por Categorías -->
      <div class="space-y-4">
        <div v-for="cat in desglose" :key="cat.categoria" class="border border-outline/20 rounded-xl overflow-hidden">
          <div class="bg-surface-variant dark:bg-[#1a2130] px-4 py-3 flex justify-between items-center font-bold border-b border-outline/10">
            <span class="flex items-center gap-2 text-sm">
              <span class="material-symbols-outlined text-primary text-sm">category</span>
              {{ cat.categoria }}
            </span>
            <span class="text-primary text-sm">{{ formatCurrencyCell(cat.subtotal_categoria) }}</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead class="bg-surface-container dark:bg-[#131822] text-on-surface-variant text-left uppercase tracking-wider">
                <tr>
                  <th class="px-4 py-2 font-semibold">Insumo</th>
                  <th class="px-4 py-2 font-semibold text-right">Cant.</th>
                  <th class="px-4 py-2 font-semibold">Unidad</th>
                  <th class="px-4 py-2 font-semibold text-right">Precio Unit.</th>
                  <th class="px-4 py-2 font-semibold text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline/10">
                <tr v-for="item in cat.items" :key="item.insumo" class="hover:bg-surface-variant/30 transition-colors">
                  <td class="px-4 py-2 font-medium">{{ item.insumo }}</td>
                  <td class="px-4 py-2 text-right font-mono">{{ item.cantidad.toLocaleString('es-CL', {maximumFractionDigits: 2}) }}</td>
                  <td class="px-4 py-2 text-on-surface-variant opacity-70">{{ item.unidad }}</td>
                  <td class="px-4 py-2 text-right tabular-nums">{{ formatCurrencyCell(item.precio_unitario) }}</td>
                  <td class="px-4 py-2 text-right font-bold text-primary tabular-nums">{{ formatCurrencyCell(item.subtotal) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="desglose.length === 0" class="text-center py-8 opacity-60 flex flex-col items-center gap-2">
          <span class="material-symbols-outlined text-3xl">inventory_2</span>
          <p class="text-sm">No se encontraron insumos para este material.</p>
        </div>
      </div>
    </div>
  </div>
</template>
