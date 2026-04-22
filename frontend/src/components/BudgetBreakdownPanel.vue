<script setup>
import { ref, watch } from 'vue';
import { useI18n } from '../composables/useI18n';

const { t } = useI18n();

const props = defineProps({
  m2Totales: { type: Number, required: true },
  materialEstructuralId: { type: Number, required: true }
});

const isLoading = ref(false);
const error = ref(null);
const desglose = ref([]);
const costoTotal = ref(null);
const fechaPrecios = ref(null);
const hasGenerated = ref(false);

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

const handleGenerateBudget = () => {
  hasGenerated.value = true;
  fetchBudget();
};

const fetchBudget = async () => {
  if (!hasGenerated.value) return; // Prevent automatic loading unless triggered

  if (props.m2Totales <= 0) {
    desglose.value = [];
    costoTotal.value = null;
    fechaPrecios.value = null;
    return;
  }

  isLoading.value = true;
  error.value = null;

  try {
    const baseUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000' : '');

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
  hasGenerated.value = false; // Reset when params change
}, { immediate: true });
</script>

<template>
  <div class="bg-surface/80 dark:bg-[#151c27]/80 backdrop-blur-xl border border-outline/20 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
    <!-- Premium background glow -->
    <div class="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-[100px] pointer-events-none"></div>

    <h2 class="text-2xl font-black flex items-center gap-3 mb-8 relative z-10">
      <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
        <span class="material-symbols-outlined text-primary">request_quote</span>
      </div>
      Presupuesto Detallado
      <span class="text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 px-3 py-1 rounded-full ml-auto shadow-inner">{{ Math.round(m2Totales) }} m² calculados</span>
    </h2>

    <div v-if="!hasGenerated" class="flex flex-col items-center justify-center py-12 text-center relative z-10">
      <div class="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mb-6">
        <span class="material-symbols-outlined text-4xl text-primary/50">calculate</span>
      </div>
      <h3 class="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Presupuesto inactivo</h3>
      <p class="text-slate-500 text-sm max-w-md mb-8">Calcula el presupuesto exacto basado en la selección de recintos actuales y el material estructural de tu proyecto.</p>
      
      <button 
        @click="handleGenerateBudget"
        class="bg-gradient-to-r from-primary to-primary-container text-white px-8 py-4 rounded-xl font-bold tracking-wide shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] transition-all"
      >
        {{ t('generateBudget') }}
      </button>
    </div>

    <div v-else class="relative z-10">
      <div v-if="isLoading" class="flex flex-col items-center justify-center py-16">
        <div class="animate-spin rounded-full h-12 w-12 border-b-4 border-primary mb-4"></div>
        <p class="text-sm text-slate-500 font-semibold animate-pulse">Analizando insumos y materiales...</p>
      </div>

      <div v-else-if="error" class="p-6 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl flex items-center gap-4 text-sm font-semibold">
        <span class="material-symbols-outlined text-2xl">error</span>
        {{ error }}
      </div>

      <div v-else class="space-y-8">
        <!-- Costo Total Card (Premium) -->
        <div class="relative overflow-hidden bg-gradient-to-br from-slate-900 via-[#1a2333] to-[#121824] text-white p-8 rounded-3xl shadow-xl border border-white/5">
          <div class="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3"></div>
          
          <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-10">
            <div>
              <p class="text-xs uppercase tracking-[0.2em] font-bold text-primary-container mb-2">Costo Total Estimado</p>
              <div class="text-4xl md:text-5xl font-black tracking-tight" :class="costoTotal == null ? 'text-2xl font-semibold opacity-90' : ''">
                {{ formatCurrency(costoTotal) }}
              </div>
            </div>
            <div v-if="fechaPrecios" class="text-xs bg-white/10 px-4 py-2 rounded-full font-semibold inline-flex items-center gap-2 backdrop-blur-md border border-white/10">
              <span class="material-symbols-outlined text-[14px]">update</span>
              Actualizado: {{ formatDate(fechaPrecios) }}
            </div>
          </div>
        </div>

        <!-- Tabla por Categorías con Cards Expandibles (Glassmorphism) -->
        <div class="space-y-4">
          <transition-group name="list" tag="div" class="space-y-4">
            <div v-for="cat in desglose" :key="cat.categoria" class="bg-white/50 dark:bg-[#1a2130]/50 backdrop-blur-sm border border-outline/10 rounded-2xl overflow-hidden hover:border-primary/30 transition-colors">
              <div class="px-6 py-5 flex justify-between items-center bg-gradient-to-r from-transparent to-surface-variant/30">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <span class="material-symbols-outlined text-sm">category</span>
                  </div>
                  <span class="font-bold text-slate-800 dark:text-slate-200">{{ cat.categoria }}</span>
                </div>
                <span class="font-black text-primary">{{ formatCurrencyCell(cat.subtotal_categoria) }}</span>
              </div>
              
              <div class="px-6 pb-6 pt-2">
                <div class="grid grid-cols-12 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">
                  <div class="col-span-5">Insumo</div>
                  <div class="col-span-2 text-right">Cant.</div>
                  <div class="col-span-2 text-right">Precio Unit.</div>
                  <div class="col-span-3 text-right">Subtotal</div>
                </div>
                
                <div class="space-y-2">
                  <div v-for="item in cat.items" :key="item.insumo" class="grid grid-cols-12 items-center text-xs bg-surface/50 dark:bg-surface-container/30 px-4 py-3 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors shadow-sm border border-transparent hover:border-outline/5">
                    <div class="col-span-5 font-semibold text-slate-700 dark:text-slate-300 pr-2">{{ item.insumo }}</div>
                    <div class="col-span-2 text-right font-mono bg-slate-100 dark:bg-slate-800/50 py-1 px-2 rounded">{{ item.cantidad.toLocaleString('es-CL', {maximumFractionDigits: 2}) }} <span class="text-[9px] text-slate-400 ml-1">{{ item.unidad }}</span></div>
                    <div class="col-span-2 text-right font-mono text-slate-500">{{ formatCurrencyCell(item.precio_unitario) }}</div>
                    <div class="col-span-3 text-right font-bold text-primary font-mono">{{ formatCurrencyCell(item.subtotal) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </transition-group>

          <div v-if="desglose.length === 0" class="text-center py-12 opacity-60 flex flex-col items-center gap-3 bg-surface-variant/20 rounded-2xl border border-dashed border-outline/30">
            <span class="material-symbols-outlined text-4xl">inventory_2</span>
            <p class="font-medium">No se encontraron insumos para este material.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
