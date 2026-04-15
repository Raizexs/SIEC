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

const fetchBudget = async () => {
  isLoading.value = true;
  error.value = null;
  desglose.value = [];
  costoTotal.value = null;
  fechaPrecios.value = null;

  try {
    // 1. Crear Simulación en la base de datos local
    const simRes = await fetch('http://localhost:8000/api/simulacion/parametros', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        m2Totales: props.m2Totales,
        materialEstructuralId: props.materialEstructuralId,
        habitaciones: 0,
        banios: 0,
        areasComunes: 0
      })
    });
    
    if (!simRes.ok) throw new Error("Error al inicializar la simulación base");
    const simData = await simRes.json();
    const simId = simData.idSimulacion;

    // 2. Calcular Insumos via Promediador Scrum-65
    // El api expuesto en el PR anterior
    const calcRes = await fetch(`http://localhost:8000/api/simulacion/${simId}/calcular-insumos`, {
      method: 'POST'
    });
    
    if (!calcRes.ok) throw new Error("Error al calcular insumos en el motor matemático");
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
  fetchBudget();
}, { immediate: true });
</script>

<template>
  <div class="bg-surface dark:bg-[#151c27] border border-outline/20 p-6 rounded-2xl shadow-xl space-y-6">
    <h2 class="text-xl font-bold flex items-center gap-2">
      <span class="material-symbols-outlined text-primary">request_quote</span>
      Presupuesto Desglosado de Insumos
    </h2>
    
    <div v-if="isLoading" class="flex justify-center p-12">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
    </div>
    
    <div v-else-if="error" class="p-6 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg flex items-center gap-3">
      <span class="material-symbols-outlined">error</span>
      {{ error }}
    </div>
    
    <div v-else>
      <!-- Highlight Costo Total -->
      <div class="bg-gradient-to-br from-primary to-primary-container text-white p-6 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 shadow-lg shadow-primary/20">
        <div>
          <p class="text-sm opacity-80 uppercase tracking-widest font-bold mb-1">Costo Total Estimado</p>
          <div class="text-4xl md:text-5xl font-black tracking-tight" :class="costoTotal == null ? 'text-2xl font-semibold opacity-90' : ''">
            {{ formatCurrency(costoTotal) }}
          </div>
        </div>
        <div v-if="fechaPrecios" class="text-xs bg-white/20 px-3 py-1.5 rounded-full font-medium inline-flex items-center gap-1.5 backdrop-blur-md border border-white/10">
          <span class="material-symbols-outlined text-[14px]">update</span>
          Precios de mercado al: {{ formatDate(fechaPrecios) }}
        </div>
      </div>

      <!-- Tabla Categorias -->
      <div class="space-y-8">
        <div v-for="cat in desglose" :key="cat.categoria" class="border border-outline/20 rounded-xl overflow-hidden shadow-sm">
          <div class="bg-surface-variant dark:bg-[#1a2130] p-4 flex justify-between items-center font-bold border-b border-outline/10">
            <span class="text-lg flex items-center gap-2">
              <span class="material-symbols-outlined text-primary text-base">category</span>
              {{ cat.categoria }}
            </span>
            <span class="text-primary text-lg">{{ formatCurrencyCell(cat.subtotal_categoria) }}</span>
          </div>
          
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-surface-container dark:bg-[#131822] text-on-surface-variant text-left text-xs uppercase tracking-wider">
                <tr>
                  <th class="p-4 font-semibold w-1/3">Insumo</th>
                  <th class="p-4 font-semibold text-right">Cantidad</th>
                  <th class="p-4 font-semibold">Unidad</th>
                  <th class="p-4 font-semibold text-right">Valor Unit.</th>
                  <th class="p-4 font-semibold text-right w-1/4">Subtotal</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline/10">
                <tr v-for="item in cat.items" :key="item.insumo" class="hover:bg-surface-variant/30 transition-colors">
                  <td class="p-4 font-medium">{{ item.insumo }}</td>
                  <td class="p-4 text-right font-mono">{{ item.cantidad.toLocaleString('es-CL', {maximumFractionDigits: 2}) }}</td>
                  <td class="p-4 text-on-surface-variant opacity-70">{{ item.unidad }}</td>
                  <td class="p-4 text-right tabular-nums">{{ formatCurrencyCell(item.precio_unitario) }}</td>
                  <td class="p-4 text-right font-bold text-primary tabular-nums">{{ formatCurrencyCell(item.subtotal) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <div v-if="desglose.length === 0" class="text-center py-10 opacity-60 flex flex-col items-center gap-2">
          <span class="material-symbols-outlined text-4xl">inventory_2</span>
          <p>No se encontraron insumos para este material estructural.</p>
        </div>
      </div>
    </div>
  </div>
</template>
